

// api/services/inventoryService.ts
//
// CENTRALIZED INVENTORY SERVICE
// =============================
// This module is the ONLY code path allowed to write to InventoryStock or InventoryLedger.
// Sales, purchases, transfers, and adjustments must all call into the functions exported
// here — never write to those two Airtable tables directly anywhere else in the codebase
// (including n8n; n8n should be repointed to call these endpoints or to read the resulting
// data, not to compute quantityBefore/quantityChange/quantityAfter itself).
//
// WHY THIS FIXES THE RACE CONDITION:
// Every read-compute-write cycle for a given (businessUnitId, productId) is wrapped in a
// distributed lock (see ../lib/redisLock.ts). Two concurrent requests for the same stock
// row can no longer both read quantityOnHand = 196 before either writes back — the second
// request blocks until the first has fully committed, then reads the UPDATED value.
//
// WRITE ORDER (ledger before stock):
// Within the lock, we write the InventoryLedger entry FIRST, then update InventoryStock to
// match. InventoryLedger is treated as the append-only source of truth. If the stock update
// fails after the ledger write succeeds, the ledger entry is still correct and a
// reconciliation job can re-derive InventoryStock.quantityOnHand from the full ledger
// history later — we log loudly so this is never silent.
import { withInventoryLock, withInventoryLocks } from '../lib/redisLock.js';
 
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;
 
const TABLES = {
  INVENTORY_STOCK: 'InventoryStock',
  INVENTORY_LEDGER: 'InventoryLedger',
  PRODUCT: 'Product',
  BUSINESS_UNIT: 'BusinessUnit',
} as const;
 
/** Resolve a record ID to a human-readable name — best-effort, falls back to the ID. */
async function resolveRecordName(table: string, recordId: string, nameFields: string[]): Promise<string> {
  try {
    const result = await airtableFetch(`/${table}/${recordId}`);
    for (const field of nameFields) {
      const value = result?.fields?.[field];
      if (value && typeof value === 'string') return value;
    }
  } catch {
    // silently fall back to raw ID
  }
  return recordId;
}
 
export type MovementType =
  | 'purchase_received'
  | 'sale'
  | 'adjustment'
  | 'transfer_in'
  | 'transfer_out'
  | 'opening_balance'
  | 'damage'
  | 'theft_write_off'
  | 'return_to_supplier';
 
export class InsufficientStockError extends Error {
  constructor(productName: string, businessUnitName: string, available: number, requested: number) {
    super(
      `Insufficient stock: "${productName}" at ${businessUnitName} — ` +
        `only ${available} available, but ${requested} requested.`,
    );
    this.name = 'InsufficientStockError';
  }
}
 
async function airtableFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${AIRTABLE_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`Airtable ${init.method ?? 'GET'} ${path} failed: ${res.status} ${text}`);
  }
  return body;
}
 
const escapeFormulaValue = (value: string) => value.replace(/'/g, "\\'");
 
// IMPORTANT: every stock lookup filters by BOTH businessUnitId AND productId.
// Filtering by productId alone would let two branches selling the same product
// collide with each other's stock rows.
async function findStockRecord(businessUnitId: string, productId: string) {
  const formula =
    `AND(` +
    `FIND('${escapeFormulaValue(businessUnitId)}', ARRAYJOIN({businessUnitId})), ` +
    `FIND('${escapeFormulaValue(productId)}', ARRAYJOIN({productId}))` +
    `)`;
  const url = `/${TABLES.INVENTORY_STOCK}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`;
  const result = await airtableFetch(url);
  return Array.isArray(result.records) && result.records.length > 0 ? result.records[0] : null;
}
 
async function createStockRecord(businessUnitId: string, productId: string, openingQuantity: number) {
  return airtableFetch(`/${TABLES.INVENTORY_STOCK}`, {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        businessUnitId: [businessUnitId],
        productId: [productId],
        quantityOnHand: openingQuantity,
        quantityReserved: 0,
        lastMovementDate: new Date().toISOString().slice(0, 10),
      },
    }),
  });
}
 
async function updateStockQuantity(stockId: string, quantityOnHand: number) {
  return airtableFetch(`/${TABLES.INVENTORY_STOCK}/${stockId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        quantityOnHand,
        lastMovementDate: new Date().toISOString().slice(0, 10),
      },
    }),
  });
}
 
interface LedgerWriteParams {
  businessUnitId: string;
  productId: string;
  movementType: MovementType;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  unitCost?: number;
  totalMovementValue?: number;
  referenceType?: string;
  referenceId?: number;
  authorisedByUserId?: string;
  createdByUserId?: string;
}
 
async function createLedgerEntry(p: LedgerWriteParams) {
  return airtableFetch(`/${TABLES.INVENTORY_LEDGER}`, {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        businessUnitId: [p.businessUnitId],
        productId: [p.productId],
        movementType: p.movementType,
        quantityChange: p.quantityChange,
        quantityBefore: p.quantityBefore,
        quantityAfter: p.quantityAfter,
        unitCost: p.unitCost ?? 0,
        totalMovementValue: p.totalMovementValue ?? (p.unitCost ? p.unitCost * Math.abs(p.quantityChange) : 0),
        referenceType: p.referenceType ?? '',
        referenceId: p.referenceId ?? 0,
        movementDate: new Date().toISOString().slice(0, 10),
        ...(p.authorisedByUserId ? { authorisedByUserId: [p.authorisedByUserId] } : {}),
        ...(p.createdByUserId ? { createdByUserId: [p.createdByUserId] } : {}),
      },
    }),
  });
}
 
export interface StockSnapshot {
  stockId: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
}
 
/** Read-only — does not lock, since it doesn't mutate anything. */
export async function getStock(businessUnitId: string, productId: string): Promise<StockSnapshot> {
  const record = await findStockRecord(businessUnitId, productId);
  if (!record) {
    return { stockId: '', quantityOnHand: 0, quantityReserved: 0, quantityAvailable: 0 };
  }
  const quantityOnHand = Number(record.fields?.quantityOnHand ?? 0);
  const quantityReserved = Number(record.fields?.quantityReserved ?? 0);
  return {
    stockId: record.id,
    quantityOnHand,
    quantityReserved,
    quantityAvailable: quantityOnHand - quantityReserved,
  };
}
 
export async function getLedgerHistory(businessUnitId: string, productId: string, maxRecords = 50) {
  const formula =
    `AND(` +
    `FIND('${escapeFormulaValue(businessUnitId)}', ARRAYJOIN({businessUnitId})), ` +
    `FIND('${escapeFormulaValue(productId)}', ARRAYJOIN({productId}))` +
    `)`;
  const url =
    `/${TABLES.INVENTORY_LEDGER}?filterByFormula=${encodeURIComponent(formula)}` +
    `&sort[0][field]=createdAt&sort[0][direction]=asc&maxRecords=${maxRecords}`;
  const result = await airtableFetch(url);
  return Array.isArray(result.records) ? result.records : [];
}
 
// --- Internal: single-leg movement used by deductStock / addStock ---
async function applyMovement(params: {
  businessUnitId: string;
  productId: string;
  movementType: MovementType;
  quantityChange: number; // signed: positive = in, negative = out
  unitCost?: number;
  referenceType?: string;
  referenceId?: number;
  authorisedByUserId?: string;
  createdByUserId?: string;
  allowNegative?: boolean;
}) {
  return withInventoryLock(params.businessUnitId, params.productId, async () => {
    let stockRecord = await findStockRecord(params.businessUnitId, params.productId);
 
    if (!stockRecord) {
      if (params.quantityChange < 0 && !params.allowNegative) {
        const [productName, branchName] = await Promise.all([
          resolveRecordName(TABLES.PRODUCT, params.productId, ['productName', 'productCode', 'name']),
          resolveRecordName(TABLES.BUSINESS_UNIT, params.businessUnitId, ['businessUnitName', 'branchName', 'name']),
        ]);
        throw new InsufficientStockError(productName, branchName, 0, -params.quantityChange);
      }
      stockRecord = await createStockRecord(params.businessUnitId, params.productId, 0);
    }
 
    let quantityBefore = Number(stockRecord.fields?.quantityOnHand ?? 0);
 
    // SELF-HEALING: if the stock record shows 0 but the ledger has entries,
    // the InventoryStock row is stale (can happen when a prior backend write
    // committed the ledger entry but crashed before updating the stock row).
    // Recompute from the ledger tail and fix the stock row before proceeding.
    if (quantityBefore === 0 && params.quantityChange < 0) {
      try {
        const ledgerUrl =
          `/${TABLES.INVENTORY_LEDGER}?filterByFormula=` +
          encodeURIComponent(
            `AND(FIND('${escapeFormulaValue(params.businessUnitId)}',ARRAYJOIN({businessUnitId})),` +
            `FIND('${escapeFormulaValue(params.productId)}',ARRAYJOIN({productId})))`,
          ) +
          `&sort[0][field]=ledgerEntryId&sort[0][direction]=desc&maxRecords=1`;
        const ledgerResult = await airtableFetch(ledgerUrl);
        const lastEntry = ledgerResult?.records?.[0];
        if (lastEntry) {
          const ledgerQty = Number(lastEntry.fields?.quantityAfter ?? 0);
          if (ledgerQty > 0) {
            console.warn(
              `[INVENTORY] Self-healing stale InventoryStock for product ${params.productId} ` +
              `branch ${params.businessUnitId}: stock record shows 0 but ledger tail is ${ledgerQty}. ` +
              `Correcting before applying movement.`,
            );
            await updateStockQuantity(stockRecord.id, ledgerQty);
            quantityBefore = ledgerQty;
          }
        }
      } catch (healErr) {
        console.error('[INVENTORY] Self-heal ledger check failed, proceeding with stock record value:', healErr);
      }
    }
 
    const quantityAfter = quantityBefore + params.quantityChange;
 
    if (quantityAfter < 0 && !params.allowNegative) {
      const [productName, branchName] = await Promise.all([
        resolveRecordName(TABLES.PRODUCT, params.productId, ['productName', 'productCode', 'name']),
        resolveRecordName(TABLES.BUSINESS_UNIT, params.businessUnitId, ['businessUnitName', 'branchName', 'name']),
      ]);
      throw new InsufficientStockError(productName, branchName, quantityBefore, -params.quantityChange);
    }
 
    const ledgerEntry = await createLedgerEntry({
      businessUnitId: params.businessUnitId,
      productId: params.productId,
      movementType: params.movementType,
      quantityChange: params.quantityChange,
      quantityBefore,
      quantityAfter,
      unitCost: params.unitCost,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      authorisedByUserId: params.authorisedByUserId,
      createdByUserId: params.createdByUserId,
    });
 
    try {
      await updateStockQuantity(stockRecord.id, quantityAfter);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `[INVENTORY] Ledger entry ${ledgerEntry.id} was written but the InventoryStock update ` +
          `failed for stock record ${stockRecord.id} (product ${params.productId}, branch ` +
          `${params.businessUnitId}). quantityOnHand is now STALE until reconciled.`,
        err,
      );
      throw err;
    }
 
    return { ledgerEntryId: ledgerEntry.id, stockId: stockRecord.id, quantityBefore, quantityAfter };
  });
}


export async function deductStock(params: {
  businessUnitId: string;
  productId: string;
  quantity: number;
  movementType?: 'sale' | 'transfer_out' | 'damage' | 'theft_write_off' | 'return_to_supplier';
  unitCost?: number;
  referenceType?: string;
  referenceId?: number;
  authorisedByUserId?: string;
  createdByUserId?: string;
}) {
  if (params.quantity <= 0) throw new Error('quantity must be positive');
  return applyMovement({
    ...params,
    movementType: params.movementType ?? 'sale',
    quantityChange: -params.quantity,
  });
}
 
export async function addStock(params: {
  businessUnitId: string;
  productId: string;
  quantity: number;
  movementType?: 'purchase_received' | 'transfer_in' | 'opening_balance';
  unitCost?: number;
  referenceType?: string;
  referenceId?: number;
  authorisedByUserId?: string;
  createdByUserId?: string;
}) {
  if (params.quantity <= 0) throw new Error('quantity must be positive');
  return applyMovement({
    ...params,
    movementType: params.movementType ?? 'purchase_received',
    quantityChange: params.quantity,
    allowNegative: true, // additions are never blocked by the negative-stock guard
  });
}
 
export async function adjustStock(params: {
  businessUnitId: string;
  productId: string;
  newQuantity?: number;
  quantityChange?: number;
  unitCost?: number;
  authorisedByUserId?: string;
  createdByUserId?: string;
}) {
  if (params.newQuantity === undefined && params.quantityChange === undefined) {
    throw new Error('Provide either newQuantity (absolute) or quantityChange (relative delta)');
  }
  if (params.newQuantity !== undefined && params.newQuantity < 0) {
    throw new Error('newQuantity cannot be negative');
  }
 
  return withInventoryLock(params.businessUnitId, params.productId, async () => {
    let stockRecord = await findStockRecord(params.businessUnitId, params.productId);
    if (!stockRecord) {
      stockRecord = await createStockRecord(params.businessUnitId, params.productId, 0);
    }
 
    const quantityBefore = Number(stockRecord.fields?.quantityOnHand ?? 0);
    // The live quantityBefore above is read INSIDE the lock, so a relative delta computed
    // here is always applied to the true current value — never a stale client-side guess.
    const quantityAfter =
      params.newQuantity !== undefined ? params.newQuantity : quantityBefore + (params.quantityChange ?? 0);
 
    if (quantityAfter < 0) {
      throw new InsufficientStockError(params.productId, params.businessUnitId, quantityBefore, -(params.quantityChange ?? 0));
    }
 
    const ledgerEntry = await createLedgerEntry({
      businessUnitId: params.businessUnitId,
      productId: params.productId,
      movementType: 'adjustment',
      quantityChange: quantityAfter - quantityBefore,
      quantityBefore,
      quantityAfter,
      unitCost: params.unitCost,
      referenceType: 'stock_adjustment',
      authorisedByUserId: params.authorisedByUserId,
      createdByUserId: params.createdByUserId,
    });
 
    await updateStockQuantity(stockRecord.id, quantityAfter);
 
    return { ledgerEntryId: ledgerEntry.id, stockId: stockRecord.id, quantityBefore, quantityAfter };
  });
}
 
/**
 * Moves stock of one product between two branches. Both legs are written under a
 * SINGLE combined lock acquisition (source + destination), so no other operation can
 * read a half-completed transfer.
 */
export async function transferStock(params: {
  fromBusinessUnitId: string;
  toBusinessUnitId: string;
  productId: string;
  quantity: number;
  unitCost?: number;
  authorisedByUserId?: string;
  createdByUserId?: string;
}) {
  if (params.quantity <= 0) throw new Error('quantity must be positive');
  if (params.fromBusinessUnitId === params.toBusinessUnitId) {
    throw new Error('fromBusinessUnitId and toBusinessUnitId must differ');
  }
 
  return withInventoryLocks(
    [
      { businessUnitId: params.fromBusinessUnitId, productId: params.productId },
      { businessUnitId: params.toBusinessUnitId, productId: params.productId },
    ],
    async () => {
      const sourceStock = await findStockRecord(params.fromBusinessUnitId, params.productId);
      const sourceQuantityBefore = Number(sourceStock?.fields?.quantityOnHand ?? 0);
 
      if (sourceQuantityBefore < params.quantity) {
        throw new InsufficientStockError(
          params.productId,
          params.fromBusinessUnitId,
          sourceQuantityBefore,
          params.quantity,
        );
      }
 
      const sourceQuantityAfter = sourceQuantityBefore - params.quantity;
      const outLedger = await createLedgerEntry({
        businessUnitId: params.fromBusinessUnitId,
        productId: params.productId,
        movementType: 'transfer_out',
        quantityChange: -params.quantity,
        quantityBefore: sourceQuantityBefore,
        quantityAfter: sourceQuantityAfter,
        unitCost: params.unitCost,
        referenceType: 'transfer',
        authorisedByUserId: params.authorisedByUserId,
        createdByUserId: params.createdByUserId,
      });
      await updateStockQuantity(sourceStock!.id, sourceQuantityAfter);
 
      try {
        let destStock = await findStockRecord(params.toBusinessUnitId, params.productId);
        if (!destStock) {
          destStock = await createStockRecord(params.toBusinessUnitId, params.productId, 0);
        }
        const destQuantityBefore = Number(destStock.fields?.quantityOnHand ?? 0);
        const destQuantityAfter = destQuantityBefore + params.quantity;
 
        const inLedger = await createLedgerEntry({
          businessUnitId: params.toBusinessUnitId,
          productId: params.productId,
          movementType: 'transfer_in',
          quantityChange: params.quantity,
          quantityBefore: destQuantityBefore,
          quantityAfter: destQuantityAfter,
          unitCost: params.unitCost,
          referenceType: 'transfer',
          authorisedByUserId: params.authorisedByUserId,
          createdByUserId: params.createdByUserId,
        });
        await updateStockQuantity(destStock.id, destQuantityAfter);
 
        return { outLedgerEntryId: outLedger.id, inLedgerEntryId: inLedger.id };
      } catch (err) {
        // The source leg already committed. This is now a partial transfer and needs
        // an operator's attention — log it as critical, don't let it fail silently.
        // eslint-disable-next-line no-console
        console.error(
          `[INVENTORY] CRITICAL — PARTIAL TRANSFER: transfer_out (ledger ${outLedger.id}) ` +
            `committed for product ${params.productId} from branch ${params.fromBusinessUnitId}, ` +
            `but the transfer_in leg to branch ${params.toBusinessUnitId} failed. ${params.quantity} ` +
            `units are currently unaccounted for system-wide. Manual reconciliation required.`,
          err,
        );
        throw err;
      }
    },
  );
}
 
/**
 * Recomputes what InventoryStock.quantityOnHand SHOULD be for a product/branch by
 * replaying its full InventoryLedger history, and reports whether the current stored
 * value matches. Use this to find and fix drift caused by the old n8n-based system
 * (or any other historical bug) before/during migration. Does not write anything.
 */
export async function reconcileStock(businessUnitId: string, productId: string) {
  const ledgerRecords = await getLedgerHistory(businessUnitId, productId, 1000);
  let computedQuantity = 0;
  const brokenChainPoints: Array<{ index: number; expected: number; actual: number }> = [];
 
  ledgerRecords.forEach((entry: any, index: number) => {
    const before = Number(entry.fields?.quantityBefore ?? 0);
    const change = Number(entry.fields?.quantityChange ?? 0);
    const after = Number(entry.fields?.quantityAfter ?? 0);
 
    if (index > 0 && before !== computedQuantity) {
      brokenChainPoints.push({ index, expected: computedQuantity, actual: before });
    }
    computedQuantity = before + change === after ? after : before + change;
  });
 
  const currentStock = await getStock(businessUnitId, productId);
 
  return {
    businessUnitId,
    productId,
    ledgerEntryCount: ledgerRecords.length,
    computedQuantityFromLedger: computedQuantity,
    currentStoredQuantityOnHand: currentStock.quantityOnHand,
    matches: computedQuantity === currentStock.quantityOnHand,
    brokenChainPoints,
  };
}
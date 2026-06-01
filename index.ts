import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import dns from 'node:dns';
import https from 'node:https';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

dns.setDefaultResultOrder('ipv4first');

const envPath = new URL('../.env', import.meta.url).pathname;
dotenv.config({ path: envPath });

const app = express();
const port = process.env.PORT || '3001';
const airtableKey = process.env.AIRTABLE_API_KEY;
const airtableBaseId = process.env.AIRTABLE_BASE_ID;
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? '';
const backendBaseUrl = process.env.BACKEND_BASE_URL?.trim() || `http://localhost:${port}`;
const frontendBaseUrl = process.env.FRONTEND_BASE_URL?.trim() || 'http://localhost:5173';

if (!airtableKey || !airtableBaseId) {
  throw new Error('AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required in server environment.');
}

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '8mb' }));

app.post('/diagnostics/client-error', (req, res) => {
  const { type, message, stack, componentStack, url, userAgent, at } = req.body ?? {};

  // eslint-disable-next-line no-console
  console.error('\n[FRONTEND ERROR]', {
    type,
    message,
    url,
    at,
    userAgent,
  });

  if (stack) {
    // eslint-disable-next-line no-console
    console.error('[FRONTEND STACK]\n', stack);
  }

  if (componentStack) {
    // eslint-disable-next-line no-console
    console.error('[REACT COMPONENT STACK]\n', componentStack);
  }

  return res.json({ ok: true });
});

app.post('/uploads/image', async (req, res) => {
  try {
    const { dataUrl } = req.body as { dataUrl?: string; fileName?: string };
    const match = String(dataUrl ?? '').match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Only PNG, JPEG, WEBP, and GIF data images are supported.' });
    }

    const mimeType = match[1];
    const extension = mimeType === 'image/jpeg' || mimeType === 'image/jpg' ? 'jpg' : mimeType.split('/')[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.byteLength > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'Image is larger than 5MB.' });
    }

    const uploadDir = path.resolve(process.cwd(), '../frontend/public/uploads');
    await mkdir(uploadDir, { recursive: true });
    const fileName = `${randomUUID()}.${extension}`;
    await writeFile(path.join(uploadDir, fileName), buffer);

    return res.json({ url: `${frontendBaseUrl}/uploads/${fileName}` });
  } catch (error) {
    return res.status(500).json({ error: 'Image upload failed', details: error instanceof Error ? error.message : String(error) });
  }
});

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${airtableBaseId}`;
const AIRTABLE_TIMEOUT_MS = 10_000;
const airtableAgent = new https.Agent({ family: 4, keepAlive: true, timeout: AIRTABLE_TIMEOUT_MS });
const authHeaders = () => ({ Authorization: `Bearer ${airtableKey}`, 'Content-Type': 'application/json' });
const TABLES = {
  SYSTEM_USER: 'SystemUser',
  BUSINESS_UNIT: 'BusinessUnit',
  USER_ROLE: 'UserRole',
  ROLE_PERMISSION: 'RolePermission',
  USER_SESSION: 'UserSession',
  LOGIN_AUDIT_LOG: 'LoginAuditLog',
} as const;

const escapeFormulaValue = (value: string) => value.replace(/'/g, "\\'");

const formatNetworkError = (error: unknown) => {
  if (!(error instanceof Error)) return String(error);

  const cause = (error as Error & { cause?: any }).cause;
  const nestedErrors = Array.isArray(cause?.errors)
    ? cause.errors
        .map((item: any) => [item.code, item.address, item.port].filter(Boolean).join(' '))
        .filter(Boolean)
    : [];

  return nestedErrors.length > 0 ? `${error.message}: ${nestedErrors.join('; ')}` : error.message;
};

const airtableRequest = (
  pathOrUrl: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {},
) =>
  new Promise<{ ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<any> }>((resolve, reject) => {
    const url = new URL(pathOrUrl.startsWith('http') ? pathOrUrl : `${AIRTABLE_API_URL}${pathOrUrl}`);
    const req = https.request(
      url,
      {
        method: options.method ?? 'GET',
        headers: options.headers ?? authHeaders(),
        family: 4,
        agent: airtableAgent,
        timeout: AIRTABLE_TIMEOUT_MS,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({
            ok: Number(response.statusCode) >= 200 && Number(response.statusCode) < 300,
            status: Number(response.statusCode ?? 0),
            text: async () => body,
            json: async () => JSON.parse(body),
          });
        });
      },
    );

    req.on('timeout', () => {
      req.destroy(new Error(`Airtable request timed out after ${AIRTABLE_TIMEOUT_MS}ms`));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });

const decodeOAuthState = (state?: string) => {
  if (!state) return { mode: 'login' };
  try {
    return JSON.parse(decodeURIComponent(state));
  } catch {
    return { mode: 'login' };
  }
};

const getAirtableFieldsWithDefaults = async (tableName: string, customFields: Record<string, any>) => {
  const sampleResp = await airtableRequest(`/${tableName}?maxRecords=1`);

  let fieldNames: string[] = [];
  if (sampleResp.ok) {
    const sampleJson = await sampleResp.json();
    const sampleFields = sampleJson?.records?.[0]?.fields ?? {};
    fieldNames = Object.keys(sampleFields);
  }

  const defaults: Record<string, any> = {};
  fieldNames.forEach((field) => {
    defaults[field] = '';
  });

  return { ...defaults, ...customFields };
};

const findAirtableRecordByFilter = async (tableName: string, formula: string) => {
  const url = `/${tableName}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`;
  const response = await airtableRequest(url);
  if (!response.ok) return null;
  const result = await response.json();
  return Array.isArray(result.records) && result.records.length > 0 ? result.records[0] : null;
};

const getAirtableRecordById = async (tableName: string, recordId: string) => {
  const response = await airtableRequest(`/${tableName}/${recordId}`);
  if (!response.ok) return null;
  return response.json();
};

const firstLinkedId = (value: unknown): string => {
  if (Array.isArray(value)) return String(value[0] ?? '');
  return typeof value === 'string' ? value : '';
};

const resolveUserRoleName = async (userFields: Record<string, any>): Promise<string> => {
  const linkedRoleId = firstLinkedId(userFields.userRoleId);
  if (!linkedRoleId) return 'SalesCashier';

  const roleRecord = await getAirtableRecordById(TABLES.USER_ROLE, linkedRoleId);
  return String(roleRecord?.fields?.roleName || 'SalesCashier');
};

const buildClientSession = async (userRecord: any, sessionId: string, loginAt = new Date().toISOString()) => {
  const user = userRecord.fields ?? {};
  return {
    userId: userRecord.id,
    fullName: String(user.fullName || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.emailAddress || 'Paroha User'),
    role: await resolveUserRoleName(user),
    businessUnitId: firstLinkedId(user.businessUnitId),
    sessionId,
    expiresAt: new Date(new Date(loginAt).getTime() + 8 * 60 * 60 * 1000).toISOString(),
  };
};

const updateAirtableRecord = async (tableName: string, recordId: string, fields: Record<string, any>) => {
  const response = await airtableRequest(`/${tableName}/${recordId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Airtable update failed: ${response.status} ${body}`);
  }
  return response.json();
};

const createAirtableRecord = async (tableName: string, fields: Record<string, any>) => {
  const response = await airtableRequest(`/${tableName}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Airtable create failed: ${response.status} ${body}`);
  }
  return response.json();
};

const listAirtableRecords = async (tableName: string, maxRecords = 100) => {
  const response = await airtableRequest(`/${tableName}?pageSize=${Math.min(maxRecords, 100)}&maxRecords=${maxRecords}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Airtable list failed: ${response.status} ${body}`);
  }
  const result = await response.json();
  return Array.isArray(result.records) ? result.records : [];
};

const readAirtableSample = async (tableName: string, maxRecords = 3) => {
  const startedAt = Date.now();
  try {
    const response = await airtableRequest(`/${tableName}?pageSize=${maxRecords}&maxRecords=${maxRecords}`);
    const durationMs = Date.now() - startedAt;
    const body = await response.text();

    if (!response.ok) {
      return {
        ok: false,
        tableName,
        status: response.status,
        durationMs,
        error: body,
      };
    }

    const parsed = JSON.parse(body);
    const records = Array.isArray(parsed.records) ? parsed.records : [];
    const fieldNames = Array.from(
      new Set(records.flatMap((record: any) => Object.keys(record?.fields ?? {}))),
    ).sort();

    return {
      ok: true,
      tableName,
      status: response.status,
      durationMs,
      count: records.length,
      fieldNames,
      sampleIds: records.map((record: any) => record.id),
    };
  } catch (error) {
    return {
      ok: false,
      tableName,
      status: 0,
      durationMs: Date.now() - startedAt,
      error: formatNetworkError(error),
    };
  }
};

const createLoginAuditLog = async (fields: Record<string, any>) => {
  try {
    await createAirtableRecord(TABLES.LOGIN_AUDIT_LOG, {
      userId: fields.userId ? [fields.userId] : undefined,
      attemptedEmailOrPhone: fields.attemptedEmailOrPhone ?? fields.emailAddress ?? '',
      attemptResult: fields.attemptResult,
      attemptedAt: fields.attemptedAt ?? new Date().toISOString(),
      userAgent: fields.userAgent ?? '',
      ipAddress: fields.ipAddress ?? '',
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Login audit log failed:', error);
  }
};

const defaultResourcesByRole: Record<string, string[]> = {
  SystemAdministrator: [
    'dashboard',
    'sales',
    'procurement',
    'inventory',
    'debtors',
    'customers',
    'suppliers',
    'hr',
    'finance',
    'payroll',
    'accounts',
    'reports',
    'audit',
    'settings',
  ],
  RegionalManager: [
    'dashboard',
    'sales',
    'procurement',
    'inventory',
    'debtors',
    'customers',
    'suppliers',
    'hr',
    'finance',
    'payroll',
    'accounts',
    'reports',
    'audit',
    'settings',
  ],
  BusinessUnitManager: ['dashboard', 'sales', 'procurement', 'inventory', 'debtors', 'customers', 'suppliers', 'finance', 'reports'],
  HROfficer: ['dashboard', 'hr', 'payroll', 'reports'],
  FinanceOfficer: ['dashboard', 'finance', 'payroll', 'accounts', 'debtors', 'reports'],
  SalesCashier: ['dashboard', 'sales', 'customers', 'debtors', 'reports'],
  InventoryOfficer: ['dashboard', 'procurement', 'inventory', 'suppliers', 'reports'],
  ReadOnlyAuditor: ['dashboard', 'reports', 'audit'],
};

const defaultPermissionsForRole = (roleName: string, resourceName: string) => {
  const readOnly = roleName === 'ReadOnlyAuditor';
  const audit = resourceName === 'audit';
  return {
    canRead: true,
    canCreate: !readOnly && !audit,
    canUpdate: !readOnly && !audit,
    canDelete: roleName === 'SystemAdministrator' && !audit,
    canApprove: ['SystemAdministrator', 'RegionalManager', 'BusinessUnitManager', 'FinanceOfficer'].includes(roleName) && !audit,
    canExport: true,
  };
};

const ensureRolePermissions = async (roleId: string) => {
  const roleRecord = await getAirtableRecordById(TABLES.USER_ROLE, roleId);
  const roleName = String(roleRecord?.fields?.roleName || '');
  if (!roleName) return;

  const resources = defaultResourcesByRole[roleName] ?? ['dashboard'];
  const existingPermissions = await listAirtableRecords(TABLES.ROLE_PERMISSION, 100);
  const existingKeys = new Set(
    existingPermissions
      .filter((record: any) => Array.isArray(record.fields?.roleId) && record.fields.roleId.includes(roleId))
      .map((record: any) => String(record.fields?.resourceName || '')),
  );

  await Promise.all(
    resources
      .filter((resourceName) => !existingKeys.has(resourceName))
      .map((resourceName) =>
        createAirtableRecord(TABLES.ROLE_PERMISSION, {
          roleId: [roleId],
          resourceName,
          ...defaultPermissionsForRole(roleName, resourceName),
        }),
      ),
  );
};

const redirectToLogin = (params: Record<string, string>) => {
  const search = new URLSearchParams(params);
  return `${frontendBaseUrl}/login?${search.toString()}`;
};

app.post('/settings/system-users', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      emailAddress,
      phoneNumber,
      userRoleId,
      businessUnitId,
      accountStatus,
      failedLoginCount,
      twoFactorEnabled,
      mustChangePassword,
    } = req.body as Record<string, any>;

    if (!firstName || !lastName || !emailAddress || !phoneNumber || !userRoleId || !businessUnitId) {
      return res.status(400).json({ error: 'Missing required SystemUser fields' });
    }

    const now = new Date().toISOString();
    await ensureRolePermissions(userRoleId);
    const created = await createAirtableRecord(TABLES.SYSTEM_USER, {
      firstName,
      lastName,
      emailAddress,
      phoneNumber,
      userRoleId: [userRoleId],
      businessUnitId: [businessUnitId],
      accountStatus: accountStatus || 'active',
      failedLoginCount: Number(failedLoginCount ?? 0),
      lastFailedLoginAt: now,
      lastSuccessfulLoginAt: now,
      lastActivityAt: now,
      twoFactorEnabled: Boolean(twoFactorEnabled),
      mustChangePassword: Boolean(mustChangePassword),
    });

    return res.status(201).json({ recordId: created.id });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('SystemUser create failed:', error);
    return res.status(500).json({
      error: 'SystemUser create failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post('/settings/business-units', async (req, res) => {
  try {
    const {
      businessUnitName,
      businessUnitCode,
      businessUnitType,
      businessUnitPhysicalAddress,
      businessUnitCity,
      businessUnitRegion,
      businessUnitPhoneNumber,
      businessUnitEmail,
      businessUnitOpeningDate,
      businessUnitMonthlyRentAmount,
      businessUnitSquareMeterage,
      businessUnitStatus,
    } = req.body as Record<string, any>;

    if (
      !businessUnitName ||
      !businessUnitCode ||
      !businessUnitType ||
      !businessUnitPhysicalAddress ||
      !businessUnitCity ||
      !businessUnitRegion ||
      !businessUnitPhoneNumber ||
      !businessUnitEmail ||
      !businessUnitOpeningDate
    ) {
      return res.status(400).json({ error: 'Missing required BusinessUnit fields' });
    }

    const created = await createAirtableRecord(TABLES.BUSINESS_UNIT, {
      businessUnitName,
      businessUnitCode,
      businessUnitType,
      businessUnitPhysicalAddress,
      businessUnitCity,
      businessUnitRegion,
      businessUnitPhoneNumber,
      businessUnitEmail,
      businessUnitOpeningDate,
      businessUnitMonthlyRentAmount: Number(businessUnitMonthlyRentAmount ?? 0),
      businessUnitSquareMeterage: Number(businessUnitSquareMeterage ?? 0),
      businessUnitStatus: businessUnitStatus || 'active',
    });

    return res.status(201).json({ recordId: created.id });
  } catch (error) {
    return res.status(500).json({
      error: 'BusinessUnit create failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post('/auth/login', async (req, res) => {
  return res.status(410).json({
    error: 'Password login is disabled',
    details: 'SystemUser has no password/passwordHash field in the current Airtable schema. Use /auth/google instead.',
  });
});

app.use('/api', async (req, res) => {
  const requestUrl = req.originalUrl || req.url || '';
  const airtablePath = req.url.startsWith('/') ? req.url : `/${req.url}`;

  // eslint-disable-next-line no-console
  console.log(`[AIRTABLE PROXY] ${req.method} ${requestUrl}`);

  try {
    const response = await airtableRequest(airtablePath, {
      method: req.method,
      headers: authHeaders(),
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body ?? {}),
    });
    const body = await response.text();
    return res.status(response.status).type('application/json').send(body);
  } catch (error) {
    const details = formatNetworkError(error);

    // eslint-disable-next-line no-console
    console.error(`[AIRTABLE PROXY ERROR] ${req.method} ${requestUrl} - ${details}`);

    return res.status(502).json({ error: 'Airtable proxy error', details });
  }
});

app.get('/', (_req, res) => res.json({ status: 'proxy-running', message: 'Use /api/<table> or /meta/schema' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/meta/oauth-check', (_req, res) => res.json({
  googleClientIdConfigured: Boolean(googleClientId),
  googleClientSecretConfigured: Boolean(googleClientSecret),
  redirectUri: `${backendBaseUrl}/auth/google/callback`,
  frontendBaseUrl,
}));

app.get('/meta/access-check', async (_req, res) => {
  try {
    const checks = await Promise.all([
      readAirtableSample('UserRole'),
      readAirtableSample('RolePermission'),
      readAirtableSample('BusinessUnit'),
    ]);

    return res.status(checks.every((check) => check.ok) ? 200 : 502).json({
      ok: checks.every((check) => check.ok),
      baseId: airtableBaseId,
      checks,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'Access check failed',
      details: formatNetworkError(error),
    });
  }
});

app.get('/meta/schema', async (_req, res) => {
  try {
    const metadataUrl = `https://api.airtable.com/v0/meta/bases/${airtableBaseId}/tables`;
    const response = await airtableRequest(metadataUrl, {
      headers: {
        Authorization: `Bearer ${airtableKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      return res.status(response.status).json({
        error: 'Airtable metadata fetch failed',
        details: body,
      });
    }

    const metadata = await response.json();
    return res.json(metadata);
  } catch (error) {
    return res.status(500).json({
      error: 'Airtable metadata fetch error',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// --- OAuth: Google start and callback with session issuance ---
app.get('/auth/google', (req, res) => {
  const mode = String(req.query.mode || 'login');
  const redirectUri = `${backendBaseUrl}/auth/google/callback`;
  if (!googleClientId) return res.status(500).json({ error: 'GOOGLE_CLIENT_ID not configured' });

  const state = encodeURIComponent(JSON.stringify({ ts: Date.now(), rnd: Math.random().toString(36).slice(2), mode }));
  const scope = encodeURIComponent('openid email profile');
  const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${googleClientId}&redirect_uri=${encodeURIComponent(
    redirectUri,
  )}&scope=${scope}&access_type=offline&prompt=select_account&state=${state}`;

  return res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const code = String(req.query.code || '');
    const rawState = String(req.query.state || '');
    const state = decodeOAuthState(rawState);
    if (!code) return res.status(400).json({ error: 'Missing code' });

    const redirectUri = `${backendBaseUrl}/auth/google/callback`;

    if (!googleClientId || !googleClientSecret) {
      return res.status(500).json({
        error: 'Google OAuth not configured',
        missing: {
          GOOGLE_CLIENT_ID: !googleClientId,
          GOOGLE_CLIENT_SECRET: !googleClientSecret,
        },
      });
    }

    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResp.ok) {
      const txt = await tokenResp.text();
      return res.status(500).json({ error: 'Token exchange failed', details: txt });
    }

    const tokenJson = await tokenResp.json();
    const accessToken = tokenJson.access_token as string;
    if (!accessToken) return res.status(500).json({ error: 'No access token returned' });

    const userInfoResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userInfoResp.ok) {
      const txt = await userInfoResp.text();
      return res.status(500).json({ error: 'Failed to fetch userinfo', details: txt });
    }

    const profile = await userInfoResp.json();
    const email = profile.email as string | undefined;

    if (!email) return res.redirect(redirectToLogin({ authError: '1' }));

    const existingUser = await findAirtableRecordByFilter(TABLES.SYSTEM_USER, `({emailAddress}='${escapeFormulaValue(email)}')`);
    const userRecord = existingUser;
    if (!userRecord) {
      await createLoginAuditLog({
        attemptedEmailOrPhone: email,
        attemptResult: 'not_found',
        attemptedAt: new Date().toISOString(),
        userAgent: req.get('user-agent') ?? '',
        ipAddress: req.ip,
      });
      return res.redirect(redirectToLogin({ authError: '1' }));
    }

    if (userRecord.fields?.accountStatus === 'locked') {
      await createLoginAuditLog({
        userId: userRecord.id,
        attemptedEmailOrPhone: email,
        attemptResult: 'account_locked',
        attemptedAt: new Date().toISOString(),
        userAgent: req.get('user-agent') ?? '',
        ipAddress: req.ip,
      });
      return res.redirect(redirectToLogin({ authError: '1' }));
    }

    const linkedRoleId = firstLinkedId(userRecord.fields?.userRoleId);
    if (linkedRoleId) {
      await ensureRolePermissions(linkedRoleId);
    }

    const sessionId = crypto.randomUUID();
    const loginAt = new Date().toISOString();
    await createAirtableRecord(TABLES.USER_SESSION, {
      sessionId,
      userId: [userRecord.id],
      ipAddress: req.ip,
      deviceType: 'desktop',
      loginAt,
      lastActiveAt: loginAt,
    });
    await updateAirtableRecord(TABLES.SYSTEM_USER, userRecord.id, {
      lastSuccessfulLoginAt: loginAt,
      lastActivityAt: loginAt,
      failedLoginCount: 0,
    });
    await createLoginAuditLog({
      userId: userRecord.id,
      attemptedEmailOrPhone: email,
      attemptResult: 'success',
      attemptedAt: loginAt,
      userAgent: req.get('user-agent') ?? '',
      ipAddress: req.ip,
    });

    const redirectTo = `${frontendBaseUrl}/login?sessionId=${encodeURIComponent(sessionId)}&authSuccess=1`;
    return res.redirect(redirectTo);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Google OAuth callback error:', error);
    return res.status(500).json({ error: 'OAuth callback error', details: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/auth/session/:sessionId', async (req, res) => {
  try {
    const sessionId = String(req.params.sessionId || '');
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

    const sessionRecord = await findAirtableRecordByFilter(TABLES.USER_SESSION, `({sessionId}='${escapeFormulaValue(sessionId)}')`);
    if (!sessionRecord) return res.status(404).json({ error: 'Session not found' });

    const session = sessionRecord.fields;
    if (!session) return res.status(404).json({ error: 'Session fields missing' });

    const expiresAt = session.expiresAt as string || new Date(new Date(session.loginAt as string).getTime() + 8 * 60 * 60 * 1000).toISOString();
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const linkedUserId = firstLinkedId(session.userId);
    const userRecord = linkedUserId ? await getAirtableRecordById(TABLES.SYSTEM_USER, linkedUserId) : null;
    if (!userRecord) return res.status(404).json({ error: 'Session user not found' });
    const clientSession = await buildClientSession(userRecord, session.sessionId, session.loginAt);

    return res.json({ session: {
      ...clientSession,
      expiresAt,
    }});
  } catch (error) {
    return res.status(500).json({ error: 'Session retrieval failed', details: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/auth/logout', async (req, res) => {
  try {
    const { sessionId, reason } = req.body as { sessionId?: string; reason?: string };
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

    const sessionRecord = await findAirtableRecordByFilter(
      TABLES.USER_SESSION,
      `({sessionId}='${escapeFormulaValue(sessionId)}')`,
    );

    if (!sessionRecord) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await updateAirtableRecord(TABLES.USER_SESSION, sessionRecord.id, {
      logoutAt: new Date().toISOString(),
      logoutReason: reason === 'session_expired' ? 'timeout' : reason || 'user_logout',
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'Logout failed', details: error instanceof Error ? error.message : String(error) });
  }
});

// One-time admin registration endpoint
app.post('/auth/register-admin', async (req, res) => {
  try {
    const { emailAddress, code } = req.body as { emailAddress?: string; code?: string };
    const expected = process.env.ADMIN_REGISTRATION_CODE;
    if (!expected) return res.status(500).json({ error: 'Admin registration not configured' });
    if (!emailAddress || !code) return res.status(400).json({ error: 'Missing parameters' });
    if (code !== expected) return res.status(403).json({ error: 'Invalid registration code' });

    // create admin user in SystemUser table
    // Fetch an existing record to discover field names so we can avoid nulls
    const sampleResp = await airtableRequest(`/${TABLES.SYSTEM_USER}?maxRecords=1`);
    let fieldNames: string[] = [];
    if (sampleResp.ok) {
      const sj = await sampleResp.json();
      const sample = sj.records && sj.records[0] && sj.records[0].fields ? sj.records[0].fields : {};
      fieldNames = Object.keys(sample);
    }

    // Build fields object: default to empty string for all discovered fields,
    // then set sensible defaults for required keys.
    const defaults: Record<string, any> = {};
    for (const f of fieldNames) defaults[f] = '';

    // Ensure core fields are present
    defaults.emailAddress = emailAddress;
    defaults.role = 'SystemAdministrator';
    defaults.accountStatus = 'active';

    const createResp = await airtableRequest(`/${TABLES.SYSTEM_USER}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ fields: defaults }),
    });
    if (!createResp.ok) {
      const txt = await createResp.text();
      return res.status(500).json({ error: 'Failed to create admin user', details: txt });
    }
    const created = await createResp.json();
    return res.json({ ok: true, created });
  } catch (err) {
    return res.status(500).json({ error: 'Registration error', details: err instanceof Error ? err.message : String(err) });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Airtable proxy server running on http://localhost:${port}`);
});

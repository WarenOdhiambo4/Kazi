import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const envPath = new URL('../.env', import.meta.url).pathname;
dotenv.config({ path: envPath });

const app = express();
const port = process.env.PORT || '3001';
const airtableKey = process.env.AIRTABLE_API_KEY;
const airtableBaseId = process.env.AIRTABLE_BASE_ID;

if (!airtableKey || !airtableBaseId) {
  throw new Error('AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required in server environment.');
}

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '100kb' }));

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

app.post('/diagnostics/client-event', (req, res) => {
  const { type, detail, url, userAgent, at } = req.body ?? {};

  // eslint-disable-next-line no-console
  console.log('\n[FRONTEND EVENT]', {
    type,
    detail,
    url,
    at,
    userAgent,
  });

  return res.json({ ok: true });
});

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${airtableBaseId}`;
const authHeaders = () => ({ Authorization: `Bearer ${airtableKey}`, 'Content-Type': 'application/json' });
const TABLES = {
  SYSTEM_USER: 'SystemUser',
  USER_ROLE: 'UserRole',
  USER_SESSION: 'UserSession',
  LOGIN_AUDIT_LOG: 'LoginAuditLog',
} as const;

const escapeFormulaValue = (value: string) => value.replace(/'/g, "\\'");

const decodeOAuthState = (state?: string) => {
  if (!state) return { mode: 'login' };
  try {
    return JSON.parse(decodeURIComponent(state));
  } catch {
    return { mode: 'login' };
  }
};

const getAirtableFieldsWithDefaults = async (tableName: string, customFields: Record<string, any>) => {
  const sampleResp = await fetch(`${AIRTABLE_API_URL}/${tableName}?maxRecords=1`, {
    headers: authHeaders(),
  });

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
  const url = `${AIRTABLE_API_URL}/${tableName}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`;
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) return null;
  const result = await response.json();
  return Array.isArray(result.records) && result.records.length > 0 ? result.records[0] : null;
};

const getAirtableRecordById = async (tableName: string, recordId: string) => {
  const response = await fetch(`${AIRTABLE_API_URL}/${tableName}/${recordId}`, { headers: authHeaders() });
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
  const response = await fetch(`${AIRTABLE_API_URL}/${tableName}/${recordId}`, {
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
  const response = await fetch(`${AIRTABLE_API_URL}/${tableName}`, {
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

const readAirtableSample = async (tableName: string, maxRecords = 3) => {
  const startedAt = Date.now();
  const response = await fetch(`${AIRTABLE_API_URL}/${tableName}?pageSize=${maxRecords}&maxRecords=${maxRecords}`, {
    headers: authHeaders(),
  });
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

app.post('/auth/login', async (req, res) => {
  return res.status(410).json({
    error: 'Password login is disabled',
    details: 'SystemUser has no password/passwordHash field in the current Airtable schema. Use /auth/google instead.',
  });
});

app.use(
  '/api',
  createProxyMiddleware({
    target: `https://api.airtable.com/v0/${airtableBaseId}`,
    changeOrigin: true,
    timeout: 10_000,
    proxyTimeout: 10_000,
    pathRewrite: { '^/api': '' },
    onProxyReq(proxyReq, req) {
      // eslint-disable-next-line no-console
      console.log(`[AIRTABLE PROXY] ${req.method} ${req.url}`);
      proxyReq.setHeader('Authorization', `Bearer ${airtableKey}`);
      proxyReq.setHeader('Content-Type', 'application/json');
    },
    onError(err, req, res) {
      const details = err instanceof Error
        ? err.message
        : err && typeof err === 'object'
          ? JSON.stringify(err)
          : String(err);

      // eslint-disable-next-line no-console
      console.error(`[AIRTABLE PROXY ERROR] ${req.method} ${req.url} - ${details}`);

      res.status(500).json({ error: 'Airtable proxy error', details });
    },
  }),
);

app.get('/', (_req, res) => res.json({ status: 'proxy-running', message: 'Use /api/<table> or /meta/schema' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/meta/access-check', async (_req, res) => {
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
});

app.get('/meta/schema', async (_req, res) => {
  try {
    const metadataUrl = `https://api.airtable.com/v0/meta/bases/${airtableBaseId}/tables`;
    const response = await fetch(metadataUrl, {
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
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const mode = String(req.query.mode || 'login');
  const redirectBase = process.env.BACKEND_BASE_URL || `http://localhost:${port}`;
  const redirectUri = `${redirectBase}/auth/google/callback`;
  if (!clientId) return res.status(500).json({ error: 'GOOGLE_CLIENT_ID not configured' });

  const state = encodeURIComponent(JSON.stringify({ ts: Date.now(), rnd: Math.random().toString(36).slice(2), mode }));
  const scope = encodeURIComponent('openid email profile');
  const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
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

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectBase = process.env.BACKEND_BASE_URL || `http://localhost:${port}`;
    const redirectUri = `${redirectBase}/auth/google/callback`;

    if (!clientId || !clientSecret) return res.status(500).json({ error: 'Google OAuth not configured' });

    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
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

    if (!email) return res.status(400).json({ error: 'Google profile missing email' });

    const existingUser = await findAirtableRecordByFilter(TABLES.SYSTEM_USER, `({emailAddress}='${escapeFormulaValue(email)}')`);
    const userRecord = existingUser;
    if (!userRecord) {
      return res.status(403).json({ error: 'Google email is not registered in SystemUser' });
    }

    if (userRecord.fields?.accountStatus === 'locked') {
      return res.status(403).json({ error: 'Account locked' });
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

    const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
    const redirectTo = `${frontendBase}/login?sessionId=${encodeURIComponent(sessionId)}&authSuccess=1`;
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
    const usersUrl = `https://api.airtable.com/v0/${airtableBaseId}/${TABLES.SYSTEM_USER}`;

    // Fetch an existing record to discover field names so we can avoid nulls
    const sampleResp = await fetch(`${usersUrl}?maxRecords=1`, {
      headers: { Authorization: `Bearer ${airtableKey}`, 'Content-Type': 'application/json' },
    });
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

    const createResp = await fetch(usersUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${airtableKey}`, 'Content-Type': 'application/json' },
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

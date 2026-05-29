import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';

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

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${airtableBaseId}`;
const authHeaders = () => ({ Authorization: `Bearer ${airtableKey}`, 'Content-Type': 'application/json' });

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

app.use(
  '/api',
  createProxyMiddleware({
    target: `https://api.airtable.com/v0/${airtableBaseId}`,
    changeOrigin: true,
    pathRewrite: { '^/api': '' },
    onProxyReq(proxyReq) {
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
      console.error('Airtable proxy error:', details, err);

      res.status(500).json({ error: 'Airtable proxy error', details });
    },
  }),
);

app.get('/', (_req, res) => res.json({ status: 'proxy-running', message: 'Use /api/<table> or /meta/schema' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

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
    const mode = state.mode === 'register' ? 'register' : 'login';

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
    const fullName = (profile.name as string) || profile.email || 'Google User';

    if (!email) return res.status(400).json({ error: 'Google profile missing email' });

    const existingUser = await findAirtableRecordByFilter('SystemUsers', `({emailAddress}='${email.replace("'", "\\'")}')`);
    let userRecord = existingUser;
    if (!userRecord) {
      userRecord = await createAirtableRecord('SystemUsers', await getAirtableFieldsWithDefaults('SystemUsers', {
        emailAddress: email,
        fullName,
        role: mode === 'register' ? 'user' : 'user',
        accountStatus: 'active',
      }));
    }

    if (userRecord.fields?.accountStatus === 'locked') {
      return res.status(403).json({ error: 'Account locked' });
    }

    const sessionId = crypto.randomUUID();
    const sessionRecord = await createAirtableRecord('UserSession', await getAirtableFieldsWithDefaults('UserSession', {
      userId: userRecord.id,
      fullName: userRecord.fields?.fullName || fullName,
      role: userRecord.fields?.role || 'user',
      businessUnitId: userRecord.fields?.businessUnitId || '',
      sessionId,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    }));

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

    const sessionRecord = await findAirtableRecordByFilter('UserSession', `({sessionId}='${sessionId.replace("'", "\\'")}')`);
    if (!sessionRecord) return res.status(404).json({ error: 'Session not found' });

    const session = sessionRecord.fields;
    if (!session) return res.status(404).json({ error: 'Session fields missing' });

    const expiresAt = session.expiresAt as string;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    return res.json({ session: {
      userId: session.userId,
      fullName: session.fullName,
      role: session.role,
      businessUnitId: session.businessUnitId,
      sessionId: session.sessionId,
      expiresAt: session.expiresAt,
    }});
  } catch (error) {
    return res.status(500).json({ error: 'Session retrieval failed', details: error instanceof Error ? error.message : String(error) });
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

    // create admin user in SystemUsers table
    const usersUrl = `https://api.airtable.com/v0/${airtableBaseId}/SystemUsers`;

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
    defaults.fullName = emailAddress.split('@')[0];
    defaults.role = 'admin';
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

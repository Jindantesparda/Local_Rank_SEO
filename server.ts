import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import path from 'path';
import { runAudit, AuditError } from './server/auditPipeline';
import { generateCustomFix, generateCopilotResponse } from './server/ai';
import { createAuthRouter, getSessionUser, recordUsage } from './server/auth';
import { createWorkspaceRouter } from './server/workspace';
import { createCompetitorsRouter } from './server/competitors';
import { createReportsRouter } from './server/reportsRouter';
import { createMonitorRouter } from './server/monitorRouter';
import { createAnalyticsRouter } from './server/analyticsRouter';
import { createRankRouter } from './server/rankRouter';
import { getDb, dbHealth, databaseTarget , migrate} from './server/db';
import { importLegacyData } from './server/legacyImport';
import { clientKey, parseTrustProxy } from './server/proxy';
import { startMonitoring } from './server/monitor';
import { AuditResult, Business } from './src/types';
import { createBillingRouter } from './server/billing';
import { checkAuditLimit } from './server/planEnforcement';

/**
 * Simple in-memory rate limiter for the auth routes. Keeps one process honest
 * against credential stuffing without adding a dependency. If you scale to
 * multiple instances, move this to Redis or the host's edge limiter.
 */
function createAuthRateLimiter() {
  const WINDOW_MS = 15 * 60 * 1000;
  const MAX_ATTEMPTS = 30;
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = clientKey(req.ip);
    const entry = hits.get(key);

    if (!entry || entry.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    } else {
      entry.count += 1;
      if (entry.count > MAX_ATTEMPTS) {
        res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
        return res.status(429).json({
          error: 'Too many attempts. Please wait a few minutes and try again.',
        });
      }
    }

    // Opportunistic cleanup so the map cannot grow forever.
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (v.resetAt < now) hits.delete(k);
      }
    }

    return next();
  };
}


async function startServer() {
  // Create the schema before anything queries it.
  await migrate();
  // Storage: open (or create) the SQLite database, then import any data left
  // behind by the old JSON-file version. Import runs once, in a transaction.
  getDb();
  const importReport = await importLegacyData();
  if (importReport.ran) {
    console.log(
      `[db] imported legacy JSON → ${importReport.users} users, ${importReport.sessions} sessions, ` +
        `${importReport.payments} payments, ${importReport.subscriptions} subscriptions, ` +
        `${importReport.documents} documents`
    );
  } else {
    console.log(`[db] ready at ${databaseTarget()}${importReport.skipped ? ` (${importReport.skipped})` : ''}`);
  }

  const app = express();
  // Hosts such as Render/Railway/Fly set PORT. Fall back to 3000 locally.
  const PORT = Number(process.env.PORT) || 3000;

  /*
    Proxy hops. Express needs to know how many proxies to skip when reading
    X-Forwarded-For, because req.ip feeds the auth rate limiter.

    The default of 1 suits a single host proxy (Render, Railway, Fly, nginx).
    Behind Cloudflare in front of Render there are TWO, and leaving this at 1
    makes req.ip resolve to the Cloudflare edge — so every visitor shares one
    rate-limit bucket and 30 failed logins lock out the whole app. Set
    TRUST_PROXY=2 for that setup.
  */
  const proxy = parseTrustProxy(process.env.TRUST_PROXY);
  app.set('trust proxy', proxy.value);
  if (proxy.warning) {
    console.warn(`[proxy] ${proxy.warning}`);
  }
  console.log(`[proxy] trust proxy = ${JSON.stringify(proxy.value)} (${proxy.description})`);

  // Minimal security headers — no extra dependency required.
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '2mb' }));
  // Paynow's webhook posts form-urlencoded data
  app.use(express.urlencoded({ extended: false }));

  // API Routes
  app.get('/api/health', async (req, res) => {
    const db = await dbHealth();
    // Reports 503 when storage is unavailable so an uptime monitor can tell
    // "process is up" apart from "process can actually serve requests".
    res.status(db.ok ? 200 : 503).json({
      status: db.ok ? 'ok' : 'degraded',
      time: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      /**
       * The caller's own resolved IP, for verifying the proxy configuration
       * after deployment: if this shows a Cloudflare address rather than your
       * own, TRUST_PROXY is too low. It is the requester's own address, so
       * nothing is leaked to anyone else.
       */
      resolvedClientIp: req.ip,
      trustProxy: parseTrustProxy(process.env.TRUST_PROXY).value,
      database: {
        ok: db.ok,
        schemaVersion: db.schemaVersion,
        users: db.users,
        documents: db.documents,
        // Which database this process is actually talking to — confirms
        // Turso is wired up rather than falling back to a local file.
        target: db.target,
        remote: db.remote,
        error: db.error,
      },
    });
  });

  // Auth & user account routes (rate limited against credential stuffing)
  app.use('/api/auth', createAuthRateLimiter(), await createAuthRouter());

  // Billing & subscription routes
  app.use('/api/billing', createBillingRouter());

  // Per-user workspace (businesses + audits) syncs across devices
  app.use('/api/workspace', await createWorkspaceRouter());

  // Competitor comparison + search visibility
  app.use('/api/competitors', await createCompetitorsRouter());

  // Client-ready SEO reports (Agency plan)
  app.use('/api/reports', createReportsRouter());

  // Automated monitoring: real status + a manual "check now" for the signed-in user
  app.use('/api/monitor', await createMonitorRouter());

  // Google Analytics 4: measured visitor behaviour (operator credential, not per-user)
  app.use('/api/analytics', createAnalyticsRouter());

  // Keyword rank tracking + drop alerts
  app.use('/api/rankings', createRankRouter());

  // Real AI SEO Copilot
  app.post('/api/ai/copilot', async (req, res) => {
    try {
      const { message, audit } = req.body as { message?: string; audit?: AuditResult };
      if (!message || !audit) {
        return res.status(400).json({ error: 'Message and audit data are required.' });
      }
      const reply = await generateCopilotResponse(message, audit);
      return res.json({ reply });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Copilot request failed';
      return res.status(500).json({ error: message });
    }
  });

  // Start Real Audit
  app.post('/api/audit', checkAuditLimit, async (req, res) => {
    try {
      const { business, maxPages = 15 } = req.body as { business: Business; maxPages?: number };

      if (!business || !business.website) {
        return res.status(400).json({
          error: 'Website URL and business details are required.',
        });
      }

      // Shared with the monitoring scheduler so both produce identical results.
      const auditResult = await runAudit(business, { maxPages, useAi: true });

      // Count the audit server-side so plan limits are enforced authoritatively.
      const auditUser = await getSessionUser(req);
      if (auditUser) {
        await recordUsage(auditUser.id, { audits: 1, pages: auditResult.pagesAnalyzed });
      }

      return res.json({ audit: auditResult });
    } catch (err: unknown) {
      if (err instanceof AuditError) {
        console.error('Audit failed:', err.message);
        return res.status(err.status).json({ error: err.message });
      }
      console.error('Audit processing error:', err);
      const message = err instanceof Error ? err.message : 'Internal audit error';
      return res.status(500).json({ error: `Audit failed: ${message}` });
    }
  });

  // Custom AI Fix Generator
  app.post('/api/ai/fix', (req, res) => {
    try {
      const { issue, business, fixType } = req.body;
      if (!issue || !business || !fixType) {
        return res.status(400).json({ error: 'Missing issue, business, or fixType parameter' });
      }
      const fix = generateCustomFix(issue, business, fixType);
      return res.json({ fix });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Fix generation failed';
      return res.status(500).json({ error: message });
    }
  });

  // Vite middleware setup
  const runningCompiledBundle =
    process.env.NODE_ENV === 'production' ||
    (process.argv[1] || '').includes(`${path.sep}dist${path.sep}`);

  if (!runningCompiledBundle) {
    // Imported lazily so the production bundle never needs Vite (a
    // devDependency) at startup — `npm ci --omit=dev` is now safe.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA fallback — but never swallow unknown API routes.
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Not found.' });
      }
      return res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Search Vailable server running on http://0.0.0.0:${PORT}`);
    startMonitoring();
  });
}

startServer();

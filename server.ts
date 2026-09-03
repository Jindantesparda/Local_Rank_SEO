import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { crawlWebsite } from './server/crawler';
import { calculateSeoScore } from './server/scoring';
import { generateIssues } from './server/issues';
import { generateAiRecommendations, generateCustomFix, generateCopilotResponse } from './server/ai';
import { createAuthRouter } from './server/auth';
import { AuditResult, Business } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Auth & user account routes
  app.use('/api/auth', createAuthRouter());

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
  app.post('/api/audit', async (req, res) => {
    try {
      const { business, maxPages = 15 } = req.body as { business: Business; maxPages?: number };

      if (!business || !business.website) {
        return res.status(400).json({
          error: 'Website URL and business details are required.'
        });
      }

      // Format URL if protocol is missing
      let targetUrl = business.website.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
        business.website = targetUrl;
      }

      // Step 1: Real Crawler with retry logic
      let crawlData;
      try {
        crawlData = await crawlWebsite(targetUrl, Math.min(maxPages, 30), business);
      } catch (crawlErr: unknown) {
        const msg = crawlErr instanceof Error ? crawlErr.message : 'Crawler error';
        console.error('Crawl failed:', msg);
        return res.status(422).json({
          error: `We couldn't reach your website. ${msg}. Please ensure:\n- The website is online and public\n- The domain is correct (e.g., example.com)\n- The server accepts bot requests`,
        });
      }

      if (!crawlData || !crawlData.pages || crawlData.pages.length === 0) {
        console.error('No pages crawled for:', targetUrl);
        return res.status(422).json({
          error: 'We could not reach or parse any pages from this website. The server may be offline, blocking bot requests, or requiring JavaScript rendering.',
        });
      }

      // Log successful crawl
      console.log(`Successfully crawled ${crawlData.pages.length} pages from ${targetUrl}`);

      // Step 2: Deterministic Scoring
      const scoreBreakdown = calculateSeoScore(crawlData, business);

      // Step 3: Issues Generation
      const { issues, topPriorities } = generateIssues(crawlData, scoreBreakdown, business);

      // Step 4: AI Recommendations
      let aiRecommendations = [];
      try {
        aiRecommendations = await generateAiRecommendations(topPriorities, business);
      } catch (aiErr) {
        console.warn('AI recommendation generation error:', aiErr);
      }

      const auditResult: AuditResult = {
        id: `audit-${Date.now()}`,
        businessId: business.id || `biz-${Date.now()}`,
        business,
        createdAt: new Date().toISOString(),
        overallScore: scoreBreakdown.overallScore,
        technicalScore: scoreBreakdown.technicalScore,
        onpageScore: scoreBreakdown.onpageScore,
        localScore: scoreBreakdown.localScore,
        contentScore: scoreBreakdown.contentScore,
        pagesAnalyzed: crawlData.pages.length,
        criticalCount: issues.filter(i => i.severity === 'critical').length,
        warningCount: issues.filter(i => i.severity === 'high' || i.severity === 'medium').length,
        goodCount: issues.filter(i => i.severity === 'good').length,
        pages: crawlData.pages,
        issues,
        topPriorities,
        aiRecommendations,
        siteWideChecks: {
          https: crawlData.siteWide.https,
          robotsTxt: crawlData.siteWide.robotsTxt,
          sitemapXml: crawlData.siteWide.sitemapXml,
          canonicalConsistency: crawlData.siteWide.canonicalConsistency,
        },
        isDemo: false,
      };

      return res.json({ audit: auditResult });
    } catch (err: unknown) {
      console.error('Audit processing error:', err);
      const message = err instanceof Error ? err.message : 'Internal audit error';
      return res.status(500).json({
        error: `Audit failed: ${message}`,
      });
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
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LocalRank server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

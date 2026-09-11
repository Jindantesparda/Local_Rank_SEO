import { Business, DropOffAnalysis, DropOffSignal, DropOffSignal as Signal } from '../src/types';
import { CrawlResult } from './crawler';

/**
 * INFERRED DROP-OFF ANALYSIS
 * ---------------------------------------------------------------------------
 * Answers "why might visitors be leaving this site?" using only facts we can
 * measure from the site's own HTML:
 *
 *   - how long the server took to return the HTML
 *   - whether the page is set up for mobile screens (viewport)
 *   - how many scripts / how large the HTML is
 *   - whether there is an obvious way to get in touch (tel: link, contact page)
 *   - whether the homepage explains the business (H1 + enough words)
 *   - whether individual pages are too thin to be useful
 *
 * It deliberately does NOT use (and must never pretend to use) analytics:
 * bounce rate, exit pages, time on page, sessions, device splits or traffic
 * sources. Those require the client's own analytics to be connected.
 *
 * Every signal therefore carries `evidence` (the measurement) and `basedOn`
 * (a plain-English label of that measurement) so the UI can be honest about
 * what was actually observed.
 */

const NOTE =
  'These are likely causes, inferred from your pages — not measured visitor behaviour. No analytics, bounce rate or session data is used. Connect your analytics to see what visitors actually did.';

/** Homepage HTML response time that we consider slow for a first byte-to-render. */
const SLOW_MS = 1500;
const VERY_SLOW_MS = 3000;
const HEAVY_HTML_BYTES = 400 * 1024; // 400 KB of HTML alone
const MANY_SCRIPTS = 20;
const THIN_WORDS = 150;
const HOMEPAGE_MIN_WORDS = 120;

function ms(value: number): string {
  return `${value.toLocaleString('en-US')} ms`;
}

function kb(bytes: number): string {
  return `${Math.round(bytes / 1024).toLocaleString('en-US')} KB`;
}

function paths(pages: { path: string }[], limit = 3): string {
  const list = pages.slice(0, limit).map((p) => p.path || '/');
  const extra = pages.length - list.length;
  return extra > 0 ? `${list.join(', ')} +${extra} more` : list.join(', ');
}

export function generateDropOffAnalysis(
  crawlData: CrawlResult,
  business: Business
): DropOffAnalysis {
  const signals: Signal[] = [];

  // Only analyse pages that actually loaded. Error/404 pages tell us nothing
  // about why a visitor would leave a working page.
  const live = (crawlData.pages || []).filter((p) => p.statusCode >= 200 && p.statusCode < 400);
  const homepage = live.find((p) => p.path === '/' || p.path === '') || live[0];

  if (!homepage) {
    return {
      signals: [],
      summary: 'No pages could be analysed',
      inferred: true,
      note: NOTE,
    };
  }

  const businessName = business?.name || 'this business';
  const service = business?.services?.[0] || business?.category || 'your service';

  // ---------------------------------------------------------------------
  // 1. Slow server response — visitors abandon before the page appears
  // ---------------------------------------------------------------------
  const timed = live.filter((p) => typeof p.loadTimeMs === 'number' && p.loadTimeMs! > 0);
  if (timed.length > 0) {
    const slowest = timed.reduce((a, b) => (b.loadTimeMs! > a.loadTimeMs! ? b : a));
    const slowCount = timed.filter((p) => (p.loadTimeMs || 0) > SLOW_MS).length;

    if (slowest.loadTimeMs! > VERY_SLOW_MS) {
      signals.push({
        id: 'dropoff-slow-server',
        title: 'Pages take too long to respond, so visitors leave before they see anything',
        likelihood: 'high',
        evidence: `Your slowest page (${slowest.path || '/'}) returned its HTML in ${ms(
          slowest.loadTimeMs!
        )}. ${slowCount} of ${timed.length} pages took longer than ${ms(SLOW_MS)}.`,
        whyItMatters:
          'Most people abandon a page that has not appeared within about three seconds. A slow response is the single most common reason a visitor never sees your content at all.',
        suggestedAction:
          'Ask your host about server response time, enable caching, and check for slow plugins or scripts running before the page is sent.',
        affectedPages: [slowest.path || '/'],
        basedOn: 'Time to fetch the page HTML (measured on every page we crawled)',
      });
    } else if (slowest.loadTimeMs! > SLOW_MS) {
      signals.push({
        id: 'dropoff-slow-server',
        title: 'Some pages respond slowly enough to lose impatient visitors',
        likelihood: 'medium',
        evidence: `${slowCount} of ${timed.length} pages took longer than ${ms(
          SLOW_MS
        )} to return HTML. The slowest was ${slowest.path || '/'} at ${ms(slowest.loadTimeMs!)}.`,
        whyItMatters:
          'Visitors on mobile data are the quickest to leave. A slow response on a page they care about costs you the visit.',
        suggestedAction: 'Add caching and look for slow scripts or database queries on these pages.',
        affectedPages: [slowest.path || '/'],
        basedOn: 'Time to fetch the page HTML (measured on every page we crawled)',
      });
    }
  }

  // ---------------------------------------------------------------------
  // 2. Not set up for mobile screens
  // ---------------------------------------------------------------------
  const noViewport = live.filter((p) => p.hasViewport === false);
  if (noViewport.length > 0) {
    const homepageAffected = noViewport.some((p) => p === homepage);
    signals.push({
      id: 'dropoff-no-viewport',
      title: 'Pages are not set up for mobile screens',
      likelihood: homepageAffected ? 'high' : 'medium',
      evidence: `${noViewport.length} of ${live.length} pages have no \`width=device-width\` viewport tag — including ${
        homepageAffected ? 'your homepage' : paths(noViewport)
      }.`,
      whyItMatters:
        'Without a mobile viewport the browser shows a zoomed-out desktop layout on a phone. Most local searches happen on a phone, and a page that needs pinching and zooming is quickly abandoned.',
      suggestedAction:
        'Add `<meta name="viewport" content="width=device-width, initial-scale=1">` to the `<head>` of every page, and check the layout on a phone.',
      affectedPages: noViewport.map((p) => p.path || '/').slice(0, 5),
      basedOn: 'Presence of a mobile viewport meta tag in the page HTML',
    });
  }

  // ---------------------------------------------------------------------
  // 3. No obvious way to get in touch
  // ---------------------------------------------------------------------
  const anyClickToCall = live.some((p) => p.hasClickToCall);
  const hasContactPage = live.some(
    (p) =>
      p.path.toLowerCase().includes('contact') ||
      p.internalLinks.some((l) => l.toLowerCase().includes('contact'))
  );
  const hasForm = live.some((p) => (p.formCount || 0) > 0);

  if (!anyClickToCall && !hasContactPage) {
    signals.push({
      id: 'dropoff-no-contact',
      title: 'There is no obvious way to contact the business',
      likelihood: 'high',
      evidence: `No click-to-call phone link was found on any of the ${live.length} pages checked, and no contact page was found${
        hasForm ? ' (a form was detected, but it is not on a linked contact page)' : ''
      }.`,
      whyItMatters:
        'People who are ready to buy leave when they cannot find a phone number or contact page in seconds. They rarely come back — they call the next business in the results instead.',
      suggestedAction:
        'Add a visible phone number that is tappable on mobile, and a contact page linked from the main menu and footer.',
      affectedPages: [homepage.path || '/'],
      basedOn: 'Presence of tel: links and a contact page in the crawled HTML',
    });
  } else if (!anyClickToCall) {
    signals.push({
      id: 'dropoff-no-click-to-call',
      title: 'Phone number is not tappable on mobile',
      likelihood: 'medium',
      evidence:
        'A contact page was found, but no click-to-call (tel:) link was detected anywhere on the site.',
      whyItMatters:
        'A mobile visitor has to copy the number by hand, or leave your site to dial. Many simply give up at that point.',
      suggestedAction:
        'Wrap phone numbers in a link such as `<a href="tel:+263...">Call us</a>` so one tap starts the call.',
      affectedPages: [homepage.path || '/'],
      basedOn: 'Presence of tel: links in the crawled HTML',
    });
  } else if (!hasForm && !hasContactPage) {
    signals.push({
      id: 'dropoff-no-form',
      title: 'Visitors who prefer writing to calling have no form to use',
      likelihood: 'low',
      evidence: 'A click-to-call link exists, but no contact form was found on the crawled pages.',
      whyItMatters:
        'Some visitors will not phone. Without a form they leave to find an alternative, especially outside business hours.',
      suggestedAction: 'Add a short contact or enquiry form to a contact page.',
      affectedPages: [homepage.path || '/'],
      basedOn: 'Presence of a <form> element in the crawled HTML',
    });
  }

  // ---------------------------------------------------------------------
  // 4. The homepage does not explain what the business does
  // ---------------------------------------------------------------------
  const homepageWords = homepage.wordCount || 0;
  if (!homepage.h1) {
    signals.push({
      id: 'dropoff-unclear-homepage',
      title: 'The homepage never states what the business does',
      likelihood: 'high',
      evidence: 'Your homepage has no H1 main heading.',
      whyItMatters:
        'Visitors decide in a few seconds whether they are in the right place. With no clear headline they have to read the whole page to find out, and most will not.',
      suggestedAction: `Add a one-line H1 that names the service and the place, e.g. "${businessName} — ${service} in ${
        (business?.location || '').split(',')[0].trim() || 'your town'
      }".`,
      affectedPages: [homepage.path || '/'],
      basedOn: 'Presence of an H1 heading on the homepage',
    });
  } else if (homepageWords > 0 && homepageWords < HOMEPAGE_MIN_WORDS) {
    signals.push({
      id: 'dropoff-thin-homepage',
      title: 'The homepage gives visitors almost nothing to act on',
      likelihood: 'medium',
      evidence: `The homepage has only about ${homepageWords} words of visible text.`,
      whyItMatters:
        'A very short homepage leaves questions unanswered — what you offer, where you are, and what to do next. Visitors leave to find a business that answers them.',
      suggestedAction:
        'Explain your main service, the area you cover, and how to get started — then point to a clear next step.',
      affectedPages: [homepage.path || '/'],
      basedOn: 'Visible word count of the homepage',
    });
  }

  // ---------------------------------------------------------------------
  // 5. Heavy pages — lots of scripts or a very large HTML document
  // ---------------------------------------------------------------------
  const scriptHeavy = live.filter((p) => (p.scriptCount || 0) > MANY_SCRIPTS);
  const htmlHeavy = live.filter((p) => (p.htmlBytes || 0) > HEAVY_HTML_BYTES);

  if (scriptHeavy.length > 0) {
    const worst = scriptHeavy.reduce((a, b) => ((b.scriptCount || 0) > (a.scriptCount || 0) ? b : a));
    signals.push({
      id: 'dropoff-script-heavy',
      title: 'Pages load a lot of scripts, which delays everything else',
      likelihood: 'medium',
      evidence: `${worst.path || '/'} loads ${worst.scriptCount} scripts. ${
        scriptHeavy.length
      } of ${live.length} pages load more than ${MANY_SCRIPTS}.`,
      whyItMatters:
        'Each script must download and run before the page settles. On a phone this shows up as a page that jumps around or feels stuck — and visitors leave.',
      suggestedAction:
        'Remove unused plugins and tags, then load only the scripts each page actually needs.',
      affectedPages: scriptHeavy.map((p) => p.path || '/').slice(0, 5),
      basedOn: 'Number of <script> tags in the page HTML',
    });
  }

  if (htmlHeavy.length > 0) {
    const worst = htmlHeavy.reduce((a, b) => ((b.htmlBytes || 0) > (a.htmlBytes || 0) ? b : a));
    signals.push({
      id: 'dropoff-heavy-html',
      title: 'Very large HTML documents take longer to arrive and render',
      likelihood: 'low',
      evidence: `${worst.path || '/'} sends ${kb(
        worst.htmlBytes || 0
      )} of HTML alone (before images, CSS and scripts).`,
      whyItMatters:
        'A bloated document delays the first paint, particularly on mobile data, and visitors see a blank screen while they wait.',
      suggestedAction: 'Trim unused markup and content builders, and move repeated blocks into templates.',
      affectedPages: htmlHeavy.map((p) => p.path || '/').slice(0, 5),
      basedOn: 'Size of the HTML response only (not images, CSS or scripts)',
    });
  }

  // ---------------------------------------------------------------------
  // 6. Thin inner pages
  // ---------------------------------------------------------------------
  const thin = live.filter(
    (p) => p !== homepage && (p.wordCount || 0) > 0 && (p.wordCount || 0) < THIN_WORDS
  );
  if (thin.length > 0) {
    signals.push({
      id: 'dropoff-thin-pages',
      title: 'Some pages are too thin to answer the visitor question',
      likelihood: thin.length >= 3 ? 'medium' : 'low',
      evidence: `${thin.length} page${
        thin.length > 1 ? 's have' : ' has'
      } very little text: ${paths(thin)}.`,
      whyItMatters:
        'A visitor arriving from search on a specific question needs that question answered on the page. Thin pages send them back to the results to try someone else.',
      suggestedAction:
        'Expand these pages with the detail a customer needs: what is included, the area covered, and answers to common questions.',
      affectedPages: thin.map((p) => p.path || '/').slice(0, 5),
      basedOn: 'Visible word count of each crawled page',
    });
  }

  // ---------------------------------------------------------------------
  // 7. Nothing wrong we can see — say so rather than inventing a problem
  // ---------------------------------------------------------------------
  if (signals.length === 0) {
    return {
      signals: [],
      summary: 'No likely drop-off causes found in your page HTML',
      inferred: true,
      note:
        'We found no page-level issues that typically cause visitors to leave — pages responded quickly, are set up for mobile, and offer a clear way to get in touch. This does not prove visitors stay; only your analytics can show that.',
    };
  }

  const order = { high: 0, medium: 1, low: 2 };
  signals.sort((a, b) => order[a.likelihood] - order[b.likelihood]);

  const highCount = signals.filter((s) => s.likelihood === 'high').length;
  const summary =
    highCount > 0
      ? `${signals.length} likely cause${signals.length > 1 ? 's' : ''} found, ${highCount} of them high impact`
      : `${signals.length} likely cause${signals.length > 1 ? 's' : ''} found`;

  return { signals, summary, inferred: true, note: NOTE };
}

export type { DropOffSignal };

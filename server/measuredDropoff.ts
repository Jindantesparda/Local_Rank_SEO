import { AnalyticsSummary } from './ga4';

/**
 * Measured drop-off signals, derived from the client's own Google Analytics 4.
 *
 * This is the counterpart to `dropoff.ts`. That module *infers* likely causes
 * from the pages; this one reports what visitors actually did. The two are kept
 * separate on purpose so the UI can label them honestly:
 *
 *   inferred → "likely causes, from your pages"
 *   measured → "from your Google Analytics, last 28 days"
 *
 * Every rule below is a comparison against the client's own baseline, and is
 * suppressed when there is not enough traffic for the comparison to mean
 * anything.
 */

export interface MeasuredSignal {
  id: string;
  title: string;
  likelihood: 'high' | 'medium' | 'low';
  /** The raw number we measured, e.g. "78% of 42 sessions". */
  measured: string;
  /** What it is being compared against. */
  baseline: string;
  whyItMatters: string;
  suggestedAction: string;
  /** Landing page path this applies to, when page-specific. */
  page?: string;
  sessions: number;
}

export interface MeasuredDropOff {
  connected: true;
  rangeDays: number;
  fetchedAt: string;
  headline: string;
  signals: MeasuredSignal[];
  /** True once there is enough traffic for the comparisons to be reliable. */
  hasEnoughData: boolean;
  totalSessions: number;
}

/** Below this many sessions we do not draw conclusions. */
const MIN_SESSIONS_FOR_VERDICT = 50;
/** A landing page needs at least this many sessions to be judged. */
const MIN_PAGE_SESSIONS = 10;

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function seconds(value: number): string {
  if (value < 60) return `${value}s`;
  const mins = Math.floor(value / 60);
  const secs = value % 60;
  return `${mins}m ${secs}s`;
}

function severity(ratio: number): 'high' | 'medium' | 'low' {
  if (ratio >= 1.6) return 'high';
  if (ratio >= 1.3) return 'medium';
  return 'low';
}

export function deriveMeasuredDropOff(summary: AnalyticsSummary): MeasuredDropOff {
  const signals: MeasuredSignal[] = [];
  const { totals, rangeDays, topLandingPages, devices, channels } = summary;
  const sessions = totals.sessions;
  const enough = sessions >= MIN_SESSIONS_FOR_VERDICT;
  const siteBounce = totals.bounceRate;
  const avgEngagement = totals.avgEngagementSeconds;

  // Without enough traffic, percentage comparisons are noise. Report the
  // headline and stop, rather than accusing a page on the strength of 3 visits.
  if (!enough) {
    return {
      connected: true,
      rangeDays,
      fetchedAt: summary.fetchedAt,
      headline: `Analytics is connected, but there are only ${sessions} session${
        sessions === 1 ? '' : 's'
      } in the last ${rangeDays} days — not enough to draw reliable conclusions yet. The inferred signals below still apply.`,
      signals: [],
      hasEnoughData: false,
      totalSessions: sessions,
    };
  }

  /* 1. Site-wide bounce rate vs the healthy benchmark ------------------ */
  if (enough && siteBounce >= 0.6) {
    signals.push({
      id: 'measured-site-bounce',
      title: 'Most visitors leave after a single page',
      likelihood: siteBounce >= 0.75 ? 'high' : 'medium',
      measured: `${pct(siteBounce)} bounce rate across ${sessions} sessions`,
      baseline: 'Under 40% is typical for a strong local site',
      whyItMatters:
        'A high bounce rate means the traffic you are already paying for or earning is not turning into enquiries. Nothing else you fix will matter as much as this.',
      suggestedAction:
        'Compare your worst landing pages below and make sure each one states the service, the location and a way to contact you within the first screen.',
      sessions,
    });
  }

  /* 2. Landing pages that bounce far worse than the site average ------- */
  if (enough && topLandingPages.length > 0) {
    const worst = topLandingPages
      .filter((p) => p.sessions >= MIN_PAGE_SESSIONS && siteBounce > 0)
      .filter((p) => p.bounceRate >= siteBounce * 1.3 && p.bounceRate >= 0.6)
      .sort((a, b) => b.bounceRate * b.sessions - a.bounceRate * a.sessions)
      .slice(0, 3);

    for (const page of worst) {
      signals.push({
        id: `measured-page-bounce-${page.path}`,
        title: `Visitors leave ${page.path} far more often than the rest of your site`,
        likelihood: severity(page.bounceRate / (siteBounce || 1)),
        measured: `${pct(page.bounceRate)} bounce rate from ${page.sessions} sessions, ${seconds(
          page.avgEngagementSeconds
        )} average engagement`,
        baseline: `Site average is ${pct(siteBounce)}`,
        whyItMatters:
          'This page is doing the job of a front door, and most people are turning around at it. Fixing one high-traffic page like this usually beats a site-wide rewrite.',
        suggestedAction: `Open ${page.path} on a phone. Check the first screen answers: what is this, where are you, and how do I contact you. Then compare it against your best-performing landing page.`,
        page: page.path,
        sessions: page.sessions,
      });
    }
  }

  /* 3. Engagement time too short to read anything --------------------- */
  if (enough && avgEngagement > 0 && avgEngagement < 20) {
    signals.push({
      id: 'measured-low-engagement',
      title: 'Visitors are not staying long enough to read your page',
      likelihood: avgEngagement < 10 ? 'high' : 'medium',
      measured: `${seconds(avgEngagement)} average engagement per session`,
      baseline: 'Local service pages typically hold visitors for 40s or more',
      whyItMatters:
        'People are arriving and leaving before they reach the information that convinces them to get in touch — an address, a price, a phone number, proof you are real.',
      suggestedAction:
        'Move the practical details above the fold: what you do, where you are, when you are open, and a tappable phone number.',
      sessions,
    });
  }

  /* 4. Mobile far worse than desktop ---------------------------------- */
  const mobile = devices.find((d) => d.device.toLowerCase() === 'mobile');
  const desktop = devices.find((d) => d.device.toLowerCase() === 'desktop');
  if (
    mobile &&
    desktop &&
    mobile.sessions >= MIN_PAGE_SESSIONS &&
    desktop.sessions >= MIN_PAGE_SESSIONS &&
    mobile.bounceRate >= desktop.bounceRate * 1.25 &&
    mobile.bounceRate >= 0.5
  ) {
    signals.push({
      id: 'measured-mobile-gap',
      title: 'Phone visitors give up much more often than desktop visitors',
      likelihood: severity(mobile.bounceRate / (desktop.bounceRate || 1)),
      measured: `${pct(mobile.bounceRate)} bounce on mobile vs ${pct(
        desktop.bounceRate
      )} on desktop (${mobile.sessions} vs ${desktop.sessions} sessions)`,
      baseline: 'A gap this wide usually points at the mobile experience itself',
      whyItMatters:
        'Most local searches happen on a phone. If mobile bounces are this much worse, the problem is something only visible on a small screen — slow loading, tiny tap targets, or a layout that pushes contact details out of reach.',
      suggestedAction:
        'Test the site on a real phone over mobile data, not on desktop wifi. Time how long until you can tap a phone number.',
      sessions: mobile.sessions,
    });
  }

  /* 5. A channel sending traffic that bounces ------------------------- */
  if (enough) {
    const leaky = channels
      .filter((c) => c.sessions >= MIN_PAGE_SESSIONS && c.bounceRate >= Math.max(0.7, siteBounce * 1.25))
      .sort((a, b) => b.sessions - a.sessions)[0];

    if (leaky) {
      signals.push({
        id: `measured-channel-${leaky.channel}`,
        title: `${leaky.channel} traffic is bouncing harder than the rest`,
        likelihood: severity(leaky.bounceRate / (siteBounce || 1)),
        measured: `${pct(leaky.bounceRate)} bounce from ${leaky.sessions} sessions`,
        baseline: `Site average is ${pct(siteBounce)}`,
        whyItMatters:
          'Traffic from this channel is being promised something the page does not deliver. That is usually a mismatch between the advert, listing or post and the page it lands on.',
        suggestedAction: `Make sure the page ${leaky.channel} visitors land on repeats the same wording and offer that brought them there.`,
        sessions: leaky.sessions,
      });
    }
  }

  /* 6. Everything riding on one page ---------------------------------- */
  if (enough && topLandingPages.length > 1) {
    const top = topLandingPages[0];
    const share = top.sessions / sessions;
    if (share >= 0.7) {
      signals.push({
        id: 'measured-funnel-concentration',
        title: `Almost all of your traffic enters through one page`,
        likelihood: 'medium',
        measured: `${pct(share)} of sessions (${top.sessions} of ${sessions}) start on ${top.path}`,
        baseline: 'A healthier spread across several pages is more resilient',
        whyItMatters:
          'If that single page underperforms or drops out of search, your enquiries drop with it. It also means the rest of your site is not attracting visitors at all.',
        suggestedAction:
          'Build or improve service and location pages so searches for specific things land somewhere more relevant than your homepage.',
        page: top.path,
        sessions: top.sessions,
      });
    }
  }

  const headline =
    signals.length === 0
      ? `${sessions} sessions in the last ${rangeDays} days. No page stands out as a problem — bounce rate is ${pct(
          siteBounce
        )} with ${seconds(avgEngagement)} average engagement.`
      : `${sessions} sessions in the last ${rangeDays} days. ${signals.length} measured issue${
          signals.length === 1 ? '' : 's'
        } found, based on real visitor behaviour.`;

  return {
    connected: true,
    rangeDays,
    fetchedAt: summary.fetchedAt,
    headline,
    signals,
    hasEnoughData: enough,
    totalSessions: sessions,
  };
}

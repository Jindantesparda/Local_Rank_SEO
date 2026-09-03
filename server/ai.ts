import { GoogleGenAI } from '@google/genai';
import { AuditResult, Business, SeoIssue, AiRecommendation, SuggestedFix } from '../src/types';
import { guessCountryCode } from './country';

const AI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

let genAIClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

export async function generateAiRecommendations(
  issues: SeoIssue[],
  business: Business
): Promise<AiRecommendation[]> {
  const topIssues = issues.filter(i => i.severity !== 'good').slice(0, 5);
  if (topIssues.length === 0) {
    return [];
  }

  const client = getAiClient();

  if (client) {
    try {
      const prompt = `
You are LocalRank, an expert SEO consultant for local small businesses.
Analyze the following audited business and its identified SEO issues.

BUSINESS DATA:
Name: ${business.name}
Website: ${business.website}
Location: ${business.location}
Category: ${business.category}
Description: ${business.description || 'Not provided'}
Services: ${(business.services || []).join(', ')}

IDENTIFIED ISSUES:
${topIssues.map((issue, idx) => `
Issue #${idx + 1}:
ID: ${issue.id}
Title: ${issue.title}
Severity: ${issue.severity}
Category: ${issue.category}
Affected Page: ${issue.affectedPage}
Current Issue Description: ${issue.description}
Current Fix: ${issue.suggestedFix ? JSON.stringify(issue.suggestedFix) : 'None'}
`).join('\n')}

STRICT RULES:
1. Ground all recommendations ONLY in the provided business data and issues above. Do not invent fake analytics or crawl facts.
2. Provide practical, plain-English advice without unnecessary jargon.
3. For each issue, output a JSON array of recommendation objects with the exact schema:
[
  {
    "issueId": "string matching the issue ID",
    "problem": "plain-language summary of what is wrong",
    "explanation": "concise explanation of why this occurs",
    "whyItMatters": "business impact on Google local rankings and customer clicks",
    "recommendedSolution": "exact actionable steps to take",
    "suggestedCopy": "precise text, title, meta description or code snippet to use",
    "expectedImpact": "High / Medium / Low with expected outcome",
    "difficulty": "Easy (5 mins) / Medium / Hard",
    "fixType": "title | metaDescription | altText | schema | content",
    "currentValue": "current text if available",
    "recommendedValue": "recommended copy or JSON-LD code"
  }
]
Output ONLY raw valid JSON. No markdown ticks, no commentary.
`;

      const response = await client.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        }
      });

      const text = response.text?.trim() || '';
      if (text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item, idx) => ({
            id: `ai-rec-${idx + 1}`,
            issueId: item.issueId || topIssues[idx]?.id || `issue-${idx + 1}`,
            problem: item.problem || topIssues[idx]?.title || '',
            explanation: item.explanation || topIssues[idx]?.description || '',
            whyItMatters: item.whyItMatters || topIssues[idx]?.whyItMatters || '',
            recommendedSolution: item.recommendedSolution || topIssues[idx]?.recommendedAction || '',
            suggestedCopy: item.suggestedCopy || item.recommendedValue || '',
            expectedImpact: item.expectedImpact || 'High impact on local rankings',
            difficulty: item.difficulty || 'Easy',
            fixType: item.fixType,
            currentValue: item.currentValue,
            recommendedValue: item.recommendedValue || item.suggestedCopy,
          }));
        }
      }
    } catch (err) {
      console.warn('Gemini API call encountered an error or was unavailable, using deterministic recommendations:', err);
    }
  }

  // Deterministic Fallback
  return fallbackRecommendations(topIssues, business);
}

export function generateCustomFix(
  issue: SeoIssue,
  business: Business,
  fixType: 'title' | 'metaDescription' | 'altText' | 'schema'
): SuggestedFix {
  const cleanLoc = business.location.split(',')[0].trim();
  const primaryService = business.services?.[0] || business.category;

  switch (fixType) {
    case 'title':
      return {
        type: 'title',
        current: issue.suggestedFix?.current || 'Untitled',
        recommended: `${business.name} | ${primaryService} in ${cleanLoc}`,
        targetElement: '<title> in <head>',
      };

    case 'metaDescription':
      return {
        type: 'metaDescription',
        current: issue.suggestedFix?.current || 'None',
        recommended: `Looking for trusted ${primaryService.toLowerCase()} in ${cleanLoc}? ${business.name} provides expert, dependable services. Call or visit us today!`,
        targetElement: '<meta name="description"> in <head>',
      };

    case 'altText':
      return {
        type: 'altText',
        current: issue.suggestedFix?.current || '<img src="..." alt="" />',
        recommended: `${business.name} ${primaryService} services located in ${cleanLoc}`,
        targetElement: 'Image alt tag',
      };

    case 'schema': {
      const countryCode = guessCountryCode(business.location);
      const address: { '@type': string; addressLocality: string; addressCountry?: string } = {
        '@type': 'PostalAddress',
        addressLocality: cleanLoc,
      };
      if (countryCode) {
        address.addressCountry = countryCode;
      }

      const schemaObj = {
        "@context": "https://schema.org",
        "@type": getSchemaType(business.category),
        "name": business.name,
        "description": business.description || `${business.category} in ${business.location}`,
        "url": business.website,
        "address": address
      };
      return {
        type: 'schema',
        recommended: JSON.stringify(schemaObj, null, 2),
        language: 'json',
        targetElement: '<script type="application/ld+json"> in <head>',
      };
    }

    default:
      return {
        type: 'title',
        recommended: `${business.name} | ${cleanLoc}`,
      };
  }
}

function getSchemaType(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes('restaurant') || cat.includes('cafe') || cat.includes('food')) return 'Restaurant';
  if (cat.includes('dentist') || cat.includes('dental')) return 'Dentist';
  if (cat.includes('clinic') || cat.includes('health') || cat.includes('doctor')) return 'MedicalClinic';
  if (cat.includes('hotel') || cat.includes('lodging') || cat.includes('accommodation')) return 'LodgingBusiness';
  if (cat.includes('salon') || cat.includes('hair') || cat.includes('beauty')) return 'BeautySalon';
  if (cat.includes('plumb')) return 'Plumber';
  if (cat.includes('law') || cat.includes('attorney')) return 'LegalService';
  if (cat.includes('account') || cat.includes('finance')) return 'AccountingService';
  if (cat.includes('real estate')) return 'RealEstateAgent';
  if (cat.includes('store') || cat.includes('retail') || cat.includes('shop')) return 'Store';
  return 'LocalBusiness';
}

function fallbackRecommendations(issues: SeoIssue[], business: Business): AiRecommendation[] {
  const cleanLoc = business.location.split(',')[0].trim();
  const primaryService = business.services?.[0] || business.category;

  return issues.map((issue, idx) => {
    let fixType: AiRecommendation['fixType'] = undefined;
    let recVal = issue.suggestedFix?.recommended || '';
    let currVal = issue.suggestedFix?.current || '';

    if (issue.title.toLowerCase().includes('title')) {
      fixType = 'title';
      currVal = issue.suggestedFix?.current || 'Generic Title';
      recVal = `${business.name} | ${primaryService} in ${cleanLoc}`;
    } else if (issue.title.toLowerCase().includes('meta description')) {
      fixType = 'metaDescription';
      currVal = issue.suggestedFix?.current || 'None';
      recVal = `Looking for trusted ${primaryService.toLowerCase()} in ${cleanLoc}? ${business.name} provides expert, dependable services. Call or visit us today!`;
    } else if (issue.title.toLowerCase().includes('schema')) {
      fixType = 'schema';
      recVal = JSON.stringify({
        "@context": "https://schema.org",
        "@type": getSchemaType(business.category),
        "name": business.name,
        "description": business.description || `${business.category} in ${business.location}`,
        "url": business.website,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": cleanLoc
        }
      }, null, 2);
    } else if (issue.title.toLowerCase().includes('alt')) {
      fixType = 'altText';
      currVal = '<img src="..." alt="" />';
      recVal = `${business.name} ${primaryService} service in ${cleanLoc}`;
    }

    return {
      id: `ai-rec-${idx + 1}`,
      issueId: issue.id,
      problem: issue.title,
      explanation: issue.description,
      whyItMatters: issue.whyItMatters,
      recommendedSolution: issue.recommendedAction,
      suggestedCopy: recVal,
      expectedImpact: issue.impact === 'high' ? 'High — direct ranking and click boost' : 'Medium — improved relevance',
      difficulty: issue.difficulty === 'easy' ? 'Easy (5–10 minutes)' : 'Medium',
      fixType,
      currentValue: currVal,
      recommendedValue: recVal,
    };
  });
}

export async function generateCopilotResponse(
  message: string,
  audit: AuditResult
): Promise<string> {
  const client = getAiClient();

  if (client) {
    try {
      const prompt = `
You are the LocalRank SEO assistant embedded inside a local SEO audit dashboard.
Answer the business owner's question using ONLY the audit data below. Be concise, practical,
and never invent crawl metrics that are not present in the audit data.

AUDIT DATA:
Business: ${audit.business.name}
Website: ${audit.business.website}
Location: ${audit.business.location}
Category: ${audit.business.category}
Overall Score: ${audit.overallScore}/100
Technical: ${audit.technicalScore}/25, On-page: ${audit.onpageScore}/30, Local: ${audit.localScore}/25, Content: ${audit.contentScore}/20
Pages crawled: ${audit.pagesAnalyzed}

ISSUES:
${audit.issues
  .filter((i) => i.severity !== 'good')
  .slice(0, 8)
  .map(
    (i, idx) =>
      `${idx + 1}. [${i.severity}] ${i.title}\n   Page: ${i.affectedPage}\n   Why it matters: ${i.whyItMatters}\n   Recommended action: ${i.recommendedAction}\n   Suggested fix: ${
        i.suggestedFix?.recommended || 'See issue detail'
      }`
  )
  .join('\n')}

USER QUESTION: ${message}

Reply in 1-3 short, plain-English sentences. If the question asks how to fix something,
include the exact copy/code snippet from the matching issue when available.
`;

      const response = await client.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          temperature: 0.3,
        },
      });

      const text = response.text?.trim() || '';
      if (text) {
        return text.slice(0, 1200);
      }
    } catch (err) {
      console.warn('Copilot Gemini call failed, using deterministic fallback:', err);
    }
  }

  return deterministicCopilot(message, audit);
}

function deterministicCopilot(message: string, audit: AuditResult): string {
  const q = message.toLowerCase();
  const actionable = audit.issues.filter((i) => i.severity !== 'good');

  // Try to match the question against a specific issue
  const keywords: Array<{ terms: string[]; test: (issue: SeoIssue) => boolean }> = [
    {
      terms: ['title'],
      test: (i) => i.suggestedFix?.type === 'title' || i.title.toLowerCase().includes('title'),
    },
    {
      terms: ['meta description', 'meta', 'description'],
      test: (i) =>
        i.suggestedFix?.type === 'metaDescription' ||
        i.title.toLowerCase().includes('meta description'),
    },
    {
      terms: ['schema', 'structured data', 'json-ld', 'json ld'],
      test: (i) =>
        i.suggestedFix?.type === 'schema' ||
        i.actionType === 'generate_schema' ||
        i.title.toLowerCase().includes('schema') ||
        i.title.toLowerCase().includes('structured'),
    },
    {
      terms: ['alt', 'image'],
      test: (i) =>
        i.suggestedFix?.type === 'altText' || i.title.toLowerCase().includes('alt'),
    },
    {
      terms: ['page', 'content', 'service'],
      test: (i) =>
        i.actionType === 'generate_page' ||
        i.title.toLowerCase().includes('page') ||
        i.title.toLowerCase().includes('content'),
    },
  ];

  for (const group of keywords) {
    if (group.terms.some((t) => q.includes(t))) {
      const match = actionable.find((i) => group.test(i));
      if (match?.suggestedFix?.recommended) {
        return `Here's how to fix "${match.title}": ${match.recommendedAction}\n\nCopy this: ${match.suggestedFix.recommended}`;
      }
      if (match) {
        return `Here's how to fix "${match.title}": ${match.recommendedAction}`;
      }
    }
  }

  const top = audit.topPriorities?.slice(0, 3) || actionable.slice(0, 3);
  if (top.length === 0) {
    return 'Your audit looks clean — no critical issues were found. Keep your content fresh and re-audit after making changes.';
  }

  return `Your top priorities right now are:\n${top
    .map((t, idx) => `${idx + 1}. ${t.title} — ${t.recommendedAction}`)
    .join('\n')}\n\nOpen the Website Audit tab for the full breakdown.`;
}

import { GoogleGenAI } from '@google/genai';
import { Business, SeoIssue, AiRecommendation, SuggestedFix } from '../src/types';

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
You are LocalRank AI, an expert SEO consultant for local small businesses.
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
        model: 'gemini-3.8-flash',
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

    case 'schema':
      const schemaObj = {
        "@context": "https://schema.org",
        "@type": getSchemaType(business.category),
        "name": business.name,
        "description": business.description || `${business.category} in ${business.location}`,
        "url": business.website,
        "telephone": "+263-XX-XXXXXX",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": cleanLoc,
          "addressCountry": business.location.includes('Zimbabwe') ? 'ZW' : 'US'
        },
        "priceRange": "$$"
      };
      return {
        type: 'schema',
        recommended: JSON.stringify(schemaObj, null, 2),
        language: 'json',
        targetElement: '<script type="application/ld+json"> in <head>',
      };

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

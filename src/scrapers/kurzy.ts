/**
 * Web scraping utilities for www.kurzy.cz/zakony using Playwright
 */

import { browserManager } from '../utils/browser.js';
import type {
  SearchResult,
  LawDocument,
  Section,
  LawChange,
  SearchParams,
  FetchLawParams,
  GetChangesParams,
  SearchSectionsParams
} from '../types/index.js';

const BASE_URL = 'https://www.kurzy.cz';

// Common law slugs for faster lookup
const KNOWN_SLUGS: Record<string, string> = {
  '182/2006': 'insolvencni-zakon',
  '89/2012': 'obcansky-zakonik',
  '280/2009': 'danovy-rad',
  '262/2006': 'zakonik-prace',
  '40/2009': 'trestni-zakonik',
  '513/1991': 'obchodni-zakonik',
  '586/1992': 'zakon-o-danich-z-prijmu'
};

/**
 * Search for laws on kurzy.cz
 */
export async function searchLaws(params: SearchParams): Promise<SearchResult[]> {
  try {
    const { query, limit = 10 } = params;

    // Try to extract law code from query
    const lawCodeMatch = query.match(/(\d+)[\/\-](\d{4})/);

    if (lawCodeMatch) {
      // Direct law code - try to build result
      const [, number, year] = lawCodeMatch;
      const code = `${number}/${year}`;
      const slug = KNOWN_SLUGS[code] || await findLawSlug(number, year);

      if (slug) {
        return [{
          code,
          title: query,
          url: `${BASE_URL}/zakony/${number}-${year}-${slug}/`,
          type: 'law',
          year: parseInt(year)
        }];
      }
    }

    // Fallback: just return empty, kurzy.cz doesn't have great search
    return [];
  } catch (error) {
    console.error('Kurzy.cz search error:', error);
    return [];
  }
}

/**
 * Fetch full text of a specific law from kurzy.cz
 */
export async function fetchLaw(params: FetchLawParams): Promise<LawDocument> {
  const page = await browserManager.newPage();

  try {
    const { lawCode, section } = params;

    // Build URL
    const lawUrl = await buildLawUrl(lawCode, section);

    await page.goto(lawUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    await page.waitForTimeout(1000);

    // Extract law data
    const lawData = await page.evaluate((args) => {
      const [requestedSection] = args;
      // Extract title from h1 or page title
      let title = '';
      const h1Element = document.querySelector('h1');
      if (h1Element) {
        title = h1Element.textContent?.trim() || '';
      } else {
        const titleElement = document.querySelector('title');
        if (titleElement) {
          title = titleElement.textContent?.replace(' | Kurzy.cz', '').trim() || '';
        }
      }

      let fullText = '';
      const sections: Section[] = [];

      if (requestedSection) {
        // Fetching specific section
        const h2Elements = Array.from(document.querySelectorAll('h2'));
        const sectionH2 = h2Elements.find(h2 => h2.textContent?.includes('§'));

        if (sectionH2) {
          const headingText = sectionH2.textContent?.trim() || '';

          // Split by line break or whitespace to separate number and title
          const parts = headingText.split(/[\n\r]+/);
          const sectionNumber = parts[0].trim();
          const sectionTitle = parts.slice(1).join(' ').trim();

          // Get paragraph text - all <p> tags after h2 until next h2/h3
          let sectionText = '';
          let currentElement = sectionH2.nextElementSibling;

          while (currentElement && currentElement.tagName !== 'H2' && currentElement.tagName !== 'H3') {
            if (currentElement.tagName === 'P') {
              const text = currentElement.textContent?.trim();
              if (text) {
                sectionText += text + '\n\n';
              }
            }
            currentElement = currentElement.nextElementSibling;
          }

          sections.push({
            number: sectionNumber,
            title: sectionTitle || undefined,
            text: sectionText.trim()
          });

          fullText = `${sectionNumber}${sectionTitle ? ' ' + sectionTitle : ''}\n\n${sectionText}`;
        }
      } else {
        // Fetching table of contents
        const links = Array.from(document.querySelectorAll('a[href*="/paragraf-"]'));

        links.forEach((link) => {
          const linkText = link.textContent?.trim() || '';

          if (linkText.includes('§')) {
            const match = linkText.match(/§\s*(\d+[a-z]?)/i);
            if (match) {
              sections.push({
                number: `§${match[1]}`,
                title: linkText.replace(/§\s*\d+[a-z]?\s*/i, '').trim() || undefined,
                text: '' // Would need to fetch each section individually
              });
            }
          }
        });

        if (sections.length > 0) {
          fullText = `${title}\n\nZákon obsahuje ${sections.length} paragrafů.\n\n` +
                     'Pro získání konkrétního paragrafu použijte parametr "section".';
        } else {
          const bodyText = document.body.textContent?.trim() || '';
          fullText = bodyText.substring(0, 1000);
        }
      }

      return {
        title,
        fullText,
        sections
      };
    }, [section]);

    return {
      code: lawCode,
      title: lawData.title || lawCode,
      fullText: lawData.fullText,
      url: lawUrl,
      sections: lawData.sections.length > 0 ? lawData.sections : undefined
    };
  } catch (error) {
    throw new Error(`Kurzy.cz failed to fetch law ${params.lawCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await page.close();
  }
}

/**
 * Get changes/amendments to a law (not available on kurzy.cz)
 */
export async function getLawChanges(params: GetChangesParams): Promise<LawChange[]> {
  // Kurzy.cz doesn't have law changes/amendments feature
  return [];
}

/**
 * Search for specific sections
 */
export async function searchSections(params: SearchSectionsParams): Promise<Section[]> {
  try {
    const { sectionNumber, lawCode } = params;

    if (!lawCode || !sectionNumber) {
      return [];
    }

    // Try to fetch the specific section
    const sectionNum = sectionNumber.replace('§', '').trim();
    const law = await fetchLaw({ lawCode, section: sectionNum });

    return law.sections || [];
  } catch (error) {
    console.error('Kurzy.cz section search error:', error);
    return [];
  }
}

/**
 * Helper functions
 */

async function findLawSlug(number: string, year: string): Promise<string | null> {
  // Check known slugs first
  const code = `${number}/${year}`;
  if (KNOWN_SLUGS[code]) {
    return KNOWN_SLUGS[code];
  }

  const page = await browserManager.newPage();

  try {
    await page.goto(`${BASE_URL}/zakony/`, {
      waitUntil: 'domcontentloaded',
      timeout: 5000
    });

    await page.waitForTimeout(500);

    // Look for links matching our law code
    const slug = await page.evaluate((args) => {
      const [num, yr] = args;
      const links = Array.from(document.querySelectorAll('a[href*="/zakony/"]'));

      for (const link of links) {
        const href = link.getAttribute('href');
        if (href && href.includes(`/${num}-${yr}-`)) {
          const match = href.match(/\/zakony\/\d+-\d{4}-([^\/]+)/);
          if (match) {
            return match[1];
          }
        }
      }

      return null;
    }, [number, year]);

    return slug;
  } catch (error) {
    console.error('Could not find slug:', error);
    return null;
  } finally {
    await page.close();
  }
}

async function buildLawUrl(lawCode: string, section?: string): Promise<string> {
  // Extract year and number from format "182/2006"
  let year, number;

  if (lawCode.includes('/')) {
    [number, year] = lawCode.split('/');
  } else if (lawCode.includes('-')) {
    [year, number] = lawCode.split('-');
  } else {
    throw new Error('Invalid law code format');
  }

  // Find the slug for the law
  const slug = KNOWN_SLUGS[`${number}/${year}`] || await findLawSlug(number, year);

  if (!slug) {
    throw new Error(`Could not find law ${lawCode} on kurzy.cz (unknown slug)`);
  }

  let url = `${BASE_URL}/zakony/${number}-${year}-${slug}/`;

  if (section) {
    const sectionNum = section.toString().replace('§', '').trim();
    url += `paragraf-${sectionNum}/`;
  }

  return url;
}

/**
 * Web scraping utilities for www.zakonyprolidi.cz using Playwright
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
  SearchSectionsParams,
  DocumentType
} from '../types/index.js';

const BASE_URL = 'https://www.zakonyprolidi.cz';

/**
 * Search for laws and legal documents
 */
export async function searchLaws(params: SearchParams): Promise<SearchResult[]> {
  const page = await browserManager.newPage();

  try {
    const { query, type, year, limit = 10 } = params;

    // Build search URL
    const searchUrl = `${BASE_URL}/hledani`;
    const searchParams = new URLSearchParams({
      q: query,
      area: type ? mapDocumentType(type) : 'vse'
    });

    if (year) {
      searchParams.append('year', year.toString());
    }

    // Navigate to search page
    await page.goto(`${searchUrl}?${searchParams.toString()}`, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    // Wait for search results to load
    await page.waitForTimeout(1000);

    // Extract results using page.evaluate for optimal performance
    const results = await page.evaluate((args) => {
      const [baseUrl, limit] = args as [string, number];
      const results: SearchResult[] = [];
      const seen = new Set<string>();

      // Find all links that match law pattern
      document.querySelectorAll('a').forEach((link) => {
        if (results.length >= limit) return;

        const href = link.getAttribute('href');
        const linkText = link.textContent?.trim() || '';

        // Only process law links - must have href matching pattern AND contain "Sb."
        if (href && href.match(/\/cs\/\d{4}-\d+/) && linkText.includes('Sb.')) {
          // Extract law code from title or URL
          const titleMatch = linkText.match(/(\d+\/\d{4})/);
          const urlMatch = href.match(/\/cs\/(\d{4})-(\d+)/);

          let code = '';
          if (titleMatch) {
            code = titleMatch[1];
          } else if (urlMatch) {
            const [, year, number] = urlMatch;
            code = `${number}/${year}`;
          }

          if (!code || seen.has(code)) return;
          seen.add(code);

          // Get title from surrounding context
          let title = linkText;
          const parent = link.parentElement;
          if (parent) {
            const parentText = parent.textContent?.trim() || '';
            if (parentText.length > linkText.length + 10) {
              title = parentText
                .replace(linkText, '')
                .replace(/Rozbalit obsah.*$/i, '')
                .trim();

              if (title.length > 5) {
                title = `${linkText} ${title}`;
              } else {
                title = linkText;
              }
            }
          }

          title = title.replace(/\s+/g, ' ').trim();

          // Extract year
          const yearMatch = code.match(/\/(\d{4})/);
          const lawYear = yearMatch ? parseInt(yearMatch[1]) : undefined;

          results.push({
            code,
            title: title || code,
            url: href.startsWith('http') ? href : `${baseUrl}${href}`,
            type: 'law',
            year: lawYear
          });
        }
      });

      return results;
    }, [BASE_URL, limit]);

    return results;
  } catch (error) {
    throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await page.close();
  }
}

/**
 * Fetch full text of a specific law
 */
export async function fetchLaw(params: FetchLawParams): Promise<LawDocument> {
  const page = await browserManager.newPage();

  try {
    const { lawCode, section } = params;

    // Construct URL for the law
    const lawUrl = buildLawUrl(lawCode, section);

    // Navigate to law page
    await page.goto(lawUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    // Wait for main content to load
    await page.waitForTimeout(1000);

    // Extract law data
    const lawData = await page.evaluate((args) => {
      const [requestedSection] = args;
      // Extract title
      const titleElement = document.querySelector('h1, .law-title') as HTMLElement;
      const title = titleElement?.textContent?.trim() || '';

      // Extract sections
      const sections: Section[] = [];
      const h3Elements = document.querySelectorAll('h3');

      h3Elements.forEach((h3) => {
        const headingText = h3.textContent?.trim() || '';
        const sectionMatch = headingText.match(/§\s*(\d+[a-z]?)/i);

        if (sectionMatch) {
          const sectionNumber = `§${sectionMatch[1]}`;
          const sectionTitle = headingText.replace(/§\s*\d+[a-z]?\s*/i, '').trim();

          // Get text content from following elements until next h3
          let sectionText = '';
          let currentElement = h3.nextElementSibling;

          while (currentElement && currentElement.tagName !== 'H3' && currentElement.tagName !== 'H2') {
            const text = currentElement.textContent?.trim();
            if (text) {
              sectionText += text + '\n\n';
            }
            currentElement = currentElement.nextElementSibling;
          }

          sections.push({
            number: sectionNumber,
            title: sectionTitle || undefined,
            text: sectionText.trim() || headingText
          });
        }
      });

      // Extract effective date
      const dateElement = document.querySelector('time, .effective-date, .date');
      const effectiveDate = dateElement?.textContent?.trim();

      // Build full text
      let fullText = '';
      if (sections.length === 0) {
        const content = document.querySelector('.law-content, .law-text, #content, article, main, body');
        fullText = content?.textContent?.trim() || '';
      } else {
        fullText = sections.map(s => `${s.number} ${s.title || ''}\n${s.text}`).join('\n\n');
      }

      return {
        title,
        fullText,
        sections,
        effectiveDate
      };
    }, [section]);

    // Filter for specific section if requested
    let filteredSections = lawData.sections;
    if (section && lawData.sections.length > 0) {
      const normalizedSection = section.replace('§', '').trim();
      filteredSections = lawData.sections.filter(s =>
        s.number.includes(normalizedSection) ||
        s.number.replace('§', '') === normalizedSection
      );
    }

    return {
      code: lawCode,
      title: lawData.title || lawCode,
      fullText: filteredSections.length > 0
        ? filteredSections.map(s => `${s.number} ${s.title || ''}\n${s.text}`).join('\n\n')
        : lawData.fullText,
      url: lawUrl,
      effectiveDate: lawData.effectiveDate || undefined,
      sections: filteredSections.length > 0 ? filteredSections : (lawData.sections.length > 0 ? lawData.sections : undefined)
    };
  } catch (error) {
    throw new Error(`Failed to fetch law ${params.lawCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await page.close();
  }
}

/**
 * Get changes/amendments to a law
 */
export async function getLawChanges(params: GetChangesParams): Promise<LawChange[]> {
  const page = await browserManager.newPage();

  try {
    const { lawCode, dateFrom } = params;

    // Navigate to the law's changes/history page
    const changesUrl = `${BASE_URL}/cs/${lawCode.replace('/', '-')}/zmeny`;

    await page.goto(changesUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    await page.waitForTimeout(1000);

    // Extract changes
    const changes = await page.evaluate((args) => {
      const [fromDate] = args;
      const changes: LawChange[] = [];

      // Parse changes from timeline or table
      document.querySelectorAll('.change-item, .amendment-item, tr').forEach((item) => {
        const dateElement = item.querySelector('.date, time, td:first-child');
        const amendingLawElement = item.querySelector('.amending-law, .law-link, td:nth-child(2)');
        const descElement = item.querySelector('.description, .change-desc, td:nth-child(3)');

        const dateText = dateElement?.textContent?.trim();
        const amendingLawText = amendingLawElement?.textContent?.trim();
        const description = descElement?.textContent?.trim();

        if (dateText) {
          // Parse Czech date format
          const czechMatch = dateText.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
          let date = dateText;
          if (czechMatch) {
            const [, day, month, year] = czechMatch;
            date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }

          // Check date filter
          if (!fromDate || new Date(date) >= new Date(fromDate)) {
            // Determine change type
            const lowerDesc = (description || '').toLowerCase();
            let type: 'amendment' | 'repeal' | 'new-provision' | 'other' = 'other';

            if (lowerDesc.includes('zrušen') || lowerDesc.includes('repeal')) {
              type = 'repeal';
            } else if (lowerDesc.includes('nový') || lowerDesc.includes('doplněn') || lowerDesc.includes('new')) {
              type = 'new-provision';
            } else if (lowerDesc.includes('změn') || lowerDesc.includes('novel') || lowerDesc.includes('amend')) {
              type = 'amendment';
            }

            changes.push({
              date,
              amendingLaw: amendingLawText || 'Unknown',
              description: description || 'Amendment',
              type
            });
          }
        }
      });

      return changes;
    }, [dateFrom]);

    return changes;
  } catch (error) {
    // If changes page doesn't exist, return empty array
    return [];
  } finally {
    await page.close();
  }
}

/**
 * Search for specific sections across laws
 */
export async function searchSections(params: SearchSectionsParams): Promise<Section[]> {
  const page = await browserManager.newPage();

  try {
    const { sectionNumber, keyword, lawCode } = params;

    let searchQuery = '';
    if (sectionNumber) {
      searchQuery = sectionNumber;
    }
    if (keyword) {
      searchQuery += (searchQuery ? ' ' : '') + keyword;
    }
    if (lawCode) {
      searchQuery += ` ${lawCode}`;
    }

    if (!searchQuery) {
      throw new Error('At least one search parameter required');
    }

    const searchUrl = `${BASE_URL}/hledani?q=${encodeURIComponent(searchQuery)}`;

    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    await page.waitForTimeout(1000);

    // Extract sections from search results
    const sections = await page.evaluate((args) => {
      const [sectionNum] = args;
      const sections: Section[] = [];

      document.querySelectorAll('.section-result, .paragraph-result').forEach((element) => {
        const numberElement = element.querySelector('.section-number, .par-number');
        const titleElement = element.querySelector('.section-title');
        const textElement = element.querySelector('.section-text, .par-text');

        const number = numberElement?.textContent?.trim();
        const title = titleElement?.textContent?.trim();
        const text = textElement?.textContent?.trim();

        if (text) {
          sections.push({
            number: number || sectionNum || '',
            title: title || undefined,
            text
          });
        }
      });

      return sections;
    }, [sectionNumber]);

    return sections;
  } catch (error) {
    throw new Error(`Section search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await page.close();
  }
}

/**
 * Helper functions
 */

function mapDocumentType(type: DocumentType): string {
  const typeMap: Record<DocumentType, string> = {
    'law': 'zakony',
    'treaty': 'smlouvy',
    'eu-law': 'eu',
    'court-decision': 'soudni'
  };
  return typeMap[type] || 'vse';
}

function buildLawUrl(lawCode: string, section?: string): string {
  // Extract year and number from format "182/2006" or "2006-182"
  let year, number;

  if (lawCode.includes('/')) {
    [number, year] = lawCode.split('/');
  } else if (lawCode.includes('-')) {
    [year, number] = lawCode.split('-');
  } else {
    // If no separator, assume it's already correct
    return `${BASE_URL}/cs/${lawCode}`;
  }

  // Build URL in format /cs/YEAR-NUMBER
  let url = `${BASE_URL}/cs/${year}-${number}`;

  // Add section anchor for direct navigation
  if (section) {
    const normalizedSection = section.replace('§', '').replace(/\s+/g, '');
    url += `#p${normalizedSection}`;
  }

  return url;
}

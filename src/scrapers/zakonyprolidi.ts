/**
 * Web scraping utilities for www.zakonyprolidi.cz
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
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

    const response = await axios.get(`${searchUrl}?${searchParams.toString()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'cs,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    const $ = cheerio.load(response.data);
    const results: SearchResult[] = [];
    const seen = new Set<string>(); // Avoid duplicates

    // Parse all links that point to laws (format: /cs/YYYY-NUMBER)
    // Only process links that contain "Sb." in text (indicates a law)
    $('a').each((_, element) => {
      if (results.length >= limit) return false;

      const $link = $(element);
      const href = $link.attr('href');
      const linkText = $link.text().trim();

      // Only process law links - must have href matching pattern AND contain "Sb."
      if (href && href.match(/\/cs\/\d{4}-\d+/) && linkText.includes('Sb.')) {
        const code = extractLawCode(linkText, href);

        // Skip if we've already seen this code
        if (seen.has(code)) return;
        seen.add(code);

        // Try to get title from surrounding text
        let title = linkText;
        const parent = $link.parent();
        const parentText = parent.text().trim();

        // If parent has more text than just the link, use that as title
        if (parentText.length > linkText.length + 10) {
          // Remove the link text and "Rozbalit obsah" text
          title = parentText
            .replace(linkText, '')
            .replace(/Rozbalit obsah.*$/i, '')
            .trim();

          // If we got something meaningful, prepend the link text
          if (title.length > 5) {
            title = `${linkText} ${title}`;
          } else {
            title = linkText;
          }
        }

        // Clean up title
        title = title.replace(/\s+/g, ' ').trim();

        results.push({
          code,
          title: title || code,
          url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
          type: type || 'law',
          year: year || extractYear(code)
        });
      }
    });

    return results;
  } catch (error) {
    throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetch full text of a specific law
 */
export async function fetchLaw(params: FetchLawParams): Promise<LawDocument> {
  try {
    const { lawCode, section } = params;

    // Construct URL for the law (without section anchor for fetching)
    const lawUrl = buildLawUrl(lawCode);

    const response = await axios.get(lawUrl, {
      maxRedirects: 5,
      validateStatus: (status) => status < 400,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'cs,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache'
      }
    });

    const $ = cheerio.load(response.data);

    // Extract title
    const title = $('h1, .law-title, title').first().text().trim();

    // Extract full text
    let fullText = '';
    const sections: Section[] = [];

    // Try to find the main content area
    const contentSelectors = [
      '.law-content',
      '.law-text',
      '#content',
      'article',
      'main'
    ];

    let $content = $('body');
    for (const selector of contentSelectors) {
      const $candidate = $(selector);
      if ($candidate.length > 0) {
        $content = $candidate as any;
        break;
      }
    }

    // Extract sections - zakonyprolidi.cz uses <h3> for paragraphs
    $content.find('h3').each((_, element) => {
      const $heading = $(element);
      const headingText = $heading.text().trim();

      // Check if this is a section/paragraph (starts with §)
      const sectionMatch = headingText.match(/§\s*(\d+[a-z]?)/i);
      if (sectionMatch) {
        const sectionNumber = `§${sectionMatch[1]}`;

        // Extract title (text after section number)
        const sectionTitle = headingText.replace(/§\s*\d+[a-z]?\s*/i, '').trim();

        // Get text content from following elements until next h3
        let sectionText = '';
        let $next = $heading.next();

        while ($next.length > 0 && $next.prop('tagName') !== 'H3' && $next.prop('tagName') !== 'H2') {
          const text = $next.text().trim();
          if (text) {
            sectionText += text + '\n\n';
          }
          $next = $next.next();
        }

        sections.push({
          number: sectionNumber,
          title: sectionTitle || undefined,
          text: sectionText.trim() || headingText
        });
      }
    });

    // If no sections found, get all text
    if (sections.length === 0) {
      fullText = $content.text().trim();
    } else {
      fullText = sections.map(s => `${s.number} ${s.title || ''}\n${s.text}`).join('\n\n');
    }

    // Extract effective date if available
    const effectiveDate = $('time, .effective-date, .date').first().text().trim();

    return {
      code: lawCode,
      title: title || lawCode,
      fullText,
      url: lawUrl,
      effectiveDate: effectiveDate || undefined,
      sections: sections.length > 0 ? sections : undefined
    };
  } catch (error) {
    throw new Error(`Failed to fetch law ${params.lawCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get changes/amendments to a law
 */
export async function getLawChanges(params: GetChangesParams): Promise<LawChange[]> {
  try {
    const { lawCode, dateFrom } = params;

    // Navigate to the law's changes/history page
    const changesUrl = `${BASE_URL}/cs/${lawCode.replace('/', '-')}/zmeny`;

    const response = await axios.get(changesUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'cs,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    const $ = cheerio.load(response.data);
    const changes: LawChange[] = [];

    // Parse changes from timeline or table
    $('.change-item, .amendment-item, tr').each((_, element) => {
      const $item = $(element);
      const dateText = $item.find('.date, time, td:first-child').text().trim();
      const amendingLawText = $item.find('.amending-law, .law-link, td:nth-child(2)').text().trim();
      const description = $item.find('.description, .change-desc, td:nth-child(3)').text().trim();

      if (dateText) {
        const date = parseDate(dateText);
        if (!dateFrom || new Date(date) >= new Date(dateFrom)) {
          changes.push({
            date,
            amendingLaw: amendingLawText || 'Unknown',
            description: description || 'Amendment',
            type: determineChangeType(description)
          });
        }
      }
    });

    return changes;
  } catch (error) {
    // If changes page doesn't exist, return empty array
    return [];
  }
}

/**
 * Search for specific sections across laws
 */
export async function searchSections(params: SearchSectionsParams): Promise<Section[]> {
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

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'cs,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    const $ = cheerio.load(response.data);
    const sections: Section[] = [];

    // Find section matches
    $('.section-result, .paragraph-result').each((_, element) => {
      const $section = $(element);
      const number = $section.find('.section-number, .par-number').text().trim();
      const title = $section.find('.section-title').text().trim();
      const text = $section.find('.section-text, .par-text').text().trim();

      if (text) {
        sections.push({
          number: number || sectionNumber || '',
          title: title || undefined,
          text
        });
      }
    });

    return sections;
  } catch (error) {
    throw new Error(`Section search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

function extractLawCode(title: string, url: string): string {
  // Try to extract from title (e.g., "89/2012 Sb.")
  const titleMatch = title.match(/(\d+\/\d{4})/);
  if (titleMatch) {
    return titleMatch[1];
  }

  // Try to extract from URL
  const urlMatch = url.match(/\/cs\/(\d{4})-(\d+)/);
  if (urlMatch) {
    const [, year, number] = urlMatch;
    return `${number}/${year}`;
  }

  return title.substring(0, 50);
}

function extractYear(code: string): number | undefined {
  const match = code.match(/\/(\d{4})/);
  return match ? parseInt(match[1]) : undefined;
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

  // Note: We don't add section anchor here because it's client-side navigation
  // The section will be extracted from the full HTML after fetching

  return url;
}

function parseDate(dateText: string): string {
  // Try to parse Czech date format (e.g., "1. 1. 2013")
  const czechMatch = dateText.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  if (czechMatch) {
    const [, day, month, year] = czechMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return dateText;
}

function determineChangeType(description: string): 'amendment' | 'repeal' | 'new-provision' | 'other' {
  const lowerDesc = description.toLowerCase();

  if (lowerDesc.includes('zrušen') || lowerDesc.includes('repeal')) {
    return 'repeal';
  }
  if (lowerDesc.includes('nový') || lowerDesc.includes('doplněn') || lowerDesc.includes('new')) {
    return 'new-provision';
  }
  if (lowerDesc.includes('změn') || lowerDesc.includes('novel') || lowerDesc.includes('amend')) {
    return 'amendment';
  }

  return 'other';
}

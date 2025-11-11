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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const results: SearchResult[] = [];

    // Parse search results from the page
    $('.search-result-item, .result-item, .law-item').each((_, element) => {
      if (results.length >= limit) return false;

      const $item = $(element);
      const link = $item.find('a').first();
      const title = link.text().trim();
      const href = link.attr('href');

      if (href && title) {
        const code = extractLawCode(title, href);
        const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;

        results.push({
          code,
          title,
          url,
          type: type || 'law',
          year: year || extractYear(code)
        });
      }
    });

    // If no structured results found, try alternative parsing
    if (results.length === 0) {
      $('a[href*="/cs/"]').each((_, element) => {
        if (results.length >= limit) return false;

        const $link = $(element);
        const href = $link.attr('href');
        const text = $link.text().trim();

        if (href && text && href.includes('/cs/') && text.length > 5) {
          const code = extractLawCode(text, href);
          if (code) {
            results.push({
              code,
              title: text,
              url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
              type: 'law'
            });
          }
        }
      });
    }

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

    // Construct URL for the law
    const lawUrl = buildLawUrl(lawCode, section);

    const response = await axios.get(lawUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
        $content = $candidate;
        break;
      }
    }

    // Extract sections
    $content.find('div[id^="par"], .section, .paragraph').each((_, element) => {
      const $section = $(element);
      const sectionId = $section.attr('id') || '';
      const sectionNumber = sectionId.replace('par', '§') || `§${sections.length + 1}`;
      const sectionTitle = $section.find('h2, h3, .section-title').first().text().trim();
      const sectionText = $section.text().trim();

      if (sectionText) {
        sections.push({
          number: sectionNumber,
          title: sectionTitle || undefined,
          text: sectionText
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
  const urlMatch = url.match(/\/cs\/(\d+-\d+)/);
  if (urlMatch) {
    return urlMatch[1].replace('-', '/');
  }

  return title.substring(0, 50);
}

function extractYear(code: string): number | undefined {
  const match = code.match(/\/(\d{4})/);
  return match ? parseInt(match[1]) : undefined;
}

function buildLawUrl(lawCode: string, section?: string): string {
  const normalizedCode = lawCode.replace('/', '-');
  let url = `${BASE_URL}/cs/${normalizedCode}`;

  if (section) {
    const sectionNum = section.replace('§', '').trim();
    url += `#par${sectionNum}`;
  }

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

/**
 * Web scraping utilities for www.kurzy.cz/zakony
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
    const lawCodeMatch = query.match(/(\d+)[\/-](\d{4})/);

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
  try {
    const { lawCode, section } = params;

    // Build URL
    const lawUrl = await buildLawUrl(lawCode, section);

    const response = await axios.get(lawUrl, {
      headers: getHeaders(),
      maxRedirects: 5,
      validateStatus: (status) => status < 400,
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Extract title from h1 or page title
    let title = $('h1').first().text().trim();
    if (!title) {
      title = $('title').text().replace(' | Kurzy.cz', '').trim();
    }

    let fullText = '';
    const sections: Section[] = [];

    if (section) {
      // Fetching specific section
      const $h2 = $('h2').filter((_, el) => {
        const text = $(el).text();
        return text.includes('§');
      }).first();

      if ($h2.length > 0) {
        const headingText = $h2.text().trim();

        // Split by line break or whitespace to separate number and title
        const parts = headingText.split(/[\n\r]+/);
        const sectionNumber = parts[0].trim();
        const sectionTitle = parts.slice(1).join(' ').trim();

        // Get paragraph text - all <p> tags after h2 until next h2/h3
        let sectionText = '';
        let $current = $h2.next();

        while ($current.length > 0 && !$current.is('h2') && !$current.is('h3')) {
          if ($current.is('p')) {
            const text = $current.text().trim();
            if (text) {
              sectionText += text + '\n\n';
            }
          }
          $current = $current.next();
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
      $('a[href*="/paragraf-"]').each((_, element) => {
        const $link = $(element);
        const linkText = $link.text().trim();

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
        fullText = $('body').text().trim().substring(0, 1000);
      }
    }

    return {
      code: lawCode,
      title: title || lawCode,
      fullText,
      url: lawUrl,
      sections: sections.length > 0 ? sections : undefined
    };
  } catch (error) {
    throw new Error(`Kurzy.cz failed to fetch law ${params.lawCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

function getHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'cs,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'no-cache'
  };
}

async function findLawSlug(number: string, year: string): Promise<string | null> {
  // Check known slugs first
  const code = `${number}/${year}`;
  if (KNOWN_SLUGS[code]) {
    return KNOWN_SLUGS[code];
  }

  // Try to find slug by fetching laws index page
  try {
    const response = await axios.get(`${BASE_URL}/zakony/`, {
      headers: getHeaders(),
      timeout: 5000
    });

    const $ = cheerio.load(response.data);
    let foundSlug: string | null = null;

    // Look for links matching our law code
    $('a[href*="/zakony/"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href && href.includes(`/${number}-${year}-`)) {
        const match = href.match(/\/zakony\/\d+-\d{4}-([^\/]+)/);
        if (match) {
          foundSlug = match[1];
          return false; // break
        }
      }
    });

    return foundSlug;
  } catch (error) {
    console.error('Could not find slug:', error);
    return null;
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

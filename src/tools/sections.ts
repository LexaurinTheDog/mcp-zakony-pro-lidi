/**
 * Search sections tool implementation with multi-source fallback
 */

import { searchSections as searchSectionsZakonyprolidi } from '../scrapers/zakonyprolidi.js';
import { searchSections as searchSectionsKurzy } from '../scrapers/kurzy.js';
import type { SearchSectionsParams } from '../types/index.js';

export const SEARCH_SECTIONS_TOOL = {
  name: 'search_sections',
  description: 'Find specific sections, paragraphs, or provisions (ustanovení, paragrafy) across Czech laws using section numbers or keywords. Use this tool when the user asks to find, search for, or locate specific provisions, sections about a topic, or wants to know what a law says about something. Responds to both Czech and English queries. Examples: "najdi ustanovení o přeplatku", "find sections about tax overpayment", "co říká zákon o promlčení", "what does the law say about prescription", "najdi §154".',
  inputSchema: {
    type: 'object',
    properties: {
      sectionNumber: {
        type: 'string',
        description: 'Section/paragraph number to search for (e.g., "§1000", "§154", "paragraf 100"). Can include or omit the § symbol.'
      },
      keyword: {
        type: 'string',
        description: 'Czech or English keyword or phrase to search for within sections (e.g., "přeplatek" for overpayment, "promlčení" for prescription, "daň" for tax, "úrok" for interest)'
      },
      lawCode: {
        type: 'string',
        description: 'Optional law code to limit search to a specific law (e.g., "89/2012" for Civil Code, "280/2009" for Tax Code, "586/1992" for Income Tax Act)'
      }
    }
  }
};

export async function handleSearchSections(args: unknown) {
  const params = args as SearchSectionsParams;

  if (!params.sectionNumber && !params.keyword) {
    throw new Error('At least one of sectionNumber or keyword is required');
  }

  let sections: any[] = [];
  let source = 'zakonyprolidi.cz';

  // Try primary source: zakonyprolidi.cz
  try {
    sections = await searchSectionsZakonyprolidi(params);
  } catch (error) {
    console.error('Zakonyprolidi sections search failed:', error);
  }

  // Fallback to kurzy.cz if primary source returned no results (and we have lawCode + sectionNumber)
  if (sections.length === 0 && params.lawCode && params.sectionNumber) {
    try {
      sections = await searchSectionsKurzy(params);
      source = 'kurzy.cz';
    } catch (error) {
      console.error('Kurzy sections search failed:', error);
    }
  }

  if (sections.length === 0) {
    const searchDesc = [
      params.sectionNumber && `section ${params.sectionNumber}`,
      params.keyword && `keyword "${params.keyword}"`,
      params.lawCode && `in law ${params.lawCode}`
    ].filter(Boolean).join(' ');

    return {
      content: [
        {
          type: 'text',
          text: `No sections found for ${searchDesc}.`
        }
      ]
    };
  }

  let responseText = '# Section Search Results\n\n';

  const searchDesc = [
    params.sectionNumber && `Section ${params.sectionNumber}`,
    params.keyword && `Keyword: "${params.keyword}"`,
    params.lawCode && `Law: ${params.lawCode}`
  ].filter(Boolean).join(' | ');

  responseText += `**Search:** ${searchDesc}\n`;
  responseText += `**Source:** ${source}\n`;
  responseText += `**Results:** ${sections.length} section(s) found\n\n`;
  responseText += '---\n\n';

  sections.forEach((section, index) => {
    responseText += `### ${index + 1}. ${section.number}`;
    if (section.title) {
      responseText += ` - ${section.title}`;
    }
    responseText += '\n\n';
    responseText += section.text + '\n\n';
  });

  return {
    content: [
      {
        type: 'text',
        text: responseText
      }
    ]
  };
}

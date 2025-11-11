/**
 * Search sections tool implementation
 */

import { searchSections } from '../scrapers/zakonyprolidi.js';
import type { SearchSectionsParams } from '../types/index.js';

export const SEARCH_SECTIONS_TOOL = {
  name: 'search_sections',
  description: 'Find specific sections or paragraphs across Czech laws using section numbers or keywords. Useful for finding where specific provisions are located.',
  inputSchema: {
    type: 'object',
    properties: {
      sectionNumber: {
        type: 'string',
        description: 'Section/paragraph number to search for (e.g., "§1000")'
      },
      keyword: {
        type: 'string',
        description: 'Keyword or phrase to search for within sections'
      },
      lawCode: {
        type: 'string',
        description: 'Optional law code to limit search to a specific law (e.g., "89/2012")'
      }
    }
  }
};

export async function handleSearchSections(args: unknown) {
  const params = args as SearchSectionsParams;

  if (!params.sectionNumber && !params.keyword) {
    throw new Error('At least one of sectionNumber or keyword is required');
  }

  const sections = await searchSections(params);

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

/**
 * Search laws tool implementation
 */

import { searchLaws } from '../scrapers/zakonyprolidi.js';
import type { SearchParams } from '../types/index.js';

export const SEARCH_LAWS_TOOL = {
  name: 'search_laws',
  description: 'Search for Czech laws and legal documents on www.zakonyprolidi.cz. Use this tool when the user asks to find, search for, or locate Czech laws (zákony), regulations (vyhlášky), or legal documents. Responds to both Czech and English queries. Returns a list of matching documents with their codes, titles, and URLs. Examples: "najdi občanský zákoník", "find Civil Code", "vyhledej zákon o daních z příjmů", "search law 89/2012".',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query - can be law code (e.g., "89/2012", "280/2009"), section number (e.g., "§1000"), abbreviated reference (e.g., "OZ" for občanský zákoník, "DŘ" for daňový řád), Czech law name (e.g., "občanský zákoník", "daňový řád"), or English name (e.g., "Civil Code", "Tax Code")'
      },
      type: {
        type: 'string',
        enum: ['law', 'treaty', 'eu-law', 'court-decision'],
        description: 'Type of document to search for (optional)'
      },
      year: {
        type: 'number',
        description: 'Filter by publication year (optional)'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10)',
        default: 10
      }
    },
    required: ['query']
  }
};

export async function handleSearchLaws(args: unknown) {
  const params = args as SearchParams;

  if (!params.query) {
    throw new Error('Query parameter is required');
  }

  const results = await searchLaws(params);

  if (results.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `No results found for query: "${params.query}"`
        }
      ]
    };
  }

  const formattedResults = results.map((result, index) =>
    `${index + 1}. **${result.code}** - ${result.title}\n   URL: ${result.url}\n   Type: ${result.type}${result.year ? `\n   Year: ${result.year}` : ''}`
  ).join('\n\n');

  return {
    content: [
      {
        type: 'text',
        text: `Found ${results.length} result(s) for "${params.query}":\n\n${formattedResults}`
      }
    ]
  };
}

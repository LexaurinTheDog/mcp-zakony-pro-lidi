/**
 * Get law changes tool implementation
 */

import { getLawChanges } from '../scrapers/zakonyprolidi.js';
import type { GetChangesParams } from '../types/index.js';

export const GET_LAW_CHANGES_TOOL = {
  name: 'get_law_changes',
  description: 'Monitor and retrieve changes, amendments, modifications, and novelas (novely) to a specific Czech law over time. Use this tool when the user asks about changes, amendments, modifications, history, or novelas to a law. Responds to both Czech and English queries. Returns a timeline of all amendments with dates and descriptions. Examples: "jaké změny proběhly v občanském zákoníku", "show me amendments to law 89/2012", "které novely měl daňový řád od 2020", "what changes were made to the Tax Code".',
  inputSchema: {
    type: 'object',
    properties: {
      lawCode: {
        type: 'string',
        description: 'Law code in format "number/year" (e.g., "89/2012" for Civil Code, "280/2009" for Tax Code, "586/1992" for Income Tax Act)'
      },
      dateFrom: {
        type: 'string',
        description: 'Optional start date in ISO format (YYYY-MM-DD) to filter changes from a specific date onwards (e.g., "2020-01-01" for changes since 2020)'
      }
    },
    required: ['lawCode']
  }
};

export async function handleGetLawChanges(args: unknown) {
  const params = args as GetChangesParams;

  if (!params.lawCode) {
    throw new Error('lawCode parameter is required');
  }

  const changes = await getLawChanges(params);

  if (changes.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `No changes found for law ${params.lawCode}${params.dateFrom ? ` since ${params.dateFrom}` : ''}.`
        }
      ]
    };
  }

  let responseText = `# Changes to Law ${params.lawCode}\n\n`;

  if (params.dateFrom) {
    responseText += `Showing changes since ${params.dateFrom}\n\n`;
  }

  responseText += `**Total changes:** ${changes.length}\n\n`;
  responseText += '---\n\n';

  changes.forEach((change, index) => {
    responseText += `### ${index + 1}. ${change.date}\n\n`;
    responseText += `**Amending Law:** ${change.amendingLaw}\n`;
    responseText += `**Type:** ${change.type}\n`;
    responseText += `**Description:** ${change.description}\n\n`;
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

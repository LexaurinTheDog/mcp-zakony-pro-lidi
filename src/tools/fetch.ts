/**
 * Fetch law tool implementation
 */

import { fetchLaw } from '../scrapers/zakonyprolidi.js';
import type { FetchLawParams } from '../types/index.js';

export const FETCH_LAW_TOOL = {
  name: 'fetch_law',
  description: 'Retrieve the full text of a specific Czech law from www.zakonyprolidi.cz. Use this tool when the user asks to get, fetch, show, or read the content of a specific law or section. Responds to both Czech and English queries. Returns the complete law text in current consolidated form (aktuální konsolidované znění), including all sections. Examples: "načti občanský zákoník", "get law 89/2012", "dej mi §154 daňového řádu", "show me section 1000 of the Civil Code".',
  inputSchema: {
    type: 'object',
    properties: {
      lawCode: {
        type: 'string',
        description: 'Law code in format "number/year" (e.g., "89/2012" for Civil Code/občanský zákoník, "280/2009" for Tax Code/daňový řád, "586/1992" for Income Tax Act/zákon o daních z příjmů)'
      },
      section: {
        type: 'string',
        description: 'Optional specific section/paragraph number to retrieve (e.g., "§1000", "§154", "paragraf 100"). Can include or omit the § symbol.'
      }
    },
    required: ['lawCode']
  }
};

export async function handleFetchLaw(args: unknown) {
  const params = args as FetchLawParams;

  if (!params.lawCode) {
    throw new Error('lawCode parameter is required');
  }

  const law = await fetchLaw(params);

  let responseText = `# ${law.title}\n\n`;
  responseText += `**Law Code:** ${law.code}\n`;
  responseText += `**URL:** ${law.url}\n`;

  if (law.effectiveDate) {
    responseText += `**Effective Date:** ${law.effectiveDate}\n`;
  }

  responseText += '\n---\n\n';

  if (params.section && law.sections) {
    // Return only the requested section
    const section = law.sections.find(s =>
      s.number.includes(params.section!) ||
      s.number.replace('§', '') === params.section!.replace('§', '')
    );

    if (section) {
      responseText += `## ${section.number}${section.title ? ' - ' + section.title : ''}\n\n`;
      responseText += section.text;
    } else {
      responseText += `Section ${params.section} not found in the law.\n\n`;
      responseText += `Available sections: ${law.sections.map(s => s.number).join(', ')}`;
    }
  } else {
    // Return full law text
    if (law.sections && law.sections.length > 0) {
      responseText += `**Sections:** ${law.sections.length} total\n\n`;

      // Limit output if too long
      if (law.fullText.length > 50000) {
        responseText += '## Overview\n\n';
        responseText += `This law contains ${law.sections.length} sections. The full text is very long (${law.fullText.length} characters).\n\n`;
        responseText += '**Section summary:**\n';
        law.sections.slice(0, 10).forEach(section => {
          responseText += `- ${section.number}${section.title ? ': ' + section.title : ''}\n`;
        });
        if (law.sections.length > 10) {
          responseText += `\n... and ${law.sections.length - 10} more sections\n`;
        }
        responseText += '\n**Tip:** Use the `section` parameter to retrieve specific sections.\n';
      } else {
        responseText += law.fullText;
      }
    } else {
      responseText += law.fullText;
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: responseText
      }
    ]
  };
}

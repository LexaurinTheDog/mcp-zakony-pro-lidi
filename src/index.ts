#!/usr/bin/env node

/**
 * Zákony pro lidi MCP Server
 *
 * Model Context Protocol server for searching and fetching Czech legal documents
 * from www.zakonyprolidi.cz
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

import { SEARCH_LAWS_TOOL, handleSearchLaws } from './tools/search.js';
import { FETCH_LAW_TOOL, handleFetchLaw } from './tools/fetch.js';
import { GET_LAW_CHANGES_TOOL, handleGetLawChanges } from './tools/changes.js';
import { SEARCH_SECTIONS_TOOL, handleSearchSections } from './tools/sections.js';

/**
 * Create and configure the MCP server
 */
class ZakonProLidiServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'zakonyprolidi-mcp-server',
        version: '1.1.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        SEARCH_LAWS_TOOL,
        FETCH_LAW_TOOL,
        GET_LAW_CHANGES_TOOL,
        SEARCH_SECTIONS_TOOL
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'search_laws':
            return await handleSearchLaws(request.params.arguments);

          case 'fetch_law':
            return await handleFetchLaw(request.params.arguments);

          case 'get_law_changes':
            return await handleGetLawChanges(request.params.arguments);

          case 'search_sections':
            return await handleSearchSections(request.params.arguments);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`
            }
          ],
          isError: true
        };
      }
    });
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('Zákony pro lidi MCP server running on stdio');
  }
}

/**
 * Start the server
 */
const server = new ZakonProLidiServer();
server.run().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});

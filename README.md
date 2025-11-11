# Zákony pro lidi MCP Server

A Model Context Protocol (MCP) server that provides Claude Code with access to Czech legal documents from [www.zakonyprolidi.cz](https://www.zakonyprolidi.cz).

## Features

This MCP server enables Claude Code to:

- **Search for laws** - Find Czech laws and regulations by code, title, or keywords
- **Fetch law documents** - Retrieve full text of specific laws in current consolidated form
- **Monitor changes** - Track amendments and modifications to laws over time
- **Search sections** - Find specific sections and paragraphs across legal documents

## Available Tools

### 1. `search_laws`

Search for Czech laws and legal documents.

**Parameters:**
- `query` (required): Search query - can be law code (e.g., "89/2012"), section number (e.g., "§1000"), or law title
- `type` (optional): Document type - "law", "treaty", "eu-law", or "court-decision"
- `year` (optional): Filter by publication year
- `limit` (optional): Maximum number of results (default: 10)

**Example:**
```
Search for the Czech Civil Code
→ query: "občanský zákoník"
→ Returns: List of matching laws with codes and URLs
```

### 2. `fetch_law`

Retrieve the full text of a specific law.

**Parameters:**
- `lawCode` (required): Law code in format "number/year" (e.g., "89/2012")
- `section` (optional): Specific section to retrieve (e.g., "§1000")

**Example:**
```
Fetch the Czech Civil Code
→ lawCode: "89/2012"
→ Returns: Full law text with all sections
```

### 3. `get_law_changes`

Monitor changes and amendments to a law.

**Parameters:**
- `lawCode` (required): Law code in format "number/year"
- `dateFrom` (optional): Start date in ISO format (YYYY-MM-DD)

**Example:**
```
Get all changes to the Civil Code since 2020
→ lawCode: "89/2012"
→ dateFrom: "2020-01-01"
→ Returns: Timeline of amendments
```

### 4. `search_sections`

Find specific sections across laws.

**Parameters:**
- `sectionNumber` (optional): Section number to search for (e.g., "§1000")
- `keyword` (optional): Keyword or phrase to search within sections
- `lawCode` (optional): Limit search to a specific law

**Example:**
```
Find section §1000 in the Civil Code
→ sectionNumber: "§1000"
→ lawCode: "89/2012"
→ Returns: Section text and context
```

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Claude Code CLI

### Setup

1. **Clone or download this repository:**

```bash
cd C:\Users\vojte
git clone <your-repo-url> zakonyprolidi-mcp-server
# Or if you created it manually, it's already there
```

2. **Install dependencies:**

```bash
cd zakonyprolidi-mcp-server
npm install
```

3. **Build the project:**

```bash
npm run build
```

### Configure Claude Code

Add the MCP server to Claude Code using the stdio transport:

```bash
claude mcp add --transport stdio zakonyprolidi -- node C:\Users\vojte\zakonyprolidi-mcp-server\build\index.js
```

```bash
claude mcp add --transport stdio zakonyprolidi --node /mnt/c/Users/vojte/zakonyprolidi-mcp-server/build/index.js
```

### Verify Installation

Check that the server is registered:

```bash
claude mcp list
```

You should see `zakonyprolidi` in the list of MCP servers.

## Usage

Once installed, you can use the tools directly in Claude Code conversations:

### Example Conversations

**Search for a law:**
```
User: Search for the Czech Civil Code
Claude: [Uses search_laws tool with query "občanský zákoník"]
```

**Fetch a specific law:**
```
User: Get me the full text of law 89/2012
Claude: [Uses fetch_law tool with lawCode "89/2012"]
```

**Find a specific section:**
```
User: What does section 1000 of the Civil Code say?
Claude: [Uses fetch_law with lawCode "89/2012" and section "§1000"]
```

**Check law changes:**
```
User: What amendments have been made to law 89/2012 since 2022?
Claude: [Uses get_law_changes with lawCode "89/2012" and dateFrom "2022-01-01"]
```

## Development

### Project Structure

```
zakonyprolidi-mcp-server/
├── src/
│   ├── index.ts              # Main MCP server entry point
│   ├── tools/                # Tool implementations
│   │   ├── search.ts         # search_laws tool
│   │   ├── fetch.ts          # fetch_law tool
│   │   ├── changes.ts        # get_law_changes tool
│   │   └── sections.ts       # search_sections tool
│   ├── scrapers/             # Web scraping logic
│   │   └── zakonyprolidi.ts  # Scraper for www.zakonyprolidi.cz
│   └── types/                # TypeScript type definitions
│       └── index.ts
├── build/                    # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode for development
- `npm start` - Run the compiled server

### Making Changes

1. Edit source files in `src/`
2. Rebuild: `npm run build`
3. Restart Claude Code or reconnect to the MCP server

## Troubleshooting

### Server not appearing in Claude Code

1. Check that the server is registered: `claude mcp list`
2. Verify the build directory exists: `ls build/`
3. Check for errors in the build: `npm run build`

### Tools not working

1. Check Claude Code logs for errors
2. Verify the website www.zakonyprolidi.cz is accessible
3. Test the scraper functions directly

### Network issues

The server requires internet access to fetch data from www.zakonyprolidi.cz. If you're behind a proxy, you may need to configure it.

## Limitations

- The server scrapes content from www.zakonyprolidi.cz and may break if the website structure changes
- Some premium features of the website may not be accessible
- Large laws may be truncated in responses to avoid overwhelming the context window

## Security Considerations

- This server makes HTTP requests to a third-party website (www.zakonyprolidi.cz)
- No authentication is required as the website is publicly accessible
- The server does not store or cache any data locally

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Support

For issues specific to this MCP server, please open an issue on GitHub.
For Claude Code questions, see the [official documentation](https://code.claude.com/docs).

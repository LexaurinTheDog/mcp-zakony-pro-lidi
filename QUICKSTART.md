# Quick Start Guide

## Prerequisites

Before you can use this MCP server, you need to install Node.js.

### Install Node.js

1. Download Node.js from https://nodejs.org/
2. Choose the LTS (Long Term Support) version
3. Run the installer and follow the instructions
4. Verify installation by opening a new terminal and running:
   ```bash
   node --version
   npm --version
   ```

## Setup Steps

Once Node.js is installed, follow these steps:

### 1. Install Dependencies

Open a terminal in the project directory and run:

```bash
cd C:\Users\vojte\zakonyprolidi-mcp-server
npm install
```

This will download all required packages including the MCP SDK, axios, and cheerio.

### 2. Build the Project

Compile the TypeScript code to JavaScript:

```bash
npm run build
```

This creates a `build/` directory with the compiled JavaScript files.

### 3. Add to Claude Code

Register the MCP server with Claude Code:

```bash
claude mcp add --transport stdio zakonyprolidi -- node C:\Users\vojte\zakonyprolidi-mcp-server\build\index.js
```

### 4. Verify Installation

Check that the server is registered:

```bash
claude mcp list
```

You should see `zakonyprolidi` in the output.

### 5. Start Using

Open Claude Code and start asking questions about Czech laws:

- "Search for the Czech Civil Code"
- "Get me the full text of law 89/2012"
- "What does section 1000 of the Civil Code say?"
- "Show me recent changes to law 89/2012"

## Troubleshooting

### Node.js not found

If you get "command not found" errors:
1. Close and reopen your terminal after installing Node.js
2. Verify Node.js is in your PATH
3. Try running with full path: `C:\Program Files\nodejs\node.exe`

### Build errors

If you get TypeScript compilation errors:
1. Make sure all dependencies are installed: `npm install`
2. Check Node.js version is 18 or higher: `node --version`
3. Clear cache and rebuild: `npm clean-install && npm run build`

### MCP server not working

1. Check the server is listed: `claude mcp list`
2. Try removing and re-adding:
   ```bash
   claude mcp remove zakonyprolidi
   claude mcp add --transport stdio zakonyprolidi -- node C:\Users\vojte\zakonyprolidi-mcp-server\build\index.js
   ```
3. Restart Claude Code

## Next Steps

- Read the full README.md for detailed documentation
- Explore all four available tools
- Customize the scraper if needed for specific use cases
- Report issues or contribute improvements

Happy exploring Czech legal documents with Claude Code!

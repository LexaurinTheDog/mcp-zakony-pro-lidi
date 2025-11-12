# Google Gemini CLI Setup

This guide explains how to use the Zákony pro lidi MCP server with Google Gemini CLI.

## Prerequisites

- Google Gemini CLI installed
- Node.js 18 or higher
- This MCP server built and ready

## Installation

1. **Build the MCP server** (if not already built):
```bash
cd /path/to/zakonyprolidi-mcp-server
npm install
npm run build
```

2. **Configure Gemini CLI** to use the MCP server:

Gemini CLI can be configured via its config file or command-line options.

### Option 1: Using gemini config file

Create or edit `~/.gemini/config.json` (Linux/macOS) or `%USERPROFILE%\.gemini\config.json` (Windows):

```json
{
  "mcp": {
    "servers": {
      "zakonyprolidi": {
        "command": "node",
        "args": ["/absolute/path/to/zakonyprolidi-mcp-server/build/index.js"],
        "transport": "stdio"
      }
    }
  }
}
```

### Option 2: Using gemini mcp add command

```bash
# On Linux/macOS/WSL
gemini mcp add zakonyprolidi --command "node /full/path/to/build/index.js"

# On Windows
gemini mcp add zakonyprolidi --command "node C:\\path\\to\\build\\index.js"
```

**Important:** Use absolute paths for best compatibility.

## Verify Installation

1. **List configured MCP servers:**
```bash
gemini mcp list
```

You should see `zakonyprolidi` in the output.

2. **Test the server:**
```bash
gemini chat
```

Then try asking:
```
What does the Czech Civil Code say about contracts?
```

Gemini should automatically invoke the MCP tools when needed.

## Available Tools

Once configured, Gemini CLI will have access to:

- `search_laws` - Search Czech laws by code, title, or keywords
- `fetch_law` - Retrieve complete law text with sections
- `get_law_changes` - Track amendments over time
- `search_sections` - Find specific paragraphs across laws

## Example Usage

```bash
# Start Gemini CLI chat
gemini chat

# Ask about Czech legislation
> Find the insolvency law
> What does section 56 of law 182/2006 say?
> Show me all changes to the Civil Code since 2022
> Search for tax overpayment provisions in the tax code
```

Gemini will automatically use the appropriate MCP tools to answer your questions.

## Advanced Features

### FastMCP Integration

If you're using FastMCP, you can install directly:

```bash
# If the server were built with FastMCP
fastmcp install gemini-cli zakonyprolidi
```

**Note:** Our server uses the official MCP SDK, not FastMCP, so use the standard configuration method above.

### Custom Environment

```json
{
  "mcp": {
    "servers": {
      "zakonyprolidi": {
        "command": "node",
        "args": ["/path/to/build/index.js"],
        "transport": "stdio",
        "env": {
          "NODE_ENV": "production"
        }
      }
    }
  }
}
```

## Troubleshooting

### Server not starting
- Check the path is absolute and correct
- Verify `node` is in your PATH: `which node` (Linux/macOS) or `where node` (Windows)
- Test manually: `node /path/to/build/index.js`

### Tools not being called
- Ensure you're asking questions relevant to Czech law
- Try more specific prompts mentioning "law" or "Czech legislation"
- Check Gemini CLI logs: `gemini --debug chat`

### Connection issues
- Verify internet connectivity (required to fetch from zakonyprolidi.cz)
- Check firewall settings
- Try with a simple query first

### Playwright errors
- Ensure Playwright browsers are installed:
  ```bash
  npx playwright install
  ```
- On Linux, install browser dependencies:
  ```bash
  npx playwright install-deps
  ```

## Integration Examples

### In scripts

```python
# Using Gemini CLI in Python scripts
import subprocess
import json

result = subprocess.run(
    ["gemini", "run", "Find Czech Civil Code section 1000"],
    capture_output=True,
    text=True
)
print(result.stdout)
```

### With other MCP servers

You can combine this server with others:

```json
{
  "mcp": {
    "servers": {
      "zakonyprolidi": {
        "command": "node",
        "args": ["/path/to/zakonyprolidi-mcp-server/build/index.js"],
        "transport": "stdio"
      },
      "filesystem": {
        "command": "mcp-server-filesystem",
        "args": ["/workspace"],
        "transport": "stdio"
      }
    }
  }
}
```

This lets Gemini both search Czech laws AND work with your local files.

## OAuth Configuration (for HTTP transport)

If you decide to deploy this as an HTTP server instead of stdio:

```json
{
  "mcp": {
    "servers": {
      "zakonyprolidi-remote": {
        "url": "https://your-server.com/mcp",
        "transport": "http",
        "auth": {
          "type": "oauth",
          "client_id": "your-client-id",
          "client_secret": "your-client-secret"
        }
      }
    }
  }
}
```

## Performance Tips

- Gemini CLI caches MCP server connections for better performance
- The Playwright browser is reused across requests
- First query may be slower due to browser startup
- Subsequent queries are much faster

## Support

- **Gemini CLI Docs:** [https://gemini-cli.xyz](https://gemini-cli.xyz)
- **MCP with Gemini:** [https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html](https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html)
- **Server Issues:** [GitHub Issues](https://github.com/LexaurinTheDog/mcp-zakony-pro-lidi/issues)

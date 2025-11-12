# OpenAI Codex CLI Setup

This guide explains how to use the Zákony pro lidi MCP server with OpenAI Codex CLI.

## Prerequisites

- OpenAI Codex CLI installed
- Node.js 18 or higher
- This MCP server built and ready

## Installation

1. **Build the MCP server** (if not already built):
```bash
cd /path/to/zakonyprolidi-mcp-server
npm install
npm run build
```

2. **Configure Codex** to use the MCP server:

Codex stores MCP configuration in `~/.codex/config.toml`. Add the following configuration:

### On Windows (PowerShell):
```toml
[[mcp.servers]]
name = "zakonyprolidi"
command = "node"
args = ["C:\\Users\\YourUsername\\path\\to\\zakonyprolidi-mcp-server\\build\\index.js"]
transport = "stdio"
```

### On Linux/macOS/WSL:
```toml
[[mcp.servers]]
name = "zakonyprolidi"
command = "node"
args = ["/full/path/to/zakonyprolidi-mcp-server/build/index.js"]
transport = "stdio"
```

**Important:** Replace the path with the actual absolute path to your `build/index.js` file.

## Verify Installation

1. **Check if the server is registered:**
```bash
codex mcp list
```

You should see `zakonyprolidi` in the list of available MCP servers.

2. **Test the server:**

Start a Codex session and try:
```
Find the Czech Civil Code
```

Codex should automatically use the `search_laws` tool from the MCP server.

## Available Tools

Once configured, Codex will have access to these tools:

- `search_laws` - Search for Czech laws and regulations
- `fetch_law` - Retrieve full text of specific laws
- `get_law_changes` - Monitor amendments and changes
- `search_sections` - Find specific paragraphs

## Example Usage with Codex

```bash
# Start Codex CLI
codex

# Ask questions about Czech law
> What does section 1000 of the Czech Civil Code say?
> Find all amendments to law 182/2006 since 2020
> Show me the tax code provisions about overpayment
```

Codex will automatically determine when to use the MCP tools based on your queries.

## Troubleshooting

### Server not appearing
- Verify the path in `config.toml` is absolute and correct
- Check that `build/index.js` exists
- Restart Codex CLI

### Tools not working
- Check Codex logs for errors
- Verify internet connectivity (needed to fetch from zakonyprolidi.cz)
- Test the server manually: `node build/index.js`

### Permission issues
- Ensure Node.js has necessary permissions
- On Windows, check that the path doesn't contain special characters

## Advanced Configuration

### Custom timeout
```toml
[[mcp.servers]]
name = "zakonyprolidi"
command = "node"
args = ["/path/to/build/index.js"]
transport = "stdio"
timeout = 60000  # 60 seconds
```

### Environment variables
```toml
[[mcp.servers]]
name = "zakonyprolidi"
command = "node"
args = ["/path/to/build/index.js"]
transport = "stdio"
env = { NODE_ENV = "production" }
```

## Support

For Codex-specific issues, see [OpenAI Codex Documentation](https://developers.openai.com/codex/).

For MCP server issues, open an issue on the [GitHub repository](https://github.com/LexaurinTheDog/mcp-zakony-pro-lidi).

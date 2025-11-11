Zákony pro lidi MCP Server
Model Context Protocol (MCP) server, který poskytuje Claude Code přístup k českým právním předpisům z www.zakonyprolidi.cz.

English version

Funkce
Tento MCP server umožňuje Claude Code:

Vyhledávat zákony - Najít české zákony a vyhlášky podle čísla, názvu nebo klíčových slov
Načíst dokumenty zákonů - Získat plné znění konkrétních zákonů v aktuálním konsolidovaném znění
Sledovat změny - Monitorovat novely a změny zákonů v čase
Hledat paragrafy - Najít konkrétní paragrafy a ustanovení napříč právními předpisy
Dostupné nástroje
1. search_laws
Vyhledávání českých zákonů a právních předpisů.

Parametry:

query (povinný): Vyhledávací dotaz - může být číslo zákona (např. "89/2012"), číslo paragrafu (např. "§1000"), nebo název zákona
type (volitelný): Typ dokumentu - "law", "treaty", "eu-law", nebo "court-decision"
year (volitelný): Filtrovat podle roku vydání
limit (volitelný): Maximální počet výsledků (výchozí: 10)
Příklad:

Vyhledat občanský zákoník
→ query: "občanský zákoník"
→ Vrátí: Seznam odpovídajících zákonů s čísly a URL
2. fetch_law
Načtení plného textu konkrétního zákona.

Parametry:

lawCode (povinný): Číslo zákona ve formátu "číslo/rok" (např. "89/2012")
section (volitelný): Konkrétní paragraf k načtení (např. "§1000")
Příklad:

Načíst občanský zákoník
→ lawCode: "89/2012"
→ Vrátí: Plné znění zákona se všemi paragrafy
3. get_law_changes
Sledování změn a novel zákona.

Parametry:

lawCode (povinný): Číslo zákona ve formátu "číslo/rok"
dateFrom (volitelný): Počáteční datum ve formátu ISO (RRRR-MM-DD)
Příklad:

Získat všechny změny občanského zákoníku od roku 2020
→ lawCode: "89/2012"
→ dateFrom: "2020-01-01"
→ Vrátí: Časovou osu novel
4. search_sections
Vyhledávání konkrétních paragrafů napříč zákony.

Parametry:

sectionNumber (volitelný): Číslo paragrafu k vyhledání (např. "§1000")
keyword (volitelný): Klíčové slovo nebo fráze k vyhledání v paragrafech
lawCode (volitelný): Omezit vyhledávání na konkrétní zákon
Příklad:

Najít §1000 v občanském zákoníku
→ sectionNumber: "§1000"
→ lawCode: "89/2012"
→ Vrátí: Text paragrafu a kontext
Instalace
Požadavky
Node.js 18 nebo vyšší
npm nebo yarn
Claude Code CLI
Postup instalace
Naklonujte tento repozitář:
git clone https://github.com/LexaurinTheDog/mcp-zakony-pro-lidi.git
cd mcp-zakony-pro-lidi
Nainstalujte závislosti:
npm install
Sestavte projekt:
npm run build
Konfigurace Claude Code
Přidejte MCP server do Claude Code pomocí stdio transportu.

Na Windows (PowerShell/CMD):

claude mcp add --transport stdio zakonyprolidi -- node %CD%\build\index.js
Na Linux/macOS nebo WSL:

claude mcp add --transport stdio zakonyprolidi -- node "$(pwd)/build/index.js"
Poznámka: Ujistěte se, že jste v adresáři projektu při spuštění tohoto příkazu, nebo použijte absolutní cesty.

Ověření instalace
Zkontrolujte, že server je zaregistrován:

claude mcp list
V seznamu MCP serverů by se měl objevit zakonyprolidi.

Použití
Po instalaci můžete nástroje používat přímo v konverzacích s Claude Code:

Příklady konverzací
Vyhledat zákon:

Uživatel: Najdi občanský zákoník
Claude: [Použije nástroj search_laws s dotazem "občanský zákoník"]
Načíst konkrétní zákon:

Uživatel: Dej mi plné znění zákona 89/2012
Claude: [Použije nástroj fetch_law s lawCode "89/2012"]
Najít konkrétní paragraf:

Uživatel: Co říká paragraf 1000 občanského zákoníku?
Claude: [Použije fetch_law s lawCode "89/2012" a section "§1000"]
Zkontrolovat změny zákona:

Uživatel: Jaké novely byly provedeny v zákoně 89/2012 od roku 2022?
Claude: [Použije get_law_changes s lawCode "89/2012" a dateFrom "2022-01-01"]
Najít ustanovení o přeplatku:

Uživatel: Najdi mi ustanovení o přeplatku na dani v daňovém řádu
Claude: [Použije search_sections s keyword "přeplatek" a lawCode "280/2009"]
Vývoj
Struktura projektu
mcp-zakony-pro-lidi/
├── src/
│   ├── index.ts              # Hlavní vstupní bod MCP serveru
│   ├── tools/                # Implementace nástrojů
│   │   ├── search.ts         # Nástroj search_laws
│   │   ├── fetch.ts          # Nástroj fetch_law
│   │   ├── changes.ts        # Nástroj get_law_changes
│   │   └── sections.ts       # Nástroj search_sections
│   ├── scrapers/             # Logika pro stahování obsahu
│   │   └── zakonyprolidi.ts  # Scraper pro www.zakonyprolidi.cz
│   └── types/                # TypeScript definice typů
│       └── index.ts
├── build/                    # Zkompilovaný JavaScript (generovaný)
├── package.json
├── tsconfig.json
├── README.md                 # Anglická verze
└── README.cs.md             # Česká verze
Skripty
npm run build - Zkompilovat TypeScript do JavaScriptu
npm run watch - Vývojový režim s automatickým překompilováním
npm start - Spustit zkompilovaný server
Provádění změn
Upravte zdrojové soubory v src/
Znovu sestavte: npm run build
Restartujte Claude Code nebo se znovu připojte k MCP serveru
Řešení problémů
Server se nezobrazuje v Claude Code
Zkontrolujte, že server je zaregistrován: claude mcp list
Ověřte, že adresář build existuje: ls build/
Zkontrolujte chyby při sestavení: npm run build
Nástroje nefungují
Zkontrolujte logy Claude Code pro chyby
Ověřte, že webová stránka www.zakonyprolidi.cz je dostupná
Otestujte funkce scraperu přímo
Problémy se sítí
Server vyžaduje přístup k internetu pro stahování dat z www.zakonyprolidi.cz. Pokud jste za proxy, může být nutné ji nakonfigurovat.

Omezení
Server stahuje obsah z www.zakonyprolidi.cz a může přestat fungovat, pokud se změní struktura webu
Některé prémiové funkce webu nemusí být dostupné
Velké zákony mohou být zkráceny v odpovědích, aby se zabránilo přetížení kontextového okna
Bezpečnostní aspekty
Tento server provádí HTTP požadavky na externí web (www.zakonyprolidi.cz)
Není vyžadována žádná autentizace, protože web je veřejně přístupný
Server neukládá ani nekešuje žádná data lokálně
Licence
MIT

Přispívání
Příspěvky jsou vítány! Neváhejte otevřít issue nebo poslat pull request.

Podpora
Pro problémy specifické pro tento MCP server prosím otevřete issue na GitHubu. Pro otázky týkající se Claude Code navštivte oficiální dokumentaci.

ENGLISH version follows:

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

1. **Clone this repository:**

```bash
git clone https://github.com/LexaurinTheDog/mcp-zakony-pro-lidi.git
cd mcp-zakony-pro-lidi
```

2. **Install dependencies:**

```bash
npm install
```

3. **Build the project:**

```bash
npm run build
```

### Configure Claude Code

Add the MCP server to Claude Code using the stdio transport.

**On Windows (PowerShell/CMD):**
```bash
claude mcp add --transport stdio zakonyprolidi -- node %CD%\build\index.js
```

**On Linux/macOS or WSL:**
```bash
claude mcp add --transport stdio zakonyprolidi -- node "$(pwd)/build/index.js"
```

**Note:** Make sure you're in the project directory when running this command, or use absolute paths.

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

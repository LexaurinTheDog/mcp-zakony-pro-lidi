# Zákony pro lidi MCP Server

Model Context Protocol (MCP) server, který poskytuje Claude Code přístup k českým právním předpisům z [www.zakonyprolidi.cz](https://www.zakonyprolidi.cz).

[English version](README.md)

## Funkce

Tento MCP server umožňuje Claude Code:

- **Vyhledávat zákony** - Najít české zákony a vyhlášky podle čísla, názvu nebo klíčových slov
- **Načíst dokumenty zákonů** - Získat plné znění konkrétních zákonů v aktuálním konsolidovaném znění
- **Sledovat změny** - Monitorovat novely a změny zákonů v čase
- **Hledat paragrafy** - Najít konkrétní paragrafy a ustanovení napříč právními předpisy

## Dostupné nástroje

### 1. `search_laws`

Vyhledávání českých zákonů a právních předpisů.

**Parametry:**
- `query` (povinný): Vyhledávací dotaz - může být číslo zákona (např. "89/2012"), číslo paragrafu (např. "§1000"), nebo název zákona
- `type` (volitelný): Typ dokumentu - "law", "treaty", "eu-law", nebo "court-decision"
- `year` (volitelný): Filtrovat podle roku vydání
- `limit` (volitelný): Maximální počet výsledků (výchozí: 10)

**Příklad:**
```
Vyhledat občanský zákoník
→ query: "občanský zákoník"
→ Vrátí: Seznam odpovídajících zákonů s čísly a URL
```

### 2. `fetch_law`

Načtení plného textu konkrétního zákona.

**Parametry:**
- `lawCode` (povinný): Číslo zákona ve formátu "číslo/rok" (např. "89/2012")
- `section` (volitelný): Konkrétní paragraf k načtení (např. "§1000")

**Příklad:**
```
Načíst občanský zákoník
→ lawCode: "89/2012"
→ Vrátí: Plné znění zákona se všemi paragrafy
```

### 3. `get_law_changes`

Sledování změn a novel zákona.

**Parametry:**
- `lawCode` (povinný): Číslo zákona ve formátu "číslo/rok"
- `dateFrom` (volitelný): Počáteční datum ve formátu ISO (RRRR-MM-DD)

**Příklad:**
```
Získat všechny změny občanského zákoníku od roku 2020
→ lawCode: "89/2012"
→ dateFrom: "2020-01-01"
→ Vrátí: Časovou osu novel
```

### 4. `search_sections`

Vyhledávání konkrétních paragrafů napříč zákony.

**Parametry:**
- `sectionNumber` (volitelný): Číslo paragrafu k vyhledání (např. "§1000")
- `keyword` (volitelný): Klíčové slovo nebo fráze k vyhledání v paragrafech
- `lawCode` (volitelný): Omezit vyhledávání na konkrétní zákon

**Příklad:**
```
Najít §1000 v občanském zákoníku
→ sectionNumber: "§1000"
→ lawCode: "89/2012"
→ Vrátí: Text paragrafu a kontext
```

## Instalace

### Požadavky

- Node.js 18 nebo vyšší
- npm nebo yarn
- Claude Code CLI

### Postup instalace

1. **Naklonujte tento repozitář:**

```bash
git clone https://github.com/LexaurinTheDog/mcp-zakony-pro-lidi.git
cd mcp-zakony-pro-lidi
```

2. **Nainstalujte závislosti:**

```bash
npm install
```

3. **Sestavte projekt:**

```bash
npm run build
```

### Konfigurace Claude Code

Přidejte MCP server do Claude Code pomocí stdio transportu.

**Na Windows (PowerShell/CMD):**
```bash
claude mcp add --transport stdio zakonyprolidi -- node %CD%\build\index.js
```

**Na Linux/macOS nebo WSL:**
```bash
claude mcp add --transport stdio zakonyprolidi -- node "$(pwd)/build/index.js"
```

**Poznámka:** Ujistěte se, že jste v adresáři projektu při spuštění tohoto příkazu, nebo použijte absolutní cesty.

### Ověření instalace

Zkontrolujte, že server je zaregistrován:

```bash
claude mcp list
```

V seznamu MCP serverů by se měl objevit `zakonyprolidi`.

## Použití

Po instalaci můžete nástroje používat přímo v konverzacích s Claude Code:

### Příklady konverzací

**Vyhledat zákon:**
```
Uživatel: Najdi občanský zákoník
Claude: [Použije nástroj search_laws s dotazem "občanský zákoník"]
```

**Načíst konkrétní zákon:**
```
Uživatel: Dej mi plné znění zákona 89/2012
Claude: [Použije nástroj fetch_law s lawCode "89/2012"]
```

**Najít konkrétní paragraf:**
```
Uživatel: Co říká paragraf 1000 občanského zákoníku?
Claude: [Použije fetch_law s lawCode "89/2012" a section "§1000"]
```

**Zkontrolovat změny zákona:**
```
Uživatel: Jaké novely byly provedeny v zákoně 89/2012 od roku 2022?
Claude: [Použije get_law_changes s lawCode "89/2012" a dateFrom "2022-01-01"]
```

**Najít ustanovení o přeplatku:**
```
Uživatel: Najdi mi ustanovení o přeplatku na dani v daňovém řádu
Claude: [Použije search_sections s keyword "přeplatek" a lawCode "280/2009"]
```

## Vývoj

### Struktura projektu

```
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
```

### Skripty

- `npm run build` - Zkompilovat TypeScript do JavaScriptu
- `npm run watch` - Vývojový režim s automatickým překompilováním
- `npm start` - Spustit zkompilovaný server

### Provádění změn

1. Upravte zdrojové soubory v `src/`
2. Znovu sestavte: `npm run build`
3. Restartujte Claude Code nebo se znovu připojte k MCP serveru

## Řešení problémů

### Server se nezobrazuje v Claude Code

1. Zkontrolujte, že server je zaregistrován: `claude mcp list`
2. Ověřte, že adresář build existuje: `ls build/`
3. Zkontrolujte chyby při sestavení: `npm run build`

### Nástroje nefungují

1. Zkontrolujte logy Claude Code pro chyby
2. Ověřte, že webová stránka www.zakonyprolidi.cz je dostupná
3. Otestujte funkce scraperu přímo

### Problémy se sítí

Server vyžaduje přístup k internetu pro stahování dat z www.zakonyprolidi.cz. Pokud jste za proxy, může být nutné ji nakonfigurovat.

## Omezení

- Server stahuje obsah z www.zakonyprolidi.cz a může přestat fungovat, pokud se změní struktura webu
- Některé prémiové funkce webu nemusí být dostupné
- Velké zákony mohou být zkráceny v odpovědích, aby se zabránilo přetížení kontextového okna

## Bezpečnostní aspekty

- Tento server provádí HTTP požadavky na externí web (www.zakonyprolidi.cz)
- Není vyžadována žádná autentizace, protože web je veřejně přístupný
- Server neukládá ani nekešuje žádná data lokálně

## Licence

MIT

## Přispívání

Příspěvky jsou vítány! Neváhejte otevřít issue nebo poslat pull request.

## Podpora

Pro problémy specifické pro tento MCP server prosím otevřete issue na GitHubu.
Pro otázky týkající se Claude Code navštivte [oficiální dokumentaci](https://code.claude.com/docs).

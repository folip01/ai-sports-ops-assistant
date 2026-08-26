# Stats Server

An MCP (Model Context Protocol) tool server that answers questions about a football team's recent match results, using real data from [football-data.org](https://www.football-data.org).

Part of the [AI Sports Ops Assistant](../README.md) project. See the root README for the full system architecture.

## What it does

Exposes one MCP tool, `get_recent_matches`, which takes a team name (and optionally how many matches to return) and returns that team's most recent finished matches, including opponent, date, result, and score.

## How it works

- Team names are resolved to football-data.org team IDs via a small hardcoded lookup table of major clubs (the free tier covers 12 top competitions, so this is a deliberate, honest scope choice, not a workaround)
- On first request for a team, match data is fetched from football-data.org and cached in SQLite, so repeat questions don't hit the external API again
- If the current season has no finished matches yet (e.g. early in a new season, pre-season), the server automatically falls back to the most recently completed season, so answers stay meaningful rather than empty

## Stack

Express, TypeScript, `@modelcontextprotocol/sdk`, `better-sqlite3`, Zod, Axios

## Running it locally

```bash
cd stats-server
npm install
```

Create a `.env` file in `stats-server/` with:

```
FOOTBALL_DATA_API_KEY=your_key_here
```

Get a free key at [football-data.org/client/register](https://www.football-data.org/client/register).

```bash
npm run dev
```

The server starts on `http://localhost:4001/mcp`.

## Testing it

Use [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to connect and call the tool manually, without needing the agent layer built yet:

```bash
npx @modelcontextprotocol/inspector
```

Connect via **Streamable HTTP** to `http://localhost:4001/mcp`, then call `get_recent_matches` with a team name (e.g. `Arsenal`).

## Known limitations

- Only covers teams in football-data.org's free-tier competitions (Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Champions League, and a few others)
- Scores are delayed on the free tier (not an issue for this tool, since it only deals with already-finished matches, not live scores)
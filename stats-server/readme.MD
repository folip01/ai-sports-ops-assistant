# AI Sports Ops Assistant

An AI agent that answers plain English football questions (e.g. *"how has Arsenal performed in their last 5 matches"*) by discovering and calling tools through a stateless [MCP](https://modelcontextprotocol.io) (Model Context Protocol) gateway.

This project demonstrates backend infrastructure design (service boundaries, caching, gateway routing) alongside AI/LLM engineering (tool calling, agent orchestration), using a protocol (MCP) that's new enough that few engineers have hands-on production experience with it yet.

## Status

🚧 In progress. Built so far:

- ✅ **Stats server** — MCP tool server that answers questions about a team's recent match results, backed by real data from [football-data.org](https://www.football-data.org)
- ⬜ Squad/lineup server
- ⬜ Fixtures server
- ⬜ Gateway (auth, rate limiting, tool routing)
- ⬜ Agent layer (LLM-powered reasoning and tool orchestration)
- ⬜ Plumbing (logging, CI/CD, Docker, deployment)
- ⬜ Mini frontend

## Architecture

The system is made up of independent pieces that only communicate through defined interfaces:

1. **Tool servers** — small, focused MCP servers, each owning one domain (stats, squad, fixtures)
2. **Gateway** — a stateless routing layer in front of the tool servers, handling auth, rate limiting, and tool discovery aggregation
3. **Agent layer** — an LLM-powered agent that interprets a plain English question, decides which tool(s) to call, and returns a natural language answer
4. **Plumbing** — logging, error handling, Docker, CI/CD
5. **Frontend** — a thin UI that talks only to the agent layer

## Stats Server

The first tool server, and the only piece built so far.

**What it does**: exposes one MCP tool, `get_recent_matches`, which takes a team name (and optionally how many matches to return) and returns that team's most recent finished matches.

**How it works**:
- Team names are resolved to football-data.org team IDs via a small lookup table (the free tier covers major clubs across 12 top competitions, so this is a deliberate, honest scope choice rather than a workaround)
- On first request for a team, match data is fetched from football-data.org and cached in SQLite, so repeat questions don't hit the external API again
- If the current season has no finished matches yet (e.g. early in a new season), the server automatically falls back to the most recently completed season, so answers stay meaningful rather than empty
- Input validation is handled with [Zod](https://zod.dev)

**Stack**: Express, TypeScript, `@modelcontextprotocol/sdk`, `better-sqlite3`, Zod, Axios

### Running it locally

```bash
cd stats-server
npm install
```

Create a `.env` file in `stats-server/` with:

```
FOOTBALL_DATA_API_KEY=your_key_here
```

(Get a free key at [football-data.org](https://www.football-data.org/client/register))

```bash
npm run dev
```

The server starts on `http://localhost:4001/mcp`.

### Testing it

Use [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to connect and call the tool manually without needing the agent layer built yet:

```bash
npx @modelcontextprotocol/inspector
```

Connect via **Streamable HTTP** to `http://localhost:4001/mcp`, then call `get_recent_matches` with a team name (e.g. `Arsenal`).

## Why this project

Portfolio project demonstrating both backend engineering and AI agent engineering skill, aimed at backend/AI roles in football and sports technology specifically.
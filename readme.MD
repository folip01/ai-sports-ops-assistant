# AI Sports Ops Assistant: FPL Decision Assistant

An AI agent that helps answer real Fantasy Premier League (FPL) decisions, like *"should I captain Haaland this gameweek?"*, by synthesizing multiple sources of football data through an [MCP](https://modelcontextprotocol.io) (Model Context Protocol) gateway.

## Why this project

Generic football stats lookup ("what were Arsenal's last 5 results") is a solved problem, a Google search or an app like LiveScore already answers it instantly. There's no real reason for an AI assistant to exist just to re-answer something one search already handles.

FPL decisions are different. Answering "should I captain this player" genuinely requires combining several things that no single existing tool puts together automatically: how well the player's actually been playing (recent form), how hard their upcoming fixtures are, and whether they're even available to play. Real FPL players do this manually today, opening multiple tabs and cross-referencing them by hand, every gameweek.

This project builds an agent that does that synthesis for you, and in doing so, demonstrates both backend infrastructure design (service boundaries, caching, gateway routing, observability) and AI/LLM engineering (tool calling, multi-step agent orchestration) using a protocol, MCP, that's new enough that few engineers have hands-on production experience with it yet.

## Status

The core system is complete and working end to end.

- ✅ [Stats server](./stats-server/README.md) — real match history and form via football-data.org
- ✅ [FPL server](./fpl-server/README.md) — player price/ownership/form/availability and fixture difficulty via the official FPL API
- ✅ Gateway — aggregates tool discovery across both servers, routes calls, real Zod schema validation, auth, Redis-backed rate limiting (fails open if Redis is unavailable), graceful degradation if a tool server is down
- ✅ Agent layer — LLM-powered (Groq) orchestration via the Vercel AI SDK, connects to the gateway as an MCP client, decides which tools to call, and reasons over the combined results into an actual recommendation
- ✅ Plumbing — structured JSON logging, `/health` endpoints, and CI (GitHub Actions, type-checks all 4 services on every push and PR)
- ⬜ Mini frontend — in progress

## Architecture

```
User question
     │
     ▼
 Agent layer  ───▶  (Groq + Vercel AI SDK) decides which tool(s) a question needs
     │
     ▼
  Gateway     ───▶  single entry point: auth, rate limiting, routes to the right tool server
     │
     ├──▶ Stats server   (real match history, football-data.org)
     └──▶ FPL server     (price, ownership, form, availability, fixture difficulty)
```

Each tool server owns one narrow domain and knows nothing about the others. The gateway is the only thing that knows where each tool server lives. The agent only ever talks to the gateway, never to a tool server directly, so tool servers can be added, removed, or changed without the agent's code needing to change.

### Why two tool servers, not one

A question like *"should I captain Haaland"* cannot be answered by either server alone. It needs the FPL server's form/availability data and its fixture difficulty, genuinely different information, sourced differently, combined by the agent into one answer. This is what makes the gateway's routing and the agent's orchestration real engineering, not just a pass-through to a single backend.

### Model provider

The agent layer uses Groq (currently `openai/gpt-oss-120b`, a tool-calling-capable model on Groq's free tier) via the Vercel AI SDK. The SDK is provider-agnostic by design, swapping to a different LLM provider is a two-line change (the import and the model string), nothing about the MCP/gateway/tool-server layers needs to change.

## Example question this system is built to answer

> "Should I captain Haaland this gameweek?"

To answer this properly, the agent:
1. Calls `get_player_info` to check Haaland's current form, ownership, and availability
2. Calls `get_fixture_difficulty` to check how hard his upcoming fixture is
3. Weighs both together into a reasoned recommendation, not just raw numbers back at the user

## Repo structure

```
ai-sports-ops-assistant/
  stats-server/     — MCP tool server: match history (football-data.org)
  fpl-server/       — MCP tool server: FPL player & fixture data
  gateway/          — MCP discovery aggregation, routing, auth, rate limiting
  agent/            — LLM agent (Groq) that orchestrates tool calls via the gateway
  .github/workflows/ — CI: type-checks all 4 services on every push and PR
```

Each server has its own README with setup and testing instructions specific to that piece.

## Running the full system locally

Each piece runs as its own process. In four separate terminals:

```bash
cd stats-server && npm install && npm run dev   # http://localhost:4001/mcp
cd fpl-server && npm install && npm run dev      # http://localhost:4002/mcp
cd gateway && npm install && npm run dev         # http://localhost:4000/mcp
cd agent && npm install && npm run dev           # runs one question end-to-end
```

The gateway requires Redis running locally (used for rate limiting; if unavailable, rate limiting is skipped rather than blocking requests). The agent requires a free Groq API key ([console.groq.com/keys](https://console.groq.com/keys), no credit card needed).

## Stack

TypeScript, Express, `@modelcontextprotocol/sdk` (official MCP SDK), Zod, SQLite (`better-sqlite3`), Axios, Vercel AI SDK, Groq, Redis (`ioredis`), GitHub Actions. Built with stack diversity in mind alongside other portfolio projects, this one deliberately uses Express rather than a framework like NestJS used elsewhere.
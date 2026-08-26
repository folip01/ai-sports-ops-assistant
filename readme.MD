# AI Sports Ops Assistant: FPL Decision Assistant

An AI agent that helps answer real Fantasy Premier League (FPL) decisions, like *"should I captain Haaland this gameweek?"*, by synthesizing multiple sources of football data through an [MCP](https://modelcontextprotocol.io) (Model Context Protocol) gateway.

## Why this project

Generic football stats lookup ("what were Arsenal's last 5 results") is a solved problem, a Google search or an app like LiveScore already answers it instantly. There's no real reason for an AI assistant to exist just to re-answer something one search already handles.

FPL decisions are different. Answering "should I captain this player" genuinely requires combining several things that no single existing tool puts together automatically: how well the player's actually been playing (recent form), how hard their upcoming fixtures are, and whether they're even available to play. Real FPL players do this manually today, opening multiple tabs and cross-referencing them by hand, every gameweek.

This project builds an agent that does that synthesis for you, and in doing so, demonstrates both backend infrastructure design (service boundaries, caching, gateway routing) and AI/LLM engineering (tool calling, multi-step agent orchestration) using a protocol, MCP, that's new enough that few engineers have hands-on production experience with it yet.

## Status

🚧 In progress.

- ✅ [Stats server](./stats-server/README.md) — real match history and form via football-data.org
- ✅ [FPL server](./fpl-server/README.md) — player price/ownership/form/availability and fixture difficulty via the official FPL API
- ⬜ Gateway — routes across both tool servers, handles auth and rate limiting
- ⬜ Agent layer — LLM-powered orchestration that calls both servers and reasons over the combined result
- ⬜ Plumbing — logging, CI/CD, Docker, deployment
- ⬜ Mini frontend

## Architecture

```
User question
     │
     ▼
 Agent layer  ───▶  decides which tool(s) a question needs
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

## Example question this system is built to answer

> "Should I captain Haaland this gameweek?"

To answer this properly, the agent needs to:
1. Check Haaland's current form and recent performance (stats server + FPL server)
2. Check his availability, is he injured, suspended, or fully fit (FPL server)
3. Check how difficult his next fixture is (FPL server)
4. Weigh all three together into a reasoned recommendation, not just report raw numbers

## Repo structure

```
ai-sports-ops-assistant/
  stats-server/     — MCP tool server: match history (football-data.org)
  fpl-server/       — MCP tool server: FPL player & fixture data
  gateway/          — (coming next) routes requests across both servers
  agent/            — (coming next) LLM agent that orchestrates tool calls
```

Each server has its own README with setup and testing instructions specific to that piece.

## Stack

TypeScript, Express, `@modelcontextprotocol/sdk` (official MCP SDK), Zod, SQLite (`better-sqlite3`), Axios. Built with stack diversity in mind alongside other portfolio projects, this one deliberately uses Express rather than a framework like NestJS used elsewhere.
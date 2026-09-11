# AI Sports Ops Assistant: An FPL Decision Agent Built on MCP

**Ask it something like *"should I captain Haaland this gameweek?"* and it gives you a real, reasoned answer, backed by live data, not a guess.**

This is a working multi-service AI system: two independent data servers, a gateway that discovers and routes between them, and an LLM agent that decides on its own which tools to call and synthesizes the results, all wired together with [MCP](https://modelcontextprotocol.io) (Model Context Protocol), a standard new enough that most engineers haven't built a real system on it yet.

## Why this exists

Anyone can build a chatbot that answers football trivia, that's a solved problem, Google already does it in the search snippet. This project deliberately targets something harder: a class of question that genuinely requires combining multiple, independently-sourced signals before it can be answered at all.

*"Should I captain this player"* isn't a lookup, it's a synthesis of form, fixture difficulty, and availability, three things that live in different systems, that real Fantasy Premier League managers currently gather by hand, across multiple tabs, every single gameweek. Building an agent that does that synthesis automatically is a real demonstration of tool orchestration, not a toy example built to justify an architecture.

## What's actually running

Four independent services, talking to each other over MCP and HTTP, each with a real reason to exist separately:

| Service | Job | Why it's separate |
|---|---|---|
| **Stats server** | Real match history via football-data.org | Read-heavy, cacheable, no reason to share a deploy lifecycle with anything else |
| **FPL server** | Player price/ownership/form/availability + fixture difficulty, via the official FPL API | Different data source, different caching strategy (whole-dataset, in-memory, hourly) |
| **Gateway** | Discovers tools across both servers, merges them into one list, routes calls, handles auth + rate limiting | The single point every consumer talks to, so tool servers can change without breaking anything upstream |
| **Agent** | LLM (via Groq + Vercel AI SDK) that decides which tools a question needs, calls them through the gateway, and reasons over the results | The only piece that understands *questions*, everything below it only understands *tools* |

Plus a minimal frontend and a CI pipeline that type-checks all four services on every push.

## Engineering decisions worth knowing about

These are the calls that actually took judgment, not just implementation:

- **Swapped data source mid-build (TheSportsDB → football-data.org) after hitting undocumented free-tier caps.** Rather than hack around silent 1-result limits, diagnosed the root cause and moved to a provider with a published, honest free tier, a real production instinct: don't build fragile workarounds around a vendor's undocumented behavior.
- **Pivoted the entire product direction mid-build**, from "ask any football question" to an FPL decision assistant, after recognizing the original scope had no real use case (Google already answers "what were Arsenal's last 5 results" instantly). The pivot kept 100% of the existing architecture and most of the existing code; only the domain framing changed. That's a sign the architecture was sound, not a sign of a false start.
- **Two tool servers, not one, and not three.** A squad-management server was designed, then deliberately cut, it solved an invented problem nobody has. A fixtures server was cut, then brought back once it had a real justification (demonstrating the gateway actually routing across multiple servers, not just passing through to one). Every service that exists earned its place.
- **Different caching strategies per service, chosen deliberately, not defaulted.** SQLite for the stats server (survives restarts, matters because match history is expensive to refetch). Plain in-memory for the FPL server (one clean endpoint, no rate-limit pressure, a restart just costs one harmless refetch). Same author, two different, correct answers, not one pattern copy-pasted twice.
- **The gateway fails open, not closed.** If Redis (rate limiting) goes down, requests are still served rather than the whole system going dark over a non-critical dependency, a deliberate resilience choice, not an oversight.
- **Rebuilt a JSON-Schema-to-Zod converter from scratch** after an initial version silently discarded every tool's real input validation (defaulting everything to `z.any()`). Caught via schema-portability warnings in MCP Inspector, not guesswork, and fixed at the root rather than patched.
- **Model provider is swappable in two lines.** The agent was built against Anthropic, then moved to Groq (a genuinely free tier with no billing setup) without touching the MCP client, the gateway, or either tool server, proof the LLM is a pluggable component, not load-bearing architecture.

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

The agent never talks to a tool server directly. It only knows the gateway exists. This means tool servers can be added, removed, or replaced without the agent's code changing at all, the entire point of building this on MCP instead of hand-wiring API calls.

## See it work

> "Should I captain Haaland this gameweek?"

The agent calls `get_player_info` (form: 8.0, ownership: 71%, availability: confirmed) and `get_fixture_difficulty` (upcoming opponent, FDR rating) through the gateway, then writes an actual recommendation, not a data dump, weighing form against fixture difficulty the way a real FPL manager would.

## Status

- ✅ Stats server, FPL server, gateway, agent layer: built, tested, working end to end
- ✅ Plumbing: structured JSON logging, `/health` checks, CI (GitHub Actions, all 4 services)
- ✅ Minimal frontend
- ⬜ Deployment (in progress)

## Repo structure

```
ai-sports-ops-assistant/
  stats-server/       — MCP tool server: match history (football-data.org)
  fpl-server/         — MCP tool server: FPL player & fixture data
  gateway/            — MCP discovery aggregation, routing, auth, rate limiting
  agent/              — LLM agent (Groq) + API endpoint, orchestrates tool calls via the gateway
  frontend/           — minimal UI calling the agent's /ask endpoint
  .github/workflows/  — CI: type-checks all 4 services on every push and PR
```

Each server has its own README with setup and testing instructions specific to that piece.

## Running it locally

Four services, four terminals:

```bash
cd stats-server && npm install && npm run dev   # http://localhost:4001/mcp
cd fpl-server && npm install && npm run dev      # http://localhost:4002/mcp
cd gateway && npm install && npm run dev         # http://localhost:4000/mcp
cd agent && npm install && npm run dev           # http://localhost:4010
```

The gateway needs Redis running locally (rate limiting; fails open if unavailable). The agent needs a free Groq API key ([console.groq.com/keys](https://console.groq.com/keys), no card required).

Then open `frontend/index.html` in a browser.

## Stack

TypeScript, Express, `@modelcontextprotocol/sdk`, Zod, SQLite (`better-sqlite3`), Axios, Vercel AI SDK, Groq, Redis (`ioredis`), GitHub Actions. Deliberately built on Express rather than NestJS (used in another portfolio project) for stack diversity.
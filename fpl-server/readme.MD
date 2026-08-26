# FPL Server

An MCP (Model Context Protocol) tool server that answers Fantasy Premier League (FPL) decision-support questions, using the official, free Fantasy Premier League API.

Part of the [AI Sports Ops Assistant](../README.md) project. See the root README for the full system architecture.

## What it does

Exposes two MCP tools:

- **`get_player_info`**: given a player's name, returns their current FPL price, ownership percentage, form score, and availability status (available, injured, doubtful, suspended), plus any news (e.g. expected return date from injury).
- **`get_fixture_difficulty`**: given a player's name, returns their team's next 5 fixtures, each with FPL's official Fixture Difficulty Rating (FDR), opponent, gameweek, and home/away status.

Together, these give the two key inputs behind a real FPL decision, like "should I captain this player this gameweek": how well are they playing right now, and how hard are their upcoming matches.

## How it works

- Uses the official FPL API (`fantasy.premierleague.com/api`), which is free and requires no authentication or API key
- The `bootstrap-static` endpoint returns the entire dataset (all players, all teams, the full gameweek schedule) in one call, this is fetched once and cached in memory for an hour, since prices, ownership, and form don't change second to second
- Player names are matched against both their full name and FPL's shorter display name (`web_name`), since players are commonly referred to by one name (e.g. "Haaland" rather than "Erling Haaland")
- Fixture difficulty comes from a second endpoint, `element-summary/{player_id}/`, called per player, using the player ID resolved from the cached bootstrap data

## Stack

Express, TypeScript, `@modelcontextprotocol/sdk`, Zod, Axios

## Running it locally

```bash
cd fpl-server
npm install
npm run dev
```

No API key or `.env` file needed. The server starts on `http://localhost:4002/mcp`.

## Testing it

```bash
npx @modelcontextprotocol/inspector
```

Connect via **Streamable HTTP** to `http://localhost:4002/mcp`, then try:

- `get_player_info` with `playerName: Haaland`
- `get_fixture_difficulty` with `playerName: Saka`

## Known limitations

- This is an unofficial, community-reverse-engineered API (FPL doesn't formally document or support it as a public product), though it has been stable and widely relied upon by FPL tools for years
- Cache is in-memory only, so it resets on server restart (a deliberate tradeoff for simplicity, since a restart just costs one harmless refetch, not repeated calls against a rate-limited API)
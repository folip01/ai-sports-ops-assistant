import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { getPlayerInfoSchema, getPlayerInfoHandler } from './tools/getPlayerInfo';
import { getFixtureDifficultySchema, getFixtureDifficultyHandler } from './tools/getFixtureDifficulty';

const server = new McpServer({
    name: 'fpl-server',
    version: '1.0.0',
});

server.tool(
    'get_player_info',
    'Get FPL price, ownership, form, and availability for a player',
    getPlayerInfoSchema,
    getPlayerInfoHandler
);

server.tool(
    'get_fixture_difficulty',
    'Get a player\'s upcoming fixtures and FPL difficulty ratings',
    getFixtureDifficultySchema,
    getFixtureDifficultyHandler
);

const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
    });

    res.on('close', () => {
        transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
});

const PORT = 4002;
app.listen(PORT, () => {
    console.log(`FPL server running on http://localhost:${PORT}/mcp`);
});
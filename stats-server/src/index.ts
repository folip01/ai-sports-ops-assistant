import 'dotenv/config';
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { getRecentMatchesSchema, getRecentMatchesHandler } from './tools/getRecentMatches';
import { createLogger } from './logger';
const logger = createLogger('stats-server'); // or 'fpl-server' / 'gateway'

const server = new McpServer({
    name: 'stats-server',
    version: '1.0.0',
});

server.tool(
    'get_recent_matches',
    'Get recent match results for a football team',
    getRecentMatchesSchema,
    getRecentMatchesHandler
);

const app = express();
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'stats-server', timestamp: new Date().toISOString() });
});
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

const PORT = 4001;
app.listen(PORT, () => {
    logger.info(`Stats server running on http://localhost:${PORT}/mcp`);
});
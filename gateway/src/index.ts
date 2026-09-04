import 'dotenv/config';
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { getToolRegistry, findToolServer } from './toolRegistry';
import { callTool } from './mcpClient';
import { buildZodShape } from './jsonSchemaToZod';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';

const server = new McpServer({
    name: 'gateway',
    version: '1.0.0',
});

async function registerAggregatedTools() {
    const tools = await getToolRegistry();

    for (const tool of tools) {
        const zodShape = buildZodShape(tool.inputSchema);

        server.tool(
            tool.name,
            tool.description,
            zodShape,
            async (args: any) => {
                const target = await findToolServer(tool.name);
                if (!target) {
                    return {
                        content: [{ type: 'text' as const, text: `Tool "${tool.name}" is no longer available.` }],
                    };
                }
                const result = await callTool(target.serverUrl, tool.name, args);
                return result;
            }
        );
    }
}

const app = express();
app.use(express.json());

app.post('/mcp', authMiddleware, rateLimitMiddleware, async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
    });

    res.on('close', () => {
        transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
});

const PORT = 4000;

registerAggregatedTools().then(() => {
    app.listen(PORT, () => {
        console.log(`Gateway running on http://localhost:${PORT}/mcp`);
    });
});
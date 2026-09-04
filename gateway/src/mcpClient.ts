import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { TOOL_SERVERS } from './config';

export interface DiscoveredTool {
    name: string;
    description: string;
    inputSchema: any;
    serverName: string;
    serverUrl: string;
}

async function connectToServer(url: string): Promise<Client> {
    const client = new Client({ name: 'gateway-client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(url));
    await client.connect(transport);
    return client;
}

export async function discoverAllTools(): Promise<DiscoveredTool[]> {
    const allTools: DiscoveredTool[] = [];

    for (const server of TOOL_SERVERS) {
        try {
            const client = await connectToServer(server.url);
            const result = await client.listTools();

            for (const tool of result.tools) {
                allTools.push({
                    name: tool.name,
                    description: tool.description ?? '',
                    inputSchema: tool.inputSchema,
                    serverName: server.name,
                    serverUrl: server.url,
                });
            }

            await client.close();
        } catch (err) {
            console.error(`[gateway] Could not reach tool server "${server.name}" at ${server.url}: ${(err as Error).message}`);
            console.error(`[gateway] Continuing without "${server.name}", its tools will not be available right now.`);
        }
    }

    return allTools;
}

export async function callTool(serverUrl: string, toolName: string, args: any): Promise<any> {
    try {
        const client = await connectToServer(serverUrl);
        try {
            const result = await client.callTool({ name: toolName, arguments: args });
            return result;
        } finally {
            await client.close();
        }
    } catch (err) {
        return {
            content: [
                {
                    type: 'text' as const,
                    text: `The service handling "${toolName}" is currently unavailable. Please try again shortly.`,
                },
            ],
            isError: true,
        };
    }
}
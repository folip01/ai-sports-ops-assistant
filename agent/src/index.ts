import 'dotenv/config';
import { generateText, tool } from 'ai';
import { groq } from '@ai-sdk/groq';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod';


const GATEWAY_URL = 'http://localhost:4000/mcp';
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY!;
const MAX_STEPS = 6;

async function connectToGateway(): Promise<Client> {
    const client = new Client({ name: 'agent-client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(GATEWAY_URL), {
        requestInit: {
            headers: { 'X-API-Key': GATEWAY_API_KEY },
        },
    });
    await client.connect(transport);
    return client;
}

function jsonSchemaToZod(schema: any): z.ZodTypeAny {
    if (!schema || typeof schema !== 'object') return z.any();

    switch (schema.type) {
        case 'string':
            return z.string();
        case 'number':
        case 'integer':
            return z.number();
        case 'boolean':
            return z.boolean();
        default:
            return z.any();
    }
}

async function buildToolsFromGateway(mcpClient: Client) {
    const { tools: mcpTools } = await mcpClient.listTools();

    const tools: Record<string, any> = {};

    for (const mcpTool of mcpTools) {
        const properties = mcpTool.inputSchema?.properties ?? {};
        const required: string[] = (mcpTool.inputSchema as any)?.required ?? [];

        const shape: Record<string, z.ZodTypeAny> = {};
        for (const key of Object.keys(properties)) {
            const fieldSchema = jsonSchemaToZod(properties[key]);
            shape[key] = required.includes(key) ? fieldSchema : fieldSchema.optional();
        }

        tools[mcpTool.name] = tool({
            description: mcpTool.description ?? '',
            inputSchema: z.object(shape),
            execute: async (args: any) => {
                const result = await mcpClient.callTool({ name: mcpTool.name, arguments: args });
                return result;
            },
        });
    }

    return tools;
}

async function askAgent(question: string) {
    const mcpClient = await connectToGateway();
    const tools = await buildToolsFromGateway(mcpClient);

    const result = await generateText({
        model: groq('openai/gpt-oss-120b'),
        tools,
        stopWhen: ({ steps }) => steps.length >= MAX_STEPS,
        system:
            'You are an FPL (Fantasy Premier League) decision assistant. ' +
            'Use the available tools to gather real data about players before answering. ' +
            'Give a clear, reasoned recommendation, not just raw numbers.',
        prompt: question,
    });

    await mcpClient.close();

    return result.text;
}

const question = process.argv.slice(2).join(' ') || 'Should I captain Haaland this gameweek?';

askAgent(question)
    .then((answer) => {
        console.log('\n--- Agent answer ---\n');
        console.log(answer);
    })
    .catch((err) => {
        console.error('Agent error:', err);
    });
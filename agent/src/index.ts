import 'dotenv/config';
import express from 'express';
import { generateText, tool } from 'ai';
import { groq } from '@ai-sdk/groq';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod';
import { createLogger } from './logger';

const logger = createLogger('agent');

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

async function askAgent(question: string): Promise<string> {
    const mcpClient = await connectToGateway();
    const tools = await buildToolsFromGateway(mcpClient);

    const result = await generateText({
        model: groq('openai/gpt-oss-120b'),
        tools,
        stopWhen: ({ steps }) => steps.length >= MAX_STEPS,

        system:
            'You are an FPL (Fantasy Premier League) decision assistant. ' +
            'Use the available tools when useful. ' +
            'After using tools, you MUST answer the user directly. ' +
            'Never finish after a tool call without giving a final answer. ' +
            'Give a clear, reasoned response.',

        prompt: question,
    });

    console.log('\n========== AGENT DEBUG ==========');
    console.log('TEXT:', JSON.stringify(result.text));
    console.log('FINISH REASON:', result.finishReason);
    console.log('NUMBER OF STEPS:', result.steps.length);

    result.steps.forEach((step, i) => {
        console.log(`\n--- STEP ${i + 1} ---`);
        console.log('TEXT:', JSON.stringify(step.text));
        console.log('TOOL CALLS:', step.toolCalls);
        console.log('TOOL RESULTS:', step.toolResults);
    });

    console.log('\n=================================\n');

    await mcpClient.close();

    return result.text || 'The model did not produce a final answer.';

}

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'agent', timestamp: new Date().toISOString() });
});

app.post('/ask', async (req, res) => {
    const question = req.body?.question;

    if (!question || typeof question !== 'string') {
        res.status(400).json({ error: 'Missing "question" in request body' });
        return;
    }

    logger.info('Received question', { question });

    try {
        const answer = await askAgent(question);
        logger.info('Answered question', { question });
        res.json({ answer });
    } catch (err) {
        logger.error('Agent failed to answer', { question, error: (err as Error).message });
        res.status(500).json({ error: 'The agent could not answer right now. Please try again.' });
    }
});

const PORT = 4010;
app.listen(PORT, () => {
    logger.info('Agent server started', { port: PORT });
});
import { discoverAllTools, DiscoveredTool } from './mcpClient';

const CACHE_DURATION_MS = 5 * 60 * 1000;

let cachedTools: DiscoveredTool[] = [];
let cachedAt: number | null = null;

export async function getToolRegistry(): Promise<DiscoveredTool[]> {
    const isStale = !cachedAt || Date.now() - cachedAt > CACHE_DURATION_MS;

    if (cachedTools.length > 0 && !isStale) {
        return cachedTools;
    }

    cachedTools = await discoverAllTools();
    cachedAt = Date.now();

    return cachedTools;
}

export async function findToolServer(toolName: string): Promise<DiscoveredTool | null> {
    const tools = await getToolRegistry();
    return tools.find((t) => t.name === toolName) ?? null;
}
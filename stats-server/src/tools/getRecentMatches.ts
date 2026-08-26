import { z } from 'zod';
import { getCachedMatches } from '../services/cache';

export const getRecentMatchesSchema = {
    team: z.string().describe('The name of the football team, e.g. Arsenal'),
    count: z.number().optional().describe('How many recent matches to return, defaults to 5'),
};

export async function getRecentMatchesHandler(input: { team: string; count?: number }) {
    const matches = await getCachedMatches(input.team);
    const limit = input.count ?? 5;
    const result = matches.slice(0, limit);

    return {
        content: [
            {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
            },
        ],
    };
}
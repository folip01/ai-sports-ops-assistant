import { z } from 'zod';
import { getFixtureDifficulty } from '../services/fplApi';

export const getFixtureDifficultySchema = {
    playerName: z.string().describe('The name of the FPL player, e.g. Haaland'),
};

export async function getFixtureDifficultyHandler(input: { playerName: string }) {
    const result = await getFixtureDifficulty(input.playerName);

    if (!result) {
        return {
            content: [
                {
                    type: 'text' as const,
                    text: `No player found matching "${input.playerName}"`,
                },
            ],
        };
    }

    return {
        content: [
            {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
            },
        ],
    };
}
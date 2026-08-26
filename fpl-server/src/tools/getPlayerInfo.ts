import { z } from 'zod';
import { getPlayerInfo } from '../services/fplApi';

export const getPlayerInfoSchema = {
    playerName: z.string().describe('The name of the FPL player, e.g. Haaland'),
};

export async function getPlayerInfoHandler(input: { playerName: string }) {
    const player = await getPlayerInfo(input.playerName);

    if (!player) {
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
                text: JSON.stringify(player, null, 2),
            },
        ],
    };
}
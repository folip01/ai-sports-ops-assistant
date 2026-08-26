import axios from 'axios';
import { PlayerInfo, FixtureDifficulty } from '../types';

const BOOTSTRAP_URL = 'https://fantasy.premierleague.com/api/bootstrap-static/';
const CACHE_DURATION_MS = 60 * 60 * 1000;

let cachedData: any = null;
let cachedAt: number | null = null;

async function getBootstrapData(): Promise<any> {
    const isStale = !cachedAt || Date.now() - cachedAt > CACHE_DURATION_MS;

    if (cachedData && !isStale) {
        return cachedData;
    }

    const res = await axios.get(BOOTSTRAP_URL);
    cachedData = res.data;
    cachedAt = Date.now();

    return cachedData;
}

function statusToLabel(status: string): string {
    const labels: Record<string, string> = {
        a: 'Available',
        i: 'Injured',
        d: 'Doubtful',
        s: 'Suspended',
        u: 'Unavailable',
    };
    return labels[status] ?? 'Unknown';
}

export async function getPlayerInfo(playerName: string): Promise<PlayerInfo | null> {
    const data = await getBootstrapData();

    const searchName = playerName.trim().toLowerCase();

    const player = data.elements.find((el: any) => {
        const fullName = `${el.first_name} ${el.second_name}`.toLowerCase();
        return (
            fullName.includes(searchName) ||
            el.web_name.toLowerCase() === searchName
        );
    });

    if (!player) return null;

    const team = data.teams.find((t: any) => t.id === player.team);

    return {
        name: `${player.first_name} ${player.second_name}`,
        team: team ? team.name : 'Unknown',
        price: player.now_cost / 10,
        ownershipPercent: parseFloat(player.selected_by_percent),
        form: player.form,
        status: statusToLabel(player.status),
        news: player.news || 'No news',
    };


}
async function findPlayerId(playerName: string, data: any): Promise<{ id: number; name: string } | null> {
    const searchName = playerName.trim().toLowerCase();

    const player = data.elements.find((el: any) => {
        const fullName = `${el.first_name} ${el.second_name}`.toLowerCase();
        return (
            fullName.includes(searchName) ||
            el.web_name.toLowerCase() === searchName
        );
    });

    if (!player) return null;

    return { id: player.id, name: `${player.first_name} ${player.second_name}` };
}


export async function getFixtureDifficulty(playerName: string): Promise<FixtureDifficulty | null> {
    const data = await getBootstrapData();
    const match = await findPlayerId(playerName, data);

    if (!match) return null;

    const res = await axios.get(
        `https://fantasy.premierleague.com/api/element-summary/${match.id}/`
    );

    const teamsById = new Map(data.teams.map((t: any) => [t.id, t.name]));

    const upcoming = res.data.fixtures.slice(0, 5).map((fixture: any) => {
        const isHome = fixture.is_home;
        const opponentId = isHome ? fixture.team_a : fixture.team_h;

        return {
            opponent: teamsById.get(opponentId) ?? 'Unknown',
            gameweek: fixture.event,
            difficulty: isHome ? fixture.difficulty : fixture.difficulty,
            isHome,
        };
    });

    return {
        playerName: match.name,
        upcoming,
    };
}


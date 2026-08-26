import axios from 'axios';
import { Match } from '../types';

const BASE_URL = 'https://api.football-data.org/v4';

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

const client = axios.create({
    baseURL: BASE_URL,
    headers: { 'X-Auth-Token': API_KEY },
});

const TEAM_IDS: Record<string, number> = {
    arsenal: 57,
    'manchester united': 66,
    'manchester city': 65,
    liverpool: 64,
    chelsea: 61,
    tottenham: 73,
    'real madrid': 86,
    barcelona: 81,
    'bayern munich': 5,
    'borussia dortmund': 4,
    juventus: 109,
    'ac milan': 98,
    psg: 524,
};

function resolveTeamId(teamName: string): number | null {
    const key = teamName.trim().toLowerCase();
    return TEAM_IDS[key] ?? null;
}

function getCurrentSeasonStartYear(): number {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    return month >= 7 ? year : year - 1;
}

async function fetchFinishedMatches(teamId: number, seasonStartYear: number): Promise<any[]> {
    const res = await client.get(`/teams/${teamId}/matches`, {
        params: {
            status: 'FINISHED',
            season: seasonStartYear,
            limit: 20,
        },
    });
    return res.data.matches ?? [];
}

export async function fetchRecentMatches(teamName: string): Promise<Match[]> {
    const teamId = resolveTeamId(teamName);
    if (!teamId) {
        throw new Error(
            `Team not supported yet: ${teamName}. Supported teams: ${Object.keys(TEAM_IDS).join(', ')}`
        );
    }

    const currentSeasonStartYear = getCurrentSeasonStartYear();

    let matches = await fetchFinishedMatches(teamId, currentSeasonStartYear);

    if (matches.length === 0) {
        matches = await fetchFinishedMatches(teamId, currentSeasonStartYear - 1);
    }

    const sorted = [...matches].sort(
        (a: any, b: any) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime()
    );

    return sorted.map((match: any) => {
        const isHome = match.homeTeam.id === teamId;
        const teamScore = isHome ? match.score.fullTime.home : match.score.fullTime.away;
        const opponentScore = isHome ? match.score.fullTime.away : match.score.fullTime.home;

        let result: 'W' | 'L' | 'D' = 'D';
        if (teamScore > opponentScore) result = 'W';
        if (teamScore < opponentScore) result = 'L';

        return {
            team: teamName,
            opponent: isHome ? match.awayTeam.name : match.homeTeam.name,
            date: match.utcDate.split('T')[0],
            result,
            score: `${match.score.fullTime.home}-${match.score.fullTime.away}`,
        };
    });
}
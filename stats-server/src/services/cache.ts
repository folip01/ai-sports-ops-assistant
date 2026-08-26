import { db } from '../db/connection';
import { fetchRecentMatches } from './footballData';
import { Match } from '../types';

export async function getCachedMatches(teamName: string): Promise<Match[]> {
    const existing = db
        .prepare('SELECT * FROM matches WHERE team = ?')
        .all(teamName) as Match[];

    if (existing.length > 0) {
        return existing;
    }

    const fresh = await fetchRecentMatches(teamName);

    const insert = db.prepare(`
    INSERT INTO matches (team, opponent, date, result, score, fetchedAt)
    VALUES (@team, @opponent, @date, @result, @score, @fetchedAt)
  `);

    const now = new Date().toISOString();

    for (const match of fresh) {
        insert.run({ ...match, fetchedAt: now });
    }

    return fresh;
}
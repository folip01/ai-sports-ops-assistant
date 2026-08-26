// import axios from 'axios';
// import { Match } from '../types';

// const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/123';
// const MIN_MATCHES_TARGET = 5;
// const MAX_SEASONS_BACK = 1;

// async function getTeamInfo(teamName: string): Promise<{ idLeague: string; teamName: string } | null> {
//     const res = await axios.get(`${BASE_URL}/searchteams.php`, {
//         params: { t: teamName },
//     });

//     const team = res.data.teams?.[0];
//     if (!team) return null;

//     return {
//         idLeague: team.idLeague,
//         teamName: team.strTeam,
//     };
// }

// function getCurrentSeasonStartYear(): number {
//     const now = new Date();
//     const year = now.getFullYear();
//     const month = now.getMonth() + 1;

//     return month >= 7 ? year : year - 1;
// }

// async function fetchSeasonEvents(idLeague: string, season: string): Promise<any[]> {
//     const res = await axios.get(`${BASE_URL}/eventsseason.php`, {
//         params: { id: idLeague, s: season },
//     });
//     return res.data.events ?? [];
// }

// function filterPlayedMatches(events: any[], teamName: string): any[] {
//     return events.filter(
//         (event: any) =>
//             (event.strHomeTeam === teamName || event.strAwayTeam === teamName) &&
//             event.intHomeScore !== null &&
//             event.intAwayScore !== null
//     );
// }

// export async function fetchRecentMatches(teamName: string): Promise<Match[]> {
//     const teamInfo = await getTeamInfo(teamName);
//     if (!teamInfo) {
//         throw new Error(`Team not found: ${teamName}`);
//     }

//     const currentStartYear = getCurrentSeasonStartYear();
//     let playedMatches: any[] = [];

//     for (let seasonsBack = 0; seasonsBack <= MAX_SEASONS_BACK; seasonsBack++) {
//         if (playedMatches.length >= MIN_MATCHES_TARGET) break;

//         const startYear = currentStartYear - seasonsBack;
//         const season = `${startYear}-${startYear + 1}`;

//         const events = await fetchSeasonEvents(teamInfo.idLeague, season);
//         const played = filterPlayedMatches(events, teamInfo.teamName);

//         playedMatches = [...playedMatches, ...played];
//     }

//     playedMatches.sort(
//         (a: any, b: any) =>
//             new Date(b.dateEvent).getTime() - new Date(a.dateEvent).getTime()
//     );

//     return playedMatches.map((event: any) => {
//         const isHome = event.strHomeTeam === teamInfo.teamName;
//         const teamScore = isHome ? event.intHomeScore : event.intAwayScore;
//         const opponentScore = isHome ? event.intAwayScore : event.intHomeScore;

//         let result: 'W' | 'L' | 'D' = 'D';
//         if (teamScore > opponentScore) result = 'W';
//         if (teamScore < opponentScore) result = 'L';

//         return {
//             team: teamName,
//             opponent: isHome ? event.strAwayTeam : event.strHomeTeam,
//             date: event.dateEvent,
//             result,
//             score: `${event.intHomeScore}-${event.intAwayScore}`,
//         };
//     });
// }
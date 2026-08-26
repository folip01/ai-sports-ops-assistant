export interface Match {
    team: string;
    opponent: string;
    date: string;
    result: 'W' | 'L' | 'D';
    score: string;
}
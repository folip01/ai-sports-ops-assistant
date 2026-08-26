export interface PlayerInfo {
    name: string;
    team: string;
    price: number;
    ownershipPercent: number;
    form: string;
    status: string;
    news: string;
}

export interface FixtureDifficulty {
    playerName: string;
    upcoming: {
        opponent: string;
        gameweek: number;
        difficulty: number;
        isHome: boolean;
    }[];
}
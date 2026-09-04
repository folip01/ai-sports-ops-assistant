import { Request, Response, NextFunction } from 'express';

const VALID_API_KEYS = new Set(
    (process.env.GATEWAY_API_KEYS ?? '').split(',').map((k) => k.trim()).filter(Boolean)
);

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.header('X-API-Key');

    if (!apiKey || !VALID_API_KEYS.has(apiKey)) {
        res.status(401).json({ error: 'Missing or invalid API key' });
        return;
    }

    next();
}
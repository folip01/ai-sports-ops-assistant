type LogLevel = 'info' | 'warn' | 'error';

function log(level: LogLevel, service: string, message: string, meta?: Record<string, unknown>) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        service,
        message,
        ...(meta ?? {}),
    };
    console.log(JSON.stringify(entry));
}

export function createLogger(service: string) {
    return {
        info: (message: string, meta?: Record<string, unknown>) => log('info', service, message, meta),
        warn: (message: string, meta?: Record<string, unknown>) => log('warn', service, message, meta),
        error: (message: string, meta?: Record<string, unknown>) => log('error', service, message, meta),
    };
}
import { Request, Response, NextFunction } from 'express';

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  gray: '\x1b[90m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function timestamp(): string {
  return `${colors.gray}[${new Date().toLocaleTimeString()}]${colors.reset}`;
}

export const logger = {
  info(message: string, meta?: unknown): void {
    const tag = `${colors.blue}${colors.bold}[INFO]${colors.reset}`;
    if (meta !== undefined) {
      console.log(`${timestamp()} ${tag} ${message}`, meta);
    } else {
      console.log(`${timestamp()} ${tag} ${message}`);
    }
  },

  success(message: string, meta?: unknown): void {
    const tag = `${colors.green}${colors.bold}[SUCCESS]${colors.reset}`;
    if (meta !== undefined) {
      console.log(`${timestamp()} ${tag} ${message}`, meta);
    } else {
      console.log(`${timestamp()} ${tag} ${message}`);
    }
  },

  warn(message: string, meta?: unknown): void {
    const tag = `${colors.yellow}${colors.bold}[WARN]${colors.reset}`;
    if (meta !== undefined) {
      console.warn(`${timestamp()} ${tag} ${message}`, meta);
    } else {
      console.warn(`${timestamp()} ${tag} ${message}`);
    }
  },

  error(message: string, error?: unknown): void {
    const tag = `${colors.red}${colors.bold}[ERROR]${colors.reset}`;
    if (error !== undefined) {
      console.error(`${timestamp()} ${tag} ${message}`, error);
    } else {
      console.error(`${timestamp()} ${tag} ${message}`);
    }
  },

  http(method: string, url: string, status: number, durationMs: number): void {
    let methodColor = colors.cyan;
    switch (method.toUpperCase()) {
      case 'GET':
        methodColor = colors.green;
        break;
      case 'POST':
        methodColor = colors.blue;
        break;
      case 'PUT':
      case 'PATCH':
        methodColor = colors.yellow;
        break;
      case 'DELETE':
        methodColor = colors.red;
        break;
    }

    let statusColor = colors.green;
    if (status >= 500) statusColor = colors.red;
    else if (status >= 400) statusColor = colors.yellow;
    else if (status >= 300) statusColor = colors.cyan;

    const formattedMethod = `${methodColor}${colors.bold}${method.padEnd(6)}${colors.reset}`;
    const formattedUrl = `${colors.bold}${url}${colors.reset}`;
    const formattedStatus = `${statusColor}${colors.bold}${status}${colors.reset}`;
    const formattedDuration = `${colors.dim}${durationMs}ms${colors.reset}`;

    console.log(`${timestamp()} ${formattedMethod} ${formattedUrl} ${formattedStatus} ${formattedDuration}`);
  },

  ws(event: 'connected' | 'disconnected' | 'message' | 'error', details: string): void {
    const tag = `${colors.magenta}${colors.bold}[WS]${colors.reset}`;
    let eventColor = colors.cyan;
    if (event === 'connected') eventColor = colors.green;
    else if (event === 'disconnected') eventColor = colors.yellow;
    else if (event === 'error') eventColor = colors.red;

    const formattedEvent = `${eventColor}${colors.bold}${event.padEnd(12)}${colors.reset}`;
    console.log(`${timestamp()} ${tag} ${formattedEvent} ${details}`);
  },

  middleware(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.http(req.method, req.originalUrl || req.url, res.statusCode, duration);
    });
    next();
  },
};

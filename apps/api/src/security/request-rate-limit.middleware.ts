import type { NextFunction, Request, Response } from 'express';

type ClientWindow = { count: number; expiresAt: number };

/** A small in-memory safeguard for this single-process API. Use a shared limiter in multi-instance deployments. */
export function requestRateLimit(
  limit = 60,
  windowMs = 60_000,
) {
  const clients = new Map<string, ClientWindow>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    let window = clients.get(key);

    if (!window || window.expiresAt <= now) {
      window = { count: 0, expiresAt: now + windowMs };
      clients.set(key, window);
    }

    window.count++;
    if (window.count > limit) {
      res.setHeader('Retry-After', String(Math.ceil((window.expiresAt - now) / 1000)));
      res.status(429).json({ message: 'Too many requests' });
      return;
    }

    // Prevent unbounded memory growth when many source addresses are seen.
    if (clients.size > 10_000) {
      for (const [client, entry] of clients) {
        if (entry.expiresAt <= now) clients.delete(client);
      }
    }

    next();
  };
}

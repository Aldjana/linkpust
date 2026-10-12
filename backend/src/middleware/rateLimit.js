import rateLimit from 'express-rate-limit';

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message } },
  });

export const apiLimiter = make(60_000, 300, 'Trop de requêtes, réessayez dans un instant.');
export const authLimiter = make(15 * 60_000, 40, 'Trop de tentatives, réessayez plus tard.');
export const clickLimiter = make(60_000, 120, 'Trop de requêtes.');

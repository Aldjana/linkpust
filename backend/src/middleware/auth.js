import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../utils/http.js';
import { syncSubscription } from '../services/subscription.js';

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError(401, 'Authentification requise', 'UNAUTHENTICATED');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError(401, 'Session expirée ou invalide', 'INVALID_TOKEN');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new AppError(401, 'Compte introuvable', 'INVALID_TOKEN');

  req.user = await syncSubscription(user);
  next();
});

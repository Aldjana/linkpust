import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../utils/http.js';

export const notFound = (req, res, next) =>
  next(new AppError(404, 'Route introuvable', 'NOT_FOUND'));

// Format d'erreur uniforme : { error: { code, message, details? } }
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message;
  let details = err.details;

  if (err instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Données invalides';
    details = Object.fromEntries(err.issues.map((i) => [i.path.join('.') || '_', i.message]));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 404;
    code = 'NOT_FOUND';
    message = 'Ressource introuvable';
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Données invalides';
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  } else if (err?.code === 11000) {
    status = 409;
    code = 'DUPLICATE';
    message = 'Cette valeur existe déjà';
  } else if (!err.status) {
    console.error(err);
    status = 500;
    message = env.nodeEnv === 'production' ? 'Erreur interne du serveur' : err.message;
  }

  res.status(status).json({ error: { code, message, details } });
}

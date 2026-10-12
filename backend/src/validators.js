import { z } from 'zod';
import { THEMES } from './utils/plans.js';

const email = z.string().trim().toLowerCase().email('Email invalide');

const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/, '3 à 30 caractères : lettres, chiffres ou _');

const password = z.string().min(8, '8 caractères minimum').max(72, '72 caractères maximum');

// Ajoute https:// si aucun schéma n'est fourni, n'autorise que http(s)
const httpUrl = z
  .string()
  .trim()
  .min(1, 'URL requise')
  .max(2048, 'URL trop longue')
  .transform((value) => (/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`))
  .refine((value) => {
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, 'URL invalide (http ou https uniquement)');

export const registerSchema = z.object({
  email,
  username,
  password,
  displayName: z.string().trim().max(60).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Mot de passe requis'),
});

export const usernameQuerySchema = z.object({ username });

export const createLinkSchema = z.object({
  title: z.string().trim().min(1, 'Titre requis').max(80, '80 caractères maximum'),
  url: httpUrl,
});

export const updateLinkSchema = z
  .object({
    title: z.string().trim().min(1, 'Titre requis').max(80, '80 caractères maximum').optional(),
    url: httpUrl.optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Aucune modification fournie');

export const reorderSchema = z.object({
  ids: z.array(z.string().regex(/^[a-f\d]{24}$/i, 'Identifiant invalide')).max(500),
});

export const analyticsQuerySchema = z.object({
  days: z.preprocess(
    (value) => (value === undefined || value === '' ? 7 : value),
    z.coerce
      .number()
      .int()
      .refine((value) => [7, 30, 90].includes(value), 'days doit valoir 7, 30 ou 90')
  ),
});

export const profileSchema = z.object({
  displayName: z.string().trim().max(60, '60 caractères maximum').optional(),
  bio: z.string().trim().max(160, '160 caractères maximum').optional(),
  avatarUrl: z.union([z.literal(''), httpUrl]).optional(),
  theme: z.enum(Object.keys(THEMES)).optional(),
});

export const checkoutSchema = z.object({
  plan: z.literal('pro'),
  card: z.object({
    number: z.string().trim().min(12, 'Numéro de carte invalide').max(23, 'Numéro de carte invalide'),
    expiry: z.string().trim().regex(/^\d{2}\s?\/\s?\d{2}$/, 'Format attendu : MM/AA'),
    cvc: z.string().trim().regex(/^\d{3,4}$/, 'CVC invalide'),
  }),
});

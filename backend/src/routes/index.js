import { Router } from 'express';
import { env } from '../config/env.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, clickLimiter } from '../middleware/rateLimit.js';
import {
  analyticsQuerySchema,
  checkoutSchema,
  createLinkSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  reorderSchema,
  updateLinkSchema,
  usernameQuerySchema,
} from '../validators.js';
import * as auth from '../controllers/auth.controller.js';
import * as links from '../controllers/links.controller.js';
import * as pub from '../controllers/public.controller.js';
import * as analytics from '../controllers/analytics.controller.js';
import * as billing from '../controllers/billing.controller.js';
import * as profile from '../controllers/profile.controller.js';

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

// --- Zone publique (sans compte) ---
router.get('/public/:username', pub.getPublicPage);
router.get('/r/:id', clickLimiter, pub.redirectLink);

// --- Authentification ---
router.post('/auth/register', authLimiter, validate(registerSchema), auth.register);
router.post('/auth/login', authLimiter, validate(loginSchema), auth.login);
router.get('/auth/username-available', validate(usernameQuerySchema, 'query'), auth.usernameAvailable);
router.get('/auth/me', protect, auth.me);

// --- App privée (JWT requis) ---
router.use(['/links', '/analytics', '/profile', '/billing'], protect);

router.get('/links', links.listLinks);
router.post('/links', validate(createLinkSchema), links.createLink);
router.put('/links/reorder', validate(reorderSchema), links.reorderLinks); // avant /links/:id
router.patch('/links/:id', validate(updateLinkSchema), links.updateLink);
router.delete('/links/:id', links.deleteLink);

router.get('/analytics', validate(analyticsQuerySchema, 'query'), analytics.getAnalytics);

router.patch('/profile', validate(profileSchema), profile.updateProfile);

router.get('/billing', billing.getBilling);
router.post('/billing/checkout', validate(checkoutSchema), billing.checkout);
router.post('/billing/cancel', billing.cancel);
router.post('/billing/resume', billing.resume);
if (env.nodeEnv !== 'production') router.post('/billing/dev/expire', billing.devExpire);

export default router;

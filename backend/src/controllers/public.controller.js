import Link from '../models/Link.js';
import Click from '../models/Click.js';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../utils/http.js';
import { getLimits, resolveTheme } from '../utils/plans.js';
import { publishedLinks } from '../utils/visibility.js';
import { syncSubscription } from '../services/subscription.js';

const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|curl|wget|python-requests|httpclient/i;

function detectDevice(userAgent = '') {
  if (!userAgent) return 'other';
  if (/ipad|tablet|(android(?!.*mobile))/i.test(userAgent)) return 'tablet';
  if (/mobi|iphone|android/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

// Source du trafic : hostname du site d'où vient le visiteur, transmis par le frontend (?src=)
function detectSource(raw) {
  const value = String(raw || '').toLowerCase().replace(/^www\./, '').slice(0, 60);
  return /^[a-z0-9.-]+$/.test(value) ? value : 'direct';
}

// Pays fourni par le CDN/hébergeur s'il est présent (Vercel, Cloudflare), sinon inconnu
function detectCountry(headers) {
  const value = String(headers['x-vercel-ip-country'] || headers['cf-ipcountry'] || '').toUpperCase();
  return /^[A-Z]{2}$/.test(value) ? value : null;
}

// GET /api/public/:username — page publique, sans authentification
export const getPublicPage = asyncHandler(async (req, res) => {
  const username = String(req.params.username).toLowerCase().replace(/^@/, '');
  const found = await User.findOne({ username });
  if (!found) throw new AppError(404, "Cette page n'existe pas", 'PAGE_NOT_FOUND');

  const owner = await syncSubscription(found);
  const links = await Link.find({ user: owner._id, active: true }).sort({ order: 1, createdAt: 1 });

  // L'URL de destination n'est pas exposée : le visiteur passe par /api/r/:id, qui enregistre le clic puis redirige.
  res.json({
    profile: {
      username: owner.username,
      displayName: owner.displayName || owner.username,
      bio: owner.bio,
      avatarUrl: owner.avatarUrl,
      theme: resolveTheme(owner),
    },
    links: publishedLinks(links, owner.plan).map((link) => ({ id: link.id, title: link.title })),
    showBadge: getLimits(owner.plan).badge,
  });
});

// GET /api/r/:id — enregistre le clic puis redirige (302) vers la destination
export const redirectLink = asyncHandler(async (req, res) => {
  const link = await Link.findById(req.params.id);
  if (!link || !link.active) throw new AppError(404, 'Lien introuvable', 'NOT_FOUND');

  const found = await User.findById(link.user);
  if (!found) throw new AppError(404, 'Lien introuvable', 'NOT_FOUND');
  const owner = await syncSubscription(found);

  // Un lien masqué par la limite du plan Free ne doit ni rediriger ni compter
  if (getLimits(owner.plan).maxLinks !== null) {
    const active = await Link.find({ user: owner._id, active: true })
      .sort({ order: 1, createdAt: 1 })
      .select('_id active');
    const isPublished = publishedLinks(active, owner.plan).some((l) => l.id === link.id);
    if (!isPublished) throw new AppError(404, 'Lien introuvable', 'NOT_FOUND');
  }

  const userAgent = req.get('user-agent') || '';
  if (!BOT_PATTERN.test(userAgent) && req.method === 'GET') {
    Click.create({
      link: link._id,
      user: owner._id,
      device: detectDevice(userAgent),
      source: detectSource(req.query.src),
      country: detectCountry(req.headers),
    }).catch((error) => console.error('Enregistrement du clic impossible :', error.message));
  }

  res.set('Cache-Control', 'no-store');
  res.redirect(302, link.url);
});

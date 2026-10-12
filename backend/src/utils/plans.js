// Source unique de vérité pour les règles métier des plans.

export const PERIOD_DAYS = 30; // durée d'une période de facturation
export const CLICK_RETENTION_DAYS = 91; // les clics au-delà de 90 jours sont purgés (TTL Mongo)

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'EUR',
    limits: { maxLinks: 5, analyticsDays: 7, badge: true, customThemes: false },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 9,
    currency: 'EUR',
    limits: { maxLinks: null, analyticsDays: 90, badge: false, customThemes: true },
  },
};

export const getLimits = (plan) => (PLANS[plan] ?? PLANS.free).limits;

// pro: true => thème réservé au plan Pro
export const THEMES = {
  default: { pro: false },
  midnight: { pro: true },
  sunset: { pro: true },
  ocean: { pro: true },
  forest: { pro: true },
  mono: { pro: true },
};

// Thème réellement affiché : un utilisateur redescendu en Free retrouve le thème par défaut
// (son choix est conservé en base et revient s'il repasse Pro).
export function resolveTheme(user) {
  const theme = THEMES[user.theme];
  if (!theme) return 'default';
  if (theme.pro && !getLimits(user.plan).customThemes) return 'default';
  return user.theme;
}

export const RESERVED_USERNAMES = new Set([
  'admin', 'api', 'app', 'login', 'register', 'signup', 'signin', 'logout', 'pricing',
  'dashboard', 'settings', 'r', 'static', 'assets', 'linkpulse', 'support', 'help',
  'about', 'terms', 'privacy', 'billing', 'analytics', 'profile', 'links', 'me', 'root',
]);

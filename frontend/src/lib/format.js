const PUBLIC_BASE = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/$/, '');

export const publicUrl = (username) => `${PUBLIC_BASE}/@${username}`;
export const publicLabel = (username) => `${PUBLIC_BASE.replace(/^https?:\/\//, '')}/@${username}`;

export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

export const formatShortDate = (isoDate) =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

export const formatPrice = (amount, currency = 'EUR') =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);

export const formatNumber = (n) => new Intl.NumberFormat('fr-FR').format(n);

export const DEVICE_LABELS = { mobile: 'Mobile', tablet: 'Tablette', desktop: 'Ordinateur', other: 'Autre' };

const countryNames = (() => {
  try {
    return new Intl.DisplayNames(['fr'], { type: 'region' });
  } catch {
    return null;
  }
})();
export const countryLabel = (code) => {
  if (!code || code === 'Inconnu') return 'Inconnu';
  try {
    return countryNames?.of(code) ?? code;
  } catch {
    return code;
  }
};

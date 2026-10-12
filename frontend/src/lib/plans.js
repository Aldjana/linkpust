// Présentation des plans. Les règles réellement appliquées vivent côté backend (backend/src/utils/plans.js).
export const PRO_PRICE = 9; // € / mois — garder en phase avec PLANS.pro.price côté backend

export const FEATURES = {
  free: [
    '5 liens maximum',
    'Statistiques sur 7 jours',
    'Badge LinkPulse sur votre page',
    'Thème par défaut',
  ],
  pro: [
    'Liens illimités',
    'Statistiques sur 90 jours',
    'Badge LinkPulse retiré',
    'Thèmes personnalisés',
  ],
};

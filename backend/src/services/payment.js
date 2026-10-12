import { randomBytes } from 'node:crypto';

// Simulation contrôlée d'un prestataire de paiement (façon Stripe en mode test).
// Pour brancher le vrai Stripe, il suffit de remplacer `charge` en gardant le même contrat de retour :
//   { ok: true, last4, reference }  ou  { ok: false, last4, code, message }
//
// Cartes de test :
//   4242 4242 4242 4242  -> paiement accepté (toute carte valide Luhn est acceptée)
//   4000 0000 0000 0002  -> refusée
//   4000 0000 0000 9995  -> fonds insuffisants
//   4000 0000 0000 0069  -> carte expirée

const SCENARIOS = {
  '4000000000000002': { code: 'card_declined', message: 'Carte refusée par la banque.' },
  '4000000000009995': { code: 'insufficient_funds', message: 'Fonds insuffisants.' },
  '4000000000000069': { code: 'expired_card', message: 'Carte expirée.' },
};

function luhnValid(number) {
  let sum = 0;
  let double = false;
  for (let i = number.length - 1; i >= 0; i -= 1) {
    let digit = Number(number[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

function isExpired(expiry) {
  const [month, year] = expiry.split('/').map((part) => parseInt(part.trim(), 10));
  if (!(month >= 1 && month <= 12)) return true;
  const firstDayAfterExpiry = new Date(Date.UTC(2000 + year, month, 1));
  return firstDayAfterExpiry <= new Date();
}

// eslint-disable-next-line no-unused-vars
export async function charge({ amount, currency, card }) {
  const number = card.number.replace(/[\s-]/g, '');
  const last4 = number.slice(-4);

  const scenario = SCENARIOS[number];
  if (scenario) return { ok: false, last4, ...scenario };

  if (!/^\d{13,19}$/.test(number) || !luhnValid(number)) {
    return { ok: false, last4, code: 'invalid_number', message: 'Numéro de carte invalide.' };
  }
  if (isExpired(card.expiry)) {
    return { ok: false, last4, code: 'expired_card', message: 'Carte expirée.' };
  }

  return { ok: true, last4, reference: `mock_${randomBytes(8).toString('hex')}` };
}

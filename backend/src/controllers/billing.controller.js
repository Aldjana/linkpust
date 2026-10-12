import User from '../models/User.js';
import Payment from '../models/Payment.js';
import { AppError, asyncHandler } from '../utils/http.js';
import { addDays } from '../utils/dates.js';
import { PERIOD_DAYS, PLANS } from '../utils/plans.js';
import { serializePayment, serializeUser } from '../utils/serializers.js';
import { charge } from '../services/payment.js';
import { syncSubscription } from '../services/subscription.js';

// GET /api/billing — état de l'abonnement, catalogue des plans, historique
export const getBilling = asyncHandler(async (req, res) => {
  const { user } = req;
  const payments = await Payment.find({ user: user._id }).sort({ createdAt: -1 }).limit(20);
  res.json({
    user: serializeUser(user),
    plans: Object.values(PLANS),
    periodDays: PERIOD_DAYS,
    payments: payments.map(serializePayment),
  });
});

// POST /api/billing/checkout — upgrade Free -> Pro (paiement simulé côté backend)
export const checkout = asyncHandler(async (req, res) => {
  const { user } = req;

  if (user.plan === 'pro') {
    throw new AppError(
      409,
      user.cancelAtPeriodEnd
        ? 'Votre abonnement Pro est en cours de résiliation : reprenez-le plutôt que de payer à nouveau.'
        : 'Vous êtes déjà abonné au plan Pro.',
      'ALREADY_PRO'
    );
  }

  const { price, currency } = PLANS.pro;
  const result = await charge({ amount: price, currency, card: req.body.card });

  await Payment.create({
    user: user._id,
    type: 'upgrade',
    plan: 'pro',
    amount: price,
    currency,
    status: result.ok ? 'succeeded' : 'failed',
    reference: result.reference ?? null,
    cardLast4: result.last4,
    failureCode: result.code ?? null,
    failureMessage: result.message ?? null,
  });

  if (!result.ok) throw new AppError(402, result.message, result.code);

  // Condition plan:'free' : protège contre un double clic / deux onglets
  const updated = await User.findOneAndUpdate(
    { _id: user._id, plan: 'free' },
    { $set: { plan: 'pro', currentPeriodEnd: addDays(new Date(), PERIOD_DAYS), cancelAtPeriodEnd: false } },
    { new: true }
  );
  if (!updated) throw new AppError(409, 'Vous êtes déjà abonné au plan Pro.', 'ALREADY_PRO');

  res.json({ user: serializeUser(updated) });
});

// POST /api/billing/cancel — downgrade programmé : Pro conservé jusqu'à la fin de la période payée
export const cancel = asyncHandler(async (req, res) => {
  const { user } = req;
  if (user.plan !== 'pro') throw new AppError(409, "Vous n'avez pas d'abonnement actif.", 'NOT_PRO');
  if (user.cancelAtPeriodEnd) {
    throw new AppError(409, 'La résiliation est déjà programmée.', 'ALREADY_CANCELING');
  }

  user.cancelAtPeriodEnd = true;
  await user.save();
  res.json({ user: serializeUser(user) });
});

// POST /api/billing/resume — annule la résiliation programmée
export const resume = asyncHandler(async (req, res) => {
  const { user } = req;
  if (user.plan !== 'pro' || !user.cancelAtPeriodEnd) {
    throw new AppError(409, "Aucune résiliation à annuler.", 'NOT_CANCELING');
  }

  user.cancelAtPeriodEnd = false;
  await user.save();
  res.json({ user: serializeUser(user) });
});

// POST /api/billing/dev/expire — DEV UNIQUEMENT : force la fin de période pour tester renouvellement / downgrade
export const devExpire = asyncHandler(async (req, res) => {
  const { user } = req;
  if (user.plan !== 'pro') throw new AppError(409, "Vous n'avez pas d'abonnement actif.", 'NOT_PRO');

  user.currentPeriodEnd = new Date(Date.now() - 1000);
  await user.save();
  const synced = await syncSubscription(user);
  res.json({ user: serializeUser(synced) });
});

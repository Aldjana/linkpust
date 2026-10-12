import User from '../models/User.js';
import Payment from '../models/Payment.js';
import { addDays } from '../utils/dates.js';
import { PERIOD_DAYS, PLANS } from '../utils/plans.js';

// Applique l'échéance de la période d'abonnement si elle est dépassée :
//  - résiliation programmée (cancelAtPeriodEnd) -> downgrade Pro => Free
//  - sinon -> renouvellement automatique (simulé) pour une nouvelle période
// Appelée à chaque requête authentifiée et à chaque lecture de page publique, ce qui évite d'avoir besoin d'un cron
// pour le MVP. En production avec Stripe, ce rôle revient aux webhooks.
// Les mises à jour sont conditionnelles (filtre sur currentPeriodEnd) : deux requêtes simultanées ne facturent pas deux fois.
// Retourne toujours un document User à jour.
export async function syncSubscription(user) {
  const expired =
    user.plan === 'pro' && user.currentPeriodEnd && user.currentPeriodEnd <= new Date();
  if (!expired) return user;

  const guard = { _id: user._id, plan: 'pro', currentPeriodEnd: user.currentPeriodEnd };

  if (user.cancelAtPeriodEnd) {
    const downgraded = await User.findOneAndUpdate(
      guard,
      { $set: { plan: 'free', currentPeriodEnd: null, cancelAtPeriodEnd: false } },
      { new: true }
    );
    return downgraded ?? (await User.findById(user._id));
  }

  const renewed = await User.findOneAndUpdate(
    guard,
    { $set: { currentPeriodEnd: addDays(new Date(), PERIOD_DAYS) } },
    { new: true }
  );
  if (renewed) {
    await Payment.create({
      user: user._id,
      type: 'renewal',
      plan: 'pro',
      amount: PLANS.pro.price,
      currency: PLANS.pro.currency,
      status: 'succeeded',
      provider: 'mock',
      reference: `mock_renew_${Date.now().toString(36)}`,
    });
  }
  return renewed ?? (await User.findById(user._id));
}

import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { FEATURES } from '../lib/plans.js';
import { formatDate, formatDateTime, formatPrice } from '../lib/format.js';
import { Alert, Button, Card, PageLoader, PlanBadge } from '../components/ui.jsx';
import { Icon } from '../components/icons.jsx';

function PlanCard({ plan, price, current }) {
  const features = FEATURES[plan];
  return (
    <Card className={`p-5 ${current ? 'border-brand-500 ring-1 ring-brand-500' : ''}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold capitalize">{plan}</h3>
        {current && <span className="text-xs font-semibold text-brand-700">Votre plan</span>}
      </div>
      <p className="mt-1 text-2xl font-extrabold">
        {formatPrice(price)} <span className="text-sm font-medium text-slate-500">/ mois</span>
      </p>
      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <Icon name="check" className="h-4 w-4 shrink-0 text-brand-600" /> {feature}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function Billing() {
  const { user, setUser } = useAuth();
  const { openUpgrade } = useOutletContext();
  const toast = useToast();
  const [billing, setBilling] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setBilling(await api.get('/billing'));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Recharge après un upgrade effectué depuis la modale (le plan de l'utilisateur change)
  useEffect(() => {
    load();
  }, [load, user.plan, user.cancelAtPeriodEnd]);

  if (error && !billing) return <Alert type="error">{error}</Alert>;
  if (!billing) return <PageLoader />;

  const proPrice = billing.plans.find((p) => p.id === 'pro')?.price ?? 9;
  const isPro = user.plan === 'pro';

  async function run(path, successMessage) {
    setBusy(true);
    try {
      const data = await api.post(path);
      setUser(data.user);
      toast.success(typeof successMessage === 'function' ? successMessage(data.user) : successMessage);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    const ok = window.confirm(
      `Résilier l'abonnement ? Vous gardez Pro jusqu'au ${formatDate(user.currentPeriodEnd)}, puis votre compte repasse en Free : ` +
        'liens limités à 5 (les autres sont masqués, pas supprimés), badge LinkPulse affiché, statistiques sur 7 jours.'
    );
    if (ok) run('/billing/cancel', 'Résiliation programmée');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Abonnement</h1>
        <p className="text-sm text-slate-500">Gérez votre plan et consultez vos paiements.</p>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">Plan actuel</h2>
              <PlanBadge plan={user.plan} />
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {!isPro && 'Vous utilisez la version gratuite de LinkPulse.'}
              {isPro && !user.cancelAtPeriodEnd && `Prochain renouvellement le ${formatDate(user.currentPeriodEnd)}.`}
              {isPro && user.cancelAtPeriodEnd && `Se termine le ${formatDate(user.currentPeriodEnd)}.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isPro && <Button onClick={() => openUpgrade()}>Passer à Pro — {formatPrice(proPrice)}/mois</Button>}
            {isPro && !user.cancelAtPeriodEnd && (
              <Button variant="dangerOutline" onClick={cancel} loading={busy}>
                Résilier l'abonnement
              </Button>
            )}
            {isPro && user.cancelAtPeriodEnd && (
              <Button onClick={() => run('/billing/resume', 'Abonnement repris')} loading={busy}>
                Reprendre l'abonnement
              </Button>
            )}
          </div>
        </div>

        {isPro && user.cancelAtPeriodEnd && (
          <div className="mt-4">
            <Alert type="warning">
              Résiliation programmée : le {formatDate(user.currentPeriodEnd)}, votre compte repassera en Free (5 liens
              visibles, badge LinkPulse, statistiques sur 7 jours, thème par défaut). Vos liens et votre historique sont
              conservés et reviennent si vous reprenez Pro.
            </Alert>
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <PlanCard plan="free" price={0} current={!isPro} />
        <PlanCard plan="pro" price={proPrice} current={isPro} />
      </div>

      <Card>
        <h2 className="border-b border-slate-200 p-4 text-sm font-semibold">Historique des paiements</h2>
        {billing.payments.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Aucun paiement pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 font-medium">Montant</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billing.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="whitespace-nowrap px-4 py-2.5">{formatDateTime(payment.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      {payment.type === 'renewal' ? 'Renouvellement Pro' : 'Abonnement Pro'}
                      {payment.cardLast4 && <span className="text-slate-500"> · •••• {payment.cardLast4}</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">{formatPrice(payment.amount, payment.currency)}</td>
                    <td className="px-4 py-2.5">
                      {payment.status === 'succeeded' ? (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800">
                          Payé
                        </span>
                      ) : (
                        <span
                          className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700"
                          title={payment.failureMessage || ''}
                        >
                          Échoué
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {import.meta.env.DEV && isPro && (
        <Card className="border-dashed p-4">
          <p className="text-sm font-semibold">Outil de développement</p>
          <p className="mt-1 text-xs text-slate-500">
            Force la fin de la période en cours pour tester le renouvellement automatique (ou le downgrade si la
            résiliation est programmée).
          </p>
          <Button
            variant="secondary"
            className="mt-3"
            loading={busy}
            onClick={() =>
              run('/billing/dev/expire', (u) =>
                u.plan === 'free' ? 'Période terminée : retour au plan Free' : 'Période terminée : abonnement renouvelé'
              )
            }
          >
            Simuler la fin de période
          </Button>
        </Card>
      )}
    </div>
  );
}

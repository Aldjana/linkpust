import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import BarChart from '../components/BarChart.jsx';
import { Alert, Button, Card, PageLoader } from '../components/ui.jsx';
import { Icon } from '../components/icons.jsx';
import { DEVICE_LABELS, countryLabel, formatNumber, formatShortDate, publicLabel } from '../lib/format.js';

const RANGES = [7, 30, 90];

function Stat({ label, value, hint }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-2xl font-bold">{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

function Breakdown({ title, rows, format = (label) => label }) {
  const total = rows.reduce((sum, row) => sum + row.clicks, 0);
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Pas encore de données.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.map((row) => {
            const pct = total ? Math.round((row.clicks / total) * 100) : 0;
            return (
              <li key={row.label}>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="truncate">{format(row.label)}</span>
                  <span className="shrink-0 text-slate-500">
                    {formatNumber(row.clicks)} · {pct}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const { openUpgrade } = useOutletContext();
  const maxDays = user.limits.analyticsDays;
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Si le plan change (upgrade / downgrade), on revient sur une fenêtre autorisée
  useEffect(() => {
    setDays((d) => Math.min(d, maxDays));
  }, [maxDays]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/analytics?days=${days}`)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError('');
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [days, user.plan]);

  function selectRange(range) {
    if (range > maxDays) {
      openUpgrade(`L'historique de ${range} jours est réservé au plan Pro (Free : ${maxDays} jours).`);
      return;
    }
    setDays(range);
  }

  const best = data ? data.series.reduce((a, b) => (b.clicks > a.clicks ? b : a), data.series[0]) : null;
  const average = data ? data.total / data.range.days : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Statistiques</h1>
          <p className="text-sm text-slate-500">Les clics sur les liens de votre page, en temps réel.</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1" role="group" aria-label="Période">
          {RANGES.map((range) => {
            const locked = range > maxDays;
            const active = range === days;
            return (
              <button
                key={range}
                onClick={() => selectRange(range)}
                aria-pressed={active}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {range} j {locked && <Icon name="lock" className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {!data && loading && <PageLoader />}

      {data && (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat label="Clics" value={formatNumber(data.total)} hint={`sur ${data.range.days} jours`} />
              <Stat label="Moyenne" value={`${average.toFixed(1).replace('.', ',')} / jour`} />
              <Stat
                label="Meilleur jour"
                value={best && best.clicks > 0 ? formatNumber(best.clicks) : '—'}
                hint={best && best.clicks > 0 ? formatShortDate(best.date) : undefined}
              />
              <Stat
                label="Lien n°1"
                value={data.topLinks[0]?.title ?? '—'}
                hint={data.topLinks[0] ? `${formatNumber(data.topLinks[0].clicks)} clics` : undefined}
              />
            </div>

            <Card className="p-4 sm:p-6">
              <h2 className="mb-4 text-sm font-semibold">Clics par jour</h2>
              <BarChart data={data.series} />
              {data.total === 0 && (
                <p className="mt-4 text-sm text-slate-500">
                  Aucun clic sur cette période. Partagez votre page :{' '}
                  <span className="font-semibold text-slate-700">{publicLabel(user.username)}</span>
                </p>
              )}
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-4">
                <h3 className="text-sm font-semibold">Liens les plus cliqués</h3>
                {data.topLinks.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">Pas encore de données.</p>
                ) : (
                  <ol className="mt-3 space-y-3">
                    {data.topLinks.map((link, index) => (
                      <li key={link.id}>
                        <div className="flex justify-between gap-2 text-sm">
                          <span className="truncate">
                            <span className="mr-2 text-slate-400">{index + 1}.</span>
                            {link.title}
                          </span>
                          <span className="shrink-0 font-medium">{formatNumber(link.clicks)}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{ width: `${(link.clicks / data.topLinks[0].clicks) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
              <Breakdown title="Appareils" rows={data.devices} format={(label) => DEVICE_LABELS[label] ?? label} />
              <Breakdown
                title="Sources de trafic"
                rows={data.sources}
                format={(label) => (label === 'direct' ? 'Direct / inconnu' : label)}
              />
              <Breakdown title="Pays" rows={data.countries} format={countryLabel} />
            </div>

            {user.plan === 'free' && (
              <Card className="flex flex-wrap items-center justify-between gap-3 border-brand-200 bg-brand-50 p-4">
                <p className="text-sm text-brand-900">
                  <strong>Plan Free :</strong> statistiques limitées aux {maxDays} derniers jours. Avec Pro, remontez
                  jusqu'à 90 jours.
                </p>
                <Button onClick={() => openUpgrade()}>Passer à Pro</Button>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

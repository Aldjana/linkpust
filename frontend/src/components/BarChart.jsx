import { formatNumber, formatShortDate } from '../lib/format.js';

// Histogramme léger sans dépendance. data: [{ date: 'YYYY-MM-DD', clicks }]
export default function BarChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.clicks));
  const gap = data.length > 40 ? 'gap-px' : data.length > 14 ? 'gap-1' : 'gap-2';
  const last = data.length - 1;
  const labelIndexes = new Set([0, Math.floor(last / 2), last]);

  return (
    <div role="img" aria-label={`Clics par jour sur ${data.length} jours`}>
      <div className={`flex h-48 items-end ${gap}`}>
        {data.map((d) => (
          <div key={d.date} className="group relative flex h-full flex-1 items-end">
            <div
              className={`w-full rounded-t ${d.clicks ? 'bg-brand-500 group-hover:bg-brand-600' : 'bg-slate-200'}`}
              style={{ height: `${d.clicks ? Math.max(4, (d.clicks / max) * 100) : 2}%` }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white group-hover:block">
              {formatShortDate(d.date)} · {formatNumber(d.clicks)} clic{d.clicks > 1 ? 's' : ''}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        {data.map((d, i) =>
          labelIndexes.has(i) ? <span key={d.date}>{formatShortDate(d.date)}</span> : null
        )}
      </div>
    </div>
  );
}

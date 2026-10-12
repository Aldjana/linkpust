import Click from '../models/Click.js';
import Link from '../models/Link.js';
import { asyncHandler } from '../utils/http.js';
import { getLimits } from '../utils/plans.js';
import { DAY_MS, startOfUtcDay } from '../utils/dates.js';

const group = (field, limit = 8) => [
  { $group: { _id: field, n: { $sum: 1 } } },
  { $sort: { n: -1 } },
  { $limit: limit },
];

// GET /api/analytics?days=7|30|90 — la fenêtre est plafonnée par le plan (Free 7 j, Pro 90 j)
export const getAnalytics = asyncHandler(async (req, res) => {
  const { user } = req;
  const requestedDays = req.query.days;
  const maxDays = getLimits(user.plan).analyticsDays;
  const days = Math.min(requestedDays, maxDays);

  // Fenêtre de `days` jours calendaires UTC, aujourd'hui inclus
  const since = new Date(startOfUtcDay(new Date()).getTime() - (days - 1) * DAY_MS);

  const [result] = await Click.aggregate([
    { $match: { user: user._id, createdAt: { $gte: since } } },
    {
      $facet: {
        total: [{ $count: 'n' }],
        daily: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              n: { $sum: 1 },
            },
          },
        ],
        byLink: group('$link', 10),
        byDevice: group('$device', 4),
        bySource: group('$source'),
        byCountry: group('$country'),
      },
    },
  ]);

  const perDay = new Map(result.daily.map((d) => [d._id, d.n]));
  const series = Array.from({ length: days }, (_, i) => {
    const date = new Date(since.getTime() + i * DAY_MS).toISOString().slice(0, 10);
    return { date, clicks: perDay.get(date) ?? 0 };
  });

  const links = await Link.find({ _id: { $in: result.byLink.map((l) => l._id) } }).select('title');
  const titles = new Map(links.map((l) => [l.id, l.title]));

  const labelled = (rows, fallback) =>
    rows.map((row) => ({ label: row._id ?? fallback, clicks: row.n }));

  res.json({
    range: {
      days,
      requestedDays,
      maxDays,
      since,
      upgradeRequired: requestedDays > maxDays,
    },
    total: result.total[0]?.n ?? 0,
    series,
    topLinks: result.byLink.map((row) => ({
      id: String(row._id),
      title: titles.get(String(row._id)) ?? 'Lien supprimé',
      clicks: row.n,
    })),
    devices: labelled(result.byDevice, 'other'),
    sources: labelled(result.bySource, 'direct'),
    countries: labelled(result.byCountry, 'Inconnu'),
  });
});

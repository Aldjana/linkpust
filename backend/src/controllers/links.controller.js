import Link from '../models/Link.js';
import Click from '../models/Click.js';
import { AppError, asyncHandler } from '../utils/http.js';
import { getLimits } from '../utils/plans.js';
import { DAY_MS } from '../utils/dates.js';
import { serializeLink } from '../utils/serializers.js';
import { publishedLinks } from '../utils/visibility.js';

const sortedLinks = (userId) => Link.find({ user: userId }).sort({ order: 1, createdAt: 1 });

export const listLinks = asyncHandler(async (req, res) => {
  const { user } = req;
  const links = await sortedLinks(user._id);

  // Clics des 7 derniers jours par lien (disponible pour tous les plans)
  const counts = await Click.aggregate([
    { $match: { user: user._id, createdAt: { $gte: new Date(Date.now() - 7 * DAY_MS) } } },
    { $group: { _id: '$link', n: { $sum: 1 } } },
  ]);
  const clicks7d = new Map(counts.map((c) => [String(c._id), c.n]));
  const published = new Set(publishedLinks(links, user.plan).map((l) => l.id));

  res.json({
    links: links.map((link) => ({
      ...serializeLink(link),
      clicks7d: clicks7d.get(link.id) ?? 0,
      published: published.has(link.id),
    })),
    limits: getLimits(user.plan),
  });
});

export const createLink = asyncHandler(async (req, res) => {
  const { user } = req;
  const { maxLinks } = getLimits(user.plan);

  const count = await Link.countDocuments({ user: user._id });
  if (maxLinks !== null && count >= maxLinks) {
    throw new AppError(
      403,
      `Le plan Free est limité à ${maxLinks} liens. Passez à Pro pour des liens illimités.`,
      'PLAN_LIMIT'
    );
  }

  const last = await Link.findOne({ user: user._id }).sort({ order: -1 }).select('order');
  const link = await Link.create({
    user: user._id,
    title: req.body.title,
    url: req.body.url,
    order: (last?.order ?? -1) + 1,
  });

  res.status(201).json({ link: serializeLink(link) });
});

export const updateLink = asyncHandler(async (req, res) => {
  const link = await Link.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!link) throw new AppError(404, 'Lien introuvable', 'NOT_FOUND');
  res.json({ link: serializeLink(link) });
});

export const deleteLink = asyncHandler(async (req, res) => {
  const link = await Link.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!link) throw new AppError(404, 'Lien introuvable', 'NOT_FOUND');
  res.status(204).end();
});

// Reçoit la liste complète des ids dans le nouvel ordre
export const reorderLinks = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  const userId = req.user._id;

  const total = await Link.countDocuments({ user: userId });
  const owned = await Link.countDocuments({ user: userId, _id: { $in: ids } });
  if (new Set(ids).size !== ids.length || ids.length !== total || owned !== total) {
    throw new AppError(400, 'La liste doit contenir exactement tous vos liens', 'INVALID_ORDER');
  }

  await Link.bulkWrite(
    ids.map((id, index) => ({
      updateOne: { filter: { _id: id, user: userId }, update: { $set: { order: index } } },
    }))
  );

  res.json({ ok: true });
});

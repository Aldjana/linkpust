import { getLimits, resolveTheme } from './plans.js';

export const serializeUser = (user) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  displayName: user.displayName,
  bio: user.bio,
  avatarUrl: user.avatarUrl,
  theme: user.theme,
  activeTheme: resolveTheme(user),
  plan: user.plan,
  limits: getLimits(user.plan),
  currentPeriodEnd: user.currentPeriodEnd,
  cancelAtPeriodEnd: user.cancelAtPeriodEnd,
  createdAt: user.createdAt,
});

export const serializeLink = (link) => ({
  id: link.id,
  title: link.title,
  url: link.url,
  active: link.active,
  order: link.order,
  createdAt: link.createdAt,
});

export const serializePayment = (payment) => ({
  id: payment.id,
  type: payment.type,
  plan: payment.plan,
  amount: payment.amount,
  currency: payment.currency,
  status: payment.status,
  reference: payment.reference,
  cardLast4: payment.cardLast4,
  failureMessage: payment.failureMessage,
  createdAt: payment.createdAt,
});

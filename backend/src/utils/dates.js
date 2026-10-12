export const DAY_MS = 86_400_000;

export const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

export const startOfUtcDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

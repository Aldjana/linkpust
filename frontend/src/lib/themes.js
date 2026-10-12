// Les clés doivent correspondre à THEMES côté backend (backend/src/utils/plans.js).
// Les classes sont écrites en entier pour que Tailwind les détecte.
export const THEMES = {
  default: {
    label: 'Clair',
    pro: false,
    page: 'bg-slate-100 text-slate-900',
    link: 'bg-white text-slate-900 border border-slate-200 hover:border-slate-900 hover:shadow-sm',
    muted: 'text-slate-500',
    ring: 'ring-white',
    swatch: 'bg-gradient-to-br from-white to-slate-200',
  },
  midnight: {
    label: 'Minuit',
    pro: true,
    page: 'bg-slate-950 text-white',
    link: 'bg-white/10 text-white border border-white/15 hover:bg-white/20',
    muted: 'text-slate-400',
    ring: 'ring-slate-800',
    swatch: 'bg-gradient-to-br from-slate-900 to-slate-700',
  },
  sunset: {
    label: 'Coucher de soleil',
    pro: true,
    page: 'bg-gradient-to-b from-orange-400 via-rose-500 to-fuchsia-600 text-white',
    link: 'bg-white/20 text-white border border-white/30 backdrop-blur hover:bg-white/30',
    muted: 'text-white/80',
    ring: 'ring-white/40',
    swatch: 'bg-gradient-to-br from-orange-400 to-fuchsia-600',
  },
  ocean: {
    label: 'Océan',
    pro: true,
    page: 'bg-gradient-to-b from-sky-500 to-indigo-700 text-white',
    link: 'bg-white/15 text-white border border-white/30 backdrop-blur hover:bg-white/25',
    muted: 'text-white/80',
    ring: 'ring-white/40',
    swatch: 'bg-gradient-to-br from-sky-400 to-indigo-700',
  },
  forest: {
    label: 'Forêt',
    pro: true,
    page: 'bg-emerald-950 text-emerald-50',
    link: 'bg-emerald-800/60 text-emerald-50 border border-emerald-600/40 hover:bg-emerald-700/70',
    muted: 'text-emerald-200/80',
    ring: 'ring-emerald-800',
    swatch: 'bg-gradient-to-br from-emerald-700 to-emerald-950',
  },
  mono: {
    label: 'Monochrome',
    pro: true,
    page: 'bg-white text-black',
    link: 'bg-black text-white hover:bg-neutral-700',
    muted: 'text-neutral-500',
    ring: 'ring-neutral-200',
    swatch: 'bg-gradient-to-br from-white to-neutral-900',
  },
};

export const getTheme = (key) => THEMES[key] ?? THEMES.default;

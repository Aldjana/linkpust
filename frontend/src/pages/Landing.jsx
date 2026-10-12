import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon, Logo } from '../components/icons.jsx';
import { FEATURES, PRO_PRICE } from '../lib/plans.js';
import { formatPrice } from '../lib/format.js';

const STEPS = [
  { title: 'Créez votre page', text: 'Choisissez votre @nom : votre page est en ligne en 30 secondes.' },
  { title: 'Ajoutez vos liens', text: 'Réseaux, boutique, portfolio, agenda… réorganisez-les d’un clic.' },
  { title: 'Partagez et mesurez', text: 'Un seul lien dans votre bio, et vous voyez ce qui est vraiment cliqué.' },
];

function PhoneMock() {
  const items = ['Ma dernière vidéo', 'Boutique', 'Réserver un appel', 'Newsletter'];
  return (
    <div className="mx-auto w-[260px] rounded-[2.2rem] border-8 border-slate-900 bg-slate-100 p-5 shadow-2xl">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-2xl font-bold text-white">
        A
      </div>
      <p className="mt-3 text-center font-bold">Awa Diop</p>
      <p className="text-center text-xs text-slate-500">@awa · Créatrice de contenu</p>
      <ul className="mt-5 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold">
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-lg bg-white p-3 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Clics cette semaine</p>
        <div className="mt-2 flex h-10 items-end gap-1">
          {[30, 45, 28, 60, 52, 80, 100].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-brand-500" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const cta = user ? { to: '/app/links', label: 'Mon tableau de bord' } : { to: '/register', label: 'Créer ma page gratuitement' };

  return (
    <div className="bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <Logo /> LinkPulse
        </Link>
        <nav className="flex items-center gap-2 text-sm font-semibold">
          {user ? (
            <Link to="/app/links" className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-700">
              Tableau de bord
            </Link>
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100">
                Connexion
              </Link>
              <Link to="/register" className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-700">
                Commencer
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 md:grid-cols-2 md:py-20">
        <div>
          <p className="mb-4 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
            Bio-link + analytics pour créateurs
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Un lien pour tout partager.
            <span className="text-brand-600"> Des stats pour savoir ce qui marche.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-slate-600">
            Influenceur, freelance, artiste : regroupez tous vos liens sur une page à votre nom et suivez chaque clic.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={cta.to}
              className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-700"
            >
              {cta.label}
            </Link>
            <a href="#tarifs" className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-bold hover:bg-slate-50">
              Voir les tarifs
            </a>
          </div>
        </div>
        <PhoneMock />
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-extrabold">Comment ça marche</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="tarifs" className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="text-center text-3xl font-extrabold">Des tarifs simples</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {[
            { id: 'free', name: 'Free', price: 0, highlight: false },
            { id: 'pro', name: 'Pro', price: PRO_PRICE, highlight: true },
          ].map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-7 ${plan.highlight ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-200'}`}
            >
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="mt-2 text-4xl font-extrabold">
                {formatPrice(plan.price)} <span className="text-base font-medium text-slate-500">/ mois</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {FEATURES[plan.id].map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Icon name="check" className="h-4 w-4 shrink-0 text-brand-600" /> {feature}
                  </li>
                ))}
              </ul>
              <Link
                to={user ? '/app/billing' : '/register'}
                className={`mt-8 block rounded-lg px-4 py-2.5 text-center text-sm font-bold ${
                  plan.highlight ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-slate-300 hover:bg-slate-50'
                }`}
              >
                {plan.highlight ? 'Choisir Pro' : 'Commencer gratuitement'}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} LinkPulse
      </footer>
    </div>
  );
}

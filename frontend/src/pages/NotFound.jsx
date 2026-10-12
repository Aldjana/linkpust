import { Link } from 'react-router-dom';
import { Logo } from '../components/icons.jsx';

export default function NotFound({ message = "Cette page n'existe pas." }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo className="h-12 w-12" />
      <h1 className="mt-6 text-4xl font-extrabold">404</h1>
      <p className="mt-2 text-slate-600">{message}</p>
      <Link to="/" className="mt-6 text-sm font-semibold text-brand-700 hover:underline">
        Retour à l'accueil LinkPulse
      </Link>
    </div>
  );
}

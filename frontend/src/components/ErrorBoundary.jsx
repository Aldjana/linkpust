import { Component } from 'react';
import { Logo } from './icons.jsx';

// Filet de sécurité : une erreur de rendu affiche un message au lieu d'une page blanche
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <Logo className="h-12 w-12" />
        <h1 className="mt-6 text-2xl font-extrabold">Oups, quelque chose s'est mal passé</h1>
        <p className="mt-2 text-slate-600">Rechargez la page. Si le problème persiste, réessayez plus tard.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Recharger la page
        </button>
      </div>
    );
  }
}

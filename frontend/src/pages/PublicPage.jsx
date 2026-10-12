import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import PublicProfileView from '../components/PublicProfileView.jsx';
import { PageLoader } from '../components/ui.jsx';
import NotFound from './NotFound.jsx';

// Source du trafic = site d'où vient le visiteur, transmise au backend lors du clic
function trafficSource() {
  try {
    const host = new URL(document.referrer).hostname;
    return host && host !== window.location.hostname ? host : 'direct';
  } catch {
    return 'direct';
  }
}

// Page publique /@username — accessible sans compte
export default function PublicPage() {
  const { handle } = useParams();
  const username = handle?.startsWith('@') ? handle.slice(1) : null;
  const [state, setState] = useState({ status: 'loading' });
  const source = useMemo(trafficSource, []);

  useEffect(() => {
    if (!username) return undefined;
    let cancelled = false;
    setState({ status: 'loading' });
    api
      .get(`/public/${encodeURIComponent(username)}`)
      .then((data) => !cancelled && setState({ status: 'ready', data }))
      .catch((err) => !cancelled && setState({ status: err.status === 404 ? 'notfound' : 'error', error: err }));
    return () => {
      cancelled = true;
    };
  }, [username]);

  useEffect(() => {
    if (state.status !== 'ready') return undefined;
    const { profile } = state.data;
    document.title = `${profile.displayName} (@${profile.username}) · LinkPulse`;
    return () => {
      document.title = 'LinkPulse — Vos liens, vos stats';
    };
  }, [state]);

  if (!username || state.status === 'notfound') return <NotFound message="Cette page n'existe pas (ou plus)." />;
  if (state.status === 'loading') return <PageLoader />;
  if (state.status === 'error') return <NotFound message={state.error.message} />;

  const { profile, links, showBadge } = state.data;
  return (
    <div className="min-h-screen">
      <PublicProfileView profile={profile} links={links} showBadge={showBadge} source={source} />
    </div>
  );
}

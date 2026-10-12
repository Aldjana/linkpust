import { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../lib/api.js';
import { getTheme } from '../lib/themes.js';
import { Logo } from './icons.jsx';

function Avatar({ profile, theme }) {
  const [failed, setFailed] = useState(false);
  const name = profile.displayName || profile.username;
  if (profile.avatarUrl && !failed) {
    return (
      <img
        src={profile.avatarUrl}
        alt={name}
        onError={() => setFailed(true)}
        className={`mx-auto h-24 w-24 rounded-full object-cover ring-4 ${theme.ring}`}
      />
    );
  }
  return (
    <div
      className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-black/10 text-3xl font-bold ring-4 ${theme.ring}`}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// Rendu de la page publique d'un créateur. Utilisé par /@username et par l'aperçu du dashboard.
// profile: { username, displayName, bio, avatarUrl, theme }, links: [{ id, title }]
export default function PublicProfileView({ profile, links, showBadge, preview = false, source = 'direct' }) {
  const theme = getTheme(profile.theme);
  const itemClass = `block w-full rounded-xl px-5 py-3.5 text-center text-sm font-semibold transition ${theme.link}`;

  return (
    <div className={`flex min-h-full flex-col items-center px-4 py-10 ${theme.page}`}>
      <main className="w-full max-w-md flex-1">
        <header className="text-center">
          <Avatar profile={profile} theme={theme} />
          <h1 className="mt-4 text-xl font-bold">{profile.displayName || profile.username}</h1>
          <p className={`text-sm ${theme.muted}`}>@{profile.username}</p>
          {profile.bio && <p className="mx-auto mt-3 max-w-xs whitespace-pre-line text-sm">{profile.bio}</p>}
        </header>

        {links.length > 0 ? (
          <ul className="mt-8 space-y-3">
            {links.map((link) => (
              <li key={link.id}>
                {preview ? (
                  <span className={itemClass}>{link.title}</span>
                ) : (
                  <a
                    href={`${API_BASE}/r/${link.id}?src=${encodeURIComponent(source)}`}
                    rel="noopener nofollow"
                    className={itemClass}
                  >
                    {link.title}
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={`mt-10 text-center text-sm ${theme.muted}`}>Aucun lien pour le moment.</p>
        )}
      </main>

      {showBadge && (
        <Link
          to="/"
          className={`mt-10 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${theme.link}`}
        >
          <Logo className="h-5 w-5" /> Créé avec LinkPulse
        </Link>
      )}
    </div>
  );
}

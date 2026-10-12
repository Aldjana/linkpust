import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { THEMES } from '../lib/themes.js';
import PublicProfileView from '../components/PublicProfileView.jsx';
import { Alert, Button, Card, Input, Textarea } from '../components/ui.jsx';
import { Icon } from '../components/icons.jsx';
import { publicLabel } from '../lib/format.js';

export default function Profile() {
  const { user, setUser } = useAuth();
  const { openUpgrade } = useOutletContext();
  const toast = useToast();
  const [form, setForm] = useState({
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    theme: user.theme,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [previewLinks, setPreviewLinks] = useState([]);

  // Liens réellement publiés, pour l'aperçu
  useEffect(() => {
    api
      .get('/links')
      .then((data) => setPreviewLinks(data.links.filter((l) => l.active && l.published).map((l) => ({ id: l.id, title: l.title }))))
      .catch(() => {});
  }, [user.plan]);

  const canUseCustomThemes = user.limits.customThemes;
  const previewTheme = THEMES[form.theme]?.pro && !canUseCustomThemes ? 'default' : form.theme;
  const dirty =
    form.displayName !== user.displayName ||
    form.bio !== user.bio ||
    form.avatarUrl !== user.avatarUrl ||
    form.theme !== user.theme;

  function pickTheme(key) {
    if (THEMES[key].pro && !canUseCustomThemes) {
      openUpgrade('Les thèmes personnalisés sont réservés au plan Pro.');
      return;
    }
    setForm({ ...form, theme: key });
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const data = await api.patch('/profile', form);
      setUser(data.user);
      setForm({
        displayName: data.user.displayName,
        bio: data.user.bio,
        avatarUrl: data.user.avatarUrl,
        theme: data.user.theme,
      });
      toast.success('Page mise à jour');
    } catch (err) {
      if (err.code === 'PLAN_REQUIRED') openUpgrade(err.message);
      else if (err.details) setErrors(err.details);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ma page</h1>
        <p className="text-sm text-slate-500">
          Personnalisez ce que voient vos visiteurs sur{' '}
          <span className="font-semibold text-slate-700">{publicLabel(user.username)}</span>.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={save} className="space-y-5" noValidate>
          <Card className="space-y-4 p-5">
            <Input
              label="Nom affiché"
              value={form.displayName}
              maxLength={60}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              error={errors.displayName}
            />
            <Textarea
              label="Bio"
              rows={3}
              maxLength={160}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              error={errors.bio}
              hint={`${form.bio.length} / 160`}
            />
            <Input
              label="Photo de profil (URL)"
              placeholder="https://…"
              value={form.avatarUrl}
              onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
              error={errors.avatarUrl}
            />
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Thème</h2>
              {!canUseCustomThemes && <span className="text-xs text-slate-500">Thèmes colorés : plan Pro</span>}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(THEMES).map(([key, theme]) => {
                const locked = theme.pro && !canUseCustomThemes;
                const selected = form.theme === key && !locked;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pickTheme(key)}
                    aria-pressed={selected}
                    className={`relative rounded-xl border p-2 text-left transition ${
                      selected ? 'border-brand-500 ring-2 ring-brand-500/40' : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <div className={`h-14 rounded-lg ${theme.swatch}`} />
                    <p className="mt-2 flex items-center gap-1.5 text-sm font-medium">
                      {theme.label}
                      {locked && <Icon name="lock" className="h-3.5 w-3.5 text-slate-400" />}
                    </p>
                  </button>
                );
              })}
            </div>
            {user.plan === 'free' && user.theme !== 'default' && (
              <div className="mt-4">
                <Alert type="info">
                  Votre thème « {THEMES[user.theme]?.label} » est conservé et se réactivera si vous repassez Pro.
                </Alert>
              </div>
            )}
          </Card>

          <Button type="submit" loading={saving} disabled={!dirty}>
            Enregistrer
          </Button>
        </form>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-slate-500">Aperçu</p>
          <div className="mx-auto h-[560px] w-[280px] overflow-y-auto rounded-[2rem] border-8 border-slate-900 bg-slate-900">
            <PublicProfileView
              preview
              showBadge={user.limits.badge}
              profile={{
                username: user.username,
                displayName: form.displayName || user.username,
                bio: form.bio,
                avatarUrl: form.avatarUrl,
                theme: previewTheme,
              }}
              links={previewLinks}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

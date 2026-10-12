import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatNumber, publicLabel, publicUrl } from '../lib/format.js';
import { Alert, Button, Card, Input, PageLoader, ProgressBar, Switch } from '../components/ui.jsx';
import { Icon } from '../components/icons.jsx';

function LinkRow({ link, index, total, onToggle, onSave, onDelete, onMove, onUpgrade }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: link.title, url: link.url });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await onSave(link.id, draft);
      setEditing(false);
    } catch (err) {
      setErrors(err.details || { title: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <Card className="p-4">
        <form onSubmit={save} className="space-y-3" noValidate>
          <Input
            label="Titre"
            value={draft.title}
            maxLength={80}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            error={errors.title}
          />
          <Input
            label="URL"
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            error={errors.url}
          />
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>
              Enregistrer
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDraft({ title: link.title, url: link.url });
                setErrors({});
                setEditing(false);
              }}
            >
              Annuler
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${link.active ? '' : 'bg-slate-50'}`}>
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <button
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
            aria-label={`Monter « ${link.title} »`}
          >
            <Icon name="up" className="h-4 w-4" />
          </button>
          <button
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
            aria-label={`Descendre « ${link.title} »`}
          >
            <Icon name="down" className="h-4 w-4" />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <p className={`truncate font-semibold ${link.active ? '' : 'text-slate-500'}`}>{link.title}</p>
          <p className="truncate text-sm text-slate-500">{link.url}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500">{formatNumber(link.clicks7d)} clic{link.clicks7d > 1 ? 's' : ''} (7 j)</span>
            {!link.active && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 font-medium text-slate-700">Masqué</span>
            )}
            {link.active && !link.published && (
              <button
                onClick={() => onUpgrade('Votre plan Free n\'affiche que les 5 premiers liens actifs.')}
                className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 hover:bg-amber-200"
              >
                Non publié (limite Free) — passer Pro
              </button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Switch
            checked={link.active}
            onChange={(next) => onToggle(link.id, next)}
            label={link.active ? `Masquer « ${link.title} »` : `Afficher « ${link.title} »`}
          />
          <button
            onClick={() => setEditing(true)}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label={`Modifier « ${link.title} »`}
          >
            <Icon name="edit" className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(link)}
            className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
            aria-label={`Supprimer « ${link.title} »`}
          >
            <Icon name="trash" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function Links() {
  const { user } = useAuth();
  const { openUpgrade } = useOutletContext();
  const toast = useToast();
  const [links, setLinks] = useState(null);
  const [limits, setLimits] = useState(user.limits);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ title: '', url: '' });
  const [formErrors, setFormErrors] = useState({});
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get('/links');
      setLinks(data.links);
      setLimits(data.limits);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message);
    }
  }, []);

  // Recharge aussi au changement de plan : les liens « publiés » dépendent du plan
  useEffect(() => {
    load();
  }, [load, user.plan]);

  if (loadError && !links) return <Alert type="error">{loadError}</Alert>;
  if (!links) return <PageLoader />;

  const atLimit = limits.maxLinks !== null && links.length >= limits.maxLinks;

  async function addLink(event) {
    event.preventDefault();
    setAdding(true);
    setFormErrors({});
    try {
      await api.post('/links', form);
      setForm({ title: '', url: '' });
      await load();
      toast.success('Lien ajouté');
    } catch (err) {
      if (err.code === 'PLAN_LIMIT') openUpgrade(err.message);
      else if (err.details) setFormErrors(err.details);
      else toast.error(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function toggle(id, active) {
    const previous = links;
    setLinks((list) => list.map((l) => (l.id === id ? { ...l, active } : l)));
    try {
      await api.patch(`/links/${id}`, { active });
      await load(); // recalcule les liens publiés
    } catch (err) {
      setLinks(previous);
      toast.error(err.message);
    }
  }

  async function save(id, draft) {
    const data = await api.patch(`/links/${id}`, draft);
    setLinks((list) => list.map((l) => (l.id === id ? { ...l, ...data.link } : l)));
    toast.success('Lien modifié');
  }

  async function remove(link) {
    if (!window.confirm(`Supprimer « ${link.title} » ? Ses statistiques passées sont conservées.`)) return;
    try {
      await api.delete(`/links/${link.id}`);
      await load();
      toast.success('Lien supprimé');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= links.length) return;
    const previous = links;
    const reordered = [...links];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setLinks(reordered);
    try {
      await api.put('/links/reorder', { ids: reordered.map((l) => l.id) });
      await load();
    } catch (err) {
      setLinks(previous);
      toast.error(err.message);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl(user.username));
      toast.success('Lien copié dans le presse-papiers');
    } catch {
      toast.error('Copie impossible, sélectionnez le lien manuellement');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes liens</h1>
        <p className="text-sm text-slate-500">Ajoutez, réorganisez et masquez les liens de votre page.</p>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Votre page publique</p>
          <a
            href={publicUrl(user.username)}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-lg font-bold text-brand-700 hover:underline"
          >
            {publicLabel(user.username)}
          </a>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={copyUrl}>
            <Icon name="copy" className="h-4 w-4" /> Copier
          </Button>
          <a
            href={publicUrl(user.username)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Icon name="external" className="h-4 w-4" /> Voir
          </a>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold">
            {links.length} / {limits.maxLinks ?? '∞'} liens
          </span>
          {limits.maxLinks !== null && (
            <button onClick={() => openUpgrade()} className="font-semibold text-brand-700 hover:underline">
              Liens illimités avec Pro
            </button>
          )}
        </div>
        {limits.maxLinks !== null && <ProgressBar value={links.length} max={limits.maxLinks} danger={atLimit} />}

        <form onSubmit={addLink} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-start" noValidate>
          <Input
            aria-label="Titre du lien"
            placeholder="Titre (ex. Ma chaîne YouTube)"
            value={form.title}
            maxLength={80}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            error={formErrors.title}
          />
          <Input
            aria-label="URL du lien"
            placeholder="https://…"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            error={formErrors.url}
          />
          {atLimit ? (
            <Button type="button" onClick={() => openUpgrade('Vous avez atteint la limite de 5 liens du plan Free.')}>
              <Icon name="lock" className="h-4 w-4" /> Limite atteinte
            </Button>
          ) : (
            <Button type="submit" loading={adding}>
              <Icon name="plus" className="h-4 w-4" /> Ajouter
            </Button>
          )}
        </form>
      </Card>

      {links.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">
          Aucun lien pour le moment. Ajoutez votre premier lien ci-dessus : il apparaîtra immédiatement sur votre page.
        </Card>
      ) : (
        <ul className="space-y-3">
          {links.map((link, index) => (
            <li key={link.id}>
              <LinkRow
                link={link}
                index={index}
                total={links.length}
                onToggle={toggle}
                onSave={save}
                onDelete={remove}
                onMove={move}
                onUpgrade={openUpgrade}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

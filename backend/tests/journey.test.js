// Test d'intégration du parcours principal, sur une MongoDB en mémoire (aucune variable d'environnement requise).
// Lancer : npm test
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

const BROWSER_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

let mongod;
let server;
let base;

const call = async (path, { method = 'GET', body, token, headers = {}, redirect } = {}) => {
  const res = await fetch(`${base}/api${path}`, {
    method,
    redirect,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* réponse non JSON (redirection) */
  }
  return { status: res.status, json, headers: res.headers };
};

const register = async (username) => {
  const res = await call('/auth/register', {
    method: 'POST',
    body: { email: `${username}@test.dev`, username, password: 'motdepasse123' },
  });
  assert.equal(res.status, 201);
  return res.json.token;
};

const CARD_OK = { number: '4242 4242 4242 4242', expiry: '12/40', cvc: '123' };
const CARD_DECLINED = { number: '4000 0000 0000 0002', expiry: '12/40', cvc: '123' };

before(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.JWT_SECRET = 'test-secret';
  process.env.NODE_ENV = 'test';
  const { default: app } = await import('../src/app.js');
  await mongoose.connect(process.env.MONGODB_URI);
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await mongoose.disconnect();
  await mongod?.stop();
});

describe('Auth', () => {
  it('refuse un mot de passe trop court, un username réservé et les doublons', async () => {
    const short = await call('/auth/register', {
      method: 'POST',
      body: { email: 'a@b.co', username: 'validname', password: 'court' },
    });
    assert.equal(short.status, 400);

    const reserved = await call('/auth/register', {
      method: 'POST',
      body: { email: 'a@b.co', username: 'admin', password: 'motdepasse123' },
    });
    assert.equal(reserved.status, 400);

    await register('doublon');
    const dup = await call('/auth/register', {
      method: 'POST',
      body: { email: 'autre@test.dev', username: 'doublon', password: 'motdepasse123' },
    });
    assert.equal(dup.status, 409);
  });

  it('connecte avec les bons identifiants et protège /auth/me', async () => {
    await register('loginuser');
    const bad = await call('/auth/login', {
      method: 'POST',
      body: { email: 'loginuser@test.dev', password: 'mauvaismdp' },
    });
    assert.equal(bad.status, 401);

    const ok = await call('/auth/login', {
      method: 'POST',
      body: { email: 'loginuser@test.dev', password: 'motdepasse123' },
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.user.plan, 'free');
    assert.equal(ok.json.user.passwordHash, undefined);

    assert.equal((await call('/auth/me')).status, 401);
    assert.equal((await call('/auth/me', { token: ok.json.token })).status, 200);
  });
});

describe('Parcours complet Free -> Pro -> Free', () => {
  let token;
  let linkIds = [];

  it('inscription et page publique vide', async () => {
    token = await register('creator');
    const page = await call('/public/creator');
    assert.equal(page.status, 200);
    assert.equal(page.json.profile.username, 'creator');
    assert.deepEqual(page.json.links, []);
    assert.equal(page.json.showBadge, true);
    assert.equal((await call('/public/inconnu')).status, 404);
  });

  it('limite Free : 5 liens maximum, URL validée', async () => {
    const invalid = await call('/links', { method: 'POST', token, body: { title: 'X', url: 'javascript:alert(1)' } });
    assert.equal(invalid.status, 400);

    for (let i = 1; i <= 5; i += 1) {
      const res = await call('/links', { method: 'POST', token, body: { title: `Lien ${i}`, url: `exemple${i}.com` } });
      assert.equal(res.status, 201);
      assert.equal(res.json.link.url, `https://exemple${i}.com`); // https:// ajouté
      linkIds.push(res.json.link.id);
    }
    const sixth = await call('/links', { method: 'POST', token, body: { title: 'Lien 6', url: 'https://six.com' } });
    assert.equal(sixth.status, 403);
    assert.equal(sixth.json.error.code, 'PLAN_LIMIT');
  });

  it('réordonne et masque un lien', async () => {
    const reversed = [...linkIds].reverse();
    assert.equal((await call('/links/reorder', { method: 'PUT', token, body: { ids: reversed } })).status, 200);
    linkIds = reversed;

    const partial = await call('/links/reorder', { method: 'PUT', token, body: { ids: linkIds.slice(1) } });
    assert.equal(partial.status, 400);

    const page = await call('/public/creator');
    assert.equal(page.json.links[0].title, 'Lien 5');
    assert.equal(page.json.links[0].url, undefined); // destination non exposée

    const hide = await call(`/links/${linkIds[0]}`, { method: 'PATCH', token, body: { active: false } });
    assert.equal(hide.json.link.active, false);
    assert.equal((await call('/public/creator')).json.links.length, 4);
    await call(`/links/${linkIds[0]}`, { method: 'PATCH', token, body: { active: true } });
  });

  it('un clic redirige, est enregistré, et les robots sont ignorés', async () => {
    const target = linkIds[1];
    const click = await call(`/r/${target}?src=instagram.com`, {
      redirect: 'manual',
      headers: { 'User-Agent': BROWSER_UA, 'x-vercel-ip-country': 'SN' },
    });
    assert.equal(click.status, 302);
    assert.match(click.headers.get('location'), /^https:\/\/exemple\d\.com$/);

    const bot = await call(`/r/${target}`, { redirect: 'manual', headers: { 'User-Agent': 'Googlebot/2.1' } });
    assert.equal(bot.status, 302); // redirige quand même…
    await new Promise((r) => setTimeout(r, 150)); // …mais n'enregistre rien

    const stats = await call('/analytics?days=7', { token });
    assert.equal(stats.status, 200);
    assert.equal(stats.json.total, 1);
    assert.equal(stats.json.devices[0].label, 'mobile');
    assert.equal(stats.json.sources[0].label, 'instagram.com');
    assert.equal(stats.json.countries[0].label, 'SN');
    assert.equal(stats.json.series.length, 7);
    assert.equal(stats.json.series.at(-1).clicks, 1);
    assert.equal((await call('/r/000000000000000000000000', { redirect: 'manual' })).status, 404);
  });

  it('analytics Free plafonnées à 7 jours', async () => {
    const stats = await call('/analytics?days=90', { token });
    assert.equal(stats.json.range.days, 7);
    assert.equal(stats.json.range.maxDays, 7);
    assert.equal(stats.json.range.upgradeRequired, true);
  });

  it('thème Pro refusé en Free', async () => {
    const res = await call('/profile', { method: 'PATCH', token, body: { theme: 'sunset' } });
    assert.equal(res.status, 403);
    assert.equal(res.json.error.code, 'PLAN_REQUIRED');
  });

  it('paiement refusé : reste Free, échec journalisé', async () => {
    const res = await call('/billing/checkout', { method: 'POST', token, body: { plan: 'pro', card: CARD_DECLINED } });
    assert.equal(res.status, 402);
    assert.equal(res.json.error.code, 'card_declined');

    const billing = await call('/billing', { token });
    assert.equal(billing.json.user.plan, 'free');
    assert.equal(billing.json.payments[0].status, 'failed');
    assert.equal(billing.json.payments[0].cardLast4, '0002');
  });

  it('upgrade réussi : liens illimités, badge retiré, analytics 90 j, thèmes', async () => {
    const res = await call('/billing/checkout', { method: 'POST', token, body: { plan: 'pro', card: CARD_OK } });
    assert.equal(res.status, 200);
    assert.equal(res.json.user.plan, 'pro');
    assert.ok(res.json.user.currentPeriodEnd);

    const again = await call('/billing/checkout', { method: 'POST', token, body: { plan: 'pro', card: CARD_OK } });
    assert.equal(again.status, 409);

    const sixth = await call('/links', { method: 'POST', token, body: { title: 'Lien 6', url: 'https://six.com' } });
    assert.equal(sixth.status, 201);
    linkIds.push(sixth.json.link.id);

    assert.equal((await call('/profile', { method: 'PATCH', token, body: { theme: 'sunset' } })).status, 200);
    assert.equal((await call('/analytics?days=90', { token })).json.range.days, 90);

    const page = await call('/public/creator');
    assert.equal(page.json.showBadge, false);
    assert.equal(page.json.profile.theme, 'sunset');
    assert.equal(page.json.links.length, 6);
  });

  it('résiliation programmée : Pro conservé jusqu’à la fin de période, reprise possible', async () => {
    const cancel = await call('/billing/cancel', { method: 'POST', token });
    assert.equal(cancel.json.user.plan, 'pro');
    assert.equal(cancel.json.user.cancelAtPeriodEnd, true);

    const resume = await call('/billing/resume', { method: 'POST', token });
    assert.equal(resume.json.user.cancelAtPeriodEnd, false);
    assert.equal((await call('/billing/resume', { method: 'POST', token })).status, 409);

    await call('/billing/cancel', { method: 'POST', token });
  });

  it('fin de période : downgrade Pro -> Free, rien n’est supprimé', async () => {
    const expired = await call('/billing/dev/expire', { method: 'POST', token });
    assert.equal(expired.json.user.plan, 'free');
    assert.equal(expired.json.user.cancelAtPeriodEnd, false);

    const page = await call('/public/creator');
    assert.equal(page.json.showBadge, true);
    assert.equal(page.json.profile.theme, 'default'); // thème Pro masqué
    assert.equal(page.json.links.length, 5); // 6 liens, 5 publiés

    const list = await call('/links', { token });
    assert.equal(list.json.links.length, 6); // aucun lien supprimé
    assert.equal(list.json.links.filter((l) => !l.published).length, 1);

    const me = await call('/auth/me', { token });
    assert.equal(me.json.user.theme, 'sunset'); // choix conservé pour un futur upgrade

    const blocked = await call('/links', { method: 'POST', token, body: { title: 'Lien 7', url: 'https://sept.com' } });
    assert.equal(blocked.status, 403);

    // le lien non publié ne redirige plus et ne compte plus
    const hiddenId = list.json.links.find((l) => !l.published).id;
    assert.equal((await call(`/r/${hiddenId}`, { redirect: 'manual' })).status, 404);
  });

  it('renouvellement automatique si aucune résiliation', async () => {
    const t2 = await register('renewer');
    await call('/billing/checkout', { method: 'POST', token: t2, body: { plan: 'pro', card: CARD_OK } });
    const expired = await call('/billing/dev/expire', { method: 'POST', token: t2 });
    assert.equal(expired.json.user.plan, 'pro');
    assert.ok(new Date(expired.json.user.currentPeriodEnd) > new Date());

    const billing = await call('/billing', { token: t2 });
    assert.deepEqual(
      billing.json.payments.map((p) => p.type).sort(),
      ['renewal', 'upgrade']
    );
  });
});

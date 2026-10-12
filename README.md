# LinkPulse

SaaS de bio-link analytics pour créateurs : une page publique `/@username` qui regroupe les liens, et un dashboard pour suivre les clics.

**Stack** : React + Vite + JavaScript + Tailwind CSS · Node.js + Express · MongoDB (Mongoose) · JWT + bcrypt · paiement simulé côté backend.

```
linkpulse/
├── backend/   API Express (src/config, models, controllers, routes, middleware, services, utils)
└── frontend/  SPA React (src/pages, components, context, layouts, lib)
```

## Démarrage

### 1. Backend

```bash
cd backend
cp .env.example .env     # renseigner MONGODB_URI et JWT_SECRET
npm install
npm run dev              # http://localhost:5000
```

| Variable | Rôle |
|---|---|
| `MONGODB_URI` | Chaîne de connexion MongoDB (obligatoire) |
| `JWT_SECRET` | Secret de signature JWT, ex. `openssl rand -hex 48` (obligatoire) |
| `JWT_EXPIRES_IN` | Durée de session (défaut `7d`) |
| `CLIENT_URL` | Origine(s) du frontend autorisées par CORS, séparées par des virgules |
| `PORT` | Port de l'API (défaut `5000`) |

Le serveur refuse de démarrer, avec un message clair, si une variable obligatoire manque.

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev              # http://localhost:5173
```

En dev, `/api` est proxifié vers le backend (`VITE_PROXY_TARGET`). En production, définir `VITE_API_URL` avec l'URL complète de l'API (ex. `https://api.example.com/api`) et, si besoin, `VITE_PUBLIC_URL` (ex. `https://linkpulse.io`) pour l'affichage des liens publics. `vercel.json` fournit la réécriture SPA.

### 3. Tests

```bash
cd backend && npm test
```

Test d'intégration du parcours complet (inscription → liens → clic → stats → upgrade → downgrade) sur une MongoDB en mémoire (`mongodb-memory-server` télécharge le binaire MongoDB au premier lancement).

## Règles des plans

Définies une seule fois dans `backend/src/utils/plans.js`.

| | Free | Pro |
|---|---|---|
| Liens | 5 max | illimités |
| Analytics | 7 jours | 90 jours |
| Badge « Créé avec LinkPulse » | affiché | retiré |
| Thèmes | par défaut | 5 thèmes supplémentaires |
| Prix | 0 | 9 €/mois (`PLANS.pro.price`) |

Toutes les limites sont appliquées **côté backend** (le frontend ne fait que les refléter) :
création de lien (403 `PLAN_LIMIT`), fenêtre des analytics (plafonnée au plan), thème (403 `PLAN_REQUIRED`), badge et liens publiés sur la page publique.

### Upgrade / downgrade

- **Upgrade** : `POST /api/billing/checkout` → paiement simulé → `plan = pro`, période de 30 jours.
- **Résiliation** : `POST /api/billing/cancel` programme le downgrade (`cancelAtPeriodEnd`). L'utilisateur reste Pro jusqu'à la fin de la période payée ; `POST /api/billing/resume` annule la résiliation.
- **Fin de période** (`services/subscription.js`) : résiliation programmée → retour en Free ; sinon renouvellement automatique (simulé) avec un paiement `renewal`. Évalué à chaque requête authentifiée et à chaque lecture de page publique, de façon atomique (pas de double facturation) — pas de cron nécessaire pour le MVP.
- **Downgrade non destructif** : rien n'est supprimé. Au-delà de 5 liens, seuls les 5 premiers liens actifs restent publiés (les autres ne s'affichent ni ne redirigent) ; le thème Pro choisi est conservé et revient si l'utilisateur repasse Pro ; l'historique de clics est conservé (purge automatique après 91 jours par index TTL).

### Paiement simulé

`backend/src/services/payment.js` imite Stripe en mode test. Le numéro de carte n'est jamais stocké (seulement les 4 derniers chiffres) :

| Carte | Résultat |
|---|---|
| `4242 4242 4242 4242` (ou toute carte valide Luhn) | accepté |
| `4000 0000 0000 0002` | refusé |
| `4000 0000 0000 9995` | fonds insuffisants |
| `4000 0000 0000 0069` | carte expirée |

Pour passer à Stripe : remplacer `charge()` (même contrat de retour) et remplacer `syncSubscription` par les webhooks Stripe.

En dev uniquement (désactivé si `NODE_ENV=production`), `POST /api/billing/dev/expire` — bouton « Simuler la fin de période » dans la page Abonnement — force la fin de période pour tester renouvellement et downgrade.

## Suivi des clics

Les liens de la page publique pointent vers `GET /api/r/:id` : l'API enregistre le clic puis répond `302` vers la destination. Cela fonctionne sans JavaScript et ne casse pas si le visiteur ouvre le lien dans un nouvel onglet. Chaque clic stocke : lien, date, appareil (mobile/tablette/ordinateur), source (site d'origine du visiteur, transmise par la page publique) et pays (en-tête `x-vercel-ip-country` / `cf-ipcountry` si l'hébergeur le fournit). Les robots (User-Agent) sont ignorés.

## API

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` · `/login` | – | Inscription, connexion (JWT) |
| GET | `/api/auth/me` | JWT | Utilisateur courant |
| GET | `/api/auth/username-available?username=` | – | Disponibilité du pseudo |
| GET | `/api/public/:username` | – | Page publique (profil, liens publiés, badge) |
| GET | `/api/r/:id?src=` | – | Enregistre le clic et redirige |
| GET/POST | `/api/links` | JWT | Lister / créer |
| PATCH/DELETE | `/api/links/:id` | JWT | Modifier (titre, URL, actif) / supprimer |
| PUT | `/api/links/reorder` | JWT | Réordonner (`{ ids }`) |
| GET | `/api/analytics?days=7\|30\|90` | JWT | Stats (fenêtre plafonnée par le plan) |
| PATCH | `/api/profile` | JWT | Nom, bio, avatar, thème |
| GET | `/api/billing` | JWT | Plan, catalogue, historique |
| POST | `/api/billing/checkout` · `/cancel` · `/resume` | JWT | Upgrade, résiliation, reprise |

Erreurs au format uniforme : `{ "error": { "code", "message", "details?" } }`.

## Sécurité

Mots de passe hachés (bcrypt, coût 12), JWT signé, validation de toutes les entrées (zod), URLs limitées à http(s), Helmet, CORS restreint à `CLIENT_URL`, rate limiting global + renforcé sur login/inscription et sur le endpoint de clic, corps de requête limité à 10 ko, messages de login génériques.

## Limites connues du MVP

- JWT stocké dans `localStorage` (simple ; passer à un cookie httpOnly pour un durcissement supplémentaire).
- Pas de vérification d'email ni de réinitialisation de mot de passe.
- Pas de dédoublonnage des clics (un visiteur qui clique deux fois compte deux fois).
- Réorganisation des liens par boutons ↑/↓ (pas de glisser-déposer).
- Le username n'est pas modifiable après inscription.

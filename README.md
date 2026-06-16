# BookStorage-Discord

Bot Discord **optionnel** pour [BookStorage](https://github.com/LGARRABOS/BookStorage) : actions rapides de lecture via commandes slash (`/reading`, `/stats`, `/chapter`).

Une instance bot par instance BookStorage — le bot consomme uniquement l’API REST documentée ([OpenAPI](https://github.com/LGARRABOS/BookStorage/blob/main/docs/openapi.yaml)).

---

## Prérequis

- **Node.js 20+**
- Une instance **BookStorage ≥ 6.x** avec jetons API activés (Profil → Jetons API)
- Scopes recommandés :
  - `works:read` — `/reading`, `/stats`, validation `/link`
  - `works:write` — `/chapter` (+1 / −1)

---

## Créer l’application Discord

1. [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**
2. Onglet **Bot** → **Reset Token** → copier `DISCORD_TOKEN`
3. Onglet **OAuth2 → URL Generator** :
   - Scopes : `bot`, `applications.commands`
   - Bot permissions minimales (aucune permission salon requise pour les slash commands en DM)
4. Inviter le bot sur votre serveur avec l’URL générée
5. Noter l’**Application ID** → `DISCORD_CLIENT_ID`

> **Intents** : seul l’intent `Guilds` est utilisé (pas de Message Content Intent).

---

## Installation

```bash
git clone https://github.com/LGARRABOS/BookStorage-Discord.git
cd BookStorage-Discord
npm ci
npm run build
cp .env.example .env
# Éditer .env (voir ci-dessous)
npm run register-commands
npm start
```

### Variables d’environnement

| Variable               | Description                                                                 |
| ---------------------- | --------------------------------------------------------------------------- |
| `DISCORD_TOKEN`        | Token du bot                                                                |
| `DISCORD_CLIENT_ID`    | ID de l’application Discord                                                 |
| `DISCORD_GUILD_ID`     | _(optionnel)_ Enregistrement des commandes sur un serveur (instantané, dev) |
| `BOOKSTORAGE_BASE_URL` | URL publique BookStorage sans slash final                                   |
| `LINK_DB_PATH`         | Chemin SQLite (défaut `./data/links.db`)                                    |
| `TOKEN_ENCRYPTION_KEY` | Clé 32 octets en base64 — `openssl rand -base64 32`                         |
| `DEFAULT_LOCALE`       | `fr` ou `en`                                                                |

Générer la clé de chiffrement des jetons API au repos :

```bash
openssl rand -base64 32
```

### Enregistrement des commandes

```bash
npm run register-commands
```

- Avec `DISCORD_GUILD_ID` : commandes visibles immédiatement sur ce serveur
- Sans : commandes **globales** (propagation Discord ~1 h)

---

## Lier son compte

1. Sur votre instance BookStorage : **Profil → Jetons API** → créer un jeton nommé « Discord » (scopes read + write)
2. Ouvrir une **conversation privée** avec le bot
3. `/link token:<votre_jeton>`

La commande `/link` est **refusée en salon** (sécurité). Le jeton n’est jamais réaffiché.

Pour révoquer l’accès : supprimez le jeton côté BookStorage — le bot répondra « session expirée » au prochain appel.

---

## Commandes

| Commande                        | Description                                    |
| ------------------------------- | ---------------------------------------------- |
| `/link token:`                  | Lie le compte (DM uniquement)                  |
| `/reading`                      | Œuvres en cours (`status=reading`, 15 max)     |
| `/stats`                        | Statistiques globales                          |
| `/chapter titre: action:+1\|-1` | Incrémente ou décrémente un chapitre par titre |

---

## Déploiement

### systemd (exemple)

```ini
[Unit]
Description=BookStorage Discord Bot
After=network.target

[Service]
Type=simple
User=bookstorage
WorkingDirectory=/opt/BookStorage-Discord
EnvironmentFile=/opt/BookStorage-Discord/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Docker (optionnel)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
VOLUME ["/app/data"]
CMD ["node", "dist/index.js"]
```

Monter `./data` pour persister `links.db`.

---

## Compatibilité API

- Spécification : [BookStorage `docs/openapi.yaml`](https://github.com/LGARRABOS/BookStorage/blob/main/docs/openapi.yaml)
- Version minimale testée : **BookStorage 6.x**
- Endpoints utilisés : `GET /api/works`, `GET /api/stats`, `GET /api/works/{id}`, `POST /api/increment/{id}`, `POST /api/decrement/{id}`

---

## Tests manuels (sans credentials prod)

1. Instance BookStorage locale ou de staging avec jeton API de test
2. Remplir `.env` avec token Discord de dev et `DISCORD_GUILD_ID`
3. `npm run register-commands && npm run dev`
4. DM : `/link token:bs_…` → message de succès
5. `/reading` → liste des œuvres en cours
6. `/stats` → embed statistiques
7. `/chapter titre:<œuvre> action:+1` → chapitre mis à jour
8. Révoquer le jeton sur le site → `/stats` doit refuser proprement

---

## Hors scope v0.1

Catalogue, recommandations, admin, OAuth Discord, notifications webhook intégrées, `/unlink`, autocomplete sur les titres.

Les notifications site → salon Discord restent possibles via les webhooks natifs BookStorage, sans ce bot.

---

## Développement

```bash
npm run dev          # rechargement à chaud (tsx)
npm test             # tests unitaires (client API mocké)
npm run lint
npm run build
```

---

## Licence

[MIT](./LICENSE)

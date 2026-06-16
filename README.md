# BookStorage-Discord

Bot Discord **optionnel** pour [BookStorage](https://github.com/LGARRABOS/BookStorage) : actions rapides de lecture via commandes slash (`/reading`, `/stats`, `/chapter`).

Une instance bot par instance BookStorage — le bot consomme uniquement l’API REST documentée ([OpenAPI](https://github.com/LGARRABOS/BookStorage/blob/main/docs/openapi.yaml)).

**Ce dépôt est indépendant** : l’installer n’est pas requis pour faire tourner BookStorage.

---

## Sommaire

1. [Prérequis](#prérequis)
2. [Portail Discord (test puis production)](#portail-discord-test-puis-production)
3. [Installation sur le serveur de production](#installation-sur-le-serveur-de-production)
4. [Configuration `.env`](#configuration-env)
5. [Enregistrement des commandes slash](#enregistrement-des-commandes-slash)
6. [Lier son compte BookStorage](#lier-son-compte-bookstorage)
7. [Commandes](#commandes)
8. [Exploitation (systemd)](#exploitation-systemd)
9. [Installation locale (développement)](#installation-locale-développement)
10. [Compatibilité API](#compatibilité-api)

---

## Prérequis

- **Node.js 20+** (installé automatiquement par `deploy/install.sh` si absent)
- Une instance **BookStorage ≥ 6.x** accessible en HTTPS depuis le serveur du bot
- Jetons API activés sur BookStorage (Profil → Jetons API)
- Scopes recommandés :
  - `works:read` — `/reading`, `/stats`, validation `/link`
  - `works:write` — `/chapter` (+1 / −1)

Sur le serveur de prod, `BOOKSTORAGE_BASE_URL` doit être **la même URL publique** que `BOOKSTORAGE_PUBLIC_ORIGIN` de BookStorage (ex. `https://books.example.com`, sans slash final). Le bot appelle l’API en local ou via le reverse-proxy comme n’importe quel client HTTP.

---

## Portail Discord (test puis production)

Configurez l’application **avant** ou **pendant** l’installation sur le serveur. Une seule application Discord peut servir pour les tests sur un serveur privé, puis pour la prod.

### 1. Créer l’application

1. [Discord Developer Portal](https://discord.com/developers/applications) → **New Application** (ex. « BookStorage Bot »)
2. Onglet **Bot** → **Reset Token** → copier le token → `DISCORD_TOKEN` (ne jamais commiter)
3. Onglet **General Information** → copier **Application ID** → `DISCORD_CLIENT_ID`
4. Onglet **Bot** → **Privileged Gateway Intents** : **ne rien activer** (le bot n’utilise que l’intent `Guilds`)

### 2. Inviter le bot **sur le serveur** (membre visible)

Les commandes slash peuvent fonctionner sans que le bot apparaisse dans la liste des membres à droite si l’app a seulement été **installée pour vous** (flux « Installer l’application »). Pour que **BookStorage Bot** apparaisse en ligne comme Rand ou Dice Maiden, il faut l’**ajouter au serveur** avec le scope `bot`.

1. Onglet **OAuth2 → URL Generator**
2. Scopes cochés : **`bot`** et **`applications.commands`** (les deux)
3. Permissions bot : aucune obligatoire (laisser à 0 ou cocher « View Channels » si besoin)
4. Copier l’URL générée, ouvrir dans le navigateur
5. Choisir le serveur (ex. **Jackie 2.0**) → **Autoriser**
6. Vérifier : le bot doit apparaître sous **En ligne** dans la liste des membres (redémarrer le client Discord si besoin)

URL manuelle (remplacer `CLIENT_ID`) :

```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=0&scope=bot%20applications.commands
```

> Si le bot répond aux commandes mais n’est pas dans la liste : répétez l’étape 4–5 — l’invitation `bot` n’a probablement pas été faite sur ce serveur.

7. Récupérer l’**ID du serveur** (mode développeur) → `DISCORD_GUILD_ID` pour des commandes slash instantanées

Avec `DISCORD_GUILD_ID` renseigné, les commandes slash apparaissent **immédiatement** sur ce serveur après `npm run register-commands`.

### 3. Tester en conditions réelles

1. Installer le bot sur le serveur (section suivante) ou en local ([développement](#installation-locale-développement))
2. Renseigner `.env` avec le token, le client ID, le guild ID de test, et `BOOKSTORAGE_BASE_URL` pointant vers votre prod (ou staging)
3. `npm run register-commands` puis démarrer le bot
4. En **message privé** au bot : `/link token:bs_…` (jeton créé sur BookStorage)
5. Tester `/reading`, `/stats`, `/chapter titre:… action:+1` sur le serveur de test

### 4. Passage en **production** Discord

Deux options :

| Mode | `DISCORD_GUILD_ID` | Usage |
|------|-------------------|--------|
| **Serveur unique** | ID de votre serveur communautaire prod | Commandes visibles tout de suite sur ce serveur |
| **Global** | Ligne commentée / supprimée | Commandes sur tous les serveurs où le bot est invité (~1 h de propagation) |

Après changement, relancer :

```bash
sudo -u bookstorage bash -c 'cd /opt/bookstorage-discord && npm run register-commands'
sudo systemctl restart bookstorage-discord
```

Inviter le bot sur le(s) serveur(s) prod avec la même URL OAuth2 (`bot` + `applications.commands`).

---

## Installation sur le serveur de production

Installation typique : **même machine Linux** que BookStorage (`/opt/bookstorage`), utilisateur système `bookstorage` partagé, service systemd séparé.

**Systèmes supportés** : Debian/Ubuntu, Rocky Linux / RHEL / AlmaLinux / CentOS (Node.js via dépôt RPM NodeSource ou module `nodejs:20`).

### Installation automatique (recommandée)

Le service systemd utilise **`/opt/bookstorage-discord`**. Un clone dans `/tmp` sert uniquement à lancer `install.sh` — toutes les commandes `npm` et le `.env` de prod doivent être dans `/opt/bookstorage-discord`.

```bash
# Depuis n'importe quel clone (ex. /tmp/BookStorage-Discord)
cd /tmp/BookStorage-Discord   # ou où vous avez cloné
git pull origin main
sudo bash deploy/install.sh
```

`install.sh` clone ou met à jour `/opt/bookstorage-discord`, compile en tant que `bookstorage`, et installe systemd.

### Installation manuelle

```bash
sudo mkdir -p /opt/bookstorage-discord
sudo git clone https://github.com/LGARRABOS/BookStorage-Discord.git /opt/bookstorage-discord
cd /opt/bookstorage-discord
sudo npm ci && sudo npm run build
sudo mkdir -p /opt/bookstorage-discord/data
sudo cp .env.example .env
# Éditer .env, puis :
sudo chown -R bookstorage:bookstorage /opt/bookstorage-discord
sudo cp deploy/bookstorage-discord.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable bookstorage-discord
```

---

## Configuration `.env`

Fichier : `/opt/bookstorage-discord/.env` (permissions `600`, propriétaire `bookstorage`).

| Variable               | Description                                                                 |
| ---------------------- | --------------------------------------------------------------------------- |
| `DISCORD_TOKEN`        | Token du bot (Portail → Bot)                                                |
| `DISCORD_CLIENT_ID`    | Application ID (Portail → General Information)                              |
| `DISCORD_GUILD_ID`     | _(recommandé en test)_ ID du serveur Discord — commandes instantanées       |
| `BOOKSTORAGE_BASE_URL` | URL publique BookStorage, **identique** à `BOOKSTORAGE_PUBLIC_ORIGIN`       |
| `LINK_DB_PATH`         | Chemin SQLite (défaut `/opt/bookstorage-discord/data/links.db` en prod)     |
| `TOKEN_ENCRYPTION_KEY` | Clé 32 octets base64 — générée par `install.sh` ou `openssl rand -base64 32` |
| `DEFAULT_LOCALE`       | `fr` ou `en`                                                                |

Exemple prod (serveur de test Discord, API prod) :

```env
DISCORD_TOKEN=…
DISCORD_CLIENT_ID=1234567890123456789
DISCORD_GUILD_ID=9876543210987654321
BOOKSTORAGE_BASE_URL=https://books.example.com
LINK_DB_PATH=/opt/bookstorage-discord/data/links.db
TOKEN_ENCRYPTION_KEY=…
DEFAULT_LOCALE=fr
```

---

## Enregistrement des commandes slash

À faire **après** avoir renseigné `.env` :

```bash
sudo -u bookstorage bash -c 'cd /opt/bookstorage-discord && npm run register-commands'
```

- **Avec** `DISCORD_GUILD_ID` : visible immédiatement sur ce serveur
- **Sans** : commandes globales (délai Discord ~1 h)

Puis démarrer le service :

```bash
sudo systemctl start bookstorage-discord
sudo systemctl status bookstorage-discord
```

---

## Lier son compte BookStorage

1. Sur BookStorage : **Profil → Jetons API** → créer un jeton « Discord » (`works:read` + `works:write`)
2. Ouvrir une **conversation privée** avec le bot sur Discord
3. `/link token:<votre_jeton>`

`/link` est **refusé en salon** (sécurité). Le jeton n’est jamais réaffiché.

Révoquer l’accès : supprimer le jeton sur BookStorage — le bot répondra au prochain appel avec une erreur de session.

---

## Commandes

| Commande                        | Description                                    |
| ------------------------------- | ---------------------------------------------- |
| `/link token:`                  | Lie le compte (DM uniquement)                  |
| `/reading`                      | Œuvres en cours (`status=reading`, 15 max)     |
| `/stats`                        | Statistiques globales                          |
| `/chapter titre: action:+1\|-1` | Incrémente ou décrémente un chapitre par titre |

---

## Exploitation (systemd)

| Action              | Commande                                      |
| ------------------- | --------------------------------------------- |
| Démarrer            | `sudo systemctl start bookstorage-discord`    |
| Arrêter             | `sudo systemctl stop bookstorage-discord`     |
| Redémarrer          | `sudo systemctl restart bookstorage-discord`  |
| Logs                | `sudo journalctl -u bookstorage-discord -f`   |
| Mise à jour         | Voir ci-dessous                               |

### Mise à jour du bot

```bash
sudo bash /opt/bookstorage-discord/deploy/update.sh --restart
```

Ou réinstaller via `sudo bash deploy/install.sh` depuis un clone temporaire.

Le service systemd est défini dans [`deploy/bookstorage-discord.service`](deploy/bookstorage-discord.service). Il démarre **après** `bookstorage.service` mais n’empêche pas BookStorage de tourner si le bot est arrêté.

### Dépannage : le service redémarre en boucle

Le fichier `.env` et le build utilisés par systemd sont dans **`/opt/bookstorage-discord`** uniquement.

```bash
# Arrêter la boucle de redémarrage le temps de corriger
sudo systemctl stop bookstorage-discord

# Rebuild au bon endroit
sudo bash /opt/bookstorage-discord/deploy/install.sh
# ou : sudo bash deploy/update.sh   (depuis /opt/bookstorage-discord)

# Voir l’erreur exacte
sudo journalctl -u bookstorage-discord -n 40 --no-pager

# Tester la config (depuis /opt, pas /tmp)
sudo -u bookstorage bash -c 'cd /opt/bookstorage-discord && npm run preflight'
```

Erreur `Cannot find module '/opt/bookstorage-discord/dist/index.js'` → le build n’a pas été fait dans `/opt` (souvent `npm` lancé dans `/tmp/BookStorage-Discord` en root). Relancer `sudo bash deploy/install.sh`.

| Erreur (journal / preflight) | Correction |
|------------------------------|------------|
| `DISCORD_TOKEN is required` | Renseigner le token (Portail Discord → Bot) dans `.env` |
| `DISCORD_CLIENT_ID is required` | Renseigner l’Application ID |
| `BOOKSTORAGE_BASE_URL must be a valid URL` | URL HTTPS réelle, sans `/` final (ex. `https://books.example.com`) |
| `TOKEN_ENCRYPTION_KEY must be 32 bytes` | `openssl rand -base64 32` — ne pas tronquer la clé |
| `Could not locate the bindings file` (better-sqlite3) | Recompiler : `cd /opt/bookstorage-discord && sudo -u bookstorage npm rebuild better-sqlite3` |
| `An invalid token was provided` | Token Discord invalide ou révoqué — en régénérer sur le portail |

Après correction du `.env` :

```bash
sudo systemctl daemon-reload   # si le fichier .service a changé
sudo systemctl restart bookstorage-discord
sudo journalctl -u bookstorage-discord -f
```

### Docker (optionnel)

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
VOLUME ["/app/data"]
CMD ["node", "dist/index.js"]
```

Monter `./data` pour persister `links.db`. Builder l’image après `npm run build` sur la machine hôte.

---

## Installation locale (développement)

```bash
git clone https://github.com/LGARRABOS/BookStorage-Discord.git
cd BookStorage-Discord
npm ci
npm run build
cp .env.example .env
# Renseigner DISCORD_* , BOOKSTORAGE_BASE_URL, TOKEN_ENCRYPTION_KEY
npm run register-commands
npm run dev
```

### Checklist test manuel

1. Jeton API BookStorage (scopes read + write)
2. `DISCORD_GUILD_ID` = serveur de test
3. DM : `/link token:bs_…` → succès
4. `/reading`, `/stats`, `/chapter titre:… action:+1`
5. Révoquer le jeton sur le site → le bot refuse proprement

---

## Compatibilité API

- Spécification : [BookStorage `docs/openapi.yaml`](https://github.com/LGARRABOS/BookStorage/blob/main/docs/openapi.yaml)
- Version minimale : **BookStorage 6.x**
- Endpoints : `GET /api/works`, `GET /api/stats`, `GET /api/works/{id}`, `POST /api/increment/{id}`, `POST /api/decrement/{id}`

---

## Hors scope v0.1

Catalogue, recommandations, admin, OAuth Discord, notifications webhook intégrées, `/unlink`, autocomplete sur les titres. Les notifications site → salon Discord restent possibles via les webhooks natifs BookStorage.

---

## Développement

```bash
npm run dev
npm test
npm run lint
npm run build
```

---

## Licence

[MIT](./LICENSE)

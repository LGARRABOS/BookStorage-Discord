#!/bin/bash
# ============================================================================
# BookStorage-Discord — Installation (serveur Linux, optionnel)
# ============================================================================
# À exécuter sur la même machine que BookStorage (ou toute machine avec accès
# HTTP à l'instance). N'altère pas l'installation BookStorage existante.
#
# Usage:
#   sudo ./deploy/install.sh
#   sudo ./deploy/install.sh https://github.com/LGARRABOS/BookStorage-Discord.git
# ============================================================================

set -e

APP_NAME="bookstorage-discord"
APP_DIR="/opt/bookstorage-discord"
APP_USER="bookstorage"
APP_GROUP="bookstorage"
REPO_URL="${1:-https://github.com/LGARRABOS/BookStorage-Discord.git}"
SERVICE_NAME="bookstorage-discord"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
NC='\033[0m'

print_step() { printf "${BLUE}[$1]${NC} $2\n"; }
print_ok() { printf "${GREEN}✓ $1${NC}\n"; }
print_warn() { printf "${YELLOW}⚠ $1${NC}\n"; }
die() { printf "${RED}✗ $1${NC}\n"; exit 1; }

if [ "$EUID" -ne 0 ]; then
	die "Exécuter en root : sudo ./deploy/install.sh"
fi

if command -v dnf &>/dev/null; then
	PKG_MGR="dnf"
elif command -v yum &>/dev/null; then
	PKG_MGR="yum"
elif command -v apt-get &>/dev/null; then
	PKG_MGR="apt-get"
else
	die "Gestionnaire de paquets non supporté (dnf/yum/apt-get)"
fi

printf "\n${BOLD}BookStorage-Discord — installation${NC}\n\n"

# --- Node.js 20+ (Debian/Ubuntu vs RHEL/Rocky/Alma) ---
install_nodejs() {
	if [ "$PKG_MGR" = "apt-get" ]; then
		curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
		apt-get install -y nodejs
		return
	fi

	# Rocky Linux, RHEL, AlmaLinux, CentOS — dépôt RPM NodeSource
	if curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -; then
		$PKG_MGR install -y nodejs
		return
	fi

	print_warn "NodeSource RPM indisponible — tentative module dnf nodejs:20..."
	$PKG_MGR module reset nodejs -y 2>/dev/null || true
	$PKG_MGR module enable nodejs:20 -y 2>/dev/null || true
	$PKG_MGR install -y nodejs npm
}

print_step "1/6" "Vérification de Node.js 20+..."
need_node_install=false
if command -v node &>/dev/null; then
	NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
	if [ "$NODE_MAJOR" -lt 20 ] 2>/dev/null; then
		need_node_install=true
	fi
else
	need_node_install=true
fi

if [ "$need_node_install" = true ]; then
	print_warn "Node.js 20+ requis — installation ($PKG_MGR)..."
	install_nodejs
fi
command -v node &>/dev/null || die "node introuvable après installation"
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 20 ] 2>/dev/null; then
	die "Node.js 20+ requis (version actuelle : $(node -v))"
fi
print_ok "Node $(node -v)"

# --- Utilisateur bookstorage (réutilise celui de BookStorage si présent) ---
print_step "2/6" "Utilisateur système..."
if ! id "$APP_USER" &>/dev/null; then
	useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER" 2>/dev/null \
		|| useradd --system --home-dir "$APP_DIR" --shell /sbin/nologin "$APP_USER"
	print_ok "Utilisateur $APP_USER créé"
else
	print_ok "Utilisateur $APP_USER existant (souvent créé par BookStorage)"
fi

# --- Dépendances build (better-sqlite3) ---
print_step "3/6" "Outils de compilation (better-sqlite3)..."
if [ "$PKG_MGR" = "apt-get" ]; then
	apt-get update -qq
	apt-get install -y git build-essential python3
else
	$PKG_MGR install -y git gcc-c++ make python3 python3-devel
fi
print_ok "Dépendances système OK"

# --- Clone / mise à jour ---
print_step "4/6" "Code source dans $APP_DIR..."
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

if [ -d "$APP_DIR/.git" ]; then
	if ! git -C "$APP_DIR" pull --ff-only origin main; then
		print_warn "git pull root échoué — tentative en tant que $APP_USER..."
		sudo -u "$APP_USER" git -C "$APP_DIR" pull --ff-only origin main \
			|| die "git pull impossible dans $APP_DIR (safe.directory / droits)"
	fi
else
	git clone "$REPO_URL" "$APP_DIR"
	git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
fi
mkdir -p "$APP_DIR/data"
chown -R "$APP_USER:$APP_GROUP" "$APP_DIR"
print_ok "Dépôt à jour"

# --- Build (toujours en tant que bookstorage, dans $APP_DIR) ---
print_step "5/6" "npm ci && build (utilisateur $APP_USER)..."
run_as_app() {
	sudo -u "$APP_USER" bash -c "cd '$APP_DIR' && $*"
}
run_as_app "npm ci"
run_as_app "npm run build"
[ -f "$APP_DIR/dist/index.js" ] || die "Build échoué : $APP_DIR/dist/index.js introuvable"
[ -f "$APP_DIR/dist/preflight.js" ] || die "Build échoué : $APP_DIR/dist/preflight.js introuvable"
print_ok "Build terminé"

# --- .env minimal si absent ---
if [ ! -f "$APP_DIR/.env" ]; then
	ENC_KEY="$(openssl rand -base64 32)"
	cat >"$APP_DIR/.env" <<EOF
# Compléter avant de démarrer (voir README — Portail Discord)
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
# Serveur de test : ID du serveur Discord (commandes instantanées)
# DISCORD_GUILD_ID=

# Même URL publique que BOOKSTORAGE_PUBLIC_ORIGIN (sans slash final)
BOOKSTORAGE_BASE_URL=https://books.example.com

LINK_DB_PATH=$APP_DIR/data/links.db
TOKEN_ENCRYPTION_KEY=$ENC_KEY
DEFAULT_LOCALE=fr
EOF
	chmod 600 "$APP_DIR/.env"
	print_warn ".env créé avec TOKEN_ENCRYPTION_KEY généré — renseignez DISCORD_* et BOOKSTORAGE_BASE_URL"
else
	print_ok ".env existant conservé"
fi

chown -R "$APP_USER:$APP_GROUP" "$APP_DIR"
print_step "6/6" "Service systemd..."
cp "$APP_DIR/deploy/bookstorage-discord.service" "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
print_ok "Service ${SERVICE_NAME} installé (pas encore démarré)"

printf "\n${GREEN}${BOLD}Installation terminée.${NC}\n\n"
printf "Prochaines étapes :\n"
printf "  1. Éditer ${BOLD}$APP_DIR/.env${NC} (token Discord, CLIENT_ID, BOOKSTORAGE_BASE_URL)\n"
printf "  2. En tant que $APP_USER : enregistrer les commandes slash\n"
printf "       sudo -u $APP_USER bash -c 'cd $APP_DIR && npm run register-commands'\n"
printf "  3. Vérifier : ${BOLD}sudo -u $APP_USER bash -c 'cd $APP_DIR && npm run preflight'${NC}\n"
printf "  4. Démarrer : ${BOLD}systemctl start $SERVICE_NAME${NC}\n"
printf "  5. Logs : ${BOLD}journalctl -u $SERVICE_NAME -f${NC}\n"
printf "\n${YELLOW}Note :${NC} le service utilise ${BOLD}$APP_DIR${NC}, pas un clone dans /tmp.\n\n"

#!/bin/bash
# Mise à jour du bot dans /opt/bookstorage-discord (git pull + build + restart optionnel)
# Usage: sudo ./deploy/update.sh [--restart]
set -e

APP_DIR="/opt/bookstorage-discord"
APP_USER="bookstorage"
SERVICE_NAME="bookstorage-discord"
DO_RESTART=false
[ "${1:-}" = "--restart" ] && DO_RESTART=true

if [ "$EUID" -ne 0 ]; then
	echo "Exécuter en root : sudo ./deploy/update.sh [--restart]" >&2
	exit 1
fi

[ -d "$APP_DIR/.git" ] || {
	echo "Installation absente. Lancez d'abord : sudo bash deploy/install.sh" >&2
	exit 1
}

echo "Mise à jour dans $APP_DIR..."
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
git -C "$APP_DIR" pull --ff-only origin main \
	|| sudo -u "$APP_USER" git -C "$APP_DIR" pull --ff-only origin main
chown -R "$APP_USER:$APP_GROUP" "$APP_DIR"
sudo -u "$APP_USER" bash -c "cd '$APP_DIR' && npm ci && npm run build"
[ -f "$APP_DIR/dist/index.js" ] || { echo "Build échoué." >&2; exit 1; }

cp "$APP_DIR/deploy/bookstorage-discord.service" "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl daemon-reload

if [ "$DO_RESTART" = true ]; then
	systemctl restart "$SERVICE_NAME"
	systemctl status "$SERVICE_NAME" --no-pager || true
else
	echo "Build OK. Redémarrer : systemctl restart $SERVICE_NAME"
fi

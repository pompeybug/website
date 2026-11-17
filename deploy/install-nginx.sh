#!/bin/bash
# Run on the VPS:  sudo bash deploy/install-nginx.sh [domain]
# The domain defaults to the staging address, bike.mgd.scot. Run it again with
# pompey.bike once that name points at this server.
#
# Two-phase, and safe to re-run:
#   1. Until a certificate exists, install an HTTP-only vhost (ACME challenge
#      + proxy). If the domain does not resolve here yet, stop there.
#   2. Get the certificate (webroot) and install the full HTTPS vhost from
#      site.nginx.conf.
# nginx -t runs before every reload.
set -euo pipefail

DOMAIN="${1:-bike.mgd.scot}"
PORT=3120
HERE="$(cd "$(dirname "$0")" && pwd)"
AVAILABLE=/etc/nginx/sites-available/$DOMAIN
ENABLED=/etc/nginx/sites-enabled/$DOMAIN
CERT=/etc/letsencrypt/live/$DOMAIN/fullchain.pem

reload() { nginx -t && systemctl reload nginx; }

resolves_here() {
  local mine theirs
  mine=$(curl -fsS4 --max-time 10 https://api.ipify.org || hostname -I | awk '{print $1}')
  theirs=$(dig +short A "$1" @1.1.1.1 | tail -n1)
  [ -n "$theirs" ] && [ "$theirs" = "$mine" ]
}

if [ ! -f "$CERT" ]; then
  cat > "$AVAILABLE" <<CONF
# Temporary HTTP-only vhost for $DOMAIN, in place until the certificate is issued.
# Re-run deploy/install-nginx.sh once DNS points at this box.
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    client_max_body_size 25m;

    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection        "";
    }
}
CONF
  ln -sfn "$AVAILABLE" "$ENABLED"
  reload

  if ! resolves_here "$DOMAIN"; then
    echo "HTTP-only vhost installed. $DOMAIN does not point at this server yet:"
    echo "set its A record to this box, then run this script again for HTTPS."
    exit 0
  fi

  certbot certonly --webroot -w /var/www/html -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --keep-until-expiring
fi

sed "s/__DOMAIN__/$DOMAIN/g" "$HERE/site.nginx.conf" > "$AVAILABLE"
ln -sfn "$AVAILABLE" "$ENABLED"
reload
echo "HTTPS vhost for $DOMAIN is live."

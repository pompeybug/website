#!/bin/bash
# Run on the VPS:  sudo bash deploy/install-nginx.sh [domain] [alias ...]
#
#   sudo bash deploy/install-nginx.sh                              staging, bike.mgd.scot
#   sudo bash deploy/install-nginx.sh pompey.bike www.pompey.bike  the real site
#
# The first name is the site. Any further names are aliases: they share its
# certificate and only redirect to it.
#
# Safe to re-run, and it does as much as DNS allows each time:
#   1. Install a vhost that answers the ACME challenge on port 80 for every
#      name (HTTP-only if there is no certificate yet).
#   2. Get or extend the certificate (webroot) for the names that point at
#      this server. Names that do not are listed, and left on port 80 only.
#   3. Install the HTTPS vhost from site.nginx.conf, plus redirects for the
#      aliases.
# nginx -t runs before every reload.
set -euo pipefail

DOMAIN="${1:-bike.mgd.scot}"
ALIASES=("${@:2}")
PORT=3120
HERE="$(cd "$(dirname "$0")" && pwd)"
# Overridable so the script can be exercised away from the server.
NGINX_ETC="${NGINX_ETC:-/etc/nginx}"
LE_LIVE="${LE_LIVE:-/etc/letsencrypt/live}"
AVAILABLE=$NGINX_ETC/sites-available/$DOMAIN
ENABLED=$NGINX_ETC/sites-enabled/$DOMAIN
CERT=$LE_LIVE/$DOMAIN/fullchain.pem

reload() { nginx -t && systemctl reload nginx; }

MY_IP=""
resolves_here() {
  local theirs
  [ -n "$MY_IP" ] || MY_IP=$(curl -fsS4 --max-time 10 https://api.ipify.org || hostname -I | awk '{print $1}')
  theirs=$(dig +short A "$1" @1.1.1.1 | tail -n1)
  [ -n "$theirs" ] && [ "$theirs" = "$MY_IP" ]
}

# Names the current certificate covers, one per line (nothing if no certificate).
cert_names() {
  [ -f "$CERT" ] || return 0
  openssl x509 -in "$CERT" -noout -ext subjectAltName | grep -o 'DNS:[^,]*' | cut -d: -f2 | tr -d ' '
}

in_cert() { cert_names | grep -qxF "$1"; }

# Before any certificate: everything over HTTP, so the challenge can be answered.
http_only_vhost() {
  cat <<CONF
# Temporary HTTP-only vhost for $DOMAIN, in place until the certificate is issued.
# Re-run deploy/install-nginx.sh once DNS points at this box.
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN${ALIASES[@]+ ${ALIASES[*]}};
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
}

# An alias only redirects to the site. It gets an HTTPS block once the
# certificate covers it; until then it answers on port 80 alone.
alias_vhost() {
  cat <<CONF

# Alias: $1 redirects to $DOMAIN.
server {
    listen 80;
    listen [::]:80;
    server_name $1;

    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://$DOMAIN\$request_uri; }
}
CONF
  in_cert "$1" || return 0
  cat <<CONF

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $1;

    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    server_tokens off;
    return 301 https://$DOMAIN\$request_uri;
}
CONF
}

install_vhost() {
  if [ -f "$CERT" ]; then
    {
      sed "s/__DOMAIN__/$DOMAIN/g" "$HERE/site.nginx.conf"
      for name in ${ALIASES[@]+"${ALIASES[@]}"}; do alias_vhost "$name"; done
    } > "$AVAILABLE"
  else
    http_only_vhost > "$AVAILABLE"
  fi
  ln -sfn "$AVAILABLE" "$ENABLED"
  reload
}

# 1. Every name answers the challenge on port 80.
install_vhost

# 2. The certificate should cover what it covers now plus every name that
#    points here. It is never shrunk.
WANTED=()
WAITING=()
for name in "$DOMAIN" ${ALIASES[@]+"${ALIASES[@]}"}; do
  if in_cert "$name"; then continue; fi
  if resolves_here "$name"; then WANTED+=("$name"); else WAITING+=("$name"); fi
done

if [ ! -f "$CERT" ] && ! printf '%s\n' ${WANTED[@]+"${WANTED[@]}"} | grep -qxF "$DOMAIN"; then
  echo "HTTP-only vhost installed. $DOMAIN does not point at this server yet:"
  echo "set its A record to this box, then run this script again for HTTPS."
  exit 0
fi

if [ ${#WANTED[@]} -gt 0 ]; then
  ARGS=()
  while read -r name; do [ -n "$name" ] && ARGS+=(-d "$name"); done < <(cert_names)
  for name in "${WANTED[@]}"; do ARGS+=(-d "$name"); done
  certbot certonly --webroot -w /var/www/html --cert-name "$DOMAIN" "${ARGS[@]}" \
    --expand --non-interactive --agree-tos --register-unsafely-without-email
fi

# 3. The full HTTPS vhost, with whatever the certificate now covers.
install_vhost
echo "HTTPS vhost for $DOMAIN is live."
for name in ${ALIASES[@]+"${ALIASES[@]}"}; do
  in_cert "$name" && echo "$name redirects to https://$DOMAIN."
done
if [ ${#WAITING[@]} -gt 0 ]; then
  echo "Not covered yet, because they do not point at this server: ${WAITING[*]}"
  echo "Point them here, then run this script again with the same names."
fi

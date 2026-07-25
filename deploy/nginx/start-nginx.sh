#!/bin/sh
set -eu

certificate_file="/etc/letsencrypt/live/${API_DOMAIN}/fullchain.pem"
private_key_file="/etc/letsencrypt/live/${API_DOMAIN}/privkey.pem"
config_file="/etc/nginx/conf.d/default.conf"

certificate_marker() {
  if [ -f "$certificate_file" ] && [ -f "$private_key_file" ]; then
    resolved_certificate="$(readlink -f "$certificate_file")"
    stat -c '%Y:%s' "$resolved_certificate"
  else
    printf 'missing\n'
  fi
}

render_config() {
  if [ -f "$certificate_file" ] && [ -f "$private_key_file" ]; then
    template="/opt/dive/https.conf.template"
  else
    template="/opt/dive/http.conf.template"
  fi

  envsubst '${API_DOMAIN} ${API_UPSTREAM}' < "$template" > "$config_file"
}

render_config
current_marker="$(certificate_marker)"

(
  while sleep 60; do
    next_marker="$(certificate_marker)"
    if [ "$next_marker" != "$current_marker" ]; then
      render_config
      nginx -s reload
      current_marker="$next_marker"
    fi
  done
) &

exec nginx -g 'daemon off;'

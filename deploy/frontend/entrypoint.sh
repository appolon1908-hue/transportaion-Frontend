#!/bin/sh
set -eu

required() {
  name="$1"
  eval "value=\${$name:-}"
  if [ -z "$value" ]; then
    echo "ERROR=${name}_REQUIRED" >&2
    exit 1
  fi
  printf '%s' "$value"
}

safe_url() {
  name="$1"
  value="$2"
  case "$value" in
    https://*) ;;
    *) echo "ERROR=${name}_HTTPS_REQUIRED" >&2; exit 1 ;;
  esac
  if printf '%s' "$value" | grep -Eq '["\\[:space:]]|://[^/]*@|[?#]'; then
    echo "ERROR=${name}_UNSAFE" >&2
    exit 1
  fi
}

safe_token() {
  name="$1"
  value="$2"
  if ! printf '%s' "$value" | grep -Eq '^[A-Za-z0-9._-]+$'; then
    echo "ERROR=${name}_INVALID" >&2
    exit 1
  fi
}

safe_scope() {
  value="$1"
  if ! printf '%s' "$value" | grep -Eq '^[A-Za-z0-9._:-]+( [A-Za-z0-9._:-]+)*$'; then
    echo "ERROR=OIDC_SCOPE_INVALID" >&2
    exit 1
  fi
  case " $value " in
    *" openid "*) ;;
    *) echo "ERROR=OIDC_OPENID_SCOPE_REQUIRED" >&2; exit 1 ;;
  esac
}

APP_ENVIRONMENT="$(required APP_ENVIRONMENT)"
PUBLIC_API_BASE_URL="$(required PUBLIC_API_BASE_URL)"
PORTAL_PUBLIC_ORIGIN="$(required PORTAL_PUBLIC_ORIGIN)"
OIDC_ISSUER="$(required OIDC_ISSUER)"
OIDC_CLIENT_ID="$(required OIDC_CLIENT_ID)"
OIDC_SCOPE="${OIDC_SCOPE:-openid profile email}"
REQUEST_TIMEOUT_MS="${REQUEST_TIMEOUT_MS:-20000}"

safe_token APP_ENVIRONMENT "$APP_ENVIRONMENT"
safe_url PUBLIC_API_BASE_URL "$PUBLIC_API_BASE_URL"
safe_url PORTAL_PUBLIC_ORIGIN "$PORTAL_PUBLIC_ORIGIN"
safe_url OIDC_ISSUER "$OIDC_ISSUER"
safe_token OIDC_CLIENT_ID "$OIDC_CLIENT_ID"
safe_scope "$OIDC_SCOPE"

case "$REQUEST_TIMEOUT_MS" in
  ''|*[!0-9]*) echo "ERROR=REQUEST_TIMEOUT_MS_INVALID" >&2; exit 1 ;;
esac
if [ "$REQUEST_TIMEOUT_MS" -lt 5000 ] || [ "$REQUEST_TIMEOUT_MS" -gt 60000 ]; then
  echo "ERROR=REQUEST_TIMEOUT_MS_OUT_OF_RANGE" >&2
  exit 1
fi

PUBLIC_API_BASE_URL="${PUBLIC_API_BASE_URL%/}"
PORTAL_PUBLIC_ORIGIN="${PORTAL_PUBLIC_ORIGIN%/}"
OIDC_ISSUER="${OIDC_ISSUER%/}"

umask 022
TEMP_FILE="$(mktemp /tmp/runtime-config.XXXXXX)"
trap 'rm -f "$TEMP_FILE"' EXIT
cat > "$TEMP_FILE" <<EOF
window.__FREIGHT_CONFIG__ = Object.freeze({
  environment: "$APP_ENVIRONMENT",
  appName: "Freight Platform",
  apiBaseUrl: "$PUBLIC_API_BASE_URL",
  oidcIssuer: "$OIDC_ISSUER",
  oidcClientId: "$OIDC_CLIENT_ID",
  oidcRedirectUri: "$PORTAL_PUBLIC_ORIGIN/auth/callback",
  oidcPostLogoutRedirectUri: "$PORTAL_PUBLIC_ORIGIN/",
  oidcScope: "$OIDC_SCOPE",
  requestTimeoutMs: $REQUEST_TIMEOUT_MS
});
EOF

install -m 0644 "$TEMP_FILE" /usr/share/nginx/html/runtime-config.js
rm -f "$TEMP_FILE"
trap - EXIT

exec nginx -g 'daemon off;'

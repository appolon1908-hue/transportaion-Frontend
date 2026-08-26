import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')

const oidc = read('src/portal/auth/oidc.ts')
const session = read('src/portal/auth/session.ts')
const client = read('src/portal/api/client.ts')
const runtime = read('public/runtime-config.js')
const nginx = read('deploy/frontend/nginx.portal.conf')
const dockerfile = read('deploy/frontend/Dockerfile.portal')
const entrypoint = read('deploy/frontend/entrypoint.sh')

assert.match(oidc, /code_challenge_method:\s*'S256'/)
assert.match(oidc, /OIDC_STATE_MISMATCH/)
assert.match(oidc, /OIDC_NONCE_MISMATCH/)
assert.match(oidc, /OIDC_DISCOVERY_ISSUER_MISMATCH/)
assert.doesNotMatch(oidc, /client_secret/i)

assert.doesNotMatch(session, /localStorage/)
assert.match(session, /sessionStorage\.setItem\(SELECTED_TENANT_KEY/)
assert.match(session, /Tokens intentionally exist only in JavaScript memory/)
assert.match(session, /\/api\/v1\/auth\/me/)
assert.match(session, /\/api\/v1\/auth\/context/)

assert.match(client, /headers\.set\('Idempotency-Key'/)
assert.match(client, /headers\.set\('If-Match'/)
assert.match(client, /safeRead.*maximumAttempts/s)
assert.match(client, /mutations:[\s\S]*retry:\s*false|maximumAttempts = safeRead/)
assert.match(client, /credentials:\s*'omit'/)
assert.match(client, /redirect:\s*'error'/)

assert.match(runtime, /__RUNTIME_REQUIRED__/)
assert.doesNotMatch(runtime, /secret\s*:/i)
assert.match(entrypoint, /OIDC_OPENID_SCOPE_REQUIRED/)
assert.match(entrypoint, /install -m 0644/)

assert.match(nginx, /listen 8080/)
assert.match(nginx, /location = \/runtime-config\.js/)
assert.match(nginx, /Cache-Control "no-store, max-age=0"/)
assert.match(nginx, /Content-Security-Policy/)
assert.match(nginx, /frame-ancestors 'none'/)

assert.match(dockerfile, /ARG NODE_IMAGE/)
assert.match(dockerfile, /ARG NGINX_IMAGE/)
assert.match(dockerfile, /USER nginx/)
assert.match(dockerfile, /vue-tsc/)
assert.match(dockerfile, /vite -- build --config vite\.portal\.config\.ts/)

console.log('PORTAL_CONTRACT=PASS')

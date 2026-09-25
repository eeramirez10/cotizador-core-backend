# Cotizador staging

Staging runs beside production. It must never point at the production Neon branch,
Docker volumes, Redis, AI PostgreSQL, Firebase project, or WhatsApp sender.
`compose.staging.yaml` keeps the core and AI services on their own Docker network,
with host ports 4610 and 4710 and staging-only named volumes.

## Prerequisites

- Check out compatible core and AI revisions as sibling directories under `/srv/apps`.
- Create a dedicated Neon branch with the current Prisma schema. Use synthetic
  data, or mask personal and fiscal data before exposing a production clone.
  `backup-predeploy-20260924` is a recovery branch, not the staging database.
- Create a separate Firebase project with Hosting enabled for the staging UI.
- Have a stable public HTTPS endpoint for the two reverse-proxy paths below.
- Register a dedicated WhatsApp sender in Twilio for staging. It must be a
  different number from the production sender. Do not change the production
  sender's webhook.

## Configure secrets

On the server, copy these templates without committing the resulting files:

```sh
cd /srv/apps/cotizador-core-backend
cp .env.staging.example .env.staging
cd /srv/apps/tuvansa-ai-platform
cp .env.staging.example .env.staging
cp .env.staging.postgres.example .env.staging.postgres
chmod 600 .env.staging .env.staging.postgres
```

Set the core `STAGING_DATABASE_URL` to the staging Neon branch, never production. Use
separate JWT and document-signing secrets. Set the AI `DATABASE_URL` to its
staging PostgreSQL container and use the same password as
`.env.staging.postgres`. The core `AI_PLATFORM_INTERNAL_API_KEY` must equal the
AI `INTERNAL_API_KEY`; the core `WHATSAPP_ASSISTANT_INTERNAL_API_KEY` must equal
AI `CORE_BACKEND_ASSISTANT_API_KEY`. Never paste these values into chat.

Keep `PINECONE_API_KEY` and `URL_MYSQL` empty initially. If semantic search is
needed later, use a separate Pinecone index/namespaces and verify that ERP
access is read-only. Set `STAGING_TWILIO_ALLOWED_RECIPIENTS` to comma-separated
E.164 test phones. In staging, all WhatsApp and Verify SMS sends fail closed
unless the recipient is in this list. The Compose file maps the staging-only
sender and template variables to the application's Twilio settings. Leave
them empty, and keep `TWILIO_WHATSAPP_ENABLED=false`, until the dedicated
number is active. SMS verification remains disabled in staging.

## Reverse proxy

Add these locations to the existing HTTPS server block. Preserve the trailing
slashes: they remove the staging prefix before forwarding to Express.

```nginx
location /cotizador-staging/ {
    proxy_pass http://127.0.0.1:4610/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
location /ia-staging/ {
    proxy_pass http://127.0.0.1:4710/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Use `PUBLIC_API_URL=https://STAGING_PUBLIC_HOST/cotizador-staging` in the core
`.env.staging`. This URL is also used for Twilio signature validation and signed
PDF links. Check the Nginx config with `nginx -t` before reloading it.

## Validate and start

The first command validates Compose only. The second prints just the database
host and refuses the known current production host; inspect the host yourself
as well if production has changed since this document was written.

```sh
cd /srv/apps/cotizador-core-backend
docker compose --env-file .env.staging -f compose.staging.yaml config -q
docker compose --env-file .env.staging --profile maintenance -f compose.staging.yaml build
docker compose --env-file .env.staging --profile maintenance -f compose.staging.yaml run --rm --no-deps core-migrate \
  node -e 'const h=new URL(process.env.DATABASE_URL).hostname; console.log("Staging Neon host:",h); if(h.includes("ep-cold-queen-aiakczbm")) process.exit(2)'
docker compose --env-file .env.staging -f compose.staging.yaml up -d redis postgres
docker compose --env-file .env.staging --profile maintenance -f compose.staging.yaml run --rm ai-migrate
docker compose --env-file .env.staging --profile maintenance -f compose.staging.yaml run --rm --no-deps core-migrate
docker compose --env-file .env.staging -f compose.staging.yaml up -d
docker compose --env-file .env.staging -f compose.staging.yaml ps
```

Expected health endpoints: `http://127.0.0.1:4610/api/health` and
`http://127.0.0.1:4710/health/ready`. Check that the public staging PDF sample
returns `200 application/pdf` before configuring Twilio.

## Frontend

In `/Users/erick/Code/tuvansa/cotizador-v2`, copy `.env.staging.example` to
`.env.staging` and replace the public host. Keep `VITE_ERP_API_URL` empty until
a staging-safe ERP endpoint is available. The validator requires HTTPS and the
staging paths. To deploy, set a Firebase project ID different from production:

```sh
npm ci
FIREBASE_STAGING_PROJECT_ID=YOUR_STAGING_PROJECT npm run deploy:staging
```

The staging build shows a permanent `STAGING | DATOS DE PRUEBA` marker.
Deploying with the production Firebase project ID is refused.

## Dedicated staging WhatsApp sender

After the staging APIs and UI work, configure **only the new sender's** inbound
webhook in Twilio as:

```text
https://STAGING_PUBLIC_HOST/cotizador-staging/api/integrations/twilio/whatsapp/incoming
```

Use HTTP POST. Verify that staging's admin settings have inbox and assistant
disabled first; a cloned database may contain settings that override the
environment defaults. In core `.env.staging`, set
`STAGING_TWILIO_WHATSAPP_FROM=whatsapp:+<NEW_NUMBER_IN_E164>`. Do not use the
production number or Sandbox number. Set the three
`STAGING_TWILIO_WHATSAPP_*_CONTENT_SID` values only after checking that the
approved templates and their media variables are valid for this sender.
Quotation templates use body variables 1-3 and media variable 4 by default.
Their Media URL must be
`https://STAGING_PUBLIC_HOST/cotizador-staging/api/public/quote-documents/{{4}}`
with `sample.pdf` as the sample for variable 4. Manager report templates
use body variables 1-6 and media variable 7; variable 7 is the signed PDF
**path**, not the complete URL. Their Media URL must be
`https://STAGING_PUBLIC_HOST/cotizador-staging/api/public/manager-reports/{{7}}`
with `sample.pdf` as the sample for variable 7. Use
`https://STAGING_PUBLIC_HOST/cotizador-staging/api/public/manager-reports/sample.pdf`
to check the sample. Both sample URLs must return `200 application/pdf`. Never
paste the production PDF URL into the staging templates.

The sender may share a Twilio account with production, but must have its own
number and inbound webhook. Keep `STAGING_TWILIO_ALLOWED_RECIPIENTS` limited
to test phones even with the real sender. Once the sender, templates, public
URLs, and allowlist are verified, set `TWILIO_WHATSAPP_ENABLED=true`, enable
inbox and assistant in staging's admin settings, and recreate only staging
`core` and `whatsapp-worker`. Send a new message from an allowlisted phone
to test the assistant, then test a quotation both inside and outside the
24-hour window. Outside the window, the approved media template is required.
Check Twilio's delivery status callback, not only the API acceptance response.
Never recreate production services for a staging setting.

## Release rule

Promote code and migrations from staging to production, never staging data.
Do not restore production from the old backup branch after tests. A staging
reset is confined to its own Neon branch and Docker volumes.

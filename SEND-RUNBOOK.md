# Sogni /Sync Newsletter — Send Runbook

**Last updated:** 2026-07-12. This captures the full SES newsletter pipeline set up in July 2026 (migration off Resend) and exactly how to send a /Sync issue. Ops details live in `sogni-api`; content lives here in `sogni-newsletters`.

---

## Current state (what's live)

- **Sender:** `Sogni Sync <news@news.sogni.ai>` — dedicated newsletter subdomain (2048-bit DKIM, custom MAIL FROM `bounce.news.sogni.ai`, aligned SPF/DMARC). Isolated from transactional mail on `mail.sogni.ai`.
- **Pipeline:** SES v2 raw-MIME sends via `sogni-consumer-prod`; Mongo-backed subscriber list + campaigns. Config in `sogni-api/ecosystem.config.js` (`NEWSLETTER_EMAIL_FROM`, `NEWSLETTER_SES_CONFIGURATION_SET='newsletter'`).
- **Subscriber list:** **65,722** subscribed on prod (Mongo `sogni-mainnet`, collection `newslettersubscribers`), imported from the 2026-07-04/12 Resend export (unsubscribes preserved). Priority = signup recency, so most-recent subscribers enqueue first.
- **Compliance:** RFC 8058 one-click unsubscribe (headers + in-body link), own suppression list checked before every send, **bounce/complaint auto-suppression wired** (SES config set → SNS topic `sogni-newsletter-ses-events` → `POST https://api.sogni.ai/v1/newsletter/ses-events?key=<NEWSLETTER_SNS_WEBHOOK_KEY>`, app auto-confirms).
- **Deliverability verified** to real Gmail: spf/dkim(aligned `news.sogni.ai`)/dmarc all pass; one-click unsubscribe + bounce suppression proven end-to-end.

## Prod access & where secrets live

- Prod box: `ssh ec2-user@sogni-api` (repo at `/home/ec2-user/repos/sogni-api/source`). Deploys need `ssh -A` (agent forwarding).
- Internal API (`/v1/internal/newsletter/*`) is gated by the `internal-api-key` header; the value is `INTERNAL_API_KEY` in the box `.env` (NOT pm2 env). Scripts read it via the app's own `dotenv` so the key is never printed.
- Mongo: app builds `mongodb://$MONGODB_HOST/$MONGODB_DB_NAME` (`MONGODB_HOST` in `.env`, `MONGODB_DB_NAME=sogni-mainnet` in ecosystem env — a standalone script must pass `MONGODB_DB_NAME=sogni-mainnet`).

---

## Sending an issue — 3 steps

### 1. Prepare the send-ready HTML (never edit the archive file for email)

`sogni-sync/N.html` is BOTH the emailed newsletter and the public web archive (`news.sogni.ai/sogni-sync/N.html`). Email-only transforms (UTMs, unsubscribe token) must NOT be baked into it — run `prepare-email.js` to a throwaway file instead:

```bash
node prepare-email.js sogni-sync/21.html /tmp/21.send.html sync-vol-21
```

This (a) swaps Resend's `{{{RESEND_UNSUBSCRIBE_URL}}}` → the pipeline's `{{UNSUBSCRIBE_URL}}`, and (b) adds `utm_source=newsletter&utm_medium=email&utm_campaign=<campaign>&utm_content=<destination>` to Sogni-owned page links only (skips media assets, social, fonts, unsubscribe). Output goes outside `sogni-sync/` so it can't get rsynced to the web (also gitignored via `*.send.html`).

Responsive/layout fixes DO belong in the canonical `sogni-sync/N.html` (they help the web archive too) — e.g. the "New Models" cards use `mcard-text`/`mcard-media` classes to stay side-by-side on phones instead of stacking.

### 2. Create the campaign (stores subject + HTML, status `draft`)

On the prod box, in `/home/ec2-user/repos/sogni-api/source` (key read via dotenv):

```bash
node -e '
require("dotenv/config");
const http=require("http"), fs=require("fs");
const html=fs.readFileSync("/tmp/21.send.html","utf-8");
const body=JSON.stringify({name:"sync-vol-21", subject:process.env.SUBJ, html});
const r=http.request({host:"127.0.0.1",port:8080,method:"POST",path:"/v1/internal/newsletter/campaigns",
  headers:{"internal-api-key":process.env.INTERNAL_API_KEY,"content-type":"application/json","content-length":Buffer.byteLength(body)}},
  res=>{let b="";res.on("data",c=>b+=c);res.on("end",()=>console.log(res.statusCode, b.slice(0,120)));});
r.write(body); r.end();
'  # set SUBJ first:  export SUBJ='3 days of free Sogni Unlimited renders, Krea 2 Turbo, Sogni Agent Skill and more!'
```

Note the returned `campaignId`. (Only create when the copy is final — the campaign stores a snapshot of the HTML.)

### 3. Trigger the send (ramped)

`POST /v1/internal/newsletter/campaigns/<id>/start` with `{limit: N}` enqueues the next N highest-priority subscribers (repeatable — each call claims the next wave). Omit `limit` to enqueue everyone remaining (capped by the daily quota, `NEWSLETTER_DAILY_QUOTA`, default 50,000/UTC-day; over-quota pauses and resumes next day on another `start`).

```bash
# one wave of N (repeat for the next wave):
curl -s -X POST "http://127.0.0.1:8080/v1/internal/newsletter/campaigns/<id>/start" \
  -H "internal-api-key: $KEY" -H "content-type: application/json" -d '{"limit":5000}'
```

Monitor: `GET /v1/internal/newsletter/campaigns/<id>` (per-campaign sent/failed/skipped) and `GET /v1/internal/newsletter/stats` (list-wide subscribed/unsubscribed/bounced/complained).

---

## Timing & warm-up (for best opens)

- **Best window:** Tue–Thu, ~9–11am in the timezone where most subscribers are. Confirm the exact sweet spot from past Resend open-rate data. **Next Tuesday = 2026-07-14.**
- **Fresh-subdomain warm-up (important):** `news.sogni.ai` has ~zero sending reputation. Do NOT blast all 65,722 cold. Ramp: a warm-up wave (a few thousand most-engaged) a day or two ahead, then the main send. If sending cold on the day, ramp within the day (e.g. `start {limit:10000}`, watch bounce/complaint/open ~1–2h, then continue). Keep complaint rate < 0.1% and hard-bounce < ~2%.

## Scheduling for a specific time (Tue 10am)

The pipeline sends immediately on `start` — there's no built-in scheduler. Options:
1. **Manual:** create the campaign (draft) ahead of time, then run the first `start` at 10am.
2. **`at` job on the box:** `echo 'curl ...start... -d "{\"limit\":10000}"' | at 10:00 2026-07-14`
3. **Ask the assistant** to run/schedule it — the tooling (`prepare-email.js`, send scripts, pre-check/cleanup) is already set up.

## Gotchas
- **Deploys:** `pm2 deploy` wrapper is unreliable here; use the manual bypass (`git reset --hard origin/<ref>` + `scripts/post-deploy.sh "<apps>" <env>` over `ssh -A`). Env-only changes: `pm2 startOrReload ecosystem.config.js --only <apps> --env <env> --update-env` (no rebuild). See `sogni-api` memory `prod-deploy-gotchas`.
- **Body limit:** API accepts up to 20mb JSON, so large HTML is fine.
- **Test sends:** send to specific addresses with a high `priority` + `limit` so only the test address is claimed; delete any address that wasn't already a real subscriber afterward (consent).
- **Staging mirror:** `sogni-staging` runs the same pipeline (`sogni-consumer-staging`, DB `sogni-staging`, ~65,705 subs) for isolated tests; unsubscribe links point at `api-staging.sogni.ai`.

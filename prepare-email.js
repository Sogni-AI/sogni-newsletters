#!/usr/bin/env node
/*
 * prepare-email.js — turn an archive newsletter (N.html) into a send-ready
 * email version for the Sogni SES pipeline, WITHOUT mutating the archive file.
 *
 * The files in this repo double as the public web archive
 * (news.sogni.ai/sogni-sync/N.html), so email-only changes must NOT be baked
 * into them — otherwise archive visitors get tagged as email clicks and the
 * unsubscribe placeholder renders literally in the browser. Run this at send
 * time to produce a throwaway N.send.html instead.
 *
 * It does two things:
 *   1) swaps Resend's {{{RESEND_UNSUBSCRIBE_URL}}} -> the pipeline's
 *      {{UNSUBSCRIBE_URL}} (substituted per-recipient at send time)
 *   2) adds UTM params to Sogni-owned PAGE links only, with utm_content per
 *      destination. Skips news.sogni.ai media assets, all non-sogni hosts
 *      (social, fonts, stores), mailto/tel, and the unsubscribe link.
 *
 * Usage (write the output OUTSIDE the synced dir — sogni-sync/ is rsynced to
 * the public archive, so a *.send.html left there could get published):
 *   node prepare-email.js sogni-sync/21.html /tmp/21.send.html sync-vol-21
 *   # then POST the resulting HTML as the campaign body via the API.
 */
const fs = require('fs');

const [, , inPath, outPath, campaign] = process.argv;
if (!inPath || !outPath || !campaign) {
  console.error('Usage: node prepare-email.js <in.html> <out.html> <utm_campaign>');
  process.exit(1);
}

let html = fs.readFileSync(inPath, 'utf-8');

// 1) unsubscribe placeholder: Resend -> Sogni pipeline
const unsubBefore = (html.match(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g) || []).length;
html = html.split('{{{RESEND_UNSUBSCRIBE_URL}}}').join('{{UNSUBSCRIBE_URL}}');

// 2) UTM tagging on Sogni-owned page links
const qualifies = (host) => (host === 'sogni.ai' || host.endsWith('.sogni.ai')) && host !== 'news.sogni.ai';
const contentTag = (url) => {
  const sub = url.hostname.replace(/^www\./, '') === 'sogni.ai'
    ? '' : url.hostname.replace(/^www\./, '').replace('.sogni.ai', '');
  const path = url.pathname.replace(/^\/|\/$/g, '');
  const frag = url.hash ? url.hash.slice(1) : '';
  const tag = [sub, ...path.split('/'), frag].filter(Boolean).join('-')
    .toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return tag || 'home';
};

const tagged = [];
const skipped = new Set();
html = html.replace(/href="([^"]+)"/g, (m, raw) => {
  let url;
  try { url = new URL(raw); } catch { return m; } // relative / template / mailto -> leave alone
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return m;
  if (!qualifies(url.hostname)) { skipped.add(url.hostname); return m; }
  const content = contentTag(url);
  url.searchParams.set('utm_source', 'newsletter');
  url.searchParams.set('utm_medium', 'email');
  url.searchParams.set('utm_campaign', campaign);
  url.searchParams.set('utm_content', content);
  tagged.push(content);
  return `href="${url.toString()}"`;
});

// 3) slim the payload: Gmail clips messages past ~102KB, hiding the footer and
// unsubscribe link behind "View entire message". Drop plain HTML comments
// (conditional <!--[if ...]> / <![endif]--> ones must survive — the hybrid video
// blocks depend on them), indentation, and blank lines.
const GMAIL_CLIP_BYTES = 102 * 1024;
const bytesBefore = Buffer.byteLength(html);
html = html
  .replace(/<!--[\s\S]*?-->/g, (c) => (/\[if |\[endif\]/.test(c) ? c : ''))
  .replace(/^[ \t]+/gm, '')
  .replace(/[ \t]+$/gm, '')
  .replace(/\n{2,}/g, '\n');
const bytesAfter = Buffer.byteLength(html);

fs.writeFileSync(outPath, html);

console.log(`Wrote ${outPath}`);
console.log(`  size: ${bytesBefore} -> ${bytesAfter} bytes${bytesAfter > GMAIL_CLIP_BYTES ? `  WARNING: over Gmail's ~${GMAIL_CLIP_BYTES} byte clip limit — footer/unsubscribe will be hidden` : ' (under Gmail clip limit)'}`);
console.log(`  unsubscribe placeholders swapped: ${unsubBefore} (remaining RESEND: ${(html.match(/RESEND_UNSUBSCRIBE_URL/g) || []).length})`);
console.log(`  links tagged: ${tagged.length} across ${new Set(tagged).size} utm_content values`);
console.log(`  hosts skipped: ${[...skipped].sort().join(', ')}`);

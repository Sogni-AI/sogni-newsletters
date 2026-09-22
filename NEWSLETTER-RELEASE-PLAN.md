# /Sync restart: Volumes 22 and 23

Prepared September 22, 2026, PT. Both editions are complete local drafts for review. No campaign has been created, scheduled or sent; no archive deployment has been performed.

| Edition | Proposed send, PT | Finished newsletter | Email body |
| --- | --- | --- | --- |
| 22 · September catch-up | Thursday, September 24 | [22.html](sogni-sync/22.html) | [22.send.html](delivery/22.send.html) |
| 23 · Worlds special | Thursday, October 1 | [23.html](sogni-sync/23.html) | [23.send.html](delivery/23.send.html) |

## Volume 22

**Subject:** Sogni Unlimited is taking off — and MiniMax H3 just went 2K

**Preheader:** Community-powered 2K video, your own LoRAs, new creative tools, and two worlds to explore.

**Lead:** H3's community-based second stage brings 2K to Unlimited. Follow with BYOL and Identity Edit, the expanded creative toolkit, Worlds, partner models, and the network economics making it possible. Close with the credited Infinity community spotlight.

The exact active-subscriber count is intentionally absent: “6,0000” has not been clarified as 6,000 or 60,000. The momentum story is complete without that figure. August launch credits are removed. Partner models remain explicitly separate Premium Spark purchases with plan discounts.

Mark's September 22 media selections: keep the original draft's 15-second MiniMax hero (`assets/22/hero.mp4`, 1344 × 768) at the top, with its original posters. The 2K coffee demonstrations stay linked from the feature text and CTA. Both original maciasux tessellation previews are restored in the credited community spotlight.

## Volume 23

**Subject:** We gave AI agents a creative department. They built two worlds.

**Preheader:** Play The Dream Thread and The Ninth Admission, then start a world with your own agent.

**Lead:** An invitation to play, followed by how eight creative models work together and a practical first step into building. The guided builder's scenes and paths are distinguished from the showcase's custom music, voice and collectible systems. The Ninth Admission is clearly labeled 18+ horror.

This edition stands alone; readers do not need to have read 22. If its send moves into September, change the October label and title before preparing the email again.

## Weekly rhythm

Continue each Thursday after October 1. Draft by Monday, choose the lead and freeze copy Tuesday, check the received test on Wednesday, send Thursday. Reuse live demos and blog reporting. Keep ordinary issues to 400–700 words; shorten an edition when necessary to keep the date.

| Edition | Target, PT | Editorial slot |
| --- | --- | --- |
| 24 | October 8 | September network results and worker dashboards, if a verified month-close report is available. Distinguish closed-month estimates from settled payouts. Otherwise lead with one useful creator workflow. |
| 25 | October 15 | Creative control: one BYOL / Identity Edit workflow and a credited community example. Refresh against that week's releases. |
| 26 onward | Every Thursday | One strong live story, up to three brief updates, and a useful thing to try. |

Keep a release inbox with seven fields: live date, reader benefit, source link, existing visual, audience, access/billing, next edition. Add entries as releases ship. Anything after Tuesday's copy freeze goes into the next issue; availability, price and offer corrections still get fixed before sending.

## Delivery and archive

The canonical HTML uses local poster images, published demo videos, and an archive footer. Prepared email bodies have absolute image URLs, campaign tracking and exactly one `{{UNSUBSCRIBE_URL}}` placeholder for the sender to personalize. They are ignored by Git and kept outside the publicly synced `sogni-sync/` folder.

Regenerate after any copy change:

```sh
mkdir -p delivery
node prepare-email.js sogni-sync/22.html delivery/22.send.html sync-vol-22
node prepare-email.js sogni-sync/23.html delivery/23.send.html sync-vol-23
```

The archive index is ready for Volume 22. Both editions use `assets/23/dust-city-loop.gif` as the sloth video fallback, so include that asset when publishing 22. Volume 23 also uses `assets/23/loading-hall-loop.gif` and the original `assets/23/dust-city.png` social image. Publish the finished page and all referenced new images before using an email body. For the second release, add this card before Volume 22 in `sogni-sync/index.html`:

```html
<div class="square coming-soon">
  <a href="23.html">
    <img src="assets/23/dust-city.png" alt="Agents built two worlds — Volume 23" />
    <div class="overlay">October '26 | Volume 23</div>
  </a>
</div>
```

The existing `coming-soon` class is the archive's card styling; it does not add that phrase to the card. Keep 23 out of the first release's public index. The finished local 23 remains available for review now.

For dispatch, use current campaign history, the consented/engaged audience, suppression data and a received test email. The July runbook's later engaged-cohort restriction supersedes its earlier broad-audience steps. The two campaigns need separate, nonoverlapping enqueue waves. A subscription count is not an email audience count.

## Verification

The rewrite has about 850 visible words in Volume 22 and 630 in Volume 23, including footer/navigation. Prepared bodies are approximately 29 KB and 21 KB. Local asset existence, absolute delivery URLs, campaign tracking, one personalized unsubscribe slot and preserved Outlook conditional comments are checked. The legacy Volume 21 unsubscribe format still prepares correctly. Sogni-owned page/media URLs passed HTTP checks; new newsletter-local assets are checked on disk and in the browser.

Chrome desktop and mobile previews are checked with published video playback and local posters. Local linked-poster previews also simulate video removal. Actual received Gmail, Outlook and Apple Mail messages still require the normal test send; a browser preview does not establish inbox rendering.

## Worlds teasers

Mark selected the two published loops on September 22, 2026 PT. Both editions now lead their Worlds feature with **A City Made of Art**, The Dream Thread's Burning Man scene: Simon on his scooter among the glowing art. Volume 23 replaces its static hospital image with **The loading hall**, the four yellow-suited figures featured on [How this was made](https://worlds.sogni.ai/how-this-was-made).

Both use the site's exact 2688 × 1536 MP4 deliveries with their original sound: eight seconds for the sloth loop and approximately five seconds for the loading hall. They autoplay muted, loop, and offer native sound controls plus a link into their respective adventures. Mark prefers actual video playback over a GIF as the main presentation. Preserve that choice in future revisions.

For clients that omit video, matching linked GIFs preserve each entire loop at 448 × 256 and eight frames per second: approximately 1.6 MB for the sloth and 0.8 MB for the loading hall. Original aspect ratios are retained; no fades or new AI media were added. The opening images also work as stills. The sloth loop's published receipt is `sogni-worlds/lib/home-films.json` (`dust-city`); the loading-hall delivery is the live making-of hero.

Published sources and the original draft findings are in [the audit](NEWSLETTER-22-AUDIT.md).

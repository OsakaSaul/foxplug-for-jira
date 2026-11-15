# FoxPlug for Jira: free Atlassian Marketplace listing pack (T2001, 2026-11-15)

> **READ THIS FIRST (T2028, 2026-11-15). List the NEW app, never the Codegeist one.** The Codegeist judges install the app `d28b29f7-29ac-41cc-8f79-efc69b579d78` through https://foxplug.com/jira/install. Atlassian says an app submitted for Marketplace listing, or one with a license in its manifest, can no longer be shared by installation link. So that app must NEVER be submitted. The Marketplace copy is a separate registered app, **`d71e9ca3-b426-4c9e-8d31-0e2a2908ba55`** (folder `marketplace-app/`: same code, scopes `read:jira-work` and `storage:app`, egress foxplug.com, no licensing block; deployed to production, not installed, not shared). Every Marketplace step below uses the NEW id.


Goal: list the app as a **Free** Marketplace app so the Codegeist 2026 bonus "Best Marketplace published app" ($1,500 x 6; "published or submitted for listing, link the listing or review ticket") and Jira buyers can reach it. Nothing here was submitted: creating the partner profile and submitting need Saul's Atlassian login.

Requirements were read on 2026-11-15 from developer.atlassian.com: getting-started, listing-forge-apps, building-your-presence-on-marketplace (the limits below), security-privacy-tab, security-requirements, app-approval-guidelines. The listing-fields page is dated 2020, so the Marketplace form may differ slightly; `listing.json` has every value, and `node scripts/check-marketplace.cjs` re-checks all limits and image sizes.

## What is in this folder

| File | Use |
|---|---|
| `listing.json` | Every text field: name, tagline, summary, details, 3 highlights, extras, release summary and notes, partner profile, URLs |
| `assets/icon-144.png`, `assets/partner-logo-144.png` | App logo and partner logo, 144x144 (the family fox-head brand file, resized, not redrawn) |
| `assets/banner-1120x548.png`, `assets/banner-560x274.png` | App banner, high-resolution and standard |
| `assets/highlight-N-*-1840x900.png` + `*-cropped-580x330.png` | The 3 required highlight screenshots and their cropped versions |
| `assets/extra-*-1840x900.png` (+ cropped) | 2 extra screenshots |
| `privacy-security-answers.md` | Answers for the Privacy and Security tab, each tied to the code |
| `../../scripts/render-marketplace.cjs`, `../../scripts/check-marketplace.cjs` | Re-render the images, re-check limits |

Live pages created for the listing (in the lcncagents repo, commit fd97ac92): https://foxplug.com/jira/privacy and https://foxplug.com/jira/support (both 200). The EULA/terms URL is the existing https://foxplug.com/legal/terms.

## Honest gaps

1. **The screenshots are mockups** rendered from the app's own wording (each carries a small "Mockup" line in its footer). Atlassian's rule is that the app must do what the listing says; it does, but real captures are better. 5 minutes for Saul: open https://foxplug-dev.atlassian.net, open a project, **Shipped this week (FoxPlug)**, capture the page at 1840x900 and replace `highlight-1`. Free apps do not require marketing assets, so the listing is not blocked on this.
2. Production state: `forge deploy list` shows the latest production deployment (major version 2) on 2026-11-14 04:00 UTC, after the last source change (2026-11-14 01:57 UTC); `forge install list` shows production installed on foxplug-dev.atlassian.net, up to date; `forge lint` reports no issues. So no new `forge deploy -e production` was needed. (Forge CLI 15.1.0 installed globally for this check; it needs Node 22, used from C:\Users\ritekit\tools\node22.)
3. The free-app rule "useful function as is; a required third-party account must be clearly stated": the closed-issues page works with no FoxPlug account; only Send needs a free FoxPlug account, and the listing text says so.
4. Review time: Atlassian says about 5 to 10 business days (listing page) and 10 to 15 business days with several rounds (approval guidelines). The Devpost deadline is 2026-12-22, so submit this week.

## Saul's click-by-click list (only you can do these)

1. Go to https://marketplace.atlassian.com and sign in with osaka.saul@gmail.com (the account that owns the Forge app).
2. Profile menu, **Manage vendor account**. If there is no vendor yet: enter FoxPlug's organisation and contact details (name FoxPlug, the Osaka address from https://foxplug.com/legal/terms, hello@foxplug.com), press **Create vendor**. Paste partner name and description from `listing.json`, upload `partner-logo-144.png`.
3. Make sure one contact on the partner profile is registered on https://community.developer.atlassian.com (Atlassian requires it). If not, sign in there once with the same account.
4. Open https://developer.atlassian.com/console/myapps/d71e9ca3-b426-4c9e-8d31-0e2a2908ba55 , **Distribution**: turn sharing on and publish the developer space if it asks (Atlassian's listing steps require this).
5. In the Marketplace press **Publish new app** (the app creation form), choose Forge, link the app by that ID, choose payment model **Free**, accept the Marketplace Partner Agreement.
6. Paste the text fields from `listing.json` (name, tagline, summary, more details, release summary, release notes), the three highlights (title, summary, caption, screenshot and cropped screenshot each), the 2 extras, upload `icon-144.png` and the banner. Support/documentation/tracker URLs are in `listing.json` (`urls`). Pick the closest category.
7. **Privacy and security** tab: answer from `privacy-security-answers.md`. Privacy policy link: https://foxplug.com/jira/privacy. For the end-user agreement either link https://foxplug.com/legal/terms or adopt Atlassian's customizable end-user agreement (your choice).
8. In the console, the submission form asks for each API scope and the remote host: scope `read:jira-work` (reads the issues closed in the last 7 days of the open project); `storage:app` (settings and the key as a secret); host `foxplug.com` (issue keys and titles sent only when Send is pressed).
9. Press **Submit for review**. Copy the listing or review-ticket URL.
10. Tell Claude the URL: it will add the row to the outreach ledger, paste the bonus text into the Devpost entry text, and set the Devpost bonus line.

## Ledger

Checked `outreach_ledger` on 2026-11-15: no Atlassian Marketplace row existed, so nothing to redo. Add one after step 9 (status submitted, URL, next check about 10 business days later).

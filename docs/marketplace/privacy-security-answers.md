# Privacy and Security tab answers (T2001), checked against the code on 2026-11-15

Source files: `manifest.yml`, `src/index.js`, `src/lib.js`. Atlassian says the tab is not mandatory but encourages it, answers go live at once and are not reviewed by Atlassian, and the old Security Self Assessment is deprecated (13 Aug 2023), so these are the tab's questions.

| Question on the tab | Answer | Evidence |
|---|---|---|
| Store End-User Data outside Atlassian? | **Yes.** Issue keys and titles that someone chose to send, kept as one draft work record in the sender's FoxPlug account. | `sendToFoxPlug` in src/index.js; `recordWorkBody` in src/lib.js (`record_work`, `from_app: 'jira'`) |
| Process End-User Data outside Atlassian or the browser? | **Yes**, same data (issue keys and titles); the project display name is added to the summary text. May be passed to AI service providers to write the summary and score; listed in the general policy. | README "What the app can see and send"; https://foxplug.com/jira/privacy |
| Remote REST APIs exposed? | **No.** The app has no inbound endpoints; it only calls foxplug.com. | manifest.yml has only a project page and a resolver function |
| Data residency supported? | **No** (not an Atlassian data-residency app). FoxPlug's own database is in Mumbai, India. `inScopeEUD: true` is set on the foxplug.com egress. | manifest.yml permissions.external.fetch.backend |
| GDPR role | **Data processor** (suggested; Saul to confirm the legal position) for what a customer sends on instruction of the customer's own FoxPlug account owner; FoxPlug (Saul Fleischman) is controller for its own account data. | https://foxplug.com/legal/privacy ("data controller") |
| Compliance certifications | None. | |
| Privacy policy link | https://foxplug.com/jira/privacy (general: https://foxplug.com/legal/privacy) | live, 200 |
| Log End-User Data? | **No.** Error logs carry the error name and a short message only, never the key or the payload. | `safe()` in src/index.js |
| Share End-User Data with third parties? | Sent data is processed by FoxPlug's hosting and AI service providers listed under "Service providers we use" at https://foxplug.com/legal/privacy (section "Service providers we use"; use that page as the public sub-processor list). Not sold. | legal/privacy.html |
| Share logs with third parties? | No. | |
| Store End-User Data after uninstall? | **Yes**: what was already sent stays in the FoxPlug account until its owner deletes it or the account; no automatic expiry (min 0, max: until deleted). | https://foxplug.com/jira/privacy "Keeping and deleting" |
| Custom retention period? | On request by email (privacy@mentionfox.com). | |
| Privacy-enhancing technologies? | Redaction of secret-shaped text before storing a record. | lcnc-mcp record_work ("secret-shaped text was redacted") |
| CCPA | Service provider for customer-sent data. | |
| DPA? | No separate DPA yet. Terms: https://foxplug.com/legal/terms. | |
| EEA transfer mechanism | Data goes to India and the US-based providers; the general policy governs. If you want Standard Contractual Clauses named here, that needs a short legal text from Saul. | |
| Security contact email | hello@foxplug.com | |
| Security policy link | https://foxplug.com/jira/privacy#security (the Security section) | |
| CAIQ Lite | No. | |
| Full disk encryption at rest outside Atlassian? | Yes: FoxPlug's database and secrets are hosted on Supabase (encrypted at rest by the provider). | |
| Access Atlassian PATs, passwords or shared secrets? | **No.** The only secret is the FoxPlug agent key, kept with `kvs.setSecret`. | src/index.js `setSecret` |
| Scope justification | `read:jira-work`: list the issues of the open project resolved in the last 7 days (JQL `statusCategory = Done AND resolved >= -7d`, max 25, fields summary, issuetype, resolutiondate), as the signed-in person (`asUser`). `storage:app`: the chosen FoxPlug project name, an optional changelog name, and the agent key as a secret. | src/index.js `loadShipped`, `saveSettings` |

## Security requirements checklist (security-requirements page)

- Default to `asUser()`: yes, the only Jira call is `api.asUser().requestJira`. No `asApp`.
- Least privilege scopes: one read scope plus app storage.
- Secrets in `kvs.setSecret` only: yes; never returned to the page; never logged.
- No child processes or arbitrary code: none. Runtime nodejs22.x. `forge lint`: no issues.
- Egress: one declared host, foxplug.com, `inScopeEUD: true`. It is FoxPlug's own domain with valid TLS. The remote side (FoxPlug MCP endpoint) authenticates by the agent key; it is not a Forge remote, so Forge Invocation Tokens do not apply.
- Dependencies: only @forge/* packages. `npm audit --omit=dev` (2026-11-15): moderate findings only, all through the Forge packages' own tooling (glob via @forge/manifest); none critical or high. The fix offered is a breaking @forge/react 12 upgrade, left for after approval.

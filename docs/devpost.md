# Devpost submission pack: FoxPlug for Jira (Codegeist 2026)

Paste each block into the matching field of https://codegeist2026.devpost.com/ . Checked against the official page on 2026-11-14.

## 0. Official form, as read on 2026-11-14

- Deadline: **Dec 22, 2026 @ 12:00pm PST** (Devpost shows "December 22 at 3:00pm EST"). Submit before it.
- Requirement: an app on Atlassian's Forge platform that integrates with at least one of Jira, Confluence, Jira Service Management, Bitbucket, Teamwork Graph, Rovo, in one of three categories: Apps for Software Teams, Apps for Business Teams, Apps for Specialized Industries.
- What to submit (the four items the page lists, then the form):
  1. **Access**: an installation link for the judges, with instructions (create it from Developer Console > Distribution; see section 11).
  2. **Demo video**: under 5 minutes, uploaded to YouTube and public.
  3. **Category**: say which category and which bonus prizes you enter, with any bonus materials.
  4. **Explanation**: "Describe how your project meets the main technology requirement."
  5. Submit the entire Devpost form before the deadline.
- Judging (20% each): Technological Implementation, Design, Potential Impact, Innovation/Idea, Presentation.
- Bonus prizes ($1,500 x 6 each): Best Agents (rovo:agent etc.), Best app with Atlassian MCP (a Forge app that EXPOSES an MCP server), Best apps with Teamwork Graph integration, Best Marketplace published app (published or submitted for listing, link the listing or review ticket).
- Also on the Devpost form (standard project story fields): project name, elevator pitch, the story sections (inspiration, what it does, how we built it, challenges, accomplishments, what we learned, what's next), built with, try-it-out links, image gallery, video link, team members.

## 1. Project name

FoxPlug for Jira: Shipped this week

## 2. Elevator pitch (under 200 characters)

Your team closes tickets all week. One Jira page turns them into a draft customer update in FoxPlug, next to what your public changelog already says. You approve; nothing is posted for you.

## 3. Category and bonus prizes

- Category: **Apps for Software Teams**.
- Bonus prizes: **none claimed.** The app is not published to the Marketplace, has no Rovo agent module, does not expose an MCP server and does not use the Teamwork Graph, so it does not qualify, and we would rather say so than stretch the wording.

## 4. Inspiration

Software teams finish a lot every week and tell customers about almost none of it. The work is in Jira; the customer-facing words live somewhere else, and copying ticket titles across is the chore that gets skipped. Customers then see a quiet changelog and assume nothing is happening. We wanted the gap between "closed in Jira" and "told to customers" to be one button wide, without handing the writing or the publishing to a machine.

## 5. What it does

FoxPlug for Jira adds one page to a Jira project: **Shipped this week (FoxPlug)**.

- **Closed in Jira**: the issues the project closed in the last 7 days, newest first (key, title, type).
- **Already in the FoxPlug changelog**: the last five entries of the project's public FoxPlug changelog, so the team sees what customers were already told, side by side with what was closed.
- **Send to FoxPlug**: one button sends the closed issues (keys and titles only) to FoxPlug as ONE work record. In FoxPlug it waits as a draft; the owner reads it, edits it and decides whether anything is published. Nothing is posted automatically.
- **Check the key**: asks FoxPlug whether the saved key works. Nothing is sent and nothing is created.
- Calm states everywhere: loading lines, an empty state for each column, one plain sentence for every error (no codes), hover help on every control.

The page shows closed issues with no setup at all; only Send needs a free FoxPlug account and a plain key (three steps, described in the README).

## 6. How we built it

- **Forge, UI Kit.** One `jira:projectPage` module rendered natively (UI Kit, no Custom UI) plus one resolver function on `nodejs22.x`. Closed issues are read with the Jira REST API as the signed-in user (`api.asUser().requestJira`).
- **Least privilege.** Scopes: `read:jira-work` (the app never writes to Jira) and `storage:app`. One egress address, `foxplug.com`, declared with `inScopeEUD: true` because issue keys and titles leave Jira.
- **Forge storage (`@forge/kvs`, scope `storage:app`).** App storage holds only the FoxPlug project name and the optional changelog name. The agent key is saved as a **Forge secret** (not readable again, never returned to the page, never logged).
- **What is sent**: the project display name and, for each closed issue, its key and title. Not sent: assignees, reporters, descriptions, comments, attachments, custom fields.
- **FoxPlug ingest.** Send posts one work-record call to FoxPlug's agent endpoint with the saved key; FoxPlug turns it into a scored draft milestone for the owner to approve.
- **Testable by design.** All logic and all wording are pure functions in `src/lib.js`, covered by 36 unit and static tests (every message, the request bodies, the page and resolver) without needing Atlassian. The manifest validates offline against the schema package the Forge CLI uses.
- **Resolver hygiene.** Every resolver is wrapped so any failure comes back as one plain sentence for the page.
- MIT licensed. Source: https://github.com/OsakaSaul/foxplug-for-jira

## 7. Challenges we ran into

- **Showing the screens honestly.** The page only exists inside a Jira project, so the six images in the gallery are mockups rendered from the app's own wording (`npm run mockups` builds them from `src/lib.js`, so a mockup cannot say something the app does not). Each image carries a footer line saying it is a mockup.
- **Data minimalism.** A work record is more useful with assignees and descriptions; it is also more data leaving a customer's Jira. We kept it to keys and titles and said so in the manifest, the README and the page.
- **Never surprising the user.** Send does not publish, email or write back to Jira. Getting an approve-first flow to still feel like one button took several rounds of wording.
- **Secrets.** The key is entered once, stored as a Forge secret and never echoed, so the page can only report "saved" or "not accepted", never show it.

## 8. Accomplishments that we're proud of

- A working Forge app with a minimal permission set: one read scope, one storage scope, one outside address.
- Every error is a sentence a non-developer understands; every control has hover help.
- 36 tests, offline manifest validation, and a mockup generator that cannot drift from the app's wording.
- Closes a real loop end to end: closed ticket in Jira, draft in FoxPlug, owner decision, with a person in charge at each step.

## 9. What we learned

- UI Kit is enough for a calm, complete project page, and keeping logic in pure functions makes a Forge app easy to test.
- Declaring egress honestly (including end-user data) is easier to do up front than to retrofit.
- The most useful setting for "automation that writes to customers" is a draft state: people trust a tool that proposes, not one that posts.

## 10. What's next

- Choose the window (last 7 days is fixed today), and filter by issue type or label.
- Group issues by epic or fix version before sending.
- Publish to the Marketplace and move the key setup into the app's own configuration page.
- Show the draft's status (waiting, edited, published) back on the Jira page.

## 11. Built with (tags)

forge, atlassian-forge, jira, jira-cloud, ui-kit, javascript, node.js, jira-rest-api, forge-storage, forge-secrets, foxplug

## 12. Try it out links

- Install link (judges): **PASTE from the Developer Console > Distribution page.** Not printed here on purpose (it is a signed link). Access instructions to paste next to it: "Open the install link, choose your Jira site, install. Open any Jira project and pick **Shipped this week (FoxPlug)** in the project sidebar: closed issues load with no setup. To try Send you need a free FoxPlug account: press Connect FoxPlug > Open FoxPlug > Make a plain key > Copy key, paste it into Agent key, pick the project, Save, then Check the key and Send to FoxPlug. The work record then waits as a draft in FoxPlug."
- Repo: https://github.com/OsakaSaul/foxplug-for-jira
- Demo video (YouTube, public): https://youtu.be/LeWMX6BEd70 (confirm it is public and under 5 minutes before submitting)
- FoxPlug: https://foxplug.com

## 13. Explanation field: how the project meets the main technology requirement

The app is built on Atlassian Forge and integrates with Jira. It is a `jira:projectPage` module rendered with UI Kit and backed by a Forge resolver on nodejs22.x. It reads the project's closed issues from the Jira API (`read:jira-work`, read-only), keeps its settings in the Forge key-value storage (`@forge/kvs`, scope `storage:app`) with the agent key as a Forge secret, and makes one declared outside call to `foxplug.com` to send one work record or read the public changelog. It lives entirely on Forge: no external server, no Custom UI, no Connect.

## 14. Screenshots (1280 x 800, in docs/devpost-shots/)

Upload in this order. The mockups are rendered from the app's own wording; each image says "mockup" in its footer line.

1. `01-shipped-this-week.png`: the project page, issues closed this week beside the public changelog.
2. `02-nothing-closed.png`: the empty state when nothing closed.
3. `03-connect-foxplug.png`: connecting FoxPlug with a plain key.
4. `04-bad-key.png`: a key FoxPlug did not accept, in plain words.
5. `05-sent.png`: Send succeeded.
6. `06-foxplug-draft.png`: the draft waiting in FoxPlug for the owner.

Suggested image captions: "One page per Jira project", "A calm empty state", "Connect with a plain key, no secrets shown", "Errors in plain words", "Sent: nothing is published for you", "The draft waits for the owner in FoxPlug".

## 15. Before you press Submit (Saul)

1. Paste the install link from the Developer Console Distribution page (section 12).
2. Open the YouTube video logged out: it must be public and under 5 minutes.
3. Confirm the Devpost "Category" field says Apps for Software Teams and leave the bonus prizes unchecked.
4. Add the team member(s) and accept the rules checkbox yourself.
5. Submit before Dec 22, 2026 12:00pm PST.

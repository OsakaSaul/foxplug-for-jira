// FoxPlug for Jira (T1861, hardened T1866): the pure parts, so they can be tested without Atlassian.
// Everything a person reads (help text, empty states, loading lines, errors) lives here as plain strings, so each one is tested and none can drift.
'use strict';

const MCP_ENDPOINT = 'https://foxplug.com/mcp';
const KEY_PAGE = 'https://foxplug.com/app/?connect=plain-key';   // T1919: lands on the "Make a plain key" box, outlined, with its button highlighted
const MAX_ISSUES = 25;

// ---------------------------------------------------------------------------------------------------------------------
// The words. One place. No model names, no data-source names, no raw codes.
// ---------------------------------------------------------------------------------------------------------------------
const COPY = {
  title: 'Shipped this week',
  intro: 'Read-only: this page reads the issues your team closed in the last 7 days. Sending them to FoxPlug keeps one work record that you approve in FoxPlug. Nothing is posted anywhere.',
  // What a hover on each control says. Keys are used by the page; a test makes sure every control has one.
  help: {
    send: 'Sends the issue keys and titles shown on the left to FoxPlug as ONE work record. In FoxPlug it waits as a draft that you read and approve. Nothing is posted.',
    refresh: 'Reads the closed issues from Jira again.',
    project: 'The name of the project in FoxPlug where the work record goes. It must match a project you already have in FoxPlug.',
    slug: 'Optional. The name in your public FoxPlug changelog address, for example acme in foxplug.com/changelog/acme. It fills the column on the right.',
    agentKey: 'A key that lets this page send a work record to your FoxPlug account. It starts with fpk_. It is stored as a Forge secret and never shown again.',
    save: 'Saves the project name and the changelog name. A new key is stored as a secret; leaving the key box empty keeps the one you saved.',
    checkKey: 'Asks FoxPlug whether the saved key works. Nothing is sent and nothing is created.',
    openFoxPlug: 'Opens FoxPlug in a new tab, right at the "Make a plain key" button.',
    pickProject: 'Your FoxPlug projects, read with the saved key. Pick the one this Jira project belongs to.',
  },
  // What the page says when there is nothing to show (never a blank box).
  empty: {
    noClosed: 'Nothing was closed in this project in the last 7 days. When the team closes an issue it appears here.',
    noFeedName: 'No public changelog name saved yet. Add it under FoxPlug connection below and this column fills in.',
    feedEmpty: 'That FoxPlug changelog has no entries yet.',
    notOnProject: 'Open this page from inside a Jira project (the project sidebar, "Shipped this week (FoxPlug)"). It needs a project to read.',
  },
  loading: {
    jira: 'Reading Jira…',
    feed: 'Reading FoxPlug…',
    saving: 'Saving…',
    sending: 'Sending to FoxPlug…',
    checking: 'Asking FoxPlug…',
  },
  messages: {
    saved: 'Saved.',
    sent: 'Sent. Open your draft in FoxPlug.',
    sentNoLink: 'Sent to FoxPlug as a work record. Open FoxPlug to see it; nothing was posted.',
    keyOk: 'FoxPlug accepted this key. You can send work records.',
    badKey: 'FoxPlug did not accept this agent key. Make a new one with "Make a plain key" in FoxPlug (steps below) and paste it again.',
    pause: 'FoxPlug asked for a short pause. Try again in a minute.',
    needProject: 'Type the name of your FoxPlug project first, then save.',
    needKey: 'Add your FoxPlug agent key first (steps below), then save.',
    projectsFound: 'Pick your FoxPlug project from the list.',
    nothingToSend: 'There is nothing closed this week to send.',
    keepKey: 'A key is saved. Type a new one only if you want to replace it.',
  },
  // The Connect FoxPlug panel: where the key comes from, exactly. Verified against the FoxPlug app (Settings > Integrations).
  connect: {
    heading: 'Connect FoxPlug',
    intro: 'This page needs one plain key from FoxPlug. It is free and takes a minute:',
    steps: [
      'Press "Open FoxPlug" below and sign in. It takes you to the "Make a plain key" button.',
      'Press "Make a plain key", then "Copy key". The key is shown once.',
      'Come back here, paste it into "Agent key", pick your project and press Save.',
    ],
    safety: 'The key is stored as a Forge secret. This app never shows it again and never sends it anywhere except FoxPlug. If you lose it, make a new one in FoxPlug and replace it here.',
    keyPage: KEY_PAGE,
    openLabel: 'Open FoxPlug',
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// Jira
// ---------------------------------------------------------------------------------------------------------------------

/** A Jira project key: capital letter first, then capitals, digits or underscores. */
function isProjectKey(k) { return /^[A-Z][A-Z0-9_]{1,19}$/.test(String(k || '').trim()); }

/** JQL for the issues a project closed in the last `days` days. The key is checked, never pasted raw. */
function buildJql(projectKey, days) {
  const key = String(projectKey || '').trim();
  if (!isProjectKey(key)) throw new Error('That is not a Jira project key.');
  const n = Math.min(30, Math.max(1, Math.floor(Number(days) || 7)));
  return `project = "${key}" AND statusCategory = Done AND resolved >= -${n}d ORDER BY resolved DESC`;
}

/** Jira search response -> short rows for the page. Only key, summary, type and resolved time are kept. */
function toShippedItems(search) {
  const issues = (search && Array.isArray(search.issues)) ? search.issues : [];
  return issues.slice(0, MAX_ISSUES).map((i) => {
    const f = i.fields || {};
    return {
      key: String(i.key || ''),
      summary: String(f.summary || '').slice(0, 160),
      type: String((f.issuetype && f.issuetype.name) || 'Task'),
      resolved: f.resolutiondate || null,
    };
  }).filter((r) => r.key && r.summary);
}

/** Plain words for a Jira answer that was not a success. */
function jiraStatusMessage(status) {
  const s = Number(status);
  if (s === 401 || s === 403) return 'Jira did not let this app read the project. Ask a Jira admin to check that the app is installed for this site and project.';
  if (s === 404) return 'Jira could not find this project. Open the page from inside the project and try again.';
  if (s === 429) return 'Jira asked this app to slow down. Try again in a minute.';
  if (s >= 500) return 'Jira is having trouble right now. Try again in a few minutes.';
  return 'Jira did not return the issues. Try again in a moment.';
}

/** One plain block FoxPlug can turn into a milestone. No model, no invention: only the issue keys and summaries.
 *  The first line becomes the milestone title in FoxPlug, so it carries plain words only ("Closed 5 issues: welcome email, dark mode, ...");
 *  the issue keys stay in the lines after it. */
function buildSummary(items, projectName) {
  if (!items.length) return '';
  const n = items.length;
  const plain = items.map((r) => String(r.summary || '').trim()).filter(Boolean);
  const shown = plain.slice(0, 3);
  let head = `Closed ${n} issue${n === 1 ? '' : 's'}`;
  if (shown.length) head += `: ${shown.join(', ')}`;
  if (plain.length > shown.length) head += `, and ${plain.length - shown.length} more`;
  head = head.slice(0, 180);
  const lines = items.map((r) => `${r.key}: ${r.summary}`);
  const body = `${projectName || 'The team'} closed ${n} issue${n === 1 ? '' : 's'} this week. ${lines.join('; ')}`;
  return `${head}\n\n${body}`.slice(0, 1800);
}

// ---------------------------------------------------------------------------------------------------------------------
// FoxPlug
// ---------------------------------------------------------------------------------------------------------------------

/** The JSON-RPC body for FoxPlug's record_work tool (capture is free and posts nothing). */
function recordWorkBody(foxplugProject, summary) {
  return { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'record_work', arguments: { project: String(foxplugProject), summary: String(summary), from_app: 'jira' } } };
}

/** The JSON-RPC body that only asks which tools the key may use (used to check a key without sending anything). */
function toolsListBody() {
  return { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} };
}

/** The JSON-RPC body for FoxPlug's read-only get_brief tool, used only to read the names of the key owner's projects (it changes nothing). */
function projectsBody() {
  return { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_brief', arguments: {} } };
}

/** Reads the project names out of FoxPlug's get_brief reply. Never throws; an empty list means the page keeps the free-typing box. */
function parseProjects(status, data) {
  if (status !== 200 || !data || data.error || !data.result || data.result.isError) return [];
  let body = null;
  try { body = JSON.parse(String(data.result.content && data.result.content[0] && data.result.content[0].text)); } catch (e) { return []; }
  const names = body && Array.isArray(body.your_projects) ? body.your_projects : [];
  return names.map((n) => String(n || '').trim()).filter(Boolean).slice(0, 50);
}

/** Reads FoxPlug's reply to record_work into { ok, message }. Never throws; the page shows the message. */
function parseMcpReply(status, data) {
  if (status === 401 || status === 403) return { ok: false, message: COPY.messages.badKey };
  if (status === 429) return { ok: false, message: COPY.messages.pause };
  if (status >= 400) return { ok: false, message: `FoxPlug answered with an error (${status}). Try again in a moment.` };
  if (!data || data.error) return { ok: false, message: (data && data.error && data.error.message) || 'FoxPlug did not answer this request.' };
  const r = data.result || {};
  const text = r.content && r.content[0] && r.content[0].text;
  if (r.isError) return { ok: false, message: String(text || 'FoxPlug could not do that.').slice(0, 300) };
  // The reply text is JSON with the milestone and project ids; the link is built here from the ids (never taken from the reply as-is).
  let body = null;
  try { body = JSON.parse(String(text || '')); } catch (e) { body = null; }
  const link = draftLink(body && body.project_id, body && body.milestone_id);
  return link ? { ok: true, message: COPY.messages.sent, openUrl: link } : { ok: true, message: COPY.messages.sentNoLink };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The link to the draft in FoxPlug: only ever foxplug.com, only with two real ids. */
function draftLink(projectId, milestoneId) {
  if (!UUID.test(String(projectId || '')) || !UUID.test(String(milestoneId || ''))) return '';
  return `https://foxplug.com/app/?project=${projectId}&milestone=${milestoneId}&from=jira`;
}

/** Reads FoxPlug's reply to tools/list into { ok, message }: a key that FoxPlug accepts answers with the tool list. */
function parseKeyCheck(status, data) {
  if (status === 401 || status === 403) return { ok: false, message: COPY.messages.badKey };
  if (status === 429) return { ok: false, message: COPY.messages.pause };
  if (status >= 400) return { ok: false, message: `FoxPlug answered with an error (${status}). Try again in a moment.` };
  const tools = data && data.result && Array.isArray(data.result.tools) ? data.result.tools : null;
  if (!tools) return { ok: false, message: (data && data.error && data.error.message) || 'FoxPlug did not answer this request.' };
  if (!tools.some((t) => t && t.name === 'record_work')) return { ok: false, message: 'FoxPlug accepted the key but this account cannot receive work records yet. Open FoxPlug and check your plan or project.' };
  return { ok: true, message: COPY.messages.keyOk };
}

/** Only a plain project slug may be put in the feed address. */
function feedUrl(slug) {
  const s = String(slug || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(s)) throw new Error('That is not a FoxPlug project address name.');
  return `https://foxplug.com/feed/${s}.json`;
}

/** FoxPlug public feed -> the last few entries for the side-by-side column. */
function toFeedItems(feed) {
  const items = (feed && Array.isArray(feed.items)) ? feed.items : [];
  return items.slice(0, 5).map((i) => ({ title: String(i.title || '').slice(0, 140), url: String(i.url || ''), date: i.date_published || null }));
}

/** Plain words for a FoxPlug feed answer that was not a success. */
function feedStatusMessage(status) {
  const s = Number(status);
  if (s === 404) return 'FoxPlug has no public changelog with that name. Check the spelling under FoxPlug connection below.';
  if (s === 429) return COPY.messages.pause;
  return 'FoxPlug did not return that changelog. Try again in a moment.';
}

/** An agent key looks like fpk_ plus 20 to 80 letters, digits, _ or - (the same rule FoxPlug applies when it receives one). */
function isAgentKey(k) {
  return /^fpk_[A-Za-z0-9_-]{20,80}$/.test(String(k || ''));
}

// ---------------------------------------------------------------------------------------------------------------------
// Settings, states, errors
// ---------------------------------------------------------------------------------------------------------------------

/** Checks what was typed in the connection form. A new key is optional once one is saved. Messages name the field and the fix. */
function validateSettings(input, hasKey) {
  const p = input || {};
  const errors = {};
  const project = String(p.project || '').trim();
  const slug = String(p.slug || '').trim();
  const agentKey = String(p.agentKey || '').trim();
  if (!project) errors.project = COPY.messages.needProject;
  else if (project.length > 80) errors.project = 'The project name can be up to 80 characters.';
  else if (/[\u0000-\u001f]/.test(project)) errors.project = 'The project name has a character that cannot be saved. Retype it.';
  if (slug) { try { feedUrl(slug); } catch (e) { errors.slug = 'The changelog name can use letters, digits and dashes only, for example acme.'; } }
  if (agentKey) { if (!isAgentKey(agentKey)) errors.agentKey = 'That does not look like a FoxPlug agent key. It starts with fpk_ and is one long word with no spaces. Copy it again from FoxPlug.'; }
  else if (!hasKey) errors.agentKey = COPY.messages.needKey;
  return { ok: Object.keys(errors).length === 0, errors, clean: { project, slug: slug.toLowerCase(), agentKey } };
}

/** Why the Send button cannot be used yet, as one sentence, or null when it can. */
function sendBlockedReason({ itemCount, hasKey, project, busy }) {
  if (busy) return COPY.loading.sending;
  if (!itemCount) return COPY.messages.nothingToSend;
  if (!project) return COPY.messages.needProject;
  if (!hasKey) return COPY.messages.needKey;
  return null;
}

/** What the "Closed in Jira" column shows: loading, an error line, the empty state, or the rows. */
function shippedView(shipped) {
  if (!shipped) return { state: 'loading', text: COPY.loading.jira };
  if (!shipped.ok) return { state: 'error', text: shipped.message || jiraStatusMessage(0) };
  if (!shipped.items || !shipped.items.length) return { state: 'empty', text: COPY.empty.noClosed };
  return { state: 'items', items: shipped.items };
}

/** What the FoxPlug changelog column shows. */
function feedView(feed, hasSlug) {
  if (!feed) return { state: 'loading', text: COPY.loading.feed };
  if (!feed.ok) return { state: 'error', text: feed.message || feedStatusMessage(0) };
  if (!feed.items || !feed.items.length) return { state: 'empty', text: hasSlug ? COPY.empty.feedEmpty : COPY.empty.noFeedName };
  return { state: 'items', items: feed.items };
}

/**
 * Any thing that went wrong inside the app -> one calm sentence. The person never sees a stack, a status object or a word like TypeError.
 * `where` is jira, foxplug or app.
 */
function friendlyError(err, where) {
  const text = String((err && (err.message || err.code)) || err || '').toLowerCase();
  const name = String((err && err.name) || '').toLowerCase();
  if (name.includes('abort') || /timed? ?out|etimedout|timeout/.test(text)) return where === 'jira' ? 'Jira took too long to answer. Try again in a moment.' : 'FoxPlug took too long to answer. Try again in a moment.';
  if (/fetch failed|network|econn|enotfound|socket|dns/.test(text)) return where === 'jira' ? 'Could not reach Jira just now. Try again in a moment.' : 'Could not reach FoxPlug just now. Try again in a moment.';
  if (/not a jira project key/.test(text)) return COPY.empty.notOnProject;
  if (/foxplug project address name/.test(text)) return 'The changelog name can use letters, digits and dashes only, for example acme.';
  if (/storage|quota|too large/.test(text)) return 'This app could not save that. Try again in a moment.';
  return 'Something went wrong on our side. Try again in a moment.';
}

module.exports = {
  MCP_ENDPOINT, KEY_PAGE, MAX_ISSUES, COPY,
  isProjectKey, buildJql, toShippedItems, jiraStatusMessage, buildSummary,
  recordWorkBody, toolsListBody, projectsBody, parseProjects, parseMcpReply, draftLink, parseKeyCheck, feedUrl, toFeedItems, feedStatusMessage, isAgentKey,
  validateSettings, sendBlockedReason, shippedView, feedView, friendlyError,
};

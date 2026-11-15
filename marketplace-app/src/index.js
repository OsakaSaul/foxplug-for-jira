// FoxPlug for Jira (T1861, hardened T1866): the Forge resolver. Jira is only READ (read:jira-work). The FoxPlug agent key is kept as a Forge secret
// and is never sent back to the page. Nothing is posted anywhere: record_work only keeps a work record the owner approves in FoxPlug.
// Every resolver is wrapped: whatever goes wrong comes back as { ok: false, message } in plain words, never as a stack or a status object.
import Resolver from '@forge/resolver';
import api, { route, fetch } from '@forge/api';
import { kvs } from '@forge/kvs';
import {
  MCP_ENDPOINT, COPY, isProjectKey, buildJql, toShippedItems, jiraStatusMessage, buildSummary, recordWorkBody, toolsListBody, projectsBody, parseProjects,
  parseMcpReply, parseKeyCheck, feedUrl, toFeedItems, feedStatusMessage, validateSettings, friendlyError,
} from './lib';

const resolver = new Resolver();
const SETTINGS = 'foxplug-settings';   // { project: 'name of the project in FoxPlug', slug: 'public changelog name' }
const KEY = 'foxplug-agent-key';       // stored with setSecret
const MCP_HEADERS = (agentKey) => ({ 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${agentKey}` });

/** Runs one resolver; any throw becomes one calm sentence (and a line in the Forge log without the key or the payload). */
function safe(where, fn) {
  return async (req) => {
    try { return await fn(req); } catch (e) {
      console.error(`foxplug-jira ${where} failed: ${String((e && e.name) || 'Error')} ${String((e && e.message) || '').slice(0, 120)}`);
      return { ok: false, message: friendlyError(e, where) };
    }
  };
}

function projectOf(req) {
  const p = req && req.context && req.context.extension && req.context.extension.project;
  return { key: p && p.key, name: p && p.name };
}

async function readSettings() {
  const s = (await kvs.get(SETTINGS)) || {};
  return { project: String(s.project || ''), slug: String(s.slug || '') };
}

async function loadShipped(req) {
  const { key } = projectOf(req);
  if (!isProjectKey(key)) return { ok: false, message: COPY.empty.notOnProject };
  const jql = buildJql(key, 7);
  const res = await api.asUser().requestJira(route`/rest/api/3/search/jql?jql=${jql}&fields=summary,issuetype,resolutiondate&maxResults=25`);
  if (!res.ok) return { ok: false, message: jiraStatusMessage(res.status) };
  return { ok: true, items: toShippedItems(await res.json()) };
}

resolver.define('getShipped', safe('jira', (req) => loadShipped(req)));

resolver.define('getSettings', safe('app', async () => {
  const s = await readSettings();
  const hasKey = !!(await kvs.getSecret(KEY));
  return { ok: true, project: s.project, slug: s.slug, hasKey };   // the key itself is never returned
}));

resolver.define('saveSettings', safe('app', async (req) => {
  const hasKey = !!(await kvs.getSecret(KEY));
  const v = validateSettings(req.payload || {}, hasKey);
  if (!v.ok) return { ok: false, errors: v.errors, message: Object.values(v.errors)[0] };
  await kvs.set(SETTINGS, { project: v.clean.project, slug: v.clean.slug });
  if (v.clean.agentKey) await kvs.setSecret(KEY, v.clean.agentKey);
  return { ok: true, message: COPY.messages.saved };
}));

resolver.define('getFoxPlugFeed', safe('foxplug', async () => {
  const s = await readSettings();
  if (!s.slug) return { ok: true, items: [], hasSlug: false };
  const res = await fetch(feedUrl(s.slug));
  if (!res.ok) return { ok: false, message: feedStatusMessage(res.status) };
  return { ok: true, items: toFeedItems(await res.json()), hasSlug: true };
}));

resolver.define('checkKey', safe('foxplug', async () => {
  const agentKey = await kvs.getSecret(KEY);
  if (!agentKey) return { ok: false, message: COPY.messages.needKey };
  const res = await fetch(MCP_ENDPOINT, { method: 'POST', headers: MCP_HEADERS(agentKey), body: JSON.stringify(toolsListBody()) });
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  return parseKeyCheck(res.status, data);
}));

// T1919: the names of the key owner's FoxPlug projects, so the page can offer a list instead of free typing. Read-only; any failure is an empty list.
resolver.define('getProjects', safe('foxplug', async () => {
  const agentKey = await kvs.getSecret(KEY);
  if (!agentKey) return { ok: true, projects: [] };
  const res = await fetch(MCP_ENDPOINT, { method: 'POST', headers: MCP_HEADERS(agentKey), body: JSON.stringify(projectsBody()) });
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  return { ok: true, projects: parseProjects(res.status, data) };
}));

resolver.define('sendToFoxPlug', safe('foxplug', async (req) => {
  const s = await readSettings();
  const agentKey = await kvs.getSecret(KEY);
  if (!s.project) return { ok: false, message: COPY.messages.needProject };
  if (!agentKey) return { ok: false, message: COPY.messages.needKey };
  const shipped = await loadShipped(req);
  if (!shipped.ok) return shipped;
  if (!shipped.items.length) return { ok: false, message: COPY.messages.nothingToSend };
  const summary = buildSummary(shipped.items, projectOf(req).name);
  const res = await fetch(MCP_ENDPOINT, { method: 'POST', headers: MCP_HEADERS(agentKey), body: JSON.stringify(recordWorkBody(s.project, summary)) });
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  return parseMcpReply(res.status, data);
}));

export const handler = resolver.getDefinitions();

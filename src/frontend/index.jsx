// FoxPlug for Jira (T1861, hardened T1866): the project page, built with Forge UI Kit. Two columns of facts: what Jira says was closed this week,
// and what FoxPlug's public changelog already says. One button sends the first to FoxPlug as a work record (a draft; nothing is posted).
// Every word comes from COPY in ../lib.js. Every control has a hover help text. Every column has a loading line, an error line and an empty line.
import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Box, Button, ErrorMessage, Heading, HelperMessage, Inline, Label, Link, Lozenge, SectionMessage, Select, Spinner, Stack, Text, Textfield, Tooltip } from '@forge/react';
import { invoke } from '@forge/bridge';
import { COPY, KEY_PAGE, shippedView, feedView, sendBlockedReason } from '../lib';

const Loading = ({ text }) => (<Inline space="space.100" alignBlock="center"><Spinner size="small" /><Text>{text}</Text></Inline>);

const App = () => {
  const [shipped, setShipped] = useState(null);
  const [feed, setFeed] = useState(null);
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ project: '', slug: '', agentKey: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [note, setNote] = useState(null);
  const [projects, setProjects] = useState([]);   // T1919: the key owner's FoxPlug project names (empty: the page keeps the typing box)
  const [busy, setBusy] = useState('');   // '', 'saving', 'sending', 'checking', 'refreshing'

  const loadJira = async () => { setShipped(null); setShipped(await invoke('getShipped')); };
  const loadFeed = async () => { setFeed(null); setFeed(await invoke('getFoxPlugFeed')); };
  const loadSettings = async () => {
    const s = await invoke('getSettings');
    if (s && s.ok) { setSettings(s); setForm((f) => ({ ...f, project: s.project, slug: s.slug })); }
    else { setSettings({ ok: false, hasKey: false, project: '', slug: '' }); setNote({ appearance: 'warning', text: (s && s.message) || 'Settings could not be read. Try again in a moment.' }); }
  };
  const loadProjects = async () => { const r = await invoke('getProjects'); setProjects(r && r.ok && Array.isArray(r.projects) ? r.projects : []); };
  useEffect(() => { loadJira(); loadFeed(); loadSettings(); }, []);
  useEffect(() => { if (settings && settings.hasKey) loadProjects(); }, [settings && settings.hasKey]);

  const save = async () => {
    setBusy('saving'); setNote(null); setFieldErrors({});
    const r = await invoke('saveSettings', form);
    if (r && r.ok) { setNote({ appearance: 'confirmation', text: r.message || COPY.messages.saved }); setForm((f) => ({ ...f, agentKey: '' })); await loadSettings(); await loadFeed(); }
    else { setFieldErrors((r && r.errors) || {}); setNote({ appearance: 'error', text: (r && r.message) || 'That could not be saved. Try again in a moment.' }); }
    setBusy('');
  };

  const send = async () => {
    setBusy('sending'); setNote(null);
    const r = await invoke('sendToFoxPlug');
    setNote({ appearance: r && r.ok ? 'confirmation' : 'warning', text: (r && r.message) || 'FoxPlug did not answer this request.', link: (r && r.ok && r.openUrl) || '' });
    setBusy('');
  };

  const checkKey = async () => {
    setBusy('checking'); setNote(null);
    const r = await invoke('checkKey');
    setNote({ appearance: r && r.ok ? 'confirmation' : 'warning', text: (r && r.message) || 'FoxPlug did not answer this request.' });
    setBusy('');
  };

  const refresh = async () => { setBusy('refreshing'); await loadJira(); setBusy(''); };

  const left = shippedView(shipped);
  const right = feedView(feed, !!(feed && feed.hasSlug) || !!(settings && settings.slug));
  const hasKey = !!(settings && settings.hasKey);
  const blocked = sendBlockedReason({ itemCount: left.state === 'items' ? left.items.length : 0, hasKey, project: settings && settings.project, busy: busy === 'sending' });

  return (
    <Stack space="space.200">
      <Heading as="h2">{COPY.title}</Heading>
      <Text>{COPY.intro}</Text>
      {note && <SectionMessage appearance={note.appearance}><Text>{note.link ? <Tooltip text="Opens FoxPlug in a new tab, on the draft made from these issues."><Link href={note.link} openNewTab>{note.text}</Link></Tooltip> : note.text}</Text></SectionMessage>}

      <Inline space="space.300" alignBlock="start">
        <Box>
          <Heading as="h3">Closed in Jira</Heading>
          {left.state === 'loading' && <Loading text={left.text} />}
          {(left.state === 'error' || left.state === 'empty') && <Text>{left.text}</Text>}
          {left.state === 'items' && left.items.map((r) => (
            <Inline key={r.key} space="space.100"><Lozenge>{r.type}</Lozenge><Text>{r.key}: {r.summary}</Text></Inline>
          ))}
          <Inline space="space.100">
            <Tooltip text={blocked || COPY.help.send}>
              <Button appearance="primary" isDisabled={!!blocked} onClick={send}>{busy === 'sending' ? COPY.loading.sending : 'Send to FoxPlug'}</Button>
            </Tooltip>
            <Tooltip text={COPY.help.refresh}>
              <Button isDisabled={busy !== ''} onClick={refresh}>Refresh</Button>
            </Tooltip>
          </Inline>
          {blocked && busy !== 'sending' && <HelperMessage>{blocked}</HelperMessage>}
        </Box>
        <Box>
          <Heading as="h3">Already in the FoxPlug changelog</Heading>
          {right.state === 'loading' && <Loading text={right.text} />}
          {(right.state === 'error' || right.state === 'empty') && <Text>{right.text}</Text>}
          {right.state === 'items' && right.items.map((i) => (<Text key={i.url || i.title}><Link href={i.url} openNewTab>{i.title}</Link></Text>))}
        </Box>
      </Inline>

      <Heading as="h3">{COPY.connect.heading}</Heading>
      <Text>{COPY.connect.intro}</Text>
      {COPY.connect.steps.map((s, i) => (<Text key={i}>{i + 1}. {s}</Text>))}
      <Inline space="space.100" alignBlock="center">
        <Tooltip text={COPY.help.openFoxPlug}><Link href={KEY_PAGE} openNewTab>{COPY.connect.openLabel}</Link></Tooltip>
      </Inline>
      <HelperMessage>{COPY.connect.safety}</HelperMessage>

      <Label labelFor="fp-project">FoxPlug project name</Label>
      {projects.length > 0 ? (
        <Tooltip text={COPY.help.pickProject}>
          <Select inputId="fp-project" isInvalid={!!fieldErrors.project} placeholder={COPY.messages.projectsFound}
            options={projects.map((n) => ({ label: n, value: n }))}
            value={form.project ? { label: form.project, value: form.project } : null}
            onChange={(o) => setForm({ ...form, project: (o && o.value) || '' })} />
        </Tooltip>
      ) : (
        <Tooltip text={COPY.help.project}>
          <Textfield id="fp-project" name="project" isInvalid={!!fieldErrors.project} value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} />
        </Tooltip>
      )}
      {fieldErrors.project && <ErrorMessage>{fieldErrors.project}</ErrorMessage>}

      <Label labelFor="fp-slug">Public changelog name (optional)</Label>
      <Tooltip text={COPY.help.slug}>
        <Textfield id="fp-slug" name="slug" isInvalid={!!fieldErrors.slug} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
      </Tooltip>
      {fieldErrors.slug && <ErrorMessage>{fieldErrors.slug}</ErrorMessage>}

      <Label labelFor="fp-key">{hasKey ? 'Agent key (saved; type a new one to replace it)' : 'Agent key'}</Label>
      <Tooltip text={COPY.help.agentKey}>
        <Textfield id="fp-key" name="agentKey" type="password" isInvalid={!!fieldErrors.agentKey} value={form.agentKey} onChange={(e) => setForm({ ...form, agentKey: e.target.value })} />
      </Tooltip>
      {hasKey && !fieldErrors.agentKey && <HelperMessage>{COPY.messages.keepKey}</HelperMessage>}
      {fieldErrors.agentKey && <ErrorMessage>{fieldErrors.agentKey}</ErrorMessage>}

      <Inline space="space.100" alignBlock="center">
        <Tooltip text={COPY.help.save}>
          <Button appearance="primary" isDisabled={busy !== ''} onClick={save}>{busy === 'saving' ? COPY.loading.saving : 'Save'}</Button>
        </Tooltip>
        <Tooltip text={hasKey ? COPY.help.checkKey : COPY.messages.needKey}>
          <Button isDisabled={busy !== '' || !hasKey} onClick={checkKey}>{busy === 'checking' ? COPY.loading.checking : 'Check the key'}</Button>
        </Tooltip>
      </Inline>
    </Stack>
  );
};

ForgeReconciler.render(<React.StrictMode><App /></React.StrictMode>);

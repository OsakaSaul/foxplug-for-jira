// Validates manifest.yml offline with the schema package the Forge CLI itself uses (no login, no network). `forge lint` needs a login; this catches the manifest part.
'use strict';
let manifest;
try { manifest = require('@forge/manifest'); } catch (e) { console.error('@forge/manifest is not installed. Run npm install first.'); process.exit(2); }
(async () => {
  const r = await manifest.validate(false);
  const errors = r.errors || [], warnings = r.warnings || [];
  for (const e of errors) console.error(`error   ${e.reference}: ${String(e.message).slice(0, 200)}`);
  for (const w of warnings) console.error(`warning ${w.reference}: ${String(w.message).slice(0, 200)}`);
  console.log(`manifest.yml: ${r.success ? 'valid' : 'NOT valid'} (${errors.length} errors, ${warnings.length} warnings)`);
  process.exit(r.success ? 0 : 1);
})();

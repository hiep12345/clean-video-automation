const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const agentPath = path.join(
  root,
  '.agents',
  'agents',
  'video-pipeline-operator',
  'agent.md',
);
const routingPath = path.join(root, '.agents', 'config', 'agent-routing.md');
const manifestPath = path.join(root, '.agents', 'config', 'team-manifest.yaml');
const dispatcherPath = path.join(root, 'scripts', 'antigravity_dispatch.py');

function frontmatter(text) {
  const closing = text.indexOf('\n---', 3);
  assert.notEqual(closing, -1, 'agent profile must close YAML frontmatter');
  return text.slice(4, closing);
}

test('operator profile is a native Antigravity profile with least privilege', () => {
  const text = fs.readFileSync(agentPath, 'utf8');
  const metadata = frontmatter(text);

  assert.match(metadata, /^name: video-pipeline-operator$/m);
  assert.match(metadata, /^subagent: true$/m);
  assert.match(metadata, /^  - view_file$/m);
  assert.doesNotMatch(metadata, /run_command|write_to_file|replace_file_content/);
  assert.match(text, /control-plane agent/);
  assert.match(text, /does\s+not generate media/);
  assert.match(text, /cannot self-certify PASS or READY/i);
  assert.match(text, /Facebook publishing is strictly manual-only/i);
});

test('operator is registered as a delegating control-plane role', () => {
  const routing = fs.readFileSync(routingPath, 'utf8');
  const manifest = fs.readFileSync(manifestPath, 'utf8');

  assert.match(routing, /\| `video-pipeline-operator` \|/);
  assert.match(routing, /Delegates production to `production-executor`/);
  assert.match(routing, /QA to `qa-reviewer`/);
  assert.match(manifest, /"video-pipeline-operator"\s*:\s*\{/);
  assert.match(manifest, /"risk_tier"\s*:\s*1/);
  assert.match(manifest, /"handed_to"\s*:\s*"production-executor"/);
  assert.match(manifest, /"verified_by"\s*:\s*"qa-reviewer"/);
});

test('dispatcher binds an explicit managed profile and fails closed on metadata mismatch', () => {
  const source = fs.readFileSync(dispatcherPath, 'utf8');

  assert.match(source, /profile_uri: str/);
  assert.match(source, /def resolve_profile_uri\(/);
  assert.match(source, /profile URI must be under \.agents\/agents/);
  assert.match(source, /--profile=\{_single_line\(profile_uri/);
  assert.match(source, /conversation metadata profile mismatch/);
  assert.match(source, /profile_uri=spec\.profile_uri/);
});

test('Windows batch dispatch quotes paths with spaces and rejects shell metacharacters', () => {
  const source = fs.readFileSync(dispatcherPath, 'utf8');

  assert.match(source, /def _quote_windows_batch_argument\(/);
  assert.match(source, /command = " "\.join\(/);
  assert.match(source, /shell=isinstance\(command, str\)/);
  assert.match(source, /unsafe character in Windows batch argument/);
  assert.match(source, /unsafe environment expansion in Windows batch argument/);
  assert.doesNotMatch(source, /subprocess\.list2cmdline\(batch_arguments\)/);
  assert.doesNotMatch(source, /\["cmd\.exe", "\/d", "\/s", "\/c", str\(executable\)/);
});

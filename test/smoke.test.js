const assert = require('node:assert/strict');
const test = require('node:test');

const packageJson = require('../package.json');

test('package metadata exposes a runnable test command', () => {
  assert.equal(packageJson.name, 'clean-video-automation');
  assert.equal(typeof packageJson.scripts.test, 'string');
});

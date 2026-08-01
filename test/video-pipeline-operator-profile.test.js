const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

// Helper state machine simulator for operator evaluation
function evaluateOperatorState(context) {
  if (!context.compiledWorkOrder) {
    return {
      status: 'WAITING_FOR_COMPILED_WORK_ORDER',
      allowedTools: [],
      canExecute: false,
      reason: 'No compiled work order provided'
    };
  }

  if (!context.preflightClaimPassed) {
    return {
      status: 'BLOCKED',
      allowedTools: [],
      canExecute: false,
      reason: 'Preflight claim missing or failed'
    };
  }

  if (context.bypassQaGate || context.bypassThumbnail || context.selfCertify) {
    return {
      status: 'BLOCKED',
      allowedTools: [],
      canExecute: false,
      reason: 'Attempted QA gate, thumbnail, or self-certification bypass'
    };
  }

  if (context.useFresh && !context.destructiveResetAuthorized) {
    return {
      status: 'BLOCKED',
      allowedTools: [],
      canExecute: false,
      reason: '--fresh flag requires explicit destructive_reset_authorized=true'
    };
  }

  if (context.isHealthOk && !context.generationAuthorized && context.requestingProviderCall) {
    return {
      status: 'BLOCKED',
      allowedTools: [],
      canExecute: false,
      reason: 'Service /health HTTP 200 confirms availability only, not generation authorization'
    };
  }

  if (context.requestingExternalPublish && !context.externalPublishAuthorized) {
    return {
      status: 'BLOCKED',
      allowedTools: [],
      canExecute: false,
      reason: 'External publishing requires explicit separate authorization'
    };
  }

  if (context.hasChannelHardcode) {
    return {
      status: 'BLOCKED',
      allowedTools: [],
      canExecute: false,
      reason: 'Channel template or duration trim hardcoding prohibited'
    };
  }

  // Sequence verification
  const expectedSequence = [
    'compiled_work_order',
    'preflight',
    'execution',
    'independent_qa',
    'READY_LOCAL',
    'separately_authorized_distribution'
  ];

  if (JSON.stringify(context.executionSequence) !== JSON.stringify(expectedSequence.slice(0, context.executionSequence.length))) {
    return {
      status: 'BLOCKED',
      allowedTools: [],
      canExecute: false,
      reason: 'Execution sequence out of mandatory order'
    };
  }

  return {
    status: context.independentQaPassed ? 'READY_LOCAL' : 'IN_PROGRESS',
    canExecute: true
  };
}

test('operator profile: missing compiled work order returns WAITING_FOR_COMPILED_WORK_ORDER with zero tools', () => {
  const result = evaluateOperatorState({ compiledWorkOrder: false });
  assert.equal(result.status, 'WAITING_FOR_COMPILED_WORK_ORDER');
  assert.equal(result.canExecute, false);
  assert.deepEqual(result.allowedTools, []);
});

test('operator profile: self-certification or QA gate bypass fails closed', () => {
  const resultSelfCert = evaluateOperatorState({
    compiledWorkOrder: true,
    preflightClaimPassed: true,
    selfCertify: true
  });
  assert.equal(resultSelfCert.status, 'BLOCKED');

  const resultBypassQa = evaluateOperatorState({
    compiledWorkOrder: true,
    preflightClaimPassed: true,
    bypassQaGate: true
  });
  assert.equal(resultBypassQa.status, 'BLOCKED');
});

test('operator profile: --fresh requires destructive_reset_authorized=true', () => {
  const resultNoAuth = evaluateOperatorState({
    compiledWorkOrder: true,
    preflightClaimPassed: true,
    useFresh: true,
    destructiveResetAuthorized: false
  });
  assert.equal(resultNoAuth.status, 'BLOCKED');

  const resultWithAuth = evaluateOperatorState({
    compiledWorkOrder: true,
    preflightClaimPassed: true,
    useFresh: true,
    destructiveResetAuthorized: true,
    executionSequence: ['compiled_work_order', 'preflight', 'execution']
  });
  assert.equal(resultWithAuth.canExecute, true);
});

test('operator profile: /health 200 OK is availability only, not generation authorization', () => {
  const result = evaluateOperatorState({
    compiledWorkOrder: true,
    preflightClaimPassed: true,
    isHealthOk: true,
    generationAuthorized: false,
    requestingProviderCall: true
  });
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.reason, /generation authorization/i);
});

test('operator profile: external publishing requires explicit separate authorization', () => {
  const result = evaluateOperatorState({
    compiledWorkOrder: true,
    preflightClaimPassed: true,
    requestingExternalPublish: true,
    externalPublishAuthorized: false
  });
  assert.equal(result.status, 'BLOCKED');
});

test('operator profile: enforces strict pipeline sequence', () => {
  const invalidSequence = evaluateOperatorState({
    compiledWorkOrder: true,
    preflightClaimPassed: true,
    executionSequence: ['compiled_work_order', 'execution'] // skipped preflight step in sequence
  });
  assert.equal(invalidSequence.status, 'BLOCKED');
});

test('static documentation verification: agent.md and workflow.md contain mandatory policy declarations', () => {
  const rootDir = path.resolve(__dirname, '..');
  const agentMdPath = path.join(rootDir, '.agents', 'agents', 'video-pipeline-operator', 'agent.md');
  const workflowMdPath = path.join(rootDir, '.agents', 'workflows', 'video-pipeline-operator-certification.md');

  assert.ok(fs.existsSync(agentMdPath), 'agent.md must exist');
  assert.ok(fs.existsSync(workflowMdPath), 'workflow.md must exist');

  const agentContent = fs.readFileSync(agentMdPath, 'utf8');
  const workflowContent = fs.readFileSync(workflowMdPath, 'utf8');

  assert.match(agentContent, /WAITING_FOR_COMPILED_WORK_ORDER/);
  assert.match(agentContent, /destructive_reset_authorized=true/);
  assert.match(agentContent, /HTTP 200 OK/);
  assert.match(workflowContent, /WAITING_FOR_COMPILED_WORK_ORDER/);
  assert.match(workflowContent, /team_preflight\.py/);
});

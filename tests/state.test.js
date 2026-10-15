import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyState, createDemoSession, translate } from '../dist/storage.js';

test('creates an empty demo state without sample users', () => {
  const state = createEmptyState();
  assert.deepEqual(state.users, []);
  assert.deepEqual(state.purchases, []);
  assert.equal(state.settings.rebirthEnabled, false);
});

test('creates role-specific demo sessions and bilingual labels', () => {
  assert.equal(createDemoSession('admin').role, 'admin');
  assert.equal(createDemoSession('user').role, 'user');
  assert.equal(translate('dashboard', 'th'), 'แดชบอร์ด');
  assert.equal(translate('dashboard', 'en'), 'Dashboard');
});

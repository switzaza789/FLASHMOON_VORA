import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyState } from '../dist/storage.js';
import { placeMember, autoPlaceMember, createPurchase, calculatePayouts, registerMemberWithPackage, seedRandomUsers } from '../dist/domain.js';

function baseState() {
  const state = createEmptyState();
  state.users.push(
    { id: 'u1', username: 'root', name: 'Root', sponsorId: null, role: 'user' },
    { id: 'u2', username: 'alice', name: 'Alice', sponsorId: 'u1', role: 'user' },
    { id: 'u3', username: 'bob', name: 'Bob', sponsorId: 'u1', role: 'user' }
  );
  state.binaryPositions.push(
    { userId: 'u1', parentId: null, side: null, depth: 0 },
    { userId: 'u2', parentId: 'u1', side: 'left', depth: 1 },
    { userId: 'u3', parentId: 'u1', side: 'right', depth: 1 }
  );
  return state;
}

test('accepts ternary center placement and rejects an occupied slot', () => {
  const state = baseState();
  const center = placeMember(state, { userId: 'u4', parentId: 'u1', side: 'center' });
  assert.equal(center.ok, true);
  assert.equal(center.position.side, 'center');
  const duplicate = placeMember(state, { userId: 'u5', parentId: 'u1', side: 'center' });
  assert.equal(duplicate.ok, false);
});

test('rejects an invalid ternary side', () => {
  const result = placeMember(baseState(), { userId: 'u4', parentId: 'u1', side: 'left' });
  assert.equal(result.ok, false, 'left is occupied in the fixture');
  const invalid = placeMember(baseState(), { userId: 'u4', parentId: 'u1', side: 'diagonal' });
  assert.equal(invalid.ok, false);
});

test('auto placement finds slots left then center then right before descending', () => {
  const state = baseState();
  state.users.push(
    { id: 'u4', username: 'cathy', name: 'Cathy', sponsorId: 'u1', role: 'user' },
    { id: 'u5', username: 'dana', name: 'Dana', sponsorId: 'u1', role: 'user' },
    { id: 'u6', username: 'erin', name: 'Erin', sponsorId: 'u1', role: 'user' }
  );
  assert.equal(autoPlaceMember(state, { userId: 'u4', rootId: 'u1' }).position.side, 'center');
  assert.equal(autoPlaceMember(state, { userId: 'u5', rootId: 'u1' }).position.parentId, 'u2');
  const next = autoPlaceMember(state, { userId: 'u6', rootId: 'u1' });
  assert.equal(next.position.parentId, 'u2');
  assert.equal(next.position.side, 'center');
});

test('payout allocation totals 100 USDT and preserves unmatched recipients', () => {
  const state = baseState();
  state.users.push({ id: 'u4', username: 'dave', name: 'Dave', sponsorId: 'u2', role: 'user' });
  state.binaryPositions.push({ userId: 'u4', parentId: 'u2', side: 'left', depth: 2 });
  const purchase = createPurchase(state, 'u4');
  const payouts = calculatePayouts(state, purchase.purchase.id);
  assert.equal(payouts.reduce((sum, item) => sum + item.amount, 0), 100);
  assert.ok(payouts.some((item) => item.status === 'unmatched'));
  assert.equal(payouts.find((item) => item.type === 'referral').amount, 20);
});

test('duplicate purchase key returns the original purchase', () => {
  const state = baseState();
  const first = createPurchase(state, 'u2', 'demo-key');
  const second = createPurchase(state, 'u2', 'demo-key');
  assert.equal(first.purchase.id, second.purchase.id);
  assert.equal(state.purchases.length, 1);
});

test('registration creates a package purchase and payout ledger in one flow', () => {
  const state = createEmptyState();
  state.users.push({ id: 'u1', username: 'ฉัน', name: 'ฉัน', sponsorId: null, role: 'user' });
  state.binaryPositions.push({ userId: 'u1', parentId: null, side: null, depth: 0 });
  const result = registerMemberWithPackage(state, { name: 'New User', sponsorId: 'u1', rootId: 'u1' });
  assert.equal(result.user.name, 'New User');
  assert.equal(state.purchases.length, 1);
  assert.equal(state.payouts.reduce((sum, item) => sum + item.amount, 0), 100);
  assert.equal(state.payouts.find((item) => item.type === 'referral').recipientUserId, 'u1');
});

test('registration places under the selected sponsor subtree', () => {
  const state = baseState();
  const result = registerMemberWithPackage(state, { name: 'Sponsored User', sponsorId: 'u2', rootId: 'u1' });
  const position = state.binaryPositions.find((item) => item.userId === result.user.id);
  assert.equal(position.parentId, 'u2');
  assert.equal(state.payouts.find((item) => item.type === 'referral').recipientUserId, 'u2');
});

test('registration without sponsor pays referral to system user one', () => {
  const state = baseState();
  const result = registerMemberWithPackage(state, { name: 'Unreferred User', rootId: 'u1' });
  const referral = state.payouts.find((item) => item.type === 'referral');
  const position = state.binaryPositions.find((item) => item.userId === result.user.id);
  assert.equal(position.parentId, 'u1');
  assert.equal(position.side, 'center');
  assert.equal(referral.recipientUserId, 'u1');
});

test('payouts send structure to three tree ancestors with realtime and reserve wallets', () => {
  const state = baseState();
  const purchase = createPurchase(state, 'u2');
  const payouts = calculatePayouts(state, purchase.purchase.id);
  const structure = payouts.filter((item) => item.type === 'structure');
  assert.equal(structure.length, 6);
  assert.equal(new Set(structure.map((item) => item.level)).size, 3);
  for (const level of [1, 2, 3]) {
    const levelRows = structure.filter((item) => item.level === level);
    assert.equal(new Set(levelRows.map((item) => item.recipientUserId)).size, 1);
    assert.equal(levelRows.reduce((sum, item) => sum + item.amount, 0), 20);
    assert.equal(levelRows.find((item) => item.walletRole === 'realtime').amount, 10);
    assert.equal(levelRows.find((item) => item.walletRole === 'reserve').amount, 10);
  }
  assert.equal(structure.filter((item) => item.walletRole === 'realtime').reduce((sum, item) => sum + item.amount, 0), 30);
  assert.equal(structure.filter((item) => item.walletRole === 'reserve').reduce((sum, item) => sum + item.amount, 0), 30);
  assert.ok(structure.filter((item) => item.walletRole === 'realtime' && item.recipientUserId).every((item) => item.status === 'paid'));
  assert.ok(structure.filter((item) => item.walletRole === 'reserve' && item.recipientUserId).every((item) => item.status === 'accumulating'));
  const fvr = payouts.find((item) => item.type === 'fvr');
  assert.equal(fvr.status, 'paid');
  assert.equal(fvr.recipientName, 'FRM System Wallet');
  assert.equal(fvr.wallet, 'FRM system wallet');
});

test('registration activates the member and records reserve accumulation', () => {
  const state = baseState();
  const result = registerMemberWithPackage(state, { name: 'Active User', sponsorId: 'u1', rootId: 'u1' });
  assert.equal(result.user.status, 'active');
  assert.equal(state.reserveBalances.u1, 10);
  assert.equal(state.settings.rebirthEnabled, true);
});

test('seeds the requested number of random active users with package purchases', () => {
  const state = baseState();
  const result = seedRandomUsers(state, 19);
  assert.equal(result.users.length, 19);
  assert.equal(result.purchases.length, 19);
  assert.ok(result.users.every((user) => user.status === 'active'));
  assert.equal(state.users.length, 22 + state.rebirths.length);
  assert.ok(state.rebirths.length > 0);
  assert.equal(state.purchases.length, 19);
  assert.equal(state.payouts.length, 19 * 18);
});

test('seeds random users across three ternary levels without exceeding level three', () => {
  const state = createEmptyState();
  state.users.push({ id: 'u1', username: 'root', name: 'Root', sponsorId: null, role: 'user' });
  state.binaryPositions.push({ userId: 'u1', parentId: null, side: null, depth: 0 });
  const result = seedRandomUsers(state, 40, { maxDepth: 3 });
  assert.ok(result.users.length < 40);
  assert.ok(state.binaryPositions.every((position) => position.depth <= 3));
  assert.ok(result.users.every((user) => user.status === 'active'));
  assert.ok(result.users.some((user) => state.binaryPositions.find((position) => position.userId === user.id)?.depth === 3));
});

test('auto placement caps a deep ternary simulation at level five', () => {
  const state = createEmptyState();
  state.users.push({ id: 'u1', username: 'root', name: 'Root', sponsorId: null, role: 'user' });
  state.binaryPositions.push({ userId: 'u1', parentId: null, side: null, depth: 0 });
  for (let index = 0; index < 400; index += 1) {
    const userId = `deep-${index}`;
    state.users.push({ id: userId, username: userId, name: userId, sponsorId: 'u1', role: 'user' });
    const result = autoPlaceMember(state, { userId, rootId: 'u1', maxDepth: 5 });
    if (!result.ok) break;
  }
  assert.ok(state.binaryPositions.every((position) => position.depth <= 5));
});

test('five-level random simulation also keeps rebirth nodes within level five', () => {
  const state = createEmptyState();
  state.users.push({ id: 'u1', username: 'root', name: 'Root', sponsorId: null, role: 'user' });
  state.binaryPositions.push({ userId: 'u1', parentId: null, side: null, depth: 0 });
  seedRandomUsers(state, 60, { maxDepth: 5 });
  assert.ok(state.binaryPositions.every((position) => position.depth <= 5));
});

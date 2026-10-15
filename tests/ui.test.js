import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyState } from '../dist/storage.js';
import { tree, dashboard, transactionsAudit, earningsDetailed, memberDetailsPanelModal } from '../dist/views.js';

test('binary tree view renders explicit connector lines and wallet labels', () => {
  const state = createEmptyState();
  state.session = { id: 'demo-user', username: 'demo-user', role: 'user' };
  state.users.push({ id: 'u1', username: 'root', name: 'Root', sponsorId: null, role: 'user' });
  state.binaryPositions.push({ userId: 'u1', parentId: null, side: null, depth: 0 });
  const html = tree(state);
  assert.match(html, /binary-lines/);
  assert.match(html, /wallet-label/);
  assert.doesNotMatch(html, /PAYOUT PLAN \/ 100 USDT/);
  assert.doesNotMatch(html, /tree-toolbar/);
  assert.doesNotMatch(html, /ดูเส้นทางการจ่าย/);
  assert.doesNotMatch(html, /ภาพรวมระบบ/);
  assert.doesNotMatch(html, /DEMO \/ TESTNET/);
  assert.doesNotMatch(html, /STRUCTURE MAP/);
});

test('binary tree highlights direct referral edges and rebirth nodes', () => {
  const state = createEmptyState();
  state.session = { id: 'demo-user', username: 'demo-user', role: 'user' };
  state.users.push(
    { id: 'u1', username: 'root', name: 'Root', sponsorId: null, role: 'user' },
    { id: 'u2', username: 'direct', name: 'Direct', sponsorId: 'u1', role: 'user' },
    { id: 'r1', username: 'root-R1', name: 'Root · Rebirth 1', sponsorId: 'u1', ownerUserId: 'u1', role: 'user', isRebirth: true }
  );
  state.binaryPositions.push(
    { userId: 'u1', parentId: null, side: null, depth: 0 },
    { userId: 'u2', parentId: 'u1', side: 'left', depth: 1 },
    { userId: 'r1', parentId: 'u1', side: 'right', depth: 1 }
  );
  const html = tree(state);
  assert.match(html, /class="direct-referral-line"/);
  assert.match(html, /data-direct-referral="true"/);
  assert.match(html, /data-from="u1"/);
  assert.match(html, /data-to="u2"/);
  assert.match(html, /rebirth-node/);
});

test('dashboard and tree expose the full payout plan clearly', () => {
  const state = createEmptyState();
  state.session = { id: 'demo-user', username: 'demo-user', role: 'user' };
  assert.match(dashboard(state), /payout-plan/);
  assert.match(dashboard(state), /ค่าแนะนำ/);
  assert.match(transactionsAudit(state), /Money Flow Explorer/);
});

test('tree graph renders one connector layer and payout chips on each member', () => {
  const state = createEmptyState();
  state.session = { id: 'demo-user', username: 'demo-user', role: 'user' };
  state.users.push({ id: 'u1', username: 'root', name: 'Root', sponsorId: null, role: 'user' });
  state.binaryPositions.push({ userId: 'u1', parentId: null, side: null, depth: 0 });
  const html = tree(state);
  assert.match(html, /binary-lines/);
  assert.match(html, /payment-chips/);
  assert.match(html, /Referral/);
  assert.match(html, /tree-zoom-in/);
  assert.match(html, /tree-zoom-fit/);
  assert.match(html, /data-user="u1"/);
});

test('transaction view renders an easy-to-scan purchase flow', () => {
  const state = createEmptyState();
  state.session = { id: 'demo-user', username: 'demo-user', role: 'user' };
  state.users.push({ id: 'u1', username: 'root', name: 'Root', sponsorId: null, role: 'user' });
  state.purchases.push({ id: 'buy-1', buyerId: 'u1', amount: 100, currency: 'USDT', createdAt: new Date().toISOString() });
  state.payouts.push({ id: 'pay-1', purchaseId: 'buy-1', sourceUserId: 'u1', recipientUserId: 'u1', recipientName: 'Root', wallet: 'root wallet', type: 'referral', amount: 30, status: 'pending' });
  const html = transactionsAudit(state);
  assert.match(html, /transaction-flow/);
  assert.match(html, /flow-route/);
  assert.match(html, /ต้นทาง/);
});

test('earnings view includes every wallet and user-level detail', () => {
  const state = createEmptyState();
  state.session = { id: 'demo-user', username: 'demo-user', role: 'user' };
  state.users.push({ id: 'u1', username: 'root', name: 'Root', sponsorId: null, role: 'user' });
  const html = earningsDetailed(state);
  assert.match(html, /earn-user-card/);
  assert.match(html, /FVR \/ FM Activity/);
  assert.match(html, /Sponsor:/);
  assert.match(html, /payout rows/);
});

test('member detail modal exposes colored income breakdown and wallet transactions', () => {
  const state = createEmptyState();
  state.locale = 'th';
  state.session = { id: 'demo-user', username: 'demo-user', role: 'user' };
  state.users.push({ id: 'u1', username: 'root', name: 'Root', sponsorId: null, role: 'user' });
  state.payouts.push(
    { id: 'p1', purchaseId: 'buy-1', sourceUserId: 'u2', recipientUserId: 'u1', recipientName: 'Root', wallet: 'root wallet', type: 'referral', amount: 30, status: 'pending' },
    { id: 'p2', purchaseId: 'buy-1', sourceUserId: 'u3', recipientUserId: 'u1', recipientName: 'Root', wallet: 'root wallet', type: 'uni', level: 2, amount: 1, status: 'paid' },
    { id: 'p3', purchaseId: 'buy-1', sourceUserId: 'u4', recipientUserId: 'u1', recipientName: 'Root', wallet: 'root wallet', type: 'structure', level: 1, amount: 10, status: 'paid' }
  );
  const html = memberDetailsPanelModal(state, 'u1');
  assert.match(html, /income-card referral/);
  assert.match(html, /income-card uni/);
  assert.match(html, /income-card structure/);
  assert.match(html, /structure-realtime/);
  assert.match(html, /structure-reserve/);
  assert.match(html, /structure-summary/);
  assert.match(html, /รายได้รวม/);
  assert.match(html, /Source User/);
  assert.match(html, /payout-detail-row/);
  assert.match(html, /payout-batch/);
});

test('earnings view separates structure realtime and reserve wallets', () => {
  const state = createEmptyState();
  state.session = { id: 'demo-user', username: 'demo-user', role: 'user' };
  state.users.push({ id: 'u1', username: 'root', name: 'Root', sponsorId: null, role: 'user' });
  const html = earningsDetailed(state);
  assert.match(html, /structure-realtime/);
  assert.match(html, /structure-reserve/);
  assert.match(html, /structure-summary/);
});

test('member details exposes rebirth code and searchable registry', () => {
  const state = createEmptyState();
  state.session = { id: 'demo-user', username: 'demo-user', role: 'user' };
  state.users.push({ id: 'u1', username: 'root', name: 'Root', sponsorId: null, role: 'user', status: 'active' });
  state.binaryPositions.push({ userId: 'u1', parentId: null, side: null, depth: 0 });
  state.reserveBalances = { u1: 0 };
  state.rebirths = [{ id: 'rebirth-1', ownerUserId: 'u1', userId: 'r1', amount: 100, createdAt: new Date().toISOString() }];
  state.users.push({ id: 'r1', username: 'root-R1', name: 'Root · Rebirth 1', sponsorId: 'u1', ownerUserId: 'u1', role: 'user', status: 'active', isRebirth: true });
  state.binaryPositions.push({ userId: 'r1', parentId: 'u1', side: 'left', depth: 1 });
  assert.match(memberDetailsPanelModal(state, 'u1'), /Rebirth 1/);
  assert.match(memberDetailsPanelModal(state, 'u1'), /data-action="focus-rebirth"/);
  assert.match(memberDetailsPanelModal(state, 'u1'), /data-user="r1"/);
  assert.match(earningsDetailed(state), /rebirth-search/);
  assert.match(earningsDetailed(state), /root-R1/);
  assert.match(earningsDetailed(state), /data-action="focus-rebirth"/);
});

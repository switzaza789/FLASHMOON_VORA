import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEmptyState } from '../dist/storage.js';
import { tree, dashboard, admin, transactionsAudit, earningsDetailed, memberDetailsPanelModal } from '../dist/views.js';

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

test('ternary tree renders left center right connectors and center slot metadata', () => {
  const state = createEmptyState();
  state.session = { id: 'demo-user', username: 'demo-user', role: 'user' };
  state.users.push(
    { id: 'u1', username: 'root', name: 'Root', sponsorId: null, role: 'user' },
    { id: 'u2', username: 'center', name: 'Center', sponsorId: 'u1', role: 'user' }
  );
  state.binaryPositions.push(
    { userId: 'u1', parentId: null, side: null, depth: 0 },
    { userId: 'u2', parentId: 'u1', side: 'center', depth: 1 }
  );
  const html = tree(state);
  assert.match(html, /TERNARY TREE/);
  assert.match(html, /data-side="center"/);
  assert.match(html, /CENTER/);
  assert.match(html, /data-side="left"/);
  assert.match(html, /data-side="right"/);
  assert.match(html, /aria-label="Ternary tree connections"/);
});

test('ternary tree view caps visible depth at level five', () => {
  const state = createEmptyState();
  state.session = { id: 'demo-user', username: 'demo-user', role: 'user' };
  for (let index = 0; index <= 6; index += 1) {
    const userId = `u${index}`;
    state.users.push({ id: userId, username: userId, name: `User ${index}`, sponsorId: index ? `u${index - 1}` : null, role: 'user' });
    state.binaryPositions.push({ userId, parentId: index ? `u${index - 1}` : null, side: index ? 'left' : null, depth: index });
  }
  const html = tree(state);
  assert.match(html, /L5 · u5/);
  assert.doesNotMatch(html, /L6 · u6/);
});

test('dashboard and tree expose the full payout plan clearly', () => {
  const state = createEmptyState();
  state.session = { id: 'demo-user', username: 'demo-user', role: 'user' };
  assert.match(dashboard(state), /payout-plan/);
  assert.match(dashboard(state), /ค่าแนะนำ/);
  assert.match(transactionsAudit(state), /Money Flow Explorer/);
});

test('admin exposes a five-level random simulation action', () => {
  const state = createEmptyState();
  state.session = { id: 'demo-admin', username: 'demo-admin', role: 'admin' };
  assert.match(admin(state), /seed-random-5/);
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
  assert.match(html, /tree-center/);
  assert.match(html, /data-user="u1"/);
});

test('tree center action recenters the viewport without changing zoom', () => {
  const appSource = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
  assert.match(appSource, /action === 'tree-center'/);
  assert.match(appSource, /scrollLeft = Math\.max\(0, \(stage\.offsetWidth \* zoom - viewport\.clientWidth\) \/ 2\)/);
  assert.match(appSource, /scrollTop = Math\.max\(0, \(stage\.offsetHeight \* zoom - viewport\.clientHeight\) \/ 2\)/);
});

test('tree zoom supports viewing a full large ternary graph below 25 percent', () => {
  const appSource = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
  assert.match(appSource, /Math\.max\(0\.1, next\)/);
});

test('member income detail keeps the full summary scrollable on short screens', () => {
  const cssSource = readFileSync(new URL('../dist/tree-overrides.css', import.meta.url), 'utf8');
  assert.match(cssSource, /\.modal:has\(\.member-detail-layout\)\{width:min\(1120px,96vw\);max-height:min\(900px,92vh\);overflow:auto/);
});

test('structure income levels use readable rows instead of cramped columns', () => {
  const cssSource = readFileSync(new URL('../dist/tree-overrides.css', import.meta.url), 'utf8');
  assert.match(cssSource, /\.structure-split \.level-breakdown,\.structure-split>div>div\{display:grid;grid-template-columns:1fr !important;/);
  assert.match(cssSource, /\.structure-split \.level-row b\{margin-left:auto;font-size:11px;/);
});

test('structure income rows override legacy five-column layout', () => {
  const cssSource = readFileSync(new URL('../dist/tree-overrides.css', import.meta.url), 'utf8');
  assert.match(cssSource, /grid-template-columns:1fr !important/);
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
  assert.match(html, /structure-full-width/);
  assert.match(html, /5 ชั้น · ชั้นละ 10 USDT/);
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

import { loadState, saveState, resetState, createDemoSession } from './storage.js';
import { placeMember, autoPlaceMember, createPurchase, calculatePayouts, recordPayouts, registerMemberWithPackage, seedRandomUsers } from './domain.js';
import { entry, dashboard, tree, transactionsAudit, earningsDetailed, admin, flowModal, memberDetailsPanelModal, layout } from './views.js';

let state = loadState();
let currentView = state.session ? 'dashboard' : 'entry';
const app = document.querySelector('#app');

const seedMode = new URLSearchParams(location.search).get('seed');
if (seedMode === 'random19' || seedMode === 'random3' || seedMode === 'random5') {
  const seeded = seedMode === 'random5' ? seedRandomUsers(state, 60, { maxDepth: 5 }) : seedMode === 'random3' ? seedRandomUsers(state, 12, { maxDepth: 3 }) : seedRandomUsers(state, 19);
  saveState(state);
  history.replaceState({}, '', location.pathname);
  if (seeded.users.length) currentView = 'tree';
}

function render() {
  const views = { entry: () => entry(state), dashboard: () => dashboard(state), tree: () => tree(state), transactions: () => transactionsAudit(state), earnings: () => earningsDetailed(state), admin: () => admin(state) };
  try { app.innerHTML = views[currentView]?.() || dashboard(state); bindTreeInteractions(); bindTreeNodeInteractions(); } catch (error) { console.error(error); app.innerHTML = `<main style="padding:40px;color:#ffb0b0;font-family:system-ui"><h1>Demo could not render</h1><p>${error.message}</p></main>`; }
}
function persist() { saveState(state); render(); }
function toast(message, tone = 'info') { const node = document.createElement('div'); node.className = `toast ${tone}`; node.textContent = message; document.body.append(node); setTimeout(() => node.remove(), 2800); }
function openModal(html) { document.body.insertAdjacentHTML('beforeend', html.includes('modal-backdrop') ? html : `<div class="modal-backdrop">${html}</div>`); }
function closeModal() { document.querySelectorAll('.modal-backdrop').forEach((node) => node.remove()); }
document.addEventListener('input', (event) => { if (!event.target.matches('[data-rebirth-search]')) return; const query = event.target.value.trim().toLowerCase(); document.querySelectorAll('[data-rebirth-entry]').forEach((entry) => { entry.hidden = query && !entry.dataset.searchText.includes(query); }); });
function selectTreeNode(userId) { document.querySelectorAll('.graph-node').forEach((node) => { node.classList.toggle('is-selected', node.dataset.user === userId); node.classList.toggle('direct-referral-member', node.dataset.sponsor === userId); }); document.querySelectorAll('.binary-lines line[data-direct-referral="true"]').forEach((line) => { line.classList.toggle('direct-referral', line.dataset.to === userId); line.classList.toggle('direct-referral-member-line', line.dataset.from === userId); }); }
function nodeAtPointer(event) { const direct = event.target.closest?.('.graph-node'); if (direct) return direct; return [...document.querySelectorAll('.graph-node')].find((node) => { const rect = node.getBoundingClientRect(); return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom; }); }
function bindTreeNodeInteractions() { const viewport = document.querySelector('[data-tree-viewport]'); if (!viewport || viewport.dataset.nodeEventsBound) return; viewport.dataset.nodeEventsBound = 'true'; let clickTimer = null; viewport.addEventListener('click', (event) => { const node = nodeAtPointer(event); if (!node) return; clearTimeout(clickTimer); clickTimer = setTimeout(() => selectTreeNode(node.dataset.user), 220); }); viewport.addEventListener('dblclick', (event) => { const node = nodeAtPointer(event); if (!node) return; clearTimeout(clickTimer); openModal(memberDetailsPanelModal(state, node.dataset.user)); }); }

document.addEventListener('click', (event) => {
  const view = event.target.closest('[data-view]')?.dataset.view;
  const actionEl = event.target.closest('[data-action]');
  const action = actionEl?.dataset.action;
  if (view) { currentView = view; render(); return; }
  if (!action) return;
  if (action === 'toggle-locale') { state.locale = state.locale === 'th' ? 'en' : 'th'; persist(); return; }
  if (action === 'demo-user' || action === 'demo-admin') { state.session = createDemoSession(action === 'demo-admin' ? 'admin' : 'user'); currentView = 'dashboard'; persist(); return; }
  if (action === 'register') { openRegister(); return; }
  if (action === 'reset') { if (confirm('รีเซ็ตข้อมูล Demo/Testnet ทั้งหมด?')) { state = resetState(); currentView = 'entry'; render(); } return; }
  if (action === 'buy') { openBuy(); return; }
  if (action === 'show-flow') { openModal(flowModal(state, actionEl.dataset.purchase)); return; }
  if (action === 'member-details') { openModal(memberDetailsPanelModal(state, actionEl.closest('[data-user]')?.dataset.user)); return; }
  if (action === 'focus-rebirth') { closeModal(); currentView = 'tree'; render(); setTimeout(() => { const node = document.querySelector(`[data-user="${actionEl.dataset.user}"]`); if (!node) return; node.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); node.classList.add('is-rebirth-focus'); setTimeout(() => node.classList.remove('is-rebirth-focus'), 2200); }, 60); return; }
  if (action === 'tree-zoom-in' || action === 'tree-zoom-out' || action === 'tree-zoom-reset' || action === 'tree-zoom-fit') { changeTreeZoom(action); return; }
  if (action === 'close-modal') { closeModal(); return; }
  if (action === 'process') { processRun(); return; }
  if (action === 'seed-random-5') { const result = seedRandomUsers(state, 60, { maxDepth: 5 }); persist(); currentView = 'tree'; render(); toast(`จำลองสมาชิกสุ่ม ${result.users.length} คน ไม่เกิน 5 ชั้น พร้อมซื้อแพ็กเกจแล้ว`, 'success'); return; }
  if (action === 'seed-random') { const result = seedRandomUsers(state, 19); persist(); toast(`เพิ่มสมาชิกสุ่ม ${result.users.length} คน พร้อมซื้อแพ็กเกจแล้ว`, 'success'); return; }
  if (action === 'auto-place') { openPlacement(true); return; }
});

function setTreeZoom(next, focusX = null, focusY = null) { const viewport = document.querySelector('[data-tree-viewport]'); const stage = document.querySelector('[data-tree-stage]'); if (!viewport || !stage) return; const current = Number(stage.dataset.zoom || 1); const clamped = Math.min(2.2, Math.max(0.1, next)); const rect = viewport.getBoundingClientRect(); const localX = focusX === null ? rect.width / 2 : focusX - rect.left; const localY = focusY === null ? rect.height / 2 : focusY - rect.top; const contentX = (viewport.scrollLeft + localX) / current; const contentY = (viewport.scrollTop + localY) / current; stage.dataset.zoom = clamped.toFixed(2); stage.style.zoom = clamped; const label = document.querySelector('[data-zoom-value]'); if (label) label.textContent = `${Math.round(clamped * 100)}%`; viewport.scrollLeft = Math.max(0, contentX * clamped - localX); viewport.scrollTop = Math.max(0, contentY * clamped - localY); }
function changeTreeZoom(action) { const stage = document.querySelector('[data-tree-stage]'); const viewport = document.querySelector('[data-tree-viewport]'); if (!stage || !viewport) return; if (action === 'tree-zoom-fit') { stage.style.zoom = 1; stage.dataset.zoom = '1'; const widthRatio = (viewport.clientWidth - 36) / stage.offsetWidth; const heightRatio = (viewport.clientHeight - 36) / stage.offsetHeight; setTreeZoom(Math.min(1, widthRatio, heightRatio)); return; } const current = Number(stage.dataset.zoom || 1); setTreeZoom(action === 'tree-zoom-reset' ? 1 : current + (action === 'tree-zoom-in' ? 0.15 : -0.15)); }
function bindTreeInteractions() { const viewport = document.querySelector('[data-tree-viewport]'); if (!viewport || viewport.dataset.bound) return; viewport.dataset.bound = 'true'; viewport.scrollLeft = 0; viewport.scrollTop = 0; let dragging = false; let startX = 0; let startY = 0; let scrollLeft = 0; let scrollTop = 0; viewport.addEventListener('wheel', (event) => { event.preventDefault(); const current = Number(document.querySelector('[data-tree-stage]')?.dataset.zoom || 1); setTreeZoom(current + (event.deltaY < 0 ? 0.1 : -0.1), event.clientX, event.clientY); }, { passive: false }); viewport.addEventListener('pointerdown', (event) => { if (event.target.closest('[data-action="member-details"]')) return; dragging = true; viewport.setPointerCapture(event.pointerId); startX = event.clientX; startY = event.clientY; scrollLeft = viewport.scrollLeft; scrollTop = viewport.scrollTop; viewport.classList.add('is-dragging'); }); viewport.addEventListener('pointermove', (event) => { if (!dragging) return; viewport.scrollLeft = scrollLeft - (event.clientX - startX); viewport.scrollTop = scrollTop - (event.clientY - startY); }); const stop = (event) => { if (!dragging) return; dragging = false; if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId); viewport.classList.remove('is-dragging'); }; viewport.addEventListener('pointerup', stop); viewport.addEventListener('pointercancel', stop); viewport.addEventListener('pointerleave', (event) => { if (event.buttons === 0) stop(event); }); }

function openRegister() {
  const l = state.locale;
  openModal(`<div class="modal"><button class="modal-close" data-action="close-modal">×</button><span class="eyebrow">JOIN + PACKAGE</span><h2>${l === 'th' ? 'สมัครสมาชิกและซื้อแพ็กเกจ' : 'Join and buy package'}</h2><p class="subtext">${l === 'th' ? 'การสมัครจะสร้างรายการซื้อจำลอง 100 USDT และคำนวณการจ่ายทันที' : 'Registration creates a simulated 100 USDT purchase and calculates payouts instantly.'}</p><form id="register-form"><label>${l === 'th' ? 'ชื่อสมาชิก (ใช้เป็นชื่อเดียวทั้งระบบ)' : 'Member name (used everywhere)'}<input name="name" required placeholder="Somchai Demo"></label><label>${l === 'th' ? 'ผู้แนะนำ / สายเลือด' : 'Sponsor / upline'}<select name="sponsorId"><option value="">${l === 'th' ? 'ไม่มี / Root' : 'None / Root'}</option>${state.users.map((u) => `<option value="${u.id}">${u.name}</option>`).join('')}</select></label><div class="auto-placement-note">⚡ ${l === 'th' ? 'ระบบจะวางอัตโนมัติ ซ้ายไปขวา บนลงล่าง และซื้อแพ็กเกจ 100 USDT จำลองทันที' : 'Auto-placement left to right, top to bottom with a simulated 100 USDT package purchase'}</div><div class="modal-actions"><button type="button" class="secondary" data-action="close-modal">Cancel</button><button class="primary">${l === 'th' ? 'สมัครและซื้อแพ็กเกจ' : 'Join + buy package'} →</button></div></form></div>`);
  document.querySelector('#register-form').addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const name = data.get('name').trim(); if (state.users.some((u) => u.name.toLowerCase() === name.toLowerCase())) return toast('ชื่อนี้มีอยู่แล้ว', 'error'); try { const root = state.binaryPositions.find((p) => !p.parentId)?.userId || null; registerMemberWithPackage(state, { name, sponsorId: data.get('sponsorId') || null, rootId: root }); closeModal(); currentView = 'tree'; persist(); toast('สมัครสมาชิก สร้างรายการจ่าย และเปิดผัง Ternary แล้ว', 'success'); } catch (error) { toast(error.message, 'error'); } });
}

function openPlacement(auto = false, newUserId = null) {
  const userId = newUserId || state.users.at(-1)?.id; const l = state.locale; const parents = state.users.filter((u) => state.binaryPositions.some((p) => p.userId === u.id));
  if (auto) { const root = state.binaryPositions.find((p) => !p.parentId); const result = autoPlaceMember(state, { userId, rootId: root?.userId }); if (!result.ok) toast(result.error, 'error'); else { persist(); toast('วางสมาชิกอัตโนมัติแล้ว', 'success'); } return; }
  openModal(`<div class="modal"><button class="modal-close" data-action="close-modal">×</button><span class="eyebrow">TERNARY PLACEMENT</span><h2>${l === 'th' ? 'เลือกตำแหน่งสมาชิก' : 'Choose placement'}</h2><form id="placement-form"><label>${l === 'th' ? 'วางใต้สมาชิก' : 'Place under'}<select name="parentId">${parents.map((u) => `<option value="${u.id}">${u.name} (@${u.username})</option>`).join('')}</select></label><div class="side-options ternary-options"><label><input type="radio" name="side" value="left" checked><span>← ${l === 'th' ? 'ซ้าย' : 'Left'}</span></label><label><input type="radio" name="side" value="center"><span>↑ ${l === 'th' ? 'กลาง' : 'Center'}</span></label><label><input type="radio" name="side" value="right"><span>${l === 'th' ? 'ขวา' : 'Right'} →</span></label></div><div class="modal-actions"><button type="button" class="secondary" data-action="close-modal">Cancel</button><button class="primary">Place member →</button></div></form></div>`);
  document.querySelector('#placement-form').addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const result = placeMember(state, { userId, parentId: data.get('parentId'), side: data.get('side') }); if (!result.ok) return toast(result.error, 'error'); closeModal(); persist(); toast('วางสมาชิกแล้ว', 'success'); });
}

function openBuy() {
  const l = state.locale; if (!state.users.some((u) => u.username === state.session.username)) { const user = { id: `u-${Date.now()}`, username: state.session.username, name: state.session.username === 'demo-user' ? 'Demo User' : 'Demo Admin', sponsorId: null, role: state.session.role, status: 'active' }; state.users.push(user); state.binaryPositions.push({ userId: user.id, parentId: null, side: null, depth: 0 }); }
  const buyerId = state.users.find((u) => u.username === state.session.username)?.id;
  openModal(`<div class="modal purchase-modal"><button class="modal-close" data-action="close-modal">×</button><span class="eyebrow">SIMULATED CHECKOUT</span><h2>${l === 'th' ? 'ยืนยันการซื้อแพ็กเกจ' : 'Confirm package purchase'}</h2><div class="purchase-total"><span>FVR / FM</span><strong>100 <small>USDT</small></strong><em>${l === 'th' ? 'ยอดจำลองเท่านั้น' : 'Simulation only'}</em></div><div class="mini-breakdown"><div><span>Referral</span><b>30 USDT</b></div><div><span>Uni · 10 levels</span><b>10 USDT</b></div><div><span>Structure · 5 levels</span><b>50 USDT</b></div><div><span>FVR/FM Wallet</span><b>10 USDT</b></div></div><button class="primary full" data-action="confirm-buy" data-buyer="${buyerId}">${l === 'th' ? 'ยืนยันการซื้อจำลอง' : 'Confirm simulated purchase'} →</button><p class="modal-note">Demo/Testnet · ไม่มีการหักเงินหรือเชื่อมต่อกระเป๋าเงินจริง</p></div>`);
}

document.addEventListener('click', (event) => { const el = event.target.closest('[data-action="confirm-buy"]'); if (!el) return; const result = createPurchase(state, el.dataset.buyer, `purchase-${Date.now()}`); const payouts = calculatePayouts(state, result.purchase.id); recordPayouts(state, payouts); closeModal(); currentView = 'transactions'; persist(); toast('สร้างธุรกรรมจำลองและจ่าย Real Time แล้ว', 'success'); });

function processRun() { const pending = state.payouts.filter((p) => p.status === 'pending'); pending.forEach((p) => { p.status = 'paid'; }); state.processingRuns.push({ id: `run-${Date.now()}`, actorId: state.session?.id, count: pending.length, createdAt: new Date().toISOString() }); persist(); toast(`ประมวลผล ${pending.length} รายการแล้ว`, 'success'); }

render();

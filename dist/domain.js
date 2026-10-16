const id = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function placeMember(state, { userId, parentId, side }) {
  if (!['left', 'center', 'right'].includes(side)) return { ok: false, error: 'เลือกตำแหน่งซ้าย กลาง หรือขวา' };
  if (state.binaryPositions.some((position) => position.parentId === parentId && position.side === side)) return { ok: false, error: 'ตำแหน่งนี้ถูกใช้งานแล้ว' };
  const parent = state.binaryPositions.find((position) => position.userId === parentId);
  const position = { userId, parentId, side, depth: (parent?.depth ?? -1) + 1 };
  state.binaryPositions.push(position);
  return { ok: true, position };
}

export function autoPlaceMember(state, { userId, rootId, maxDepth = Infinity }) {
  const queue = [rootId];
  while (queue.length) {
    const parentId = queue.shift();
    const parent = state.binaryPositions.find((position) => position.userId === parentId);
    if ((parent?.depth ?? 0) >= maxDepth) continue;
    for (const side of ['left', 'center', 'right']) {
      if (!state.binaryPositions.some((position) => position.parentId === parentId && position.side === side)) return placeMember(state, { userId, parentId, side });
    }
    state.binaryPositions
      .filter((position) => position.parentId === parentId)
      .sort((a, b) => ({ left: 0, center: 1, right: 2 }[a.side] ?? 9) - ({ left: 0, center: 1, right: 2 }[b.side] ?? 9))
      .forEach((position) => queue.push(position.userId));
  }
  return { ok: false, error: 'ไม่พบตำแหน่งว่างในผัง' };
}

export function createPurchase(state, buyerId, key = id('purchase')) {
  const existing = state.purchases.find((purchase) => purchase.idempotencyKey === key);
  if (existing) return { purchase: existing, duplicate: true };
  const purchase = { id: id('buy'), idempotencyKey: key, buyerId, amount: 100, currency: 'USDT', status: 'calculated', createdAt: new Date().toISOString() };
  state.purchases.push(purchase);
  return { purchase, duplicate: false };
}

function ancestors(state, userId, limit) {
  const result = [];
  let current = state.users.find((user) => user.id === userId);
  for (let i = 0; i < limit && current?.sponsorId; i += 1) {
    current = state.users.find((user) => user.id === current.sponsorId);
    if (current) result.push(current);
  }
  return result;
}

export function calculatePayouts(state, purchaseId) {
  const purchase = state.purchases.find((item) => item.id === purchaseId);
  if (!purchase) return [];
  const buyer = state.users.find((user) => user.id === purchase.buyerId);
  const payouts = [];
  const add = (type, amount, recipient, meta = {}) => {
    const isFvr = type === 'fvr';
    const walletRole = meta.walletRole || (isFvr ? 'system' : 'realtime');
    const status = isFvr ? 'paid' : !recipient ? 'unmatched' : walletRole === 'realtime' ? 'paid' : walletRole === 'reserve' ? 'accumulating' : 'unmatched';
    payouts.push({ id: id('pay'), purchaseId, sourceUserId: buyer?.id, recipientUserId: recipient?.id ?? null, recipientName: recipient?.name ?? (isFvr ? 'FVR/FM System Wallet' : 'ไม่มีผู้รับ'), type, amount, wallet: recipient ? `${recipient.username} wallet` : isFvr ? 'FVR/FM system wallet' : 'unassigned wallet', status, reason: recipient || isFvr ? null : 'ไม่มีผู้รับตามชั้นที่กำหนด', ...meta });
  };
  const systemRootId = state.binaryPositions.find((position) => !position.parentId)?.userId;
  const referralRecipient = buyer?.sponsorId ? state.users.find((user) => user.id === buyer.sponsorId) : state.users.find((user) => user.id === systemRootId);
  add('referral', 30, referralRecipient);
  const uni = ancestors(state, buyer?.id, 10);
  for (let level = 1; level <= 10; level += 1) add('uni', 1, uni[level - 1], { level });
  const position = state.binaryPositions.find((item) => item.userId === buyer?.id);
  let currentParent = position?.parentId;
  for (let level = 1; level <= 5; level += 1) {
    const parent = state.users.find((user) => user.id === currentParent);
    add('structure', 6, parent, { level, walletRole: 'realtime', walletLabel: 'Structure realtime wallet' });
    add('structure', 4, parent, { level, walletRole: 'reserve', walletLabel: 'Structure reserve wallet' });
    currentParent = state.binaryPositions.find((item) => item.userId === currentParent)?.parentId;
  }
  add('fvr', 10, null, { wallet: 'FVR/FM system wallet', walletRole: 'system', status: 'paid' });
  return payouts;
}

function createRebirthCode(state, owner, maxDepth = Infinity) {
  const count = state.rebirths.filter((rebirth) => rebirth.ownerUserId === owner.id).length + 1;
  const user = { id: id('rebirth'), name: `${owner.name} · Rebirth ${count}`, username: `${owner.username}-R${count}`, sponsorId: owner.id, ownerUserId: owner.id, role: 'user', status: 'active', isRebirth: true };
  state.users.push(user);
  const placement = autoPlaceMember(state, { userId: user.id, rootId: owner.id, maxDepth });
  if (!placement.ok) return null;
  const rebirth = { id: id('rebirth-record'), ownerUserId: owner.id, userId: user.id, amount: 100, createdAt: new Date().toISOString() };
  state.rebirths.push(rebirth);
  return rebirth;
}

export function recordPayouts(state, payouts, maxDepth = Infinity) {
  state.reserveBalances ||= {};
  state.rebirths ||= [];
  state.settings ||= {};
  state.settings.rebirthEnabled = true;
  state.settings.rebirthRule = 'structure-reserve-4-usdt-to-100';
  state.payouts.push(...payouts);
  for (const payout of payouts) {
    if (payout.type !== 'structure' || payout.walletRole !== 'reserve' || !payout.recipientUserId) continue;
    const userId = payout.recipientUserId;
    state.reserveBalances[userId] = (state.reserveBalances[userId] || 0) + payout.amount;
    while (state.reserveBalances[userId] >= 100) {
      const owner = state.users.find((user) => user.id === userId);
      if (!owner || !createRebirthCode(state, owner, maxDepth)) break;
      state.reserveBalances[userId] -= 100;
    }
  }
  return payouts;
}

export function seedRandomUsers(state, count = 19, { maxDepth = Infinity } = {}) {
  const rootId = state.binaryPositions.find((position) => !position.parentId)?.userId;
  if (!rootId) return { users: [], purchases: [], payouts: [] };
  const names = ['Nina', 'Liam', 'Maya', 'Noah', 'Iris', 'Kai', 'Luna', 'Milo', 'Aria', 'Evan', 'Zoe', 'Leo', 'Mia', 'Owen', 'Ava', 'Max', 'Ella', 'Finn', 'Ruby'];
  const created = { users: [], purchases: [], payouts: [] };
  for (let index = 0; index < count; index += 1) {
    const eligibleSponsors = state.users.filter((user) => state.binaryPositions.some((position) => position.userId === user.id));
    const sponsor = eligibleSponsors[Math.floor(Math.random() * eligibleSponsors.length)] || state.users.find((user) => user.id === rootId);
    const name = `${names[index % names.length]} Demo ${String(index + 1).padStart(2, '0')}`;
    let result;
    try {
      result = registerMemberWithPackage(state, { name, sponsorId: sponsor?.id || rootId, rootId, placementRootId: rootId, maxDepth });
    } catch (error) {
      if (maxDepth !== Infinity && /ไม่พบตำแหน่งว่าง/.test(error.message)) break;
      throw error;
    }
    created.users.push(result.user);
    created.purchases.push(result.purchase);
    created.payouts.push(...result.payouts);
  }
  return created;
}

export function registerMemberWithPackage(state, { name, sponsorId = null, rootId = null, placementRootId = null, maxDepth = Infinity }) {
  const user = { id: id('user'), name, username: name, sponsorId, role: 'user', status: 'active' };
  state.users.push(user);
  if (!state.binaryPositions.length) {
    state.binaryPositions.push({ userId: user.id, parentId: null, side: null, depth: 0 });
  } else {
    const root = placementRootId || sponsorId || rootId || state.binaryPositions.find((position) => !position.parentId)?.userId;
    const placement = autoPlaceMember(state, { userId: user.id, rootId: root, maxDepth });
    if (!placement.ok) throw new Error(placement.error);
  }
  const purchase = createPurchase(state, user.id, `registration-${user.id}`);
  const payouts = calculatePayouts(state, purchase.purchase.id);
  recordPayouts(state, payouts, maxDepth);
  return { user, purchase: purchase.purchase, payouts };
}

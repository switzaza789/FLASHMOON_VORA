const STORAGE_KEY = 'flashmoon-vora-demo-v1';

export function createEmptyState() {
  return {
    version: 1,
    users: [],
    binaryPositions: [],
    purchases: [],
    payouts: [],
    processingRuns: [],
    settings: { rebirthEnabled: false, rebirthRule: null },
    reserveBalances: {},
    rebirths: [],
    session: null,
    locale: 'th'
  };
}

export function loadState() {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    return saved ? { ...createEmptyState(), ...JSON.parse(saved) } : createEmptyState();
  } catch { return createEmptyState(); }
}

export function saveState(state) {
  globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function resetState() {
  const state = createEmptyState();
  globalThis.localStorage?.removeItem(STORAGE_KEY);
  return state;
}

export function createDemoSession(role = 'user') {
  return { id: `demo-${role}`, username: role === 'admin' ? 'demo-admin' : 'demo-user', role };
}

const labels = {
  th: { dashboard: 'แดชบอร์ด', tree: 'Ternary Tree', transactions: 'ธุรกรรม', earnings: 'รายได้', admin: 'แอดมิน', buy: 'ซื้อแพ็กเกจ', empty: 'ยังไม่มีข้อมูลในระบบ', demo: 'Demo/Testnet — ไม่ใช่การลงทุนจริงและไม่มีการโอนเงินจริง' },
  en: { dashboard: 'Dashboard', tree: 'Ternary Tree', transactions: 'Transactions', earnings: 'Earnings', admin: 'Admin', buy: 'Buy package', empty: 'No data yet', demo: 'Demo/Testnet — No real investment or money transfer' }
};
export function translate(key, locale = 'th') { return labels[locale]?.[key] ?? labels.th[key] ?? key; }
export { STORAGE_KEY };

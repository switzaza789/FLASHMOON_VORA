import { t } from './i18n.js';

export const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
export const money = (value) => `${Number(value || 0).toFixed(2)} USDT`;
export function banner(locale) { return `<div class="demo-banner"><span>◈ ${t('demo', locale)}</span><small>${t('demoNote', locale)}</small></div>`; }
export function metric(label, value, tone = '') { return `<div class="metric ${tone}"><span>${label}</span><strong>${value}</strong></div>`; }
  export function statusChip(status, locale) { const label = status === 'unmatched' ? t('unmatched', locale) : status === 'pending' ? t('pendingLabel', locale) : status === 'accumulating' ? (locale === 'en' ? 'Accumulating' : t('accumulating', locale)) : status === 'calculated' ? t('calculated', locale) : t('success', locale); return `<span class="chip ${status}">${label}</span>`; }
export function modal(id, body) { return `<div class="modal-backdrop" id="${id}"><div class="modal">${body}</div></div>`; }

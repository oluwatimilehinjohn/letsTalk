export const $ = id => document.getElementById(id);
export const state = {
  user: null, conversations: [], rooms: [], active: null, messages: new Map(),
  filter: 'all', socket: null, ready: false, loading: false, switching: false,
  page: {}, historical: false, unreadId: null, reply: null, presence: new Map(),
  generation: 0, sending: false, typing: new Map(), lastMarked: null,
};
export const nameOf = user => user?.displayName || user?.username || 'Unknown user';
export const keyOf = c => `${c.type}:${c.id}`;
export const senderOf = m => m.sender || m.user || { id: m.userId, displayName: m.displayName, username: m.username, avatarUrl: m.avatarUrl };
export const own = m => (m.senderId || m.userId) === state.user?.id;
export const titleOf = c => c.type === 'room' ? c.name : nameOf(c.otherUser);
export const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
export function button(text, className, action, label) {
  const node = el('button', className, text);
  node.type = 'button';
  if (label) { node.setAttribute('aria-label', label); node.title = label; }
  if (action) node.addEventListener('click', action);
  return node;
}
export function avatar(user, group = false) {
  const node = el('span', `avatar${group ? ' group' : ''}${state.presence.get(user?.id) ? ' online' : ''}`);
  node.setAttribute('aria-hidden', 'true');
  if (user?.avatarUrl && /^https?:\/\//.test(user.avatarUrl)) {
    const img = el('img'); img.src = user.avatarUrl; img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => { node.textContent = initials(nameOf(user)); }, { once: true });
    node.append(img);
  } else node.textContent = group ? '#' : initials(nameOf(user));
  return node;
}
function initials(name) { return name.split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase(); }
export function time(value, short = false) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  if (short && date.toDateString() !== new Date().toDateString()) return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
export function day(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  if (date.toDateString() === new Date().toDateString()) return 'Today';
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
}
let toastTimer;
export function toast(message) {
  $('toast').textContent = message; $('toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500);
}
export function empty(title, description, action) {
  const node = el('div', 'empty-state'); node.append(el('h3', '', title), el('p', '', description));
  if (action) node.append(button(action.label, 'quiet', action.run));
  return node;
}
export function skeleton(container, count = 3) { container.replaceChildren(...Array.from({ length: count }, () => el('div', 'skeleton'))); }
export function nearBottom() { const node = $('timeline'); return node.scrollHeight - node.scrollTop - node.clientHeight < 70; }
export function storage(key, value) {
  try { if (value === undefined) return sessionStorage.getItem(key) || ''; sessionStorage.setItem(key, value); } catch { /* Storage may be unavailable in private browsers. */ }
  return '';
}
export async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  if (response.status === 401) { location.replace('/'); throw new Error('Please sign in again.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status >= 500 ? 'Something went wrong. Please try again.' : data.error || 'This request could not be completed.');
  return data;
}
export function emit(event, payload) {
  if (!state.socket?.connected) return Promise.reject(new Error('You’re disconnected. Your draft is saved; try again when connected.'));
  return new Promise((resolve, reject) => {
    // Never buffer a send while offline. A missing acknowledgement is ambiguous:
    // preserve the draft and ask the user to check delivery rather than auto-retry.
    state.socket.timeout(12000).emit(event, payload, (error, result) => {
      if (error) return reject(new Error('Couldn’t confirm delivery. Check the conversation before trying again.'));
      if (!result?.ok) return reject(new Error(result?.error || 'This action could not be completed.'));
      resolve(result);
    });
  });
}
export function showDialog(dialog) { if (!dialog.open) dialog.showModal(); }

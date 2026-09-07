import { $, state, el, button, avatar, titleOf, keyOf, time, empty, api, nameOf, skeleton, toast } from './shared.js';
let activate;
export function configureSidebar(callback) { activate = callback; }
function previewOf(conversation) {
  const message = conversation.lastMessage;
  if (message?.text) {
    const sender = message.sender;
    // A name makes a busy group legible at a glance, while DMs stay compact.
    const prefix = conversation.type === 'room' && sender ? `${nameOf(sender)}: ` : '';
    return `${prefix}${message.text}`;
  }
  return conversation.lastMessagePreview || (conversation.type === 'room' ? conversation.description || 'Say hello to the group' : 'Start a conversation');
}
export function renderSidebar() {
  const all = state.conversations.filter(c => c.type !== 'room' || c.isMember);
  const list = all.filter(c => state.filter === 'all' || c.type === state.filter).sort((a, b) => new Date(b.lastMessageAt || b.updatedAt || 0) - new Date(a.lastMessageAt || a.updatedAt || 0));
  $('conversation-count').textContent = String(list.length);
  const total = all.reduce((sum, c) => sum + Number(c.unreadCount || 0), 0);
  $('total-unread').textContent = total ? `(${total})` : '';
  document.title = `${total ? `(${total}) ` : ''}${state.active ? titleOf(state.active) : 'Chats'} · Let's Talk`;
  const fragment = document.createDocumentFragment();
  for (const c of list) {
    const selected = state.active && keyOf(c) === keyOf(state.active);
    const node = button('', `conversation-item${c.unreadCount ? ' unread' : ''}`, () => activate(c));
    node.dataset.key = keyOf(c); node.setAttribute('aria-current', String(Boolean(selected)));
    node.setAttribute('aria-label', `${titleOf(c)}${c.unreadCount ? `, ${c.unreadCount} unread messages` : ''}`);
    node.append(avatar(c.type === 'room' ? { displayName: c.name } : c.otherUser, c.type === 'room'));
    const copy = el('div', 'conversation-copy'); const top = el('div', 'conversation-top');
    top.append(el('strong', '', titleOf(c)), el('time', '', time(c.lastMessageAt, true)));
    const bottom = el('div', 'conversation-bottom');
    bottom.append(el('p', '', previewOf(c)));
    if (c.unreadCount) bottom.append(el('span', 'badge', c.unreadCount > 99 ? '99+' : String(c.unreadCount)));
    copy.append(top, bottom); node.append(copy); fragment.append(node);
  }
  if (!list.length) fragment.append(empty('Your people, right here.', 'Start a chat or explore a group to get the conversation going.', { label: '＋ New conversation', run: () => $('new-chat').click() }));
  // Keep keyboard focus when a background unread/presence update refreshes the list.
  const focused = document.activeElement?.closest('.conversation-item')?.dataset.key;
  $('conversation-list').replaceChildren(fragment);
  if (focused) [...$('conversation-list').children].find(n => n.dataset.key === focused)?.focus({ preventScroll: true });
}
export async function refreshConversations() {
  const [direct, rooms, read] = await Promise.all([api('/api/direct-messages/conversations'), api('/api/rooms'), api('/api/rooms/read-summary')]);
  state.rooms = rooms.rooms;
  state.conversations = [
    ...direct.conversations.map(c => ({ ...c, type: 'direct' })),
    ...rooms.rooms.map(c => ({ ...c, ...read.rooms.find(r => r.roomId === c.id), type: 'room' })),
  ];
  renderSidebar();
}
export function upsertConversation(c) {
  const index = state.conversations.findIndex(item => keyOf(item) === keyOf(c));
  if (index < 0) state.conversations.push(c); else state.conversations[index] = { ...state.conversations[index], ...c };
  if (state.active && keyOf(state.active) === keyOf(c)) Object.assign(state.active, c);
  renderSidebar();
}
export function renderHeader() {
  const c = state.active; if (!c) return;
  $('conversation-name').textContent = titleOf(c);
  $('header-avatar').replaceChildren(avatar(c.type === 'room' ? { displayName: c.name } : c.otherUser, c.type === 'room'));
  $('conversation-status').textContent = c.type === 'room' ? `${c.memberCount} members · Group conversation` : state.presence.get(c.otherUser?.id) ? 'Online' : 'Offline';
  $('call-audio').hidden = c.type !== 'direct';
  $('call-video').hidden = c.type !== 'direct';
}
let detailsDialog;
let detailsVersion = 0;
export function closeDetails() {
  if (detailsDialog?.open) detailsDialog.close();
  $('details').hidden = true;
  $('details-toggle').setAttribute('aria-expanded', 'false');
}
export async function openDetails() {
  if (!state.active) return;
  const current = state.active; const version = ++detailsVersion;
  $('details').hidden = false; $('details-toggle').setAttribute('aria-expanded', 'true');
  if (matchMedia('(max-width:1199px)').matches) {
    if (!detailsDialog) {
      detailsDialog = el('dialog', 'details-modal'); detailsDialog.setAttribute('aria-label', 'Conversation details'); document.body.append(detailsDialog);
      detailsDialog.addEventListener('close', () => { document.querySelector('.workspace').append($('details')); $('details').hidden = true; $('details-toggle').setAttribute('aria-expanded', 'false'); $('details-toggle').focus(); });
    }
    detailsDialog.append($('details')); if (!detailsDialog.open) detailsDialog.showModal();
  }
  const node = $('details-content'); node.replaceChildren();
  const profile = el('div', 'detail-profile'); profile.append(avatar(current.type === 'room' ? { displayName: current.name } : current.otherUser, current.type === 'room'), el('h3', '', titleOf(current)), el('p', '', current.type === 'room' ? current.description || 'A space to stay connected.' : `@${current.otherUser?.username || ''}`));
  node.append(profile);
  if (current.type === 'room') {
    const section = el('section', 'detail-section'); section.append(el('h3', '', `Members · ${current.memberCount}`)); const members = el('div'); skeleton(members, 2); section.append(members); node.append(section);
    api(`/api/chat/room/${current.id}/people`).then(data => {
      if (version !== detailsVersion || state.active?.id !== current.id) return;
      members.replaceChildren();
      for (const person of data.members) {
        const row = el('a', 'member'); row.href = `/users/${encodeURIComponent(person.username)}`;
        const copy = el('div'); copy.append(el('strong', '', nameOf(person)), el('small', '', person.role)); row.append(avatar(person), copy); members.append(row);
      }
      if (!data.members.length) members.append(el('p', '', 'No members to show yet.'));
    }).catch(() => { members.replaceChildren(button('Couldn’t load members. Retry', 'quiet', openDetails)); });
    if (['owner', 'admin'].includes(current.role)) {
      const section = el('section', 'detail-section'); const link = el('a', '', 'Manage group & invitations ↗'); link.href = `/rooms/${encodeURIComponent(current.slug || current.id)}/settings`; section.append(link); node.append(section);
    }
  } else {
    const section = el('section', 'detail-section'); const link = el('a', '', 'View profile ↗'); link.href = `/users/${encodeURIComponent(current.otherUser.username)}`; section.append(link); node.append(section);
  }
  for (const [title, description] of [['Shared media', 'No shared media. Conversations currently support text and emoji.'], ['Files', 'No shared files. File sharing isn’t available yet.']]) {
    const section = el('section', 'detail-section'); section.append(el('h3', '', title), el('p', '', description)); node.append(section);
  }
}
export function bindSidebar() {
  document.querySelectorAll('[data-filter]').forEach(control => control.addEventListener('click', () => {
    state.filter = control.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === control)));
    renderSidebar();
  }));
  $('details-toggle').addEventListener('click', () => $('details').hidden ? openDetails() : closeDetails());
  $('details-close').addEventListener('click', () => { closeDetails(); $('details-toggle').focus(); });
  matchMedia('(max-width:1199px)').addEventListener('change', closeDetails);
  $('logout').addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); state.socket.disconnect(); location.replace('/'); } catch (error) { toast(error.message); }
  });
}

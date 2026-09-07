import { $, state, api, el, button, avatar, titleOf, keyOf, nameOf, senderOf, toast, empty, skeleton, showDialog } from './shared.js';
import { upsertConversation, refreshConversations } from './sidebar.js';
let activate;
let jump;
let mode = 'all';
let scope = null;
let searchVersion = 0;
let timer;
function highlighted(text, query) {
  const node = el('p'); const value = String(text || ''); const index = value.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) { node.textContent = value; return node; }
  const start = Math.max(0, index - 65); const end = Math.min(value.length, index + query.length + 100);
  node.append(document.createTextNode(`${start ? '…' : ''}${value.slice(start, index)}`), el('mark', '', value.slice(index, index + query.length)), document.createTextNode(`${value.slice(index + query.length, end)}${end < value.length ? '…' : ''}`));
  return node;
}
function result(title, description, person, action, group, query) {
  const node = button('', 'search-result', async () => {
    node.disabled = true;
    try { await action(); } catch (error) { toast(error.message); } finally { node.disabled = false; }
  });
  const copy = el('div'); copy.append(el('strong', '', title), highlighted(description, query)); node.append(avatar(person, group), copy); return node;
}
async function startDirect(user) {
  const data = await api(`/api/direct-messages/conversations/${user.id}`, { method: 'POST' });
  const c = { ...data.conversation, type: 'direct' }; upsertConversation(c); $('search-dialog').close(); await activate(c);
}
export function openSearch({ people = false, conversation = false } = {}) {
  mode = people ? 'people' : 'all'; scope = conversation ? state.active : null;
  $('search-title').textContent = people ? 'Find your people' : scope ? `Search ${titleOf(scope)}` : 'Search anything';
  $('search-input').value = ''; $('search-input').placeholder = people ? 'Name or username…' : 'People, groups, messages…';
  $('search-results').replaceChildren(); $('search-status').textContent = 'Type at least two characters to search.';
  searchVersion++; showDialog($('search-dialog')); $('search-input').focus();
}
async function search() {
  const version = ++searchVersion; const query = $('search-input').value.trim();
  if (query.length < 2) { $('search-results').replaceChildren(); $('search-status').textContent = 'Type at least two characters to search.'; return; }
  skeleton($('search-results')); $('search-status').textContent = 'Searching…';
  try {
    const [users, messages] = await Promise.all([
      scope ? Promise.resolve({ users: [] }) : api(`/api/direct-messages/users?q=${encodeURIComponent(query)}`),
      mode === 'people' ? Promise.resolve({ messages: [] }) : api(`/api/chat/search?q=${encodeURIComponent(query)}${scope ? `&scope=${encodeURIComponent(keyOf(scope))}` : ''}`),
    ]);
    if (version !== searchVersion || !$('search-dialog').open) return;
    const node = $('search-results'); node.replaceChildren(); let count = 0;
    if (mode !== 'people' && !scope) {
      const conversations = state.conversations.filter(c => titleOf(c).toLowerCase().includes(query.toLowerCase()));
      if (conversations.length) node.append(el('h3', 'result-heading', 'Conversations & groups'));
      for (const c of conversations) {
        count++;
        node.append(result(titleOf(c), c.type === 'room' ? `${c.memberCount} members${!c.isMember ? ' · Join group' : ''}` : 'Direct message', c.otherUser || { displayName: c.name }, async () => {
          $('search-dialog').close(); await activate(c);
        }, c.type === 'room', query));
      }
    }
    if (users.users.length) node.append(el('h3', 'result-heading', 'People'));
    for (const user of users.users) { count++; node.append(result(nameOf(user), `@${user.username}`, user, () => startDirect(user), false, query)); }
    if (messages.messages.length) node.append(el('h3', 'result-heading', 'Messages'));
    for (const message of messages.messages) {
      count++;
      const c = state.conversations.find(item => item.type === message.type && item.id === (message.roomId || message.conversationId));
      node.append(result(`${c ? titleOf(c) : message.roomName || 'Conversation'} · ${nameOf(senderOf(message))}`, message.text, senderOf(message), async () => {
        if (!c) throw new Error('Refresh your conversations and try again.');
        $('search-dialog').close();
        await activate(c, { messageId: message.id });
      }, false, query));
    }
    $('search-status').textContent = count ? `${count} results${messages.messages.length >= 40 ? ' · Refine your search for more specific results' : ''}` : 'No results. Try a different name or phrase.';
    if (!count) node.append(empty('Nothing here yet.', 'Try another spelling or a shorter search.'));
  } catch (error) {
    if (version !== searchVersion) return;
    $('search-status').textContent = 'Couldn’t search right now.';
    $('search-results').replaceChildren(button('Try again', '', search));
  }
}
export function bindSearch(callback, jumpCallback) {
  activate = callback; jump = jumpCallback;
  $('global-search').addEventListener('click', () => openSearch());
  $('conversation-search').addEventListener('click', () => openSearch({ conversation: true }));
  $('search-input').addEventListener('input', () => { searchVersion++; clearTimeout(timer); timer = setTimeout(search, 250); });
  $('search-dialog').addEventListener('close', () => { searchVersion++; clearTimeout(timer); });
  document.querySelectorAll('[data-close-dialog]').forEach(control => control.addEventListener('click', () => control.closest('dialog').close()));
  for (const id of ['new-chat', 'new-chat-bottom', 'welcome-new']) $(id).addEventListener('click', () => {
    $('group-form').hidden = true; document.querySelector('.new-options').hidden = false; $('group-error').textContent = ''; showDialog($('new-dialog'));
  });
  $('find-people').addEventListener('click', () => { $('new-dialog').close(); openSearch({ people: true }); });
  $('create-group').addEventListener('click', () => { document.querySelector('.new-options').hidden = true; $('group-form').hidden = false; $('group-name').focus(); });
  $('group-form').addEventListener('submit', async event => {
    event.preventDefault(); const control = event.submitter; if (control.disabled) return; control.disabled = true; $('group-error').textContent = '';
    try {
      const visibility = $('group-visibility').value;
      const data = await api('/api/rooms', { method: 'POST', body: JSON.stringify({ name: $('group-name').value.trim(), description: $('group-description').value.trim(), visibility, joinPolicy: visibility === 'private' ? 'invite' : 'open' }) });
      $('new-dialog').close(); $('group-form').reset();
      const c = { ...data.room, type: 'room' }; upsertConversation(c); await activate(c); toast('Group created. Open details to invite people.');
    } catch (error) { $('group-error').textContent = error.message; } finally { control.disabled = false; }
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
    if (event.key === 'Escape') document.querySelectorAll('.message-actions details[open]').forEach(menu => { menu.open = false; menu.querySelector('summary').focus(); });
  });
}

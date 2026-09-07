import { $, state, api, emit, el, button, keyOf, titleOf, nameOf, skeleton, toast, nearBottom, empty, showDialog } from './shared.js';
import { bindSidebar, configureSidebar, refreshConversations, renderSidebar, upsertConversation, renderHeader, closeDetails, openDetails } from './sidebar.js';
import { configureMessages, renderMessages, receiveMessage, updateMessage, updateReactions, updateReceipts, sortedMessages } from './messages.js';
import { bindComposer, saveDraft, restoreDraft, updateComposer, setReply, stopTyping } from './composer.js';
import { bindSearch } from './search.js';
import { bindCalls, bindCallSocket } from './call.js';

// One socket and one set of listeners for the page lifetime. The UI adapts the
// existing room and DM contracts instead of creating a second messaging backend.
state.socket = window.io({ autoConnect: false });
let readTimer;
let readPending = false;
let activityTimer;
let deletedMessage;
let transitioning = Promise.resolve();
function errorState(message, retry) {
  const node = $('conversation-error'); node.hidden = false; node.replaceChildren(document.createTextNode(message));
  if (retry) node.append(button('Try again', '', retry));
}
function connected(value) {
  $('connection').textContent = value ? 'Connected' : navigator.onLine ? 'Reconnecting…' : 'Offline · reconnecting…';
  $('connection').classList.toggle('online', value);
  if (!value) { state.ready = false; state.typing.clear(); $('typing').textContent = ''; }
  updateComposer();
}
function updateUrl(c, replace = false) {
  const url = c ? c.type === 'room' ? `/chat?room=${encodeURIComponent(c.slug || c.id)}` : `/messages?conversation=${c.id}` : '/rooms';
  if (location.pathname + location.search !== url) history[replace ? 'replaceState' : 'pushState']({}, '', url);
}
async function leaveView() {
  if (!state.active || !state.socket.connected) return;
  stopTyping();
  await emit(state.active.type === 'room' ? 'leaveRoomView' : 'leaveDirectConversation', state.active.type === 'room' ? {} : { conversationId: state.active.id });
}
async function joinView(c) {
  if (c.type === 'room') {
    const result = await emit('joinRoom', { room: c.id });
    return result;
  }
  const result = await emit('joinDirectConversation', { conversationId: c.id });
  if (result.presence) state.presence.set(result.presence.userId, result.presence.isOnline);
  Object.assign(c, result.conversation);
  return result;
}
async function getHistory(c, options = {}) {
  if (c.type === 'direct' && !options.messageId) {
    return api(`/api/direct-messages/conversations/${c.id}/messages?limit=50${options.before ? `&cursor=${options.before}` : ''}`);
  }
  return api(`/api/chat/${c.type}/${c.id}/messages${options.messageId ? `?around=${options.messageId}` : options.before ? `?before=${options.before}` : ''}`);
}
function applyHistory(data, c, options = {}) {
  state.page = data.pageInfo; state.historical = Boolean(options.messageId);
  state.messages = new Map(data.messages.map(m => [m.id, m]));
  if (!state.unreadId && c.unreadCount) state.unreadId = data.messages.find(m => (m.senderId || m.userId) !== state.user.id && (!c.lastReadMessageId || m.id > c.lastReadMessageId))?.id || null;
  state.loading = false; state.ready = state.socket.connected;
  renderMessages({ bottom: !options.messageId });
  $('jump-latest').hidden = !state.historical; $('jump-latest').textContent = '↓ Back to latest messages';
  if (options.messageId) highlight(options.messageId);
  else if (state.unreadId && $(`message-${state.unreadId}`)) $(`message-${state.unreadId}`).scrollIntoView({ block: 'center' });
  updateComposer(); scheduleRead();
}
export function activate(c, options = {}) {
  // Serialize room join/leave acknowledgements so rapid selection cannot leave
  // the server attached to a different room from the visible composer.
  transitioning = transitioning.catch(() => {}).then(() => activateNow(c, options));
  return transitioning;
}
async function activateNow(c, options = {}) {
  if (state.active && keyOf(state.active) === keyOf(c) && state.ready && !options.messageId && !options.reload) {
    $('app').classList.add('has-conversation'); return;
  }
  saveDraft(); closeDetails(); state.ready = false; state.loading = true; updateComposer();
  try { await leaveView(); } catch { /* Rejoining below verifies server state. */ }
  state.generation++; state.active = { ...c }; c = state.active;
  state.messages.clear(); state.page = {}; state.unreadId = c.firstUnreadMessageId || null; state.lastMarked = null;
  state.typing.clear(); $('typing').textContent = ''; setReply(null); restoreDraft();
  $('app').classList.add('has-conversation'); $('welcome').hidden = true;
  for (const id of ['conversation-header', 'timeline', 'composer']) $(id).hidden = false;
  $('conversation-error').hidden = true; $('jump-latest').hidden = true; $('load-older').hidden = true;
  skeleton($('messages'), 5); renderHeader(); renderSidebar();
  if (options.updateUrl !== false) updateUrl(c);
  try {
    if (c.type === 'room' && !c.isMember) {
      const result = await api(`/api/rooms/${encodeURIComponent(c.id)}/join`, { method: 'POST' }); Object.assign(c, result.room); upsertConversation(c);
    }
    await joinView(c);
    const [data, unread] = await Promise.all([getHistory(c, options), c.type === 'room' ? api(`/api/rooms/${c.id}/unread`) : Promise.resolve(null)]);
    if (unread) { Object.assign(c, unread); state.unreadId = unread.firstUnreadMessageId; }
    applyHistory(data, c, options); renderHeader();
    if (matchMedia('(min-width:1200px)').matches) openDetails();
    $('conversation-name').setAttribute('tabindex', '-1'); $('conversation-name').focus({ preventScroll: true });
  } catch (error) {
    state.loading = false; state.ready = false; updateComposer();
    $('messages').replaceChildren(empty('Couldn’t open this conversation.', 'Your conversations and saved drafts are still here.'));
    errorState(error.message, () => activate(c, { ...options, reload: true }));
  }
}
function highlight(id) {
  const target = $(`message-${id}`); if (!target) { toast('This message is no longer available.'); return; }
  target.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' });
  target.classList.add('highlight'); setTimeout(() => target.classList.remove('highlight'), 2400);
}
async function jump(id) {
  if ($(`message-${id}`)) { highlight(id); return; }
  await activate(state.active, { messageId: id });
}
async function loadOlder() {
  if (!state.active || state.loading || !state.page.hasMore) return;
  const generation = state.generation; const c = state.active; state.loading = true;
  $('load-older').disabled = true; $('load-older').textContent = 'Loading…';
  try {
    const data = await getHistory(c, { before: state.page.nextCursor });
    if (generation !== state.generation) return;
    state.page = data.pageInfo;
    for (const m of data.messages) state.messages.set(m.id, m);
    renderMessages({ preserve: true });
  } catch { toast('Couldn’t load older messages. Try again.'); }
  finally { if (generation === state.generation) state.loading = false; $('load-older').disabled = false; $('load-older').textContent = 'Load older messages'; }
}
function scheduleRead() { clearTimeout(readTimer); readTimer = setTimeout(markRead, 650); }
async function markRead() {
  // Existing read endpoints advance to the latest message. Only call when the
  // latest page is visible, focused and scrolled to its end, never on mount.
  const c = state.active; const latest = sortedMessages().at(-1)?.id;
  if (!c || !state.ready || state.loading || state.historical || readPending || document.hidden || !document.hasFocus() || !nearBottom() || !latest || latest === state.lastMarked || document.querySelector('dialog[open]')) return;
  if (!$('app').classList.contains('has-conversation')) return;
  const generation = state.generation; readPending = true;
  try {
    if (c.type === 'room') await api(`/api/rooms/${c.id}/read`, { method: 'POST' });
    else await emit('markDirectConversationRead', { conversationId: c.id });
    if (generation === state.generation) { state.lastMarked = latest; c.unreadCount = 0; upsertConversation(c); }
  } catch { /* Retry when focus, visibility, scroll or a new message changes. */ }
  finally { readPending = false; }
}
async function backToList(update = true) {
  saveDraft(); state.ready = false; updateComposer(); closeDetails();
  try { await leaveView(); } catch { /* Disconnection already removes live presence. */ }
  state.generation++; state.active = null; state.messages.clear(); state.loading = false; state.typing.clear();
  $('app').classList.remove('has-conversation'); $('welcome').hidden = false;
  for (const id of ['conversation-header', 'timeline', 'composer', 'jump-latest', 'conversation-error']) $(id).hidden = true;
  if (update) updateUrl(null); renderSidebar(); $('new-chat').focus();
}
async function openFromUrl() {
  const params = new URLSearchParams(location.search); const room = params.get('room'); const direct = params.get('conversation');
  if (!room && !direct) return backToList(false);
  let c = state.conversations.find(item => room ? item.type === 'room' && (item.id === room || item.slug === room || item.name === room) : item.type === 'direct' && item.id === direct);
  if (!c) {
    const result = await api(room ? `/api/rooms/${encodeURIComponent(room)}` : `/api/direct-messages/conversations/${encodeURIComponent(direct)}`);
    c = { ...(room ? result.room : result.conversation), type: room ? 'room' : 'direct' }; upsertConversation(c);
  }
  await activate(c, { updateUrl: false });
}
function typing(payload, active = true) {
  if (!state.active || (payload.conversationId ? payload.conversationId !== state.active.id : state.active.type !== 'room') || payload.userId === state.user.id) return;
  const id = payload.userId; clearTimeout(state.typing.get(id)?.timer);
  if (active) state.typing.set(id, { name: payload.displayName || payload.username || nameOf(state.active.otherUser), timer: setTimeout(() => { state.typing.delete(id); renderTyping(); }, 2200) });
  else state.typing.delete(id);
  renderTyping();
}
function renderTyping() { const names = [...state.typing.values()].map(v => v.name); $('typing').textContent = names.length ? `${names.slice(0, 2).join(' and ')} ${names.length > 1 ? 'are' : 'is'} typing…` : ''; }
function refreshSoon() { clearTimeout(activityTimer); activityTimer = setTimeout(() => refreshConversations().catch(() => {}), 350); }
function bindSocket() {
  const socket = state.socket;
  bindCallSocket(socket);
  socket.on('connect', async () => {
    connected(true);
    if (state.active) await activate(state.active, { reload: true, updateUrl: false });
    refreshConversations().catch(() => {});
    const ids = state.conversations.filter(c => c.type === 'direct').map(c => c.otherUser?.id).filter(Boolean);
    if (ids.length) emit('getDirectPresence', { userIds: ids }).then(result => {
      for (const item of result.users || result.presence || []) state.presence.set(item.userId, item.isOnline);
      renderHeader(); renderSidebar();
    }).catch(() => {});
  });
  socket.on('disconnect', () => connected(false));
  socket.on('connect_error', error => { connected(false); if (error.message === 'UNAUTHORIZED') location.replace('/'); });
  socket.on('message', receiveMessage); socket.on('directMessage', receiveMessage);
  socket.on('messageUpdated', updateMessage); socket.on('messageDeleted', updateMessage); socket.on('messageReactionUpdated', updateReactions);
  socket.on('roomActivity', refreshSoon); socket.on('roomReadUpdated', refreshSoon);
  socket.on('directConversationActivity', ({ conversation }) => { upsertConversation({ ...conversation, type: 'direct' }); scheduleRead(); updateReceipts(); });
  socket.on('directMessageRead', payload => {
    if (state.active?.id !== payload.conversationId) return;
    const participant = state.active.participants?.find(p => p.userId === payload.userId);
    if (participant) { participant.lastReadMessageId = payload.lastReadMessageId; updateReceipts(); }
  });
  socket.on('directPresenceUpdated', payload => { state.presence.set(payload.userId, payload.isOnline); renderHeader(); renderSidebar(); });
  socket.on('roomTyping', payload => typing(payload, payload.isTyping));
  socket.on('directTypingStart', payload => typing(payload)); socket.on('directTypingStop', payload => typing(payload, false));
  socket.on('roomUsers', payload => {
    if (state.active?.type !== 'room' || payload.roomId !== state.active.id) return;
    const unique = new Set(payload.users.map(user => user.userId));
    $('conversation-status').textContent = `${state.active.memberCount} members · ${unique.size} here now`;
  });
  socket.on('joinError', message => { state.ready = false; updateComposer(); errorState(message); });
  window.addEventListener('pagehide', () => { socket.removeAllListeners(); socket.disconnect(); });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
}
async function initialize() {
  try {
    const data = await api('/api/auth/me'); state.user = data.user;
    $('account').textContent = nameOf(state.user);
    configureSidebar(activate); bindSidebar(); bindSearch(activate, jump); bindComposer(receiveMessage); bindCalls(activate);
    configureMessages({ reply: setReply, jump, read: scheduleRead, delete: message => { deletedMessage = message; $('delete-error').textContent = ''; showDialog($('confirm-dialog')); $('delete-cancel').focus(); } });
    $('delete-cancel').addEventListener('click', () => $('confirm-dialog').close());
    $('delete-confirm').addEventListener('click', async () => {
      $('delete-confirm').disabled = true;
      try { await emit('deleteMessage', { messageId: deletedMessage.id }); $('confirm-dialog').close(); toast('Message deleted'); }
      catch (error) { $('delete-error').textContent = error.message; }
      finally { $('delete-confirm').disabled = false; }
    });
    $('back').addEventListener('click', () => { transitioning = transitioning.catch(() => {}).then(() => backToList()); });
    $('load-older').addEventListener('click', loadOlder);
    $('jump-latest').addEventListener('click', () => {
      if (state.historical) activate(state.active, { reload: true });
      else { $('timeline').scrollTop = $('timeline').scrollHeight; $('jump-latest').hidden = true; scheduleRead(); }
    });
    $('timeline').addEventListener('scroll', () => { if (nearBottom() && !state.historical) $('jump-latest').hidden = true; scheduleRead(); }, { passive: true });
    window.addEventListener('focus', scheduleRead); document.addEventListener('visibilitychange', scheduleRead);
    window.addEventListener('popstate', () => openFromUrl().catch(error => toast(error.message)));
    await refreshConversations(); bindSocket();
    const firstConnection = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { state.socket.off('connect', onConnect); reject(new Error('Couldn’t connect. Check your connection and refresh.')); }, 15000);
      function onConnect() { clearTimeout(timer); resolve(); }
      state.socket.once('connect', onConnect);
    });
    state.socket.connect(); await firstConnection; await openFromUrl();
  } catch (error) {
    $('conversation-list').replaceChildren(empty('Couldn’t load your chats.', error.message, { label: 'Try again', run: () => location.reload() }));
    toast(error.message);
  }
}
initialize();

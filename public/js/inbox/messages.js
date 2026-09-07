import { $, state, el, button, avatar, senderOf, own, day, time, emit, toast, empty, nameOf, nearBottom } from './shared.js';
let handlers = {};
export function configureMessages(callbacks) { handlers = callbacks; }
export function sortedMessages() { return [...state.messages.values()].sort((a, b) => a.id.localeCompare(b.id)); }
// Socket payloads are serialized as strings today, while some REST paths can
// originate from Mongoose documents. Normalize at the UI boundary so a live
// update can never be rendered in the wrong conversation because of ID shape.
function belongsToActiveConversation(message) {
  if (!state.active) return false;
  const messageParentId = state.active.type === 'room' ? message.roomId : message.conversationId;
  return String(messageParentId || '') === String(state.active.id || '');
}
function receipt(message) {
  if (!own(message) || state.active?.type !== 'direct') return '';
  const participant = state.active.participants?.find(p => p.userId !== state.user.id);
  return participant?.lastReadMessageId && message.id <= participant.lastReadMessageId ? 'Read' : 'Sent';
}
function sameMessageRun(first, second) {
  if (!first || !second) return false;
  return senderOf(first).id === senderOf(second).id
    && day(first.createdAt) === day(second.createdAt)
    && new Date(second.createdAt) - new Date(first.createdAt) < 300000;
}
function quote(message) {
  const node = button('', 'quote', () => handlers.jump(message.id), 'Jump to referenced message');
  node.append(el('strong', '', message.displayName || message.username || nameOf(message.user)), el('p', '', message.text));
  return node;
}
function renderReactions(message, node) {
  node.replaceChildren();
  for (const reaction of message.reactions || []) {
    if (!reaction.userIds?.length) continue;
    const active = reaction.userIds.includes(state.user.id);
    const control = button(`${reaction.emoji} ${reaction.userIds.length}`, 'reaction', () => react(message, reaction.emoji, control), `${active ? 'Remove' : 'Add'} ${reaction.emoji} reaction; ${reaction.userIds.length} reactions`);
    control.setAttribute('aria-pressed', String(active)); node.append(control);
  }
}
async function react(message, emoji, control) {
  control.disabled = true;
  try { await emit('reactToMessage', { messageId: message.id, emoji }); }
  catch (error) { toast(error.message); }
  finally { control.disabled = false; }
}
function inlineEdit(message, bubble, actions) {
  actions.querySelector('details').open = false;
  const original = [...bubble.childNodes];
  const input = el('textarea', 'inline-editor'); input.value = message.text; input.maxLength = 4000; input.setAttribute('aria-label', 'Edit message');
  const controls = el('div', 'edit-actions');
  let saving = false;
  const cancel = () => { if (saving) return; bubble.replaceChildren(...original); actions.querySelector('summary').focus(); };
  const save = button('Save', 'primary', async () => {
    if (saving || !input.value.trim()) return;
    saving = true; save.disabled = true; input.disabled = true;
    try { await emit('editMessage', { messageId: message.id, text: input.value.trim() }); saving = false; cancel(); }
    catch (error) { toast(error.message); saving = false; save.disabled = false; input.disabled = false; input.focus(); }
  });
  controls.append(button('Cancel', '', cancel), save);
  bubble.replaceChildren(input, controls); input.focus(); input.setSelectionRange(input.value.length, input.value.length);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.stopPropagation(); cancel(); }
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); save.click(); }
  });
}
function messageActions(message, bubble) {
  const actions = el('div', 'message-actions');
  const group = state.active.type === 'room';
  if (group) actions.append(button('↩', 'reply-action', () => handlers.reply(message), 'Reply to message'));
  const menu = el('details'); const summary = el('summary', '', '···'); summary.setAttribute('aria-label', 'Message actions'); summary.title = 'Message actions';
  const options = el('div', 'action-menu');
  if (group) {
    options.append(button('Reply', '', () => { menu.open = false; handlers.reply(message); }));
    const emojis = el('div', 'reaction-options');
    for (const emoji of ['👍', '❤️', '😂', '😮', '😢']) {
      const control = button(emoji, '', () => { menu.open = false; react(message, emoji, control); }, `React with ${emoji}`); emojis.append(control);
    }
    options.append(emojis);
  }
  options.append(button('Copy text', '', async () => {
    menu.open = false;
    try { await navigator.clipboard.writeText(message.text); toast('Message copied'); } catch { toast('Couldn’t copy. Select the message text to copy it.'); }
  }));
  if (group && own(message)) options.append(button('Edit message', '', () => inlineEdit(message, bubble, actions)));
  if (group && (own(message) || ['owner', 'admin'].includes(state.active.role))) options.append(button('Delete message', 'danger', () => { menu.open = false; handlers.delete(message); }));
  menu.append(summary, options); actions.append(menu);
  menu.addEventListener('toggle', () => { if (menu.open) document.querySelectorAll('.message-actions details[open]').forEach(other => { if (other !== menu) other.open = false; }); });
  return actions;
}
export function messageRow(message, previous, next) {
  const row = el('article', `message-row${own(message) ? ' own' : ''}${message.isDeleted ? ' deleted' : ''}`);
  row.id = `message-${message.id}`; row.dataset.messageId = message.id;
  const sender = senderOf(message);
  if (sameMessageRun(previous, message) && message.id !== state.unreadId) row.classList.add('grouped');
  row.append(avatar(sender));
  const content = el('div', 'message-content');
  content.append(el('p', 'message-author', own(message) ? 'You' : nameOf(sender)));
  const bubble = el('div', 'bubble');
  if (message.replyTo) bubble.append(quote(message.replyTo));
  bubble.append(el('p', 'message-text', message.isDeleted ? 'This message was deleted.' : message.text));
  // Put metadata at the end of a compact run, instead of repeating it for
  // every bubble. A standalone message still retains its time and receipt.
  if (!sameMessageRun(message, next)) {
    const metadata = el('div', 'message-meta');
    if (message.isEdited) metadata.append(el('span', '', 'edited'));
    const timestamp = el('time', '', time(message.createdAt)); timestamp.dateTime = message.createdAt || ''; timestamp.title = new Date(message.createdAt).toLocaleString(); metadata.append(timestamp);
    metadata.append(el('span', 'receipt', receipt(message))); bubble.append(metadata);
  }
  content.append(bubble);
  const reactions = el('div', 'reactions'); renderReactions(message, reactions); content.append(reactions);
  if (!message.isDeleted) content.append(messageActions(message, bubble));
  row.append(content); return row;
}
export function renderMessages({ bottom = false, preserve = false } = {}) {
  const timeline = $('timeline'); const height = timeline.scrollHeight; const top = timeline.scrollTop;
  const fragment = document.createDocumentFragment();
  const rows = sortedMessages();
  let previous = null;
  for (const [index, message] of rows.entries()) {
    if (!previous || day(previous.createdAt) !== day(message.createdAt)) fragment.append(el('div', 'date-divider', day(message.createdAt)));
    if (state.unreadId === message.id) fragment.append(el('div', 'date-divider unread-divider', 'New messages'));
    fragment.append(messageRow(message, previous, rows[index + 1])); previous = message;
  }
  if (!state.messages.size) fragment.append(empty('Say hello!', `Start the conversation with ${state.active ? (state.active.type === 'room' ? 'your group' : nameOf(state.active.otherUser)) : 'someone'}.`, { label: 'Write a message', run: () => $('composer-input').focus() }));
  $('messages').replaceChildren(fragment);
  $('load-older').hidden = !state.page.hasMore;
  if (bottom) timeline.scrollTop = timeline.scrollHeight;
  else if (preserve) timeline.scrollTop = top + timeline.scrollHeight - height;
}
export function receiveMessage(message) {
  if (!state.active || !message.id) return;
  if (!belongsToActiveConversation(message)) return;
  if (state.historical) { $('jump-latest').hidden = false; $('jump-latest').textContent = '↓ Back to latest messages'; return; }
  if (state.messages.has(message.id)) return;
  const bottom = nearBottom();
  if (!own(message) && (!bottom || document.hidden) && !state.unreadId) state.unreadId = message.id;
  const previous = sortedMessages().at(-1);
  state.messages.set(message.id, message);
  if (!previous) $('messages').replaceChildren();
  // A new message can turn the old final bubble into the middle of a run.
  // Repaint that one row so its timestamp moves to the new final bubble.
  if (previous && sameMessageRun(previous, message)) {
    const ordered = sortedMessages();
    const beforePrevious = ordered[ordered.length - 3];
    $(`message-${previous.id}`)?.replaceWith(messageRow(previous, beforePrevious, message));
  }
  if (!previous || day(previous.createdAt) !== day(message.createdAt)) $('messages').append(el('div', 'date-divider', day(message.createdAt)));
  if (state.unreadId === message.id) $('messages').append(el('div', 'date-divider unread-divider', 'New messages'));
  $('messages').append(messageRow(message, previous, null));
  if (bottom || own(message)) $('timeline').scrollTop = $('timeline').scrollHeight;
  else { $('jump-latest').hidden = false; $('jump-latest').textContent = '↓ New messages'; }
  handlers.read();
}
export function updateMessage(message) {
  if (!state.messages.has(message.id) || !belongsToActiveConversation(message)) return;
  state.messages.set(message.id, message);
  const ordered = sortedMessages(); const index = ordered.findIndex(m => m.id === message.id);
  const previous = ordered[index - 1]; const next = ordered[index + 1];
  $(`message-${message.id}`)?.replaceWith(messageRow(message, previous, next));
  for (const item of state.messages.values()) {
    if (item.replyTo?.id !== message.id) continue;
    item.replyTo = { ...item.replyTo, text: message.text, isDeleted: message.isDeleted };
    const ref = $(`message-${item.id}`)?.querySelector('.quote p'); if (ref) ref.textContent = message.text;
  }
  if (state.reply?.id === message.id) handlers.reply(message.isDeleted ? null : message);
}
export function updateReactions(payload) {
  if (!belongsToActiveConversation(payload)) return;
  const message = state.messages.get(payload.messageId); if (!message) return;
  message.reactions = payload.reactions;
  const node = $(`message-${message.id}`)?.querySelector('.reactions'); if (node) renderReactions(message, node);
}
export function updateReceipts() {
  for (const message of state.messages.values()) {
    const node = $(`message-${message.id}`)?.querySelector('.receipt'); if (node) node.textContent = receipt(message);
  }
}

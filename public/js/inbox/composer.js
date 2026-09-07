import { $, state, keyOf, storage, emit, nameOf, toast } from './shared.js';
let onMessage;
let typingTimer;
let typingActive = false;
const draftKey = c => `letstalk.draft.${state.user?.id}.${keyOf(c)}`;
export function saveDraft() { if (state.active) storage(draftKey(state.active), $('composer-input').value); }
export function restoreDraft() { $('composer-input').value = state.active ? storage(draftKey(state.active)) : ''; updateComposer(); }
export function setReply(message) {
  state.reply = message; $('reply-preview').hidden = !message;
  if (message) { $('reply-author').textContent = `Replying to ${message.displayName || message.username || nameOf(message.user)}`; $('reply-text').textContent = message.text; $('composer-input').focus(); }
}
export function updateComposer() {
  const input = $('composer-input'); input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
  input.disabled = !state.ready || state.loading || state.sending;
  $('send').disabled = !state.ready || !input.value.trim() || state.loading || state.sending;
  $('send').textContent = state.sending ? '…' : '↑';
  $('send').setAttribute('aria-label', state.sending ? 'Sending message' : 'Send message');
}
export function stopTyping() {
  clearTimeout(typingTimer);
  if (typingActive && state.active && state.socket?.connected) {
    state.socket.emit(state.active.type === 'room' ? 'roomTyping' : 'directTypingStop', state.active.type === 'room' ? { isTyping: false } : { conversationId: state.active.id });
  }
  typingActive = false;
}
export function bindComposer(receive) {
  onMessage = receive;
  $('composer-input').addEventListener('input', () => {
    saveDraft(); updateComposer();
    if (!state.active || !state.socket.connected) return;
    if (!$('composer-input').value.trim()) return stopTyping();
    if (!typingActive) {
      typingActive = true;
      state.socket.emit(state.active.type === 'room' ? 'roomTyping' : 'directTypingStart', state.active.type === 'room' ? { isTyping: true } : { conversationId: state.active.id });
    }
    clearTimeout(typingTimer); typingTimer = setTimeout(stopTyping, 1200);
  });
  $('composer-input').addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('message-form').requestSubmit(); }
    if (event.key === 'Escape') { setReply(null); stopTyping(); }
  });
  $('cancel-reply').addEventListener('click', () => { setReply(null); $('composer-input').focus(); });
  $('message-form').addEventListener('submit', async event => {
    event.preventDefault();
    const text = $('composer-input').value.trim(); const c = state.active;
    if (!c || !text || state.sending || !state.ready || state.loading || text.length > 4000) return;
    const generation = state.generation;
    state.sending = true; updateComposer(); stopTyping(); $('send-status').textContent = 'Sending…';
    try {
      const result = await emit(c.type === 'room' ? 'chatMessage' : 'sendDirectMessage', c.type === 'room' ? { text, replyToId: state.reply?.id || null } : { conversationId: c.id, text });
      storage(draftKey(c), '');
      if (state.generation === generation) {
        $('composer-input').value = ''; setReply(null); $('send-status').textContent = 'Sent'; onMessage(result.message);
      }
    } catch (error) {
      if (state.generation === generation) $('send-status').textContent = 'Draft saved';
      toast(error.message);
    } finally {
      state.sending = false; updateComposer();
      if (state.generation === generation) $('composer-input').focus();
    }
  });
  window.addEventListener('pagehide', saveDraft);
}

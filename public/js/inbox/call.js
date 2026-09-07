import { $, state, emit, nameOf, showDialog, toast } from './shared.js';

// WebRTC carries media peer-to-peer; the authenticated Socket.IO events only
// exchange offers, answers and ICE candidates for an existing direct message.
let activate; let call = null; let incoming = null; let queuedCandidates = [];
const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
const conversationFor = id => state.conversations.find(c => c.type === 'direct' && c.id === id);
function showPanel(status) { $('call-panel').hidden = false; $('call-status').textContent = status; }
function closeCall() { if (!call) return; call.stream.getTracks().forEach(track => track.stop()); call.peer.close(); call = null; queuedCandidates = []; $('remote-media').srcObject = null; $('local-media').srcObject = null; $('call-panel').hidden = true; }
async function receiveCandidate(candidate) { if (!call?.peer) return; if (!call.peer.remoteDescription) { queuedCandidates.push(candidate); return; } await call.peer.addIceCandidate(candidate); }
function createPeer(conversationId, mode, stream) {
  const peer = new RTCPeerConnection({ iceServers }); stream.getTracks().forEach(track => peer.addTrack(track, stream));
  peer.onicecandidate = event => { if (event.candidate) emit('directCallIceCandidate', { conversationId, candidate: event.candidate.toJSON() }).catch(() => {}); };
  peer.ontrack = event => { $('remote-media').srcObject = event.streams[0]; $('call-status').textContent = 'Connected'; };
  peer.onconnectionstatechange = () => { if (peer.connectionState === 'connected') $('call-status').textContent = 'Connected'; if (['failed', 'closed'].includes(peer.connectionState)) closeCall(); };
  call = { conversationId, mode, stream, peer }; $('local-media').srcObject = mode === 'video' ? stream : null; $('toggle-camera').hidden = mode !== 'video'; return peer;
}
async function capture(mode) { if (!navigator.mediaDevices?.getUserMedia) throw new Error('Calling requires a secure connection and a supported browser.'); return navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'video' ? { facingMode: 'user' } : false }); }
export async function startCall(mode) {
  const conversation = state.active; if (!conversation || conversation.type !== 'direct' || call) return;
  try { showPanel(`Starting ${mode} call…`); const stream = await capture(mode); const peer = createPeer(conversation.id, mode, stream); const offer = await peer.createOffer(); await peer.setLocalDescription(offer); await emit('directCallOffer', { conversationId: conversation.id, description: peer.localDescription.toJSON(), mode }); $('call-status').textContent = `Calling ${nameOf(conversation.otherUser)}…`; }
  catch (error) { closeCall(); toast(error.message || 'Couldn’t start the call.'); }
}
async function answerCall() {
  if (!incoming || call) return; const offer = incoming; incoming = null; $('incoming-call').close();
  try { const conversation = conversationFor(offer.conversationId); if (conversation) await activate(conversation); showPanel(`Answering ${nameOf(offer.caller)}…`); const stream = await capture(offer.mode); const peer = createPeer(offer.conversationId, offer.mode, stream); await peer.setRemoteDescription(offer.description); for (const candidate of queuedCandidates.splice(0)) await peer.addIceCandidate(candidate); const answer = await peer.createAnswer(); await peer.setLocalDescription(answer); await emit('directCallAnswer', { conversationId: offer.conversationId, description: peer.localDescription.toJSON() }); }
  catch (error) { await emit('directCallEnd', { conversationId: offer.conversationId }).catch(() => {}); closeCall(); toast(error.message || 'Couldn’t answer the call.'); }
}
function declineCall() { if (!incoming) return; emit('directCallEnd', { conversationId: incoming.conversationId, reason: 'declined' }).catch(() => {}); incoming = null; $('incoming-call').close(); }
function endCall() { const id = call?.conversationId; closeCall(); if (id) emit('directCallEnd', { conversationId: id }).catch(() => {}); }
export function bindCalls(onActivate) {
  activate = onActivate; $('call-audio').addEventListener('click', () => startCall('audio')); $('call-video').addEventListener('click', () => startCall('video')); $('accept-call').addEventListener('click', answerCall); $('decline-call').addEventListener('click', declineCall); $('end-call').addEventListener('click', endCall);
  $('toggle-mic').addEventListener('click', () => { const track = call?.stream.getAudioTracks()[0]; if (!track) return; track.enabled = !track.enabled; $('toggle-mic').textContent = track.enabled ? '◉' : '◌'; });
  $('toggle-camera').addEventListener('click', () => { const track = call?.stream.getVideoTracks()[0]; if (!track) return; track.enabled = !track.enabled; $('toggle-camera').textContent = track.enabled ? '▣' : '□'; }); window.addEventListener('pagehide', endCall);
}
export function bindCallSocket(socket) {
  socket.on('directCallOffer', offer => { if (call || incoming) { emit('directCallEnd', { conversationId: offer.conversationId, reason: 'declined' }).catch(() => {}); return; } incoming = offer; $('incoming-call-title').textContent = `${nameOf(offer.caller)} is calling`; $('incoming-call-copy').textContent = `${offer.mode === 'video' ? 'Video' : 'Audio'} call`; showDialog($('incoming-call')); });
  socket.on('directCallAnswer', async ({ conversationId, description }) => { if (call?.conversationId !== conversationId) return; try { await call.peer.setRemoteDescription(description); for (const candidate of queuedCandidates.splice(0)) await call.peer.addIceCandidate(candidate); } catch { endCall(); toast('Couldn’t connect the call.'); } });
  socket.on('directCallIceCandidate', ({ conversationId, candidate }) => { if (call?.conversationId === conversationId) receiveCandidate(candidate).catch(() => {}); else queuedCandidates.push(candidate); });
  socket.on('directCallEnded', ({ conversationId, reason }) => { if (incoming?.conversationId === conversationId) { incoming = null; $('incoming-call').close(); } if (call?.conversationId === conversationId) { closeCall(); if (reason !== 'ended') toast(reason === 'declined' ? 'Call declined.' : 'Call ended.'); } }); socket.on('disconnect', closeCall);
}

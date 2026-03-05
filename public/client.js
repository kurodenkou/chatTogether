/* chatTogether — client */
'use strict';

const socket = io();

// ── DOM refs ────────────────────────────────────────────────
const joinScreen   = document.getElementById('join-screen');
const chatScreen   = document.getElementById('chat-screen');
const joinForm     = document.getElementById('join-form');
const inputName    = document.getElementById('input-name');
const inputRoom    = document.getElementById('input-room');
const messageForm  = document.getElementById('message-form');
const inputMessage = document.getElementById('input-message');
const messagesEl   = document.getElementById('messages');
const roomLabel    = document.getElementById('room-label');
const userCount    = document.getElementById('user-count');
const usersList    = document.getElementById('users-list');
const usersPanel   = document.getElementById('users-panel');
const btnUsers     = document.getElementById('btn-users');
const btnLeave     = document.getElementById('btn-leave');

// ── State ────────────────────────────────────────────────────
let myName = '';
let myRoom = '';
let lastSender = null;

// ── Join ─────────────────────────────────────────────────────
joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = inputName.value.trim();
  const room = inputRoom.value.trim();
  if (!name || !room) return;

  myName = name;
  myRoom = room;

  socket.emit('join', { name, room });
});

socket.on('joined', ({ name, room }) => {
  roomLabel.textContent = '#' + room;
  showScreen('chat');
  inputMessage.focus();
});

// ── Messages ─────────────────────────────────────────────────
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = inputMessage.value.trim();
  if (!text) return;
  socket.emit('message', text);
  inputMessage.value = '';
});

socket.on('message', ({ name, text, ts }) => {
  const isMe = name === myName;
  appendMessage({ name, text, ts, isMe });
});

socket.on('system', (text) => {
  appendSystem(text);
  lastSender = null;
});

// ── Users ─────────────────────────────────────────────────────
socket.on('room-users', (users) => {
  userCount.textContent = users.length;
  usersList.innerHTML = '';
  users.forEach(name => {
    const li = document.createElement('li');
    li.textContent = name;
    if (name === myName) li.classList.add('me');
    usersList.appendChild(li);
  });
});

btnUsers.addEventListener('click', () => {
  usersPanel.classList.toggle('hidden');
});

// ── Leave ─────────────────────────────────────────────────────
btnLeave.addEventListener('click', () => {
  socket.disconnect();
  clearChat();
  showScreen('join');
  socket.connect();
  lastSender = null;
});

// ── Helpers ───────────────────────────────────────────────────
function showScreen(name) {
  joinScreen.classList.toggle('active', name === 'join');
  chatScreen.classList.toggle('active', name === 'chat');
}

function appendMessage({ name, text, ts, isMe }) {
  const sameSender = lastSender === name;
  lastSender = name;

  const msg = document.createElement('div');
  msg.className = `msg ${isMe ? 'me' : 'other'}${sameSender ? ' same-sender' : ''}`;

  if (!sameSender) {
    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    meta.textContent = isMe ? 'You' : name;
    if (ts) {
      const time = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      meta.textContent += '  ' + time;
    }
    msg.appendChild(meta);
  }

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text;
  msg.appendChild(bubble);

  messagesEl.appendChild(msg);
  scrollToBottom();
}

function appendSystem(text) {
  const el = document.createElement('div');
  el.className = 'msg-system';
  el.textContent = text;
  messagesEl.appendChild(el);
  scrollToBottom();
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function clearChat() {
  messagesEl.innerHTML = '';
  usersList.innerHTML = '';
  userCount.textContent = '0';
  usersPanel.classList.add('hidden');
  myName = '';
  myRoom = '';
}

// ── Keyboard shortcut: Escape closes users panel ──────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') usersPanel.classList.add('hidden');
});

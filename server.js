const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// In-memory room state — nothing is ever written to disk
// rooms = { roomName: { socketId: { name, joinedAt } } }
const rooms = {};

function getRoomUsers(room) {
  if (!rooms[room]) return [];
  return Object.values(rooms[room]).map(u => u.name);
}

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentName = null;

  socket.on('join', ({ name, room }) => {
    // Basic sanitisation
    name = String(name).trim().slice(0, 32) || 'Anonymous';
    room = String(room).trim().slice(0, 64) || 'general';

    currentRoom = room;
    currentName = name;

    socket.join(room);

    if (!rooms[room]) rooms[room] = {};
    rooms[room][socket.id] = { name, joinedAt: Date.now() };

    // Tell everyone in the room (including sender) who's here
    io.to(room).emit('room-users', getRoomUsers(room));

    // Announce to others (not sender)
    socket.to(room).emit('system', `${name} joined the room`);

    // Confirm join to sender
    socket.emit('joined', { name, room });
  });

  socket.on('message', (text) => {
    if (!currentRoom || !currentName) return;
    text = String(text).trim().slice(0, 2000);
    if (!text) return;

    io.to(currentRoom).emit('message', {
      name: currentName,
      text,
      ts: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    if (!currentRoom || !rooms[currentRoom]) return;

    delete rooms[currentRoom][socket.id];

    // Clean up empty rooms
    if (Object.keys(rooms[currentRoom]).length === 0) {
      delete rooms[currentRoom];
    } else {
      io.to(currentRoom).emit('room-users', getRoomUsers(currentRoom));
      io.to(currentRoom).emit('system', `${currentName} left the room`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`chatTogether running on http://localhost:${PORT}`);
});

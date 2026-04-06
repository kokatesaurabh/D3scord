/**
 * D3scord – Real-time chat server
 * Messages are persisted to messages.json (survives restarts & works cross-machine).
 * Swap the JSON store with MongoDB/PostgreSQL for production scale.
 */

const express   = require("express");
const http      = require("http");
const { Server} = require("socket.io");
const cors      = require("cors");
const fs        = require("fs");
const path      = require("path");

const PORT       = process.env.PORT || 3030;
const STORE_FILE = path.join(__dirname, "messages.json");
const MAX_PER_CH = 500;

// ── Persist messages to disk ──────────────────────────────────────────────────
function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) return JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
  } catch (_) {}
  return {};
}

function saveStore(store) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(store), "utf8");
}

let store = loadStore();          // { [channelId]: Message[] }

// ── Express + Socket.io ───────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET","POST"] },
});

// ── REST: health + message history (for cross-machine fetch on first load) ────
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    channels:     Object.keys(store).length,
    totalMessages: Object.values(store).reduce((s, a) => s + a.length, 0),
    online:       online.size,
  });
});

app.get("/messages/:channelId", (req, res) => {
  const msgs = (store[req.params.channelId] || []).slice(-100);
  res.json({ messages: msgs });
});

// ── Track online users: socketId → { account, channelId } ────────────────────
const online = new Map();

// ── Socket logic ──────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`  + connected  ${socket.id}`);

  /* JOIN CHANNEL */
  socket.on("join_channel", ({ channelId, account }) => {
    if (!channelId || !account) return;

    // Leave previous room
    const prev = online.get(socket.id);
    if (prev) {
      socket.leave(`ch:${prev.channelId}`);
      broadcastOnline(prev.channelId);
    }

    socket.join(`ch:${channelId}`);
    online.set(socket.id, { account, channelId });

    // Send stored message history to this socket only
    const history = (store[channelId] || []).slice(-100);
    socket.emit("history", { channelId, messages: history });

    // Update online list for everyone in room
    broadcastOnline(channelId);

    console.log(`  → ${account.slice(0,8)}… joined #${channelId}`);
  });

  /* SEND MESSAGE */
  socket.on("send_message", ({ channelId, account, text }) => {
    if (!channelId || !account || !text?.trim()) return;

    const user = online.get(socket.id);
    if (!user || user.channelId !== channelId) return; // Must be in room

    const msg = {
      id:        `${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      channelId,
      account,
      text:      text.trim().slice(0, 500),
      timestamp: Date.now(),
    };

    // Persist
    if (!store[channelId]) store[channelId] = [];
    store[channelId].push(msg);
    if (store[channelId].length > MAX_PER_CH)
      store[channelId] = store[channelId].slice(-MAX_PER_CH);
    saveStore(store);

    // Broadcast to whole room
    io.to(`ch:${channelId}`).emit("message", msg);
    console.log(`  💬 [#${channelId}] ${account.slice(0,8)}…: ${text.slice(0,40)}`);
  });

  /* TYPING */
  socket.on("typing_start", ({ channelId, account }) => {
    socket.to(`ch:${channelId}`).emit("typing_start", { account });
  });
  socket.on("typing_stop", ({ channelId, account }) => {
    socket.to(`ch:${channelId}`).emit("typing_stop", { account });
  });

  /* DISCONNECT */
  socket.on("disconnect", () => {
    const user = online.get(socket.id);
    if (user) {
      online.delete(socket.id);
      broadcastOnline(user.channelId);
    }
    console.log(`  - disconnected ${socket.id}`);
  });
});

function broadcastOnline(channelId) {
  const users = [...online.values()]
    .filter(u => u.channelId === channelId)
    .map(u => u.account);
  io.to(`ch:${channelId}`).emit("online_users", { channelId, users });
}

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n  ⬡  D3scord server  →  http://localhost:${PORT}`);
  console.log(`     /health  — stats`);
  console.log(`     /messages/:id  — history\n`);
});

// STEP 1: Support chat page (real-time)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../contexts.jsx";

export default function Chat() {
  const { user, socket } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  // STEP 2: room id (1-to-1 support room for this user)
  const roomId = useMemo(() => (user ? `support:${user._id}` : ""), [user]);

  // STEP 3: load old messages from backend (REST)
  useEffect(() => {
    (async () => {
      if (!roomId) return;
      const res = await api.get(`/chat/${encodeURIComponent(roomId)}/messages`);
      setMessages(res.data.items || []);
    })();
  }, [roomId]);

  // STEP 4: join socket room
  useEffect(() => {
    if (!socket || !roomId) return;
    socket.emit("chat:join", { roomId });
  }, [socket, roomId]);

  // STEP 5: receive messages in real-time
  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };
    socket.on("chat:new", handler);
    return () => socket.off("chat:new", handler);
  }, [socket]);

  // STEP 6: auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    if (!text.trim()) return;

    socket.emit("chat:send", { roomId, senderId: user._id, text: text.trim() });
    setText("");
  }

  return (
    <div className="panel">
      <h2>Support Chat</h2>

      <div className="chat-box">
        {messages.map((m) => (
          <div key={m._id} className={`chat-msg ${m.senderId === user._id ? "me" : "other"}`}>
            <div className="bubble">
              <div>{m.text}</div>
              <div className="muted small">{new Date(m.createdAt).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="row gap">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type message..."
        />
        <button className="btn" onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
}


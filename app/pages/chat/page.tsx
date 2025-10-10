"use client";
import { useState, useRef } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState<{ id: number; text: string; isMine: boolean }[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    setMessages(prev => [...prev, { id: prev.length, text: newMessage, isMine: true }]);
    setNewMessage("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ textAlign: "center" }}>채팅</h1>
      <div style={{ height: "400px", overflowY: "auto", border: "1px solid #ccc", padding: "10px", marginBottom: "10px", borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ textAlign: msg.isMine ? "right" : "left", marginBottom: "8px" }}>
            <span style={{ display: "inline-block", padding: "6px 12px", borderRadius: "20px", backgroundColor: msg.isMine ? "#4f46e5" : "#e5e7eb", color: msg.isMine ? "white" : "black", maxWidth: "70%" }}>
              {msg.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="메시지를 입력하세요"
          style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
          onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
        />
        <button onClick={sendMessage} style={{ padding: "10px 16px", borderRadius: "8px", backgroundColor: "#4f46e5", color: "white", border: "none" }}>보내기</button>
      </div>
    </div>
  );
}

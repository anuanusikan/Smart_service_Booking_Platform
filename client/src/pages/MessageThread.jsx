import { useState, useEffect, useRef } from 'react';
import { messagesApi } from '../services/api';

async function MessageThread({ bookingId, otherPersonName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  
  const user = JSON.parse(localStorage.getItem('user'));
  const bottomRef = useRef(null);

 const fetchMessages = async () => {
  try {
    const data = await messagesApi.getThread(bookingId);

    setMessages(Array.isArray(data) ? data : []);
    setLoading(false);
  } catch {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000); // poll every 4 seconds
    return () => clearInterval(interval);
  }, [bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

 const  { ok, data } = await messagesApi.send(bookingId, text);

if (ok) {
  setMessages(prev => [...prev, data]);
  setText('');
}
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(17, 24, 39, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '400px', height: '520px', background: 'white',
          borderRadius: '12px', display: 'flex', flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{otherPersonName}</p>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--slate)', padding: '2px 8px' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loading && <p className="meta">Loading messages...</p>}
          {!loading && messages.length === 0 && <p className="meta">No messages yet. Say hello!</p>}

          {messages.map((msg) => {
            const isMine = msg.sender?._id === user.id;
            return (
              <div key={msg._id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
                <div style={{
                  maxWidth: '75%',
                  background: isMine ? 'var(--primary)' : 'var(--bg)',
                  color: isMine ? 'white' : 'var(--navy)',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  fontSize: '14px'
                }}>
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} style={{ display: 'flex', gap: '8px', padding: '12px', borderTop: '1px solid var(--border)' }}>
          <input
            type="text"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ margin: 0 }}
          />
          <button type="submit" style={{ flexShrink: 0 }}>Send</button>
        </form>
      </div>
    </div>
  );
}

export default MessageThread;
import { useState, useEffect, useRef } from 'react';
import { messagesApi } from '../services/api';

function MessageThread({ bookingId, otherPersonName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const sendInProgress = useRef(false);
  const messageVersion = useRef(0);
  const user = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })();
  const bottomRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      overlayRef.current?.style.setProperty('--chat-height', `${viewport?.height || window.innerHeight}px`);
      overlayRef.current?.style.setProperty('--chat-top', `${viewport?.offsetTop || 0}px`);
    };
    resize();
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    window.addEventListener('resize', resize);
    return () => {
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    let active = true;
    setMessages([]);
    setLoading(true);
    setError('');
    const fetchMessages = async () => {
      const version = messageVersion.current;
      const data = await messagesApi.getThread(bookingId);
      if (!active) return;
      // Ignore stale polls that could overwrite a newly sent message.
      if (!sendInProgress.current && version === messageVersion.current) {
        if (Array.isArray(data)) {
          setMessages(data);
          window.dispatchEvent(new Event('messagesRead'));
        } else {
          setError('Could not load messages. Please reopen the chat to try again.');
        }
      }
      setLoading(false);
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const messageText = text.trim();
    if (!messageText || sendInProgress.current) return;
    sendInProgress.current = true;
    messageVersion.current += 1;
    setSending(true);
    setError('');
    try {
      const { ok, data } = await messagesApi.send(bookingId, messageText);
      if (ok) {
        setMessages(prev => prev.some(msg => msg._id === data._id) ? prev : [...prev, data]);
        setText('');
      } else {
        setError(data?.message || 'Could not send message. Please try again.');
      }
    } catch {
      setError('Could not send message. Please try again.');
    } finally {
      messageVersion.current += 1;
      sendInProgress.current = false;
      setSending(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="chat-overlay"
      onClick={onClose}
    >
      <div
        className="chat-dialog"
        role="dialog"
        aria-label={`Chat with ${otherPersonName || 'your service partner'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chat-header" style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontWeight: 600, overflowWrap: 'anywhere', minWidth: 0 }}>{otherPersonName}</p>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--slate)', padding: '2px 8px' }}>✕</button>
        </div>

        <div className="chat-messages" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', overscrollBehavior: 'contain' }}>
          {loading && <p className="meta">Loading messages...</p>}
          {!loading && messages.length === 0 && <p className="meta">No messages yet. Say hello!</p>}

          {messages.map((msg) => {
            const isMine = msg.sender?._id === (user?.id || user?._id);
            return (
              <div key={msg._id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
                <div style={{
                  maxWidth: '75%',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'pre-wrap',
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

        {error && <p role="alert" style={{ color: 'var(--danger)', margin: '0 12px 8px' }}>{error}</p>}
        <form className="chat-composer" onSubmit={sendMessage} style={{ display: 'flex', gap: '8px', padding: '12px', borderTop: '1px solid var(--border)' }}>
          <input
            type="text"
            placeholder="Type a message..."
            aria-label="Message"
            value={text}
            disabled={sending}
            onChange={(e) => setText(e.target.value)}
            style={{ margin: 0, minWidth: 0, flex: 1 }}
          />
          <button type="submit" disabled={sending || !text.trim()} style={{ flexShrink: 0 }}>{sending ? 'Sending...' : 'Send'}</button>
        </form>
      </div>
    </div>
  );
}

export default MessageThread;

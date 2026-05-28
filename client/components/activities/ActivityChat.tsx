'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/useAuthStore';
import { getMyActivitiesAction, resolveImageUrl } from '@/lib/actions';

interface Reaction { id: string; emoji: string; userId: string; user: { username: string } }
interface Message {
  id: string; activityId: string; userId: string; content: string;
  type: 'TEXT' | 'SYSTEM'; createdAt: string;
  user?: { username: string; avatarUrl: string | null };
  reactions: Reaction[];
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.setHours(0,0,0,0) - d.setHours(0,0,0,0);
  if (diff === 0) return 'Today';
  if (diff === 86400000) return 'Yesterday';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(iso));
}
function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export const ActivityChat: React.FC<{ activityId: string; activityTitle: string; onClose: () => void }> = ({
  activityId: initialId, activityTitle: initialTitle, onClose,
}) => {
  const { user, token } = useAuthStore();
  const [activeId, setActiveId] = useState(initialId);
  const [activeTitle, setActiveTitle] = useState(initialTitle);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [myActivities, setMyActivities] = useState<any[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  // ── fetch sidebar list ──────────────────────────────────────────────────────
  useEffect(() => {
    getMyActivitiesAction().then(r => { if (r.success) setMyActivities(r.data); });
  }, []);

  // ── socket lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const socket = io(`${process.env.NEXT_PUBLIC_ACTIONS_URL}/group-chat`, {
      auth: { token }, transports: ['websocket'],
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_activity', { activityId: activeId });
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('message_history', (history: Message[]) => {
      setMessages(history);
      setHasMore(history.length >= 30);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
    });

    socket.on('new_message', (msg: Message) => {
      if (msg.activityId === activeId) {
        setMessages(prev => [...prev, msg]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    });

    socket.on('more_messages', (older: Message[]) => {
      setLoadingMore(false);
      setHasMore(older.length >= 30);
      const el = scrollRef.current;
      const prevH = el?.scrollHeight ?? 0;
      setMessages(prev => [...older, ...prev]);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevH;
      });
    });

    socket.on('typing_users', ({ activityId, users }: { activityId: string; users: string[] }) => {
      if (activityId === activeId) setTypingUsers(users.filter(id => id !== user?.id));
    });

    socket.on('online_users', (ids: string[]) => setOnlineUsers(ids));

    socket.on('message_reacted', ({ messageId, reactions }: { messageId: string; reactions: Reaction[] }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [activeId, token]);

  // ── switch activity room ─────────────────────────────────────────────────────
  const switchActivity = (id: string, title: string) => {
    if (id === activeId) return;
    setMessages([]); setHasMore(true); setTypingUsers([]); setOnlineUsers([]);
    setActiveId(id); setActiveTitle(title);
  };

  // ── send message ─────────────────────────────────────────────────────────────
  const handleSend = () => {
    if (!input.trim() || !socketRef.current || !connected) return;
    socketRef.current.emit('send_message', { activityId: activeId, content: input.trim() });
    setInput('');
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    socketRef.current.emit('stop_typing', { activityId: activeId });
  };

  // ── typing indicator ─────────────────────────────────────────────────────────
  const handleInputChange = (val: string) => {
    setInput(val);
    if (!socketRef.current || !connected) return;
    socketRef.current.emit('typing', { activityId: activeId });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', { activityId: activeId });
    }, 2500);
  };

  // ── load more on scroll up ───────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasMore || loadingMore) return;
    if (el.scrollTop < 60 && messages.length > 0) {
      setLoadingMore(true);
      socketRef.current?.emit('load_more_messages', {
        activityId: activeId,
        before: messages[0].createdAt,
      });
    }
  }, [hasMore, loadingMore, messages, activeId]);

  // ── react to message ─────────────────────────────────────────────────────────
  const handleReact = (messageId: string, emoji: string) => {
    socketRef.current?.emit('react_message', { messageId, activityId: activeId, emoji });
    setShowEmojiFor(null);
  };

  // ── typing names ─────────────────────────────────────────────────────────────
  const typingNames = typingUsers
    .map(id => myActivities.flatMap(a => []).find(() => false) || id.slice(0, 6))
    .join(', ');

  return (
    <div className="fixed inset-0 z-[100] bg-white flex h-screen overflow-hidden text-on-surface">

      {/* ── Sidebar ── */}
      <div className="w-[72px] lg:w-[320px] flex-shrink-0 flex flex-col border-r border-outline/5 bg-background">
        <div className="h-[72px] flex items-center justify-between px-4 lg:px-6 border-b border-outline/5">
          <h2 className="hidden lg:block font-bold text-xl tracking-tight text-on-surface">Messages</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/50 transition-colors">
            <span className="material-symbols-outlined text-lg text-on-surface-variant">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
          {myActivities.map(a => {
            const isActive = a.id === activeId;
            const isOnline = onlineUsers.includes(a.hostId);
            return (
              <button key={a.id} onClick={() => switchActivity(a.id, a.title)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${isActive ? 'bg-primary/5 text-primary shadow-sm' : 'hover:bg-secondary/40 text-on-surface-variant'}`}>
                <div className="relative flex-shrink-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shadow-sm ${isActive ? 'bg-primary text-white' : 'bg-white border border-outline/10 text-on-surface-variant'}`}>
                    {a.title.charAt(0)}
                  </div>
                  {isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />}
                </div>
                <div className="hidden lg:flex flex-col min-w-0">
                  <span className={`font-bold text-sm truncate ${isActive ? 'text-primary' : 'text-on-surface'}`}>{a.title}</span>
                  <span className="text-[10px] text-outline/60 font-semibold uppercase tracking-wider truncate">{a.memberCount} members</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Chat ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">

        {/* Header */}
        <header className="h-[72px] flex items-center justify-between px-6 border-b border-outline/5 bg-white/80 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
              {activeTitle.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-base text-on-surface leading-none mb-1">{activeTitle}</h3>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
                <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                  {connected ? `${onlineUsers.length} online` : 'Reconnecting...'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowInfo(v => !v)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showInfo ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-on-surface-variant/40 hover:bg-secondary/50'}`}>
              <span className="material-symbols-outlined text-xl">info</span>
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-1 bg-background"
          onClick={() => { setHoveredId(null); setShowEmojiFor(null); }}>

          {/* Load more spinner */}
          {loadingMore && (
            <div className="flex justify-center py-3">
              <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          )}
          {!hasMore && messages.length > 0 && (
            <p className="text-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/30 py-2">Beginning of conversation</p>
          )}

          {messages.length === 0 && !loadingMore ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 opacity-30 py-20">
              <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-on-secondary/30">chat_bubble</span>
              </div>
              <p className="font-bold text-sm uppercase tracking-widest text-on-surface-variant/40">No messages yet</p>
            </div>
          ) : (
            messages.map((m, i) => {
              const isMe = m.userId === user?.id;
              const prev = messages[i - 1];
              const isSameUser = prev?.userId === m.userId && isSameDay(m.createdAt, prev.createdAt);
              const showDate = !prev || !isSameDay(m.createdAt, prev.createdAt);

              // Group reactions by emoji
              const reactionMap: Record<string, { count: number; users: string[]; mine: boolean }> = {};
              m.reactions.forEach(r => {
                if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { count: 0, users: [], mine: false };
                reactionMap[r.emoji].count++;
                reactionMap[r.emoji].users.push(r.user.username);
                if (r.userId === user?.id) reactionMap[r.emoji].mine = true;
              });

              return (
                <React.Fragment key={m.id}>
                  {/* Date divider */}
                  {showDate && (
                    <div className="flex items-center gap-3 py-3">
                      <div className="flex-1 h-px bg-outline/5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/30">{formatDateLabel(m.createdAt)}</span>
                      <div className="flex-1 h-px bg-outline/5" />
                    </div>
                  )}

                  {/* System message */}
                  {m.type === 'SYSTEM' ? (
                    <div className="flex justify-center py-1">
                      <span className="text-[10px] text-on-surface-variant/60 font-semibold italic px-4 py-1 bg-secondary/40 rounded-full">{m.content}</span>
                    </div>
                  ) : (
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isSameUser ? 'mt-0.5' : 'mt-3'}`}
                      onMouseEnter={() => setHoveredId(m.id)}
                      onMouseLeave={() => { if (showEmojiFor !== m.id) setHoveredId(null); }}>

                      {/* Sender name */}
                      {!isMe && !isSameUser && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 ml-10 mb-1">
                          {m.user?.username || 'Member'}
                        </span>
                      )}

                      <div className={`flex items-end gap-2 max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Avatar */}
                        {!isMe && !isSameUser ? (
                          <div className="w-8 h-8 rounded-xl bg-secondary flex-shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden text-on-secondary/50">
                            {m.user?.avatarUrl ? <img src={resolveImageUrl(m.user.avatarUrl) ?? ''} className="w-full h-full object-cover" /> : m.user?.username?.charAt(0)}
                          </div>
                        ) : !isMe ? <div className="w-8 flex-shrink-0" /> : null}

                        <div className="flex flex-col gap-1">
                          {/* Bubble + hover actions */}
                          <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`px-4 py-2.5 rounded-xl text-sm leading-relaxed select-text shadow-sm
                              ${isMe ? 'bg-primary text-white rounded-tr-sm' : 'bg-white text-on-surface rounded-tl-sm border border-outline/10'}`}>
                              {m.content}
                            </div>

                            {/* Hover action bar */}
                            {hoveredId === m.id && (
                              <div className={`flex items-center gap-0.5 animate-in fade-in duration-150`}>
                                <div className="relative">
                                  <button onClick={(e) => { e.stopPropagation(); setShowEmojiFor(showEmojiFor === m.id ? null : m.id); }}
                                    className="w-7 h-7 rounded-xl bg-white border border-outline/10 shadow-sm flex items-center justify-center text-on-surface-variant/40 hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined text-sm">add_reaction</span>
                                  </button>
                                  {/* Emoji picker */}
                                  {showEmojiFor === m.id && (
                                    <div onClick={e => e.stopPropagation()}
                                      className={`absolute bottom-9 ${isMe ? 'right-0' : 'left-0'} flex gap-1 bg-white border border-outline/10 shadow-xl rounded-xl p-2 z-20 animate-in zoom-in-95 duration-150`}>
                                        {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(e => (
                                          <button key={e} onClick={() => handleReact(m.id, e)}
                                            className="text-lg hover:scale-125 transition-transform w-8 h-8 flex items-center justify-center rounded-xl hover:bg-secondary/40">{e}</button>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Reactions row */}
                          {Object.keys(reactionMap).length > 0 && (
                            <div className={`flex flex-wrap gap-1 ${isMe ? 'justify-end' : 'justify-start'} pl-1`}>
                              {Object.entries(reactionMap).map(([emoji, data]) => (
                                <button key={emoji} onClick={() => handleReact(m.id, emoji)}
                                  title={data.users.join(', ')}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition-all hover:scale-105 active:scale-95
                                    ${data.mine ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white border-outline/10 text-on-surface-variant/60 shadow-sm'}`}>
                                  <span>{emoji}</span>
                                  {data.count > 1 && <span>{data.count}</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Timestamp on hover */}
                      {hoveredId === m.id && (
                        <span className={`text-[9px] text-on-surface-variant/20 font-bold mt-1 ${isMe ? 'pr-1' : 'pl-10'} animate-in fade-in duration-150`}>
                          {formatTime(m.createdAt)}
                        </span>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="px-6 pb-1 flex items-center gap-2 animate-in slide-in-from-bottom-1 duration-200">
            <div className="flex gap-0.5">
              {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-outline/20 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
            <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">typing...</span>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-outline/5 bg-white flex-shrink-0">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <input
                type="text" value={input}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Type a message..."
                className="w-full pl-5 pr-12 py-3 bg-secondary/30 border border-transparent rounded-xl focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all text-sm outline-none font-semibold text-on-surface placeholder:text-outline/30"
              />
              <button onClick={handleSend} disabled={!input.trim() || !connected}
                className="absolute right-2 top-1.5 w-9 h-9 flex items-center justify-center text-primary disabled:opacity-30 hover:bg-primary/10 rounded-full transition-all active:scale-90">
                <span className="material-symbols-outlined text-xl">send</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Info Panel ── */}
      {showInfo && (
        <div className="hidden lg:flex w-[280px] flex-shrink-0 flex-col border-l border-outline/5 bg-white animate-in slide-in-from-right duration-300">
          <div className="p-8 flex flex-col items-center text-center border-b border-outline/5">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary to-primary-container shadow-xl shadow-primary/10 flex items-center justify-center text-white text-3xl font-bold mb-4">
              {activeTitle.charAt(0)}
            </div>
            <h3 className="font-bold text-lg text-on-surface tracking-tight">{activeTitle}</h3>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/40 mt-1">Group Chat</span>
          </div>
          <div className="p-6 space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20">
              <span className="material-symbols-outlined text-green-500 text-lg">circle</span>
              <div>
                <p className="text-xs font-bold text-on-surface">{onlineUsers.length} Online</p>
                <p className="text-[10px] text-on-surface-variant/40 font-semibold uppercase tracking-wider">Right now</p>
              </div>
            </div>
            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-all text-red-500 text-left">
              <span className="material-symbols-outlined text-lg">logout</span>
              <span className="text-xs font-bold uppercase tracking-widest">Leave Group</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

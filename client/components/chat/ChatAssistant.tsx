'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Chào bạn! Tôi là **HanoiGO AI**. Bạn muốn tìm địa điểm đẹp nào hôm nay? 👋' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Get current location if possible
      let lat, lng;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (e) {
        console.warn('GPS not available for chat context');
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_ACTIONS_URL}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, lat, lng }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Rất tiếc, tôi không thể kết nối được với máy chủ.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[420px] h-[600px] bg-white/95 backdrop-blur-2xl rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/40 mb-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-500">
          {/* Header */}
          <div className="p-8 bg-gradient-to-br from-primary to-primary-900 text-white flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[1.25rem] bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                <span className="material-symbols-outlined text-2xl">auto_awesome</span>
              </div>
              <div>
                <h3 className="font-black text-xl tracking-tight leading-none mb-1.5">HanoiGO AI</h3>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_#4ade80]"></span>
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-90">AI Specialist</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 hide-scrollbar bg-slate-50/30">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] px-6 py-4 rounded-[1.75rem] text-[15px] leading-relaxed shadow-sm
                  ${m.role === 'user' 
                    ? 'bg-primary text-white rounded-tr-none shadow-primary/20' 
                    : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                  {m.role === 'assistant' ? (
                    <ReactMarkdown 
                      components={{
                        p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({children}) => <strong className="font-black text-primary">{children}</strong>,
                        ul: ({children}) => <ul className="space-y-1.5 my-3 list-none">{children}</ul>,
                        li: ({children}) => (
                          <li className="flex gap-2 items-start">
                            <span className="text-primary mt-1 text-[10px]">●</span>
                            <span>{children}</span>
                          </li>
                        ),
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/80 px-6 py-4 rounded-[1.75rem] rounded-tl-none flex gap-1.5 items-center border border-slate-100 shadow-sm">
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.32s]"></div>
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.16s]"></div>
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-8 py-3 flex gap-3 overflow-x-auto hide-scrollbar whitespace-nowrap bg-white/50">
             {['Địa điểm gần đây', 'Di tích lịch sử', 'Món ngon phố cổ'].map(tag => (
               <button 
                 key={tag} 
                 onClick={() => setInput(tag)}
                 className="px-5 py-2.5 bg-white hover:bg-primary hover:text-white border border-slate-100 rounded-full text-[11px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95">
                 {tag}
               </button>
             ))}
          </div>

          {/* Input */}
          <div className="p-8 bg-white border-t border-slate-100">
            <div className="relative">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Hỏi AI về Hà Nội..."
                className="w-full pl-6 pr-16 py-4.5 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/30 transition-all text-sm outline-none font-bold placeholder:text-slate-400 shadow-inner"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-2 w-11 h-11 bg-primary text-white rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-[1.05] active:scale-[0.9] disabled:opacity-50 disabled:scale-100 transition-all">
                <span className="material-symbols-outlined text-2xl">arrow_upward</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bubble Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-18 h-18 bg-primary text-white rounded-[2rem] shadow-[0_15px_40px_rgba(var(--primary-rgb),0.5)] flex items-center justify-center hover:scale-[1.05] active:scale-[0.9] transition-all duration-300 relative overflow-hidden group">
        <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-150 transition-transform duration-700 rounded-full"></div>
        <span className="material-symbols-outlined text-4xl relative z-10 transition-transform duration-500 group-hover:rotate-12">
          {isOpen ? 'close' : 'chat_bubble'}
        </span>
        {!isOpen && (
          <span className="absolute top-0 right-0 w-6 h-6 bg-red-500 border-4 border-white rounded-full"></span>
        )}
      </button>
    </div>
  );
}

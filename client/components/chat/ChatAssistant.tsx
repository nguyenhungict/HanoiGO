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
    { role: 'assistant', content: 'Chào bạn! Tôi là **HanoiGO AI**. Bạn cần tôi hỗ trợ gì? ✨' }
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

  const handleSend = async (customMessage?: string) => {
    const textToSend = customMessage || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage = textToSend.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      let lat, lng;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (e) {}

      const res = await fetch(`${process.env.NEXT_PUBLIC_ACTIONS_URL}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, lat, lng }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hệ thống đang bận một chút, bạn thử lại sau nhé!' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    { label: 'Gần tôi', icon: 'location_on' },
    { label: 'Ăn uống', icon: 'restaurant' },
    { label: 'Lịch sử', icon: 'history_edu' },
  ];

  return (
    <div className="fixed bottom-[88px] right-8 z-[1001] flex flex-col items-end font-sans">
      {/* Chat Container */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[360px] h-[540px] flex flex-col group animate-in slide-in-from-bottom-8 fade-in duration-500">
          
          {/* Main Glass Frame */}
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[40px] rounded-[2.5rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.12)] border border-white/40 overflow-hidden flex flex-col">
            
            {/* Liquid Aurora Background */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
              <div className="absolute -top-[10%] -left-[10%] w-[80%] h-[60%] bg-primary/15 blur-[100px] animate-aurora rounded-full"></div>
              <div className="absolute top-[20%] -right-[20%] w-[70%] h-[70%] bg-blue-400/10 blur-[120px] animate-aurora rounded-full [animation-delay:5s]"></div>
              <div className="absolute -bottom-[10%] left-[20%] w-[60%] h-[50%] bg-amber-300/5 blur-[80px] animate-aurora rounded-full [animation-delay:10s]"></div>
            </div>

            {/* Header - Compact */}
            <header className="px-6 pt-6 pb-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-white text-lg">auto_awesome</span>
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight text-slate-800">HanoiGO AI</h3>
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100/50 hover:bg-slate-200/50 flex items-center justify-center transition-all"
              >
                <span className="material-symbols-outlined text-sm text-slate-500">close</span>
              </button>
            </header>

            {/* Messages - Compact Bubbles */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-6 scrollbar-none">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`relative px-5 py-3.5 rounded-[1.8rem] text-[13px] leading-relaxed transition-all
                    ${m.role === 'user' 
                      ? 'bg-primary text-white rounded-tr-none shadow-[0_10px_20px_-8px_rgba(255,90,95,0.4)] font-bold' 
                      : 'bg-white/40 backdrop-blur-md text-slate-700 rounded-tl-none border border-white/50 shadow-sm'}`}>
                    
                    {m.role === 'assistant' ? (
                      <ReactMarkdown 
                        components={{
                          p: ({children}) => <p className="mb-1 last:mb-0">{children}</p>,
                          strong: ({children}) => <strong className="font-black text-primary">{children}</strong>,
                          ul: ({children}) => <ul className="space-y-1.5 my-3 list-none">{children}</ul>,
                          li: ({children}) => (
                            <li className="flex gap-2.5 items-start">
                              <span className="w-1 h-1 rounded-full bg-primary/40 mt-2"></span>
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
                  <div className="bg-white/40 backdrop-blur-md px-5 py-3.5 rounded-[1.5rem] rounded-tl-none border border-white/50 flex gap-1.5 items-center">
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce"></span>
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input & Suggestions - Compact Area */}
            <footer className="p-5 pt-0 space-y-3">
              
              {/* Compact Suggestions */}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
                 {suggestions.map(s => (
                   <button 
                     key={s.label} 
                     onClick={() => handleSend(s.label)}
                     className="px-3 py-1.5 bg-white/60 hover:bg-white backdrop-blur-md border border-white/50 rounded-full text-[9px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-sm">
                     <span className="material-symbols-outlined text-xs">{s.icon}</span>
                     {s.label}
                   </button>
                 ))}
              </div>

              {/* Input Pill - Compact */}
              <div className="relative group/input">
                <div className="relative flex items-center bg-white/80 backdrop-blur-xl border border-white rounded-full p-1.5 pl-5 shadow-xl shadow-black/[0.03]">
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Hỏi tôi..."
                    className="flex-1 bg-transparent outline-none text-[13px] font-bold text-slate-700 placeholder:text-slate-400"
                  />
                  <button 
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-90 disabled:opacity-30 transition-all">
                    <span className="material-symbols-outlined text-base">send</span>
                  </button>
                </div>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* Main Trigger Bubble - Matched with Location Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center border border-outline/10 transition-all duration-500 group overflow-hidden active:scale-95
          ${isOpen ? 'bg-primary text-white rotate-90 scale-90' : 'bg-white text-primary hover:bg-slate-50'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000"></div>
        <span className={`material-symbols-outlined text-2xl transition-transform duration-500 ${isOpen ? 'rotate-[360deg]' : 'group-hover:scale-110'}`}>
          {isOpen ? 'close' : 'auto_awesome'}
        </span>
        {!isOpen && (
           <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>
        )}
      </button>

      <style jsx>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

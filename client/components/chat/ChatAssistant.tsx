'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface PlacePin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  address: string;
  distanceKm: number;
}

interface ItineraryStop {
  order: number;
  name: string;
  arriveAt: string;
  departAt: string;
  category: string;
  travelFromPrevMin: number;
}

interface ItineraryDay {
  dayNumber: number;
  dayLabel: string;
  color: string;
  stops: ItineraryStop[];
  totalTravelMin: number;
}

interface AiChatResponse {
  response: string;
  intent: 'nearby' | 'trip_plan' | 'trip_plan_collecting' | 'general';
  places?: PlacePin[];
  itinerary?: { days: ItineraryDay[] };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  places?: PlacePin[];
  itinerary?: { days: ItineraryDay[] };
  intent?: string;
}

interface Props {
  onAiMarkers?: (markers: PlacePin[]) => void;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function NearbyPlacesList({ places }: { places: PlacePin[] }) {
  return (
    <div className="mt-3 space-y-2">
      {places.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-3 bg-white/70 border border-white/60 rounded-2xl px-3 py-2.5 shadow-sm"
        >
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-sm text-primary">location_on</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-black text-on-surface truncate">{p.name}</p>
            <p className="text-[10px] text-outline/60 font-bold uppercase tracking-wider">{p.category}</p>
          </div>
          <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-full shrink-0">
            {p.distanceKm.toFixed(1)} km
          </span>
        </div>
      ))}
    </div>
  );
}

function ItineraryCard({ itinerary }: { itinerary: { days: ItineraryDay[] } }) {
  const [openDay, setOpenDay] = useState<number>(1);

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="material-symbols-outlined text-sm text-primary">map</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Your Itinerary</span>
      </div>
      {itinerary.days.map((day) => (
        <div key={day.dayNumber} className="bg-white/70 border border-white/60 rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => setOpenDay(openDay === day.dayNumber ? 0 : day.dayNumber)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-white text-[10px] font-black"
              style={{ backgroundColor: day.color }}
            >
              {day.dayNumber}
            </div>
            <span className="text-[12px] font-black text-on-surface flex-1">Day {day.dayNumber} — {day.dayLabel}</span>
            <span className="material-symbols-outlined text-sm text-outline/50">
              {openDay === day.dayNumber ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          {openDay === day.dayNumber && (
            <div className="px-3 pb-3 space-y-1.5">
              {day.stops.length === 0 ? (
                <p className="text-[11px] text-outline/50 font-bold italic">No stops for this day.</p>
              ) : (
                day.stops.map((stop) => (
                  <div key={stop.order} className="flex gap-2.5 items-start">
                    <div className="flex flex-col items-center pt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {stop.order < day.stops.length && <div className="w-px flex-1 bg-primary/20 min-h-[16px]" />}
                    </div>
                    <div className="flex-1 pb-1">
                      <p className="text-[11px] font-black text-on-surface">{stop.name}</p>
                      <p className="text-[9px] text-outline/50 font-bold">
                        {stop.arriveAt} → {stop.departAt}
                        {stop.travelFromPrevMin > 0 && ` · ${stop.travelFromPrevMin} min travel`}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function ChatAssistant({ onAiMarkers }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Chào bạn! Tôi là **HanoiGO AI**. Bạn cần tôi hỗ trợ gì? ✨\n\nTôi có thể:\n- 📍 Gợi ý địa điểm **gần bạn**\n- 🗺️ **Lên kế hoạch chuyến đi** cho bạn\n- 💬 Trả lời câu hỏi về Hà Nội' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSend = async (customMessage?: string) => {
    const textToSend = customMessage || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage = textToSend.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      let lat: number | undefined, lng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch { /* location not available */ }

      const res = await fetch(`${process.env.NEXT_PUBLIC_ACTIONS_URL}/ai-chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, lat, lng, history: messages.map(m => ({ role: m.role, content: m.content })) }),
      });

      const data: AiChatResponse = await res.json();

      // Lift AI markers to parent (DiscoveryPage) for map auto-zoom
      if (data.intent === 'nearby' && data.places && data.places.length > 0) {
        onAiMarkers?.(data.places);
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          intent: data.intent,
          places: data.places,
          itinerary: data.itinerary,
        }
      ]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hệ thống đang bận một chút, bạn thử lại sau nhé! 🙏' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    { label: 'Gần tôi', icon: 'location_on' },
    { label: 'Lên kế hoạch 1 ngày', icon: 'map' },
    { label: 'Ăn uống', icon: 'restaurant' },
    { label: 'Di tích lịch sử', icon: 'history_edu' },
  ];

  return (
    <div className="fixed bottom-24 right-8 z-[1001] flex flex-col items-end font-body">
      {/* Chat Container */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[380px] h-[580px] flex flex-col group animate-in slide-in-from-bottom-8 fade-in duration-500">

          {/* Main Glass Frame */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.25)] border border-white/40 overflow-hidden flex flex-col">

            {/* Liquid Aurora Background */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
              <div className="absolute -top-[10%] -left-[10%] w-[80%] h-[60%] bg-primary/15 blur-[100px] animate-aurora rounded-full" />
              <div className="absolute top-[20%] -right-[20%] w-[70%] h-[70%] bg-blue-400/10 blur-[120px] animate-aurora rounded-full [animation-delay:5s]" />
              <div className="absolute -bottom-[10%] left-[20%] w-[60%] h-[50%] bg-amber-300/5 blur-[80px] animate-aurora rounded-full [animation-delay:10s]" />
            </div>

            {/* Header */}
            <header className="px-6 pt-6 pb-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/25">
                  <span className="material-symbols-outlined text-white text-xl">auto_awesome</span>
                </div>
                <div>
                  <h3 className="font-black text-[15px] tracking-tighter text-on-surface">HanoiGO AI</h3>
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-5 scrollbar-none">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`relative px-5 py-4 rounded-[1.8rem] text-[13px] leading-relaxed transition-all shadow-sm max-w-[95%]
                    ${m.role === 'user'
                      ? 'bg-primary text-white rounded-tr-none shadow-xl shadow-primary/20 font-bold'
                      : 'bg-white/60 backdrop-blur-md text-on-surface rounded-tl-none border border-white/50'}`}
                  >
                    {m.role === 'assistant' ? (
                      <>
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-black text-primary">{children}</strong>,
                            ul: ({ children }) => <ul className="space-y-1.5 my-3 list-none">{children}</ul>,
                            li: ({ children }) => (
                              <li className="flex gap-2.5 items-start">
                                <span className="w-1 h-1 rounded-full bg-primary/40 mt-2" />
                                <span>{children}</span>
                              </li>
                            ),
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>

                        {/* Nearby places list */}
                        {m.intent === 'nearby' && m.places && m.places.length > 0 && (
                          <NearbyPlacesList places={m.places} />
                        )}

                        {/* Itinerary card */}
                        {m.intent === 'trip_plan' && m.itinerary && (
                          <ItineraryCard itinerary={m.itinerary} />
                        )}
                      </>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/40 backdrop-blur-md px-5 py-3.5 rounded-[1.5rem] rounded-tl-none border border-white/50 flex gap-1.5 items-center">
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input & Suggestions */}
            <footer className="p-5 pt-0 space-y-3">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
                {suggestions.map(s => (
                  <button
                    key={s.label}
                    onClick={() => handleSend(s.label)}
                    className="px-3 py-1.5 bg-white/60 hover:bg-white backdrop-blur-md border border-white/50 rounded-full text-[9px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-sm whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-xs">{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="relative group/input">
                <div className="relative flex items-center bg-white/60 backdrop-blur-xl border border-white/80 rounded-full p-2 pl-5 shadow-2xl shadow-black/[0.05] group-focus-within/input:bg-white group-focus-within/input:shadow-primary/5 transition-all">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask me..."
                    className="flex-1 bg-transparent outline-none text-[13px] font-bold text-slate-700 placeholder:text-slate-400"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 disabled:opacity-30 transition-all"
                  >
                    <span className="material-symbols-outlined text-xl">arrow_upward</span>
                  </button>
                </div>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* Trigger Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-[22px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center justify-center border transition-all duration-700 group overflow-hidden active:scale-90 relative
          ${isOpen ? 'bg-primary text-white scale-95 border-primary shadow-primary/20' : 'bg-background/90 backdrop-blur-xl text-primary border-white/50 hover:bg-white'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000" />
        <span className={`material-symbols-outlined text-3xl transition-all duration-700 ${isOpen ? 'rotate-[360deg] scale-75' : 'group-hover:scale-110'}`}>
          {isOpen ? 'close' : 'auto_awesome'}
        </span>
        {!isOpen && (
          <div className="absolute top-3.5 right-3.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full animate-pulse shadow-sm shadow-green-500/50" />
        )}
      </button>

      <style jsx>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

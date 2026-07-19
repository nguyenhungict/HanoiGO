'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Landmark, PlaceStory, formatTime, formatOpenDays, getOpeningStatus } from '@/lib/landmarks';
import { useTripStore } from '@/store/useTripStore';

interface PlaceDetailsContentProps {
  landmark: Landmark;
  story: PlaceStory;
}

export default function PlaceDetailsContent({ landmark, story }: PlaceDetailsContentProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Zustand trip store integration
  const selectedPlaces = useTripStore((s) => s.selectedPlaces);
  const addPlace = useTripStore((s) => s.addPlace);
  const removePlace = useTripStore((s) => s.removePlace);
  const isSaved = !!selectedPlaces[landmark.id];

  const VISIT_DURATION: Record<string, number> = {
    'Museum': 90,
    'Temple & Pagoda': 45,
    'Historic Site': 60,
    'Nature & Lake': 45,
    'Arts & Performance': 90,
    'Street & Market': 75,
  };

  const getVisitDuration = (category: string): number => VISIT_DURATION[category] ?? 60;

  const CATEGORY_ICONS: Record<string, string> = {
    'Museum': 'museum',
    'Temple & Pagoda': 'temple_buddhist',
    'Historic Site': 'castle',
    'Nature & Lake': 'forest',
    'Arts & Performance': 'theater_comedy',
    'Street & Market': 'storefront',
  };

  const getCategoryIcon = (category: string) => CATEGORY_ICONS[category] ?? 'location_on';

  const uniqueGallery = (landmark.gallery || []).filter(
    (img) => img && img !== landmark.image
  );
  const hasGallery = uniqueGallery.length > 0;
  const allImages = [landmark.image, ...uniqueGallery].filter(Boolean);

  const openLightbox = (index: number) => {
    setActiveIndex(index);
  };

  const closeLightbox = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const nextImage = useCallback(() => {
    setActiveIndex((prev) => (prev === null ? null : (prev + 1) % allImages.length));
  }, [allImages.length]);

  const prevImage = useCallback(() => {
    setActiveIndex((prev) => (prev === null ? null : (prev - 1 + allImages.length) % allImages.length));
  }, [allImages.length]);

  useEffect(() => {
    if (activeIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [activeIndex, closeLightbox, nextImage, prevImage]);

  return (
    <>
      <div className="w-full">
        {/* HERO SECTION: Split layout */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
          {/* Hero Left: Text & Info */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/10 items-center gap-1.5 shadow-sm">
                <span className="material-symbols-outlined text-[13px]">{getCategoryIcon(landmark.category)}</span>
                {landmark.category}
              </span>
              {landmark.district && (
                <span className="inline-flex px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-secondary text-on-surface-variant border border-outline/5 items-center gap-1.5 shadow-sm">
                  <span className="material-symbols-outlined text-[13px]">location_on</span>
                  {landmark.district}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-on-surface leading-tight">
                {landmark.name}
              </h1>
              
              <div className="flex items-center gap-2 text-sm text-outline font-bold">
                <div className="flex items-center text-amber-500">
                  <span className="material-symbols-outlined text-base fill-1">star</span>
                  <span className="text-on-surface font-black ml-1 text-sm">{landmark.rating.toFixed(1)}</span>
                </div>
                <span>•</span>
                <span>Highly Rated Heritage</span>
              </div>
            </div>

            {/* Intro paragraph with quote styling */}
            <p className="text-base md:text-lg font-bold text-on-surface-variant/90 leading-relaxed italic border-l-4 border-primary pl-5 py-2">
              {story.intro}
            </p>

            {/* Action Bar */}
            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={() => isSaved ? removePlace(landmark.id) : addPlace(landmark)}
                className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 shadow-md ${
                  isSaved
                    ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20'
                    : 'bg-primary text-white hover:bg-primary-hover shadow-primary/20'
                }`}
              >
                <span className="material-symbols-outlined text-base">{isSaved ? 'delete' : 'bookmark'}</span>
                {isSaved ? 'Remove from Plan' : 'Add to Plan'}
              </button>

              <Link
                href={`/discovery?select=${landmark.id}`}
                className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-white border border-outline/10 text-on-surface hover:bg-secondary hover:text-primary transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-base">map</span>
                View on Map
              </Link>
            </div>

            {/* Weekly Schedule */}
            {(() => {
              const shortDayNames: Record<number, string> = {
                1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun'
              };
              const status = getOpeningStatus(landmark);
              
              return (
                <div className="mt-6 p-6 rounded-[24px] border border-outline/10 bg-white/60 backdrop-blur-xl shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-xl">schedule</span>
                      <h3 className="font-extrabold text-[12px] text-on-surface uppercase tracking-wider">
                        Weekly Schedule
                      </h3>
                    </div>
                    
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${status.colorClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dotColorClass}`} />
                      <span>{status.text}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 md:gap-2.5 pt-1">
                    {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
                      const todayNum = new Date().getDay();
                      const isToday = dayNum === todayNum;
                      const openDays = landmark.openDays ?? [0, 1, 2, 3, 4, 5, 6];
                      const isOpen = landmark.alwaysOpen || openDays.includes(dayNum);
                      
                      return (
                        <div 
                          key={dayNum}
                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all duration-300 ${
                            isToday 
                              ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20 scale-[1.03]' 
                              : 'bg-white/40 border-outline/5 hover:border-outline/15'
                          }`}
                        >
                          <span className={`text-[10px] font-black uppercase tracking-wider ${isToday ? 'text-primary' : 'text-outline/70'}`}>
                            {shortDayNames[dayNum]}
                          </span>
                          <span className={`text-[9px] sm:text-[10px] font-bold mt-1.5 whitespace-nowrap ${
                            isOpen 
                              ? 'text-on-surface' 
                              : 'text-rose-500/70 dark:text-rose-400/70 font-semibold'
                          }`}>
                            {landmark.alwaysOpen 
                              ? '24/7' 
                              : isOpen 
                                ? `${formatTime(landmark.openTimeStart)}-${formatTime(landmark.openTimeEnd)}` 
                                : 'Closed'}
                          </span>
                          {isToday && (
                            <span className="text-[7px] font-black uppercase tracking-widest text-primary mt-1">
                              Today
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Hero Right: Featured Cover Image */}
          <div className="lg:col-span-5">
            <div 
              className="relative aspect-[4/3] lg:aspect-[1/1] overflow-hidden rounded-[2.5rem] bg-secondary-container border border-outline/5 shadow-2xl cursor-pointer group"
              onClick={() => openLightbox(0)}
            >
              <img
                src={landmark.image}
                alt={landmark.name}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-750 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-all duration-500" />
              
              {/* Zoom hint badge */}
              <div className="absolute right-6 top-6 rounded-full bg-white/95 backdrop-blur-md text-on-surface border border-white/20 p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg text-primary font-bold">zoom_in</span>
              </div>
            </div>
          </div>
        </section>

        {/* DETAILS GRID: Story & Gallery vs. Quick Facts */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-12 pt-12 border-t border-outline/5">
          {/* Main Story & Gallery Column */}
          <div className="lg:col-span-8 space-y-12">
            {/* Editorial Sections */}
            <div className="space-y-10">
              {story.sections.map((section) => (
                <div key={section.title} className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                    {section.title}
                  </h3>
                  <div className="space-y-6">
                    {section.body.split('\n').filter(Boolean).map((paragraph, i) => (
                      <p key={i} className="text-base text-on-surface-variant font-medium leading-8">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Visual Gallery Grid */}
            {hasGallery && (
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                  Visual Gallery
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {uniqueGallery.map((img, idx) => {
                    const imageIndexInAll = 1 + idx;
                    return (
                      <div 
                        key={idx} 
                        onClick={() => openLightbox(imageIndexInAll)}
                        className="aspect-[16/10] relative overflow-hidden rounded-3xl border border-outline/10 group cursor-pointer shadow-md hover:shadow-xl hover:border-primary/20 transition-all duration-300"
                      >
                        <img 
                          src={img} 
                          alt={`${landmark.name} gallery image ${idx + 1}`} 
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-500"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                          <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 text-3xl">
                            zoom_in
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Facts Sidebar Column */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 h-fit">
            {/* Quick Facts Card */}
            <div className="rounded-3xl border border-outline/10 bg-white p-6 shadow-sm space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-outline">
                Quick Facts
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-outline/5 pb-4">
                  <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-lg">{getCategoryIcon(landmark.category)}</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-outline">Category</p>
                    <p className="text-xs font-extrabold text-on-surface mt-0.5">{landmark.category}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-b border-outline/5 pb-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/5 flex items-center justify-center text-amber-500">
                    <span className="material-symbols-outlined text-lg fill-1">star</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-outline">Visitor Score</p>
                    <p className="text-xs font-extrabold text-on-surface mt-0.5">{landmark.rating.toFixed(1)} / 5.0</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-b border-outline/5 pb-4">
                  <div className="w-9 h-9 rounded-xl bg-green-500/5 flex items-center justify-center text-green-500">
                    <span className="material-symbols-outlined text-lg">location_on</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-outline">District Area</p>
                    <p className="text-xs font-extrabold text-on-surface mt-0.5">{landmark.district || 'Hoan Kiem'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/5 flex items-center justify-center text-blue-500">
                    <span className="material-symbols-outlined text-lg">schedule</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-outline">Visit Duration</p>
                    <p className="text-xs font-extrabold text-on-surface mt-0.5">~{getVisitDuration(landmark.category)} mins</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Editorial Frame / Note */}
            <div className="rounded-3xl bg-secondary-container/30 border border-outline/5 p-6 space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                Archive Note
              </h4>
              <p className="text-xs font-semibold leading-6 text-on-surface-variant">
                {story.archiveNote}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Lightbox Slider Modal */}
      {activeIndex !== null && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 backdrop-blur-sm select-none"
          onClick={closeLightbox}
        >
          <button 
            onClick={closeLightbox}
            className="absolute right-6 top-6 z-[100000] flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border border-white/10 text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
            aria-label="Close lightbox"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>

          <button 
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            className="absolute left-6 z-[100000] flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border border-white/10 text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
            aria-label="Previous image"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
          </button>

          <button 
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            className="absolute right-6 z-[100000] flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border border-white/10 text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
            aria-label="Next image"
          >
            <span className="material-symbols-outlined text-2xl">arrow_forward_ios</span>
          </button>

          <div 
            className="relative flex max-h-[85vh] max-w-[85vw] flex-col items-center justify-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={allImages[activeIndex]} 
              alt={`${landmark.name} slide ${activeIndex + 1}`}
              referrerPolicy="no-referrer"
              className="max-h-[75vh] max-w-[85vw] rounded-xl object-contain shadow-2xl transition-all duration-300 ease-in-out"
            />
            
            <div className="rounded-full bg-white/10 border border-white/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-white backdrop-blur-md">
              {activeIndex + 1} / {allImages.length}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

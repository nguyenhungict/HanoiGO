'use client';

import { useState, useEffect, useCallback } from 'react';
import { Landmark, PlaceStory } from '@/lib/landmarks';

interface PlaceDetailsContentProps {
  landmark: Landmark;
  story: PlaceStory;
}

export default function PlaceDetailsContent({ landmark, story }: PlaceDetailsContentProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Filter out duplicate or placeholder images if they match the main cover image
  const uniqueGallery = (landmark.gallery || []).filter(
    (img) => img && img !== landmark.image
  );
  const hasGallery = uniqueGallery.length > 0;

  // Combine cover image (index 0) + gallery images (index 1+)
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
    // Prevent background scrolling when lightbox is open
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [activeIndex, closeLightbox, nextImage, prevImage]);

  return (
    <>
      <article className="overflow-hidden rounded-3xl border border-outline/10 bg-white shadow-sm">
        {/* Cover Photo */}
        <div 
          className="relative h-[24rem] overflow-hidden bg-secondary-container cursor-pointer group"
          onClick={() => openLightbox(0)}
        >
          <img
            src={landmark.image}
            alt={landmark.name}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-750 ease-out group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-on-surface/90 via-on-surface/20 to-transparent group-hover:via-on-surface/30 transition-colors duration-500" />
          
          {/* Zoom hint badge */}
          <div className="absolute right-6 top-6 rounded-full bg-white/20 hover:bg-white/30 border border-white/20 p-2.5 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-lg">zoom_in</span>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-8 text-white pointer-events-none">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] backdrop-blur-xl">
                {story.eyebrow}
              </span>
              <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] backdrop-blur-xl">
                {landmark.category}
              </span>
            </div>
            <h2 className="max-w-3xl text-4xl font-extrabold tracking-tighter">
              {story.intro}
            </h2>
          </div>
        </div>

        <div className="grid gap-8 p-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-8">
            {/* Visual Archive Gallery */}
            {hasGallery && (
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                  Visual Archive
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {uniqueGallery.map((img, idx) => {
                    const imageIndexInAll = 1 + idx;
                    return (
                      <div 
                        key={idx} 
                        onClick={() => openLightbox(imageIndexInAll)}
                        className="aspect-[16/10] relative overflow-hidden rounded-3xl border border-outline/10 group cursor-pointer shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                      >
                        <img 
                          src={img} 
                          alt={`${landmark.name} gallery ${idx + 1}`} 
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform group-hover:scale-[1.03] duration-500"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300 flex items-center justify-center">
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

            {/* Sections */}
            {story.sections.map((section) => (
              <div key={section.title} className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                  {section.title}
                </p>
                <div className="space-y-4">
                  {section.body.split('\n').filter(Boolean).map((paragraph, i) => (
                    <p key={i} className="text-[15px] font-medium leading-8 text-on-surface-variant">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Info */}
          <div className="space-y-4">
            <div className="rounded-3xl bg-secondary-container p-6 border border-secondary">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                Archive Note
              </p>
              <p className="mt-3 text-sm font-medium leading-7 text-on-secondary">
                {story.archiveNote}
              </p>
            </div>

            <div className="rounded-3xl border border-outline/10 bg-background p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-outline">
                Quick Facts
              </p>
              <div className="mt-4 space-y-4">
                {story.facts.map((fact) => (
                  <div
                    key={fact.label}
                    className="border-b border-outline/10 pb-4 last:border-b-0 last:pb-0"
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-outline">
                      {fact.label}
                    </p>
                    <p className="mt-1 text-sm font-bold text-on-surface">
                      {fact.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Lightbox Slider Modal */}
      {activeIndex !== null && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm select-none"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button 
            onClick={closeLightbox}
            className="absolute right-6 top-6 z-[110] flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border border-white/10 text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
            aria-label="Close lightbox"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>

          {/* Prev Button */}
          <button 
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            className="absolute left-6 z-[110] flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border border-white/10 text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
            aria-label="Previous image"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
          </button>

          {/* Next Button */}
          <button 
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            className="absolute right-6 z-[110] flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border border-white/10 text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
            aria-label="Next image"
          >
            <span className="material-symbols-outlined text-2xl">arrow_forward_ios</span>
          </button>

          {/* Image Container with indicator */}
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
            
            {/* Counter */}
            <div className="rounded-full bg-white/10 border border-white/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-white backdrop-blur-md">
              {activeIndex + 1} / {allImages.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

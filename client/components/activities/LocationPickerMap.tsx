'use client';

import dynamic from 'next/dynamic';

const LocationPickerMapInternal = dynamic(() => import('./LocationPickerMapInternal'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-44 bg-surface-container-low animate-pulse rounded-2xl flex items-center justify-center border border-outline/10">
       <span className="text-outline text-[10px] font-black uppercase tracking-widest">Loading Picker Map...</span>
    </div>
  )
});

export const LocationPickerMap = (props: any) => {
  return <LocationPickerMapInternal {...props} />;
};

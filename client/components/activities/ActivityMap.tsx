'use client';

import dynamic from 'next/dynamic';

const ActivityMapInternal = dynamic(() => import('./ActivityMapInternal'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface-container-low animate-pulse rounded-[2.5rem] flex items-center justify-center">
       <span className="text-outline text-xs font-black uppercase tracking-widest">Loading Map Engine...</span>
    </div>
  )
});

export const ActivityMap = (props: any) => {
  return <ActivityMapInternal {...props} />;
};

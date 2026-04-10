'use client';

import React, { useState, useEffect } from 'react';
import {
  getAdminStatsAction,
  getAdminGrowthAction,
  getAdminPopularPlacesAction,
  getAdminViolationsAction,
  getAdminReportSummaryAction,
} from '@/lib/actions';

interface Stats {
  totalUsers: number;
  bannedUsers: number;
  totalPlaces: number;
  totalTrips: number;
  pendingReports: number;
}

interface PopularPlace {
  id: string;
  name: string;
  category: string;
  district: string;
  imageUrl: string | null;
  visits: number;
}

interface UserGrowth {
  date: string;
  count: number;
}

interface ViolationBreakdown {
  type: string;
  count: number;
}

interface ReportSummary {
  pending: number;
  resolved: number;
  dismissed: number;
  total: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [popularPlaces, setPopularPlaces] = useState<PopularPlace[]>([]);
  const [growth, setGrowth] = useState<UserGrowth[]>([]);
  const [violations, setViolations] = useState<ViolationBreakdown[]>([]);
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sData, gData, pData, vData, rData] = await Promise.all([
          getAdminStatsAction(),
          getAdminGrowthAction(),
          getAdminPopularPlacesAction(),
          getAdminViolationsAction(),
          getAdminReportSummaryAction(),
        ]);

        setStats(sData);
        setGrowth(Array.isArray(gData) ? gData : []);
        setPopularPlaces(Array.isArray(pData) ? pData : []);
        setViolations(Array.isArray(vData) ? vData : []);
        setReportSummary(rData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black text-outline uppercase tracking-widest">Loading Command Center...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { id: 'users', label: 'Active Users', value: stats?.totalUsers?.toLocaleString() || '0', icon: 'group', color: 'bg-blue-500' },
    { id: 'places', label: 'Heritage Sites', value: stats?.totalPlaces?.toLocaleString() || '0', icon: 'account_balance', color: 'bg-primary' },
    { id: 'trips', label: 'Total Trips', value: stats?.totalTrips?.toLocaleString() || '0', icon: 'explore', color: 'bg-green-500' },
    { id: 'reports', label: 'Pending Reports', value: stats?.pendingReports?.toLocaleString() || '0', icon: 'report_problem', color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 py-4">
        <div>
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2 block">Enterprise Metrics</span>
          <h1 className="text-5xl font-black tracking-tighter text-on-surface leading-none">Command Center</h1>
        </div>
        <div className="flex gap-4">
          <button className="h-14 px-8 bg-white border border-outline/10 rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest text-outline hover:text-primary hover:border-primary/20 hover:shadow-xl transition-all flex items-center gap-3 active:scale-95 tonal-shift">
            <span className="material-symbols-outlined text-lg">calendar_month</span>
            Real-time Feed
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {statCards.map((stat) => (
          <div key={stat.id} className="bg-white p-10 rounded-[2.5rem] border border-outline/5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-2xl hover:shadow-black/5 hover:scale-[1.01] transition-all duration-500 group cursor-pointer relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className={`w-14 h-14 ${stat.color} rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-current/20 group-hover:rotate-12 transition-transform duration-500`}>
                <span className="material-symbols-outlined text-2xl fill-0">{stat.icon}</span>
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-[11px] font-black text-outline uppercase tracking-[0.2em] mb-2 scale-y-95 opacity-70">{stat.label}</p>
              <h3 className="text-4xl font-black tracking-tighter text-on-surface">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Main Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* User Growth Chart - Bento Large */}
        <div className="lg:col-span-8 bg-white rounded-[3rem] border border-outline/5 p-12 shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative overflow-hidden group">
          <div className="flex items-center justify-between mb-12 relative z-10">
            <div>
              <h3 className="text-2xl font-black tracking-tighter text-on-surface">User Growth</h3>
              <p className="text-[10px] font-black text-outline uppercase tracking-[0.15em] mt-1">New User acquisition (Last 30 Days)</p>
            </div>
          </div>
          
          {/* Dynamic Growth Visualization */}
          <div className="h-64 mt-12 w-full flex items-end justify-between gap-1 relative z-10 px-4">
             {(() => {
               const chartData = growth.slice(-14);
               const maxCount = Math.max(...chartData.map((g) => g.count), 1);
               return chartData.map((g, i) => {
                 const heightPercent = g.count === 0 ? 0 : Math.max((g.count / maxCount) * 85, 8);
                 return (
                   <div key={i} className="flex-1 h-full flex flex-col items-center group/bar w-full relative">
                      <div className="absolute -top-10 bg-on-surface text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                         {g.count} user{g.count !== 1 ? 's' : ''}
                      </div>
                      <div className="w-full h-full flex flex-col justify-end gap-1">
                         <div className="relative w-full h-full flex items-end">
                            <div 
                              style={{ height: `${heightPercent}%` }} 
                              className="w-full bg-primary rounded-t-md group-hover/bar:scale-y-[1.15] origin-bottom transition-all duration-500 shadow-[0_-4px_20px_rgba(255,90,95,0.2)]"
                            />
                         </div>
                      </div>
                      <span className="mt-6 text-[8px] font-black text-outline uppercase opacity-60 rotate-45 origin-left whitespace-nowrap">
                        {new Date(g.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                   </div>
                 );
               });
             })()}
             <div className="absolute inset-0 top-12 flex flex-col justify-between -z-10 opacity-[0.03]">
                {[1,2,3,4,5].map(i => <div key={i} className="w-full h-[1px] bg-on-surface" />)}
             </div>
          </div>
        </div>

        {/* Report Status - Bento Side */}
        <div className="lg:col-span-4 space-y-8">
            <div className="bg-on-background rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl group-hover:w-60 transition-all duration-700" />
               <div className="relative z-10">
                 <h3 className="text-xl font-black tracking-tighter mb-8">Report Resolution</h3>
                 <div className="space-y-6">
                    {reportSummary && reportSummary.total > 0 ? (
                      <>
                        <div className="space-y-2">
                           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-70">
                              <span>Resolved / Total</span>
                              <span>{Math.round((reportSummary.resolved / reportSummary.total) * 100)}%</span>
                           </div>
                           <div className="h-2 bg-white/10 rounded-full overflow-hidden p-0.5">
                              <div 
                                className="h-full bg-primary rounded-full transition-all duration-1000" 
                                style={{ width: `${(reportSummary.resolved / reportSummary.total) * 100}%` }} 
                              />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-70">
                              <span>Pending Investigation</span>
                              <span>{reportSummary.pending} Active</span>
                           </div>
                           <div className="h-2 bg-white/10 rounded-full overflow-hidden p-0.5">
                              <div 
                                className="h-full bg-white rounded-full transition-all duration-1000" 
                                style={{ width: `${(reportSummary.pending / reportSummary.total) * 100}%` }} 
                              />
                           </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">No reports yet</p>
                    )}
                 </div>
                 <button className="w-full mt-10 h-14 bg-white text-on-background rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                    System Audit
                 </button>
               </div>
            </div>

            <div className="bg-secondary p-10 rounded-[3rem] border border-outline/5 relative overflow-hidden group cursor-pointer">
               <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:scale-150 transition-all duration-1000" />
               <h3 className="text-lg font-black tracking-tighter text-on-secondary mb-2">Banned Users</h3>
               <p className="text-4xl font-black text-primary tracking-tighter">{stats?.bannedUsers || 0}</p>
               <p className="text-[9px] font-black text-on-secondary/60 uppercase tracking-widest mt-2">Accounts restricted</p>
            </div>
        </div>

        {/* Popular Places & Violation Types */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">
           
           {/* Popular Places */}
           <div className="bg-white rounded-[3rem] border border-outline/5 p-10 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black tracking-tighter text-on-surface uppercase">Popular Places</h3>
                <span className="material-symbols-outlined text-primary">local_fire_department</span>
              </div>
              <div className="space-y-4">
                 {popularPlaces.length > 0 ? popularPlaces.map((place, i) => (
                   <div key={place.id} className="flex items-center justify-between p-4 rounded-2xl border border-transparent hover:border-outline/5 hover:bg-background transition-all group">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                            {i+1}
                         </div>
                         <div>
                            <p className="text-[13px] font-black text-on-surface uppercase tracking-tight">{place.name}</p>
                            <p className="text-[9px] font-black text-outline uppercase tracking-widest italic">{place.category}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-6 text-right">
                         <div>
                            <p className="text-[11px] font-black text-on-surface">{place.visits.toLocaleString()}</p>
                            <p className="text-[8px] font-black text-outline uppercase">CHECK-INS</p>
                         </div>
                      </div>
                   </div>
                 )) : (
                   <p className="text-center py-10 text-[10px] font-black text-outline uppercase">No trend data available</p>
                 )}
              </div>
           </div>

           {/* Reports by Violation Type */}
           <div className="bg-white rounded-[3rem] border border-outline/5 p-10 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black tracking-tighter text-on-surface uppercase">Violation Breakdown</h3>
                <span className="material-symbols-outlined text-outline">pie_chart</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-12 pt-4">
                 <div className="w-40 h-40 rounded-full border-[16px] border-primary/20 relative flex items-center justify-center">
                    <div className="text-center">
                       <p className="text-2xl font-black text-on-surface leading-none">{reportSummary?.total || 0}</p>
                       <p className="text-[8px] font-black text-outline uppercase tracking-widest mt-1">Total</p>
                    </div>
                 </div>
                 <div className="flex-1 space-y-4 w-full">
                    {violations.length > 0 ? violations.map((v, i) => (
                      <div key={i} className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${['bg-primary', 'bg-secondary', 'bg-on-surface', 'bg-outline'][i % 4]}`} />
                            <span className="text-[10px] font-black text-outline uppercase tracking-widest">{v.type.replace('_', ' ')}</span>
                         </div>
                         <span className="text-[11px] font-black text-on-surface">{v.count}</span>
                      </div>
                    )) : (
                      <p className="text-[10px] font-black text-outline uppercase">No violations recorded</p>
                    )}
                 </div>
              </div>
           </div>

        </div>

      </div>
    </div>
  );
}

import React from 'react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { 
  CheckSquare, Send, Award, Clock
} from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#38bdf8', '#ef4444', '#a855f7'];

export default function StatsBar({ stats }) {
  if (!stats) return null;

  // Format data for PieChart
  const sourceData = Object.entries(stats.applications_by_source || {}).map(([key, val]) => ({
    name: key.toUpperCase(),
    value: val
  }));

  const total = stats.total_applied || 0;

  return (
    <div className="space-y-6">
      
      {/* 1. Numerical telemetries widgets */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        
        {/* Applied */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/35 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Applied</span>
            <div className="text-indigo-400"><Send className="h-4 w-4" /></div>
          </div>
          <p className="text-3xl font-extrabold text-slate-100">{total}</p>
        </div>

        {/* Shortlisted */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/35 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Shortlisted</span>
            <div className="text-amber-400"><Clock className="h-4 w-4" /></div>
          </div>
          <p className="text-3xl font-extrabold text-slate-100">{stats.shortlisted || 0}</p>
        </div>

        {/* Offers */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/35 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Offers</span>
            <div className="text-emerald-400"><Award className="h-4 w-4" /></div>
          </div>
          <p className="text-3xl font-extrabold text-slate-100">{stats.offers || 0}</p>
        </div>

        {/* Response rate */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/35 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Response Rate</span>
            <div className="text-sky-400"><CheckSquare className="h-4 w-4" /></div>
          </div>
          <p className="text-3xl font-extrabold text-slate-100">{stats.response_rate || 0}%</p>
        </div>

      </div>

      {/* 2. Visual Graphs board */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Left Side: Weekly Trend (Line Chart) */}
        <div className="md:col-span-2 rounded-xl border border-slate-800 bg-slate-900/35 p-5 backdrop-blur-md flex flex-col justify-between min-h-[280px]">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Weekly Application Rate</h3>
            <p className="text-[10px] text-slate-500">Trend of submissions over the past 4 weeks</p>
          </div>
          
          <div className="h-48 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.weekly_trend || []}>
                <XAxis dataKey="week" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#6366f1', fontSize: '12px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="applied_count" 
                  stroke="#6366f1" 
                  strokeWidth={2.5} 
                  dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Side: Group by Source (Pie Chart) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/35 p-5 backdrop-blur-md flex flex-col justify-between min-h-[280px]">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Discovered Sources</h3>
            <p className="text-[10px] text-slate-500">Distribution of application pathways</p>
          </div>
          
          {sourceData.length > 0 ? (
            <div className="flex flex-1 flex-col gap-3">
              <div className="h-44 w-full sm:h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#f1f5f9', fontSize: '11px' }}
                    />
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 px-1">
                {sourceData.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[9px] font-bold tracking-tight text-slate-400">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    {entry.name}: {entry.value}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center h-48 text-xs text-slate-600">
              No source data tracked yet.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

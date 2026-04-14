import React, { useEffect, useState } from 'react';
import { getStats } from '../services/apiService';
import { GlassCard } from './GlassCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Users, Activity, AlertTriangle, Database, TrendingUp, Clock } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAssessments: 0,
    ckdDetected: 0,
    healthy: 0
  });

  const [recentAssessments, setRecentAssessments] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getStats();
        setStats({
          totalUsers: data.totalUsers,
          totalAssessments: data.totalAssessments,
          ckdDetected: data.ckdDetected,
          healthy: data.healthy
        });
        setRecentAssessments(data.recentAssessments);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Poll every 10s

    return () => {
      clearInterval(interval);
    };
  }, []);

  const chartData = [
    { name: 'Mon', assessments: 4 },
    { name: 'Tue', assessments: 7 },
    { name: 'Wed', assessments: 5 },
    { name: 'Thu', assessments: 12 },
    { name: 'Fri', assessments: 9 },
    { name: 'Sat', assessments: 15 },
    { name: 'Sun', assessments: 10 },
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white">System Analytics</h2>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/40">
          <Clock size={14} /> Live Updates Active
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400' },
          { label: 'Assessments', value: stats.totalAssessments, icon: Database, color: 'text-purple-400' },
          { label: 'CKD Detected', value: stats.ckdDetected, icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Healthy', value: stats.healthy, icon: Activity, color: 'text-emerald-400' },
        ].map((stat, i) => (
          <GlassCard key={i} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-widest mb-1">{stat.label}</p>
                <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl bg-white/5 border border-white/10 ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trend Chart */}
        <GlassCard className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-lg font-semibold text-white">Assessment Volume</h4>
            <TrendingUp className="text-blue-400" size={20} />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAssess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="assessments" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAssess)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Distribution Chart */}
        <GlassCard className="p-8">
          <h4 className="text-lg font-semibold text-white mb-8">Diagnostic Distribution</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Healthy', count: stats.healthy },
                { name: 'CKD', count: stats.ckdDetected }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} barSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Recent Activity Table */}
      <GlassCard className="p-8">
        <h4 className="text-lg font-semibold text-white mb-6">Recent Clinical Assessments</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-4 text-xs text-white/40 uppercase tracking-widest font-medium">Patient ID</th>
                <th className="pb-4 text-xs text-white/40 uppercase tracking-widest font-medium">Date</th>
                <th className="pb-4 text-xs text-white/40 uppercase tracking-widest font-medium">Diagnosis</th>
                <th className="pb-4 text-xs text-white/40 uppercase tracking-widest font-medium">Risk Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentAssessments.length > 0 ? recentAssessments.map((a, i) => (
                <tr key={i} className="group hover:bg-white/5 transition-colors">
                  <td className="py-4 text-sm text-white/80 font-mono">
                    {a.userId && typeof a.userId === 'string' ? (a.userId.length > 8 ? `${a.userId.slice(0, 8)}...` : a.userId) : "N/A"}
                  </td>
                  <td className="py-4 text-sm text-white/60">{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td className="py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${a.result.diagnosis === 'CKD Detected' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {a.result.diagnosis}
                    </span>
                  </td>
                  <td className="py-4 text-sm text-white/80 font-bold">{Math.round(a.result.probability * 100)}%</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-white/20 italic">No assessment data available yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  PieChart, Pie, Cell, ResponsiveContainer 
} from 'recharts';

// Use the production API URL
const API_URL = 'https://video-creator-api-kjzy.onrender.com';

// Admin password
const ADMIN_PASSWORD = 'Work@2026';

function AdminDashboard() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Dashboard data states
  const [dashboardData, setDashboardData] = useState({
    credits: {
      replicate: 0,
      byteplus: 0,
      total: 0
    },
    revenue: {
      total: 0,
      textToVideo: 0,
      photoToVideo: 0,
      translation: 0
    },
    usage: {
      totalVideos: 0,
      textToVideo: 0,
      photoToVideo: 0,
      translation: 0
    },
    visits: {
      total: 0,
      today: 0,
      week: 0,
      month: 0
    },
    recentActivity: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Handle login
  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setLoginError('');
      fetchDashboardData();
    } else {
      setLoginError('Invalid password. Please try again.');
    }
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      console.log('📊 Fetching dashboard data from:', `${API_URL}/api/admin/dashboard`);
      
      const response = await fetch(`${API_URL}/api/admin/dashboard`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 Dashboard data received:', data);
      setDashboardData(data);
      setLastUpdated(new Date().toLocaleString());
      setError(null);
    } catch (err) {
      setError('Failed to fetch dashboard data: ' + err.message);
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format USD
  const formatUSD = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Colors for charts
  const COLORS = ['#EC4899', '#8B5CF6', '#F59E0B'];

  // If not authenticated, show login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">🔐 Admin Dashboard</h1>
            <p className="text-gray-400 mt-2">Enter your password to continue</p>
          </div>
          
          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
                autoFocus
              />
            </div>
            
            {loginError && (
              <p className="text-red-400 text-sm mb-4">{loginError}</p>
            )}
            
            <button
              type="submit"
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl transition-all transform hover:scale-105"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard content
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 text-white px-4 py-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">📊 Admin Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Monitor your AI Video Creator business</p>
            {lastUpdated && (
              <p className="text-xs text-gray-500 mt-1">Last updated: {lastUpdated}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchDashboardData}
              className="bg-blue-500/20 hover:bg-blue-500/30 px-4 py-2 rounded-lg text-sm transition-all"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition-all"
            >
              ← Back to Site
            </button>
            <button
              onClick={() => {
                setIsAuthenticated(false);
                setPassword('');
              }}
              className="bg-red-500/20 hover:bg-red-500/30 px-4 py-2 rounded-lg text-sm transition-all"
            >
              Logout
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-6xl mb-4">⏳</div>
              <p className="text-gray-400">Loading dashboard data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500 rounded-2xl p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-4 bg-pink-500 hover:bg-pink-600 px-6 py-2 rounded-lg text-sm font-bold transition-all"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Revenue */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Revenue</p>
                    <p className="text-3xl font-bold text-green-400">{formatCurrency(dashboardData.revenue.total)}</p>
                  </div>
                  <div className="text-4xl">💰</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">↑ 12% from last month</p>
              </div>

              {/* Total Videos */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Videos</p>
                    <p className="text-3xl font-bold text-purple-400">{dashboardData.usage.totalVideos}</p>
                  </div>
                  <div className="text-4xl">🎬</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">↑ 8% from last month</p>
              </div>

              {/* API Credits */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">API Credits</p>
                    <p className="text-3xl font-bold text-yellow-400">{formatUSD(dashboardData.credits.total)}</p>
                  </div>
                  <div className="text-4xl">🔑</div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Replicate: {formatUSD(dashboardData.credits.replicate)}</span>
                  <span>BytePlus: {formatUSD(dashboardData.credits.byteplus)}</span>
                </div>
              </div>

              {/* Site Visits */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Site Visits</p>
                    <p className="text-3xl font-bold text-blue-400">{dashboardData.visits.total}</p>
                  </div>
                  <div className="text-4xl">👀</div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Today: {dashboardData.visits.today}</span>
                  <span>This Week: {dashboardData.visits.week}</span>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Revenue by Service */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">💰 Revenue by Service</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[
                    { name: 'Text-to-Video', amount: dashboardData.revenue.textToVideo },
                    { name: 'Photo-to-Video', amount: dashboardData.revenue.photoToVideo },
                    { name: 'Translation', amount: dashboardData.revenue.translation }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="name" stroke="#ffffff60" fontSize={12} />
                    <YAxis stroke="#ffffff60" fontSize={12} />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #ffffff20' }}
                    />
                    <Bar dataKey="amount" fill="#EC4899" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Usage by Service */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">📊 Videos by Service</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Text-to-Video', value: dashboardData.usage.textToVideo },
                        { name: 'Photo-to-Video', value: dashboardData.usage.photoToVideo },
                        { name: 'Translation', value: dashboardData.usage.translation }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => `${value} videos`}
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #ffffff20' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-6">
              <h3 className="text-lg font-semibold mb-4">🕐 Recent Activity</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-white/10">
                      <th className="text-left py-3 px-4">User</th>
                      <th className="text-left py-3 px-4">Action</th>
                      <th className="text-left py-3 px-4">Amount</th>
                      <th className="text-left py-3 px-4">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recentActivity.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-4 text-gray-400">No recent activity</td>
                      </tr>
                    ) : (
                      dashboardData.recentActivity.map((activity) => (
                        <tr key={activity.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                          <td className="py-3 px-4">{activity.user}</td>
                          <td className="py-3 px-4">{activity.action}</td>
                          <td className="py-3 px-4 text-green-400">{formatCurrency(activity.amount)}</td>
                          <td className="py-3 px-4 text-gray-400">{activity.time}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* API Credits Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">🔑 API Credits</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-300">Replicate AI</span>
                    <span className="font-bold text-yellow-400">{formatUSD(dashboardData.credits.replicate)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-300">BytePlus</span>
                    <span className="font-bold text-yellow-400">{formatUSD(dashboardData.credits.byteplus)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg border border-white/10">
                    <span className="text-gray-300 font-semibold">Total Credits</span>
                    <span className="font-bold text-green-400">{formatUSD(dashboardData.credits.total)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">📈 Quick Stats</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/5 rounded-lg text-center">
                    <p className="text-2xl font-bold text-pink-400">{dashboardData.usage.totalVideos}</p>
                    <p className="text-xs text-gray-400">Total Videos</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-400">{dashboardData.revenue.total}</p>
                    <p className="text-xs text-gray-400">Total Revenue (KES)</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-400">{dashboardData.visits.today}</p>
                    <p className="text-xs text-gray-400">Visits Today</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-400">{dashboardData.usage.translation}</p>
                    <p className="text-xs text-gray-400">Translations</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
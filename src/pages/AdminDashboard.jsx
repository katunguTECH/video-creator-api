import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  AreaChart, Area, Legend
} from 'recharts';

// Use the production API URL
const API_URL = 'https://video-creator-api-kjzy.onrender.com';

// Admin password
const ADMIN_PASSWORD = 'Work@2026';

// Small helper: wait N ms
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
      translation: 0,
      musicCaptions: 0
    },
    usage: {
      totalVideos: 0,
      textToVideo: 0,
      photoToVideo: 0,
      translation: 0,
      musicCaptions: 0
    },
    visits: {
      total: 0,
      today: 0,
      week: 0,
      month: 0,
      daily: [],
      weekly: [],
      monthly: []
    },
    recentActivity: [],
    users: [],
    serviceStats: {
      textToVideo: { count: 0, revenue: 0 },
      photoToVideo: { count: 0, revenue: 0 },
      translation: { count: 0, revenue: 0 },
      musicCaptions: { count: 0, revenue: 0 }
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [waking, setWaking] = useState(false);

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

  // Fetch dashboard data, with retries to survive Render free-tier cold starts.
  const fetchDashboardData = async (retries = 4) => {
    setLoading(true);
    setError(null);

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        if (attempt > 0) setWaking(true);

        console.log(
          `📊 Fetching dashboard data (attempt ${attempt + 1}/${retries}):`,
          `${API_URL}/api/admin/dashboard`
        );

        const response = await fetch(`${API_URL}/api/admin/dashboard`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📊 Dashboard data received:', data);
        setDashboardData(data);
        setLastUpdated(new Date().toLocaleString());
        setError(null);
        setWaking(false);
        setLoading(false);
        return;
      } catch (err) {
        console.error(`Dashboard error (attempt ${attempt + 1}):`, err);

        if (attempt === retries - 1) {
          setError(
            'Failed to fetch dashboard data: ' +
              err.message +
              '. The API server may be slow to wake up on the free tier — click Retry in a few seconds.'
          );
          setWaking(false);
        } else {
          // Wait before retrying: 3s, then 8s, then 15s
          const delays = [3000, 8000, 15000];
          await wait(delays[attempt] || 8000);
        }
      }
    }

    setLoading(false);
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => fetchDashboardData(2), 30000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const COLORS = ['#EC4899', '#8B5CF6', '#F59E0B', '#10B981'];

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
        <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">📊 Admin Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Monitor your AI Video Creator business</p>
            {lastUpdated && (
              <p className="text-xs text-gray-500 mt-1">Last updated: {lastUpdated}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => fetchDashboardData()}
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
              <p className="text-gray-400">
                {waking
                  ? 'Server is waking up (free tier can take up to a minute)...'
                  : 'Loading dashboard data...'}
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500 rounded-2xl p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => fetchDashboardData()}
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
                    <p className="text-gray-400 text-sm">Total Revenue (All Time)</p>
                    <p className="text-3xl font-bold text-green-400">{formatCurrency(dashboardData.revenue.total)}</p>
                  </div>
                  <div className="text-4xl">💰</div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Text: {formatCurrency(dashboardData.revenue.textToVideo)}</span>
                  <span>Photo: {formatCurrency(dashboardData.revenue.photoToVideo)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Translation: {formatCurrency(dashboardData.revenue.translation)}</span>
                  <span>Music: {formatCurrency(dashboardData.revenue.musicCaptions || 0)}</span>
                </div>
              </div>

              {/* Total Videos */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Videos (All Time)</p>
                    <p className="text-3xl font-bold text-purple-400">{dashboardData.usage.totalVideos}</p>
                  </div>
                  <div className="text-4xl">🎬</div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Text: {dashboardData.usage.textToVideo}</span>
                  <span>Photo: {dashboardData.usage.photoToVideo}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Translation: {dashboardData.usage.translation}</span>
                  <span>Music: {dashboardData.usage.musicCaptions || 0}</span>
                </div>
              </div>

              {/* API Credits */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">API Credits (Real-time)</p>
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
                    <p className="text-gray-400 text-sm">Site Visits (All Time)</p>
                    <p className="text-3xl font-bold text-blue-400">{dashboardData.visits.total}</p>
                  </div>
                  <div className="text-4xl">👀</div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Today: {dashboardData.visits.today}</span>
                  <span>Week: {dashboardData.visits.week}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Month: {dashboardData.visits.month}</span>
                </div>
              </div>
            </div>

            {/* Daily, Weekly, Monthly Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Daily Visits */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">📅 Daily Visits (Last 7 Days)</h3>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={dashboardData.visits.daily || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="date" stroke="#ffffff60" fontSize={10} />
                    <YAxis stroke="#ffffff60" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #ffffff20' }}
                    />
                    <Area type="monotone" dataKey="visits" stroke="#8B5CF6" fill="#8B5CF680" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Weekly Visits */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">📊 Weekly Visits (Last 4 Weeks)</h3>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={dashboardData.visits.weekly || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="week" stroke="#ffffff60" fontSize={10} />
                    <YAxis stroke="#ffffff60" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #ffffff20' }}
                    />
                    <Bar dataKey="visits" fill="#EC4899" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Monthly Visits */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">📈 Monthly Visits (Last 6 Months)</h3>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={dashboardData.visits.monthly || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="month" stroke="#ffffff60" fontSize={10} />
                    <YAxis stroke="#ffffff60" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #ffffff20' }}
                    />
                    <Line type="monotone" dataKey="visits" stroke="#10B981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue by Service Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">💰 Revenue by Service</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[
                    { name: 'Text-to-Video', amount: dashboardData.revenue.textToVideo },
                    { name: 'Photo-to-Video', amount: dashboardData.revenue.photoToVideo },
                    { name: 'Translation', amount: dashboardData.revenue.translation },
                    { name: 'Music & Captions', amount: dashboardData.revenue.musicCaptions || 0 }
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

              {/* Videos by Service */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">📊 Videos by Service</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Text-to-Video', value: dashboardData.usage.textToVideo },
                        { name: 'Photo-to-Video', value: dashboardData.usage.photoToVideo },
                        { name: 'Translation', value: dashboardData.usage.translation },
                        { name: 'Music & Captions', value: dashboardData.usage.musicCaptions || 0 }
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

            {/* Users Section */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-6">
              <h3 className="text-lg font-semibold mb-4">👥 Registered Users ({dashboardData.users?.length || 0})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-white/10">
                      <th className="text-left py-3 px-4">#</th>
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-left py-3 px-4">Total Spent</th>
                      <th className="text-left py-3 px-4">Videos Created</th>
                      <th className="text-left py-3 px-4">Joined</th>
                      <th className="text-left py-3 px-4">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.users?.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-gray-400">No users registered yet</td>
                      </tr>
                    ) : (
                      dashboardData.users?.map((user, index) => (
                        <tr key={user.id || index} className="border-b border-white/5 hover:bg-white/5 transition-all">
                          <td className="py-3 px-4">{index + 1}</td>
                          <td className="py-3 px-4">{user.email || 'Anonymous'}</td>
                          <td className="py-3 px-4 text-green-400">{formatCurrency(user.totalSpent || 0)}</td>
                          <td className="py-3 px-4 text-purple-400">{user.videoCount || 0}</td>
                          <td className="py-3 px-4 text-gray-400">{user.joined || 'N/A'}</td>
                          <td className="py-3 px-4 text-gray-400">{user.lastActivity || 'N/A'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Service Activity Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">📈 Service Activity</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <div>
                      <span className="text-gray-300">✍️ Text-to-Video</span>
                      <span className="text-xs text-gray-500 ml-2">{dashboardData.serviceStats?.textToVideo?.count || 0} videos</span>
                    </div>
                    <span className="font-bold text-green-400">{formatCurrency(dashboardData.serviceStats?.textToVideo?.revenue || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <div>
                      <span className="text-gray-300">🖼️ Photo-to-Video</span>
                      <span className="text-xs text-gray-500 ml-2">{dashboardData.serviceStats?.photoToVideo?.count || 0} videos</span>
                    </div>
                    <span className="font-bold text-green-400">{formatCurrency(dashboardData.serviceStats?.photoToVideo?.revenue || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <div>
                      <span className="text-gray-300">🌐 Translation</span>
                      <span className="text-xs text-gray-500 ml-2">{dashboardData.serviceStats?.translation?.count || 0} videos</span>
                    </div>
                    <span className="font-bold text-green-400">{formatCurrency(dashboardData.serviceStats?.translation?.revenue || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <div>
                      <span className="text-gray-300">🎵 Music & Captions</span>
                      <span className="text-xs text-gray-500 ml-2">{dashboardData.serviceStats?.musicCaptions?.count || 0} videos</span>
                    </div>
                    <span className="font-bold text-green-400">{formatCurrency(dashboardData.serviceStats?.musicCaptions?.revenue || 0)}</span>
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

            {/* Recent Activity */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-4">🕐 Recent Activity (All Services)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-white/10">
                      <th className="text-left py-3 px-4">User</th>
                      <th className="text-left py-3 px-4">Action</th>
                      <th className="text-left py-3 px-4">Service</th>
                      <th className="text-left py-3 px-4">Amount</th>
                      <th className="text-left py-3 px-4">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recentActivity?.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-gray-400">No recent activity</td>
                      </tr>
                    ) : (
                      dashboardData.recentActivity?.map((activity) => (
                        <tr key={activity.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                          <td className="py-3 px-4">{activity.user}</td>
                          <td className="py-3 px-4">{activity.action}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              activity.service === 'text-to-video' ? 'bg-blue-500/30 text-blue-300' :
                              activity.service === 'photo-to-video' ? 'bg-purple-500/30 text-purple-300' :
                              activity.service === 'translation' ? 'bg-green-500/30 text-green-300' :
                              activity.service === 'music-captions' ? 'bg-pink-500/30 text-pink-300' :
                              'bg-gray-500/30 text-gray-300'
                            }`}>
                              {activity.service || 'General'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-green-400">{formatCurrency(activity.amount || 0)}</td>
                          <td className="py-3 px-4 text-gray-400">{activity.time}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
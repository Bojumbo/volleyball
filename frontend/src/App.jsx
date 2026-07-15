import React, { useState, useEffect } from 'react';
import { Calendar, User, Settings, ShieldAlert, Award, ChevronDown, ChevronUp } from 'lucide-react';
import CalendarView from './components/CalendarView';
import UserProfile from './components/UserProfile';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [sessions, setSessions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userStats, setUserStats] = useState({ attended: 0, missed: 0, upcoming: [], pendingFeedback: [] });
  const [adminData, setAdminData] = useState({ users: [], feedbackLogs: [] });
  const [isTelegramEnv, setIsTelegramEnv] = useState(false);
  const [showSimulator, setShowSimulator] = useState(true);
  const [newUserName, setNewUserName] = useState('');
  const [loading, setLoading] = useState(true);

  // Default simulated users
  const simulatedUsers = [
    { telegram_id: 'user_test_1', username: 'alex_vb', first_name: 'Олександр', last_name: 'Шевченко' },
    { telegram_id: 'user_test_2', username: 'maria_spike', first_name: 'Марія', last_name: 'Ковальчук' },
    { telegram_id: 'user_test_3', username: 'dima_block', first_name: 'Дмитро', last_name: 'Бойко' },
    { telegram_id: 'admin_test', username: 'admin_volleyball', first_name: 'Адмін', last_name: 'Спорту' }
  ];

  useEffect(() => {
    // 1. Detect Telegram WebApp
    const tg = window.Telegram?.WebApp;
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
      setIsTelegramEnv(true);
      setShowSimulator(false);
      tg.ready();
      tg.expand();
      
      const tgUser = tg.initDataUnsafe.user;
      authenticateUser({
        telegram_id: tgUser.id.toString(),
        username: tgUser.username || '',
        first_name: tgUser.first_name || '',
        last_name: tgUser.last_name || ''
      });
    } else {
      // Browser development mode, load the first simulated user by default
      setIsTelegramEnv(false);
      authenticateUser(simulatedUsers[0]);
    }
  }, []);

  // Fetch all sessions and user stats when user changes
  useEffect(() => {
    if (currentUser) {
      fetchSessions();
      fetchUserStats(currentUser.id);
      if (currentUser.role === 'admin') {
        fetchAdminData();
      }
    }
  }, [currentUser]);

  const authenticateUser = async (userData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (!response.ok) throw new Error('Помилка авторизації');
      const user = await response.json();
      setCurrentUser(user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      if (!response.ok) throw new Error('Не вдалося завантажити сесії');
      const data = await response.json();
      setSessions(data);
      return data;
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUserStats = async (userId) => {
    try {
      const response = await fetch(`/api/user/stats/${userId}`);
      if (!response.ok) throw new Error('Не вдалося завантажити статистику');
      const data = await response.json();
      setUserStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard');
      if (!response.ok) throw new Error('Не вдалося завантажити дані адмінки');
      const data = await response.json();
      setAdminData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async (date, gameType, location, duration) => {
    if (!currentUser) return;
    const response = await fetch('/api/sessions/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        date,
        gameType,
        location,
        duration
      })
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Помилка при реєстрації');
    }
    await refreshAllData();
  };

  const handleUnregister = async (date) => {
    if (!currentUser) return;
    const response = await fetch('/api/sessions/unregister', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        date
      })
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Помилка при скасуванні запису');
    }
    await refreshAllData();
  };

  const handleUpdateCapacity = async (date, maxCapacity) => {
    const response = await fetch('/api/admin/sessions/capacity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, maxCapacity })
    });
    if (!response.ok) throw new Error('Не вдалося змінити ліміт');
    await refreshAllData();
  };

  const handleUpdateAttendance = async (registrationId, attended) => {
    const response = await fetch('/api/admin/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId, attended })
    });
    if (!response.ok) throw new Error('Не вдалося відмітити присутність');
    await refreshAllData();
  };

  const handleUpdateRole = async (userId, role) => {
    const response = await fetch('/api/admin/users/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role })
    });
    if (!response.ok) throw new Error('Не вдалося оновити роль');
    await refreshAllData();
  };

  const handleTriggerSurvey = async (date) => {
    const response = await fetch('/api/admin/sessions/trigger-survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date })
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Помилка відправки опитування');
    }
    return await response.json();
  };

  const handleSubmitFeedback = async (registrationId, rating, feedback) => {
    const response = await fetch('/api/feedback/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId, rating, feedback })
    });
    if (!response.ok) throw new Error('Не вдалося відправити відгук');
    await refreshAllData();
  };

  const refreshAllData = async () => {
    const freshSessions = await fetchSessions();
    if (currentUser) {
      await fetchUserStats(currentUser.id);
      if (currentUser.role === 'admin') {
        await fetchAdminData();
      }
    }
    return freshSessions;
  };

  const handleSimulatorSelectUser = (user) => {
    authenticateUser(user);
    // If switching away from admin, switch tab to calendar
    if (user.telegram_id !== 'admin_test' && activeTab === 'admin') {
      setActiveTab('calendar');
    }
  };

  const handleCreateMockUser = (e) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    
    // Create random id and username
    const mockId = 'mock_user_' + Math.floor(Math.random() * 100000);
    const mockUsername = newUserName.trim().toLowerCase().replace(/\s+/g, '_') + '_vb';
    
    const newUser = {
      telegram_id: mockId,
      username: mockUsername,
      first_name: newUserName.trim(),
      last_name: 'Гість'
    };
    
    handleSimulatorSelectUser(newUser);
    setNewUserName('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: '80px' }}>
      
      {/* SIMULATOR BAR (only outside Telegram environment) */}
      {!isTelegramEnv && (
        <div className="simulator-bar">
          <div className="simulator-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={16} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Режим симуляції:
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {simulatedUsers.map((u) => {
                  const isSelected = currentUser?.telegram_id === u.telegram_id;
                  return (
                    <button
                      key={u.telegram_id}
                      onClick={() => handleSimulatorSelectUser(u)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        background: isSelected ? (u.telegram_id === 'admin_test' ? 'var(--accent-pink)' : 'var(--accent-cyan)') : 'rgba(255,255,255,0.05)',
                        color: isSelected ? '#000' : 'var(--text-secondary)',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '4px'
                      }}
                    >
                      {u.first_name} {u.telegram_id === 'admin_test' ? '⚙️' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom User Simulator */}
            <form onSubmit={handleCreateMockUser} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Ім'я нового гравця..."
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '0.75rem', width: '130px', height: '26px' }}
              />
              <button
                type="submit"
                style={{ background: 'var(--accent-lime)', color: '#000', padding: '4px 8px', fontSize: '0.75rem', height: '26px', display: 'flex', alignItems: 'center' }}
              >
                + Створити
              </button>
            </form>
          </div>
        </div>
      )}

      {/* WEB APP HEADER */}
      <header style={{ padding: '20px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', background: 'linear-gradient(135deg, #00f0ff 0%, #ccff00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
          Volleyball Club 🏐
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Запис на групові тренування та змагання
        </p>
      </header>

      {/* CORE CONTENT SWITCHER */}
      <main style={{ flex: 1, padding: '0 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', flexDirection: 'column', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(0, 240, 255, 0.1)', borderTop: '3px solid var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Завантаження даних...</span>
            <style>{`
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
          </div>
        ) : (
          <>
            {activeTab === 'calendar' && (
              <CalendarView
                sessions={sessions}
                currentUser={currentUser}
                onRegister={handleRegister}
                onUnregister={handleUnregister}
                refreshData={refreshAllData}
              />
            )}
            {activeTab === 'profile' && (
              <UserProfile
                stats={userStats}
                currentUser={currentUser}
                onSubmitFeedback={handleSubmitFeedback}
                refreshData={refreshAllData}
              />
            )}
            {activeTab === 'admin' && currentUser?.role === 'admin' && (
              <AdminPanel
                sessions={sessions}
                adminData={adminData}
                onUpdateCapacity={handleUpdateCapacity}
                onUpdateAttendance={handleUpdateAttendance}
                onUpdateRole={handleUpdateRole}
                onTriggerSurvey={handleTriggerSurvey}
                refreshData={refreshAllData}
              />
            )}
          </>
        )}
      </main>

      {/* BOTTOM TAB NAVIGATION */}
      <nav className="glass" style={{
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        right: '16px',
        maxWidth: '500px',
        margin: '0 auto',
        height: '60px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0 8px',
        zIndex: 999,
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {/* Calendar Tab */}
        <button
          onClick={() => setActiveTab('calendar')}
          style={{
            background: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: activeTab === 'calendar' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontSize: '0.75rem',
            padding: '8px'
          }}
        >
          <Calendar size={20} style={{ color: activeTab === 'calendar' ? 'var(--accent-cyan)' : 'var(--text-secondary)' }} />
          <span>Календар</span>
        </button>

        {/* Profile Tab */}
        <button
          onClick={() => setActiveTab('profile')}
          style={{
            background: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: activeTab === 'profile' ? 'var(--accent-lime)' : 'var(--text-secondary)',
            fontSize: '0.75rem',
            padding: '8px'
          }}
        >
          <User size={20} style={{ color: activeTab === 'profile' ? 'var(--accent-lime)' : 'var(--text-secondary)' }} />
          <span>Мій Профіль</span>
        </button>

        {/* Admin Tab (Only if admin role) */}
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('admin')}
            style={{
              background: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              color: activeTab === 'admin' ? 'var(--accent-pink)' : 'var(--text-secondary)',
              fontSize: '0.75rem',
              padding: '8px'
            }}
          >
            <Settings size={20} style={{ color: activeTab === 'admin' ? 'var(--accent-pink)' : 'var(--text-secondary)' }} />
            <span>Адмінка</span>
          </button>
        )}
      </nav>

    </div>
  );
}

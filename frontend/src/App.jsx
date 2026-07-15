import React, { useState, useEffect } from 'react';
import { Calendar, User, Settings } from 'lucide-react';
import CalendarView from './components/CalendarView';
import UserProfile from './components/UserProfile';
import AdminPanel from './components/AdminPanel';

// Dynamic Telegram Login Widget Injector Component
function TelegramLoginButton({ botUsername, onAuth }) {
  useEffect(() => {
    if (!botUsername) return;
    
    // Set global callback handler
    window.onTelegramAuth = onAuth;

    // Create script tag for Widget
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    const container = document.getElementById('telegram-login-container');
    if (container) {
      container.innerHTML = '';
      container.appendChild(script);
    }

    return () => {
      if (container) container.innerHTML = '';
      delete window.onTelegramAuth;
    };
  }, [botUsername, onAuth]);

  return <div id="telegram-login-container" style={{ display: 'flex', justifyContent: 'center', minHeight: '40px' }} />;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [sessions, setSessions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userStats, setUserStats] = useState({ attended: 0, missed: 0, upcoming: [], pendingFeedback: [] });
  const [adminData, setAdminData] = useState({ users: [], feedbackLogs: [] });
  const [isTelegramEnv, setIsTelegramEnv] = useState(false);
  const [botUsername, setBotUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [newUserName, setNewUserName] = useState('');

  // Default simulated users for localhost testing
  const simulatedUsers = [
    { telegram_id: 'user_test_1', username: 'alex_vb', first_name: 'Олександр', last_name: 'Шевченко' },
    { telegram_id: 'user_test_2', username: 'maria_spike', first_name: 'Марія', last_name: 'Ковальчук' },
    { telegram_id: 'user_test_3', username: 'dima_block', first_name: 'Дмитро', last_name: 'Бойко' },
    { telegram_id: 'admin_test', username: 'admin_volleyball', first_name: 'Адмін', last_name: 'Спорту' }
  ];

  useEffect(() => {
    // 1. Fetch bot info (for login widget)
    fetch('/api/bot/info')
      .then(res => res.json())
      .then(data => {
        if (data.username) setBotUsername(data.username);
      })
      .catch(err => console.warn('Не вдалося завантажити інформацію про бота:', err));

    // 2. Detect Telegram WebApp env
    const tg = window.Telegram?.WebApp;
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
      setIsTelegramEnv(true);
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
      setIsTelegramEnv(false);
      
      // Look for saved session in browser
      const savedUser = localStorage.getItem('vb_current_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          authenticateUser(parsed);
        } catch (e) {
          localStorage.removeItem('vb_current_user');
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
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
      return user;
    } catch (err) {
      console.error(err);
      return null;
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

  const handleDeleteUser = async (userId) => {
    const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Не вдалося видалити користувача');
    await refreshAllData();
  };

  const handleDeleteRegistration = async (registrationId) => {
    const response = await fetch(`/api/admin/registrations/${registrationId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Не вдалося видалити запис');
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

  const handleLogout = () => {
    localStorage.removeItem('vb_current_user');
    setCurrentUser(null);
    setActiveTab('calendar');
  };

  // ── Browser Login Screen ──────────────────────────────────────────────────
  // Show when: not inside Telegram WebApp, not loading, and no user yet
  if (!isTelegramEnv && !loading && !currentUser) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px 20px', maxWidth: '480px', margin: '0 auto', width: '100%' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, background: 'linear-gradient(135deg, #00f0ff 0%, #ccff00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Volleyball Club 🏐
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
            Система запису на групові тренування та змагання
          </p>
        </div>

        {/* Login card */}
        <div className="glass" style={{ padding: '36px 28px', border: '1px solid var(--border-active)', borderRadius: '20px', textAlign: 'center' }}>
          {/* Telegram icon */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(0,240,255,0.15), rgba(0,240,255,0.05))',
            border: '1.5px solid var(--accent-cyan)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px auto',
            boxShadow: 'var(--shadow-neon)'
          }}>
            <svg viewBox="0 0 24 24" width="36" height="36" fill="var(--accent-cyan)">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.68 7.86c-.12.56-.48.7-.96.44l-2.72-2-1.3 1.26c-.14.14-.28.2-.58.2l.2-2.8 5.14-4.64c.22-.2-.06-.3-.34-.1l-6.36 4-2.72-.86c-.6-.18-.6-.6.12-.88l10.62-4.1c.5-.18.94.12.78.82z"/>
            </svg>
          </div>

          <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '8px', fontWeight: 700 }}>
            Вхід через Telegram
          </h3>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '28px', lineHeight: 1.5 }}>
            Авторизуйтесь за допомогою офіційного сервісу Telegram, щоб увійти у ваш профіль гравця.
          </p>

          {/* Telegram Login Widget */}
          {botUsername ? (
            <TelegramLoginButton
              botUsername={botUsername}
              onAuth={(user) => {
                const userData = {
                  telegram_id: user.id.toString(),
                  username: user.username || '',
                  first_name: user.first_name || '',
                  last_name: user.last_name || ''
                };
                authenticateUser(userData).then(authenticated => {
                  if (authenticated) {
                    localStorage.setItem('vb_current_user', JSON.stringify(userData));
                  }
                });
              }}
            />
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '12px' }}>
              ⏳ Завантаження модуля авторизації...
            </div>
          )}

          {/* Localhost dev fallback — not shown on production */}
          {isLocalhost && (
            <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '10px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                🔧 Тестовий вхід (тільки localhost)
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {simulatedUsers.map(u => (
                  <button
                    key={u.telegram_id}
                    onClick={() => {
                      authenticateUser(u).then(authenticated => {
                        if (authenticated) {
                          localStorage.setItem('vb_current_user', JSON.stringify(u));
                        }
                      });
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${u.telegram_id === 'admin_test' ? 'rgba(255,0,127,0.4)' : 'var(--border-glass)'}`,
                      color: u.telegram_id === 'admin_test' ? 'var(--accent-pink)' : 'var(--accent-cyan)',
                      fontSize: '0.75rem', padding: '8px 4px', borderRadius: '6px', cursor: 'pointer'
                    }}
                  >
                    {u.first_name}
                    {u.telegram_id === 'admin_test' ? ' ⚙️' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main App ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: '100px', maxWidth: '680px', margin: '0 auto', width: '100%', position: 'relative' }}>

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
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
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
                isTelegramEnv={isTelegramEnv}
                onLogout={handleLogout}
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
                onDeleteUser={handleDeleteUser}
                onDeleteRegistration={handleDeleteRegistration}
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
        <button onClick={() => setActiveTab('calendar')} style={{ background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === 'calendar' ? 'var(--accent-cyan)' : 'var(--text-secondary)', fontSize: '0.75rem', padding: '8px' }}>
          <Calendar size={20} style={{ color: activeTab === 'calendar' ? 'var(--accent-cyan)' : 'var(--text-secondary)' }} />
          <span>Календар</span>
        </button>

        <button onClick={() => setActiveTab('profile')} style={{ background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === 'profile' ? 'var(--accent-lime)' : 'var(--text-secondary)', fontSize: '0.75rem', padding: '8px' }}>
          <User size={20} style={{ color: activeTab === 'profile' ? 'var(--accent-lime)' : 'var(--text-secondary)' }} />
          <span>Мій Профіль</span>
        </button>

        {currentUser?.role === 'admin' && (
          <button onClick={() => setActiveTab('admin')} style={{ background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === 'admin' ? 'var(--accent-pink)' : 'var(--text-secondary)', fontSize: '0.75rem', padding: '8px' }}>
            <Settings size={20} style={{ color: activeTab === 'admin' ? 'var(--accent-pink)' : 'var(--text-secondary)' }} />
            <span>Адмінка</span>
          </button>
        )}
      </nav>

    </div>
  );
}


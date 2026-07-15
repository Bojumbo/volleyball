import React, { useState } from 'react';
import { Calendar, Users, Trophy, Activity, Umbrella, Home, Clock, Check, X, ShieldAlert, Award } from 'lucide-react';

export default function CalendarView({ sessions, currentUser, onRegister, onUnregister, refreshData }) {
  const [selectedSession, setSelectedSession] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  
  // Wizard options state
  const [gameType, setGameType] = useState('competitive');
  const [location, setLocation] = useState('beach');
  const [duration, setDuration] = useState(2);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Ukrainian translations for days and months
  const ukDayNames = {
    'Sun': 'Нд', 'Mon': 'Пн', 'Tue': 'Вт', 'Wed': 'Ср', 'Thu': 'Чт', 'Fri': 'Пт', 'Sat': 'Сб'
  };
  const ukMonths = [
    'Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'
  ];

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    const dayName = ukDayNames[d.toLocaleDateString('en-US', { weekday: 'short' })] || '';
    const dateNum = d.getDate();
    const monthName = ukMonths[d.getMonth()] || '';
    return { dayName, dateNum, monthName };
  };

  const handleSelectSession = (session) => {
    setSelectedSession(session);
    setShowWizard(false);
    
    // If user already registered, prefill wizard options for editing
    const userReg = session.registrations.find(r => r.user_id === currentUser?.id);
    if (userReg) {
      setGameType(userReg.game_type);
      setLocation(userReg.location);
      setDuration(userReg.duration);
    } else {
      // Defaults
      setGameType('competitive');
      setLocation('beach');
      setDuration(2);
    }
  };

  const handleStartRegister = () => {
    if (!currentUser) {
      alert('Будь ласка, оберіть користувача у верхній панелі симулятора!');
      return;
    }
    setWizardStep(1);
    setShowWizard(true);
  };

  const handleNextStep = () => {
    if (wizardStep < 3) setWizardStep(wizardStep + 1);
  };

  const handlePrevStep = () => {
    if (wizardStep > 1) setWizardStep(wizardStep - 1);
  };

  const handleConfirmRegistration = async () => {
    setLoading(true);
    setError('');
    try {
      await onRegister(selectedSession.date, gameType, location, duration);
      setShowWizard(false);
      
      // Update selected session with fresh data
      const updatedSessions = await refreshData();
      const updatedSess = updatedSessions.find(s => s.id === selectedSession.id);
      if (updatedSess) setSelectedSession(updatedSess);
    } catch (err) {
      setError(err.message || 'Помилка при реєстрації');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!window.confirm('Ви впевнені, що хочете скасувати запис?')) return;
    setLoading(true);
    setError('');
    try {
      await onUnregister(selectedSession.date);
      
      // Update selected session with fresh data
      const updatedSessions = await refreshData();
      const updatedSess = updatedSessions.find(s => s.id === selectedSession.id);
      if (updatedSess) setSelectedSession(updatedSess);
    } catch (err) {
      setError(err.message || 'Помилка при скасуванні запису');
    } finally {
      setLoading(false);
    }
  };

  // Helper to compute statistics for the selected session
  const getSessionStats = (registrations) => {
    const total = registrations.length;
    if (total === 0) return null;

    const compCount = registrations.filter(r => r.game_type === 'competitive').length;
    const trainingCount = registrations.filter(r => r.game_type === 'training').length;
    
    const beachCount = registrations.filter(r => r.location === 'beach').length;
    const hallCount = registrations.filter(r => r.location === 'hall').length;
    
    const sumDuration = registrations.reduce((acc, curr) => acc + curr.duration, 0);
    const avgDuration = (sumDuration / total).toFixed(1);

    return {
      compPercent: Math.round((compCount / total) * 100),
      trainPercent: Math.round((trainingCount / total) * 100),
      beachCount,
      hallCount,
      avgDuration
    };
  };

  const stats = selectedSession ? getSessionStats(selectedSession.registrations) : null;
  const isRegistered = selectedSession?.registrations.some(r => r.user_id === currentUser?.id);
  const isFull = selectedSession?.registrations.length >= selectedSession?.max_capacity;

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', maxWidth: '800px', margin: '0 auto', padding: '16px 8px' }}>
      
      {/* HEADER SECTION */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '1.8rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Calendar style={{ color: 'var(--accent-cyan)' }} />
          Календар Занять
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Оберіть день на 2 тижні вперед для запису чи перегляду учасників
        </p>
      </div>

      {/* 14-DAY CALENDAR GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '12px' }}>
        {sessions.map((session) => {
          const { dayName, dateNum, monthName } = formatDateLabel(session.date);
          const count = session.registrations.length;
          const pct = Math.min((count / session.max_capacity) * 100, 100);
          const isUserReg = session.registrations.some(r => r.user_id === currentUser?.id);
          const isSessFull = count >= session.max_capacity;

          let cardBorder = 'var(--border-glass)';
          let dotColor = '#555';
          let glowClass = '';

          if (isUserReg) {
            cardBorder = '1px solid var(--accent-lime)';
            dotColor = 'var(--accent-lime)';
          } else if (isSessFull) {
            cardBorder = '1px solid rgba(255, 0, 127, 0.4)';
            dotColor = 'var(--accent-pink)';
          } else if (count > 0) {
            cardBorder = '1px solid var(--border-active)';
            dotColor = 'var(--accent-cyan)';
          }

          const isSelected = selectedSession?.id === session.id;
          if (isSelected) {
            cardBorder = '2px solid var(--accent-cyan)';
            glowClass = 'glow-cyan';
          }

          return (
            <div
              key={session.id}
              className="glass glass-hover"
              onClick={() => handleSelectSession(session)}
              style={{
                border: cardBorder,
                padding: '12px 6px',
                textAlign: 'center',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                transform: isSelected ? 'scale(1.05)' : 'none',
                boxShadow: isSelected ? 'var(--shadow-neon)' : 'none'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                {dayName}
              </span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0', color: isSelected ? 'var(--accent-cyan)' : '#fff' }}>
                {dateNum}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                {monthName}
              </span>

              {/* Progress bar container */}
              <div style={{ width: '80%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginBottom: '6px' }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: isUserReg ? 'var(--accent-lime)' : isSessFull ? 'var(--accent-pink)' : 'var(--accent-cyan)',
                  borderRadius: '2px'
                }} />
              </div>

              {/* Info badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', color: isSessFull ? 'var(--accent-pink)' : 'var(--text-secondary)' }}>
                <Users size={10} />
                <span>{count}/{session.max_capacity}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* SELECTED SESSION DETAIL PANEL */}
      {selectedSession && (
        <div className="glass animate-fade-in" style={{ padding: '24px', border: '1px solid var(--border-active)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <span style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Обрана дата</span>
              <h3 style={{ fontSize: '1.5rem', color: '#fff', marginTop: '2px' }}>
                {new Date(selectedSession.date).toLocaleDateString('uk-UA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              {isRegistered ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={handleStartRegister}
                    className="glow-lime"
                    style={{ background: 'rgba(204, 255, 0, 0.1)', border: '1px solid var(--accent-lime)', color: 'var(--accent-lime)', padding: '10px 16px', fontSize: '0.85rem' }}
                  >
                    Змінити налаштування
                  </button>
                  <button 
                    onClick={handleCancelRegistration}
                    disabled={loading}
                    style={{ background: 'rgba(255, 0, 127, 0.1)', border: '1px solid var(--accent-pink)', color: 'var(--accent-pink)', padding: '10px 16px', fontSize: '0.85rem' }}
                  >
                    Скасувати запис
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartRegister}
                  disabled={isFull || loading}
                  className="glow-cyan"
                  style={{
                    background: isFull ? 'rgba(255,255,255,0.05)' : 'var(--accent-cyan)',
                    color: isFull ? 'var(--text-muted)' : '#000',
                    padding: '12px 24px',
                    fontSize: '0.95rem',
                    boxShadow: isFull ? 'none' : 'var(--shadow-neon)',
                    cursor: isFull ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isFull ? 'Група заповнена' : 'Записатись на гру 🏐'}
                </button>
              )}
            </div>
          </div>

          {/* WIZARD DIALOG FOR REGISTRATION */}
          {showWizard && (
            <div className="glass" style={{ background: 'rgba(10, 12, 16, 0.95)', border: '1px solid var(--accent-cyan)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ color: 'var(--accent-cyan)', fontSize: '1.1rem' }}>
                  Опитування при записі (Крок {wizardStep} з 3)
                </h4>
                <button 
                  onClick={() => setShowWizard(false)}
                  style={{ background: 'none', color: 'var(--text-muted)', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>

              {error && (
                <div style={{ background: 'rgba(255, 0, 127, 0.1)', border: '1px solid var(--accent-pink)', padding: '10px', borderRadius: '8px', color: 'var(--accent-pink)', fontSize: '0.85rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* WIZARD STEP 1: GAME TYPE */}
              {wizardStep === 1 && (
                <div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Який формат гри ви віддаєте перевагу на цьому занятті?
                  </p>
                  <div className="option-grid">
                    <div 
                      className={`option-card ${gameType === 'competitive' ? 'selected' : ''}`}
                      onClick={() => setGameType('competitive')}
                    >
                      <Trophy style={{ color: 'var(--accent-cyan)', marginBottom: '8px', margin: '0 auto 8px auto' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff' }}>Змагальна гра</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Акцент на інтенсивний матч, рахунок та перемогу</div>
                    </div>
                    <div 
                      className={`option-card ${gameType === 'training' ? 'selected' : ''}`}
                      onClick={() => setGameType('training')}
                    >
                      <Activity style={{ color: 'var(--accent-cyan)', marginBottom: '8px', margin: '0 auto 8px auto' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff' }}>Тренування</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Відпрацювання елементів, вправи та технічні розбори</div>
                    </div>
                  </div>
                </div>
              )}

              {/* WIZARD STEP 2: LOCATION */}
              {wizardStep === 2 && (
                <div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Де ви бажаєте провести гру?
                  </p>
                  <div className="option-grid">
                    <div 
                      className={`option-card ${location === 'beach' ? 'selected-alt' : ''}`}
                      onClick={() => setLocation('beach')}
                    >
                      <Umbrella style={{ color: 'var(--accent-lime)', marginBottom: '8px', margin: '0 auto 8px auto' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff' }}>Пляжний волейбол</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Піщаний відкритий чи критий корт</div>
                    </div>
                    <div 
                      className={`option-card ${location === 'hall' ? 'selected-alt' : ''}`}
                      onClick={() => setLocation('hall')}
                    >
                      <Home style={{ color: 'var(--accent-lime)', marginBottom: '8px', margin: '0 auto 8px auto' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff' }}>Класичний зал</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Паркет чи поліуретан, стандартна сітка</div>
                    </div>
                  </div>
                </div>
              )}

              {/* WIZARD STEP 3: DURATION */}
              {wizardStep === 3 && (
                <div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Скільки часу ви хочете провести на занятті?
                  </p>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <Clock style={{ color: 'var(--accent-lime)' }} />
                      <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-lime)' }}>{duration} год.</span>
                    </div>
                    
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="1"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                      className="custom-range"
                    />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0 4px' }}>
                      <span>1 год</span>
                      <span>2 год</span>
                      <span>3 год</span>
                      <span>4 год</span>
                    </div>
                  </div>
                </div>
              )}

              {/* WIZARD NAVIGATION */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '14px' }}>
                <div>
                  {wizardStep > 1 && (
                    <button 
                      onClick={handlePrevStep}
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      Назад
                    </button>
                  )}
                </div>
                
                <div>
                  {wizardStep < 3 ? (
                    <button 
                      onClick={handleNextStep}
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-cyan)', border: '1px solid var(--border-active)', padding: '8px 20px', fontSize: '0.85rem' }}
                    >
                      Далі
                    </button>
                  ) : (
                    <button
                      onClick={handleConfirmRegistration}
                      disabled={loading}
                      style={{ background: 'var(--accent-lime)', color: '#000', padding: '10px 24px', fontSize: '0.9rem', fontWeight: 700 }}
                    >
                      {loading ? 'Збереження...' : (isRegistered ? 'Оновити параметри 💾' : 'Підтвердити запис ✔️')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MAIN BODY: PARTICIPANTS & STATS ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            
            {/* STATS OVERVIEW FOR CURRENT DAY */}
            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                
                {/* Format Stat */}
                <div className="glass" style={{ padding: '14px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Формат гри</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
                        <span>🏆 Змагання ({stats.compPercent}%)</span>
                      </div>
                      <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${stats.compPercent}%`, height: '100%', background: 'var(--accent-cyan)' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location Stat */}
                <div className="glass" style={{ padding: '14px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Локація</div>
                  <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginTop: '6px' }}>
                    <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                      <Umbrella size={14} style={{ color: 'var(--accent-lime)', marginRight: '4px' }} />
                      <span>Пляж: <strong>{stats.beachCount}</strong></span>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                      <Home size={14} style={{ color: 'var(--accent-lime)', marginRight: '4px' }} />
                      <span>Зал: <strong>{stats.hallCount}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Duration Stat */}
                <div className="glass" style={{ padding: '14px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Середній бажаний час</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <Clock size={16} style={{ color: 'var(--accent-lime)' }} />
                    <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{stats.avgDuration} год.</span>
                  </div>
                </div>
              </div>
            )}

            {/* LIST OF PLAYERS */}
            <div>
              <h4 style={{ fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Users size={16} style={{ color: 'var(--accent-cyan)' }} />
                Зареєстровані гравці ({selectedSession.registrations.length})
              </h4>

              {selectedSession.registrations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-glass)', borderRadius: '12px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    На цей день ще немає зареєстрованих гравців. Будьте першим! 🏐
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedSession.registrations.map((reg) => {
                    const isSelf = reg.user_id === currentUser?.id;
                    return (
                      <div
                        key={reg.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          background: isSelf ? 'rgba(0, 240, 255, 0.03)' : 'rgba(255,255,255,0.02)',
                          border: isSelf ? '1px solid rgba(0, 240, 255, 0.2)' : '1px solid var(--border-glass)',
                          borderRadius: '8px',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            background: isSelf ? 'var(--accent-cyan)' : 'var(--text-muted)',
                            borderRadius: '50%'
                          }} />
                          <span style={{ fontWeight: 600, color: isSelf ? 'var(--accent-cyan)' : '#fff', fontSize: '0.95rem' }}>
                            {reg.first_name} {reg.last_name}
                            {reg.username && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                                @{reg.username}
                              </span>
                            )}
                          </span>
                          {isSelf && (
                            <span style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--accent-cyan)', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>
                              Ви
                            </span>
                          )}
                        </div>

                        {/* Player preferences badges */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {/* Format */}
                          <span style={{
                            background: reg.game_type === 'competitive' ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            color: reg.game_type === 'competitive' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            borderRadius: '20px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {reg.game_type === 'competitive' ? <Trophy size={10} /> : <Activity size={10} />}
                            {reg.game_type === 'competitive' ? 'Змагання' : 'Тренування'}
                          </span>

                          {/* Location */}
                          <span style={{
                            background: reg.location === 'beach' ? 'rgba(204, 255, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            color: reg.location === 'beach' ? 'var(--accent-lime)' : 'var(--text-secondary)',
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            borderRadius: '20px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {reg.location === 'beach' ? <Umbrella size={10} /> : <Home size={10} />}
                            {reg.location === 'beach' ? 'Пляж' : 'Зал'}
                          </span>

                          {/* Duration */}
                          <span style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-secondary)',
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            borderRadius: '20px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Clock size={10} />
                            {reg.duration} год
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState } from 'react';
import { Settings, Users, Star, Check, X, Shield, BellRing, MessageSquare, Plus, Minus, CheckCircle, HelpCircle } from 'lucide-react';

export default function AdminPanel({ sessions, adminData, onUpdateCapacity, onUpdateAttendance, onUpdateRole, onTriggerSurvey, refreshData }) {
  const [activeSubTab, setActiveSubTab] = useState('capacity'); // capacity, attendance, users, feedback
  const [selectedDateAttendance, setSelectedDateAttendance] = useState(null);
  
  const [capacityLoading, setCapacityLoading] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState({});
  const [surveyLoading, setSurveyLoading] = useState({});
  const [surveySuccess, setSurveySuccess] = useState({});

  const handleCapacityChange = async (date, currentVal, increment) => {
    const newVal = currentVal + increment;
    if (newVal < 1) return;
    
    setCapacityLoading(prev => ({ ...prev, [date]: true }));
    try {
      await onUpdateCapacity(date, newVal);
      await refreshData();
    } catch (err) {
      alert('Не вдалося оновити ліміт гравців.');
    } finally {
      setCapacityLoading(prev => ({ ...prev, [date]: false }));
    }
  };

  const handleAttendanceChange = async (regId, attendedVal) => {
    setAttendanceLoading(prev => ({ ...prev, [regId]: true }));
    try {
      await onUpdateAttendance(regId, attendedVal);
      await refreshData();
    } catch (err) {
      alert('Не вдалося зберегти статус відвідування.');
    } finally {
      setAttendanceLoading(prev => ({ ...prev, [regId]: false }));
    }
  };

  const handleRoleToggle = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Змінити роль користувача на ${newRole === 'admin' ? 'Адміністратора' : 'Гравця'}?`)) return;
    
    try {
      await onUpdateRole(userId, newRole);
      await refreshData();
    } catch (err) {
      alert('Не вдалося оновити роль.');
    }
  };

  const handleTriggerSurvey = async (date) => {
    setSurveyLoading(prev => ({ ...prev, [date]: true }));
    setSurveySuccess(prev => ({ ...prev, [date]: null }));
    try {
      const res = await onTriggerSurvey(date);
      if (res.success) {
        setSurveySuccess(prev => ({ ...prev, [date]: `Опитування надіслано! Кількість чатів: ${res.sentCount}` }));
      } else {
        alert(res.reason || 'Не вдалося надіслати опитування (перевірте токен бота).');
      }
    } catch (err) {
      alert('Помилка при запуску опитування.');
    } finally {
      setSurveyLoading(prev => ({ ...prev, [date]: false }));
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '850px', margin: '0 auto', padding: '16px 8px' }}>
      
      {/* ADMIN TITLE */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--accent-pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Settings style={{ color: 'var(--accent-pink)' }} />
          Панель Адміністратора
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Коригування лімітів, відмітка відвідуваності та керування опитуваннями
        </p>
      </div>

      {/* ADMIN SUBTABS NAVIGATION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '24px' }}>
        {[
          { id: 'capacity', label: 'Ліміти гравців', icon: <Settings size={14} /> },
          { id: 'attendance', label: 'Відвідуваність', icon: <Check size={14} /> },
          { id: 'users', label: 'Користувачі', icon: <Users size={14} /> },
          { id: 'feedback', label: 'Відгуки та Оцінки', icon: <Star size={14} /> }
        ].map((subTab) => (
          <button
            key={subTab.id}
            onClick={() => setActiveSubTab(subTab.id)}
            style={{
              background: activeSubTab === subTab.id ? 'var(--accent-pink)' : 'rgba(255,255,255,0.02)',
              color: activeSubTab === subTab.id ? '#000' : 'var(--text-secondary)',
              border: activeSubTab === subTab.id ? 'none' : '1px solid var(--border-glass)',
              padding: '10px 4px',
              fontSize: '0.85rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: activeSubTab === subTab.id ? 700 : 500
            }}
          >
            {subTab.icon}
            <span className="hidden-mobile">{subTab.label}</span>
          </button>
        ))}
      </div>

      {/* SUBTAB CONTENT: CAPACITY LIMITS */}
      {activeSubTab === 'capacity' && (
        <div className="glass" style={{ padding: '24px', border: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>Ліміти гравців на кожен день</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sessions.map((sess) => {
              const regCount = sess.registrations.length;
              const isLoading = capacityLoading[sess.date];
              
              return (
                <div
                  key={sess.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
                      {new Date(sess.date).toLocaleDateString('uk-UA', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Записано гравців: <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{regCount}</span>
                    </div>
                  </div>

                  {/* Limit Editor Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ліміт:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => handleCapacityChange(sess.date, sess.max_capacity, -1)}
                        disabled={isLoading || sess.max_capacity <= 1}
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', color: '#fff', width: '28px', height: '28px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', padding: 0 }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-pink)', minWidth: '24px', textAlign: 'center' }}>
                        {sess.max_capacity}
                      </span>
                      <button
                        onClick={() => handleCapacityChange(sess.date, sess.max_capacity, 1)}
                        disabled={isLoading}
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', color: '#fff', width: '28px', height: '28px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', padding: 0 }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB CONTENT: ATTENDANCE */}
      {activeSubTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* SELECT SESSION LIST */}
          <div className="glass" style={{ padding: '24px', border: '1px solid var(--border-glass)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '14px' }}>Оберіть заняття для відмітки відвідуваності</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
              {sessions.map((sess) => {
                const isSelected = selectedDateAttendance === sess.date;
                const regCount = sess.registrations.length;
                return (
                  <div
                    key={sess.id}
                    onClick={() => {
                      setSelectedDateAttendance(sess.date);
                      // Clear survey alert
                      setSurveySuccess(prev => ({ ...prev, [sess.date]: null }));
                    }}
                    style={{
                      background: isSelected ? 'rgba(255, 0, 127, 0.08)' : 'rgba(255,255,255,0.01)',
                      border: isSelected ? '1.5px solid var(--accent-pink)' : '1px solid var(--border-glass)',
                      padding: '10px 6px',
                      borderRadius: '8px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isSelected ? 'var(--accent-pink)' : '#fff' }}>
                      {new Date(sess.date).toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {regCount} учасників
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PARTICIPANT ATTENDANCE SHEET */}
          {selectedDateAttendance && (() => {
            const currentSession = sessions.find(s => s.date === selectedDateAttendance);
            if (!currentSession) return null;

            const isSurveySent = surveySuccess[selectedDateAttendance];
            const isSurveyLoading = surveyLoading[selectedDateAttendance];

            return (
              <div className="glass animate-fade-in" style={{ padding: '24px', border: '1px solid var(--border-active)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div>
                    <span style={{ color: 'var(--accent-pink)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Лист відвідуваності</span>
                    <h4 style={{ fontSize: '1.3rem', color: '#fff', marginTop: '2px' }}>
                      {new Date(selectedDateAttendance).toLocaleDateString('uk-UA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h4>
                  </div>

                  {/* Send Bot Survey Button */}
                  <div>
                    <button
                      onClick={() => handleTriggerSurvey(selectedDateAttendance)}
                      disabled={isSurveyLoading || currentSession.registrations.length === 0}
                      style={{
                        background: 'rgba(0, 240, 255, 0.1)',
                        border: '1px solid var(--accent-cyan)',
                        color: 'var(--accent-cyan)',
                        padding: '10px 18px',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: currentSession.registrations.length === 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <BellRing size={14} />
                      Надіслати опитування ботом 🤖
                    </button>
                  </div>
                </div>

                {isSurveySent && (
                  <div style={{ background: 'rgba(204, 255, 0, 0.1)', border: '1px solid var(--accent-lime)', padding: '12px', borderRadius: '8px', color: 'var(--accent-lime)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} />
                    <span>{isSurveySent}</span>
                  </div>
                )}

                {currentSession.registrations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    На цей день немає зареєстрованих гравців для відмітки.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {currentSession.registrations.map((reg) => {
                      const isLoad = attendanceLoading[reg.id];
                      return (
                        <div
                          key={reg.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            background: 'rgba(255,255,255,0.01)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '8px',
                            flexWrap: 'wrap',
                            gap: '10px'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
                              {reg.first_name} {reg.last_name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {reg.game_type === 'competitive' ? '🏆 Змагання' : '🏋️ Тренування'} | {reg.location === 'beach' ? '🏖️ Пляж' : '🏟️ Зал'} | {reg.duration} год
                            </div>
                          </div>

                          {/* Attendance Status Buttons */}
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {/* Attended */}
                            <button
                              onClick={() => handleAttendanceChange(reg.id, 1)}
                              disabled={isLoad}
                              style={{
                                background: reg.attended === 1 ? 'var(--accent-lime)' : 'rgba(255,255,255,0.02)',
                                border: '1px solid ' + (reg.attended === 1 ? 'var(--accent-lime)' : 'var(--border-glass)'),
                                color: reg.attended === 1 ? '#000' : 'var(--text-secondary)',
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Check size={12} />
                              Був
                            </button>

                            {/* Missed */}
                            <button
                              onClick={() => handleAttendanceChange(reg.id, 0)}
                              disabled={isLoad}
                              style={{
                                background: reg.attended === 0 ? 'var(--accent-pink)' : 'rgba(255,255,255,0.02)',
                                border: '1px solid ' + (reg.attended === 0 ? 'var(--accent-pink)' : 'var(--border-glass)'),
                                color: reg.attended === 0 ? '#fff' : 'var(--text-secondary)',
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <X size={12} />
                              Пропустив
                            </button>

                            {/* Pending */}
                            <button
                              onClick={() => handleAttendanceChange(reg.id, null)}
                              disabled={isLoad}
                              style={{
                                background: reg.attended === null ? 'var(--bg-tertiary)' : 'rgba(255,255,255,0.02)',
                                border: '1px solid ' + (reg.attended === null ? 'var(--accent-cyan)' : 'var(--border-glass)'),
                                color: reg.attended === null ? 'var(--accent-cyan)' : 'var(--text-muted)',
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <HelpCircle size={12} />
                              Очікується
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* SUBTAB CONTENT: USER DIRECTORY */}
      {activeSubTab === 'users' && (
        <div className="glass" style={{ padding: '24px', border: '1px solid var(--border-glass)', overflowX: 'auto' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>Зареєстровані користувачі в системі</h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <th style={{ padding: '10px 8px' }}>Імʼя</th>
                <th style={{ padding: '10px 8px' }}>Username</th>
                <th style={{ padding: '10px 8px' }}>Роль</th>
                <th style={{ padding: '10px 8px', textAlign: 'center' }}>Відвідано</th>
                <th style={{ padding: '10px 8px', textAlign: 'center' }}>Пропущено</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {adminData.users?.map((user) => (
                <tr 
                  key={user.id} 
                  style={{ 
                    borderBottom: '1px solid var(--border-glass)', 
                    fontSize: '0.9rem',
                    background: user.role === 'admin' ? 'rgba(255, 0, 127, 0.02)' : 'none'
                  }}
                >
                  <td style={{ padding: '12px 8px', fontWeight: 600, color: '#fff' }}>
                    {user.first_name} {user.last_name}
                  </td>
                  <td style={{ padding: '12px 8px', color: 'var(--accent-cyan)' }}>
                    {user.username ? `@${user.username}` : '-'}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{
                      background: user.role === 'admin' ? 'rgba(255, 0, 127, 0.1)' : 'rgba(255,255,255,0.05)',
                      color: user.role === 'admin' ? 'var(--accent-pink)' : 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 600
                    }}>
                      {user.role === 'admin' ? 'Адмін' : 'Гравець'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--accent-lime)', fontWeight: 700 }}>
                    {user.attended_count}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--accent-pink)', fontWeight: 700 }}>
                    {user.missed_count}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleRoleToggle(user.id, user.role)}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-glass)',
                        color: user.role === 'admin' ? 'var(--text-secondary)' : 'var(--accent-pink)',
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        borderRadius: '4px'
                      }}
                    >
                      {user.role === 'admin' ? 'Зняти адміна' : 'Зробити адміном'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SUBTAB CONTENT: FEEDBACK REVIEW */}
      {activeSubTab === 'feedback' && (
        <div className="glass" style={{ padding: '24px', border: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} style={{ color: 'var(--accent-cyan)' }} />
            Відгуки та оцінки гравців
          </h3>

          {adminData.feedbackLogs?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Відгуків від гравців ще не надходило.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {adminData.feedbackLogs?.map((log, index) => (
                <div
                  key={index}
                  style={{
                    padding: '16px',
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
                        {log.first_name} {log.last_name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                        на гру {new Date(log.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    {/* Stars */}
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={12}
                          style={{
                            fill: star <= (log.rating || 0) ? 'var(--accent-lime)' : 'none',
                            stroke: star <= (log.rating || 0) ? 'var(--accent-lime)' : 'var(--text-muted)'
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Feedback text */}
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: log.feedback ? 'normal' : 'italic' }}>
                    {log.feedback ? `"${log.feedback}"` : 'Лише оцінка зірками (без текстового коментаря)'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

import React, { useState } from 'react';
import { Settings, Users, Star, Check, X, BellRing, MessageSquare, Plus, Minus, CheckCircle, HelpCircle, Trash2, UserMinus, RefreshCw } from 'lucide-react';

export default function AdminPanel({ sessions, adminData, onUpdateCapacity, onUpdateAttendance, onUpdateRole, onTriggerSurvey, onTriggerSurveyUser, refreshData, onDeleteUser, onDeleteRegistration }) {
  const [activeSubTab, setActiveSubTab] = useState('capacity');
  const [selectedDateAttendance, setSelectedDateAttendance] = useState(null);
  
  const [capacityLoading, setCapacityLoading] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState({});
  const [surveyLoading, setSurveyLoading] = useState({});
  const [surveyStatus, setSurveyStatus] = useState({}); // { [date]: { type: 'success'|'warning'|'error', msg } }
  const [surveyUserLoading, setSurveyUserLoading] = useState({}); // { [regId]: bool }
  const [surveyUserStatus, setSurveyUserStatus] = useState({}); // { [regId]: { type, msg } }
  const [deleteLoading, setDeleteLoading] = useState({});
  const [feedbackRefreshing, setFeedbackRefreshing] = useState(false);

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
    if (!window.confirm(`Змінити роль на ${newRole === 'admin' ? 'Адміністратора' : 'Гравця'}?`)) return;
    try {
      await onUpdateRole(userId, newRole);
      await refreshData();
    } catch (err) {
      alert('Не вдалося оновити роль.');
    }
  };

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Видалити користувача "${name}" разом з усіма записами?`)) return;
    setDeleteLoading(prev => ({ ...prev, [`u${userId}`]: true }));
    try {
      await onDeleteUser(userId);
      await refreshData();
    } catch (err) {
      alert('Не вдалося видалити користувача.');
    } finally {
      setDeleteLoading(prev => ({ ...prev, [`u${userId}`]: false }));
    }
  };

  const handleDeleteRegistration = async (regId, name, date) => {
    if (!window.confirm(`Видалити "${name}" із запису на ${date}?`)) return;
    setDeleteLoading(prev => ({ ...prev, [`r${regId}`]: true }));
    try {
      await onDeleteRegistration(regId);
      // Refresh sessions and update the selected session view
      const updatedSessions = await refreshData();
      if (selectedDateAttendance) {
        const updated = updatedSessions?.find(s => s.date === selectedDateAttendance);
        if (!updated || updated.registrations.length === 0) {
          // Keep date selected but view will update via props
        }
      }
    } catch (err) {
      alert('Не вдалося видалити запис.');
    } finally {
      setDeleteLoading(prev => ({ ...prev, [`r${regId}`]: false }));
    }
  };

  const handleTriggerSurvey = async (date) => {
    setSurveyLoading(prev => ({ ...prev, [date]: true }));
    setSurveyStatus(prev => ({ ...prev, [date]: null }));
    try {
      const res = await onTriggerSurvey(date);
      if (res.success) {
        setSurveyStatus(prev => ({ ...prev, [date]: { type: 'success', msg: `✅ Надіслано! Кількість чатів: ${res.sentCount}` } }));
      } else {
        setSurveyStatus(prev => ({ ...prev, [date]: { type: 'error', msg: res.reason || 'Не вдалося надіслати опитування.' } }));
      }
    } catch (err) {
      if (err.alreadySent) {
        setSurveyStatus(prev => ({ ...prev, [date]: { type: 'warning', msg: `⚠️ ${err.message}` } }));
      } else {
        setSurveyStatus(prev => ({ ...prev, [date]: { type: 'error', msg: err.message || 'Помилка при запуску опитування.' } }));
      }
    } finally {
      setSurveyLoading(prev => ({ ...prev, [date]: false }));
    }
  };

  const handleTriggerSurveyUser = async (regId, name) => {
    setSurveyUserLoading(prev => ({ ...prev, [regId]: true }));
    setSurveyUserStatus(prev => ({ ...prev, [regId]: null }));
    try {
      const res = await onTriggerSurveyUser(regId);
      if (res.success) {
        setSurveyUserStatus(prev => ({ ...prev, [regId]: { type: 'success', msg: '✅ Надіслано!' } }));
      } else {
        setSurveyUserStatus(prev => ({ ...prev, [regId]: { type: 'error', msg: res.reason || 'Помилка.' } }));
      }
    } catch (err) {
      if (err.alreadySent) {
        setSurveyUserStatus(prev => ({ ...prev, [regId]: { type: 'warning', msg: '⚠️ Вже надіслано!' } }));
      } else {
        setSurveyUserStatus(prev => ({ ...prev, [regId]: { type: 'error', msg: err.message || 'Помилка.' } }));
      }
    } finally {
      setSurveyUserLoading(prev => ({ ...prev, [regId]: false }));
    }
  };

  const handleRefreshFeedback = async () => {
    setFeedbackRefreshing(true);
    try {
      await refreshData();
    } finally {
      setFeedbackRefreshing(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '850px', margin: '0 auto', padding: '16px 8px' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.6rem', color: 'var(--accent-pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Settings style={{ color: 'var(--accent-pink)' }} />
          Панель Адміністратора
        </h2>
      </div>

      {/* ADMIN SUBTABS */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
        {[
          { id: 'capacity', label: 'Ліміти', icon: <Settings size={13} /> },
          { id: 'attendance', label: 'Відвідуваність', icon: <Check size={13} /> },
          { id: 'users', label: 'Користувачі', icon: <Users size={13} /> },
          { id: 'feedback', label: 'Відгуки', icon: <Star size={13} /> }
        ].map((sub) => (
          <button
            key={sub.id}
            onClick={() => setActiveSubTab(sub.id)}
            style={{
              flex: '1 1 130px',
              background: activeSubTab === sub.id ? 'var(--accent-pink)' : 'rgba(255,255,255,0.02)',
              color: activeSubTab === sub.id ? '#000' : 'var(--text-secondary)',
              border: activeSubTab === sub.id ? 'none' : '1px solid var(--border-glass)',
              padding: '10px 4px',
              fontSize: '0.78rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              fontWeight: activeSubTab === sub.id ? 700 : 500,
              cursor: 'pointer'
            }}
          >
            {sub.icon}
            {sub.label}
          </button>
        ))}
      </div>

      {/* ── TAB: CAPACITY ── */}
      {activeSubTab === 'capacity' && (
        <div className="glass" style={{ padding: '20px', border: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '14px' }}>Ліміти гравців на кожен день</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sessions.map((sess) => {
              const regCount = sess.registrations.length;
              const isLoading = capacityLoading[sess.date];
              return (
                <div key={sess.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                      {new Date(sess.date).toLocaleDateString('uk-UA', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Записано: <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{regCount}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ліміт:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button onClick={() => handleCapacityChange(sess.date, sess.max_capacity, -1)} disabled={isLoading || sess.max_capacity <= 1} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', color: '#fff', width: '26px', height: '26px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' }}>
                        <Minus size={11} />
                      </button>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-pink)', minWidth: '22px', textAlign: 'center' }}>{sess.max_capacity}</span>
                      <button onClick={() => handleCapacityChange(sess.date, sess.max_capacity, 1)} disabled={isLoading} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', color: '#fff', width: '26px', height: '26px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' }}>
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: ATTENDANCE ── */}
      {activeSubTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Date picker */}
          <div className="glass" style={{ padding: '20px', border: '1px solid var(--border-glass)' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '12px' }}>Оберіть заняття</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
              {sessions.map((sess) => {
                const isSelected = selectedDateAttendance === sess.date;
                return (
                  <div key={sess.id} onClick={() => { setSelectedDateAttendance(sess.date); setSurveySuccess(prev => ({ ...prev, [sess.date]: null })); }}
                    style={{ background: isSelected ? 'rgba(255, 0, 127, 0.08)' : 'rgba(255,255,255,0.01)', border: isSelected ? '1.5px solid var(--accent-pink)' : '1px solid var(--border-glass)', padding: '8px 4px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: isSelected ? 'var(--accent-pink)' : '#fff' }}>
                      {new Date(sess.date).toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>{sess.registrations.length} учасн.</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Attendance sheet */}
          {selectedDateAttendance && (() => {
            const sess = sessions.find(s => s.date === selectedDateAttendance);
            if (!sess) return null;
            const isSurveySent = surveySuccess[selectedDateAttendance];
            return (
              <div className="glass animate-fade-in" style={{ padding: '20px', border: '1px solid var(--border-active)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '14px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ color: 'var(--accent-pink)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Лист відвідуваності</span>
                    <h4 style={{ fontSize: '1.1rem', color: '#fff', marginTop: '2px' }}>
                      {new Date(selectedDateAttendance).toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h4>
                  </div>
                  <button onClick={() => handleTriggerSurvey(selectedDateAttendance)} disabled={surveyLoading[selectedDateAttendance] || sess.registrations.length === 0}
                    style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', padding: '8px 14px', fontSize: '0.8rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <BellRing size={13} />
                    Надіслати в бот 🤖
                  </button>
                </div>

                {/* Survey status banner (all users) */}
                {surveyStatus[selectedDateAttendance] && (() => {
                  const s = surveyStatus[selectedDateAttendance];
                  const colors = { success: ['rgba(204,255,0,0.1)', 'var(--accent-lime)'], warning: ['rgba(255,165,0,0.1)', '#ffaa00'], error: ['rgba(255,0,127,0.1)', 'var(--accent-pink)'] };
                  const [bg, border] = colors[s.type] || colors.error;
                  return (
                    <div style={{ background: bg, border: `1px solid ${border}`, padding: '10px 14px', borderRadius: '8px', color: border, fontSize: '0.82rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {s.msg}
                    </div>
                  );
                })()}

                {sess.registrations.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>Немає зареєстрованих гравців.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sess.registrations.map((reg) => {
                      const isLoad = attendanceLoading[reg.id] || deleteLoading[`r${reg.id}`];
                      const userSurveyStatus = surveyUserStatus[reg.id];
                      const userSurveyLoading = surveyUserLoading[reg.id];
                      // survey_sent from DB — shown as a grey badge
                      const alreadySentInDb = reg.survey_sent === 1;
                      return (
                        <div key={reg.id} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                          {/* Top row: name + actions */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{reg.first_name} {reg.last_name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {reg.game_type === 'competitive' ? '🏆' : '🏋️'} {reg.location === 'beach' ? '🏖️' : '🏟️'} {reg.duration}год
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              <button onClick={() => handleAttendanceChange(reg.id, 1)} disabled={isLoad}
                                style={{ background: reg.attended === 1 ? 'var(--accent-lime)' : 'rgba(255,255,255,0.02)', border: '1px solid ' + (reg.attended === 1 ? 'var(--accent-lime)' : 'var(--border-glass)'), color: reg.attended === 1 ? '#000' : 'var(--text-secondary)', padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                                <Check size={11} />Був
                              </button>
                              <button onClick={() => handleAttendanceChange(reg.id, 0)} disabled={isLoad}
                                style={{ background: reg.attended === 0 ? 'var(--accent-pink)' : 'rgba(255,255,255,0.02)', border: '1px solid ' + (reg.attended === 0 ? 'var(--accent-pink)' : 'var(--border-glass)'), color: reg.attended === 0 ? '#fff' : 'var(--text-secondary)', padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                                <X size={11} />Пропустив
                              </button>
                              <button onClick={() => handleAttendanceChange(reg.id, null)} disabled={isLoad}
                                style={{ background: reg.attended === null ? 'var(--bg-tertiary)' : 'rgba(255,255,255,0.02)', border: '1px solid ' + (reg.attended === null ? 'var(--accent-cyan)' : 'var(--border-glass)'), color: reg.attended === null ? 'var(--accent-cyan)' : 'var(--text-muted)', padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                                <HelpCircle size={11} />?
                              </button>
                              {/* Individual survey button */}
                              <button
                                onClick={() => handleTriggerSurveyUser(reg.id, `${reg.first_name} ${reg.last_name}`)}
                                disabled={isLoad || userSurveyLoading}
                                title={alreadySentInDb ? 'Лист вже надіслано цьому гравцю' : 'Надіслати лист відвідуваності'}
                                style={{
                                  background: alreadySentInDb ? 'rgba(255,255,255,0.03)' : 'rgba(0,240,255,0.05)',
                                  border: '1px solid ' + (alreadySentInDb ? 'var(--border-glass)' : 'var(--accent-cyan)'),
                                  color: alreadySentInDb ? 'var(--text-muted)' : 'var(--accent-cyan)',
                                  padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px',
                                  display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', opacity: userSurveyLoading ? 0.6 : 1
                                }}
                              >
                                <BellRing size={11} />
                                {alreadySentInDb ? '📨' : '🤖'}
                              </button>
                              {/* Remove from session */}
                              <button onClick={() => handleDeleteRegistration(reg.id, `${reg.first_name} ${reg.last_name}`, selectedDateAttendance)} disabled={isLoad}
                                style={{ background: 'rgba(255,0,127,0.05)', border: '1px solid rgba(255,0,127,0.3)', color: 'var(--accent-pink)', padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                                <UserMinus size={11} />Видалити
                              </button>
                            </div>
                          </div>
                          {/* Per-user survey status */}
                          {userSurveyStatus && (
                            <div style={{ marginTop: '6px', fontSize: '0.75rem', color: userSurveyStatus.type === 'success' ? 'var(--accent-lime)' : userSurveyStatus.type === 'warning' ? '#ffaa00' : 'var(--accent-pink)', paddingLeft: '4px' }}>
                              {userSurveyStatus.msg}
                            </div>
                          )}
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

      {/* ── TAB: USERS ── */}
      {activeSubTab === 'users' && (
        <div className="glass" style={{ padding: '20px', border: '1px solid var(--border-glass)', overflowX: 'auto' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '14px' }}>Зареєстровані користувачі</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '520px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                <th style={{ padding: '8px' }}>Імʼя</th>
                <th style={{ padding: '8px' }}>Username</th>
                <th style={{ padding: '8px' }}>Роль</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>✅</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>❌</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {adminData.users?.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border-glass)', fontSize: '0.88rem', background: user.role === 'admin' ? 'rgba(255, 0, 127, 0.02)' : 'none' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 600, color: '#fff' }}>{user.first_name} {user.last_name}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--accent-cyan)' }}>{user.username ? `@${user.username}` : '-'}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ background: user.role === 'admin' ? 'rgba(255, 0, 127, 0.1)' : 'rgba(255,255,255,0.05)', color: user.role === 'admin' ? 'var(--accent-pink)' : 'var(--text-secondary)', fontSize: '0.72rem', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>
                      {user.role === 'admin' ? 'Адмін' : 'Гравець'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--accent-lime)', fontWeight: 700 }}>{user.attended_count}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--accent-pink)', fontWeight: 700 }}>{user.missed_count}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleRoleToggle(user.id, user.role)}
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', color: user.role === 'admin' ? 'var(--text-secondary)' : 'var(--accent-cyan)', padding: '4px 8px', fontSize: '0.72rem', borderRadius: '4px', cursor: 'pointer' }}>
                        {user.role === 'admin' ? 'Зняти адміна' : 'Зробити адміном'}
                      </button>
                      <button onClick={() => handleDeleteUser(user.id, `${user.first_name} ${user.last_name}`)} disabled={deleteLoading[`u${user.id}`]}
                        style={{ background: 'rgba(255,0,127,0.05)', border: '1px solid rgba(255,0,127,0.3)', color: 'var(--accent-pink)', padding: '4px 8px', fontSize: '0.72rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB: FEEDBACK ── */}
      {activeSubTab === 'feedback' && (
        <div className="glass" style={{ padding: '20px', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={16} style={{ color: 'var(--accent-cyan)' }} />
              Відгуки гравців
            </h3>
            <button onClick={handleRefreshFeedback} disabled={feedbackRefreshing}
              style={{ background: 'rgba(0,240,255,0.08)', border: '1px solid var(--border-active)', color: 'var(--accent-cyan)', padding: '6px 12px', fontSize: '0.78rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <RefreshCw size={12} style={{ animation: feedbackRefreshing ? 'spin 1s linear infinite' : 'none' }} />
              Оновити
            </button>
          </div>

          {!adminData.feedbackLogs || adminData.feedbackLogs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '30px 0' }}>
              Відгуків ще немає. Вони зʼявляться після того як гравці відповідять на опитування в боті або через додаток.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {adminData.feedbackLogs.map((log, i) => (
                <div key={i} style={{ padding: '14px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{log.first_name} {log.last_name}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                        {new Date(log.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} size={12} style={{ fill: star <= (log.rating || 0) ? 'var(--accent-lime)' : 'none', stroke: star <= (log.rating || 0) ? 'var(--accent-lime)' : 'var(--text-muted)' }} />
                      ))}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: log.feedback ? 'normal' : 'italic' }}>
                    {log.feedback ? `"${log.feedback}"` : 'Лише зіркова оцінка'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

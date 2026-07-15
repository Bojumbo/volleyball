import React, { useState } from 'react';
import { User, Award, Calendar, AlertCircle, Star, MessageSquareCheck, CheckCircle } from 'lucide-react';

export default function UserProfile({ stats, currentUser, onSubmitFeedback, refreshData, isTelegramEnv, onLogout }) {
  const [feedbackState, setFeedbackState] = useState({}); // { [regId]: { rating: 5, comment: '' } }
  const [loading, setLoading] = useState({});
  const [successMsg, setSuccessMsg] = useState({});

  if (!currentUser) {
    return (
      <div className="glass animate-fade-in" style={{ padding: '40px 20px', textAlign: 'center', maxWidth: '600px', margin: '20px auto' }}>
        <User size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px auto' }} />
        <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '8px' }}>Профіль не завантажено</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Будь ласка, увійдіть через Telegram для перегляду вашого профілю
        </p>
      </div>
    );
  }

  const total = stats.attended + stats.missed;
  const attendanceRate = total > 0 ? Math.round((stats.attended / total) * 100) : 0;

  // Handle rating click
  const handleRatingChange = (regId, rating) => {
    setFeedbackState(prev => ({
      ...prev,
      [regId]: {
        ...prev[regId],
        rating
      }
    }));
  };

  // Handle comment input change
  const handleCommentChange = (regId, val) => {
    setFeedbackState(prev => ({
      ...prev,
      [regId]: { ...prev[regId], comment: val }
    }));
  };

  // Submit feedback
  const handleSendFeedback = async (regId) => {
    const state = feedbackState[regId] || {};
    const rating = state.rating || 5;
    const comment = state.comment || '';

    setLoading(prev => ({ ...prev, [regId]: true }));
    try {
      await onSubmitFeedback(regId, rating, comment);
      setSuccessMsg(prev => ({ ...prev, [regId]: 'Відгук успішно відправлено! Дякуємо!' }));
      await refreshData();
    } catch (err) {
      alert('Не вдалося зберегти відгук. Спробуйте пізніше.');
    } finally {
      setLoading(prev => ({ ...prev, [regId]: false }));
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '700px', margin: '0 auto', padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* USER HEADER BANNER */}
      <div className="glass" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-glass)', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-lime))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
            fontWeight: 800,
            fontSize: '1.5rem',
            boxShadow: 'var(--shadow-neon)'
          }}>
            {currentUser.first_name ? currentUser.first_name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h3 style={{ fontSize: '1.4rem', color: '#fff' }}>
              {currentUser.first_name} {currentUser.last_name}
            </h3>
            <p style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 600 }}>
              {currentUser.username ? `@${currentUser.username}` : 'Telegram Користувач'}
              <span style={{
                background: currentUser.role === 'admin' ? 'var(--accent-pink)' : 'var(--bg-tertiary)',
                color: currentUser.role === 'admin' ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.7rem',
                padding: '2px 8px',
                borderRadius: '20px',
                marginLeft: '8px',
                border: currentUser.role === 'admin' ? 'none' : '1px solid var(--border-glass)'
              }}>
                {currentUser.role === 'admin' ? 'Адміністратор' : 'Гравець'}
              </span>
            </p>
          </div>
        </div>
        
        {!isTelegramEnv && (
          <button
            onClick={onLogout}
            style={{
              background: 'rgba(255, 0, 127, 0.1)',
              border: '1px solid var(--accent-pink)',
              color: 'var(--accent-pink)',
              padding: '8px 16px',
              fontSize: '0.8rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Вийти 🚪
          </button>
        )}
      </div>

      {/* STATS COUNTERS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        
        {/* Attended Card */}
        <div className="glass" style={{ padding: '20px', textAlign: 'center', border: '1px solid var(--border-glass)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Відвідано ігор
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-lime)', fontFamily: 'var(--font-heading)' }}>
            {stats.attended}
          </div>
        </div>

        {/* Missed Card */}
        <div className="glass" style={{ padding: '20px', textAlign: 'center', border: '1px solid var(--border-glass)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Пропущено ігор
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-pink)', fontFamily: 'var(--font-heading)' }}>
            {stats.missed}
          </div>
        </div>

        {/* Attendance Rate Card */}
        <div className="glass" style={{ padding: '20px', textAlign: 'center', border: '1px solid var(--border-glass)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Рейтинг відвідуваності
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-heading)' }}>
            {attendanceRate}%
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Ціль: &gt; 80% відвідуваності
          </div>
        </div>
      </div>

      {/* PENDING FEEDBACK / SURVEY SECTION */}
      {stats.pendingFeedback && stats.pendingFeedback.length > 0 && (
        <div className="glass" style={{ padding: '24px', border: '1px solid var(--accent-lime)' }}>
          <h4 style={{ fontSize: '1.2rem', color: 'var(--accent-lime)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Award size={18} />
            Оцінити минулі заняття ({stats.pendingFeedback.length})
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
            Будь ласка, залиште відгук про ваші останні відвідані ігри, щоб допомогти покращити тренування:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {stats.pendingFeedback.map((pf) => {
              const currentRating = feedbackState[pf.id]?.rating || 5;
              const isSubmitted = successMsg[pf.id];
              const isFeedbackLoading = loading[pf.id];

              return (
                <div
                  key={pf.id}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '12px',
                    padding: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
                      Гра від {new Date(pf.date).toLocaleDateString('uk-UA', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <span style={{ background: 'rgba(204, 255, 0, 0.1)', color: 'var(--accent-lime)', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      Очікує відгук
                    </span>
                  </div>

                  {isSubmitted ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-lime)', fontSize: '0.9rem', padding: '10px 0' }}>
                      <CheckCircle size={16} />
                      <span>{successMsg[pf.id]}</span>
                    </div>
                  ) : (
                    <div>
                      {/* Star selection */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Оцінка продуктивності:</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={20}
                              onClick={() => handleRatingChange(pf.id, star)}
                              style={{
                                fill: star <= currentRating ? 'var(--accent-lime)' : 'none',
                                stroke: star <= currentRating ? 'var(--accent-lime)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'transform 0.1s'
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Comment text */}
                      <div style={{ marginBottom: '12px' }}>
                        <textarea
                          placeholder="Напишіть що сподобалось, а що можна покращити..."
                          rows="2"
                          value={feedbackState[pf.id]?.comment || ''}
                          onChange={(e) => handleCommentChange(pf.id, e.target.value)}
                          style={{ fontSize: '0.85rem', resize: 'vertical' }}
                        />
                      </div>

                      <button
                        onClick={() => handleSendFeedback(pf.id)}
                        disabled={isFeedbackLoading}
                        style={{
                          background: 'var(--accent-lime)',
                          color: '#000',
                          padding: '8px 16px',
                          fontSize: '0.8rem',
                          width: '100%',
                          textAlign: 'center',
                          fontWeight: 700
                        }}
                      >
                        {isFeedbackLoading ? 'Надсилання...' : 'Надіслати відгук 💬'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* UPCOMING EVENTS SECTION */}
      <div className="glass" style={{ padding: '24px', border: '1px solid var(--border-glass)' }}>
        <h4 style={{ fontSize: '1.2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Calendar size={18} style={{ color: 'var(--accent-cyan)' }} />
          Ваші найближчі записи ({stats.upcoming.length})
        </h4>

        {stats.upcoming.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', border: '1px dashed var(--border-glass)', borderRadius: '12px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              У вас немає запланованих занять. Запишіться у вкладці "Календар"! 🏐
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stats.upcoming.map((up) => (
              <div
                key={up.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>
                    {new Date(up.date).toLocaleDateString('uk-UA', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', gap: '8px' }}>
                    <span>{up.game_type === 'competitive' ? '🏆 Змагання' : '🏋️ Тренування'}</span>
                    <span>•</span>
                    <span>{up.location === 'beach' ? '🏖️ Пляж' : '🏟️ Зал'}</span>
                    <span>•</span>
                    <span>⏱️ {up.duration} год</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                  Запис підтверджено ✅
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

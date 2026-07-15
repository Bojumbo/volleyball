require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const bot = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());

// Serve static files from React build folder
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// --- API ROUTES ---

// Bot info (returns bot username so frontend can render Telegram Login Widget)
app.get('/api/bot/info', (req, res) => {
  const username = bot.getBotUsername ? bot.getBotUsername() : (process.env.BOT_USERNAME || '');
  res.json({ username });
});

// Auth / Register user from Telegram WebApp initData
app.post('/api/user/auth', async (req, res) => {
  const { telegram_id, username, first_name, last_name } = req.body;
  if (!telegram_id) {
    return res.status(400).json({ error: 'telegram_id є обовʼязковим полем' });
  }

  try {
    const user = await db.getOrCreateUserByTelegramId({
      telegram_id: telegram_id.toString(),
      username: username || '',
      first_name: first_name || '',
      last_name: last_name || ''
    });
    res.json(user);
  } catch (err) {
    console.error('Помилка авторизації користувача:', err);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

// Get user profile stats
app.get('/api/user/stats/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  try {
    const stats = await db.getUserStats(userId);
    res.json(stats);
  } catch (err) {
    console.error('Помилка отримання статистики користувача:', err);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

// Get sessions for next 14 days
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await db.getSessions();
    res.json(sessions);
  } catch (err) {
    console.error('Помилка отримання сесій:', err);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

// Register user for session
app.post('/api/sessions/register', async (req, res) => {
  const { userId, date, gameType, location, duration } = req.body;
  if (!userId || !date || !gameType || !location || !duration) {
    return res.status(400).json({ error: 'Всі поля обовʼязкові для заповнення' });
  }

  try {
    const result = await db.registerUserForSession(
      parseInt(userId),
      date,
      gameType,
      location,
      parseInt(duration)
    );
    res.json(result);
  } catch (err) {
    console.error('Помилка реєстрації на сесію:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Unregister user from session
app.post('/api/sessions/unregister', async (req, res) => {
  const { userId, date } = req.body;
  if (!userId || !date) {
    return res.status(400).json({ error: 'userId та date є обовʼязковими' });
  }

  try {
    const result = await db.unregisterUserFromSession(parseInt(userId), date);
    res.json(result);
  } catch (err) {
    console.error('Помилка скасування запису:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Submit feedback for a completed session (directly from web app)
app.post('/api/feedback/submit', async (req, res) => {
  const { registrationId, rating, feedback } = req.body;
  if (!registrationId || !rating) {
    return res.status(400).json({ error: 'registrationId та rating є обовʼязковими' });
  }

  try {
    await db.submitFeedback(parseInt(registrationId), parseInt(rating), feedback);
    res.json({ success: true });
  } catch (err) {
    console.error('Помилка відправки відгуку:', err);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});


// Get bot info (like username) for Telegram Widget login
app.get('/api/bot/info', (req, res) => {
  res.json({
    username: bot.getBotUsername() || null
  });
});


// --- ADMIN API ROUTES ---

// Get admin dashboard data
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const data = await db.getAdminDashboardData();
    res.json(data);
  } catch (err) {
    console.error('Помилка отримання даних адмінки:', err);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

// Change max capacity for session
app.post('/api/admin/sessions/capacity', async (req, res) => {
  const { date, maxCapacity } = req.body;
  if (!date || maxCapacity === undefined) {
    return res.status(400).json({ error: 'date та maxCapacity є обовʼязковими' });
  }

  try {
    await db.updateSessionCapacity(date, parseInt(maxCapacity));
    res.json({ success: true });
  } catch (err) {
    console.error('Помилка оновлення ліміту гравців:', err);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

// Set user attendance
app.post('/api/admin/attendance', async (req, res) => {
  const { registrationId, attended } = req.body;
  if (registrationId === undefined || attended === undefined) {
    return res.status(400).json({ error: 'registrationId та attended є обовʼязковими' });
  }

  try {
    const val = attended === null ? null : parseInt(attended);
    await db.updateAttendance(parseInt(registrationId), val);
    res.json({ success: true });
  } catch (err) {
    console.error('Помилка відмітки відвідуваності:', err);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

// Toggle user role
app.post('/api/admin/users/role', async (req, res) => {
  const { userId, role } = req.body;
  if (!userId || !role) {
    return res.status(400).json({ error: 'userId та role є обовʼязковими' });
  }

  try {
    await db.updateUserRole(parseInt(userId), role);
    res.json({ success: true });
  } catch (err) {
    console.error('Помилка зміни ролі користувача:', err);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

// Admin triggers bot feedback surveys for a date manually (all unsent)
app.post('/api/admin/sessions/trigger-survey', async (req, res) => {
  const { date } = req.body;
  if (!date) {
    return res.status(400).json({ error: 'date є обовʼязковим полем' });
  }

  try {
    const result = await bot.sendFeedbackSurveyForDate(date);
    if (!result.success && result.alreadySent) {
      return res.status(409).json({ alreadySent: true, error: result.reason });
    }
    res.json(result);
  } catch (err) {
    console.error('Помилка запуску опитування:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin sends survey to a single user by registrationId
app.post('/api/admin/sessions/trigger-survey-user', async (req, res) => {
  const { registrationId } = req.body;
  if (!registrationId) {
    return res.status(400).json({ error: 'registrationId є обовʼязковим полем' });
  }

  try {
    const result = await bot.sendFeedbackSurveyToUser(parseInt(registrationId));
    if (!result.success && result.alreadySent) {
      return res.status(409).json({ alreadySent: true, error: result.reason });
    }
    res.json(result);
  } catch (err) {
    console.error('Помилка одиночного опитування:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin: delete a user and all their registrations
app.delete('/api/admin/users/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (!userId) return res.status(400).json({ error: 'userId є обовʼязковим' });

  try {
    await db.deleteUser(userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Помилка видалення користувача:', err);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

// Admin: remove a single registration (kick player from session)
app.delete('/api/admin/registrations/:registrationId', async (req, res) => {
  const regId = parseInt(req.params.registrationId);
  if (!regId) return res.status(400).json({ error: 'registrationId є обовʼязковим' });

  try {
    await db.deleteRegistration(regId);
    res.json({ success: true });
  } catch (err) {
    console.error('Помилка видалення запису:', err);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

// Fallback to serving the HTML index for any other requests (React client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// ── Daily auto-survey scheduler at 23:00 Kyiv time (UTC+3) ─────────────────
function scheduleDailySurveys() {
  const kyivOffsetMs = 3 * 60 * 60 * 1000; // UTC+3

  function getNextTargetMs() {
    const utcNow = Date.now();
    const kyivNow = new Date(utcNow + kyivOffsetMs);

    // Build target: today at 23:00 Kyiv
    const target = new Date(kyivNow);
    target.setHours(23, 0, 0, 0);

    // If 23:00 already passed today, aim for tomorrow
    if (target.getTime() <= kyivNow.getTime()) {
      target.setDate(target.getDate() + 1);
    }

    return target.getTime() - kyivNow.getTime();
  }

  function runAndReschedule() {
    const utcNow = Date.now();
    const kyivNow = new Date(utcNow + kyivOffsetMs);
    const todayKyiv = kyivNow.toISOString().split('T')[0];

    console.log(`⏰ Автоматичне опитування о 23:00 для дати: ${todayKyiv}`);
    bot.sendFeedbackSurveyForDate(todayKyiv).then(res => {
      console.log(`📤 Надіслано опитувань: ${res.sentCount || 0}`);
    }).catch(err => {
      console.error('Помилка автоматичного опитування:', err.message);
    });

    // Schedule next run in ~24 hours
    setTimeout(runAndReschedule, getNextTargetMs());
  }

  const msUntilFirst = getNextTargetMs();
  const kyivTarget = new Date(Date.now() + kyivOffsetMs + msUntilFirst);
  console.log(`⏳ Автоматичне опитування заплановано на: ${kyivTarget.toISOString().replace('T', ' ').slice(0, 16)} за Київським часом`);
  setTimeout(runAndReschedule, msUntilFirst);
}

// Start Express and DB
async function startServer() {
  try {
    // 1. Initialize SQLite Database tables
    await db.initDatabase();
    console.log('📦 База даних SQLite успішно ініціалізована.');

    // 2. Initialize Telegram Bot
    bot.initBot(APP_URL);

    // 3. Schedule daily survey at 23:00 Kyiv time
    scheduleDailySurveys();

    // 4. Listen on Port
    app.listen(PORT, () => {
      console.log(`🚀 Сервер запущено на порту ${PORT}`);
      console.log(`🔗 Посилання на додаток: ${APP_URL}`);
    });
  } catch (err) {
    console.error('Помилка запуску програми:', err);
    process.exit(1);
  }
}

startServer();


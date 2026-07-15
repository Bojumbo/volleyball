const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// In Docker: DB_PATH=/data/volleyball.db (mounted volume)
// In local dev: fallback to project directory
const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'volleyball.db');
const db = new sqlite3.Database(dbPath);

// Helper to run query with promise
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Helper to get single row
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Helper to get multiple rows
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Initialize tables
async function initDatabase() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT UNIQUE,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      role TEXT DEFAULT 'user'
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE, -- YYYY-MM-DD
      max_capacity INTEGER DEFAULT 12
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      user_id INTEGER,
      game_type TEXT, -- competitive, training
      location TEXT, -- beach, hall
      duration INTEGER, -- hours (1-4)
      attended INTEGER DEFAULT NULL, -- NULL = pending, 1 = yes, 0 = no
      rating INTEGER DEFAULT NULL, -- 1-5
      feedback TEXT DEFAULT NULL,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(session_id, user_id)
    )
  `);

  // Seed default simulator users if tables are empty
  const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    await dbRun(
      `INSERT INTO users (telegram_id, username, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)`,
      ['admin_test', 'admin_volleyball', 'Адмін', 'Спорту', 'admin']
    );
    await dbRun(
      `INSERT INTO users (telegram_id, username, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)`,
      ['user_test_1', 'alex_vb', 'Олександр', 'Шевченко', 'user']
    );
    await dbRun(
      `INSERT INTO users (telegram_id, username, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)`,
      ['user_test_2', 'maria_spike', 'Марія', 'Ковальчук', 'user']
    );
    await dbRun(
      `INSERT INTO users (telegram_id, username, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)`,
      ['user_test_3', 'dima_block', 'Дмитро', 'Бойко', 'user']
    );
  }

  // Populate calendar for next 14 days
  await syncSessionsCalendar();
}

// Function to generate the date list for next 14 days starting today
function getNext14Days() {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + i);
    const yyyy = nextDate.getFullYear();
    const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
    const dd = String(nextDate.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

// Generate sessions for the next 14 days if not present
async function syncSessionsCalendar() {
  const targetDates = getNext14Days();
  for (const date of targetDates) {
    await dbRun(`INSERT OR IGNORE INTO sessions (date, max_capacity) VALUES (?, 12)`, [date]);
  }
}

// User-related CRUD operations
async function getOrCreateUserByTelegramId(tgUser) {
  const { telegram_id, username, first_name, last_name } = tgUser;
  let user = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [telegram_id]);
  if (!user) {
    await dbRun(
      `INSERT INTO users (telegram_id, username, first_name, last_name, role) VALUES (?, ?, ?, ?, 'user')`,
      [telegram_id, username || '', first_name || '', last_name || '']
    );
    user = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [telegram_id]);
  } else {
    // Keep user info updated
    await dbRun(
      `UPDATE users SET username = ?, first_name = ?, last_name = ? WHERE telegram_id = ?`,
      [username || '', first_name || '', last_name || '', telegram_id]
    );
    user = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [telegram_id]);
  }
  return user;
}

async function getUserById(id) {
  return await dbGet('SELECT * FROM users WHERE id = ?', [id]);
}

async function getAllUsers() {
  return await dbAll('SELECT * FROM users');
}

async function updateUserRole(userId, role) {
  return await dbRun('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
}

// Session operations
async function getSessions() {
  // Sync on each list request to make sure we always have 14 days ahead as time advances
  await syncSessionsCalendar();
  const todayStr = getNext14Days()[0];
  
  // Return sessions from today onwards
  const sessions = await dbAll(
    'SELECT * FROM sessions WHERE date >= ? ORDER BY date ASC LIMIT 14',
    [todayStr]
  );
  
  // Fetch participants for each session
  for (const session of sessions) {
    session.registrations = await dbAll(
      `SELECT r.*, u.username, u.first_name, u.last_name 
       FROM registrations r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.session_id = ?`,
      [session.id]
    );
  }
  
  return sessions;
}

async function updateSessionCapacity(date, capacity) {
  return await dbRun('UPDATE sessions SET max_capacity = ? WHERE date = ?', [capacity, date]);
}

// Registration operations
async function registerUserForSession(userId, date, gameType, location, duration) {
  const session = await dbGet('SELECT * FROM sessions WHERE date = ?', [date]);
  if (!session) throw new Error('Сесія на цю дату не знайдена');

  // Check capacity
  const countRes = await dbGet('SELECT COUNT(*) as count FROM registrations WHERE session_id = ?', [session.id]);
  const currentRegs = countRes.count;

  // Check if user already registered
  const existingReg = await dbGet(
    'SELECT * FROM registrations WHERE session_id = ? AND user_id = ?',
    [session.id, userId]
  );

  if (existingReg) {
    // If updating preferences, allow it
    await dbRun(
      `UPDATE registrations SET game_type = ?, location = ?, duration = ? 
       WHERE session_id = ? AND user_id = ?`,
      [gameType, location, duration, session.id, userId]
    );
    return { status: 'updated' };
  }

  if (currentRegs >= session.max_capacity) {
    throw new Error('Група вже заповнена (ліміт досягнуто)');
  }

  await dbRun(
    `INSERT INTO registrations (session_id, user_id, game_type, location, duration) 
     VALUES (?, ?, ?, ?, ?)`,
    [session.id, userId, gameType, location, duration]
  );
  return { status: 'registered' };
}

async function unregisterUserFromSession(userId, date) {
  const session = await dbGet('SELECT * FROM sessions WHERE date = ?', [date]);
  if (!session) throw new Error('Сесія на цю дату не знайдена');

  await dbRun(
    'DELETE FROM registrations WHERE session_id = ? AND user_id = ?',
    [session.id, userId]
  );
  return { status: 'unregistered' };
}

// User Attendance Stats
async function getUserStats(userId) {
  const attendedRes = await dbGet(
    'SELECT COUNT(*) as count FROM registrations WHERE user_id = ? AND attended = 1',
    [userId]
  );
  const missedRes = await dbGet(
    'SELECT COUNT(*) as count FROM registrations WHERE user_id = ? AND attended = 0',
    [userId]
  );
  
  // Upcoming registrations (sessions in the future)
  const todayStr = getNext14Days()[0];
  const upcomingRegs = await dbAll(
    `SELECT r.*, s.date 
     FROM registrations r 
     JOIN sessions s ON r.session_id = s.id 
     WHERE r.user_id = ? AND s.date >= ? 
     ORDER BY s.date ASC`,
    [userId, todayStr]
  );

  // Past registrations that need feedback
  const pendingFeedback = await dbAll(
    `SELECT r.*, s.date 
     FROM registrations r 
     JOIN sessions s ON r.session_id = s.id 
     WHERE r.user_id = ? AND s.date < ? AND r.attended = 1 AND r.rating IS NULL 
     ORDER BY s.date DESC`,
    [userId, todayStr]
  );

  return {
    attended: attendedRes.count,
    missed: missedRes.count,
    upcoming: upcomingRegs,
    pendingFeedback: pendingFeedback
  };
}

// Admin / Bot updates attendance
async function updateAttendance(registrationId, attended) {
  return await dbRun('UPDATE registrations SET attended = ? WHERE id = ?', [attended, registrationId]);
}

// Mark attendance directly by session and user
async function updateAttendanceByUserAndSession(userId, sessionId, attended) {
  return await dbRun(
    'UPDATE registrations SET attended = ? WHERE user_id = ? AND session_id = ?',
    [attended, userId, sessionId]
  );
}

// Submit feedback
async function submitFeedback(registrationId, rating, feedback) {
  return await dbRun(
    'UPDATE registrations SET rating = ?, feedback = ? WHERE id = ?',
    [rating, feedback || null, registrationId]
  );
}

// Admin stats
async function getAdminDashboardData() {
  const users = await dbAll(`
    SELECT u.*, 
      (SELECT COUNT(*) FROM registrations r WHERE r.user_id = u.id AND r.attended = 1) as attended_count,
      (SELECT COUNT(*) FROM registrations r WHERE r.user_id = u.id AND r.attended = 0) as missed_count
    FROM users u
  `);

  const feedbackLogs = await dbAll(`
    SELECT r.rating, r.feedback, r.attended, u.first_name, u.last_name, u.username, s.date
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    JOIN sessions s ON r.session_id = s.id
    WHERE r.rating IS NOT NULL OR r.feedback IS NOT NULL
    ORDER BY s.date DESC
  `);

  return {
    users,
    feedbackLogs
  };
}

module.exports = {
  initDatabase,
  getOrCreateUserByTelegramId,
  getUserById,
  getAllUsers,
  updateUserRole,
  getSessions,
  updateSessionCapacity,
  registerUserForSession,
  unregisterUserFromSession,
  getUserStats,
  updateAttendance,
  updateAttendanceByUserAndSession,
  submitFeedback,
  getAdminDashboardData,
  dbAll,
  dbGet
};

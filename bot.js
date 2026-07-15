const TelegramBotRaw = require('node-telegram-bot-api');
const TelegramBot = typeof TelegramBotRaw === 'function'
  ? TelegramBotRaw
  : (TelegramBotRaw.TelegramBot || TelegramBotRaw.default);
const db = require('./database');

let bot = null;
let botUsername = '';
const userStates = {}; // Simple in-memory user states for feedback text flow

function initBot(appUrl) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️ TELEGRAM_BOT_TOKEN не вказано у .env файлі. Бот працюватиме у тестовому режимі без Telegram API.');
    return null;
  }

  // Use polling for local development
  bot = new TelegramBot(token, { polling: true });
  console.log('🤖 Telegram Bot успішно запущено.');

  // Fetch bot info dynamically
  bot.getMe().then(me => {
    botUsername = me.username;
    console.log(`🤖 Бот отримав ім'я: @${botUsername}`);
  }).catch(err => {
    console.warn('⚠️ Не вдалося отримати імʼя бота через API:', err.message);
  });

  // ── Persistent Menu Button ──────────────────────────────────────────────
  // Set a WebApp button that always shows in the bottom of every chat with the bot.
  // This is the button users see without having to type any command.
  bot.setChatMenuButton({
    menu_button: {
      type: 'web_app',
      text: 'Відкрити Волейбол 🏐',
      web_app: { url: appUrl }
    }
  }).then(() => {
    console.log('✅ Menu button встановлено: "Відкрити Волейбол 🏐"');
  }).catch(err => {
    console.warn('⚠️ Не вдалося встановити menu button:', err.message);
  });

  // ── Register Bot Commands in the / menu ─────────────────────────────────
  bot.setMyCommands([
    { command: 'start', description: 'Відкрити додаток для запису на заняття 🏐' },
    { command: 'stats', description: 'Переглянути мою статистику відвідувань 📊' }
  ]).catch(err => console.warn('⚠️ Не вдалося встановити команди:', err.message));

  // Handle /start command
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const tgUser = {
      telegram_id: msg.from.id.toString(),
      username: msg.from.username || '',
      first_name: msg.from.first_name || '',
      last_name: msg.from.last_name || ''
    };

    try {
      const user = await db.getOrCreateUserByTelegramId(tgUser);
      
      const welcomeMessage = `Привіт, ${user.first_name || 'гравець'}! 👋\n\n` +
        `Ласкаво просимо до нашого волейбольного клубу! 🏐\n\n` +
        `За допомогою цього додатка ти можеш:\n` +
        `📅 Переглядати календар і реєструватись на ігри за 2 тижні вперед.\n` +
        `⚙️ Обирати зручний формат: пляжний чи зал, тренування чи змагання.\n` +
        `📊 Переглядати свою статистику відвідувань та продуктивності.\n\n` +
        `Натискай на кнопку нижче, щоб відкрити додаток! 👇`;

      bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: {
          inline_keyboard: [
            // Primary button — opens the Mini App inline inside Telegram (No browser fallback)
            [{ text: '🏐 Відкрити додаток', web_app: { url: appUrl } }]
          ]
        }
      });
    } catch (err) {
      console.error('Помилка в /start:', err);
      bot.sendMessage(chatId, 'Сталася помилка при ініціалізації профілю. Спробуйте пізніше.');
    }
  });

  // Handle /stats command
  bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();

    try {
      const user = await db.getOrCreateUserByTelegramId({
        telegram_id: telegramId,
        username: msg.from.username,
        first_name: msg.from.first_name,
        last_name: msg.from.last_name
      });

      const stats = await db.getUserStats(user.id);
      const total = stats.attended + stats.missed;
      const rate = total > 0 ? Math.round((stats.attended / total) * 100) : 0;

      const statsMessage = `📊 *Твоя статистика відвідуваності:*\n\n` +
        `🏐 Відвідано занять: *${stats.attended}*\n` +
        `❌ Пропущено занять: *${stats.missed}*\n` +
        `📈 Відсоток відвідуваності: *${rate}%*\n\n` +
        `Найближчих записів на ігри: *${stats.upcoming.length}*`;

      bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Помилка в /stats:', err);
      bot.sendMessage(chatId, 'Не вдалося отримати статистику.');
    }
  });

  // Handle callback queries (inline buttons)
  bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const chatId = message.chat.id;
    const data = callbackQuery.data;

    // Acknowledge the callback query
    bot.answerCallbackQuery(callbackQuery.id);

    try {
      // 1. Attendance survey response
      if (data.startsWith('att_')) {
        const parts = data.split('_'); // att_[yes/no]_[registrationId]
        const isAttended = parts[1] === 'yes';
        const regId = parseInt(parts[2]);

        await db.updateAttendance(regId, isAttended ? 1 : 0);

        if (isAttended) {
          // Send rating question
          bot.editMessageText(
            'Чудово! Раді, що ви були на тренуванні. 👍\n\n' +
            'Наскільки продуктивним та цікавим було це заняття? Оцініть від 1 до 5 зірок: ⭐',
            {
              chat_id: chatId,
              message_id: message.message_id,
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '1 ⭐', callback_data: `rate_1_${regId}` },
                    { text: '2 ⭐', callback_data: `rate_2_${regId}` },
                    { text: '3 ⭐', callback_data: `rate_3_${regId}` },
                    { text: '4 ⭐', callback_data: `rate_4_${regId}` },
                    { text: '5 ⭐', callback_data: `rate_5_${regId}` }
                  ]
                ]
              }
            }
          );
        } else {
          // Send missed message
          bot.editMessageText(
            'Зрозуміло, відмітили вас як відсутнього. Шкода, що не змогли прийти. Чекаємо наступного разу! 🏐',
            { chat_id: chatId, message_id: message.message_id }
          );
        }
      }
      
      // 2. Rating submission
      else if (data.startsWith('rate_')) {
        const parts = data.split('_'); // rate_[rating]_[registrationId]
        const rating = parseInt(parts[1]);
        const regId = parseInt(parts[2]);

        await db.submitFeedback(regId, rating, null);

        // Put user in state to receive comments
        userStates[chatId] = {
          action: 'awaiting_feedback_text',
          registrationId: regId
        };

        bot.editMessageText(
          `Ваша оцінка: ${'⭐'.repeat(rating)}\n\n` +
          `Будь ласка, напишіть короткий відгук або побажання текстовим повідомленням у цей чат.\n\n` +
          `Якщо не хочете писати текст, натисніть кнопку "Пропустити" нижче.`,
          {
            chat_id: chatId,
            message_id: message.message_id,
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Пропустити відгук ⏭️', callback_data: `skip_fb_${regId}` }]
              ]
            }
          }
        );
      }

      // 3. Skip feedback text
      else if (data.startsWith('skip_fb_')) {
        const parts = data.split('_'); // skip_fb_[registrationId]
        const regId = parseInt(parts[2]);

        // Clear user state
        if (userStates[chatId] && userStates[chatId].registrationId === regId) {
          delete userStates[chatId];
        }

        bot.editMessageText(
          'Дякуємо! Вашу оцінку успішно збережено. До зустрічі на грі! 🏐',
          { chat_id: chatId, message_id: message.message_id }
        );
      }
    } catch (err) {
      console.error('Помилка в callback_query:', err);
      bot.sendMessage(chatId, 'Сталася помилка при збереженні ваших відповідей.');
    }
  });

  // Handle normal text messages (e.g. for submitting text feedback)
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Ignore commands
    if (text && text.startsWith('/')) return;

    const state = userStates[chatId];
    if (state && state.action === 'awaiting_feedback_text') {
      const regId = state.registrationId;
      try {
        // Fetch current rating to keep it
        const reg = await db.dbGet('SELECT rating FROM registrations WHERE id = ?', [regId]);
        const rating = reg ? reg.rating : 5;

        await db.submitFeedback(regId, rating, text);
        delete userStates[chatId];

        bot.sendMessage(chatId, 'Дякуємо! Ваш відгук записано. До зустрічі на майданчику! 🏐');
      } catch (err) {
        console.error('Помилка при збереженні тексту відгуку:', err);
        bot.sendMessage(chatId, 'Не вдалося зберегти відгук. Але оцінку ми зафіксували!');
        delete userStates[chatId];
      }
    }
  });

  return bot;
}

// Function to send feedback survey to a specific registration
async function sendFeedbackSurvey(registrationId) {
  if (!bot) return false;

  try {
    const registration = await db.dbGet(
      `SELECT r.id, u.telegram_id, s.date 
       FROM registrations r 
       JOIN users u ON r.user_id = u.id 
       JOIN sessions s ON r.session_id = s.id 
       WHERE r.id = ?`,
      [registrationId]
    );

    if (!registration || !registration.telegram_id) return false;

    // Format date beautifully
    const sessionDate = registration.date;

    await bot.sendMessage(
      registration.telegram_id,
      `🏐 Привіт! Ти був на сьогоднішньому (${sessionDate}) занятті з волейболу?`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Так, був 👍', callback_data: `att_yes_${registration.id}` },
              { text: 'Ні, не був ❌', callback_data: `att_no_${registration.id}` }
            ]
          ]
        }
      }
    );
    return true;
  } catch (err) {
    console.error(`Не вдалося надіслати опитування для запису ${registrationId}:`, err);
    return false;
  }
}

// Helper to broadcast survey to all attendees of a specific date
async function sendFeedbackSurveyForDate(date) {
  if (!bot) return { success: false, reason: 'Бот не активований' };

  try {
    const session = await db.dbGet('SELECT id FROM sessions WHERE date = ?', [date]);
    if (!session) return { success: false, reason: 'Сесія не знайдена' };

    const registrations = await db.dbAll(
      'SELECT id, user_id FROM registrations WHERE session_id = ?',
      [session.id]
    );

    let sentCount = 0;
    for (const reg of registrations) {
      const success = await sendFeedbackSurvey(reg.id);
      if (success) sentCount++;
    }

    return { success: true, sentCount };
  } catch (err) {
    console.error('Помилка при розсилці опитувань:', err);
    return { success: false, reason: err.message };
  }
}

module.exports = {
  initBot,
  sendFeedbackSurvey,
  sendFeedbackSurveyForDate,
  getBotInstance: () => bot,
  getBotUsername: () => botUsername
};

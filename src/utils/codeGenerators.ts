import { BotConfig } from '../types';

export function generateWorkerJs(config: BotConfig): string {
  return `/**
 * 3x-ui Client Traffic & Data Usage Checker Telegram Bot
 * Deployed on Cloudflare Workers (Serverless)
 *
 * Generated via 3x-ui Telegram Bot Cloudflare Hub
 */

// In-memory cookie cache for session reuse across worker invocations
let cachedSessionCookie = '';
let cachedCookieExpiry = 0;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Root GET: Status check & health info
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return new Response(JSON.stringify({
        status: 'online',
        service: '3x-ui Telegram Bot Worker',
        timestamp: new Date().toISOString(),
        instructions: 'Send Telegram webhook POST updates to this endpoint.'
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Only accept POST for Telegram Webhook
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Optional: Secret Token Verification
    if (env.BOT_SECRET_TOKEN) {
      const secretHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
      if (secretHeader !== env.BOT_SECRET_TOKEN) {
        return new Response('Unauthorized Webhook Secret', { status: 401 });
      }
    }

    try {
      const update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update, env));
      return new Response('OK', { status: 200 });
    } catch (err) {
      console.error('Error handling webhook update:', err);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};

/**
 * Handle incoming Telegram update (messages or inline buttons)
 */
async function handleTelegramUpdate(update, env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('Missing TELEGRAM_BOT_TOKEN secret');
    return;
  }

  // Handle Callback Queries (Inline Button Clicks)
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query, env);
    return;
  }

  // Handle Regular Chat Messages
  if (update.message && update.message.text) {
    await handleTextMessage(update.message, env);
  }
}

/**
 * Handle text messages & commands
 */
async function handleTextMessage(message, env) {
  const chatId = message.chat.id;
  const fromId = message.from?.id;
  const rawText = message.text.trim();
  const lang = env.BOT_LANGUAGE || '${config.language}';

  // 1. /start or /help Command
  if (rawText === '/start' || rawText === '/help') {
    await sendWelcomeMessage(chatId, fromId, env);
    return;
  }

  // 2. /myusage Command (Lookup by Telegram user ID in 3x-ui client settings)
  if (rawText === '/myusage' || rawText === '/me') {
    await checkClientByTelegramId(chatId, fromId, env);
    return;
  }

  // 3. /admin Command (Admin only)
  if (rawText === '/admin' || rawText === '/stats') {
    if (env.ADMIN_TELEGRAM_ID && String(fromId) === String(env.ADMIN_TELEGRAM_ID)) {
      await sendAdminSummary(chatId, env);
    } else {
      await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, '⛔ <i>Access denied. Administrator only.</i>');
    }
    return;
  }

  // 4. /check <query> or /usage <query>
  let query = rawText;
  if (rawText.startsWith('/check') || rawText.startsWith('/usage')) {
    const parts = rawText.split(/\\s+/);
    if (parts.length > 1) {
      query = parts.slice(1).join(' ').trim();
    } else {
      await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, getTranslation('howToCheck', lang));
      return;
    }
  }

  // 5. Query 3x-ui panel with client email, UUID, or subId
  await checkClientTraffic(chatId, query, env, null);
}

/**
 * Handle inline button callbacks
 */
async function handleCallbackQuery(cbQuery, env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = cbQuery.message?.chat?.id;
  const messageId = cbQuery.message?.message_id;
  const fromId = cbQuery.from?.id;
  const data = cbQuery.data;

  // Acknowledge callback immediately to dismiss loading spinner in Telegram
  await answerCallbackQuery(botToken, cbQuery.id);

  if (data === 'action_my_usage') {
    await checkClientByTelegramId(chatId, fromId, env);
  } else if (data.startsWith('refresh:')) {
    const clientQuery = data.substring(8);
    await checkClientTraffic(chatId, clientQuery, env, messageId);
  } else if (data.startsWith('sub:')) {
    const subId = data.substring(4);
    const panelUrl = getCleanPanelUrl(env);
    const subUrl = \`\${panelUrl}/sub/\${subId}\`;
    const text = \`🔗 <b>Subscription Link</b>\\n\\n<code>\${subUrl}</code>\\n\\n<i>Copy and paste this link into v2rayN, v2rayNG, Sing-box, Nekobox, or Clash.</i>\`;
    await sendTelegramMessage(botToken, chatId, text);
  } else if (data === 'action_help') {
    await sendWelcomeMessage(chatId, fromId, env);
  }
}

/**
 * Send welcome message with inline buttons
 */
async function sendWelcomeMessage(chatId, fromId, env) {
  const lang = env.BOT_LANGUAGE || '${config.language}';
  const welcomeText = getTranslation('welcome', lang);

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: getTranslation('btnMyUsage', lang), callback_data: 'action_my_usage' }
      ],
      [
        { text: 'ℹ️ ' + getTranslation('btnCheckAnother', lang), callback_data: 'action_help' }
      ]
    ]
  };

  await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, welcomeText, inlineKeyboard);
}

/**
 * Check client by Telegram ID (searches inbounds for client with tgId == fromId)
 */
async function checkClientByTelegramId(chatId, fromId, env) {
  const lang = env.BOT_LANGUAGE || '${config.language}';
  try {
    const cookie = await get3xuiSession(env);
    const panelUrl = getCleanPanelUrl(env);
    const listResp = await fetch(\`\${panelUrl}/panel/api/inbounds/list\`, {
      method: 'GET',
      headers: { Cookie: cookie, Accept: 'application/json' }
    });

    if (!listResp.ok) {
      throw new Error(\`Failed to query 3x-ui inbounds: HTTP \${listResp.status}\`);
    }

    const data = await listResp.json();
    if (!data.success || !Array.isArray(data.obj)) {
      throw new Error('Invalid 3x-ui panel response');
    }

    // Find client with matching tgId
    let foundClient = null;
    for (const inbound of data.obj) {
      let clients = [];
      try {
        const settings = JSON.parse(inbound.settings || '{}');
        clients = settings.clients || [];
      } catch {
        clients = [];
      }

      const clientStats = inbound.clientStats || [];
      for (const c of clients) {
        if (String(c.tgId) === String(fromId)) {
          const stat = clientStats.find(s => s.email === c.email) || {};
          foundClient = {
            email: c.email,
            id: c.id,
            subId: c.subId,
            tgId: c.tgId,
            enable: c.enable !== undefined ? c.enable : stat.enable,
            up: stat.up || 0,
            down: stat.down || 0,
            total: c.totalGB ? c.totalGB * 1024 * 1024 * 1024 : (stat.total || 0),
            expiryTime: c.expiryTime || stat.expiryTime || 0,
            inboundTag: inbound.tag || inbound.remark,
          };
          break;
        }
      }
      if (foundClient) break;
    }

    if (!foundClient) {
      const msg = \`⚠️ <b>No Account Linked to Your Telegram ID (\${fromId})</b>\\n\\nYour Telegram ID is not assigned to any client in the 3x-ui panel.\\n\\nPlease check by typing your email or UUID instead:\\n<code>/check your-email@domain.com</code>\`;
      await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, msg);
      return;
    }

    await renderAndSendClientCard(chatId, foundClient, env, null);
  } catch (err) {
    console.error('Error in checkClientByTelegramId:', err);
    await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, \`⚠️ <i>Error connecting to 3x-ui panel: \${err.message}</i>\`);
  }
}

/**
 * Check client traffic by query (Email, UUID, or SubID)
 */
async function checkClientTraffic(chatId, query, env, editMessageId = null) {
  const lang = env.BOT_LANGUAGE || '${config.language}';
  try {
    const cookie = await get3xuiSession(env);
    const panelUrl = getCleanPanelUrl(env);

    // Method 1: Direct endpoint getClientTraffics/{email}
    let client = null;
    const trafficResp = await fetch(\`\${panelUrl}/panel/api/inbounds/getClientTraffics/\${encodeURIComponent(query)}\`, {
      method: 'GET',
      headers: { Cookie: cookie, Accept: 'application/json' }
    });

    if (trafficResp.ok) {
      const trafficData = await trafficResp.json();
      if (trafficData.success && trafficData.obj) {
        client = trafficData.obj;
      }
    }

    // Method 2: Search via /panel/api/inbounds/list (supports UUID, SubID, Email)
    if (!client) {
      const listResp = await fetch(\`\${panelUrl}/panel/api/inbounds/list\`, {
        method: 'GET',
        headers: { Cookie: cookie, Accept: 'application/json' }
      });

      if (listResp.ok) {
        const listData = await listResp.json();
        if (listData.success && Array.isArray(listData.obj)) {
          for (const inbound of listData.obj) {
            let clients = [];
            try {
              const settings = JSON.parse(inbound.settings || '{}');
              clients = settings.clients || [];
            } catch {
              clients = [];
            }
            const clientStats = inbound.clientStats || [];

            for (const c of clients) {
              const match =
                c.email?.toLowerCase() === query.toLowerCase() ||
                c.id?.toLowerCase() === query.toLowerCase() ||
                c.subId?.toLowerCase() === query.toLowerCase();

              if (match) {
                const stat = clientStats.find(s => s.email === c.email) || {};
                client = {
                  email: c.email,
                  id: c.id,
                  subId: c.subId,
                  tgId: c.tgId,
                  enable: c.enable !== undefined ? c.enable : stat.enable,
                  up: stat.up || 0,
                  down: stat.down || 0,
                  total: c.totalGB ? c.totalGB * 1024 * 1024 * 1024 : (stat.total || 0),
                  expiryTime: c.expiryTime || stat.expiryTime || 0,
                  inboundTag: inbound.tag || inbound.remark,
                };
                break;
              }
            }
            if (client) break;
          }
        }
      }
    }

    if (!client) {
      await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, getTranslation('notFound', lang));
      return;
    }

    await renderAndSendClientCard(chatId, client, env, editMessageId);
  } catch (err) {
    console.error('Error querying 3x-ui client:', err);
    await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, \`❌ <i>Error contacting panel: \${err.message}</i>\`);
  }
}

/**
 * Format and send/edit Telegram card
 */
async function renderAndSendClientCard(chatId, client, env, editMessageId = null) {
  const lang = env.BOT_LANGUAGE || '${config.language}';
  const style = '${config.progressStyle}';
  const cardText = formatTelegramCard(client, lang, style);

  // Build inline keyboard
  const buttons = [];
  const row1 = [];

  if (${config.enableRefreshButton}) {
    row1.push({
      text: getTranslation('btnRefresh', lang),
      callback_data: \`refresh:\${client.email}\`
    });
  }

  if (${config.enableSubLink} && client.subId) {
    row1.push({
      text: getTranslation('btnSubLink', lang),
      callback_data: \`sub:\${client.subId}\`
    });
  }

  if (row1.length > 0) buttons.push(row1);

  buttons.push([
    { text: getTranslation('btnMyUsage', lang), callback_data: 'action_my_usage' }
  ]);

  const replyMarkup = { inline_keyboard: buttons };

  if (editMessageId) {
    await editTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, editMessageId, cardText, replyMarkup);
  } else {
    await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, cardText, replyMarkup);
  }
}

/**
 * Authenticate with 3x-ui and obtain session cookie (with caching)
 */
async function get3xuiSession(env) {
  const now = Date.now();
  if (cachedSessionCookie && now < cachedCookieExpiry) {
    return cachedSessionCookie;
  }

  const panelUrl = getCleanPanelUrl(env);
  const username = env.PANEL_USERNAME;
  const password = env.PANEL_PASSWORD;

  if (!username || !password) {
    throw new Error('PANEL_USERNAME and PANEL_PASSWORD must be configured');
  }

  const loginUrl = \`\${panelUrl}/login\`;
  const body = new URLSearchParams();
  body.append('username', username);
  body.append('password', password);

  const resp = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Cloudflare-Worker-3xui-Bot/1.0'
    },
    body: body.toString()
  });

  if (!resp.ok) {
    throw new Error(\`3x-ui login failed: HTTP \${resp.status}\`);
  }

  const setCookie = resp.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('No session cookie returned by 3x-ui panel');
  }

  const match = setCookie.match(/session=([^;]+)/);
  const cookie = match ? match[0] : setCookie.split(';')[0];

  cachedSessionCookie = cookie;
  // Cache session for 30 minutes
  cachedCookieExpiry = now + (${config.cacheSessionDurationSeconds} * 1000);
  return cookie;
}

/**
 * Admin stats overview
 */
async function sendAdminSummary(chatId, env) {
  try {
    const cookie = await get3xuiSession(env);
    const panelUrl = getCleanPanelUrl(env);
    const resp = await fetch(\`\${panelUrl}/panel/api/inbounds/list\`, {
      headers: { Cookie: cookie, Accept: 'application/json' }
    });

    const data = await resp.json();
    if (!data.success || !Array.isArray(data.obj)) {
      throw new Error('Could not retrieve inbound stats');
    }

    let totalInbounds = data.obj.length;
    let totalClients = 0;
    let totalUp = 0;
    let totalDown = 0;

    for (const inb of data.obj) {
      try {
        const s = JSON.parse(inb.settings || '{}');
        totalClients += (s.clients || []).length;
      } catch {}
      totalUp += inb.up || 0;
      totalDown += inb.down || 0;
    }

    const msg = \`🛠 <b>3x-ui Admin Overview</b>\\n━━━━━━━━━━━━━━━━━━━━\\n\` +
      \`📡 <b>Inbounds:</b> \${totalInbounds}\\n\` +
      \`👥 <b>Total Clients:</b> \${totalClients}\\n\` +
      \`⬆️ <b>Total Upload:</b> \${formatBytes(totalUp)}\\n\` +
      \`⬇️ <b>Total Download:</b> \${formatBytes(totalDown)}\\n\` +
      \`🔄 <b>Panel Traffic:</b> \${formatBytes(totalUp + totalDown)}\\n\` +
      \`━━━━━━━━━━━━━━━━━━━━\\n🕒 <i>\${new Date().toUTCString()}</i>\`;

    await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, msg);
  } catch (err) {
    await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, \`Admin stats error: \${err.message}\`);
  }
}

/**
 * Format bytes to readable string
 */
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return \`\${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} \${sizes[i]}\`;
}

/**
 * Render visual progress bar
 */
function renderProgressBar(used, total, style = 'blocks', length = 10) {
  if (!total || total <= 0) return { bar: '∞ (Unlimited)', percentage: 0 };
  const percentage = Math.min(100, Math.max(0, (used / total) * 100));
  const filledCount = Math.round((percentage / 100) * length);
  const emptyCount = length - filledCount;

  let filledChar = '▰';
  let emptyChar = '▱';
  if (style === 'solid') { filledChar = '█'; emptyChar = '░'; }
  else if (style === 'dots') { filledChar = '●'; emptyChar = '○'; }
  else if (style === 'squares') { filledChar = '■'; emptyChar = '□'; }

  const bar = \`[ \${filledChar.repeat(filledCount)}\${emptyChar.repeat(emptyCount)} ]\`;
  return { bar, percentage: Number(percentage.toFixed(1)) };
}

/**
 * Format expiration date
 */
function formatExpiry(timestampMs, lang = 'en') {
  if (!timestampMs || timestampMs <= 0) {
    return { text: 'Unlimited (No Expiration)', isExpired: false };
  }
  const now = Date.now();
  const dateStr = new Date(timestampMs).toISOString().split('T')[0];
  const diffDays = Math.ceil((timestampMs - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: \`\${dateStr} (Expired \${Math.abs(diffDays)} days ago)\`, isExpired: true };
  } else if (diffDays === 0) {
    return { text: \`\${dateStr} (Expires Today)\`, isExpired: false };
  } else {
    return { text: \`\${dateStr} (\${diffDays} days remaining)\`, isExpired: false };
  }
}

/**
 * Format full Telegram usage message
 */
function formatTelegramCard(client, lang = 'en', style = 'blocks') {
  const used = (client.up || 0) + (client.down || 0);
  const total = client.total || 0;
  const { bar, percentage } = renderProgressBar(used, total, style, 10);
  const { text: expiryText, isExpired } = formatExpiry(client.expiryTime, lang);

  let statusText = 'Active 🟢';
  if (!client.enable) statusText = 'Disabled 🔴';
  else if (isExpired) statusText = 'Expired ⏳';
  else if (total > 0 && used >= total) statusText = 'Quota Exceeded ⚠️';

  const usedFormatted = formatBytes(used);
  const totalFormatted = total > 0 ? formatBytes(total) : '∞';
  const remainingFormatted = total > 0 ? formatBytes(Math.max(0, total - used)) : '∞';
  const timeStr = new Date().toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC';

  let msg = \`📊 <b>Client Traffic Report</b>\\n\`;
  msg += \`━━━━━━━━━━━━━━━━━━━━\\n\`;
  msg += \`👤 <b>Client:</b> <code>\${client.email}</code>\\n\`;
  msg += \`📶 <b>Status:</b> \${statusText}\\n\\n\`;
  msg += \`⬆️ <b>Upload:</b> \${formatBytes(client.up || 0)}\\n\`;
  msg += \`⬇️ <b>Download:</b> \${formatBytes(client.down || 0)}\\n\`;
  msg += \`🔄 <b>Total Used:</b> \${usedFormatted} / \${totalFormatted}\\n\`;
  msg += \`⏳ <b>Remaining:</b> \${remainingFormatted}\`;

  if (total > 0) {
    const leftPercent = Math.max(0, 100 - percentage).toFixed(1);
    msg += \` (\${leftPercent}% left)\`;
  }
  msg += \`\\n\\n\`;

  if (total > 0) {
    msg += \`\${bar} <b>\${percentage}%</b>\\n\\n\`;
  }

  msg += \`📅 <b>Expiration Date:</b>\\n\${expiryText}\\n\`;
  msg += \`━━━━━━━━━━━━━━━━━━━━\\n\`;
  msg += \`🕒 <i>Last checked: \${timeStr}</i>\`;
  return msg;
}

/**
 * Translations dictionary
 */
function getTranslation(key, lang = 'en') {
  const dictionary = {
    en: {
      welcome: '👋 <b>Welcome to 3x-ui Traffic Bot!</b>\\n\\nCheck your VPN subscription data usage, upload/download limits, and expiration date in real-time.\\n\\n👇 Click a button below or send your client email/UUID directly:',
      btnMyUsage: '⚡ Check My Usage',
      btnRefresh: '🔄 Refresh Usage',
      btnSubLink: '🔗 Subscription Link',
      btnCheckAnother: '🔍 How to Check',
      notFound: '❌ <b>Client Not Found</b>\\n\\nCould not find any active account with that email or UUID. Please check spelling or contact administrator.',
      howToCheck: 'Send: <code>/check email@domain.com</code> or just send your email or client key directly.',
    },
    si: {
      welcome: '👋 <b>3x-ui දත්ත භාවිතය පරීක්ෂා කිරීමේ Bot වෙත සාදරයෙන් පිළිගනිමු!</b>\\n\\nඔබගේ VPN ගිණුමේ දත්ත භාවිතය (Data Usage), Upload/Download ප්‍රමාණය සහ කල් ඉකුත්වන දිනය පහසුවෙන් බලාගන්න.\\n\\n👇 පහත බොත්තමක් ඔබන්න හෝ ඔබගේ Email / Key එක එවන්න:',
      btnMyUsage: '⚡ මගේ දත්ත බලන්න',
      btnRefresh: '🔄 නැවත පරීක්ෂා කරන්න',
      btnSubLink: '🔗 Subscription ලින්ක් එක',
      btnCheckAnother: '🔍 පරීක්ෂා කරන ආකාරය',
      notFound: '❌ <b>ගිණුම සොයාගත නොහැකි විය</b>\\n\\nඔබ ඇතුළත් කළ Email හෝ Key එකට අදාළ ගිණුමක් හමු නොවීය. කරුණාකර නිවැරදිදැයි පරීක්ෂා කරන්න.',
      howToCheck: 'භාවිතය: <code>/check email@domain.com</code> හෝ ඔබගේ ඊමේල් ලිපිනය එවන්න.',
    }
  };
  const activeLang = dictionary[lang] || dictionary.en;
  return activeLang[key] || dictionary.en[key] || '';
}

/**
 * Normalize panel URL
 */
function getCleanPanelUrl(env) {
  let url = (env.PANEL_URL || '').trim().replace(/\\/+$/, '');
  const basePath = (env.PANEL_WEB_BASE_PATH || '').trim();
  if (basePath && basePath !== '/') {
    url = url + '/' + basePath.replace(/^\\/+/, '').replace(/\\/+$/, '');
  }
  return url;
}

/**
 * Telegram API Helpers
 */
async function sendTelegramMessage(botToken, chatId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;

  return fetch(\`https://api.telegram.org/bot\${botToken}/sendMessage\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function editTelegramMessage(botToken, chatId, messageId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;

  return fetch(\`https://api.telegram.org/bot\${botToken}/editMessageText\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function answerCallbackQuery(botToken, callbackQueryId) {
  return fetch(\`https://api.telegram.org/bot\${botToken}/answerCallbackQuery\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId })
  });
}
`;
}

export function generateWranglerToml(config: BotConfig): string {
  const safeName = config.botName.toLowerCase().replace(/[^a-z0-9_-]/g, '-') || 'xui-telegram-bot';
  const cleanPanel = config.panelUrl || 'https://your-panel-domain.com:2053';

  return `name = "${safeName}"
main = "worker.js"
compatibility_date = "2024-09-01"

# Environment Variables (Public/Non-sensitive configuration)
[vars]
PANEL_URL = "${cleanPanel}"
PANEL_WEB_BASE_PATH = "${config.panelBasePath || '/'}"
BOT_LANGUAGE = "${config.language || 'en'}"
${config.adminTelegramId ? `ADMIN_TELEGRAM_ID = "${config.adminTelegramId}"` : '# ADMIN_TELEGRAM_ID = "123456789"'}

# Secrets (Add these securely via Wrangler CLI or Cloudflare Dashboard)
# Do NOT put secret tokens and passwords directly in this file for security!
#
# Terminal Commands to set secrets:
#   npx wrangler secret put TELEGRAM_BOT_TOKEN
#   npx wrangler secret put PANEL_USERNAME
#   npx wrangler secret put PANEL_PASSWORD
#   npx wrangler secret put BOT_SECRET_TOKEN
`;
}

export function generateReadme(config: BotConfig): string {
  return `# 🚀 3x-ui Telegram Bot on Cloudflare Workers

A serverless Telegram Bot running 24/7 on Cloudflare Workers (0-cost tier) to check client data usage, traffic limits, and expiration dates from your 3x-ui panel.

---

## 📋 Prerequisites
1. **Telegram Bot Token**: Get one from [@BotFather](https://t.me/BotFather) on Telegram.
2. **Cloudflare Account**: Free account at [cloudflare.com](https://dash.cloudflare.com).
3. **3x-ui Panel**: With public IP or domain and accessible port (e.g., \`https://vpn.example.com:2053\`).

---

## ⚡ Quick Deployment (2 Methods)

### Method 1: Using Wrangler CLI (Recommended)

1. **Install Wrangler & Login:**
   \`\`\`bash
   npm install -g wrangler
   wrangler login
   \`\`\`

2. **Initialize & Deploy:**
   Place \`worker.js\` and \`wrangler.toml\` in a new folder:
   \`\`\`bash
   wrangler deploy
   \`\`\`

3. **Set Your Secrets in Cloudflare:**
   \`\`\`bash
   wrangler secret put TELEGRAM_BOT_TOKEN
   # Paste your bot token from @BotFather

   wrangler secret put PANEL_USERNAME
   # Enter your 3x-ui admin username

   wrangler secret put PANEL_PASSWORD
   # Enter your 3x-ui admin password

   wrangler secret put BOT_SECRET_TOKEN
   # Optional: Any random string for webhook security
   \`\`\`

4. **Set Webhook on Telegram:**
   Replace with your Worker URL:
   \`\`\`bash
   curl -F "url=https://YOUR_WORKER.workers.dev" https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
   \`\`\`

---

### Method 2: Cloudflare Web Dashboard (No Terminal Required)

1. Open **Cloudflare Dashboard** -> **Workers & Pages** -> **Create Application** -> **Create Worker**.
2. Click **Deploy**.
3. Click **Edit Code**, replace the entire contents with \`worker.js\`, and click **Deploy**.
4. Go to **Settings** -> **Variables and Secrets**:
   - Add Secret: \`TELEGRAM_BOT_TOKEN\` (Your Bot Token)
   - Add Secret: \`PANEL_USERNAME\` (3x-ui Admin user)
   - Add Secret: \`PANEL_PASSWORD\` (3x-ui Admin password)
   - Add Variable: \`PANEL_URL\` (\`${config.panelUrl || 'https://your-domain.com:2053'}\`)
   - Add Variable: \`BOT_LANGUAGE\` (\`${config.language}\`)
5. Open our Webhook Setup Tool in this hub and click **Set Webhook**!

---

## 🤖 Supported Bot Commands

- \`/start\` - Welcome screen & interactive quick buttons
- \`/myusage\` - Instantly check usage if your Telegram ID is linked in 3x-ui client settings
- \`/check <email/UUID>\` - Check traffic for specific user (e.g., \`/check user@gmail.com\`)
- Send Email / UUID - Directly sending text will automatically look up the user
- \`/admin\` - Admin overview (Total inbounds, active clients, global bandwidth)
`;
}

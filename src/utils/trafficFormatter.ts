import { BotLanguage, ProgressBarStyle, ClientData } from '../types';

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function renderProgressBar(used: number, total: number, style: ProgressBarStyle = 'blocks', length: number = 10): { bar: string; percentage: number } {
  if (total <= 0) {
    return { bar: '∞ (Unlimited)', percentage: 0 };
  }
  const percentage = Math.min(100, Math.max(0, (used / total) * 100));
  const filledCount = Math.round((percentage / 100) * length);
  const emptyCount = length - filledCount;

  let filledChar = '▰';
  let emptyChar = '▱';

  if (style === 'solid') {
    filledChar = '█';
    emptyChar = '░';
  } else if (style === 'dots') {
    filledChar = '●';
    emptyChar = '○';
  } else if (style === 'squares') {
    filledChar = '■';
    emptyChar = '□';
  }

  const bar = `[ ${filledChar.repeat(filledCount)}${emptyChar.repeat(emptyCount)} ]`;
  return { bar, percentage: Number(percentage.toFixed(1)) };
}

export function formatExpiry(timestampMs: number, lang: BotLanguage = 'en'): { text: string; isExpired: boolean } {
  if (!timestampMs || timestampMs <= 0) {
    const unlimitedLabels: Record<BotLanguage, string> = {
      en: 'Unlimited (No Expiration)',
      si: 'සීමාවක් නැත (කල් ඉකුත් නොවේ)',
      ru: 'Без ограничений (Бессрочно)',
      fa: 'نامحدود (بدون انقضا)',
    };
    return { text: unlimitedLabels[lang] || 'Unlimited', isExpired: false };
  }

  const now = Date.now();
  const dateObj = new Date(timestampMs);
  const dateStr = dateObj.toISOString().split('T')[0];
  const diffDays = Math.ceil((timestampMs - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const expiredLabels: Record<BotLanguage, string> = {
      en: `${dateStr} (Expired ${Math.abs(diffDays)} days ago)`,
      si: `${dateStr} (දින ${Math.abs(diffDays)} කට පෙර කල් ඉකුත් විය)`,
      ru: `${dateStr} (Истек ${Math.abs(diffDays)} дн. назад)`,
      fa: `${dateStr} (${Math.abs(diffDays)} روز پیش منقضی شد)`,
    };
    return { text: expiredLabels[lang], isExpired: true };
  }

  if (diffDays === 0) {
    const todayLabels: Record<BotLanguage, string> = {
      en: `${dateStr} (Expires Today)`,
      si: `${dateStr} (අද කල් ඉකුත් වේ)`,
      ru: `${dateStr} (Истекает сегодня)`,
      fa: `${dateStr} (امروز منقضی می‌شود)`,
    };
    return { text: todayLabels[lang], isExpired: false };
  }

  const remainingLabels: Record<BotLanguage, string> = {
    en: `${dateStr} (${diffDays} days remaining)`,
    si: `${dateStr} (තවත් දින ${diffDays} ක් ඉතිරියි)`,
    ru: `${dateStr} (Осталось ${diffDays} дн.)`,
    fa: `${dateStr} (${diffDays} روز باقی مانده)`,
  };

  return { text: remainingLabels[lang], isExpired: false };
}

export const BOT_TRANSLATIONS: Record<BotLanguage, {
  welcome: string;
  usageTitle: string;
  client: string;
  status: string;
  active: string;
  disabled: string;
  expired: string;
  quotaExceeded: string;
  upload: string;
  download: string;
  totalUsed: string;
  remaining: string;
  expiry: string;
  lastChecked: string;
  notFound: string;
  btnRefresh: string;
  btnSubLink: string;
  btnCheckAnother: string;
  btnMyUsage: string;
  howToCheck: string;
}> = {
  en: {
    welcome: '👋 <b>Welcome to 3x-ui Traffic Bot!</b>\n\nCheck your VPN subscription data usage, upload/download limits, and expiration date in real-time.\n\n👇 Click a button below or send your client email/UUID directly:',
    usageTitle: '📊 <b>Client Traffic Report</b>',
    client: 'Client',
    status: 'Status',
    active: 'Active 🟢',
    disabled: 'Disabled 🔴',
    expired: 'Expired ⏳',
    quotaExceeded: 'Quota Exceeded ⚠️',
    upload: 'Upload',
    download: 'Download',
    totalUsed: 'Total Used',
    remaining: 'Remaining',
    expiry: 'Expiration Date',
    lastChecked: 'Last checked',
    notFound: '❌ <b>Client Not Found</b>\n\nCould not find any active account with that email or UUID. Please check spelling or contact administrator.',
    btnRefresh: '🔄 Refresh Usage',
    btnSubLink: '🔗 Subscription Link',
    btnCheckAnother: '🔍 Check Another',
    btnMyUsage: '⚡ Check My Usage',
    howToCheck: 'Send: <code>/check email@domain.com</code> or just send your email or client key directly.',
  },
  si: {
    welcome: '👋 <b>3x-ui දත්ත භාවිතය පරීක්ෂා කිරීමේ Bot වෙත සාදරයෙන් පිළිගනිමු!</b>\n\nඔබගේ VPN ගිණුමේ දත්ත භාවිතය (Data Usage), Upload/Download ප්‍රමාණය සහ කල් ඉකුත්වන දිනය පහසුවෙන් බලාගන්න.\n\n👇 පහත බොත්තමක් ඔබන්න හෝ ඔබගේ Email / Key එක එවන්න:',
    usageTitle: '📊 <b>දත්ත භාවිත වාර්තාව (Traffic Report)</b>',
    client: 'සේවාදායකයා (Client)',
    status: 'තත්වය (Status)',
    active: 'සක්‍රියයි 🟢',
    disabled: 'අක්‍රියයි 🔴',
    expired: 'කල් ඉකුත් වී ඇත ⏳',
    quotaExceeded: 'දත්ත සීමාව ඉක්මවා ඇත ⚠️',
    upload: 'Upload ප්‍රමාණය',
    download: 'Download ප්‍රමාණය',
    totalUsed: 'භාවිත කළ මුළු දත්ත',
    remaining: 'ඉතිරි දත්ත ප්‍රමාණය',
    expiry: 'කල් ඉකුත්වන දිනය',
    lastChecked: 'අවසන් වරට පරීක්ෂා කළේ',
    notFound: '❌ <b>ගිණුම සොයාගත නොහැකි විය</b>\n\nඔබ ඇතුළත් කළ Email හෝ Key එකට අදාළ ගිණුමක් හමු නොවීය. කරුණාකර නිවැරදිදැයි පරීක්ෂා කරන්න.',
    btnRefresh: '🔄 නැවත පරීක්ෂා කරන්න',
    btnSubLink: '🔗 Subscription ලින්ක් එක',
    btnCheckAnother: '🔍 වෙනත් එකක් බලන්න',
    btnMyUsage: '⚡ මගේ දත්ත බලන්න',
    howToCheck: 'භාවිතය: <code>/check email@domain.com</code> හෝ ඔබගේ ඊමේල් ලිපිනය එවන්න.',
  },
  ru: {
    welcome: '👋 <b>Добро пожаловать в 3x-ui Traffic Bot!</b>\n\nЗдесь вы можете проверить расход трафика, лимиты загрузки/скачивания и дату окончания подписки.\n\n👇 Нажмите кнопку ниже или отправьте ваш email / UUID:',
    usageTitle: '📊 <b>Отчет об использовании трафика</b>',
    client: 'Клиент',
    status: 'Статус',
    active: 'Активен 🟢',
    disabled: 'Отключен 🔴',
    expired: 'Истек ⏳',
    quotaExceeded: 'Лимит исчерпан ⚠️',
    upload: 'Отдано (Up)',
    download: 'Скачано (Down)',
    totalUsed: 'Всего потрачено',
    remaining: 'Остаток трафика',
    expiry: 'Срок действия',
    lastChecked: 'Обновлено',
    notFound: '❌ <b>Клиент не найден</b>\n\nНе удалось найти аккаунт с таким email или UUID. Проверьте правильность ввода.',
    btnRefresh: '🔄 Обновить',
    btnSubLink: '🔗 Ссылка на подписку',
    btnCheckAnother: '🔍 Другой клиент',
    btnMyUsage: '⚡ Мой трафик',
    howToCheck: 'Отправьте: <code>/check email@domain.com</code> или просто ваш email.',
  },
  fa: {
    welcome: '👋 <b>به ربات بررسی حجم ۳x-ui خوش آمدید!</b>\n\nمشاهده میزان مصرف، حجم دانلود/آپلود و تاریخ انقضای اکانت فیلترشکن شما.\n\n👇 یکی از دکمه‌های زیر را لمس کنید یا ایمیل/کد کاربری خود را بفرستید:',
    usageTitle: '📊 <b>گزارش مصرف ترافیک</b>',
    client: 'کاربر',
    status: 'وضعیت',
    active: 'فعال 🟢',
    disabled: 'غیرفعال 🔴',
    expired: 'منقضی شده ⏳',
    quotaExceeded: 'پایان حجم ⚠️',
    upload: 'آپلود',
    download: 'دانلود',
    totalUsed: 'مجموع مصرف',
    remaining: 'حجم باقی‌مانده',
    expiry: 'تاریخ انقضا',
    lastChecked: 'آخرین بررسی',
    notFound: '❌ <b>کاربر یافت نشد</b>\n\nاکانتی با این ایمیل یا شناسه پیدا نشد. لطفاً املا را بررسی کنید.',
    btnRefresh: '🔄 بروزرسانی',
    btnSubLink: '🔗 لینک سابسکریپشن',
    btnCheckAnother: '🔍 بررسی دیگری',
    btnMyUsage: '⚡ مصرف من',
    howToCheck: 'ارسال: <code>/check email@domain.com</code> یا ایمیل خود را بنویسید.',
  },
};

export function formatTelegramCard(client: ClientData, lang: BotLanguage = 'en', style: ProgressBarStyle = 'blocks'): string {
  const t = BOT_TRANSLATIONS[lang] || BOT_TRANSLATIONS.en;
  const used = (client.up || 0) + (client.down || 0);
  const total = client.total || 0;
  const { bar, percentage } = renderProgressBar(used, total, style, 10);
  const { text: expiryText, isExpired } = formatExpiry(client.expiryTime || 0, lang);

  let statusText = t.active;
  if (!client.enable) {
    statusText = t.disabled;
  } else if (isExpired) {
    statusText = t.expired;
  } else if (total > 0 && used >= total) {
    statusText = t.quotaExceeded;
  }

  const upFormatted = formatBytes(client.up || 0);
  const downFormatted = formatBytes(client.down || 0);
  const usedFormatted = formatBytes(used);
  const totalFormatted = total > 0 ? formatBytes(total) : '∞';
  const remainingFormatted = total > 0 ? formatBytes(Math.max(0, total - used)) : '∞';

  const timeStr = new Date().toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC';

  let msg = `${t.usageTitle}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `👤 <b>${t.client}:</b> <code>${client.email}</code>\n`;
  msg += `📶 <b>${t.status}:</b> ${statusText}\n\n`;
  msg += `⬆️ <b>${t.upload}:</b> ${upFormatted}\n`;
  msg += `⬇️ <b>${t.download}:</b> ${downFormatted}\n`;
  msg += `🔄 <b>${t.totalUsed}:</b> ${usedFormatted} / ${totalFormatted}\n`;
  msg += `⏳ <b>${t.remaining}:</b> ${remainingFormatted}`;

  if (total > 0) {
    const leftPercent = Math.max(0, 100 - percentage).toFixed(1);
    msg += ` (${leftPercent}% left)`;
  }
  msg += `\n\n`;

  if (total > 0) {
    msg += `${bar} <b>${percentage}%</b>\n\n`;
  }

  msg += `📅 <b>${t.expiry}:</b>\n${expiryText}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🕒 <i>${t.lastChecked}: ${timeStr}</i>`;

  return msg;
}

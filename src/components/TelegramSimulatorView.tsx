import React, { useState } from 'react';
import { BotConfig, ClientData, BotLanguage } from '../types';
import { formatTelegramCard, BOT_TRANSLATIONS } from '../utils/trafficFormatter';
import { Bot, Send, RefreshCw, Smartphone, Globe, Sparkles, User, CornerDownLeft } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  html?: string;
  timestamp: string;
  buttons?: { text: string; action: string }[][];
}

interface TelegramSimulatorViewProps {
  config: BotConfig;
  setConfig: React.Dispatch<React.SetStateAction<BotConfig>>;
  sampleClient?: ClientData | null;
}

export const TelegramSimulatorView: React.FC<TelegramSimulatorViewProps> = ({ config, setConfig, sampleClient }) => {
  const [inputText, setInputText] = useState('');
  const [activeClient, setActiveClient] = useState<ClientData>(
    sampleClient || {
      id: '990f1234-a12b-43d4-b716-556677889900',
      email: 'alex_premium@vpn.net',
      subId: 'sub_premium_8819',
      tgId: 123456789,
      enable: true,
      up: 1.8 * 1024 * 1024 * 1024,
      down: 18.4 * 1024 * 1024 * 1024,
      total: 60 * 1024 * 1024 * 1024,
      expiryTime: Date.now() + 24 * 24 * 60 * 60 * 1000,
      inboundTag: 'VLESS-REALITY',
    }
  );

  const t = BOT_TRANSLATIONS[config.language] || BOT_TRANSLATIONS.en;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'user',
      text: '/start',
      timestamp: '19:15',
    },
    {
      id: '2',
      sender: 'bot',
      text: '',
      html: t.welcome.replace(/\n/g, '<br/>'),
      timestamp: '19:15',
      buttons: [
        [
          { text: t.btnMyUsage, action: 'action_my_usage' },
        ],
        [
          { text: 'ℹ️ ' + t.btnCheckAnother, action: 'action_help' },
        ],
      ],
    },
  ]);

  const addMessage = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      {
        ...msg,
        id: Math.random().toString(),
        timestamp: timeStr,
      },
    ]);
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');

    // User message
    addMessage({ sender: 'user', text });

    // Bot response simulation
    setTimeout(() => {
      handleBotResponse(text);
    }, 400);
  };

  const handleBotResponse = (cmd: string) => {
    const cleanCmd = cmd.trim();
    const activeLang = config.language;
    const trans = BOT_TRANSLATIONS[activeLang] || BOT_TRANSLATIONS.en;

    if (cleanCmd === '/start' || cleanCmd === '/help') {
      addMessage({
        sender: 'bot',
        text: '',
        html: trans.welcome.replace(/\n/g, '<br/>'),
        buttons: [
          [{ text: trans.btnMyUsage, action: 'action_my_usage' }],
          [{ text: 'ℹ️ ' + trans.btnCheckAnother, action: 'action_help' }],
        ],
      });
      return;
    }

    if (cleanCmd === '/myusage' || cleanCmd.toLowerCase() === 'myusage') {
      sendClientReport(activeClient);
      return;
    }

    if (cleanCmd === '/admin') {
      const adminHtml = `🛠 <b>3x-ui Admin Overview</b><br/>━━━━━━━━━━━━━━━━━━━━<br/>📡 <b>Inbounds:</b> 4<br/>👥 <b>Total Clients:</b> 128<br/>⬆️ <b>Total Upload:</b> 42.10 GB<br/>⬇️ <b>Total Download:</b> 581.40 GB<br/>🔄 <b>Panel Traffic:</b> 623.50 GB<br/>━━━━━━━━━━━━━━━━━━━━<br/>🕒 <i>${new Date().toUTCString()}</i>`;
      addMessage({ sender: 'bot', text: '', html: adminHtml });
      return;
    }

    // Treat as query
    let query = cleanCmd;
    if (cleanCmd.startsWith('/check') || cleanCmd.startsWith('/usage')) {
      const parts = cleanCmd.split(/\s+/);
      query = parts.slice(1).join(' ').trim();
    }

    if (!query) {
      addMessage({
        sender: 'bot',
        text: '',
        html: trans.howToCheck.replace(/\n/g, '<br/>'),
      });
      return;
    }

    // If query matches our client or user typed an email
    const updatedClient = {
      ...activeClient,
      email: query.includes('@') ? query : activeClient.email,
    };
    setActiveClient(updatedClient);
    sendClientReport(updatedClient);
  };

  const sendClientReport = (client: ClientData) => {
    const trans = BOT_TRANSLATIONS[config.language] || BOT_TRANSLATIONS.en;
    const cardHtml = formatTelegramCard(client, config.language, config.progressStyle).replace(/\n/g, '<br/>');

    const buttons = [
      [
        { text: trans.btnRefresh, action: `refresh:${client.email}` },
        { text: trans.btnSubLink, action: `sub:${client.subId || 'link'}` },
      ],
      [{ text: trans.btnMyUsage, action: 'action_my_usage' }],
    ];

    addMessage({
      sender: 'bot',
      text: '',
      html: cardHtml,
      buttons,
    });
  };

  const handleButtonClick = (action: string) => {
    if (action === 'action_my_usage') {
      addMessage({ sender: 'user', text: '/myusage' });
      setTimeout(() => sendClientReport(activeClient), 300);
    } else if (action.startsWith('refresh:')) {
      // Simulate traffic increase on refresh
      const refreshedClient: ClientData = {
        ...activeClient,
        down: activeClient.down + 145 * 1024 * 1024, // +145 MB
      };
      setActiveClient(refreshedClient);
      addMessage({ sender: 'user', text: `🔄 Refresh: ${activeClient.email}` });
      setTimeout(() => sendClientReport(refreshedClient), 300);
    } else if (action.startsWith('sub:')) {
      const subUrl = `${config.panelUrl || 'https://vps.example.com:2053'}/sub/${activeClient.subId}`;
      addMessage({ sender: 'user', text: '🔗 Get Subscription Link' });
      setTimeout(() => {
        addMessage({
          sender: 'bot',
          text: '',
          html: `🔗 <b>Subscription Link</b><br/><br/><code>${subUrl}</code><br/><br/><i>Import this link into v2rayNG, v2rayN, Sing-box, or Nekobox.</i>`,
        });
      }, 300);
    } else if (action === 'action_help') {
      addMessage({ sender: 'user', text: '/help' });
      setTimeout(() => {
        addMessage({
          sender: 'bot',
          text: '',
          html: t.howToCheck.replace(/\n/g, '<br/>'),
        });
      }, 300);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-6">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-sky-400 uppercase">
          <span>Interactive Preview</span>
          <span aria-hidden="true">·</span>
          <span>Telegram Webhook Client Simulator</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
          Interactive Telegram Bot Simulator
        </h1>
        <p className="text-sm text-neutral-400 mt-1 max-w-3xl leading-relaxed">
          Test interactive bot interactions, button responses, and multilingual traffic reports exactly as clients will see them inside the Telegram messenger app.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Controls & Language Switcher */}
        <div className="lg:col-span-4 space-y-5">
          <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white pb-3 border-b border-neutral-800">
              <Globe className="w-4 h-4 text-sky-400" />
              <span>Language & Style Switcher</span>
            </div>

            {/* Language */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">
                Display Language
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'en', label: 'English' },
                  { id: 'si', label: 'සිංහල (Sinhala)' },
                  { id: 'ru', label: 'Русский' },
                  { id: 'fa', label: 'فارسی' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setConfig({ ...config, language: item.id as BotLanguage });
                    }}
                    className={`px-3 py-2 rounded-lg border text-left transition-colors ${
                      config.language === item.id
                        ? 'border-sky-500 bg-sky-500/10 text-sky-300 font-semibold'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick test inputs */}
            <div className="pt-2 border-t border-neutral-800 space-y-2">
              <div className="text-xs font-semibold text-neutral-300">Quick Test Actions:</div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => {
                    setInputText('/start');
                  }}
                  className="px-2.5 py-1 text-xs font-mono bg-neutral-950 border border-neutral-800 text-sky-400 hover:border-sky-500 rounded transition-colors"
                >
                  /start
                </button>
                <button
                  onClick={() => {
                    setInputText('/myusage');
                  }}
                  className="px-2.5 py-1 text-xs font-mono bg-neutral-950 border border-neutral-800 text-sky-400 hover:border-sky-500 rounded transition-colors"
                >
                  /myusage
                </button>
                <button
                  onClick={() => {
                    setInputText(`/check ${activeClient.email}`);
                  }}
                  className="px-2.5 py-1 text-xs font-mono bg-neutral-950 border border-neutral-800 text-sky-400 hover:border-sky-500 rounded transition-colors"
                >
                  /check client
                </button>
                <button
                  onClick={() => {
                    setInputText('/admin');
                  }}
                  className="px-2.5 py-1 text-xs font-mono bg-neutral-950 border border-neutral-800 text-sky-400 hover:border-sky-500 rounded transition-colors"
                >
                  /admin
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800 text-xs text-neutral-500 leading-relaxed">
              💡 <b>Tip:</b> When your users send their client email or UUID to the bot, the Cloudflare Worker queries the 3x-ui API and formats this report in &lt;100ms.
            </div>
          </div>
        </div>

        {/* Right: Phone Frame Telegram Mock */}
        <div className="lg:col-span-8 flex justify-center">
          <div className="w-full max-w-md border border-neutral-700 bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[650px]">
            {/* Telegram Header */}
            <div className="px-4 py-3 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white leading-tight">
                    {config.botName || '3x-ui Traffic Bot'}
                  </div>
                  <div className="text-[11px] text-sky-400 leading-tight">bot</div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-neutral-500">
                Cloudflare Worker
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-neutral-950/70 scrollbar-thin">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-sky-600 text-white rounded-tr-sm font-sans'
                        : 'bg-neutral-900 text-neutral-200 border border-neutral-800 rounded-tl-sm font-mono'
                    }`}
                  >
                    {m.text && <div>{m.text}</div>}
                    {m.html && <div dangerouslySetInnerHTML={{ __html: m.html }} />}
                    <div
                      className={`text-[9px] mt-1 text-right tabular-nums ${
                        m.sender === 'user' ? 'text-sky-200' : 'text-neutral-500'
                      }`}
                    >
                      {m.timestamp}
                    </div>
                  </div>

                  {/* Inline Buttons under Bot Message */}
                  {m.buttons && (
                    <div className="mt-1.5 space-y-1 w-full max-w-[85%]">
                      {m.buttons.map((row, rIdx) => (
                        <div key={rIdx} className="flex gap-1.5">
                          {row.map((btn, bIdx) => (
                            <button
                              key={bIdx}
                              onClick={() => handleButtonClick(btn.action)}
                              className="flex-1 py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-sky-400 hover:text-sky-300 rounded-lg text-xs font-sans font-medium transition-colors text-center truncate shadow-sm"
                            >
                              {btn.text}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                placeholder="Type /start, email, or client key..."
                className="flex-1 px-3.5 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-full text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handleSend}
                className="w-8 h-8 rounded-full bg-sky-600 hover:bg-sky-500 flex items-center justify-center text-white transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

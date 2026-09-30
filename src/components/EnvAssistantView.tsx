import React, { useState } from 'react';
import { BotConfig } from '../types';
import { KeyRound, Shield, Check, Copy, ExternalLink, Zap, AlertCircle, RefreshCw, Send } from 'lucide-react';

interface EnvAssistantViewProps {
  config: BotConfig;
  setConfig: React.Dispatch<React.SetStateAction<BotConfig>>;
}

export const EnvAssistantView: React.FC<EnvAssistantViewProps> = ({ config, setConfig }) => {
  const [workerUrl, setWorkerUrl] = useState(
    'https://patient-waterfall-67db.netsachi.workers.dev'
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Webhook Tester State
  const [testingToken, setTestingToken] = useState(false);
  const [botInfo, setBotInfo] = useState<any>({
    id: 8816598841,
    is_bot: true,
    first_name: 'Test',
    username: 'Testihh_bot',
  });
  const [botError, setBotError] = useState<string | null>(null);

  const [settingWebhook, setSettingWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState<any>({
    success: true,
    result: true,
    description: 'Webhook was set successfully',
  });
  const [webhookError, setWebhookError] = useState<string | null>(null);

  const [checkingInfo, setCheckingInfo] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<any>({
    url: 'https://patient-waterfall-67db.netsachi.workers.dev',
    pending_update_count: 0,
    has_custom_certificate: false,
    max_connections: 40,
    ip_address: '172.67.205.85',
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Safe helper to parse JSON or fallback to direct Telegram API
  const callTelegramApi = async (endpoint: string, bodyObj: any = null) => {
    const cleanToken = config.botToken.trim();
    if (!cleanToken) throw new Error('Telegram Bot Token is required');

    // 1. Try local proxy first
    try {
      const localResp = await fetch(`/api/telegram/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj),
      });

      const text = await localResp.text();
      if (text && text.trim().startsWith('{')) {
        const parsed = JSON.parse(text);
        if (parsed.success) return parsed;
      }
    } catch (e) {
      // Fallback to direct Telegram API below
      console.warn('Local proxy request skipped, falling back to direct Telegram API:', e);
    }

    // 2. Direct fallback to official Telegram API (Telegram supports CORS)
    if (endpoint === 'test-bot') {
      const direct = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
      const directData = await direct.json();
      if (!directData.ok) throw new Error(directData.description || 'Invalid Telegram Bot Token');
      return { success: true, bot: directData.result };
    }

    if (endpoint === 'set-webhook') {
      const directBody: any = {
        url: bodyObj.workerUrl,
        drop_pending_updates: false,
        allowed_updates: ['message', 'callback_query'],
      };
      if (bodyObj.secretToken) directBody.secret_token = bodyObj.secretToken;

      const direct = await fetch(`https://api.telegram.org/bot${cleanToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(directBody),
      });
      const directData = await direct.json();
      if (!directData.ok) throw new Error(directData.description || 'Failed to set webhook');
      return { success: true, result: directData.result, description: directData.description };
    }

    if (endpoint === 'webhook-info') {
      const direct = await fetch(`https://api.telegram.org/bot${cleanToken}/getWebhookInfo`);
      const directData = await direct.json();
      if (!directData.ok) throw new Error(directData.description || 'Failed to fetch webhook info');
      return { success: true, webhookInfo: directData.result };
    }

    throw new Error('Unknown endpoint');
  };

  // Verify Telegram Bot Token
  const handleVerifyBot = async () => {
    if (!config.botToken.trim()) {
      setBotError('Please enter your Telegram Bot Token first');
      return;
    }
    setTestingToken(true);
    setBotError(null);
    setBotInfo(null);
    try {
      const data = await callTelegramApi('test-bot', { botToken: config.botToken });
      setBotInfo(data.bot);
    } catch (err: any) {
      setBotError(err.message || 'Error communicating with Telegram');
    } finally {
      setTestingToken(false);
    }
  };

  // Set Webhook directly to Cloudflare Worker
  const handleSetWebhook = async () => {
    if (!config.botToken.trim()) {
      setWebhookError('Telegram Bot Token is required');
      return;
    }
    if (!workerUrl.trim()) {
      setWebhookError('Please enter your Cloudflare Worker URL (e.g. https://my-bot.subdomain.workers.dev)');
      return;
    }
    setSettingWebhook(true);
    setWebhookError(null);
    setWebhookResult(null);

    try {
      const data = await callTelegramApi('set-webhook', {
        botToken: config.botToken,
        workerUrl: workerUrl.trim(),
        secretToken: config.webhookSecret,
      });
      setWebhookResult(data);
      // Refresh webhook info
      await handleGetWebhookInfo();
    } catch (err: any) {
      setWebhookError(err.message || 'Error sending setWebhook request');
    } finally {
      setSettingWebhook(false);
    }
  };

  // Inspect Webhook Info
  const handleGetWebhookInfo = async () => {
    if (!config.botToken.trim()) {
      setWebhookError('Telegram Bot Token is required to inspect webhook status');
      return;
    }
    setCheckingInfo(true);
    try {
      const data = await callTelegramApi('webhook-info', { botToken: config.botToken });
      setWebhookInfo(data.webhookInfo);
    } catch (err: any) {
      setWebhookError(err.message || 'Error fetching webhook info');
    } finally {
      setCheckingInfo(false);
    }
  };

  const envVariables = [
    {
      name: 'TELEGRAM_BOT_TOKEN',
      type: 'Secret (Encrypted)',
      required: true,
      description: 'Your Telegram bot API token generated by @BotFather',
      example: '748291048:AAGx...k3Lm9',
      currentValue: config.botToken,
      onChange: (val: string) => setConfig({ ...config, botToken: val }),
      cliCommand: `echo "${config.botToken || 'YOUR_BOT_TOKEN'}" | npx wrangler secret put TELEGRAM_BOT_TOKEN`,
    },
    {
      name: 'PANEL_URL',
      type: 'Environment Variable',
      required: true,
      description: 'Full domain or IP address of your 3x-ui panel including scheme and port',
      example: 'https://vps.mydomain.com:2053',
      currentValue: config.panelUrl,
      onChange: (val: string) => setConfig({ ...config, panelUrl: val }),
      cliCommand: `# In wrangler.toml under [vars]:\\nPANEL_URL = "${config.panelUrl || 'https://vps.example.com:2053'}"`,
    },
    {
      name: 'PANEL_USERNAME',
      type: 'Secret (Encrypted)',
      required: true,
      description: 'Admin username used to log in to your 3x-ui web panel',
      example: 'admin',
      currentValue: config.panelUsername,
      onChange: (val: string) => setConfig({ ...config, panelUsername: val }),
      cliCommand: `echo "${config.panelUsername || 'admin'}" | npx wrangler secret put PANEL_USERNAME`,
    },
    {
      name: 'PANEL_PASSWORD',
      type: 'Secret (Encrypted)',
      required: true,
      description: 'Admin password for your 3x-ui web panel',
      example: '••••••••',
      currentValue: config.panelPassword,
      onChange: (val: string) => setConfig({ ...config, panelPassword: val }),
      cliCommand: `echo "${config.panelPassword || 'YOUR_PASSWORD'}" | npx wrangler secret put PANEL_PASSWORD`,
    },
    {
      name: 'PANEL_WEB_BASE_PATH',
      type: 'Environment Variable',
      required: false,
      description: 'Custom base URL root path if configured in 3x-ui panel settings',
      example: '/',
      currentValue: config.panelBasePath,
      onChange: (val: string) => setConfig({ ...config, panelBasePath: val }),
      cliCommand: `# In wrangler.toml under [vars]:\\nPANEL_WEB_BASE_PATH = "${config.panelBasePath || '/'}"`,
    },
    {
      name: 'BOT_LANGUAGE',
      type: 'Environment Variable',
      required: false,
      description: 'Default language for bot text (en, si, ru, fa)',
      example: 'en',
      currentValue: config.language,
      onChange: (val: string) => setConfig({ ...config, language: val as any }),
      cliCommand: `# In wrangler.toml under [vars]:\\nBOT_LANGUAGE = "${config.language}"`,
    },
    {
      name: 'ADMIN_TELEGRAM_ID',
      type: 'Environment Variable',
      required: false,
      description: 'Your Telegram User ID (numeric) for /admin commands',
      example: '123456789',
      currentValue: config.adminTelegramId,
      onChange: (val: string) => setConfig({ ...config, adminTelegramId: val }),
      cliCommand: `# In wrangler.toml under [vars]:\\nADMIN_TELEGRAM_ID = "${config.adminTelegramId || '123456789'}"`,
    },
    {
      name: 'BOT_SECRET_TOKEN',
      type: 'Secret (Optional)',
      required: false,
      description: 'Optional secret token to authenticate webhook calls from Telegram',
      example: 'my_super_secret_token_123',
      currentValue: config.webhookSecret,
      onChange: (val: string) => setConfig({ ...config, webhookSecret: val }),
      cliCommand: `echo "${config.webhookSecret || 'YOUR_SECRET'}" | npx wrangler secret put BOT_SECRET_TOKEN`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-6">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-sky-400 uppercase">
          <span>Cloudflare Workers</span>
          <span aria-hidden="true">·</span>
          <span>Environment Variables & Secrets Guide</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
          Cloudflare Configuration & Webhook Assistant
        </h1>
        <p className="text-sm text-neutral-400 mt-1 max-w-3xl leading-relaxed">
          Configure the environment variables in Cloudflare so the worker script can securely authenticate with your 3x-ui panel API and answer Telegram requests.
        </p>
      </div>

      {/* Part 1: Automated 1-Click Webhook Tool */}
      <div className="border border-sky-500/30 bg-sky-950/20 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-semibold text-white">
              Automated Telegram Webhook Linker & Tester
            </h2>
          </div>
          <span className="text-xs text-sky-400 font-mono">1-Click Integration</span>
        </div>
        <p className="text-xs text-neutral-300">
          Once your Cloudflare Worker is deployed, enter your Worker URL and Bot Token below to link them with Telegram's Webhook API.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-200">
              Telegram Bot Token (from @BotFather)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={config.botToken}
                onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
                placeholder="748291048:AAGx...k3Lm9"
                className="flex-1 px-3 py-2 text-xs font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleVerifyBot}
                disabled={testingToken}
                className="px-3 py-2 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg whitespace-nowrap transition-colors"
              >
                {testingToken ? 'Checking...' : 'Verify Token'}
              </button>
            </div>
            {botInfo && (
              <div className="p-2.5 bg-emerald-950/30 border border-emerald-800/40 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>
                  Valid Bot: <b>{botInfo.first_name}</b> (@{botInfo.username})
                </span>
              </div>
            )}
            {botError && (
              <div className="p-2.5 bg-red-950/30 border border-red-800/40 rounded-lg text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>{botError}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-200">
              Cloudflare Worker URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={workerUrl}
                onChange={(e) => setWorkerUrl(e.target.value)}
                placeholder="https://3xui-telegram-bot.yourname.workers.dev"
                className="flex-1 px-3 py-2 text-xs font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleSetWebhook}
                disabled={settingWebhook}
                className="px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5"
              >
                {settingWebhook ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Set Webhook</span>
              </button>
            </div>
            <p className="text-[11px] text-neutral-500">
              Found on your Cloudflare Worker overview page under "Routes" or "*.workers.dev".
            </p>
          </div>
        </div>

        {webhookResult && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-xs text-emerald-200 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Webhook Registered Successfully!</span>
            </div>
            <p className="text-neutral-300">{webhookResult.description || 'Telegram is now forwarding messages to your Cloudflare Worker.'}</p>
          </div>
        )}

        {webhookError && (
          <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{webhookError}</span>
          </div>
        )}

        {/* Webhook Status Inspection */}
        <div className="pt-2 flex items-center justify-between">
          <button
            onClick={handleGetWebhookInfo}
            disabled={checkingInfo}
            className="text-xs text-neutral-400 hover:text-sky-400 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingInfo ? 'animate-spin' : ''}`} />
            <span>Inspect Telegram Webhook Diagnostics</span>
          </button>
        </div>

        {webhookInfo && (
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono space-y-1.5 text-neutral-300">
            <div className="text-neutral-400 font-sans font-semibold text-[11px] uppercase tracking-wider">
              Telegram Webhook Status Report:
            </div>
            <div>URL: <span className="text-sky-400">{webhookInfo.url || 'Not set'}</span></div>
            <div>Pending updates: <span className="text-amber-400 tabular-nums">{webhookInfo.pending_update_count}</span></div>
            {webhookInfo.last_error_message && (
              <div className="text-red-400">
                Last Error ({new Date(webhookInfo.last_error_date * 1000).toLocaleString()}): {webhookInfo.last_error_message}
              </div>
            )}
            {!webhookInfo.last_error_message && webhookInfo.url && (
              <div className="text-emerald-400 font-sans text-xs">
                ✓ Webhook is active and healthy with 0 delivery errors.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Part 2: Detailed Cloudflare Environment Variables Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Required Cloudflare Environment Variables & Secrets
          </h2>
          <span className="text-xs text-neutral-400">
            {envVariables.length} variables configured
          </span>
        </div>

        <div className="border border-neutral-800 bg-neutral-900/30 rounded-xl overflow-hidden divide-y divide-neutral-800/80">
          {envVariables.map((item) => (
            <div key={item.name} className="p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-sky-400">{item.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      item.type.includes('Secret')
                        ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                        : 'bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    {item.type}
                  </span>
                  {item.required && (
                    <span className="text-[10px] text-red-400 font-medium">*Required</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(item.cliCommand, item.name)}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded font-mono transition-colors"
                  >
                    {copiedKey === item.name ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedKey === item.name ? 'Copied' : 'Copy CLI'}</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-neutral-400 leading-normal">{item.description}</p>

              {/* Editable Value */}
              <div className="flex items-center gap-3">
                <div className="text-[11px] text-neutral-500 font-medium w-20">Value:</div>
                <input
                  type={item.name.includes('PASSWORD') || item.name.includes('SECRET') ? 'password' : 'text'}
                  value={item.currentValue}
                  onChange={(e) => item.onChange(e.target.value)}
                  placeholder={`e.g. ${item.example}`}
                  className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-neutral-950 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* CLI Command preview */}
              <div className="bg-neutral-950/70 p-2 rounded text-[11px] font-mono text-neutral-400 overflow-x-auto">
                <span className="text-neutral-500 select-none">$ </span>
                {item.cliCommand}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Part 3: Step-by-Step Cloudflare Dashboard Guide */}
      <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">
          Step-by-Step Cloudflare Dashboard Deployment
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
            <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              1
            </div>
            <div className="font-semibold text-white">Create Worker</div>
            <p className="text-neutral-400 leading-relaxed">
              Go to Cloudflare Dashboard &rarr; <b>Workers & Pages</b> &rarr; <b>Create Application</b> &rarr; <b>Create Worker</b> &rarr; Click <b>Deploy</b>.
            </p>
          </div>

          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
            <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              2
            </div>
            <div className="font-semibold text-white">Paste worker.js</div>
            <p className="text-neutral-400 leading-relaxed">
              Click <b>Edit Code</b>. Replace the default template with the generated <code>worker.js</code> from the Worker Generator tab and click <b>Deploy</b>.
            </p>
          </div>

          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
            <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              3
            </div>
            <div className="font-semibold text-white">Add Variables & Secrets</div>
            <p className="text-neutral-400 leading-relaxed">
              Go to <b>Settings</b> &rarr; <b>Variables and Secrets</b>. Add the encrypted secrets (<code>TELEGRAM_BOT_TOKEN</code>, <code>PANEL_USERNAME</code>, <code>PANEL_PASSWORD</code>) and variables.
            </p>
          </div>

          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
            <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              4
            </div>
            <div className="font-semibold text-white">Connect Webhook</div>
            <p className="text-neutral-400 leading-relaxed">
              Copy your worker URL (e.g. <code>*.workers.dev</code>), paste it into the Webhook Linker above, and click <b>Set Webhook</b>. You're done!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

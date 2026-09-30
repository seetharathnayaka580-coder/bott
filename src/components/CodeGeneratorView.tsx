import React, { useState } from 'react';
import { BotConfig, BotLanguage, ProgressBarStyle } from '../types';
import { generateWorkerJs, generateWranglerToml, generateReadme } from '../utils/codeGenerators';
import { Copy, Check, Download, FileCode, Sliders, Globe2, ShieldCheck, Sparkles } from 'lucide-react';

interface CodeGeneratorViewProps {
  config: BotConfig;
  setConfig: React.Dispatch<React.SetStateAction<BotConfig>>;
  onGoToCloudflare: () => void;
}

export const CodeGeneratorView: React.FC<CodeGeneratorViewProps> = ({ config, setConfig, onGoToCloudflare }) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'worker' | 'wrangler' | 'readme'>('worker');
  const [copied, setCopied] = useState(false);

  const workerCode = generateWorkerJs(config);
  const wranglerCode = generateWranglerToml(config);
  const readmeCode = generateReadme(config);

  const currentCode =
    activeCodeTab === 'worker' ? workerCode : activeCodeTab === 'wrangler' ? wranglerCode : readmeCode;

  const currentFileName =
    activeCodeTab === 'worker' ? 'worker.js' : activeCodeTab === 'wrangler' ? 'wrangler.toml' : 'README.md';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    handleDownload('worker.js', workerCode);
    setTimeout(() => handleDownload('wrangler.toml', wranglerCode), 200);
    setTimeout(() => handleDownload('README.md', readmeCode), 400);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="border border-neutral-800 bg-neutral-900/50 rounded-xl p-6 relative overflow-hidden">
        <div className="max-w-3xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-sky-400 uppercase">
            <span>Serverless Deployment</span>
            <span aria-hidden="true">·</span>
            <span>Cloudflare Workers</span>
            <span aria-hidden="true">·</span>
            <span>Zero Server Maintenance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Custom 3x-ui Telegram Bot Generator
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Generate an ultra-fast, serverless Telegram bot that directly connects to your 3x-ui panel API. Clients can check remaining bandwidth, upload/download limits, and subscription expiry via interactive Telegram buttons.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Customization Settings */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span>Bot & Panel Settings</span>
              </div>
              <button
                onClick={() => {
                  setConfig((prev) => ({
                    ...prev,
                    panelUrl: 'https://vps.example.com:2053',
                    language: 'en',
                    progressStyle: 'blocks',
                  }));
                }}
                className="text-xs text-neutral-400 hover:text-sky-400 transition-colors"
              >
                Reset Defaults
              </button>
            </div>

            {/* Panel URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">
                3x-ui Panel URL or IP with Port
              </label>
              <input
                type="text"
                value={config.panelUrl}
                onChange={(e) => setConfig({ ...config, panelUrl: e.target.value })}
                placeholder="https://your-domain.com:2053"
                className="w-full px-3 py-2 text-xs font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-sky-500"
              />
              <p className="text-[11px] text-neutral-500">
                Must include scheme (<code>https://</code> or <code>http://</code>) and port (e.g. 2053).
              </p>
            </div>

            {/* Web Base Path */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">
                Panel Web Base Path (Optional)
              </label>
              <input
                type="text"
                value={config.panelBasePath}
                onChange={(e) => setConfig({ ...config, panelBasePath: e.target.value })}
                placeholder="/"
                className="w-full px-3 py-2 text-xs font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-sky-500"
              />
              <p className="text-[11px] text-neutral-500">
                Default is <code>/</code>. If your 3x-ui has a custom URL root like <code>/mysecretpanel/</code>, enter it here.
              </p>
            </div>

            {/* Language Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-neutral-400" />
                <span>Default Bot Language</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'en', label: 'English (US)' },
                  { id: 'si', label: 'සිංහල (Sinhala)' },
                  { id: 'ru', label: 'Русский (Russian)' },
                  { id: 'fa', label: 'فارسی (Persian)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setConfig({ ...config, language: item.id as BotLanguage })}
                    className={`px-3 py-2 text-xs rounded-lg border text-left transition-colors ${
                      config.language === item.id
                        ? 'border-sky-500 bg-sky-500/10 text-sky-300 font-medium'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Progress Bar Style */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">
                Data Usage Progress Bar Visual
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {[
                  { id: 'blocks', preview: '[ ▰▰▰▰▱▱ ]', label: 'Blocks' },
                  { id: 'solid', preview: '[ ████░░ ]', label: 'Solid' },
                  { id: 'dots', preview: '[ ●●●●○○ ]', label: 'Dots' },
                  { id: 'squares', preview: '[ ■■■■□□ ]', label: 'Squares' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setConfig({ ...config, progressStyle: item.id as ProgressBarStyle })}
                    className={`p-2 rounded-lg border text-left transition-colors ${
                      config.progressStyle === item.id
                        ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="text-[11px] text-neutral-400">{item.label}</div>
                    <div className="text-xs text-neutral-200 mt-0.5">{item.preview}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="space-y-3 pt-2 border-t border-neutral-800">
              <div className="text-xs font-semibold text-neutral-300">Interactive Bot Features</div>

              <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer">
                <span>1-Click "Refresh Usage" Button</span>
                <input
                  type="checkbox"
                  checked={config.enableRefreshButton}
                  onChange={(e) => setConfig({ ...config, enableRefreshButton: e.target.checked })}
                  className="rounded border-neutral-700 text-sky-500 focus:ring-0 bg-neutral-900 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer">
                <span>"Subscription Link" Button</span>
                <input
                  type="checkbox"
                  checked={config.enableSubLink}
                  onChange={(e) => setConfig({ ...config, enableSubLink: e.target.checked })}
                  className="rounded border-neutral-700 text-sky-500 focus:ring-0 bg-neutral-900 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer">
                <span>Auto-Detect Telegram User ID (<code>tgId</code>)</span>
                <input
                  type="checkbox"
                  checked={config.enableAutoTgId}
                  onChange={(e) => setConfig({ ...config, enableAutoTgId: e.target.checked })}
                  className="rounded border-neutral-700 text-sky-500 focus:ring-0 bg-neutral-900 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer">
                <span>Admin Stats Command (<code>/admin</code>)</span>
                <input
                  type="checkbox"
                  checked={config.enableAdminCommand}
                  onChange={(e) => setConfig({ ...config, enableAdminCommand: e.target.checked })}
                  className="rounded border-neutral-700 text-sky-500 focus:ring-0 bg-neutral-900 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            {/* Next Step CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onGoToCloudflare}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <span>Setup Cloudflare Environment Variables & Webhook</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Code Display */}
        <div className="lg:col-span-7 space-y-4">
          <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl overflow-hidden">
            {/* File Switcher Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-950 border-b border-neutral-800">
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'worker', label: 'worker.js', icon: FileCode },
                  { id: 'wrangler', label: 'wrangler.toml', icon: FileCode },
                  { id: 'readme', label: 'README.md', icon: FileCode },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCodeTab(tab.id as any)}
                    className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors flex items-center gap-1.5 ${
                      activeCodeTab === tab.id
                        ? 'bg-neutral-800 text-sky-400 font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-700 rounded-md transition-colors font-medium"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => handleDownload(currentFileName, currentCode)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-700 rounded-md transition-colors font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* Code Box */}
            <div className="p-4 bg-neutral-950 font-mono text-xs leading-relaxed overflow-x-auto max-h-[580px] scrollbar-thin text-neutral-300">
              <pre>
                <code>{currentCode}</code>
              </pre>
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-3 bg-neutral-900/60 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Pure ES Modules · Zero External Dependencies · Free Tier Compatible</span>
              </div>
              <button
                onClick={handleDownloadAll}
                className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
              >
                Download All Files (.zip/.bundle)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

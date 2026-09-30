/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BotConfig, ClientData } from './types';
import { Header } from './components/Header';
import { CodeGeneratorView } from './components/CodeGeneratorView';
import { EnvAssistantView } from './components/EnvAssistantView';
import { ApiTesterView } from './components/ApiTesterView';
import { TelegramSimulatorView } from './components/TelegramSimulatorView';
import { DocsView } from './components/DocsView';
import { generateWorkerJs } from './utils/codeGenerators';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('generator');

  const [config, setConfig] = useState<BotConfig>({
    botName: '3x-ui Traffic Bot',
    panelUrl: 'https://vps.example.com:2053',
    panelUsername: 'admin',
    panelPassword: '',
    panelBasePath: '/',
    botToken: '',
    adminTelegramId: '',
    webhookSecret: '',
    language: 'en',
    progressStyle: 'blocks',
    enableAutoTgId: true,
    enableRefreshButton: true,
    enableSubLink: true,
    enableExpiryCountdown: true,
    enableAdminCommand: true,
    enableRateLimit: true,
    cacheSessionDurationSeconds: 1800,
  });

  const [sampleClient, setSampleClient] = useState<ClientData | null>(null);

  const handleDownloadWorker = () => {
    const code = generateWorkerJs(config);
    const blob = new Blob([code], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'worker.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDownloadWorker={handleDownloadWorker}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'generator' && (
          <CodeGeneratorView
            config={config}
            setConfig={setConfig}
            onGoToCloudflare={() => setActiveTab('cloudflare')}
          />
        )}

        {activeTab === 'cloudflare' && (
          <EnvAssistantView
            config={config}
            setConfig={setConfig}
          />
        )}

        {activeTab === 'tester' && (
          <ApiTesterView
            config={config}
            setConfig={setConfig}
            onClientFound={(client) => setSampleClient(client)}
          />
        )}

        {activeTab === 'simulator' && (
          <TelegramSimulatorView
            config={config}
            setConfig={setConfig}
            sampleClient={sampleClient}
          />
        )}

        {activeTab === 'docs' && <DocsView />}
      </main>

      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            3x-ui Telegram Cloudflare Hub · Serverless Edge Architecture
          </div>
          <div className="flex items-center gap-4 text-neutral-400">
            <button onClick={() => setActiveTab('generator')} className="hover:text-neutral-200 transition-colors">
              Generator
            </button>
            <button onClick={() => setActiveTab('cloudflare')} className="hover:text-neutral-200 transition-colors">
              Cloudflare Vars
            </button>
            <button onClick={() => setActiveTab('tester')} className="hover:text-neutral-200 transition-colors">
              API Tester
            </button>
            <button onClick={() => setActiveTab('docs')} className="hover:text-neutral-200 transition-colors">
              Endpoints
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

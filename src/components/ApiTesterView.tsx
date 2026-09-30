import React, { useState } from 'react';
import { BotConfig, ClientData } from '../types';
import { formatBytes, renderProgressBar, formatExpiry, formatTelegramCard } from '../utils/trafficFormatter';
import { Server, Activity, CheckCircle2, XCircle, ArrowUpRight, ArrowDownLeft, HardDrive, Clock, ShieldCheck, Sparkles, Send, RefreshCw, Terminal } from 'lucide-react';

interface ApiTesterViewProps {
  config: BotConfig;
  setConfig: React.Dispatch<React.SetStateAction<BotConfig>>;
  onClientFound?: (client: ClientData) => void;
}

export const ApiTesterView: React.FC<ApiTesterViewProps> = ({ config, setConfig, onClientFound }) => {
  const [clientQuery, setClientQuery] = useState('demo-user@gmail.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  const handleTest3xui = async () => {
    if (!config.panelUrl || !config.panelUsername || !config.panelPassword) {
      setError('Please provide Panel URL, Admin Username, and Admin Password.');
      return;
    }

    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      const res = await fetch('/api/test-3xui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panelUrl: config.panelUrl,
          username: config.panelUsername,
          password: config.panelPassword,
          clientQuery: clientQuery,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to authenticate with 3x-ui panel');
      } else {
        setTestResult(data);
        if (data.client && onClientFound) {
          onClientFound(data.client);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error sending request to 3x-ui panel');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = () => {
    const demoClient: ClientData = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'john_vpn@domain.com',
      subId: 'sub_alpha_9942',
      tgId: 123456789,
      enable: true,
      up: 3 * 1024 * 1024 * 1024 + 450 * 1024 * 1024, // ~3.45 GB
      down: 22 * 1024 * 1024 * 1024 + 120 * 1024 * 1024, // ~22.12 GB
      total: 50 * 1024 * 1024 * 1024, // 50 GB
      expiryTime: Date.now() + 18 * 24 * 60 * 60 * 1000, // 18 days in future
      inboundTag: 'VLESS-REALITY-TCP',
      protocol: 'vless',
    };

    setTestResult({
      success: true,
      message: 'Demo simulated successfully!',
      panelUrl: config.panelUrl || 'https://vps.example.com:2053',
      sessionEstablished: true,
      client: demoClient,
      rawClientResponse: {
        success: true,
        msg: '',
        obj: {
          id: 12,
          inboundId: 1,
          enable: true,
          email: demoClient.email,
          up: demoClient.up,
          down: demoClient.down,
          expiryTime: demoClient.expiryTime,
          total: demoClient.total,
          reset: 0,
        },
      },
    });

    if (onClientFound) onClientFound(demoClient);
  };

  const client: ClientData | null = testResult?.client || null;

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-6">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-sky-400 uppercase">
          <span>Real-time API Inspector</span>
          <span aria-hidden="true">·</span>
          <span>3x-ui Inbound & Client Traversal</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
          3x-ui Panel Live API & Traffic Tester
        </h1>
        <p className="text-sm text-neutral-400 mt-1 max-w-3xl leading-relaxed">
          Verify that your 3x-ui panel is reachable, test the authentication handshake (<code>/login</code>), and query client data statistics (<code>/panel/api/inbounds/getClientTraffics</code>) before deploying to Cloudflare.
        </p>
      </div>

      {/* Grid: Form on Left, Output on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Input Form */}
        <div className="lg:col-span-5 space-y-5">
          <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Server className="w-4 h-4 text-sky-400" />
                <span>Connection Credentials</span>
              </div>
              <button
                type="button"
                onClick={handleLoadDemo}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors"
              >
                Load Sample Client
              </button>
            </div>

            {/* Panel URL */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-300">
                Panel URL (with port)
              </label>
              <input
                type="text"
                value={config.panelUrl}
                onChange={(e) => setConfig({ ...config, panelUrl: e.target.value })}
                placeholder="https://vps.example.com:2053"
                className="w-full px-3 py-2 text-xs font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Username & Password */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-300">
                  Panel Username
                </label>
                <input
                  type="text"
                  value={config.panelUsername}
                  onChange={(e) => setConfig({ ...config, panelUsername: e.target.value })}
                  placeholder="admin"
                  className="w-full px-3 py-2 text-xs font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-300">
                  Panel Password
                </label>
                <input
                  type="password"
                  value={config.panelPassword}
                  onChange={(e) => setConfig({ ...config, panelPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Client Query */}
            <div className="space-y-1 pt-2 border-t border-neutral-800">
              <label className="text-xs font-medium text-neutral-300">
                Client Identifier (Email, UUID, or SubID)
              </label>
              <input
                type="text"
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
                placeholder="client@gmail.com or 550e8400-e29b-..."
                className="w-full px-3 py-2 text-xs font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-sky-500"
              />
              <p className="text-[11px] text-neutral-500">
                The bot can search by email or inbound client UUID.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleTest3xui}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm shadow-sky-950"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
              <span>{loading ? 'Connecting to 3x-ui...' : 'Test Connection & Fetch Client'}</span>
            </button>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300 flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}
          </div>

          {/* Quick info about 3x-ui API */}
          <div className="p-4 bg-neutral-900/30 border border-neutral-800 rounded-xl space-y-2 text-xs text-neutral-400">
            <div className="font-semibold text-neutral-200">How 3x-ui API works:</div>
            <p className="leading-relaxed">
              1. <b>Auth:</b> <code>POST /login</code> with <code>username</code> & <code>password</code> sets a cookie <code>session=...</code>.
            </p>
            <p className="leading-relaxed">
              2. <b>Query:</b> <code>GET /panel/api/inbounds/getClientTraffics/&#123;email&#125;</code> returns upload (up), download (down), and total bytes.
            </p>
            <p className="leading-relaxed">
              3. <b>Search:</b> <code>GET /panel/api/inbounds/list</code> allows matching clients by Telegram User ID (<code>tgId</code>) or subscription key.
            </p>
          </div>
        </div>

        {/* Right: Results Display */}
        <div className="lg:col-span-7 space-y-6">
          {client ? (
            <div className="space-y-6">
              {/* Traffic Card Overview */}
              <div className="border border-neutral-800 bg-neutral-900/50 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-white">{client.email}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      client.enable ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-red-950 text-red-400'
                    }`}>
                      {client.enable ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400">
                    {client.inboundTag || 'Inbound'}
                  </span>
                </div>

                {/* Metrics 3-Col Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
                      <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />
                      <span>Upload</span>
                    </div>
                    <div className="text-sm font-semibold font-mono text-white mt-1 tabular-nums">
                      {formatBytes(client.up)}
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
                      <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Download</span>
                    </div>
                    <div className="text-sm font-semibold font-mono text-white mt-1 tabular-nums">
                      {formatBytes(client.down)}
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
                      <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                      <span>Total Used</span>
                    </div>
                    <div className="text-sm font-semibold font-mono text-white mt-1 tabular-nums">
                      {formatBytes(client.up + client.down)}
                    </div>
                  </div>
                </div>

                {/* Quota & Progress Bar */}
                {(() => {
                  const used = client.up + client.down;
                  const total = client.total;
                  const { bar, percentage } = renderProgressBar(used, total, config.progressStyle, 12);
                  const remaining = total > 0 ? Math.max(0, total - used) : 0;
                  const { text: expiryText } = formatExpiry(client.expiryTime, config.language);

                  return (
                    <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-400">Traffic Quota Usage</span>
                        <span className="font-mono text-white font-semibold tabular-nums">
                          {formatBytes(used)} / {total > 0 ? formatBytes(total) : '∞'} ({percentage}%)
                        </span>
                      </div>

                      {/* Visual bar */}
                      <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-sky-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                        <span>Ascii: {bar}</span>
                        <span className="text-sky-400 font-semibold">
                          {total > 0 ? `${formatBytes(remaining)} remaining` : 'Unlimited'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                        <span className="text-neutral-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Expiration:</span>
                        </span>
                        <span className="text-neutral-200 font-mono">{expiryText}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Telegram Message Preview Simulation */}
              <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-neutral-300">
                    Telegram Message Output Preview
                  </div>
                  <span className="text-[11px] text-neutral-500 font-mono">HTML ParseMode</span>
                </div>

                {/* Simulated Telegram Message Bubble */}
                <div className="max-w-md bg-neutral-950 border border-sky-500/20 rounded-2xl rounded-tl-sm p-4 text-xs font-mono text-neutral-200 space-y-2 shadow-sm">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatTelegramCard(client, config.language, config.progressStyle).replace(
                        /\n/g,
                        '<br/>'
                      ),
                    }}
                  />
                  {/* Inline Buttons Preview */}
                  <div className="pt-2 border-t border-neutral-800/60 flex flex-wrap gap-2">
                    {config.enableRefreshButton && (
                      <span className="px-3 py-1 bg-sky-950/60 border border-sky-800/40 text-sky-300 rounded text-[11px] font-sans font-medium">
                        🔄 Refresh Usage
                      </span>
                    )}
                    {config.enableSubLink && client.subId && (
                      <span className="px-3 py-1 bg-sky-950/60 border border-sky-800/40 text-sky-300 rounded text-[11px] font-sans font-medium">
                        🔗 Subscription Link
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Raw JSON Accordion */}
              <details className="border border-neutral-800 bg-neutral-950 rounded-xl p-4 text-xs group">
                <summary className="font-semibold text-neutral-400 cursor-pointer hover:text-white transition-colors">
                  View Raw 3x-ui API JSON Response
                </summary>
                <div className="mt-3 overflow-x-auto max-h-60 p-3 bg-neutral-900 rounded font-mono text-neutral-300">
                  <pre>{JSON.stringify(testResult.rawClientResponse || testResult.client, null, 2)}</pre>
                </div>
              </details>
            </div>
          ) : (
            <div className="border border-dashed border-neutral-800 rounded-xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-neutral-900 mx-auto flex items-center justify-center text-neutral-500">
                <Server className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-neutral-300">
                No 3x-ui Connection Tested Yet
              </div>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                Enter your panel address and credentials on the left, or click "Load Sample Client" to preview how the traffic parser operates.
              </p>
              <button
                type="button"
                onClick={handleLoadDemo}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-lg font-medium transition-colors"
              >
                Load Sample Client
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

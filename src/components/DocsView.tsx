import React from 'react';
import { BookOpen, ShieldAlert, Cpu, Network, CheckCircle, ExternalLink, Terminal } from 'lucide-react';

export const DocsView: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div className="border border-neutral-800 bg-neutral-900/40 rounded-xl p-6">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-sky-400 uppercase">
          <span>Technical Architecture</span>
          <span aria-hidden="true">·</span>
          <span>Endpoints & Compatibility Guide</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
          3x-ui Panel API Reference & Cloudflare Guidelines
        </h1>
        <p className="text-sm text-neutral-400 mt-1 leading-relaxed">
          Comprehensive guide to the 3x-ui REST endpoints, Telegram Webhook security, and resolving Cloudflare port/SSL restrictions.
        </p>
      </div>

      {/* Section 1: 3x-ui API Endpoints */}
      <div className="border border-neutral-800 bg-neutral-900/30 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-sky-400" />
          <h2 className="text-base font-semibold text-white">
            Core 3x-ui REST Endpoints Used by the Bot
          </h2>
        </div>

        <div className="space-y-4 text-xs font-mono">
          {/* Endpoint 1: Login */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/40 rounded font-bold">
                  POST
                </span>
                <span className="text-sky-300 font-semibold">/login</span>
              </div>
              <span className="text-neutral-500 font-sans">Authentication Handshake</span>
            </div>
            <p className="text-neutral-400 font-sans leading-relaxed">
              Authenticates the bot with your 3x-ui panel and returns a session cookie in the <code>Set-Cookie: session=...</code> response header.
            </p>
            <div className="bg-neutral-900 p-2.5 rounded text-neutral-300">
              <div className="text-neutral-500 font-sans text-[11px] mb-1">Request Body (Form URL Encoded):</div>
              username=admin&password=your_secret_password
            </div>
          </div>

          {/* Endpoint 2: Get Client Traffics by Email */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-sky-950 text-sky-400 border border-sky-800/40 rounded font-bold">
                  GET
                </span>
                <span className="text-sky-300 font-semibold">/panel/api/inbounds/getClientTraffics/&#123;email&#125;</span>
              </div>
              <span className="text-neutral-500 font-sans">Query Traffic Stats</span>
            </div>
            <p className="text-neutral-400 font-sans leading-relaxed">
              Returns real-time upload (<code>up</code>), download (<code>down</code>), quota limit (<code>total</code> in bytes), and expiration timestamp (<code>expiryTime</code> in ms).
            </p>
            <div className="bg-neutral-900 p-2.5 rounded text-neutral-300 overflow-x-auto">
              <div className="text-neutral-500 font-sans text-[11px] mb-1">Response JSON (Sample):</div>
              <pre>{`{
  "success": true,
  "msg": "",
  "obj": {
    "id": 15,
    "inboundId": 2,
    "enable": true,
    "email": "user@gmail.com",
    "up": 1048576000,       // 1 GB upload
    "down": 10485760000,    // 10 GB download
    "total": 53687091200,   // 50 GB quota
    "expiryTime": 1790000000000, // Unix timestamp in ms
    "reset": 0
  }
}`}</pre>
            </div>
          </div>

          {/* Endpoint 3: Inbounds List */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-sky-950 text-sky-400 border border-sky-800/40 rounded font-bold">
                  GET
                </span>
                <span className="text-sky-300 font-semibold">/panel/api/inbounds/list</span>
              </div>
              <span className="text-neutral-500 font-sans">Full Inbound & Client Search</span>
            </div>
            <p className="text-neutral-400 font-sans leading-relaxed">
              Allows the Telegram bot to match clients by their Telegram ID (<code>tgId</code>) or inbound UUID.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Linking Telegram ID in 3x-ui */}
      <div className="border border-neutral-800 bg-neutral-900/30 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-sky-400" />
          <h2 className="text-base font-semibold text-white">
            How to Enable 1-Click "Check My Usage" via Telegram ID
          </h2>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          In 3x-ui, each inbound client has an optional <b>Telegram ID</b> (<code>tgId</code>) field. When you fill this in:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-1">
            <div className="font-semibold text-white">1. Get User Telegram ID</div>
            <p className="text-neutral-400 leading-relaxed">
              Users can find their numeric Telegram ID by chatting with <code>@userinfobot</code> or typing <code>/myusage</code> to your bot.
            </p>
          </div>
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-1">
            <div className="font-semibold text-white">2. Paste in 3x-ui Client Settings</div>
            <p className="text-neutral-400 leading-relaxed">
              Open 3x-ui &rarr; Inbounds &rarr; Edit Client &rarr; Paste their ID in the <b>Telegram ID</b> field.
            </p>
          </div>
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-1">
            <div className="font-semibold text-white">3. Zero-Typing Lookup</div>
            <p className="text-neutral-400 leading-relaxed">
              Now whenever the user clicks <b>⚡ Check My Usage</b>, the bot automatically finds their account without needing to type!
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Cloudflare Port & SSL Restrictions */}
      <div className="border border-neutral-800 bg-neutral-900/30 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-semibold text-white">
            Cloudflare Compatibility: Ports & HTTPS Certificates
          </h2>
        </div>

        <div className="space-y-3 text-xs leading-relaxed text-neutral-300">
          <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-lg space-y-2">
            <div className="font-semibold text-amber-300">Port Rules If 3x-ui Domain is Proxied by Cloudflare (Orange Cloud):</div>
            <p className="text-neutral-300">
              If your panel domain has Cloudflare Proxy (Orange Cloud) enabled in DNS, Cloudflare <b>only</b> permits incoming traffic on these specific HTTPS ports:
            </p>
            <div className="font-mono text-amber-400 font-semibold">
              443, 2053, 2083, 2087, 2096, 8443
            </div>
            <p className="text-neutral-400">
              <i>Recommendation: Set your 3x-ui panel web port to <b>2053</b> or <b>8443</b>, or turn DNS proxy to "DNS Only" (Grey Cloud).</i>
            </p>
          </div>

          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
            <div className="font-semibold text-white">Valid SSL Certificate Required:</div>
            <p className="text-neutral-400">
              Cloudflare Workers verify SSL certificates on all outgoing <code>fetch()</code> requests. If your 3x-ui panel uses an untrusted or expired self-signed certificate, the Worker fetch will throw an SSL error.
            </p>
            <p className="text-neutral-400">
              To fix: In 3x-ui panel settings &rarr; Panel Settings &rarr; SSL Certificate, request a free certificate from Let's Encrypt or use Acme.sh.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

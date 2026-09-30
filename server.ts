import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper for custom 3x-ui agent to allow self-signed / IP certificates often used in VPS panels
const insecureHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
});
const httpAgent = new http.Agent();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // 1. Test 3x-ui Panel Connection & Query Client Data
  app.post('/api/test-3xui', async (req: Request, res: Response) => {
    try {
      const { panelUrl, username, password, clientQuery } = req.body;

      if (!panelUrl || !username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Panel URL, username, and password are required',
        });
      }

      // Clean panel URL: strip trailing slash
      let cleanUrl = panelUrl.trim().replace(/\/+$/, '');
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }

      // Step A: Login
      const loginUrl = `${cleanUrl}/login`;
      const isHttps = cleanUrl.startsWith('https://');

      // 3x-ui supports form-urlencoded & json
      const loginParams = new URLSearchParams();
      loginParams.append('username', username);
      loginParams.append('password', password);

      const loginResp = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': '3x-ui-Telegram-Bot/1.0',
        },
        body: loginParams.toString(),
        // @ts-expect-error Node fetch agent support
        agent: isHttps ? insecureHttpsAgent : httpAgent,
      });

      if (!loginResp.ok) {
        return res.status(401).json({
          success: false,
          error: `Login failed with HTTP status ${loginResp.status} (${loginResp.statusText}). Check Panel URL, port, and credentials.`,
        });
      }

      const loginData = (await loginResp.json().catch(() => null)) as { success?: boolean; msg?: string } | null;
      if (loginData && loginData.success === false) {
        return res.status(401).json({
          success: false,
          error: loginData.msg || 'Invalid 3x-ui panel username or password',
        });
      }

      // Extract session cookie
      const rawCookie = loginResp.headers.get('set-cookie');
      let sessionCookie = '';
      if (rawCookie) {
        const match = rawCookie.match(/session=([^;]+)/);
        if (match) {
          sessionCookie = match[0];
        } else {
          sessionCookie = rawCookie.split(';')[0];
        }
      }

      if (!sessionCookie) {
        return res.status(500).json({
          success: false,
          error: 'Panel returned 200 OK, but no session cookie was found in response headers.',
        });
      }

      // Step B: Query Client Traffic if clientQuery provided
      let clientResult: any = null;
      let rawClientResponse: any = null;

      if (clientQuery && clientQuery.trim()) {
        const query = clientQuery.trim();
        // Method 1: Try getClientTraffics/{email}
        const trafficUrl = `${cleanUrl}/panel/api/inbounds/getClientTraffics/${encodeURIComponent(query)}`;
        const trafficResp = await fetch(trafficUrl, {
          method: 'GET',
          headers: {
            Cookie: sessionCookie,
            Accept: 'application/json',
            'User-Agent': '3x-ui-Telegram-Bot/1.0',
          },
          // @ts-expect-error Node fetch agent support
          agent: isHttps ? insecureHttpsAgent : httpAgent,
        });

        if (trafficResp.ok) {
          const trafficData = (await trafficResp.json().catch(() => null)) as any;
          rawClientResponse = trafficData;
          if (trafficData && trafficData.success && trafficData.obj) {
            clientResult = trafficData.obj;
          }
        }

        // Method 2: If not found or empty, search via /panel/api/inbounds/list
        if (!clientResult) {
          const listUrl = `${cleanUrl}/panel/api/inbounds/list`;
          const listResp = await fetch(listUrl, {
            method: 'GET',
            headers: {
              Cookie: sessionCookie,
              Accept: 'application/json',
            },
            // @ts-expect-error Node fetch agent support
            agent: isHttps ? insecureHttpsAgent : httpAgent,
          });

          if (listResp.ok) {
            const listData = (await listResp.json().catch(() => null)) as any;
            if (listData && listData.success && Array.isArray(listData.obj)) {
              for (const inbound of listData.obj) {
                // Inbound settings contains clients array (stringified JSON)
                let clients = [];
                try {
                  const settings = JSON.parse(inbound.settings || '{}');
                  clients = settings.clients || [];
                } catch {
                  clients = [];
                }

                const clientStats = inbound.clientStats || [];

                for (const c of clients) {
                  const matches =
                    c.email?.toLowerCase() === query.toLowerCase() ||
                    c.id?.toLowerCase() === query.toLowerCase() ||
                    c.subId?.toLowerCase() === query.toLowerCase() ||
                    String(c.tgId) === query;

                  if (matches) {
                    // Match with stats
                    const stat = clientStats.find((s: any) => s.email === c.email) || {};
                    clientResult = {
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
                      protocol: inbound.protocol,
                    };
                    break;
                  }
                }
                if (clientResult) break;
              }
            }
          }
        }
      }

      return res.json({
        success: true,
        message: 'Connected to 3x-ui panel successfully!',
        panelUrl: cleanUrl,
        sessionEstablished: true,
        client: clientResult,
        rawClientResponse,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Error communicating with 3x-ui panel',
      });
    }
  });

  // 2. Telegram Bot API: Test Token / getMe
  app.post('/api/telegram/test-bot', async (req: Request, res: Response) => {
    try {
      const { botToken } = req.body;
      if (!botToken || !botToken.trim()) {
        return res.status(400).json({ success: false, error: 'Telegram Bot Token is required' });
      }

      const cleanToken = botToken.trim();
      const resp = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        return res.status(400).json({
          success: false,
          error: data.description || 'Invalid Telegram Bot Token',
        });
      }

      return res.json({
        success: true,
        bot: data.result,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to contact Telegram API',
      });
    }
  });

  // 3. Telegram Bot API: Set Webhook
  app.post('/api/telegram/set-webhook', async (req: Request, res: Response) => {
    try {
      const { botToken, workerUrl, secretToken } = req.body;
      if (!botToken || !workerUrl) {
        return res.status(400).json({
          success: false,
          error: 'Bot token and Cloudflare Worker URL are required',
        });
      }

      const cleanToken = botToken.trim();
      let cleanWorkerUrl = workerUrl.trim();
      if (!cleanWorkerUrl.startsWith('https://')) {
        return res.status(400).json({
          success: false,
          error: 'Cloudflare Worker URL must start with https://',
        });
      }

      const body: any = {
        url: cleanWorkerUrl,
        drop_pending_updates: false,
        allowed_updates: ['message', 'callback_query'],
      };

      if (secretToken && secretToken.trim()) {
        body.secret_token = secretToken.trim();
      }

      const resp = await fetch(`https://api.telegram.org/bot${cleanToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        return res.status(400).json({
          success: false,
          error: data.description || 'Failed to set Telegram webhook',
        });
      }

      return res.json({
        success: true,
        result: data.result,
        description: data.description,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Error setting webhook',
      });
    }
  });

  // 4. Telegram Bot API: Get Webhook Info
  app.post('/api/telegram/webhook-info', async (req: Request, res: Response) => {
    try {
      const { botToken } = req.body;
      if (!botToken) {
        return res.status(400).json({ success: false, error: 'Bot token is required' });
      }

      const cleanToken = botToken.trim();
      const resp = await fetch(`https://api.telegram.org/bot${cleanToken}/getWebhookInfo`);
      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        return res.status(400).json({
          success: false,
          error: data.description || 'Failed to get webhook info',
        });
      }

      return res.json({
        success: true,
        webhookInfo: data.result,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Error fetching webhook info',
      });
    }
  });

  // Vite development middleware or static production serve
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

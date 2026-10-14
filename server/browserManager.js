import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { WebSocketServer } from 'ws';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

class BrowserSessionManager {
  constructor() {
    this.sessions = new Map(); // key: sessionKey => { browser, page, cdp, clients: Set }
  }

  getSessionKey(handle, sectionId) {
    const cleanHandle = (handle || 'default').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const cleanSection = (sectionId || 'main').replace(/[^a-zA-Z0-9_.-]/g, '_');
    return `${cleanHandle}_${cleanSection}`;
  }

  async getOrCreateSession(handle, sectionId, initialUrl, viewport = { width: 500, height: 750 }) {
    const key = this.getSessionKey(handle, sectionId);

    if (this.sessions.has(key)) {
      const existing = this.sessions.get(key);
      if (existing.browser && existing.browser.isConnected() && existing.page) {
        return existing;
      }
    }

    const sessionDir = path.resolve(process.cwd(), 'browser-sessions', key);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      userDataDir: sessionDir,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        `--window-size=${viewport.width},${viewport.height}`,
        '--disable-notifications'
      ]
    });

    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();
    await page.setViewport(viewport);

    // Set standard browser user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    const cdp = await page.target().createCDPSession();

    const sessionData = {
      key,
      browser,
      page,
      cdp,
      clients: new Set(),
      lastFrame: null,
      currentUrl: initialUrl || `https://www.instagram.com/${handle || ''}`,
      viewport
    };

    // Listen to screencast frames
    cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
      sessionData.lastFrame = data;
      const payload = JSON.stringify({
        type: 'frame',
        data: `data:image/jpeg;base64,${data}`,
        url: page.url()
      });

      for (const client of sessionData.clients) {
        if (client.readyState === 1) { // OPEN
          client.send(payload);
        }
      }

      try {
        await cdp.send('Page.screencastFrameAck', { sessionId });
      } catch (err) {
        // Ignored if session closing
      }
    });

    // Start screencast
    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 75,
      maxWidth: viewport.width,
      maxHeight: viewport.height,
      everyNthFrame: 1
    });

    // Navigate to initial URL
    const targetUrl = initialUrl || `https://www.instagram.com/${handle ? handle.replace(/^@/, '') + '/' : ''}`;
    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (e) {
      console.warn('Initial navigation note:', e.message);
    }

    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        const newUrl = page.url();
        sessionData.currentUrl = newUrl;
        const navPayload = JSON.stringify({ type: 'navigated', url: newUrl });
        for (const client of sessionData.clients) {
          if (client.readyState === 1) client.send(navPayload);
        }
      }
    });

    browser.on('disconnected', () => {
      this.sessions.delete(key);
    });

    this.sessions.set(key, sessionData);
    return sessionData;
  }

  attachWebSocketServer(server) {
    const wss = new WebSocketServer({ server, path: '/browser-stream' });

    wss.on('connection', (ws) => {
      let currentSession = null;

      ws.on('message', async (message) => {
        try {
          const msg = JSON.parse(message.toString());

          if (msg.type === 'init') {
            const { handle, sectionId, url, width, height } = msg;
            const viewport = {
              width: width ? Math.round(width) : 520,
              height: height ? Math.round(height) : 740
            };

            // Remove from old session if any
            if (currentSession) {
              currentSession.clients.delete(ws);
            }

            currentSession = await this.getOrCreateSession(handle, sectionId, url, viewport);
            currentSession.clients.add(ws);

            // Send immediately last cached frame if available
            if (currentSession.lastFrame) {
              ws.send(JSON.stringify({
                type: 'frame',
                data: `data:image/jpeg;base64,${currentSession.lastFrame}`,
                url: currentSession.page.url()
              }));
            }

            ws.send(JSON.stringify({
              type: 'ready',
              url: currentSession.page.url(),
              key: currentSession.key
            }));
            return;
          }

          if (!currentSession || !currentSession.page) return;
          const { page } = currentSession;

          switch (msg.type) {
            case 'navigate': {
              if (msg.url) {
                await page.goto(msg.url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
              }
              break;
            }
            case 'click': {
              const { x, y } = msg;
              if (typeof x === 'number' && typeof y === 'number') {
                await page.mouse.click(x, y);
              }
              break;
            }
            case 'mousedown': {
              const { x, y } = msg;
              if (typeof x === 'number' && typeof y === 'number') {
                await page.mouse.move(x, y);
                await page.mouse.down();
              }
              break;
            }
            case 'mouseup': {
              const { x, y } = msg;
              if (typeof x === 'number' && typeof y === 'number') {
                await page.mouse.move(x, y);
                await page.mouse.up();
              }
              break;
            }
            case 'mousemove': {
              const { x, y } = msg;
              if (typeof x === 'number' && typeof y === 'number') {
                await page.mouse.move(x, y);
              }
              break;
            }
            case 'wheel': {
              const { deltaX, deltaY } = msg;
              await page.mouse.wheel({ deltaX: deltaX || 0, deltaY: deltaY || 0 });
              break;
            }
            case 'type': {
              if (msg.text) {
                await page.keyboard.type(msg.text);
              }
              break;
            }
            case 'keypress': {
              if (msg.key) {
                if (msg.key === 'Enter') {
                  await page.keyboard.press('Enter');
                } else if (msg.key === 'Backspace') {
                  await page.keyboard.press('Backspace');
                } else if (msg.key === 'Tab') {
                  await page.keyboard.press('Tab');
                } else if (msg.key === 'Escape') {
                  await page.keyboard.press('Escape');
                } else if (msg.key.length === 1) {
                  await page.keyboard.type(msg.key);
                } else {
                  await page.keyboard.press(msg.key);
                }
              }
              break;
            }
            case 'reload': {
              await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
              break;
            }
            case 'back': {
              await page.goBack().catch(() => {});
              break;
            }
            case 'forward': {
              await page.goForward().catch(() => {});
              break;
            }
            case 'resize': {
              if (msg.width && msg.height) {
                const w = Math.round(msg.width);
                const h = Math.round(msg.height);
                await page.setViewport({ width: w, height: h });
                if (currentSession.cdp) {
                  await currentSession.cdp.send('Page.startScreencast', {
                    format: 'jpeg',
                    quality: 75,
                    maxWidth: w,
                    maxHeight: h,
                    everyNthFrame: 1
                  });
                }
              }
              break;
            }
          }
        } catch (err) {
          console.error('WebSocket browser message error:', err.message);
        }
      });

      ws.on('close', () => {
        if (currentSession) {
          currentSession.clients.delete(ws);
        }
      });
    });

    console.log('[BrowserSessionManager] WebSocket browser stream active at ws://localhost:5000/browser-stream');
  }
}

export const browserManager = new BrowserSessionManager();

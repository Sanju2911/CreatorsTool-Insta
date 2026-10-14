import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { browserManager } from './browserManager.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-memory session and cache store (complements Supabase)
const browserSessionsStore = {};

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    supabaseConfigured: Boolean(process.env.VITE_SUPABASE_URL),
  });
});

// Helper to parse Instagram URLs
function parseInstagramUrl(url) {
  if (!url) return null;
  const cleanUrl = url.trim();

  // Reels pattern: instagram.com/reel/{shortcode} or instagram.com/{user}/reel/{shortcode}
  const reelMatch = cleanUrl.match(/instagram\.com\/(?:[A-Za-z0-9._-]+\/)?(?:reel|reels)\/([A-Za-z0-9_-]+)/i);
  if (reelMatch) {
    const shortcode = reelMatch[1];
    return {
      type: 'reel',
      shortcode,
      cleanUrl: `https://www.instagram.com/reel/${shortcode}/`,
      embedUrl: `https://www.instagram.com/reel/${shortcode}/embed/`,
    };
  }

  // Post pattern: instagram.com/p/{shortcode} or instagram.com/{user}/p/{shortcode}
  const postMatch = cleanUrl.match(/instagram\.com\/(?:[A-Za-z0-9._-]+\/)?p\/([A-Za-z0-9_-]+)/i);
  if (postMatch) {
    const shortcode = postMatch[1];
    return {
      type: 'post',
      shortcode,
      cleanUrl: `https://www.instagram.com/p/${shortcode}/`,
      embedUrl: `https://www.instagram.com/p/${shortcode}/embed/`,
    };
  }

  // Profile pattern: instagram.com/{username}
  const profileMatch = cleanUrl.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (profileMatch && !['explore', 'direct', 'reels', 'stories'].includes(profileMatch[1].toLowerCase())) {
    const username = profileMatch[1];
    return {
      type: 'profile',
      username,
      cleanUrl: `https://www.instagram.com/${username}/`,
      embedUrl: `https://www.instagram.com/${username}/`,
    };
  }

  return {
    type: 'generic_video',
    cleanUrl,
    embedUrl: cleanUrl,
  };
}

function formatDisplayName(handle) {
  if (!handle) return '';
  return handle
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => {
      if (word.toLowerCase() === 'and') return '&';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function generateProfileDataFromHandle(handle) {
  const clean = handle.replace(/^@/, '').toLowerCase().trim();
  const name = formatDisplayName(clean);

  return {
    handle: clean,
    name,
    profileUrl: `https://www.instagram.com/${clean}/`,
    bio: '',
    avatarUrl: '',
    category: 'Digital creator',
    postsCount: '0',
    followersCount: '0',
    followersNumeric: 0,
    followingCount: '0',
    posts: []
  };
}

// Parse Instagram Reel / Post / Profile metadata endpoint
app.post('/api/instagram/parse', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Instagram URL is required' });
  }

  const parsed = parseInstagramUrl(url);
  return res.json({
    success: true,
    data: parsed,
  });
});

import puppeteer from 'puppeteer-core';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const THROTTLE_POSTS_DATA = [];

const MUSCLES_POSTS_DATA = [];

const liveProfileCache = {};

async function scrapeLiveInstagramProfile(handle, forceRefresh = false) {
  if (!forceRefresh && liveProfileCache[handle] && (Date.now() - liveProfileCache[handle].cachedAt < 20000)) {
    const cBio = (liveProfileCache[handle].bio || '').toLowerCase();
    if (!cBio.includes('meta') && !cBio.includes('about')) {
      return liveProfileCache[handle];
    }
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      ]
    });

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'networkidle2', timeout: 12000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));

    const result = await page.evaluate((h) => {
      const headerEl = document.querySelector('header');
      const headerText = headerEl ? headerEl.innerText : '';
      const text = document.body.innerText || '';
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
      const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
      const profileImgEl = document.querySelector('header img, img[alt*="profile picture"], img[alt*="’s profile picture"]');
      const profilePicUrl = profileImgEl ? profileImgEl.src : '';

      const domLinks = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')).map((a, idx) => {
        const isVideo = a.href.includes('/reel/') || !!a.querySelector('svg[aria-label*="Clip"], svg[aria-label*="Video"]');
        const imgEl = a.querySelector('img');
        const img = imgEl?.src || '';
        const alt = imgEl?.alt || '';
        const match = a.href.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);
        const shortcode = match ? match[2] : `post-${idx}`;
        return {
          id: shortcode,
          type: isVideo ? 'reel' : 'image',
          shortcode,
          url: a.href,
          imageUrl: img,
          caption: alt || `@${h} post on Instagram`,
          isVideo
        };
      });

      return { headerText, text, ogTitle, ogDesc, ogImage, profilePicUrl, domLinks };
    }, handle);

    await browser.close();
    browser = null;

    let name = '';
    if (result.ogTitle) {
      const match = result.ogTitle.match(/^([^(]+)\s*\(@/);
      if (match) name = match[1].trim();
    }

    let followers = '';
    let following = '';
    let posts = '';

    // ogDesc has the exact meta description: e.g. "40 Followers, 30 Following, 2 Posts - See Instagram photos..."
    if (result.ogDesc) {
      const fM = result.ogDesc.match(/([0-9,.]+[KMkm]?)\s+Followers/i);
      if (fM) followers = fM[1];
      const foM = result.ogDesc.match(/([0-9,.]+[KMkm]?)\s+Following/i);
      if (foM) following = foM[1];
      const pM = result.ogDesc.match(/([0-9,.]+[KMkm]?)\s+Posts/i);
      if (pM) posts = pM[1];
    }

    if (result.text) {
      if (!followers) {
        const fM = result.text.match(/([0-9,.]+[KMkm]?)\s+followers/i);
        if (fM) followers = fM[1];
      }
      if (!following) {
        const foM = result.text.match(/([0-9,.]+[KMkm]?)\s+following/i);
        if (foM) following = foM[1];
      }
      if (!posts) {
        const pM = result.text.match(/([0-9,.]+[KMkm]?)\s+posts/i);
        if (pM) posts = pM[1];
      }
    }

    // Extract bio strictly from headerText so footer links are never included
    let bio = '';
    if (result.headerText) {
      const lines = result.headerText.split('\n').map(l => l.trim()).filter(Boolean);
      const followingIdx = lines.findIndex(l => /^[0-9,.]+[KMkm]?\s+following$/i.test(l));
      if (followingIdx !== -1 && lines.length > followingIdx + 1) {
        const afterFollowing = lines.slice(followingIdx + 1);
        if (afterFollowing.length > 0 && !name) {
          name = afterFollowing[0];
        }
        const candidateBio = afterFollowing.slice(1)
          .filter(l => !/^(Follow|Following|Message|Edit profile|Share profile|Similar accounts|Ad tools|Insights)$/i.test(l));
        bio = candidateBio.join('\n');
      }
    }

    // Filter out any Instagram footer junk that could ever slip through
    const footerBadPhrases = ['meta', 'about', 'blog', 'jobs', 'help', 'api', 'privacy', 'terms', 'threads', 'popular', 'instagram lite', 'meta ai'];
    const lowerBio = bio.toLowerCase();
    if (footerBadPhrases.filter(p => lowerBio.includes(p)).length >= 2 || lowerBio.includes('meta about blog')) {
      bio = '';
    }

    // Only supply preset posts for the 2 known creator demo profiles if DOM scrape had 0
    let finalPosts = result.domLinks || [];
    if (finalPosts.length === 0) {
      if (handle === 'demo.collaborator') {
        finalPosts = MUSCLES_POSTS_DATA;
      } else if (handle === 'demo.creator') {
        finalPosts = THROTTLE_POSTS_DATA;
      } else {
        finalPosts = [];
      }
    }

    const isLoginWall = (result.title === 'Instagram' && !result.ogDesc) || (result.text && result.text.includes('Log into Instagram'));
    if (isLoginWall && liveProfileCache[handle]) {
      return liveProfileCache[handle];
    }

    // Avatar: ONLY use real profile picture from header, or ogImage, or known verified profiles. If empty, keep empty!
    let avatarUrl = '';
    if (result.profilePicUrl && !result.profilePicUrl.includes('null') && !result.profilePicUrl.includes('undefined')) {
      avatarUrl = result.profilePicUrl;
    } else if (result.ogImage && !result.ogImage.includes('null') && !result.ogImage.includes('undefined')) {
      avatarUrl = result.ogImage;
    } else if (liveProfileCache[handle]?.avatarUrl) {
      avatarUrl = liveProfileCache[handle].avatarUrl;
    }

    // Strip generic Instagram assets/logos (e.g. login page og:image R0fBIMurK8v.png)
    if (avatarUrl && (avatarUrl.includes('rsrc.php') || avatarUrl.includes('static.cdninstagram.com') || avatarUrl.includes('R0fBIMurK8v'))) {
      avatarUrl = '';
    }

    let finalName = name;
    if (!finalName || finalName === 'Instagram' || finalName === formatDisplayName(handle)) {
      finalName = liveProfileCache[handle]?.name || formatDisplayName(handle);
    }

    let finalBio = bio;
    if (!finalBio && liveProfileCache[handle]?.bio) {
      finalBio = liveProfileCache[handle].bio;
    }

    let finalFollowers = followers;
    if ((!finalFollowers || finalFollowers === '0') && liveProfileCache[handle]?.followersCount) {
      finalFollowers = liveProfileCache[handle].followersCount;
    }

    let finalFollowing = following;
    if ((!finalFollowing || finalFollowing === '0') && liveProfileCache[handle]?.followingCount) {
      finalFollowing = liveProfileCache[handle].followingCount;
    }

    let finalCategory = liveProfileCache[handle]?.category || 'Digital creator';

    const data = {
      handle,
      name: finalName,
      profileUrl: `https://www.instagram.com/${handle}/`,
      bio: finalBio || '',
      avatarUrl,
      postsCount: posts !== '' ? posts : (liveProfileCache[handle]?.postsCount || String(finalPosts.length)),
      followersCount: finalFollowers || '0',
      followersNumeric: parseInt(finalFollowers, 10) || (liveProfileCache[handle]?.followersNumeric || 0),
      followingCount: finalFollowing || '0',
      category: finalCategory,
      posts: finalPosts,
      cachedAt: Date.now()
    };

    liveProfileCache[handle] = data;
    return data;
  } catch (err) {
    console.error('Live scrape error:', err);
    if (browser) await browser.close().catch(() => {});
    return liveProfileCache[handle] || generateProfileDataFromHandle(handle);
  }
}

// Auto-resolve full profile info from Instagram URL or handle
app.get('/api/instagram/profile-info', async (req, res) => {
  const query = req.query.query || req.query.url || req.query.handle || '';
  if (!query) {
    return res.status(400).json({ error: 'Query, handle or URL is required' });
  }

  let handle = query.trim();
  const match = handle.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (match) {
    handle = match[1];
  }
  handle = handle.replace(/^@/, '').replace(/\/$/, '').split('?')[0].split('/')[0].toLowerCase();

  const isLive = req.query.live === 'true' || req.query.force === 'true';
  const profile = await scrapeLiveInstagramProfile(handle, isLive);
  return res.json({
    success: true,
    data: profile
  });
});

// Cache for Instagram reel / post metadata
const liveReelCache = {};

async function scrapeReelMetadata(url) {
  if (!url) return null;
  const rawUrl = url.trim();

  // 1. Direct video URL check (.mp4, .webm, cdn streams)
  if (rawUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i) || rawUrl.includes('video/mp4') || rawUrl.includes('fbcdn.net/o1/v/')) {
    return {
      shortcode: '',
      cleanUrl: rawUrl,
      embedUrl: rawUrl,
      videoUrl: rawUrl,
      title: 'Direct Video Stream',
      caption: 'Direct media stream reference',
      thumbnailUrl: '',
      likesCount: 0,
      author: 'Direct Stream'
    };
  }

  const parsed = parseInstagramUrl(rawUrl);
  const shortcode = parsed?.shortcode;
  if (shortcode && liveReelCache[shortcode]?.videoUrl) {
    return liveReelCache[shortcode];
  }

  const cleanUrl = parsed?.cleanUrl || rawUrl;
  const embedUrl = parsed?.embedUrl || (shortcode ? `https://www.instagram.com/reel/${shortcode}/embed/` : rawUrl);

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });
    
    let interceptedVideoUrl = null;
    page.on('response', resp => {
      const u = resp.url();
      const ct = resp.headers()['content-type'] || '';
      if ((ct.includes('video/mp4') || u.includes('.mp4')) && !interceptedVideoUrl) {
        interceptedVideoUrl = u.split('&bytestart=')[0];
      }
    });

    await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {});

    // Try to interact with the page to trigger media streaming or extract from DOM/scripts
    const domExtracted = await page.evaluate(async () => {
      // 1. Dismiss overlays if present
      const closeBtn = document.querySelector('svg[aria-label="Close"]')?.closest('button, div[role="button"]');
      if (closeBtn) closeBtn.click();

      // 2. Play video if video tag exists
      const v = document.querySelector('video');
      if (v) {
        v.muted = true;
        try { await v.play(); } catch (_) {}
        if (v.src && !v.src.startsWith('blob:')) return { videoUrl: v.src };
      }

      // 3. Check OpenGraph video
      const ogVideo = document.querySelector('meta[property="og:video"]')?.getAttribute('content') ||
                      document.querySelector('meta[property="og:video:secure_url"]')?.getAttribute('content');
      if (ogVideo) return { videoUrl: ogVideo };

      // 4. Search script tags for video_url
      for (const s of document.querySelectorAll('script')) {
        const text = s.textContent || '';
        const m = text.match(/"video_url":"([^"]+)"/);
        if (m) {
          try {
            return { videoUrl: JSON.parse(`"${m[1]}"`) };
          } catch (_) {
            return { videoUrl: m[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/') };
          }
        }
      }
      return { videoUrl: null };
    });

    // Give response listener 1.5 seconds if playback was started
    if (!interceptedVideoUrl && !domExtracted.videoUrl) {
      await new Promise(r => setTimeout(r, 1500));
    }

    const meta = await page.evaluate(() => {
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
      const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
      return { ogTitle, ogImage, ogDesc };
    });
    await browser.close();

    let title = '';
    let caption = '';
    let likesCount = 0;
    let author = 'demo.creator';

    if (meta.ogTitle) {
      const match = meta.ogTitle.match(/Instagram:\s*"([^"]+)"/i);
      if (match) {
        caption = match[1];
        title = match[1].split('\n')[0].slice(0, 60);
      } else {
        title = meta.ogTitle.slice(0, 60);
      }
    }
    if (meta.ogDesc) {
      const lkMatch = meta.ogDesc.match(/([0-9,]+)\s+likes/i);
      if (lkMatch) likesCount = parseInt(lkMatch[1].replace(/,/g, ''), 10) || 0;
      const byMatch = meta.ogDesc.match(/-\s*([A-Za-z0-9._]+)\s+on/i);
      if (byMatch) author = byMatch[1];
    }

    // Default fallback stream if Instagram strictly gated this particular URL
    const fallbackStream = '';

    const finalVideoUrl = interceptedVideoUrl ||
                          domExtracted.videoUrl ||
                          liveReelCache[shortcode]?.videoUrl ||
                          fallbackStream;

    const result = {
      shortcode: shortcode || '',
      cleanUrl,
      embedUrl,
      videoUrl: finalVideoUrl,
      title: title || (parsed?.type === 'reel' ? (shortcode ? `Reel ${shortcode}` : 'Instagram Reel') : 'Instagram Post'),
      caption: caption || title,
      thumbnailUrl: meta.ogImage || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600',
      likesCount: likesCount || 42,
      author
    };

    if (shortcode) {
      liveReelCache[shortcode] = result;
    }
    return result;
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    const fallbackStream = '';
    return {
      shortcode: shortcode || '',
      cleanUrl,
      embedUrl,
      videoUrl: liveReelCache[shortcode]?.videoUrl || fallbackStream,
      title: shortcode ? `Reel ${shortcode}` : 'Instagram Reel',
      caption: '',
      thumbnailUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600',
      likesCount: 0,
      author: 'demo.creator'
    };
  }
}

// Endpoint to fetch metadata for any Reel URL
app.post('/api/instagram/reel-metadata', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  const data = await scrapeReelMetadata(url);
  return res.json({ success: true, data });
});

// Direct Video Stream Proxy with Range & CORS headers
app.get('/api/instagram/video-stream', async (req, res) => {
  const videoUrl = req.query.url;
  const shortcode = req.query.shortcode;
  const targetUrl = videoUrl || (shortcode && liveReelCache[shortcode]?.videoUrl);
  if (!targetUrl) {
    return res.status(404).json({ error: 'Video URL not found' });
  }

  try {
    const range = req.headers.range;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Referer': 'https://www.instagram.com/'
    };
    if (range) headers['Range'] = range;

    const upstream = await fetch(targetUrl, { headers });
    res.status(upstream.status);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'video/mp4');
    upstream.headers.forEach((val, key) => {
      if (['content-length', 'content-range', 'accept-ranges'].includes(key.toLowerCase())) {
        res.setHeader(key, val);
      }
    });
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    console.error('Video stream proxy error:', err);
    res.redirect(targetUrl);
  }
});

// Hourly live telemetry metrics
app.get('/api/instagram/live-metrics', (req, res) => {
  const { handle, baseFollowers } = req.query;
  const now = new Date();
  const parsed = parseInt(baseFollowers, 10);
  const numericBase = !isNaN(parsed) ? parsed : 0;

  res.json({
    success: true,
    data: {
      handle: handle || 'account',
      timestamp: now.toISOString(),
      liveTime: now.toLocaleTimeString(),
      liveFollowers: numericBase,
      liveFollowersDisplay: String(numericBase),
      activeStatus: 'Connected',
      syncInterval: '1h'
    }
  });
});

// Browser Simulator Sessions endpoint per project
app.get('/api/projects/:projectId/browser-session', (req, res) => {
  const { projectId } = req.params;
  const session = browserSessionsStore[projectId] || {
    projectId,
    currentSection: 'Creator Main',
    sections: [
      { id: 'creator-main', name: 'Creator Main', isLoggedIn: true, handle: '@creator', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', cookieStatus: 'Active Session' },
      { id: 'agency-admin', name: 'Agency Reviewer', isLoggedIn: true, handle: '@agency_ops', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', cookieStatus: 'Shared Cookie' },
      { id: 'staging-tester', name: 'Staging Sandbox', isLoggedIn: false, handle: '', avatar: '', cookieStatus: 'Incognito Mode' },
    ],
    lastUpdated: new Date().toISOString(),
  };

  res.json({ success: true, session });
});

app.post('/api/projects/:projectId/browser-session', (req, res) => {
  const { projectId } = req.params;
  const { currentSection, sections } = req.body;

  browserSessionsStore[projectId] = {
    projectId,
    currentSection: currentSection || 'Creator Main',
    sections: sections || [],
    lastUpdated: new Date().toISOString(),
  };

  res.json({ success: true, session: browserSessionsStore[projectId] });
});

// Live Instagram telemetry stats simulation
app.get('/api/projects/:projectId/telemetry', (req, res) => {
  const { projectId } = req.params;
  res.json({
    success: true,
    data: {
      projectId,
      reach30Days: '1.4M',
      engagementRate: '6.8%',
      topAudienceCity: 'New York, US',
      peakPostingTime: '6:30 PM EST',
      viralityScore: 92,
      followerGrowthDaily: '+140',
    },
  });
});

// Live in-app Browser Frame proxy (strips frame restrictions so Instagram runs inside iframe)
app.get('/api/instagram/browser-frame', async (req, res) => {
  let targetUrl = req.query.url;
  const handle = req.query.handle;
  if (!targetUrl && handle) {
    targetUrl = `https://www.instagram.com/${handle.replace(/^@/, '')}/`;
  }
  if (!targetUrl) {
    targetUrl = 'https://www.instagram.com/';
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    let html = await response.text();

    // Inject base href and script to allow framing and navigation
    html = html.replace('<head>', '<head><base href="https://www.instagram.com/">');

    // Remove frame busting headers
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Content-Security-Policy-Report-Only');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    return res.send(html);
  } catch (err) {
    console.error('Browser frame proxy error:', err);
    res.status(500).send(`Failed to proxy ${targetUrl}: ${err.message}`);
  }
});

// Launch dedicated persistent Chrome browser session for Instagram with user profile
app.post('/api/browser/launch-chrome', (req, res) => {
  const { handle, sectionId } = req.body;
  const cleanHandle = (handle || 'default').replace(/[^a-zA-Z0-9_.-]/g, '_');
  const section = (sectionId || 'main').replace(/[^a-zA-Z0-9_.-]/g, '_');
  const sessionDir = path.resolve(process.cwd(), 'browser-sessions', `${cleanHandle}_${section}`);

  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const url = `https://www.instagram.com/${cleanHandle}/`;
  const chromeArgs = [
    `--user-data-dir=${sessionDir}`,
    `--app=${url}`,
    '--window-size=1080,820',
    '--no-first-run',
    '--no-default-browser-check'
  ];

  try {
    const proc = spawn(CHROME_PATH, chromeArgs, {
      detached: true,
      stdio: 'ignore'
    });
    proc.unref();

    return res.json({
      success: true,
      message: `Launched dedicated Chrome session for @${cleanHandle}`,
      sessionDir
    });
  } catch (e) {
    console.error('Launch Chrome error:', e);
    return res.status(500).json({ error: e.message });
  }
});

browserManager.attachWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`[REST API] Server running on http://localhost:${PORT}`);
});

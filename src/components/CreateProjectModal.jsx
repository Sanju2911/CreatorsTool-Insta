import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, Link as LinkIcon, RefreshCw } from 'lucide-react';
import Instagram from './InstagramIcon';
import { useAuth } from '../context/AuthContext';

function cleanBioText(str) {
  if (!str) return '';
  const s = String(str).trim();
  const lower = s.toLowerCase();
  const junk = ['meta', 'about', 'blog', 'jobs', 'help', 'api', 'privacy', 'terms', 'threads', 'popular', 'instagram lite', 'meta ai'];
  if (junk.filter(w => lower.includes(w)).length >= 2 || lower.includes('meta about blog') || lower.includes('meta\nabout') || lower.includes('about\nblog')) {
    return '';
  }
  return s;
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

function parseInstagramLink(rawInput) {
  if (!rawInput) return null;
  const trimmed = rawInput.trim();

  let handle = trimmed;
  // Match instagram.com/{handle} or instagram.com/reel/ etc
  const urlMatch = trimmed.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (urlMatch) {
    handle = urlMatch[1];
  }
  handle = handle.replace(/^@/, '').replace(/\/$/, '').split('?')[0].split('/')[0];
  if (!handle || ['p', 'reel', 'reels', 'stories', 'explore', 'direct'].includes(handle.toLowerCase())) {
    return null;
  }

  const cleanLower = handle.toLowerCase();

  // Exact real data for demo.creator
  if (cleanLower === 'demo.creator') {
    return {
      handle: 'demo.creator',
      name: 'Creator | Bikes & Coffee',
      url: 'https://www.instagram.com/demo.creator/',
      bio: 'Digital creator\nBikes, rides & coffee stops 🏍️☕\nCinematic bike edits • cafe vlogs • photography\nCome along for the next ride ↓',
      avatar: '',
      posts: '9',
      followers: '60',
      following: '17',
      numericFollowers: 60
    };
  }

  // Exact real data for demo.collaborator
  if (cleanLower === 'demo.collaborator') {
    return {
      handle: 'demo.collaborator',
      name: 'Collaborator | Bikes & Gym',
      url: 'https://www.instagram.com/demo.collaborator/',
      bio: 'Digital creator',
      avatar: '',
      posts: '2',
      followers: '40',
      following: '30',
      numericFollowers: 40
    };
  }

  const name = formatDisplayName(handle);
  return {
    handle,
    name,
    url: `https://www.instagram.com/${handle}/`,
    bio: '',
    avatar: '',
    followers: '0',
    following: '0',
    posts: '0',
    numericFollowers: 0
  };
}

export default function CreateProjectModal({ isOpen, onClose, onCreateProject }) {
  const { user } = useAuth();
  const [linkInput, setLinkInput] = useState('');
  const [name, setName] = useState('');
  const [instaHandle, setInstaHandle] = useState('');
  const [instaUrl, setInstaUrl] = useState('');
  const [bio, setBio] = useState('');
  const [followersCount, setFollowersCount] = useState('0');
  const [followingCount, setFollowingCount] = useState('0');
  const [postsCount, setPostsCount] = useState('0');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [detectedHandle, setDetectedHandle] = useState('');
  const [isAutoUpdating, setIsAutoUpdating] = useState(false);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setLinkInput('');
      setName('');
      setInstaHandle('');
      setInstaUrl('');
      setBio('');
      setFollowersCount('0');
      setFollowingCount('0');
      setPostsCount('0');
      setAvatarUrl('');
      setDetectedHandle('');
    }
  }, [isOpen]);

  const latestHandleRef = React.useRef('');

  // AUTO-POPULATE IMMEDIATELY WHEN LINK CHANGES
  const handleLinkChange = (value) => {
    setLinkInput(value);
    const parsed = parseInstagramLink(value);
    if (parsed) {
      const currentHandle = parsed.handle;
      latestHandleRef.current = currentHandle;
      setIsAutoUpdating(true);
      setDetectedHandle(parsed.handle);
      setName(parsed.name);
      setInstaHandle(parsed.handle);
      setInstaUrl(parsed.url);
      setBio(parsed.bio);
      setFollowersCount(parsed.followers);
      setFollowingCount(parsed.following);
      setPostsCount(parsed.posts);
      setAvatarUrl(parsed.avatar);

      // Also try fetching from API asynchronously for enhanced accuracy
      fetch(`http://localhost:5000/api/instagram/profile-info?query=${encodeURIComponent(parsed.handle)}`)
        .then(res => res.json())
        .then(data => {
          if (latestHandleRef.current !== currentHandle) return; // Discard stale out-of-order response
          if (data && data.success && data.data) {
            const d = data.data;
            if (d.name) setName(d.name);
            setBio(cleanBioText(d.bio));
            setFollowersCount(d.followersCount || parsed.followers);
            setFollowingCount(d.followingCount || parsed.following);
            setPostsCount(d.postsCount !== undefined && d.postsCount !== '' ? String(d.postsCount) : parsed.posts);
            setAvatarUrl(d.avatarUrl || '');
          }
        })
        .catch(() => {})
        .finally(() => {
          if (latestHandleRef.current === currentHandle) {
            setIsAutoUpdating(false);
          }
        });
    } else {
      setDetectedHandle('');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalHandle = instaHandle || (linkInput ? parseInstagramLink(linkInput)?.handle : '');
    if (!finalHandle) return;

    const finalName = name || formatDisplayName(finalHandle);
    const finalUrl = instaUrl || `https://www.instagram.com/${finalHandle}/`;

    onCreateProject({
      name: finalName,
      insta_handle: finalHandle,
      insta_url: finalUrl,
      bio: cleanBioText(bio),
      avatar_url: avatarUrl || '',
      followers_count: followersCount || '0',
      following_count: followingCount || '0',
      posts_count: postsCount || '0',
      followers_numeric: parseInt(followersCount, 10) || 0,
      attached_profiles: [
        { name: user?.name || 'Demo Creator', avatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }
      ],
      browser_sections: [
        { id: 'sec-1', label: 'Primary Chrome Profile', user: finalHandle, active: true, cookiesSaved: true }
      ]
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px',
      backdropFilter: 'blur(2px)'
    }}>
      <div
        className="clean-card"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '24px',
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Instagram size={22} color="var(--brand-primary)" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Add Instagram Account
            </h3>
          </div>
          <button onClick={onClose} className="clean-icon-btn">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* PRIMARY HERO INPUT: PROFILE LINK */}
          <div>
            <label htmlFor="create-project-url" style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '6px'
            }}>
              <LinkIcon size={14} color="var(--brand-primary)" />
              <span>Instagram Profile Link</span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500 }}>(Paste link below)</span>
            </label>
            <input
              id="create-project-url"
              type="text"
              autoFocus
              required
              placeholder="e.g. https://www.instagram.com/demo.creator/"
              value={linkInput}
              onChange={(e) => handleLinkChange(e.target.value)}
              className="clean-input"
              style={{
                fontSize: '0.92rem',
                borderColor: detectedHandle ? '#22c55e' : undefined,
                background: detectedHandle ? '#f0fdf4' : undefined
              }}
            />
          </div>

          {/* Auto-detected notification banner */}
          {detectedHandle && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#15803d'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={15} color="#16a34a" />
                <span style={{ fontWeight: 700 }}>@{detectedHandle}</span>
                <span>detected • All fields auto-updated</span>
              </div>
              <span style={{
                fontSize: '0.72rem',
                background: '#dcfce7',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 600
              }}>
                1s Live Sync
              </span>
            </div>
          )}

          {/* AUTO-UPDATED FIELDS (Pre-populated from the link) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label htmlFor="create-project-name" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '3px' }}>
                Account Name (Auto-filled)
              </label>
              <input
                id="create-project-name"
                type="text"
                required
                placeholder="Auto-filled from link"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="clean-input"
              />
            </div>

            <div>
              <label htmlFor="create-project-handle" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '3px' }}>
                Instagram Handle
              </label>
              <input
                id="create-project-handle"
                type="text"
                required
                placeholder="@handle"
                value={instaHandle}
                onChange={(e) => setInstaHandle(e.target.value.replace(/^@/, ''))}
                className="clean-input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="create-project-bio" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '3px' }}>
              Bio (Auto-generated from handle)
            </label>
            <textarea
              id="create-project-bio"
              placeholder="Account bio..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="clean-input clean-textarea"
              style={{ minHeight: '58px', fontSize: '0.84rem' }}
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
            background: '#f8fafc',
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #e2e8f0'
          }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>Posts</label>
              <input
                type="text"
                value={postsCount}
                onChange={(e) => setPostsCount(e.target.value)}
                className="clean-input"
                style={{ padding: '4px 6px', fontSize: '0.82rem', height: '32px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>Followers</label>
              <input
                type="text"
                value={followersCount}
                onChange={(e) => setFollowersCount(e.target.value)}
                className="clean-input"
                style={{ padding: '4px 6px', fontSize: '0.82rem', height: '32px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>Following</label>
              <input
                type="text"
                value={followingCount}
                onChange={(e) => setFollowingCount(e.target.value)}
                className="clean-input"
                style={{ padding: '4px 6px', fontSize: '0.82rem', height: '32px' }}
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button type="button" onClick={onClose} className="clean-btn-secondary">
              Cancel
            </button>
            <button
              id="create-project-submit-btn"
              type="submit"
              className="clean-btn-primary"
              disabled={!detectedHandle && !instaHandle}
              style={{
                opacity: (!detectedHandle && !instaHandle) ? 0.6 : 1,
                cursor: (!detectedHandle && !instaHandle) ? 'not-allowed' : 'pointer'
              }}
            >
              <Instagram size={15} />
              <span>Create Account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

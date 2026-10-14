import React, { useState, useEffect, useCallback } from 'react';
import {
  RotateCw, ExternalLink, Lock, Film, Grid,
  Play, Copy, Maximize2, Minimize2, AlertCircle
} from 'lucide-react';
import Instagram from './InstagramIcon';

export default function LiveBrowserBox({ project }) {
  const handle = (project?.insta_handle || '').replace(/^@/, '').toLowerCase();

  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [selectedPost, setSelectedPost] = useState(null);

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

  const isBadAvatar = (url) =>
    !url || url.includes('rsrc.php') || url.includes('static.cdninstagram.com') || url.includes('R0fBIMurK8v');

  const fetchData = useCallback(async () => {
    if (!handle) return;
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await fetch(`http://localhost:5000/api/instagram/profile-info?query=${handle}&live=true`);
      if (!res.ok) throw new Error('Server error');
      const json = await res.json();
      if (json?.data) {
        setProfileData(json.data);
        if (Array.isArray(json.data.posts)) {
          setPosts(json.data.posts);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch live profile info:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [handle]);

  useEffect(() => {
    setPosts([]);
    setProfileData(null);
    setHasError(false);
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Only use profileData that matches the current handle
  const activeProfileData = (profileData && profileData.handle?.toLowerCase() === handle) ? profileData : null;

  const displayName = activeProfileData?.name || project?.name || handle;
  const rawAvatar = activeProfileData?.avatarUrl || project?.avatar_url || '';
  const displayAvatar = isBadAvatar(rawAvatar) ? '' : rawAvatar;
  const displayBio = cleanBioText(activeProfileData?.bio ?? project?.bio);
  const postsCount = activeProfileData?.postsCount ?? project?.posts_count ?? posts.length;
  const followersCount = activeProfileData?.followersCount || project?.followers_count || '—';
  const followingCount = activeProfileData?.followingCount || project?.following_count || '—';

  // When a post is clicked, open the actual Instagram URL in a new tab
  function handlePostClick(post) {
    const url = post.url ||
      `https://www.instagram.com/${handle}/${post.type === 'reel' ? 'reel' : 'p'}/${post.shortcode || post.id}/`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // Only Posts and Reels — Saved tab removed per user specification
  const tabs = [
    { id: 'posts', label: 'Posts', icon: <Grid size={14} /> },
    { id: 'reels', label: 'Reels', icon: <Film size={14} /> },
  ];

  const filteredPosts = activeTab === 'reels'
    ? posts.filter(p => p.isVideo || p.type === 'reel')
    : posts;

  return (
    <div
      className="clean-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#ffffff',
        height: isFullscreen ? 'calc(100vh - 24px)' : '740px',
        maxHeight: isFullscreen ? 'calc(100vh - 24px)' : '740px',
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? '12px' : undefined,
        zIndex: isFullscreen ? 1000 : undefined,
        boxShadow: isFullscreen ? '0 32px 72px rgba(0,0,0,0.25)' : undefined
      }}
    >
      {/* Browser Chrome Bar */}
      <div style={{
        background: 'linear-gradient(135deg, #fafafa 0%, #f1f5f9 100%)',
        borderBottom: '1px solid #e2e8f0',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexShrink: 0
      }}>
        {/* Window control dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }} />
          <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }} />
          <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }} />
        </div>

        {/* URL bar */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          background: '#ffffff',
          padding: '5px 14px',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          fontSize: '0.81rem',
          color: '#334155',
          fontFamily: 'monospace',
          minWidth: 0,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}>
          <Lock size={12} color="#16a34a" style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            instagram.com/{handle || '...'}
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={fetchData}
            className="clean-icon-btn"
            style={{ padding: '5px' }}
            title="Refresh"
          >
            <RotateCw size={13} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <a
            href={handle ? `https://www.instagram.com/${handle}/` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="clean-icon-btn"
            style={{ padding: '5px' }}
            title="Open on Instagram"
          >
            <ExternalLink size={13} />
          </a>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="clean-icon-btn"
            style={{ padding: '5px' }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>

        {/* Profile Header */}
        <div style={{ padding: '20px 20px 0 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '14px' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={handle}
                  style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2.5px solid transparent',
                    padding: '2px',
                    background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #e1306c, #fd1d1d, #f77737) border-box',
                    display: 'block'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const el = e.target.parentElement?.querySelector('.avatar-fallback');
                    if (el) el.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="avatar-fallback"
                style={{
                  display: displayAvatar ? 'none' : 'flex',
                  width: '76px',
                  height: '76px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                  border: '2px solid #e2e8f0',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontSize: '1.8rem',
                  fontWeight: 800
                }}
              >
                {handle ? handle.charAt(0).toUpperCase() : '?'}
              </div>
            </div>

            {/* Profile Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {handle}
                </h3>
                <a
                  href={handle ? `https://www.instagram.com/${handle}/` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    background: 'var(--brand-primary)',
                    color: '#fff',
                    textDecoration: 'none',
                    transition: 'opacity 0.15s'
                  }}
                  onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseOut={e => e.currentTarget.style.opacity = '1'}
                >
                  Follow
                </a>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '0.84rem', color: '#0f172a', marginBottom: '6px' }}>
                <span><strong style={{ fontWeight: 700 }}>{postsCount}</strong> <span style={{ color: '#64748b' }}>posts</span></span>
                <span><strong style={{ fontWeight: 700 }}>{followersCount}</strong> <span style={{ color: '#64748b' }}>followers</span></span>
                <span><strong style={{ fontWeight: 700 }}>{followingCount}</strong> <span style={{ color: '#64748b' }}>following</span></span>
              </div>

              {displayName && displayName !== handle && (
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  {displayName}
                </div>
              )}

              {displayBio && (
                <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                  {displayBio}
                </div>
              )}
            </div>

            {/* Instagram badge */}
            <div style={{
              flexShrink: 0,
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'var(--brand-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(225,48,108,0.3)'
            }}>
              <Instagram size={20} color="#ffffff" />
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderTop: '1px solid #e2e8f0', marginLeft: '-20px', marginRight: '-20px' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: activeTab === tab.id ? '#0f172a' : '#94a3b8',
                  borderTop: `2px solid ${activeTab === tab.id ? '#0f172a' : 'transparent'}`,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  transition: 'color 0.15s'
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Posts Grid / States */}
        {isLoading && posts.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            padding: '60px 24px',
            color: '#94a3b8'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#e1306c',
              borderRadius: '50%',
              animation: 'spin 0.9s linear infinite'
            }} />
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Loading posts...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : hasError && posts.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '60px 24px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: '#fff1f2', border: '1px solid #fee2e2',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertCircle size={24} color="#ef4444" />
            </div>
            <div>
              <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Could not load posts</p>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Make sure the backend server is running</p>
            </div>
            <button onClick={fetchData} className="clean-btn-secondary" style={{ padding: '6px 16px', fontSize: '0.82rem' }}>
              <RotateCw size={13} /> Retry
            </button>
          </div>
        ) : !handle ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '60px 24px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Instagram size={24} color="#94a3b8" />
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No Instagram account selected</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '60px 24px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%',
              border: '2px solid #0f172a',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Grid size={28} color="#0f172a" />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>No Posts Yet</h4>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0, maxWidth: '240px' }}>
              When @{handle} shares photos and reels, you'll see them here.
            </p>
          </div>
        ) : (
          <div
            id="live-browser-posts-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2px',
              padding: '2px',
              background: '#f1f5f9'
            }}
          >
            {filteredPosts.map((post) => (
              <a
                key={post.id || post.shortcode}
                href={post.url || `https://www.instagram.com/${handle}/${post.type === 'reel' ? 'reel' : 'p'}/${post.shortcode || post.id}/`}
                target="_blank"
                rel="noopener noreferrer"
                title="View on Instagram"
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1/1',
                  background: '#0f172a',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'block',
                  textDecoration: 'none'
                }}
              >
                <img
                  src={post.imageUrl}
                  alt={post.caption || `Post by @${handle}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.2s ease'
                  }}
                  onError={(e) => {
                    e.target.style.opacity = '0.25';
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.04)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                />

                {/* Clean hover overlay: likes, comments, and views are strictly hidden */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    opacity: 0,
                    pointerEvents: 'none'
                  }}
                  className="post-hover-overlay"
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(15,23,42,0.88)',
                    color: '#ffffff',
                    padding: '7px 14px',
                    borderRadius: '24px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    backdropFilter: 'blur(6px)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                    letterSpacing: '0.02em',
                    transform: 'scale(0.95)',
                    transition: 'transform 0.2s ease'
                  }}>
                    <ExternalLink size={12} color="#ffffff" />
                    <span>View on Instagram</span>
                  </div>
                </div>

                {/* Type badge (top-right) */}
                {post.type === 'reel' || post.isVideo ? (
                  <div style={{
                    position: 'absolute', top: '8px', right: '8px',
                    color: '#ffffff', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))'
                  }}>
                    <Play size={14} fill="#ffffff" />
                  </div>
                ) : post.type === 'carousel' ? (
                  <div style={{
                    position: 'absolute', top: '8px', right: '8px',
                    color: '#ffffff', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))'
                  }}>
                    <Copy size={13} />
                  </div>
                ) : null}
              </a>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        a:hover .post-hover-overlay {
          opacity: 1 !important;
          background: rgba(0,0,0,0.38) !important;
        }
        a:hover .post-hover-overlay > div {
          transform: scale(1) !important;
        }
      `}</style>
    </div>
  );
}

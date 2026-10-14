import React, { useState, useEffect } from 'react';
import { ExternalLink, Users, ArrowDown, Sparkles, FileText, Paintbrush, Trash2, RefreshCw, Wifi } from 'lucide-react';
import LiveBrowserBox from './LiveBrowserBox';
import ReferenceIdeas from './ReferenceIdeas';
import ScriptsStudio from './ScriptsStudio';
import StoryboardStudio from './StoryboardStudio';
import { dataService } from '../services/dataService';
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

function formatCount(n) {
  if (!n || n === '0' || n === 0) return '—';
  const num = parseInt(String(n).replace(/,/g, ''), 10);
  if (isNaN(num)) return String(n);
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
}

const WORKFLOW_TABS = [
  { key: 'reference', label: 'Reference Ideas', icon: <Sparkles size={15} />, color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'scripts', label: 'Scripts', icon: <FileText size={15} />, color: '#0369a1', bg: '#f0f9ff' },
  { key: 'storyboard', label: 'Storyboard', icon: <Paintbrush size={15} />, color: '#065f46', bg: '#f0fdf4' },
];

export default function ProjectDashboard({ project, onBackToProjects, onDeleteProject }) {
  const { user } = useAuth();
  const [activeWorkflowTab, setActiveWorkflowTab] = useState(() => {
    const hash = window.location.hash || '';
    if (hash.includes('/scripts')) return 'scripts';
    if (hash.includes('/storyboard')) return 'storyboard';
    return 'reference';
  });

  const handleTabChange = (tabKey) => {
    setActiveWorkflowTab(tabKey);
    const handle = (project?.insta_handle || '').toLowerCase().replace(/^@/, '');
    if (handle) {
      window.history.replaceState(null, '', `#workflow-studios/${handle}`);
    }
  };

  const [liveVerified, setLiveVerified] = useState(() => {
    const h = (project?.insta_handle || '').toLowerCase().replace(/^@/, '');
    return {
      handle: h,
      name: project?.name,
      avatarUrl: project?.avatar_url || '',
      bio: cleanBioText(project?.bio),
      postsCount: project?.posts_count || '0',
      followersCount: project?.followers_count || '0',
      followingCount: project?.following_count || '0'
    };
  });

  const [liveStatus, setLiveStatus] = useState('idle'); // idle | loading | live | error

  useEffect(() => {
    if (!project) return;
    const cleanHandle = (project.insta_handle || '').toLowerCase().replace(/^@/, '');
    if (!cleanHandle) return;

    setLiveVerified({
      handle: cleanHandle,
      name: project.name,
      avatarUrl: project.avatar_url || '',
      bio: cleanBioText(project.bio),
      postsCount: project.posts_count || '0',
      followersCount: project.followers_count || '0',
      followingCount: project.following_count || '0'
    });

    let isMounted = true;

    const verifyLive = async () => {
      setLiveStatus('loading');
      try {
        const res = await fetch(`http://localhost:5000/api/instagram/profile-info?query=${cleanHandle}&live=true`);
        const json = await res.json();
        if (isMounted && json?.success && json?.data) {
          const d = json.data;
          const safeBio = cleanBioText(d.bio);
          const safeAvatar = d.avatarUrl !== undefined ? d.avatarUrl : (project.avatar_url || '');
          const safeName = d.name || project.name;
          const safePosts = d.postsCount !== undefined ? d.postsCount : (project.posts_count || '0');
          const safeFollowers = d.followersCount || project.followers_count || '0';
          const safeFollowing = d.followingCount || project.following_count || '0';

          setLiveVerified({
            handle: cleanHandle,
            name: safeName,
            avatarUrl: safeAvatar,
            bio: safeBio,
            postsCount: safePosts,
            followersCount: safeFollowers,
            followingCount: safeFollowing
          });
          setLiveStatus('live');

          if (project.bio !== safeBio || (safeAvatar && project.avatar_url !== safeAvatar) || (d.postsCount && project.posts_count !== safePosts)) {
            dataService.updateProject(project.id, {
              name: safeName,
              avatar_url: safeAvatar,
              bio: safeBio,
              posts_count: safePosts,
              followers_count: safeFollowers,
              following_count: safeFollowing
            });
          }
        }
      } catch (_) {
        if (isMounted) setLiveStatus('error');
      }
    };

    verifyLive();
    const interval = setInterval(verifyLive, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [project?.id, project?.insta_handle]);

  if (!project) return null;

  const cleanHandle = (project?.insta_handle || '').toLowerCase().replace(/^@/, '');
  const isMatch = liveVerified?.handle === cleanHandle;
  const isBadAvatar = (url) => !url || url.includes('rsrc.php') || url.includes('static.cdninstagram.com') || url.includes('R0fBIMurK8v');
  const rawAvatar = (isMatch && liveVerified.avatarUrl !== undefined && liveVerified.avatarUrl !== '')
    ? liveVerified.avatarUrl
    : (project.avatar_url || '');
  const displayAvatar = isBadAvatar(rawAvatar) ? '' : rawAvatar;
  const displayName = (isMatch && liveVerified.name) || project.name || project.insta_handle;
  const displayBio = cleanBioText(isMatch && liveVerified.bio !== undefined ? liveVerified.bio : project.bio);
  const displayFollowers = (isMatch && liveVerified.followersCount) || project.followers_count || '0';
  const displayPosts = (isMatch && liveVerified.postsCount !== undefined) ? liveVerified.postsCount : (project.posts_count ?? '0');
  const displayFollowing = (isMatch && liveVerified.followingCount) || project.following_count || '0';

  const activeTab = WORKFLOW_TABS.find(t => t.key === activeWorkflowTab);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '60px', animation: 'fadeInUp 0.3s ease' }}>

      {/* TOP SECTION: Left info + Right browser */}
      <section className="top-dashboard-section" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 1fr) minmax(400px, 1.25fr)',
        gap: '20px',
        alignItems: 'start'
      }}>
        {/* LEFT: Account Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="clean-card" style={{ padding: '0', overflow: 'hidden', background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            {/* Gradient header strip */}
            <div style={{ height: '5px', background: 'var(--brand-gradient)' }} />

            <div style={{ padding: '20px' }}>
              {/* Profile row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  {/* Avatar with gradient ring */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {displayAvatar ? (
                      <img
                        src={displayAvatar}
                        alt={displayName}
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          padding: '2.5px',
                          background: 'linear-gradient(white,white) padding-box, var(--brand-gradient) border-box',
                          border: '2.5px solid transparent',
                          display: 'block'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const el = e.target.parentElement?.querySelector('.avatar-placeholder');
                          if (el) el.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="avatar-placeholder"
                      style={{
                        display: displayAvatar ? 'none' : 'flex',
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(225,48,108,0.1), rgba(253,29,29,0.15))',
                        border: '2px solid rgba(225,48,108,0.3)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.6rem',
                        fontWeight: 800,
                        color: 'var(--brand-primary)'
                      }}
                    >
                      {(project.insta_handle || 'U').charAt(0).toUpperCase()}
                    </div>

                    {/* Live indicator dot */}
                    <div style={{
                      position: 'absolute',
                      bottom: '1px',
                      right: '1px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: liveStatus === 'live' ? '#10b981' : liveStatus === 'error' ? '#ef4444' : '#f59e0b',
                      border: '2px solid var(--bg-surface)'
                    }} />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {displayName}
                    </h2>
                    <a
                      href={project.insta_url || `https://www.instagram.com/${project.insta_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--brand-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      @{project.insta_handle}
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>

                {/* Live badge + delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '20px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: liveStatus === 'live' ? 'rgba(16,185,129,0.12)' : 'var(--bg-main)',
                    color: liveStatus === 'live' ? '#10b981' : 'var(--text-muted)',
                    border: `1px solid ${liveStatus === 'live' ? 'rgba(16,185,129,0.25)' : 'var(--border-subtle)'}`
                  }}>
                    {liveStatus === 'loading' ? (
                      <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Wifi size={10} />
                    )}
                    {liveStatus === 'live' ? 'Live' : liveStatus === 'error' ? 'Offline' : 'Syncing'}
                  </span>

                  {onDeleteProject && (
                    <button
                      type="button"
                      title="Remove this account"
                      onClick={(e) => onDeleteProject(project.id, e)}
                      style={{
                        padding: '5px',
                        background: 'transparent',
                        border: '1.5px solid transparent',
                        borderRadius: '8px',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'transparent'; }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Bio */}
              {displayBio ? (
                <div style={{
                  fontSize: '0.83rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-line',
                  padding: '10px 12px',
                  background: 'var(--bg-main)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '14px'
                }}>
                  {displayBio}
                </div>
              ) : null}

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                {[
                  { label: 'Followers', value: formatCount(displayFollowers) },
                  { label: 'Posts', value: formatCount(displayPosts) },
                  { label: 'Following', value: formatCount(displayFollowing) },
                ].map(stat => (
                  <div key={stat.label} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '10px 4px',
                    background: 'var(--bg-main)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Attached Accounts */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Users size={14} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Login Accounts ({project.attached_profiles?.length || 1})
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {(project.attached_profiles || [{ name: user?.name || '', avatar: user?.avatar }]).map((ap, idx) => {
                    const avatarSrc = (idx === 0 || ap.name === user?.name) ? (user?.avatar || ap.avatar || '') : (ap.avatar || '');
                    const profileName = (idx === 0 && user?.name) ? user.name : ap.name;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 10px',
                          borderRadius: '9px',
                          background: 'var(--bg-main)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {avatarSrc ? (
                            <img src={avatarSrc} alt={profileName} style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border-subtle)' }} />
                          ) : (
                            <div style={{
                              width: '26px', height: '26px', borderRadius: '50%',
                              background: 'var(--brand-gradient)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.68rem', fontWeight: 800, color: '#fff'
                            }}>
                              {(profileName || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{profileName || 'You'}</span>
                        </div>
                        <span className="clean-badge clean-badge-green" style={{ fontSize: '0.66rem' }}>Connected</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Scroll hint (hidden on phone where tabs sit immediately below) */}
          <div className="desktop-scroll-hint" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'var(--bg-surface)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)'
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Reference · Scripts · Storyboard below
            </span>
            <button
              onClick={() => { const el = document.getElementById('workflow-studios'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
              className="clean-btn-secondary"
              style={{ padding: '4px 12px', fontSize: '0.76rem' }}
            >
              <ArrowDown size={12} /> Jump
            </button>
          </div>
        </div>

        {/* RIGHT: Live Browser (Desktop only - completely hidden on phone version) */}
        <div className="desktop-browser-box">
          <LiveBrowserBox project={project} />
        </div>
      </section>

      {/* WORKFLOW STUDIOS SECTION */}
      <section id="workflow-studios" style={{ paddingTop: '4px' }}>
        {/* Pill Tab Switcher */}
        <div className="studios-tab-ribbon" style={{
          position: 'sticky',
          top: '60px',
          zIndex: 40,
          background: 'var(--bg-main)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          padding: '8px 0',
          marginBottom: '18px'
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            borderRadius: '14px',
            border: '1.5px solid var(--border-subtle)',
            padding: '4px',
            display: 'flex',
            gap: '4px',
            boxShadow: 'var(--shadow-xs)'
          }}>
            {WORKFLOW_TABS.map(tab => (
              <button
                key={tab.key}
                id={`tab-btn-${tab.key}`}
                onClick={() => handleTabChange(tab.key)}
                className="workflow-tab-pill"
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  border: 'none',
                  borderRadius: '10px',
                  background: activeWorkflowTab === tab.key
                    ? tab.key === 'reference' ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                    : tab.key === 'scripts' ? 'linear-gradient(135deg, #0284c7, #0369a1)'
                    : 'linear-gradient(135deg, #059669, #047857)'
                    : 'transparent',
                  color: activeWorkflowTab === tab.key ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  boxShadow: activeWorkflowTab === tab.key ? '0 1px 3px rgba(0,0,0,0.2)' : 'none', // Strictly no glowing illumination
                  letterSpacing: '0.01em',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Studio Content */}
        <div style={{ animation: 'fadeInUp 0.25s ease' }} key={activeWorkflowTab}>
          {activeWorkflowTab === 'reference' && <ReferenceIdeas project={project} />}
          {activeWorkflowTab === 'scripts' && <ScriptsStudio project={project} />}
          {activeWorkflowTab === 'storyboard' && <StoryboardStudio project={project} />}
        </div>
      </section>
    </div>
  );
}

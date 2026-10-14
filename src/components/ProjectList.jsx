import React from 'react';
import { Plus, ArrowRight, Trash2, Users, FileText, UserCheck } from 'lucide-react';
import Instagram from './InstagramIcon';

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
  if (!n || n === '0') return '—';
  const num = parseInt(String(n).replace(/,/g, ''), 10);
  if (isNaN(num)) return String(n);
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
}

export default function ProjectList({ projects, onSelectProject, onOpenCreateProject, onDeleteProject }) {
  const hasProjects = projects && projects.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1100px', margin: '0 auto', animation: 'fadeInUp 0.3s ease' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            Workspace
          </p>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Instagram Accounts
          </h1>
          {hasProjects && (
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              {projects.length} account{projects.length !== 1 ? 's' : ''} connected
            </p>
          )}
        </div>

        <button onClick={onOpenCreateProject} className="clean-btn-primary" style={{ padding: '9px 18px' }}>
          <Plus size={16} />
          Add Account
        </button>
      </div>

      {/* Empty State */}
      {!hasProjects ? (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1.5px dashed var(--border-hover)',
          borderRadius: '20px',
          padding: '64px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          maxWidth: '560px',
          margin: '24px auto',
          animation: 'fadeIn 0.4s ease'
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(225,48,108,0.1), rgba(253,29,29,0.15))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid rgba(225,48,108,0.25)'
          }}>
            <Instagram size={32} color="var(--brand-primary)" />
          </div>

          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
              No Accounts Yet
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '360px', lineHeight: 1.6, margin: 0 }}>
              Connect your Instagram profile to manage reels, scripts, storyboards, and track your content workflow.
            </p>
          </div>

          <button
            onClick={onOpenCreateProject}
            className="clean-btn-primary"
            style={{ marginTop: '4px', padding: '11px 24px', fontSize: '0.95rem' }}
          >
            <Plus size={16} />
            Add Your First Account
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px'
        }}>
          {projects.map((proj, i) => {
            const bio = cleanBioText(proj.bio);
            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj)}
                className="clean-card clean-card-hover"
                style={{
                  padding: '0',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  position: 'relative',
                  overflow: 'hidden',
                  animation: `fadeInUp ${0.15 + i * 0.05}s ease`
                }}
              >
                {/* Top gradient strip */}
                <div style={{
                  height: '4px',
                  background: 'var(--brand-gradient)',
                  flexShrink: 0
                }} />

                <div style={{ padding: '18px 18px 14px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      {/* Avatar */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {proj.avatar_url ? (
                          <img
                            src={proj.avatar_url}
                            alt={proj.name}
                            style={{
                              width: '52px',
                              height: '52px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid transparent',
                              padding: '2px',
                              background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #e1306c, #f77737) border-box',
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
                            display: proj.avatar_url ? 'none' : 'flex',
                            width: '52px',
                            height: '52px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(225,48,108,0.1), rgba(253,29,29,0.15))',
                            border: '2px solid rgba(225,48,108,0.3)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.3rem',
                            fontWeight: 800,
                            color: 'var(--brand-primary)'
                          }}
                        >
                          {(proj.insta_handle || proj.name || 'U').charAt(0).toUpperCase()}
                        </div>
                      </div>

                      {/* Name & handle */}
                      <div style={{ minWidth: 0 }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {proj.name || proj.insta_handle}
                        </h4>
                        <div style={{ color: 'var(--brand-primary)', fontSize: '0.82rem', fontWeight: 700, marginTop: '2px' }}>
                          @{proj.insta_handle}
                        </div>
                      </div>
                    </div>

                    {/* Delete Button */}
                    {onDeleteProject && (
                      <button
                        type="button"
                        title="Remove Account"
                        onClick={(e) => { e.stopPropagation(); onDeleteProject(proj.id, e); }}
                        style={{
                          padding: '5px',
                          background: 'transparent',
                          border: '1.5px solid transparent',
                          borderRadius: '8px',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s',
                          flexShrink: 0
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#ef4444';
                          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)';
                          e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-muted)';
                          e.currentTarget.style.borderColor = 'transparent';
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  {/* Bio */}
                  {bio ? (
                    <p style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      margin: 0,
                      padding: '8px 10px',
                      background: 'var(--bg-main)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      {bio}
                    </p>
                  ) : null}

                  {/* Stats Row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '8px',
                  }}>
                    {[
                      { label: 'Followers', value: formatCount(proj.followers_count), icon: <Users size={12} /> },
                      { label: 'Posts', value: formatCount(proj.posts_count), icon: <FileText size={12} /> },
                      { label: 'Following', value: formatCount(proj.following_count), icon: <UserCheck size={12} /> },
                    ].map(stat => (
                      <div key={stat.label} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '8px 4px',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '10px',
                        textAlign: 'center'
                      }}>
                        <div style={{ color: 'var(--text-muted)' }}>{stat.icon}</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                          {stat.value}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer CTA */}
                <div style={{
                  padding: '10px 18px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-main)'
                }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Open workspace</span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: 'var(--brand-primary)',
                    fontWeight: 700,
                    fontSize: '0.82rem'
                  }}>
                    Open
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

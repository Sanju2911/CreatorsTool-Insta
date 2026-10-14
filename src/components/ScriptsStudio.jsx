import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Save, Trash2, Film, Download, Copy, Check, X, FileText,
  Calendar, Clock, ExternalLink, Sparkles, Edit2, Send, MessageSquare,
  ChevronLeft, ArrowRight, CornerDownRight, Share2, Eye
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { activityTracker } from '../services/activityTracker';

export default function ScriptsStudio({ project }) {
  const { user } = useAuth();
  const [scripts, setScripts] = useState([]);
  const [activeScript, setActiveScript] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // Opens in VIEW MODE by default!
  const [referenceIdeas, setReferenceIdeas] = useState([]);
  const [comments, setComments] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState(false);

  // Form edit buffer
  const [editTitle, setEditTitle] = useState('');
  const [editHook, setEditHook] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editAttachedReelId, setEditAttachedReelId] = useState('');
  const [editCustomReelUrl, setEditCustomReelUrl] = useState('');

  const chatEndRef = useRef(null);

  // Creative Mode engagement tracking
  useEffect(() => {
    activityTracker.setCreativeMode(true);
    return () => {
      activityTracker.setCreativeMode(false);
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [project?.id]);

  const loadData = async () => {
    const [fetchedScripts, fetchedIdeas] = await Promise.all([
      dataService.getScripts(project?.id),
      dataService.getReferenceIdeas(project?.id, 'newest')
    ]);
    setScripts(fetchedScripts);
    setReferenceIdeas(fetchedIdeas);
  };

  // Load discussion comments whenever active script changes
  useEffect(() => {
    if (activeScript?.id) {
      dataService.getScriptComments(activeScript.id).then(setComments);
    } else {
      setComments([]);
    }
  }, [activeScript?.id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  // Open existing script strictly in VIEW MODE
  const openScript = (script) => {
    setActiveScript(script);
    setIsEditing(false); // Opens in view mode as requested
    setEditTitle(script.title || '');
    setEditHook(script.hook || '');
    setEditBody(script.body || '');
    setEditAttachedReelId(script.attached_reel_id || '');
    setEditCustomReelUrl(script.custom_reel_url || '');

    activityTracker.logAction(
      'VIEW_SCRIPT',
      script.title || 'Script',
      'Opened script in View Mode',
      project?.insta_handle || project?.name || 'Workspace'
    );
  };

  // Open new script directly in edit mode
  const openNewScript = () => {
    const authorName = user?.name || project?.name || 'Creator';
    const blank = {
      project_id: project?.id || 'proj-throttle',
      title: 'Script #' + (scripts.length + 1),
      hook: '',
      body: 'Hook:\nCapture audience attention in first 3 seconds...\n\nMain Dialogue:\n\nVisual Beats:\n\nCall To Action:\nFollow @' + (project?.insta_handle || 'account') + ' for more!',
      scripted_by: authorName,
      author_name: authorName,
      author_avatar: user?.avatar || '',
      attached_reel_id: '',
      custom_reel_url: ''
    };
    setActiveScript(blank);
    setIsEditing(true);
    setEditTitle(blank.title);
    setEditHook(blank.hook);
    setEditBody(blank.body);
    setEditAttachedReelId('');
    setEditCustomReelUrl('');
  };

  const handleStartEditing = () => {
    if (!activeScript) return;
    setEditTitle(activeScript.title || '');
    setEditHook(activeScript.hook || '');
    setEditBody(activeScript.body || '');
    setEditAttachedReelId(activeScript.attached_reel_id || '');
    setEditCustomReelUrl(activeScript.custom_reel_url || '');
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    if (!activeScript?.id) {
      setActiveScript(null);
    } else {
      setIsEditing(false);
    }
  };

  const handleSave = async () => {
    if (!activeScript) return;
    const authorName = activeScript.scripted_by || activeScript.author_name || user?.name || 'Creator';
    const payload = {
      ...activeScript,
      project_id: activeScript.project_id || project?.id || 'proj-throttle',
      title: editTitle.trim() || 'Untitled Script',
      hook: editHook.trim(),
      body: editBody.trim(),
      attached_reel_id: editAttachedReelId,
      custom_reel_url: editCustomReelUrl,
      scripted_by: authorName,
      author_name: authorName,
      author_avatar: user?.avatar || activeScript.author_avatar || ''
    };

    const saved = await dataService.saveScript(payload);
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 1500);

    activityTracker.logAction(
      activeScript?.id ? 'EDIT_SCRIPT' : 'CREATE_SCRIPT',
      payload.title,
      'Saved voiceover dialogue and visual beats',
      project?.insta_handle || project?.name || 'Workspace'
    );

    const refreshed = await dataService.getScripts(project?.id);
    setScripts(refreshed);
    setActiveScript(saved);
    setIsEditing(false); // Switch back to view mode after saving
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!id) return;
    const confirmed = window.confirm('Are you sure you want to delete this script?');
    if (!confirmed) return;

    await dataService.deleteScript(id);
    const refreshed = await dataService.getScripts(project?.id);
    setScripts(refreshed);
    if (activeScript?.id === id) {
      setActiveScript(null);
    }
  };

  const handleClearAllScripts = async () => {
    const confirmed = window.confirm('Are you sure you want to clear ALL scripts?');
    if (confirmed) {
      await dataService.clearAllScripts(project?.id);
      setScripts([]);
      setActiveScript(null);
    }
  };

  const handleCopy = () => {
    if (!activeScript) return;
    const author = activeScript.scripted_by || activeScript.author_name || 'Creator';
    const textToCopy = `Title: ${activeScript.title}\nScripted by: ${author}\n\nHook: ${activeScript.hook || ''}\n\n${activeScript.body || ''}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!activeScript) return;
    const author = activeScript.scripted_by || activeScript.author_name || 'Creator';
    const content = `TITLE: ${activeScript.title}\nSCRIPTED BY: ${author}\nDATE: ${new Date().toLocaleDateString()}\n\nHOOK:\n${activeScript.hook || 'N/A'}\n\nSCRIPT CONTENT:\n${activeScript.body || ''}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(activeScript.title || 'script').replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Add Comment / Discussion message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !activeScript?.id) return;

    const cleanMsg = messageInput.trim();
    const newMsg = await dataService.addScriptComment({
      script_id: activeScript.id,
      user_name: user?.name || 'Creator',
      user_avatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      comment_text: cleanMsg,
      is_outgoing: true
    });

    activityTracker.logAction(
      'COMMENT',
      activeScript.title || 'Script Discussion',
      `Posted note: "${cleanMsg}"`,
      project?.insta_handle || project?.name || 'Workspace'
    );

    setComments(prev => [...prev, newMsg]);
    setMessageInput('');
  };

  const attachedIdea = activeScript ? referenceIdeas.find(r => r.id === (isEditing ? editAttachedReelId : activeScript.attached_reel_id)) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* ─── 1. TOP HEADER & TOOLBAR ─────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        background: 'var(--bg-surface)',
        padding: '16px 20px',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-xs)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.1) 0%, rgba(56, 189, 248, 0.15) 100%)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0284c7'
          }}>
            <FileText size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.28rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                Scripts Studio
              </h2>
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#0284c7',
                background: '#f0f9ff',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid #bae6fd'
              }}>
                {scripts.length} {scripts.length === 1 ? 'script' : 'scripts'}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Shared team script library • Hooks, dialogue drafts & shot directions
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {scripts.length > 0 && (
            <button
              onClick={handleClearAllScripts}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid #fee2e2',
                backgroundColor: '#ffffff',
                color: '#ef4444',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fef2f2';
                e.currentTarget.style.borderColor = '#fca5a5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#fee2e2';
              }}
              title="Delete all scripts"
            >
              <Trash2 size={14} /> Clear All
            </button>
          )}

          <button
            onClick={openNewScript}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
              transition: 'all 0.18s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(2, 132, 199, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(2, 132, 199, 0.35)';
            }}
          >
            <Plus size={16} /> New Script
          </button>
        </div>
      </div>

      {/* ─── 2. GRID OF SMALL SCRIPT CARDS ───────────────────────────────── */}
      {scripts.length === 0 ? (
        <div style={{
          background: '#ffffff',
          border: '1px dashed #cbd5e1',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b'
          }}>
            <FileText size={28} />
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            No Scripts Added Yet
          </h3>
          <p style={{ fontSize: '0.88rem', color: '#64748b', maxWidth: '420px', margin: 0, lineHeight: 1.5 }}>
            Create reel scripts, draft dialogue, hook intros, and collaborate on notes with your team.
          </p>

          <button
            onClick={openNewScript}
            className="clean-btn-primary"
            style={{ marginTop: '8px', padding: '9px 18px', fontSize: '0.9rem' }}
          >
            <Plus size={16} /> Create First Script
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '18px'
        }}>
          {scripts.map((s) => {
            const author = s.scripted_by || s.author_name || 'Creator';
            const boardIdea = referenceIdeas.find(r => r.id === s.attached_reel_id);
            const previewSnippet = (s.hook || s.body || '')
              .replace(/Hook:|Main Dialogue:|Visual Beats:|Call To Action:/gi, '')
              .trim()
              .slice(0, 110);

            return (
              <div
                key={s.id}
                onClick={() => openScript(s)}
                className="clean-card clean-card-hover"
                style={{
                  padding: '18px',
                  background: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = '#7dd3fc';
                  e.currentTarget.style.boxShadow = '0 16px 32px -4px rgba(2, 132, 199, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 4px 16px -2px rgba(15, 23, 42, 0.04)';
                }}
              >
                <div>
                  {/* Card Header: Title & Delete */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0284c7'
                      }}>
                        <FileText size={15} />
                      </div>
                      <h4 style={{
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        margin: 0,
                        lineHeight: 1.3
                      }}>
                        {s.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(s.id, e)}
                      title="Delete script"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* SCRIPTED BY: Small round profile image (no name as established) */}
                  <div style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#e1306c',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    marginBottom: '10px'
                  }}>
                    <span>Scripted by</span>
                    <img
                      src={user?.avatar || s.author_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                      alt="Profile"
                      title={author}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1.5px solid #fbcfe8',
                        background: '#ffffff',
                        display: 'inline-block',
                        flexShrink: 0
                      }}
                    />
                  </div>

                  {/* Text Preview Snippet */}
                  {previewSnippet && (
                    <p style={{
                      fontSize: '0.84rem',
                      color: '#475569',
                      lineHeight: 1.5,
                      margin: '0 0 10px 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {previewSnippet}...
                    </p>
                  )}

                  {/* Attached Reel Tag */}
                  {(boardIdea || s.custom_reel_url) && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      color: '#166534',
                      marginBottom: '6px'
                    }}>
                      <Film size={12} />
                      <span>{boardIdea ? boardIdea.title : 'Attached Reel'}</span>
                    </div>
                  )}
                </div>

                {/* Footer: Date & View CTA */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '10px',
                  fontSize: '0.76rem',
                  color: '#94a3b8'
                }}>
                  <span>{s.updated_at ? new Date(s.updated_at).toLocaleDateString() : 'Draft'}</span>
                  <span style={{ color: '#0284c7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Eye size={12} /> View Script →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── 3. SIDE-BY-SIDE SCRIPT MODAL (VIEW MODE + TEXT OPTION BESIDE IT) ─ */}
      {activeScript && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.72)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '1160px',
            maxHeight: '94vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* Top Navigation Bar with Back Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setActiveScript(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '24px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <ChevronLeft size={16} /> Back to Scripts Studio
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!isEditing ? (
                  <button
                    onClick={handleStartEditing}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '20px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
                    }}
                  >
                    <Edit2 size={13} /> Edit Script
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '20px',
                      background: '#16a34a',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Save size={13} /> {saveStatus ? 'Saved!' : 'Save Changes'}
                  </button>
                )}

                <button
                  onClick={handleCopy}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '20px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: copied ? '#16a34a' : '#475569',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Copy full script"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={handleDownload}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '20px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Download .txt"
                >
                  <Download size={13} />
                </button>

                {activeScript.id && (
                  <button
                    onClick={(e) => handleDelete(activeScript.id, e)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '20px',
                      background: '#ffffff',
                      border: '1px solid #fecaca',
                      color: '#ef4444',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Delete script"
                  >
                    <Trash2 size={13} />
                  </button>
                )}

                <button
                  onClick={() => setActiveScript(null)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Side-by-Side Container (Left: Script View/Edit, Right: Text Option / Discussion) */}
            <div
              className="clean-card"
              style={{
                display: 'flex',
                flexDirection: 'row',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                overflow: 'hidden',
                minHeight: '620px',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.2)'
              }}
            >
              {/* LEFT COLUMN: SCRIPT VIEW OR SCRIPT EDITOR */}
              <div
                style={{
                  flex: '1.25',
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#ffffff',
                  padding: '24px',
                  borderRight: '1px solid #e2e8f0',
                  overflowY: 'auto',
                  maxHeight: '80vh'
                }}
              >
                {!isEditing ? (
                  /* ─── 3A. VIEW MODE (Read-only clean script presentation) ─── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* Header */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          color: '#0284c7',
                          background: '#f0f9ff',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #bae6fd'
                        }}>
                          Script Document
                        </span>
                        <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                          Updated {activeScript.updated_at ? new Date(activeScript.updated_at).toLocaleDateString() : 'Today'}
                        </span>
                      </div>

                      <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                        {activeScript.title}
                      </h2>

                      {/* Scripted by with small round avatar */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        color: '#e1306c'
                      }}>
                        <span>Scripted by</span>
                        <img
                          src={user?.avatar || activeScript.author_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                          alt="Scripted by profile"
                          title={activeScript.scripted_by || activeScript.author_name || 'Creator'}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1.5px solid #fbcfe8',
                            background: '#ffffff',
                            display: 'inline-block',
                            flexShrink: 0
                          }}
                        />
                      </div>
                    </div>

                    {/* Attached Reference Reel Chip (if any) */}
                    {(attachedIdea || activeScript.custom_reel_url) && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '12px',
                        padding: '10px 14px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Film size={16} color="#16a34a" />
                          <div>
                            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                              Attached Reference
                            </div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                              {attachedIdea?.title || 'External Reference Reel'}
                            </div>
                          </div>
                        </div>

                        {(attachedIdea?.reel_url || activeScript.custom_reel_url) && (
                          <a
                            href={attachedIdea?.reel_url || activeScript.custom_reel_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: '#16a34a',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              textDecoration: 'none'
                            }}
                          >
                            <span>Open</span> <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Hook Callout Box */}
                    {activeScript.hook && (
                      <div style={{
                        background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
                        borderLeft: '4px solid #e11d48',
                        borderRadius: '0 12px 12px 0',
                        padding: '14px 18px'
                      }}>
                        <div style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          color: '#be123c',
                          textTransform: 'uppercase',
                          marginBottom: '4px'
                        }}>
                          Hook (First 3 Seconds)
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#881337', lineHeight: 1.4 }}>
                          "{activeScript.hook}"
                        </div>
                      </div>
                    )}

                    {/* Script Dialogue & Beats Body */}
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        color: '#64748b',
                        textTransform: 'uppercase'
                      }}>
                        Script Dialogue & Shot Beats
                      </div>
                      <div style={{
                        fontSize: '0.94rem',
                        color: '#1e293b',
                        lineHeight: 1.7,
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'inherit'
                      }}>
                        {activeScript.body || 'No script body entered.'}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ─── 3B. EDIT MODE (Form inputs) ────────────────────────── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
                        Editing Script
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelEditing}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Script Title:
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="e.g., Highway Night Ride Exhaust Revs"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          fontSize: '0.96rem',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Hook Input */}
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Hook (First 3 Seconds):
                      </label>
                      <input
                        type="text"
                        value={editHook}
                        onChange={(e) => setEditHook(e.target.value)}
                        placeholder="e.g., Wait till the 7,000 RPM exhaust flame drop at 0:03... 🔥"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          fontSize: '0.9rem',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Attach Reference Selector */}
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Attach Reference Reel:
                      </label>
                      <select
                        value={editAttachedReelId}
                        onChange={(e) => setEditAttachedReelId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '0.88rem',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          outline: 'none',
                          background: '#ffffff',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="">None / External</option>
                        {referenceIdeas.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.title} ({r.type === 'image' ? 'Image' : 'Reel'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Script Body / Dialogue */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Script Dialogue, Beats & CTA:
                      </label>
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={12}
                        placeholder="Write shots, dialogue, voiceovers..."
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          fontSize: '0.92rem',
                          lineHeight: 1.6,
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          outline: 'none',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                      <button
                        onClick={handleSave}
                        className="clean-btn-primary"
                        style={{ flex: 1, padding: '10px' }}
                      >
                        <Save size={16} /> Save Script
                      </button>
                      <button
                        onClick={handleCancelEditing}
                        className="clean-btn-secondary"
                        style={{ padding: '10px 18px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: TEXT OPTION / DISCUSSION STREAM (JUST LIKE REFERENCE) */}
              <div
                style={{
                  flex: '1',
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#f8fafc',
                  minHeight: '620px'
                }}
              >
                {/* Chat Header */}
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ffffff'
                }}>
                  <div>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Script Discussion & Notes
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Collaborative notes for {activeScript.title} ({comments.length} notes)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#22c55e',
                      boxShadow: '0 0 6px #22c55e'
                    }} />
                    <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>Live</span>
                  </div>
                </div>

                {/* Chat Bubble Stream */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: '#f8fafc'
                }}>
                  {comments.length === 0 ? (
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      gap: '8px',
                      padding: '40px 10px',
                      textAlign: 'center'
                    }}>
                      <MessageSquare size={28} color="#cbd5e1" />
                      <p style={{ fontSize: '0.84rem', margin: 0, fontWeight: 600 }}>No notes yet</p>
                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, maxWidth: '240px' }}>
                        Leave feedback, dialogue tweaks, or shot reminders below.
                      </p>
                    </div>
                  ) : (
                    comments.map((c) => {
                      const isMe = c.is_outgoing || (user?.name && c.user_name === user.name);
                      return (
                        <div
                          key={c.id}
                          style={{
                            display: 'flex',
                            gap: '10px',
                            flexDirection: isMe ? 'row-reverse' : 'row',
                            alignItems: 'flex-start'
                          }}
                        >
                          <img
                            src={c.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                            alt={c.user_name}
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              flexShrink: 0,
                              border: '1.5px solid #ffffff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                          />
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '78%'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginBottom: '3px'
                            }}>
                              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                                {c.user_name}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                {c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <div style={{
                              padding: '10px 14px',
                              borderRadius: isMe ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                              background: isMe ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : '#ffffff',
                              color: isMe ? '#ffffff' : '#1e293b',
                              fontSize: '0.84rem',
                              lineHeight: 1.45,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                              border: isMe ? 'none' : '1px solid #e2e8f0'
                            }}>
                              {c.comment_text}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  style={{
                    padding: '12px 16px',
                    background: '#ffffff',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Write feedback, dialogue tweak, or note..."
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      fontSize: '0.84rem',
                      borderRadius: '24px',
                      border: '1px solid #e2e8f0',
                      outline: 'none',
                      background: '#f8fafc'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: messageInput.trim() ? '#0284c7' : '#e2e8f0',
                      color: '#ffffff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: messageInput.trim() ? 'pointer' : 'not-allowed',
                      transition: 'all 0.15s'
                    }}
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

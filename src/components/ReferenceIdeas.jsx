import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, ThumbsUp, ThumbsDown, Trash2, Send, Smile,
  Film, Image as ImageIcon, ExternalLink, ChevronLeft,
  X, Loader2, MessageSquare, Sparkles, Play, Search,
  Check, ArrowRight, CornerDownRight, Heart, Share2
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { activityTracker } from '../services/activityTracker';

export default function ReferenceIdeas({ project }) {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState([]);
  const [activeIdeaId, setActiveIdeaId] = useState(null);
  const [comments, setComments] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'reel' | 'image'

  // Add Modal State
  const [addType, setAddType] = useState('reel'); // 'reel' or 'image'
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [previewCover, setPreviewCover] = useState('');
  const [previewVideo, setPreviewVideo] = useState('');
  const [customVideoUrl, setCustomVideoUrl] = useState('');

  const chatEndRef = useRef(null);
  const debounceTimer = useRef(null);

  // Load ideas for project
  const loadIdeas = async (targetIdToSelect = null) => {
    if (!project?.id) return;
    const list = await dataService.getReferenceIdeas(project.id);
    setIdeas(list);
    if (list.length > 0) {
      if (targetIdToSelect && list.find(i => i.id === targetIdToSelect)) {
        setActiveIdeaId(targetIdToSelect);
      } else if (!activeIdeaId || !list.find(i => i.id === activeIdeaId)) {
        setActiveIdeaId(list[0].id);
      }
    } else {
      setActiveIdeaId(null);
      setComments([]);
    }
  };

  useEffect(() => {
    loadIdeas();
  }, [project?.id]);

  // Load comments when active idea changes
  useEffect(() => {
    if (activeIdeaId) {
      dataService.getComments(activeIdeaId).then(setComments);
    } else {
      setComments([]);
    }
  }, [activeIdeaId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const activeIdea = ideas.find(i => i.id === activeIdeaId) || ideas[0] || null;

  // Auto-resolve video_url if not cached for active reel
  useEffect(() => {
    if (activeIdea && activeIdea.type === 'reel' && !activeIdea.video_url && (activeIdea.reel_url || activeIdea.shortcode)) {
      const urlToScrape = activeIdea.reel_url || `https://www.instagram.com/reel/${activeIdea.shortcode}/`;
      fetch('http://localhost:5000/api/instagram/reel-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToScrape })
      })
        .then(res => res.json())
        .then(json => {
          if (json.success && json.data?.videoUrl) {
            setIdeas(prev => prev.map(i => i.id === activeIdea.id ? {
              ...i,
              video_url: json.data.videoUrl,
              thumbnail_url: json.data.thumbnailUrl || i.thumbnail_url
            } : i));
            dataService.updateReferenceIdeaVideo(activeIdea.id, json.data.videoUrl, json.data.thumbnailUrl);
          }
        })
        .catch(() => {});
    }
  }, [activeIdea?.id, activeIdea?.video_url, activeIdea?.reel_url, activeIdea?.shortcode]);

  // Like Toggle
  const handleToggleLike = async (e) => {
    e?.stopPropagation();
    if (!activeIdea) return;
    const updated = await dataService.toggleLikeReferenceIdea(activeIdea.id);
    if (updated) {
      setIdeas(prev => prev.map(i => i.id === activeIdea.id ? { ...i, ...updated } : i));
    }
  };

  // Dislike Toggle
  const handleToggleDislike = async (e) => {
    e?.stopPropagation();
    if (!activeIdea) return;
    const updated = await dataService.toggleDislikeReferenceIdea(activeIdea.id);
    if (updated) {
      setIdeas(prev => prev.map(i => i.id === activeIdea.id ? { ...i, ...updated } : i));
    }
  };

  // Delete Current Reference
  const handleDeleteCurrent = async (ideaToDelete = null, e = null) => {
    e?.stopPropagation();
    const target = ideaToDelete || activeIdea;
    if (!target) return;
    const confirmed = window.confirm(`Delete reference "${target.title}"?`);
    if (confirmed) {
      await dataService.deleteReferenceIdea(target.id);
      const remaining = ideas.filter(i => i.id !== target.id);
      setIdeas(remaining);
      if (activeIdea?.id === target.id) {
        setShowDetailModal(false);
        if (remaining.length > 0) {
          setActiveIdeaId(remaining[0].id);
        } else {
          setActiveIdeaId(null);
          setComments([]);
        }
      }
    }
  };

  // Delete All References
  const handleDeleteAll = async () => {
    const confirmed = window.confirm('Are you sure you want to delete ALL references?');
    if (confirmed) {
      await dataService.clearAllReferenceIdeas(project?.id);
      setIdeas([]);
      setActiveIdeaId(null);
      setComments([]);
    }
  };

  // Send Message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!messageInput.trim() || !activeIdea) return;

    const cleanText = messageInput.trim();
    const saved = await dataService.addComment({
      idea_id: activeIdea.id,
      user_name: user?.name || 'Creator',
      user_avatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      comment_text: cleanText,
      is_outgoing: true
    });

    activityTracker.logAction(
      'COMMENT',
      activeIdea.title || 'Reference Idea',
      `Posted note: "${cleanText}"`,
      project?.insta_handle || project?.name || 'Workspace'
    );

    setComments(prev => [...prev, saved]);
    setMessageInput('');
  };

  // Auto resolve metadata and direct video stream
  const resolveMetadata = async (urlToFetch) => {
    const trimmed = (urlToFetch || newUrl).trim();
    if (!trimmed || addType !== 'reel') return null;

    // Direct MP4 / video check
    if (trimmed.match(/\.(mp4|webm|mov)(\?.*)?$/i) || trimmed.includes('fbcdn.net/o1/v/')) {
      setPreviewVideo(trimmed);
      if (!newTitle.trim()) setNewTitle('Custom Video Reel');
      return { videoUrl: trimmed, title: 'Custom Video Reel' };
    }

    try {
      setIsFetchingMeta(true);
      const res = await fetch('http://localhost:5000/api/instagram/reel-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed })
      });
      const json = await res.json();
      if (json.success && json.data) {
        if (!newTitle.trim() && json.data.title) {
          setNewTitle(json.data.title);
        }
        if (json.data.thumbnailUrl) {
          setPreviewCover(json.data.thumbnailUrl);
        }
        if (json.data.videoUrl) {
          setPreviewVideo(json.data.videoUrl);
        }
        return json.data;
      }
    } catch (_) {
    } finally {
      setIsFetchingMeta(false);
    }
    return null;
  };

  // Re-extract video stream for active idea
  const handleReExtractStream = async () => {
    if (!activeIdea) return;
    setIsFetchingMeta(true);
    try {
      const res = await fetch('http://localhost:5000/api/instagram/reel-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: activeIdea.reel_url || `https://www.instagram.com/reel/${activeIdea.shortcode}/` })
      });
      const json = await res.json();
      if (json.success && json.data?.videoUrl) {
        await dataService.updateReferenceIdeaVideo(activeIdea.id, json.data.videoUrl, json.data.thumbnailUrl);
        setIdeas(prev => prev.map(i => i.id === activeIdea.id ? {
          ...i,
          video_url: json.data.videoUrl,
          thumbnail_url: json.data.thumbnailUrl || i.thumbnail_url
        } : i));
      }
    } catch (_) {
    } finally {
      setIsFetchingMeta(false);
    }
  };

  // Manually attach or edit stream URL for active idea
  const handleEditStreamUrl = async () => {
    if (!activeIdea) return;
    const current = activeIdea.video_url || '';
    const newStream = window.prompt('Enter direct video stream URL (.mp4 or CDN link) for this reference:', current);
    if (newStream !== null && newStream.trim() !== '') {
      const trimmed = newStream.trim();
      await dataService.updateReferenceIdeaVideo(activeIdea.id, trimmed);
      setIdeas(prev => prev.map(i => i.id === activeIdea.id ? { ...i, video_url: trimmed } : i));
    }
  };

  // Save New Reference
  const handleCreateReference = async (e) => {
    e.preventDefault();
    const url = newUrl.trim();
    if (!url) return;

    let finalTitle = newTitle.trim();
    let finalThumbnail = previewCover;
    let finalVideo = customVideoUrl.trim() || previewVideo;
    let embedUrl = '';
    let shortcode = '';

    if (addType === 'reel') {
      if (!finalVideo && !isFetchingMeta) {
        const meta = await resolveMetadata(url);
        if (meta?.videoUrl) finalVideo = meta.videoUrl;
        if (!finalTitle && meta?.title) finalTitle = meta.title;
        if (!finalThumbnail && meta?.thumbnailUrl) finalThumbnail = meta.thumbnailUrl;
      }

      const match = url.match(/instagram\.com\/(?:[A-Za-z0-9._-]+\/)?(?:reel|reels|p)\/([A-Za-z0-9_-]+)/i);
      shortcode = match ? match[1] : '';
      const isPost = url.includes('/p/');
      embedUrl = shortcode
        ? (isPost ? `https://www.instagram.com/p/${shortcode}/embed/` : `https://www.instagram.com/reel/${shortcode}/embed/`)
        : url;

      if (!finalTitle) finalTitle = shortcode ? `Reel ${shortcode}` : 'Reference Reel';
    } else {
      if (!finalTitle) finalTitle = 'Reference Image';
      finalThumbnail = url;
    }

    const created = await dataService.addReferenceIdea({
      project_id: project.id,
      title: finalTitle,
      type: addType,
      reel_url: addType === 'reel' ? url : '',
      video_url: addType === 'reel' ? (finalVideo || '') : '',
      embed_url: embedUrl,
      shortcode: shortcode,
      image_url: addType === 'image' ? url : '',
      thumbnail_url: finalThumbnail,
      added_by_name: user?.name || 'Creator',
      added_by_avatar: user?.avatar || ''
    });

    activityTracker.logAction(
      'VIEW_REFERENCE',
      finalTitle,
      `Added new ${addType} reference to library`,
      project?.insta_handle || project?.name || 'Workspace'
    );

    setNewUrl('');
    setNewTitle('');
    setPreviewCover('');
    setPreviewVideo('');
    setCustomVideoUrl('');
    setShowAddModal(false);
    await loadIdeas(created.id);
  };

  // Filtered Ideas
  const reelsCount = ideas.filter(i => i.type === 'reel' || (!i.type && !i.image_url)).length;
  const imagesCount = ideas.filter(i => i.type === 'image' || Boolean(i.image_url)).length;

  const filteredIdeas = ideas.filter(idea => {
    // Type filter
    if (activeFilter === 'reel' && (idea.type !== 'reel' && Boolean(idea.image_url))) return false;
    if (activeFilter === 'image' && (idea.type !== 'image' && !idea.image_url)) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (idea.title || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* ─── 1. TOP STUDIO HEADER & TOOLBAR ─────────────────────────────── */}
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
        {/* Left: Studio Icon & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(139, 92, 246, 0.15) 100%)',
            border: '1px solid rgba(124, 58, 237, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#8b5cf6'
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.28rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                Reference Studio
              </h2>
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#7c3aed',
                background: '#f5f3ff',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid #ddd6fe'
              }}>
                {ideas.length} {ideas.length === 1 ? 'idea' : 'ideas'}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Collect inspiration reels, visual benchmarks, and discuss with your team
            </p>
          </div>
        </div>

        {/* Center: Search & Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '11px', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search references..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '7px 12px 7px 32px',
                fontSize: '0.82rem',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#0f172a',
                outline: 'none',
                width: '180px',
                transition: 'all 0.15s ease'
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.width = '210px'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; if (!searchQuery) e.currentTarget.style.width = '180px'; }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '8px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'flex' }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Segmented Filter Pills */}
          <div style={{
            display: 'flex',
            gap: '2px',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '10px'
          }}>
            <button
              onClick={() => setActiveFilter('all')}
              style={{
                border: 'none',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: activeFilter === 'all' ? '#ffffff' : 'transparent',
                color: activeFilter === 'all' ? '#0f172a' : '#64748b',
                boxShadow: activeFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              All ({ideas.length})
            </button>
            <button
              onClick={() => setActiveFilter('reel')}
              style={{
                border: 'none',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: activeFilter === 'reel' ? '#ffffff' : 'transparent',
                color: activeFilter === 'reel' ? '#7c3aed' : '#64748b',
                boxShadow: activeFilter === 'reel' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <Film size={12} /> Reels ({reelsCount})
            </button>
            <button
              onClick={() => setActiveFilter('image')}
              style={{
                border: 'none',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: activeFilter === 'image' ? '#ffffff' : 'transparent',
                color: activeFilter === 'image' ? '#0284c7' : '#64748b',
                boxShadow: activeFilter === 'image' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <ImageIcon size={12} /> Images ({imagesCount})
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {ideas.length > 0 && (
            <button
              onClick={handleDeleteAll}
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
              title="Delete all references"
            >
              <Trash2 size={14} /> Clear All
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(124, 58, 237, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(124, 58, 237, 0.35)';
            }}
          >
            <Plus size={16} /> Add Reference
          </button>
        </div>
      </div>

      {/* ─── 2. MAIN REFERENCE CARDS GRID ───────────────────────────────── */}
      {filteredIdeas.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 280px))',
          gap: '22px',
          alignItems: 'stretch'
        }}>
          {filteredIdeas.map((idea) => {
            const isReel = idea.type === 'reel' || (!idea.type && !idea.image_url);
            const mediaUrl = idea.thumbnail_url || idea.image_url || '';
            const likesCount = idea.likes_count || 0;
            const dislikesCount = idea.dislikes_count || 0;

            return (
              <div
                key={idea.id}
                onClick={() => {
                  setActiveIdeaId(idea.id);
                  setShowDetailModal(true);
                }}
                className="clean-card clean-card-hover"
                style={{
                  borderRadius: '18px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.borderColor = '#c4b5fd';
                  e.currentTarget.style.boxShadow = '0 18px 36px -6px rgba(124, 58, 237, 0.14), 0 6px 14px rgba(15, 23, 42, 0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 4px 16px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.04)';
                }}
              >
                {/* Visual Media Box */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '9 / 14',
                  borderRadius: '12px',
                  backgroundColor: '#090d16',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.08)'
                }}>
                  {mediaUrl ? (
                    <img
                      src={mediaUrl}
                      alt={idea.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        transition: 'transform 0.3s ease'
                      }}
                      onError={(e) => {
                        e.target.style.opacity = '0.35';
                      }}
                    />
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#64748b',
                      fontSize: '0.8rem'
                    }}>
                      {isReel ? <Film size={32} color="#475569" /> : <ImageIcon size={32} color="#475569" />}
                      <span>{isReel ? 'Video Reel' : 'Reference Image'}</span>
                    </div>
                  )}

                  {/* Gradient bottom shadow for depth */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.65) 100%)',
                    pointerEvents: 'none'
                  }} />

                  {/* Top-Left: Type Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '9px',
                    left: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: isReel ? 'rgba(124, 58, 237, 0.85)' : 'rgba(2, 132, 199, 0.85)',
                    backdropFilter: 'blur(6px)',
                    color: '#ffffff',
                    padding: '3px 8px',
                    borderRadius: '20px',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                  }}>
                    {isReel ? <Film size={10} /> : <ImageIcon size={10} />}
                    <span>{isReel ? 'REEL' : 'IMAGE'}</span>
                  </div>

                  {/* Top-Right: Quick Actions (External link & Delete) */}
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {idea.reel_url && (
                      <a
                        href={idea.reel_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.5)',
                          backdropFilter: 'blur(4px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          textDecoration: 'none',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.85)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                        title="Open on Instagram"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCurrent(idea, e)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fca5a5',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#ffffff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; e.currentTarget.style.color = '#fca5a5'; }}
                      title="Delete reference"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Center Play Button (For Reels) */}
                  {isReel && (
                    <div style={{
                      position: 'absolute',
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.92)',
                      backdropFilter: 'blur(8px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                      transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      pointerEvents: 'none'
                    }}>
                      <Play size={18} fill="#0f172a" color="#0f172a" style={{ marginLeft: '2px' }} />
                    </div>
                  )}

                  {/* Bottom bar inside media: Click to review */}
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    right: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#ffffff',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}>
                    <div style={{
                      background: 'rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(4px)',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <ThumbsUp size={11} fill={idea.user_liked ? '#60a5fa' : 'none'} color={idea.user_liked ? '#60a5fa' : '#ffffff'} />
                      <span>{likesCount}</span>
                    </div>

                    <div style={{
                      background: 'rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(4px)',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>Review</span>
                      <ArrowRight size={11} />
                    </div>
                  </div>
                </div>

                {/* Card Content & Metadata */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 4px 4px 4px' }}>
                  {/* Title */}
                  <h4 style={{
                    fontSize: '0.96rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: 0,
                    lineHeight: 1.35,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    minHeight: '2.5em'
                  }}>
                    {idea.title || 'Untitled Reference'}
                  </h4>

                  {/* Byline: "refered by" with small round profile image (no names as requested) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '6px',
                    borderTop: '1px solid #f1f5f9'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#64748b'
                    }}>
                      <span>refered by</span>
                      <img
                        src={user?.avatar || idea.added_by_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                        alt="Profile"
                        title={idea.added_by_name || user?.name || 'Creator'}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '1.5px solid #e2e8f0',
                          background: '#ffffff',
                          display: 'inline-block',
                          flexShrink: 0,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                      />
                    </div>

                    {/* Chat indicator */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#94a3b8',
                      fontSize: '0.74rem',
                      fontWeight: 600
                    }}>
                      <MessageSquare size={13} />
                      <span>Chat</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div
          className="clean-card"
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            borderRadius: '20px',
            background: '#ffffff',
            border: '1px solid #e2e8f0'
          }}
        >
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            border: '1px solid #ddd6fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#7c3aed',
            boxShadow: '0 4px 16px rgba(124, 58, 237, 0.15)'
          }}>
            <Sparkles size={30} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {searchQuery ? 'No matching references found' : 'No References Added Yet'}
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#64748b', maxWidth: '400px', margin: '6px auto 0 auto' }}>
              {searchQuery
                ? `No references matched "${searchQuery}". Try a different search or clear filters.`
                : 'Save Instagram Reels or benchmark image references to review hooks, shots, and brainstorm scripts.'}
            </p>
          </div>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="clean-btn-secondary"
              style={{ marginTop: '6px' }}
            >
              Clear Search
            </button>
          ) : (
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                marginTop: '8px',
                padding: '10px 22px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(124, 58, 237, 0.35)'
              }}
            >
              <Plus size={16} /> Add First Reference
            </button>
          )}
        </div>
      )}

      {/* ─── 3. DETAIL CARD MODAL (SIDE-BY-SIDE MEDIA & DISCUSSION) ──────── */}
      {showDetailModal && activeIdea && (
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
                onClick={() => setShowDetailModal(false)}
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
                <ChevronLeft size={16} /> Back to Reference Studio
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activeIdea.reel_url && (
                  <a
                    href={activeIdea.reel_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '7px 14px',
                      borderRadius: '20px',
                      background: 'rgba(255,255,255,0.9)',
                      border: '1px solid #cbd5e1',
                      color: '#0284c7',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <ExternalLink size={13} /> View on Instagram
                  </a>
                )}

                <button
                  onClick={() => setShowDetailModal(false)}
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

            {/* Side-by-Side Detail Container */}
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
              {/* LEFT COLUMN: MEDIA PLAYER & CONTROLS */}
              <div
                style={{
                  flex: '1.15',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: '#ffffff',
                  padding: '22px',
                  borderRight: '1px solid #e2e8f0'
                }}
              >
                {/* Media Player Frame */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '470px',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  backgroundColor: '#090d16',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                }}>
                  {activeIdea.type === 'image' || (!activeIdea.video_url && activeIdea.image_url) ? (
                    <img
                      src={activeIdea.image_url || activeIdea.thumbnail_url}
                      alt={activeIdea.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        backgroundColor: '#090d16'
                      }}
                    />
                  ) : activeIdea.video_url ? (
                    <video
                      key={activeIdea.id + activeIdea.video_url}
                      src={activeIdea.video_url}
                      poster={activeIdea.thumbnail_url}
                      controls
                      autoPlay
                      playsInline
                      loop
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        backgroundColor: '#000000'
                      }}
                      onError={(e) => {
                        if (!e.target.src.includes('/api/instagram/video-stream')) {
                          e.target.src = `http://localhost:5000/api/instagram/video-stream?url=${encodeURIComponent(activeIdea.video_url)}`;
                        }
                      }}
                    />
                  ) : activeIdea.thumbnail_url ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={activeIdea.thumbnail_url}
                        alt={activeIdea.title}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px'
                      }}>
                        <button
                          onClick={handleReExtractStream}
                          style={{
                            padding: '11px 24px',
                            borderRadius: '30px',
                            background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.9rem',
                            boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)'
                          }}
                        >
                          {isFetchingMeta ? <Loader2 size={16} className="spin" /> : <Film size={16} />}
                          {isFetchingMeta ? 'Extracting Video Stream...' : 'Load & Play Video Stream'}
                        </button>
                        <button
                          onClick={handleEditStreamUrl}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            background: 'rgba(255,255,255,0.18)',
                            color: '#ffffff',
                            border: '1px solid rgba(255,255,255,0.4)',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            backdropFilter: 'blur(4px)'
                          }}
                        >
                          Paste Direct MP4 Stream
                        </button>
                      </div>
                    </div>
                  ) : activeIdea.embed_url || activeIdea.shortcode ? (
                    <iframe
                      src={activeIdea.embed_url || `https://www.instagram.com/reel/${activeIdea.shortcode}/embed/`}
                      title={activeIdea.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        backgroundColor: '#000000'
                      }}
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                      allowFullScreen
                      scrolling="no"
                    />
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Reference Media</div>
                  )}
                </div>

                {/* Lower: Title, Byline, and Reaction Bar */}
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>
                      {activeIdea.title}
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span>refered by</span>
                        <img
                          src={user?.avatar || activeIdea.added_by_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                          alt="Profile"
                          title={activeIdea.added_by_name || user?.name || 'Creator'}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            display: 'inline-block',
                            flexShrink: 0
                          }}
                        />
                      </div>

                      {activeIdea.type === 'reel' && (
                        <button
                          onClick={handleEditStreamUrl}
                          style={{
                            border: 'none',
                            background: '#f1f5f9',
                            color: '#7c3aed',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          Edit Stream Link
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions & Reactions Bar */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: '1px solid #f1f5f9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Like Option */}
                      <button
                        onClick={handleToggleLike}
                        style={{
                          padding: '7px 15px',
                          borderRadius: '8px',
                          border: activeIdea.user_liked ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                          background: activeIdea.user_liked ? '#f5f3ff' : '#ffffff',
                          color: activeIdea.user_liked ? '#7c3aed' : '#334155',
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s'
                        }}
                        title="Like this reference"
                      >
                        <ThumbsUp size={15} fill={activeIdea.user_liked ? '#7c3aed' : 'none'} />
                        <span>Like ({activeIdea.likes_count || 0})</span>
                      </button>

                      {/* Dislike Option */}
                      <button
                        onClick={handleToggleDislike}
                        style={{
                          padding: '7px 15px',
                          borderRadius: '8px',
                          border: activeIdea.user_disliked ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                          background: activeIdea.user_disliked ? '#fef2f2' : '#ffffff',
                          color: activeIdea.user_disliked ? '#ef4444' : '#475569',
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s'
                        }}
                        title="Dislike this reference"
                      >
                        <ThumbsDown size={15} fill={activeIdea.user_disliked ? '#ef4444' : 'none'} />
                        <span>Dislike {activeIdea.dislikes_count > 0 ? `(${activeIdea.dislikes_count})` : ''}</span>
                      </button>
                    </div>

                    {/* Delete Reference */}
                    <button
                      onClick={() => handleDeleteCurrent()}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                        background: '#ffffff',
                        color: '#ef4444',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Remove this reference"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: MESSAGING / DISCUSSION STREAM */}
              <div
                style={{
                  flex: '1',
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#f8fafc',
                  height: '100%',
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
                      Reference Discussion
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Collaborative notes for {activeIdea.title} ({comments.length} messages)
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
                      <p style={{ fontSize: '0.84rem', margin: 0, fontWeight: 600 }}>No messages yet</p>
                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, maxWidth: '240px' }}>
                        Leave notes on what makes this reference special or suggestions for the shoot.
                      </p>
                    </div>
                  ) : (
                    comments.map((msg, idx) => {
                      const isOutgoing = Boolean(msg.is_outgoing);

                      return (
                        <div
                          key={msg.id || idx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: '8px',
                            justifyContent: isOutgoing ? 'flex-end' : 'flex-start'
                          }}
                        >
                          {!isOutgoing && (
                            <img
                              src={msg.user_avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'}
                              alt={msg.user_name}
                              style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                flexShrink: 0,
                                marginBottom: '2px',
                                border: '1px solid #cbd5e1'
                              }}
                            />
                          )}

                          <div
                            style={{
                              maxWidth: '75%',
                              padding: '10px 14px',
                              fontSize: '0.88rem',
                              lineHeight: '1.45',
                              borderRadius: isOutgoing
                                ? '18px 18px 4px 18px'
                                : '18px 18px 18px 4px',
                              backgroundColor: isOutgoing ? '#7c3aed' : '#ffffff',
                              color: isOutgoing ? '#ffffff' : '#0f172a',
                              wordBreak: 'break-word',
                              boxShadow: isOutgoing
                                ? '0 2px 8px rgba(124, 58, 237, 0.25)'
                                : '0 1px 3px rgba(0,0,0,0.06)',
                              border: isOutgoing ? 'none' : '1px solid #e2e8f0'
                            }}
                          >
                            {msg.comment_text}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  style={{
                    borderTop: '1px solid #e2e8f0',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <input
                    type="text"
                    placeholder="Write a note or comment on this reference..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    style={{
                      flex: 1,
                      border: '1px solid #e2e8f0',
                      borderRadius: '24px',
                      padding: '10px 18px',
                      fontSize: '0.88rem',
                      outline: 'none',
                      background: '#f8fafc',
                      color: '#0f172a',
                      transition: 'all 0.15s ease'
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = '#ffffff'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                  />

                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: messageInput.trim() ? 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' : '#e2e8f0',
                      border: 'none',
                      color: messageInput.trim() ? '#ffffff' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: messageInput.trim() ? 'pointer' : 'default',
                      transition: 'all 0.18s ease',
                      flexShrink: 0,
                      boxShadow: messageInput.trim() ? '0 2px 8px rgba(124, 58, 237, 0.3)' : 'none'
                    }}
                    title="Send message"
                  >
                    <Send size={15} fill={messageInput.trim() ? '#ffffff' : 'none'} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. ADD REFERENCE MODAL ─────────────────────────────────────── */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div
            className="clean-card"
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '26px',
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
              border: '1px solid #e2e8f0'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7c3aed'
                }}>
                  <Sparkles size={16} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Add Reference Idea
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="clean-icon-btn"
                style={{ padding: '6px' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Type Switcher: Reel vs Image */}
            <div style={{
              display: 'flex',
              gap: '4px',
              padding: '4px',
              background: '#f1f5f9',
              borderRadius: '12px',
              marginBottom: '18px'
            }}>
              <button
                type="button"
                onClick={() => setAddType('reel')}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '9px',
                  border: 'none',
                  background: addType === 'reel' ? '#ffffff' : 'transparent',
                  color: addType === 'reel' ? '#7c3aed' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: addType === 'reel' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Film size={15} /> Instagram Reel
              </button>
              <button
                type="button"
                onClick={() => setAddType('image')}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '9px',
                  border: 'none',
                  background: addType === 'image' ? '#ffffff' : 'transparent',
                  color: addType === 'image' ? '#0284c7' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: addType === 'image' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <ImageIcon size={15} /> Reference Image
              </button>
            </div>

            <form onSubmit={handleCreateReference} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' }}>
                  {addType === 'reel' ? 'Instagram Reel or Video URL *' : 'Image URL *'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="url"
                    required
                    placeholder={addType === 'reel' ? 'https://www.instagram.com/reel/...' : 'https://images.unsplash.com/...'}
                    value={newUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewUrl(val);
                      if (debounceTimer.current) clearTimeout(debounceTimer.current);
                      debounceTimer.current = setTimeout(() => {
                        resolveMetadata(val);
                      }, 400);
                    }}
                    onBlur={() => resolveMetadata(newUrl)}
                    className="clean-input"
                    style={{ paddingRight: isFetchingMeta ? '36px' : '14px' }}
                  />
                  {isFetchingMeta && (
                    <div style={{ position: 'absolute', right: '12px', top: '10px' }}>
                      <Loader2 size={16} className="spin" color="#7c3aed" />
                    </div>
                  )}
                </div>
                {addType === 'reel' && (
                  <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#64748b' }}>
                    {isFetchingMeta ? (
                      <span style={{ color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Loader2 size={12} className="spin" /> Extracting video stream...
                      </span>
                    ) : (previewVideo || customVideoUrl) ? (
                      <span style={{ color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={12} /> Direct video stream resolved & ready to play
                      </span>
                    ) : (
                      <span>Paste any Instagram Reel URL or direct MP4 link</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '5px' }}>
                  Reference Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Night POV Highway Cinematic Edit"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="clean-input"
                />
              </div>

              {/* Detected preview card */}
              {previewCover && addType === 'reel' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  <img
                    src={previewCover}
                    alt="Cover preview"
                    style={{ width: '44px', height: '62px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                  <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                    <strong style={{ display: 'block', color: '#0f172a', marginBottom: '2px' }}>
                      {newTitle || 'Reel detected'}
                    </strong>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Reel metadata synced</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="clean-btn-secondary"
                  style={{ padding: '9px 18px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFetchingMeta}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                    color: '#ffffff',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)'
                  }}
                >
                  Save Reference
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

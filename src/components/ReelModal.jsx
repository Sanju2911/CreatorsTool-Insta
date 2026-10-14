import React, { useState, useRef, useEffect } from 'react';
import {
  X, Play, Pause, Volume2, VolumeX, ThumbsUp, ThumbsDown,
  Trash2, Share2, Repeat2, Send, Smile, MoreHorizontal,
  MessageCircle, ExternalLink, Check, Heart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ReelModal({
  isOpen,
  reel,
  onClose,
  comments,
  onAddComment,
  onDeleteReel,
  onLikeReel,
  onDislikeReel,
  onRepostReel
}) {
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isReposted, setIsReposted] = useState(Boolean(reel?.is_reposted));
  const [likeCount, setLikeCount] = useState(reel?.likes_count || 41);
  const [dislikeCount, setDislikeCount] = useState(reel?.dislikes_count || 0);
  const [shareToast, setShareToast] = useState(false);
  const [likedComments, setLikedComments] = useState({});

  const videoRef = useRef(null);
  const discussionEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setIsPlaying(true);
      setIsLiked(Boolean(reel?.user_has_liked));
      setIsDisliked(Boolean(reel?.user_has_disliked));
      setIsReposted(Boolean(reel?.is_reposted));
      setLikeCount(reel?.likes_count || 41);
      setDislikeCount(reel?.dislikes_count || 0);

      // Scroll to bottom of discussion
      setTimeout(() => {
        if (discussionEndRef.current) {
          discussionEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [isOpen, reel]);

  if (!isOpen || !reel) return null;

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleToggleMute = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    onAddComment({
      idea_id: reel.id,
      user_name: user?.name || 'Demo Creator',
      user_avatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      comment_text: messageText.trim()
    });

    setMessageText('');
    setTimeout(() => {
      if (discussionEndRef.current) {
        discussionEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleLikeToggle = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikeCount(prev => Math.max(0, prev - 1));
    } else {
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
      if (isDisliked) {
        setIsDisliked(false);
        setDislikeCount(prev => Math.max(0, prev - 1));
      }
    }
    if (onLikeReel) onLikeReel(reel.id);
  };

  const handleDislikeToggle = () => {
    if (isDisliked) {
      setIsDisliked(false);
      setDislikeCount(prev => Math.max(0, prev - 1));
    } else {
      setIsDisliked(true);
      setDislikeCount(prev => prev + 1);
      if (isLiked) {
        setIsLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      }
    }
    if (onDislikeReel) onDislikeReel(reel.id);
  };

  const handleRepostToggle = () => {
    const next = !isReposted;
    setIsReposted(next);
    if (onRepostReel) onRepostReel(reel.id, next);
  };

  const handleShare = () => {
    const url = reel.reel_url || window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }
  };

  const handleRemove = () => {
    const confirmed = window.confirm(`Remove reference reel "${reel.title}"?`);
    if (confirmed) {
      if (onDeleteReel) onDeleteReel(reel.id);
      onClose();
    }
  };

  const toggleCommentLike = (commentId) => {
    setLikedComments(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      {/* Close button in top-right screen corner */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '20px',
          right: '24px',
          background: 'transparent',
          border: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          padding: '8px',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Close modal"
      >
        <X size={28} />
      </button>

      {/* Main Reel Card Container (Instagram Split-Screen UI) */}
      <div
        style={{
          width: '100%',
          maxWidth: '1180px',
          height: '88vh',
          maxHeight: '920px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT COLUMN: CINEMATIC REEL VIDEO PLAYER / INSTAGRAM EMBED */}
        <div
          style={{
            flex: '1.25',
            backgroundColor: '#000000',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {reel.embed_url || (reel.shortcode ? `https://www.instagram.com/reel/${reel.shortcode}/embed/` : null) || (reel.reel_url?.includes('instagram.com') ? `${reel.reel_url.replace(/\/$/, '')}/embed/` : null) ? (
            <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <iframe
                src={reel.embed_url || (reel.shortcode ? `https://www.instagram.com/reel/${reel.shortcode}/embed/` : `${reel.reel_url.replace(/\/$/, '')}/embed/`)}
                title={reel.title || 'Instagram Reel'}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: '#000000'
                }}
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                scrolling="no"
              />
            </div>
          ) : reel.video_preview && !reel.video_preview.includes('flower.mp4') && !reel.video_preview.includes('sintel') ? (
            <div
              style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              onClick={handleTogglePlay}
            >
              <video
                ref={videoRef}
                src={reel.video_preview}
                loop
                autoPlay
                playsInline
                muted={isMuted}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  backgroundColor: '#000000'
                }}
              />

              {!isPlaying && (
                <div style={{
                  position: 'absolute',
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}>
                  <Play size={32} color="#ffffff" style={{ marginLeft: '4px' }} />
                </div>
              )}

              <button
                onClick={handleToggleMute}
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  right: '16px',
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10
                }}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          ) : reel.thumbnail_url ? (
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={reel.thumbnail_url}
                alt={reel.title}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <div style={{
                position: 'absolute',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}>
                <Play size={32} fill="#ffffff" color="#ffffff" style={{ marginLeft: '4px' }} />
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <Play size={48} color="#ffffff" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>Instagram Reference Reel</div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DETAILS, DISCUSSION AREA & CUSTOM ACTIONS */}
        <div
          style={{
            flex: '1',
            minWidth: '340px',
            maxWidth: '460px',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid var(--border-subtle)',
            height: '100%'
          }}
        >
          {/* 1. Header (Account Info & Options) */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-surface)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src={reel.added_by_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                alt={reel.added_by_name}
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-subtle)' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {reel.handle || 'demo.creator'}
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  {reel.audio_title || 'Original audio'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <a
                href={reel.reel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="clean-icon-btn"
                style={{ padding: '6px' }}
                title="Open Instagram Link"
              >
                <ExternalLink size={15} />
              </a>
              <button
                onClick={onClose}
                className="clean-icon-btn"
                style={{ padding: '6px' }}
                title="Close"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* 2. Caption & Referrer Section */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid #f1f5f9',
              backgroundColor: '#fafbfc'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <img
                src={reel.added_by_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                alt={reel.added_by_name}
                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', color: '#0f172a', lineHeight: 1.45 }}>
                  <strong style={{ marginRight: '6px' }}>{reel.handle || 'demo.creator'}</strong>
                  {reel.caption || reel.hook_notes || reel.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '0.74rem', color: '#64748b' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>refered by</span>
                    <img
                      src={user?.avatar || reel.added_by_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                      alt="Profile"
                      title={reel.added_by_name || user?.name || 'Creator'}
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        display: 'inline-block',
                        flexShrink: 0
                      }}
                    />
                  </span>
                  <span>•</span>
                  <span>1w</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. DISCUSSION AREA (Replacing standard Comments, as requested) */}
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageCircle size={14} color="#0284c7" />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
                Discussion Area
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {comments?.length || 0} messages
            </span>
          </div>

          {/* Discussion Messages Stream */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            {comments && comments.length > 0 ? (
              comments.map((c, idx) => {
                const isCommentLiked = likedComments[c.id];
                return (
                  <div key={c.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <img
                      src={c.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                      alt={c.user_name}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', marginTop: '2px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.84rem', color: '#0f172a', lineHeight: 1.4 }}>
                        <strong style={{ marginRight: '6px' }}>{c.user_name}</strong>
                        {c.comment_text}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.72rem', color: '#64748b' }}>
                        <span>{c.created_at?.includes('T') ? 'Today' : c.created_at || '1w'}</span>
                        <span style={{ cursor: 'pointer' }}>Reply</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleCommentLike(c.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        color: isCommentLiked ? '#ef4444' : '#94a3b8'
                      }}
                      title="Like message"
                    >
                      <Heart size={12} fill={isCommentLiked ? '#ef4444' : 'none'} />
                    </button>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 10px', fontSize: '0.84rem' }}>
                No discussion messages yet. Start the conversation for this reel below!
              </div>
            )}
            <div ref={discussionEndRef} />
          </div>

          {/* 4. CUSTOM ACTION BAR (LIKE, DISLIKE, REMOVE, SHARE, REPOST) */}
          <div
            style={{
              padding: '10px 16px 8px 16px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            {/* The 5 Required Action Buttons in place of the heart */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* 1. Like */}
                <button
                  onClick={handleLikeToggle}
                  className="clean-btn-secondary"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: isLiked ? '#0284c7' : '#334155',
                    borderColor: isLiked ? '#0284c7' : '#cbd5e1',
                    background: isLiked ? '#f0f9ff' : '#ffffff'
                  }}
                  title="Like this reference reel"
                >
                  <ThumbsUp size={13} fill={isLiked ? '#0284c7' : 'none'} />
                  <span>Like ({likeCount})</span>
                </button>

                {/* 2. Dislike */}
                <button
                  onClick={handleDislikeToggle}
                  className="clean-btn-secondary"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: isDisliked ? '#ef4444' : '#64748b',
                    borderColor: isDisliked ? '#ef4444' : '#cbd5e1',
                    background: isDisliked ? '#fef2f2' : '#ffffff'
                  }}
                  title="Dislike this reference reel"
                >
                  <ThumbsDown size={13} fill={isDisliked ? '#ef4444' : 'none'} />
                  <span>Dislike {dislikeCount > 0 ? `(${dislikeCount})` : ''}</span>
                </button>

                {/* 3. Repost */}
                <button
                  onClick={handleRepostToggle}
                  className="clean-btn-secondary"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: isReposted ? '#16a34a' : '#334155',
                    borderColor: isReposted ? '#16a34a' : '#cbd5e1',
                    background: isReposted ? '#f0fdf4' : '#ffffff'
                  }}
                  title="Repost to Story / Staging"
                >
                  <Repeat2 size={13} />
                  <span>{isReposted ? 'Reposted' : 'Repost'}</span>
                </button>

                {/* 4. Share */}
                <button
                  onClick={handleShare}
                  className="clean-btn-secondary"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Share / Copy Link"
                >
                  <Share2 size={13} />
                  <span>Share</span>
                </button>
              </div>

              {/* 5. Remove */}
              <button
                onClick={handleRemove}
                className="clean-btn-secondary"
                style={{
                  padding: '4px 8px',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#ef4444',
                  borderColor: '#fca5a5'
                }}
                title="Remove this reel"
              >
                <Trash2 size={13} />
                <span>Remove</span>
              </button>
            </div>

            {/* Share Feedback Toast */}
            {shareToast && (
              <div style={{
                fontSize: '0.72rem',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600
              }}>
                <Check size={12} /> Link copied to clipboard!
              </div>
            )}

            {/* Likes summary line */}
            <div style={{ fontSize: '0.76rem', color: '#334155', fontWeight: 600 }}>
              Liked by <span style={{ fontWeight: 700 }}>{user?.name || 'Creator'}</span> and {likeCount} others
            </div>
          </div>

          {/* 5. DISCUSSION TEXT INPUT (Send messages for this reel) */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: '10px 14px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff'
            }}
          >
            <Smile size={18} color="#94a3b8" style={{ cursor: 'pointer' }} />
            <input
              type="text"
              placeholder="Text idea or message for this reel..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="clean-input"
              style={{
                flex: 1,
                fontSize: '0.82rem',
                padding: '6px 10px',
                border: 'none',
                background: '#f8fafc',
                borderRadius: '6px'
              }}
            />
            <button
              type="submit"
              disabled={!messageText.trim()}
              className="clean-btn-primary"
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                opacity: messageText.trim() ? 1 : 0.6,
                cursor: messageText.trim() ? 'pointer' : 'default'
              }}
            >
              Post
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

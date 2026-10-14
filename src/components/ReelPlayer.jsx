import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Send, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ReelPlayer({ reel, comments, onAddComment }) {
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [commentText, setCommentText] = useState('');
  const videoRef = useRef(null);

  useEffect(() => {
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [reel?.id]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    onAddComment({
      idea_id: reel.id,
      user_name: user?.name || 'Creator',
      user_avatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      comment_text: commentText.trim()
    });

    setCommentText('');
  };

  if (!reel) {
    return (
      <div className="clean-card" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
        Select a reel below to play.
      </div>
    );
  }

  return (
    <div className="clean-card" style={{ overflow: 'hidden', background: '#ffffff' }}>
      {/* 1. ON TOP: WHO REFERRED THIS REEL */}
      <div style={{
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>refered by</span>
          <img
            src={user?.avatar || reel.added_by_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
            alt="Profile"
            title={reel.added_by_name || user?.name || 'Creator'}
            style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }}
          />
        </div>

        <a
          href={reel.reel_url}
          target="_blank"
          rel="noopener noreferrer"
          className="clean-btn-secondary"
          style={{ padding: '4px 10px', fontSize: '0.78rem' }}
        >
          <ExternalLink size={12} /> Open Link
        </a>
      </div>

      {/* 2. REEL PLAYER AREA */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        borderBottom: '1px solid #e2e8f0'
      }}>
        {/* Left: Video */}
        <div style={{
          position: 'relative',
          background: '#000',
          aspectRatio: '9/16',
          maxHeight: '440px',
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {reel.video_preview ? (
            <video
              ref={videoRef}
              src={reel.video_preview}
              loop
              muted={isMuted}
              autoPlay
              playsInline
              onClick={togglePlay}
              style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '16px' }}>
              <Play size={40} color="#e1306c" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.85rem' }}>Instagram Reel</div>
            </div>
          )}

          {/* Controls */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            display: 'flex',
            gap: '6px'
          }}>
            <button onClick={togglePlay} className="clean-icon-btn" style={{ padding: '5px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none' }}>
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button onClick={toggleMute} className="clean-icon-btn" style={{ padding: '5px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none' }}>
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        </div>

        {/* Right: Reel Title & Hook */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            {reel.title}
          </h3>

          {reel.hook_notes && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px'
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Hook Note:
              </div>
              <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.5 }}>
                {reel.hook_notes}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {reel.tags?.map((t, idx) => (
              <span key={idx} className="clean-badge clean-badge-gray">
                #{t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3. SCROLL DOWN: COMMENTS & IDEAS FEED */}
      <div style={{ padding: '20px', background: '#ffffff' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
          Ideas & Comments ({comments?.length || 0})
        </h4>

        {/* Add Idea Input */}
        <form onSubmit={handleCommentSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
          <input
            type="text"
            placeholder="Write your idea for this reel..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="clean-input"
            style={{ flex: 1 }}
          />
          <button type="submit" className="clean-btn-primary" style={{ whiteSpace: 'nowrap' }}>
            <Send size={15} /> Add Idea
          </button>
        </form>

        {/* List of comments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(!comments || comments.length === 0) ? (
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              No comments yet. Write your idea above!
            </div>
          ) : (
            comments.map((comm) => (
              <div
                key={comm.id}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{comm.user_name}: </strong>
                  <span style={{ fontSize: '0.85rem', color: '#334155' }}>{comm.comment_text}</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  {new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

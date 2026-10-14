import React, { useState, useRef, useEffect } from 'react';
import {
  Paintbrush, Edit2, Eraser, Square, Circle, ArrowRight, Type,
  RotateCcw, RotateCw, Trash2, Download, Save, Image as ImageIcon,
  Check, Play, Plus, X, Film, Calendar, Clock, ExternalLink,
  Sparkles, Layers, Send, MessageSquare, ChevronLeft, Eye
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { activityTracker } from '../services/activityTracker';

const PAINT_COLORS = [
  '#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200',
  '#22b14c', '#00a2e8', '#3f48cc', '#a349a4', '#ffffff', '#c3c3c3',
  '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0', '#b5e61d', '#99d9ea'
];

export default function StoryboardStudio({ project }) {
  const { user } = useAuth();
  const [storyboards, setStoryboards] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // Opens strictly in VIEW MODE by default!
  const [sessionId, setSessionId] = useState(0);
  const [referenceIdeas, setReferenceIdeas] = useState([]);
  const [comments, setComments] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [saveStatus, setSaveStatus] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editAttachedReelId, setEditAttachedReelId] = useState('');

  // Paint tools state
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('pencil'); // pencil, brush, eraser, line, rect, circle, arrow, text
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [fillShape, setFillShape] = useState(false);

  // Undo / Redo history
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [snapshot, setSnapshot] = useState(null);

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
    const [fetchedBoards, fetchedIdeas] = await Promise.all([
      dataService.getStoryboards(project?.id),
      dataService.getReferenceIdeas(project?.id, 'newest')
    ]);
    setStoryboards(fetchedBoards);
    setReferenceIdeas(fetchedIdeas);
  };

  // Load comments when active storyboard changes
  useEffect(() => {
    if (activeBoard?.id) {
      dataService.getStoryboardComments(activeBoard.id).then(setComments);
    } else {
      setComments([]);
    }
  }, [activeBoard?.id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  // Open existing storyboard in VIEW MODE (not edit mode!)
  const openStoryboard = (board) => {
    setActiveBoard(board);
    setIsEditing(false); // Strict View Mode
    setEditTitle(board.title || '');
    setEditAttachedReelId(board.attached_reel_id || '');
    setSessionId(Date.now());

    activityTracker.logAction(
      'VIEW_STORYBOARD',
      board.title || 'Storyboard',
      'Opened storyboard in View Mode',
      project?.insta_handle || project?.name || 'Workspace'
    );
  };

  // Open new blank storyboard directly in Paint drawing mode
  const openNewStoryboard = () => {
    const authorName = user?.name || project?.name || 'Creator';
    const blank = {
      project_id: project?.id || 'proj-throttle',
      title: 'Storyboard #' + (storyboards.length + 1),
      created_by: authorName,
      author_name: authorName,
      author_avatar: user?.avatar || '',
      canvas_data: '',
      attached_reel_id: '',
      custom_reel_url: ''
    };
    setActiveBoard(blank);
    setIsEditing(true);
    setEditTitle(blank.title);
    setEditAttachedReelId('');
    setSessionId(Date.now());
  };

  const handleStartEditing = () => {
    if (!activeBoard) return;
    setEditTitle(activeBoard.title || '');
    setEditAttachedReelId(activeBoard.attached_reel_id || '');
    setIsEditing(true);
    setSessionId(Date.now());
  };

  // Canvas setup when Paint/Edit mode opens
  useEffect(() => {
    if (!activeBoard || !isEditing) return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (activeBoard.canvas_data) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          setHistory([activeBoard.canvas_data]);
          setHistoryStep(0);
        };
        img.src = activeBoard.canvas_data;
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const blankData = canvas.toDataURL();
        setHistory([blankData]);
        setHistoryStep(0);
      }
    }, 40);

    return () => clearTimeout(timer);
  }, [sessionId, isEditing]);

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      const prev = historyStep - 1;
      restoreCanvasState(history[prev]);
      setHistoryStep(prev);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const next = historyStep + 1;
      restoreCanvasState(history[next]);
      setHistoryStep(next);
    }
  };

  const restoreCanvasState = (dataUrl) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoords(e);

    if (tool === 'text') {
      const text = prompt('Enter scene label or dialogue:', 'Shot 1: Action');
      if (text) {
        ctx.font = `bold ${lineWidth * 4 + 18}px sans-serif`;
        ctx.fillStyle = color;
        ctx.fillText(text, coords.x, coords.y);
        saveCanvasState();
      }
      return;
    }

    setIsDrawing(true);
    setStartPos(coords);
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoords(e);

    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.fillStyle = color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 4 : tool === 'brush' ? lineWidth * 2 : lineWidth;

    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else {
      if (snapshot) ctx.putImageData(snapshot, 0, 0);
      const dx = coords.x - startPos.x;
      const dy = coords.y - startPos.y;

      if (tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      } else if (tool === 'rect') {
        if (fillShape) ctx.fillRect(startPos.x, startPos.y, dx, dy);
        else ctx.strokeRect(startPos.x, startPos.y, dx, dy);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(dx * dx + dy * dy);
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
        if (fillShape) ctx.fill();
        else ctx.stroke();
      } else if (tool === 'arrow') {
        const headlen = 16;
        const angle = Math.atan2(coords.y - startPos.y, coords.x - startPos.x);
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        ctx.lineTo(coords.x - headlen * Math.cos(angle - Math.PI / 6), coords.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(coords.x - headlen * Math.cos(angle + Math.PI / 6), coords.y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveCanvasState();
  };

  const handleClear = () => {
    if (!window.confirm('Clear canvas? This cannot be undone.')) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveCanvasState();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const ratio = Math.min((canvas.width * 0.7) / img.width, (canvas.height * 0.7) / img.height, 1);
        const w = img.width * ratio;
        const h = img.height * ratio;
        ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        saveCanvasState();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleExportPng = () => {
    const targetSrc = activeBoard?.canvas_data;
    if (!targetSrc) return;
    const link = document.createElement('a');
    link.download = `${(activeBoard?.title || 'storyboard').replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    link.href = targetSrc;
    link.click();
  };

  const handleSave = async () => {
    if (!activeBoard) return;
    const canvas = canvasRef.current;
    let canvasData = activeBoard.canvas_data || '';
    if (canvas) {
      canvasData = canvas.toDataURL('image/png');
    }

    const authorName = activeBoard.created_by || activeBoard.author_name || user?.name || 'Creator';
    const payload = {
      ...activeBoard,
      project_id: activeBoard.project_id || project?.id || 'proj-throttle',
      title: editTitle.trim() || 'Untitled Storyboard',
      attached_reel_id: editAttachedReelId,
      created_by: authorName,
      author_name: authorName,
      author_avatar: user?.avatar || activeBoard.author_avatar || '',
      canvas_data: canvasData
    };

    const saved = await dataService.saveStoryboard(payload);
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 1500);

    activityTracker.logAction(
      activeBoard?.id ? 'EDIT_STORYBOARD' : 'CREATE_STORYBOARD',
      payload.title,
      'Updated storyboard canvas drawings and scene composition',
      project?.insta_handle || project?.name || 'Workspace'
    );

    const refreshed = await dataService.getStoryboards(project?.id);
    setStoryboards(refreshed);
    setActiveBoard(saved);
    setIsEditing(false); // Switch back to view mode!
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!id) return;
    const confirmed = window.confirm('Are you sure you want to delete this storyboard?');
    if (!confirmed) return;

    await dataService.deleteStoryboard(id);
    const refreshed = await dataService.getStoryboards(project?.id);
    setStoryboards(refreshed);
    if (activeBoard?.id === id) {
      setActiveBoard(null);
    }
  };

  const handleClearAllStoryboards = async () => {
    const confirmed = window.confirm('Are you sure you want to clear ALL storyboards?');
    if (confirmed) {
      await dataService.clearAllStoryboards(project?.id);
      setStoryboards([]);
      setActiveBoard(null);
    }
  };

  // Add Comment / Scene Note
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !activeBoard?.id) return;

    const cleanMsg = messageInput.trim();
    const newMsg = await dataService.addStoryboardComment({
      board_id: activeBoard.id,
      user_name: user?.name || 'Creator',
      user_avatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      comment_text: cleanMsg,
      is_outgoing: true
    });

    activityTracker.logAction(
      'COMMENT',
      activeBoard.title || 'Storyboard Notes',
      `Posted note: "${cleanMsg}"`,
      project?.insta_handle || project?.name || 'Workspace'
    );

    setComments(prev => [...prev, newMsg]);
    setMessageInput('');
  };

  const attachedIdea = activeBoard ? referenceIdeas.find(r => r.id === (isEditing ? editAttachedReelId : activeBoard.attached_reel_id)) : null;

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
            background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.1) 0%, rgba(34, 197, 94, 0.15) 100%)',
            border: '1px solid rgba(22, 163, 74, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#16a34a'
          }}>
            <Paintbrush size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.28rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                Storyboard Studio
              </h2>
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#16a34a',
                background: '#f0fdf4',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid #bbf7d0'
              }}>
                {storyboards.length} {storyboards.length === 1 ? 'board' : 'boards'}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Visual scene planning • Sketch camera frames, transitions & pacing
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {storyboards.length > 0 && (
            <button
              onClick={handleClearAllStoryboards}
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
              title="Delete all storyboards"
            >
              <Trash2 size={14} /> Clear All
            </button>
          )}

          <button
            onClick={openNewStoryboard}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
              transition: 'all 0.18s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(22, 163, 74, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(22, 163, 74, 0.35)';
            }}
          >
            <Plus size={16} /> New Storyboard
          </button>
        </div>
      </div>

      {/* ─── 2. GRID OF SMALL STORYBOARD CARDS ───────────────────────────── */}
      {storyboards.length === 0 ? (
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
            color: '#7c3aed'
          }}>
            <Paintbrush size={28} />
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            No Storyboards Added Yet
          </h3>
          <p style={{ fontSize: '0.88rem', color: '#64748b', maxWidth: '420px', margin: 0, lineHeight: 1.5 }}>
            Sketch scene beats, camera angles, and visual pacing for your reels and videos.
          </p>

          <button
            onClick={openNewStoryboard}
            className="clean-btn-primary"
            style={{ marginTop: '8px', padding: '9px 18px', fontSize: '0.9rem' }}
          >
            <Plus size={16} /> Create First Storyboard
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '18px'
        }}>
          {storyboards.map((b) => {
            const author = b.created_by || b.author_name || 'Creator';
            const boardIdea = referenceIdeas.find(r => r.id === b.attached_reel_id);

            return (
              <div
                key={b.id}
                onClick={() => openStoryboard(b)}
                className="clean-card clean-card-hover"
                style={{
                  padding: '16px',
                  background: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = '#86efac';
                  e.currentTarget.style.boxShadow = '0 16px 32px -4px rgba(22, 163, 74, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 4px 16px -2px rgba(15, 23, 42, 0.04)';
                }}
              >
                <div>
                  {/* Thumbnail Canvas Frame */}
                  <div style={{
                    width: '100%',
                    height: '148px',
                    borderRadius: '12px',
                    background: '#0f172a',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px'
                  }}>
                    {b.canvas_data ? (
                      <img
                        src={b.canvas_data}
                        alt={b.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          background: '#090d16'
                        }}
                      />
                    ) : (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#94a3b8'
                      }}>
                        <Layers size={24} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Empty Sketch</span>
                      </div>
                    )}
                  </div>

                  {/* Card Header: Title & Delete */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '7px',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#16a34a'
                      }}>
                        <Paintbrush size={14} />
                      </div>
                      <h4 style={{
                        fontSize: '0.98rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        margin: 0,
                        lineHeight: 1.3
                      }}>
                        {b.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(b.id, e)}
                      title="Delete storyboard"
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

                  {/* CREATED BY: Small round profile image (no name as established) */}
                  <div style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    marginBottom: '8px'
                  }}>
                    <span>Created by</span>
                    <img
                      src={user?.avatar || b.author_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                      alt="Created by profile"
                      title={author}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1.5px solid #ddd6fe',
                        background: '#ffffff',
                        display: 'inline-block',
                        flexShrink: 0
                      }}
                    />
                  </div>

                  {/* Attached Reel Tag */}
                  {(boardIdea || b.custom_reel_url) && (
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
                  <span>{b.updated_at ? new Date(b.updated_at).toLocaleDateString() : 'Draft'}</span>
                  <span style={{ color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Eye size={12} /> View Storyboard →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── 3. SIDE-BY-SIDE STORYBOARD MODAL (VIEW MODE + TEXT OPTION BESIDE IT) */}
      {activeBoard && (
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
            maxWidth: '1240px',
            maxHeight: '94vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* Top Navigation Bar with Back Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setActiveBoard(null)}
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
                <ChevronLeft size={16} /> Back to Storyboard Studio
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!isEditing ? (
                  <button
                    onClick={handleStartEditing}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '20px',
                      background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)'
                    }}
                  >
                    <Paintbrush size={13} /> Edit Canvas / Paint
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
                    <Save size={13} /> {saveStatus ? 'Saved!' : 'Save Storyboard'}
                  </button>
                )}

                <button
                  onClick={handleExportPng}
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
                  title="Download Canvas PNG"
                >
                  <Download size={13} /> Download
                </button>

                {activeBoard.id && (
                  <button
                    onClick={(e) => handleDelete(activeBoard.id, e)}
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
                    title="Delete storyboard"
                  >
                    <Trash2 size={13} />
                  </button>
                )}

                <button
                  onClick={() => setActiveBoard(null)}
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

            {/* Side-by-Side Container (Left: Canvas Preview/Paint, Right: Discussion/Text Option) */}
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
              {/* LEFT COLUMN: VIEW MODE PREVIEW OR PAINT DRAWING SUITE */}
              <div
                style={{
                  flex: '1.35',
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#ffffff',
                  padding: '22px',
                  borderRight: '1px solid #e2e8f0',
                  overflowY: 'auto',
                  maxHeight: '82vh'
                }}
              >
                {!isEditing ? (
                  /* ─── 3A. VIEW MODE (Read-only High-Res Framed Canvas Preview) ── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Header Details */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          color: '#16a34a',
                          background: '#f0fdf4',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #bbf7d0'
                        }}>
                          Storyboard Canvas
                        </span>
                        <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                          Updated {activeBoard.updated_at ? new Date(activeBoard.updated_at).toLocaleDateString() : 'Today'}
                        </span>
                      </div>

                      <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                        {activeBoard.title}
                      </h2>

                      {/* Created by with small round avatar */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        color: '#7c3aed'
                      }}>
                        <span>Created by</span>
                        <img
                          src={user?.avatar || activeBoard.author_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                          alt="Created by profile"
                          title={activeBoard.created_by || activeBoard.author_name || 'Creator'}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1.5px solid #ddd6fe',
                            background: '#ffffff',
                            display: 'inline-block',
                            flexShrink: 0
                          }}
                        />
                      </div>
                    </div>

                    {/* Attached Reference Reel Chip (if any) */}
                    {(attachedIdea || activeBoard.custom_reel_url) && (
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

                        {(attachedIdea?.reel_url || activeBoard.custom_reel_url) && (
                          <a
                            href={attachedIdea?.reel_url || activeBoard.custom_reel_url}
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
                            <span>Open Reel</span> <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Framed Canvas Display */}
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      minHeight: '440px',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      backgroundColor: '#090d16',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                      border: '1px solid #334155'
                    }}>
                      {activeBoard.canvas_data ? (
                        <img
                          src={activeBoard.canvas_data}
                          alt={activeBoard.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            maxHeight: '520px',
                            objectFit: 'contain',
                            display: 'block',
                            backgroundColor: '#090d16'
                          }}
                        />
                      ) : (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '12px',
                          color: '#94a3b8',
                          padding: '40px 20px',
                          textAlign: 'center'
                        }}>
                          <Paintbrush size={38} color="#64748b" />
                          <p style={{ margin: 0, fontWeight: 700, color: '#f1f5f9' }}>Blank Canvas</p>
                          <p style={{ margin: 0, fontSize: '0.82rem', maxWidth: '300px' }}>
                            Click "Edit Canvas / Paint" above to sketch scenes, draw panels, and add text.
                          </p>
                          <button
                            onClick={handleStartEditing}
                            className="clean-btn-primary"
                            style={{ marginTop: '8px' }}
                          >
                            <Paintbrush size={14} /> Open Paint Tool
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ─── 3B. EDIT MODE (Full Paint Canvas Drawing Suite) ─────── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>
                        Paint & Sketch Mode
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Done / View Mode
                      </button>
                    </div>

                    {/* Title & Attached Reel Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Storyboard Title..."
                        style={{
                          padding: '8px 12px',
                          fontSize: '0.9rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          outline: 'none'
                        }}
                      />
                      <select
                        value={editAttachedReelId}
                        onChange={(e) => setEditAttachedReelId(e.target.value)}
                        style={{
                          padding: '8px 10px',
                          fontSize: '0.84rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          outline: 'none',
                          background: '#ffffff'
                        }}
                      >
                        <option value="">Attach Reference Reel (Optional)</option>
                        {referenceIdeas.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Paint Tools Ribbon */}
                    <div style={{
                      background: '#f8fafc',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '12px',
                      justifyContent: 'space-between'
                    }}>
                      {/* Left: Tool buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        {[
                          { id: 'pencil', label: 'Pencil', icon: <Edit2 size={13} /> },
                          { id: 'brush', label: 'Brush', icon: <Paintbrush size={13} /> },
                          { id: 'eraser', label: 'Eraser', icon: <Eraser size={13} /> },
                          { id: 'line', label: 'Line', icon: <ArrowRight size={13} /> },
                          { id: 'rect', label: 'Rect', icon: <Square size={13} /> },
                          { id: 'circle', label: 'Circle', icon: <Circle size={13} /> },
                          { id: 'arrow', label: 'Arrow', icon: <ArrowRight size={13} /> },
                          { id: 'text', label: 'Text', icon: <Type size={13} /> },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTool(t.id)}
                            style={{
                              padding: '5px 9px',
                              borderRadius: '6px',
                              border: tool === t.id ? '1px solid #16a34a' : '1px solid #e2e8f0',
                              background: tool === t.id ? '#dcfce7' : '#ffffff',
                              color: tool === t.id ? '#15803d' : '#334155',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 700
                            }}
                          >
                            {t.icon}
                            <span>{t.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Undo / Redo / Clear / Image */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={handleUndo}
                          disabled={historyStep <= 0}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            color: historyStep <= 0 ? '#cbd5e1' : '#334155',
                            cursor: historyStep <= 0 ? 'not-allowed' : 'pointer'
                          }}
                          title="Undo"
                        >
                          <RotateCcw size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={handleRedo}
                          disabled={historyStep >= history.length - 1}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            color: historyStep >= history.length - 1 ? '#cbd5e1' : '#334155',
                            cursor: historyStep >= history.length - 1 ? 'not-allowed' : 'pointer'
                          }}
                          title="Redo"
                        >
                          <RotateCw size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={handleClear}
                          style={{
                            padding: '5px 9px',
                            borderRadius: '6px',
                            border: '1px solid #fee2e2',
                            background: '#fff1f2',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            fontWeight: 700
                          }}
                        >
                          Clear
                        </button>

                        <label
                          style={{
                            padding: '5px 9px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            color: '#334155',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700
                          }}
                        >
                          <ImageIcon size={12} /> Add Pic
                          <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                        </label>
                      </div>
                    </div>

                    {/* Color Swatches & Stroke Width */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>Colors:</span>
                        {PAINT_COLORS.slice(0, 12).map((c) => (
                          <div
                            key={c}
                            onClick={() => setColor(c)}
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '4px',
                              backgroundColor: c,
                              cursor: 'pointer',
                              border: color === c ? '2px solid #0f172a' : '1px solid #cbd5e1',
                              boxShadow: color === c ? '0 0 0 2px rgba(22, 163, 74, 0.4)' : 'none',
                              transform: color === c ? 'scale(1.15)' : 'none',
                              transition: 'transform 0.1s'
                            }}
                          />
                        ))}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>Size:</span>
                        <input
                          type="range"
                          min="1"
                          max="16"
                          value={lineWidth}
                          onChange={(e) => setLineWidth(Number(e.target.value))}
                          style={{ width: '80px', accentColor: '#16a34a' }}
                        />
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', width: '16px' }}>{lineWidth}px</span>
                      </div>
                    </div>

                    {/* Interactive Canvas Frame */}
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '2px solid #cbd5e1',
                      background: '#ffffff',
                      boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.05)'
                    }}>
                      <canvas
                        ref={canvasRef}
                        width={840}
                        height={480}
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block',
                          cursor: tool === 'eraser' ? 'cell' : 'crosshair',
                          touchAction: 'none',
                          backgroundColor: '#ffffff'
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <button
                        onClick={handleSave}
                        className="clean-btn-primary"
                        style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}
                      >
                        <Save size={16} /> {saveStatus ? 'Saved!' : 'Save Storyboard'}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="clean-btn-secondary"
                        style={{ padding: '10px 18px' }}
                      >
                        Done / View Mode
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
                      Storyboard Scene Discussion
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Shot directions & feedback for {activeBoard.title} ({comments.length} notes)
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
                      <p style={{ fontSize: '0.84rem', margin: 0, fontWeight: 600 }}>No scene notes yet</p>
                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, maxWidth: '240px' }}>
                        Discuss camera angles, pacing, and visual cut points below.
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
                              background: isMe ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' : '#ffffff',
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
                    placeholder="Add camera direction, shot timing, or note..."
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
                      background: messageInput.trim() ? '#16a34a' : '#e2e8f0',
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

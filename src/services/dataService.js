import { supabase } from './supabase';
import { activityTracker } from './activityTracker';
import {
  THROTTLE_PROJECT,
  THROTTLE_BACKSTAGE_PROJECT,
  SEED_REFERENCE_IDEAS,
  SEED_IDEA_COMMENTS,
  SEED_SCRIPTS,
  SEED_SCRIPT_COMMENTS,
  SEED_STORYBOARDS,
  SEED_STORYBOARD_COMMENTS
} from './seedData';

const LOCAL_STORAGE_KEY = 'insta_creator_dashboard_data_v10';

// Clear previous storage keys
try {
  for (let i = 1; i <= 9; i++) {
    localStorage.removeItem(`insta_creator_dashboard_data_v${i}`);
  }
} catch (e) {
  // Ignore in non-browser env
}

// Clean initial state with user's accounts and clean creative studio canvases
const INITIAL_SEED = {
  projects: [THROTTLE_PROJECT, THROTTLE_BACKSTAGE_PROJECT],
  reference_ideas: [],
  idea_comments: [],
  scripts: [],
  script_comments: [],
  storyboards: [],
  storyboard_comments: []
};

const SEED_ACCOUNT_IDS = ['proj-1', 'proj-2'];
const SEED_ACCOUNT_HANDLES = ['apexfitness_media', 'cybernomad.ai'];

const KNOWN_EXACT_PROFILES = {};

function sanitizeBio(b) {
  if (!b) return '';
  const lower = b.toLowerCase();
  const junkWords = ['meta', 'about', 'blog', 'jobs', 'help', 'api', 'privacy', 'terms', 'threads', 'popular', 'instagram lite', 'meta ai'];
  if (junkWords.filter(w => lower.includes(w)).length >= 2 || lower.includes('meta about blog')) {
    return '';
  }
  return b;
}

function normalizeProject(p) {
  if (!p) return p;
  const handle = (p.insta_handle || '').toLowerCase().replace(/^@/, '');
  let updated = { ...p };
  if (KNOWN_EXACT_PROFILES[handle]) {
    updated = { ...updated, ...KNOWN_EXACT_PROFILES[handle] };
  }
  if (updated.avatar_url && (updated.avatar_url.includes('rsrc.php') || updated.avatar_url.includes('static.cdninstagram.com') || updated.avatar_url.includes('R0fBIMurK8v'))) {
    updated.avatar_url = '';
  }
  updated.bio = sanitizeBio(updated.bio);
  return updated;
}

function filterOutSeedAccounts(projectsList) {
  if (!Array.isArray(projectsList)) return [];
  return projectsList
    .filter(p => {
      if (!p) return false;
      if (SEED_ACCOUNT_IDS.includes(p.id)) return false;
      const handle = (p.insta_handle || '').toLowerCase().replace(/^@/, '');
      if (SEED_ACCOUNT_HANDLES.includes(handle)) return false;
      return true;
    })
    .map(normalizeProject);
}

function getLocalData() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SEED));
      return INITIAL_SEED;
    }
    const parsed = JSON.parse(raw);
    parsed.projects = filterOutSeedAccounts(parsed.projects);

    if (!parsed.reference_ideas || !Array.isArray(parsed.reference_ideas)) {
      parsed.reference_ideas = [];
    }

    if (!parsed.idea_comments || !Array.isArray(parsed.idea_comments)) {
      parsed.idea_comments = [];
    }

    if (!parsed.scripts || !Array.isArray(parsed.scripts)) {
      parsed.scripts = [];
    }

    if (!parsed.script_comments || !Array.isArray(parsed.script_comments)) {
      parsed.script_comments = [];
    }

    if (!parsed.storyboards || !Array.isArray(parsed.storyboards)) {
      parsed.storyboards = [];
    }

    if (!parsed.storyboard_comments || !Array.isArray(parsed.storyboard_comments)) {
      parsed.storyboard_comments = [];
    }

    if (!parsed.projects || parsed.projects.length === 0) {
      parsed.projects = [THROTTLE_PROJECT, THROTTLE_BACKSTAGE_PROJECT];
    } else {
      parsed.projects = parsed.projects.map(normalizeProject);
    }

    return parsed;
  } catch (err) {
    console.error('Local storage read error:', err);
    return INITIAL_SEED;
  }
}

function saveLocalData(data) {
  try {
    if (data && data.projects) {
      data.projects = filterOutSeedAccounts(data.projects);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Local storage save error:', err);
  }
}

export const dataService = {
  getKnownProfile(handle) {
    if (!handle) return null;
    const h = String(handle).toLowerCase().replace(/^@/, '');
    return KNOWN_EXACT_PROFILES[h] || null;
  },

  async getProjects(userEmail = null) {
    let list = [];
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        list = data.map(p => ({
          ...p,
          posts_count: p.posts_count || '0',
          followers_count: p.followers_count || '0',
          following_count: p.following_count || '0'
        }));
      } else {
        const local = getLocalData();
        list = local.projects;
      }
    } catch (e) {
      const local = getLocalData();
      list = local.projects;
    }

    let filtered = filterOutSeedAccounts(list);
    const hasThrottle = filtered.some(p => (p.insta_handle || '').toLowerCase().includes('demo.creator'));
    if (!hasThrottle) {
      filtered.unshift(THROTTLE_PROJECT);
    }
    const hasBackstage = filtered.some(p => (p.insta_handle || '').toLowerCase().includes('demo.studio'));
    if (!hasBackstage) {
      filtered.push(THROTTLE_BACKSTAGE_PROJECT);
    }

    const local = getLocalData();
    local.projects = filtered;
    saveLocalData(local);

    // Visible to everyone by default. If admin explicitly restricted this user, filter to permitted accounts:
    if (userEmail) {
      filtered = filtered.filter(p => activityTracker.isProjectAllowed(userEmail, p.insta_handle));
    }

    return filtered;
  },

  async createProject(projectData) {
    const cleanHandle = (projectData.insta_handle || projectData.name || '').toLowerCase().replace(/^@/, '').trim();
    const known = this.getKnownProfile(cleanHandle);

    const newProject = {
      id: 'proj-' + Date.now(),
      name: projectData.name || known?.name || cleanHandle,
      insta_handle: cleanHandle,
      insta_url: projectData.insta_url || known?.insta_url || `https://www.instagram.com/${cleanHandle}/`,
      bio: sanitizeBio(projectData.bio !== undefined ? projectData.bio : (known?.bio || '')),
      avatar_url: projectData.avatar_url !== undefined ? projectData.avatar_url : (known?.avatar_url || ''),
      followers_count: projectData.followers_count !== undefined ? String(projectData.followers_count) : (known?.followers_count || '0'),
      followers_numeric: parseInt(String(projectData.followers_count || '0').replace(/,/g, ''), 10) || 0,
      following_count: projectData.following_count !== undefined ? String(projectData.following_count) : (known?.following_count || '0'),
      posts_count: projectData.posts_count !== undefined ? String(projectData.posts_count) : (known?.posts_count || '0'),
      category: projectData.category || known?.category || 'Content Creator',
      attached_profiles: [
        { name: 'Demo Creator', role: 'Account Lead', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }
      ],
      browser_sections: [
        { id: 'sec-main', label: 'Primary Chrome Profile', user: cleanHandle, active: true, cookiesSaved: true }
      ],
      created_at: new Date().toISOString()
    };

    try {
      await supabase.from('projects').insert([newProject]).select();
    } catch (e) {
      console.warn('Supabase createProject failed, saving locally:', e);
    }

    const local = getLocalData();
    local.projects = [newProject, ...(local.projects || []).filter(p => (p.insta_handle || '').toLowerCase() !== cleanHandle)];
    saveLocalData(local);
    return newProject;
  },

  async deleteProject(projectId) {
    try {
      const local = getLocalData();
      const item = (local.projects || []).find(p => p.id === projectId);
      await supabase.from('projects').delete().eq('id', projectId);
      if (item) {
        await supabase.from('reference_ideas').delete().eq('project_id', item.id);
        await supabase.from('scripts').delete().eq('project_id', item.id);
        await supabase.from('storyboards').delete().eq('project_id', item.id);
      }
    } catch (e) {
      console.warn('Supabase delete project error:', e);
    }
    const local = getLocalData();
    local.projects = (local.projects || []).filter(p => p.id !== projectId);
    saveLocalData(local);
  },

  async updateProject(projectId, updates) {
    try {
      await supabase.from('projects').update(updates).eq('id', projectId);
    } catch (e) {
      console.warn('Supabase update project error:', e);
    }
    const local = getLocalData();
    const idx = local.projects.findIndex(p => p.id === projectId);
    if (idx !== -1) {
      local.projects[idx] = { ...local.projects[idx], ...updates };
      saveLocalData(local);
    }
  },

  // ─── REFERENCE IDEAS (Visible to everyone across all accounts) ────────────
  async getReferenceIdeas(projectId = null, sortOrder = 'oldest') {
    let list = [];
    const local = getLocalData();
    let all = local.reference_ideas || [];

    try {
      const { data, error } = await supabase
        .from('reference_ideas')
        .select('*')
        .order('created_at', { ascending: sortOrder === 'oldest' });

      if (!error && data && data.length > 0) {
        const ids = new Set(data.map(d => d.id));
        all = [...data, ...all.filter(l => !ids.has(l.id))];
      }
    } catch (e) {
      // fallback
    }

    list = all.map(item => {
      if ((item.shortcode === 'demo-shortcode-3' || item.id === 'ref-bike-night' || item.id === 'ref-bike-edit') && !item.video_url) {
        return {
          ...item,
          video_url: ''
        };
      }
      return item;
    });

    return list.sort((a, b) => {
      return sortOrder === 'oldest'
        ? new Date(a.created_at) - new Date(b.created_at)
        : new Date(b.created_at) - new Date(a.created_at);
    });
  },

  async addReferenceIdea(ideaData) {
    const isImage = ideaData.type === 'image' || Boolean(ideaData.image_url);
    const reelUrl = (ideaData.reel_url || '').trim();
    const shortcodeMatch = reelUrl.match(/instagram\.com\/(?:[A-Za-z0-9._-]+\/)?(?:reel|reels|p)\/([A-Za-z0-9_-]+)/i);
    const shortcode = shortcodeMatch ? shortcodeMatch[1] : (ideaData.shortcode || '');
    const isPost = reelUrl.includes('/p/');
    const defaultEmbedUrl = shortcode
      ? (isPost ? `https://www.instagram.com/p/${shortcode}/embed/` : `https://www.instagram.com/reel/${shortcode}/embed/`)
      : reelUrl;

    const newIdea = {
      id: 'ref-' + Date.now(),
      project_id: ideaData.project_id || 'proj-throttle',
      title: ideaData.title || (isImage ? 'Reference Image' : 'Reference Reel'),
      type: isImage ? 'image' : 'reel',
      reel_url: isImage ? '' : reelUrl,
      video_url: isImage ? '' : (ideaData.video_url || ''),
      embed_url: isImage ? '' : (ideaData.embed_url || defaultEmbedUrl),
      shortcode: isImage ? '' : shortcode,
      image_url: isImage ? (ideaData.image_url || ideaData.thumbnail_url || '') : '',
      thumbnail_url: ideaData.thumbnail_url || (isImage ? ideaData.image_url : ''),
      likes_count: 0,
      dislikes_count: 0,
      user_liked: false,
      user_disliked: false,
      added_by_name: ideaData.added_by_name || 'Demo Creator',
      added_by_avatar: ideaData.added_by_avatar || '',
      created_at: new Date().toISOString()
    };

    try {
      await supabase.from('reference_ideas').insert([{
        id: newIdea.id,
        project_id: newIdea.project_id,
        title: newIdea.title,
        reel_url: newIdea.reel_url || newIdea.image_url || 'https://instagram.com',
        added_by_name: newIdea.added_by_name
      }]).select();
    } catch (e) {
      console.warn('Supabase addReferenceIdea failed, saving locally:', e);
    }

    const local = getLocalData();
    local.reference_ideas.unshift(newIdea);
    saveLocalData(local);
    return newIdea;
  },

  async updateReferenceIdeaVideo(ideaId, videoUrl, thumbnailUrl = '') {
    const local = getLocalData();
    const item = (local.reference_ideas || []).find(i => i.id === ideaId);
    if (item) {
      if (videoUrl) item.video_url = videoUrl;
      if (thumbnailUrl && !item.thumbnail_url) item.thumbnail_url = thumbnailUrl;
      saveLocalData(local);
    }
    return item;
  },

  async deleteReferenceIdea(ideaId) {
    try {
      await supabase.from('reference_ideas').delete().eq('id', ideaId);
      await supabase.from('idea_comments').delete().eq('idea_id', ideaId);
    } catch (e) {
      console.warn('Supabase delete idea:', e);
    }
    const local = getLocalData();
    local.reference_ideas = (local.reference_ideas || []).filter(i => i.id !== ideaId);
    local.idea_comments = (local.idea_comments || []).filter(c => c.idea_id !== ideaId);
    saveLocalData(local);
  },

  async clearAllReferenceIdeas(projectId = null) {
    const local = getLocalData();
    local.reference_ideas = [];
    local.idea_comments = [];
    saveLocalData(local);

    try {
      await supabase.from('idea_comments').delete().neq('created_at', '1970-01-01T00:00:00Z');
      await supabase.from('reference_ideas').delete().neq('created_at', '1970-01-01T00:00:00Z');
    } catch (e) {
      console.warn('Supabase clear reference ideas error:', e);
    }
  },

  async clearAllCreativeContent() {
    const local = getLocalData();
    local.reference_ideas = [];
    local.idea_comments = [];
    local.scripts = [];
    local.script_comments = [];
    local.storyboards = [];
    local.storyboard_comments = [];
    saveLocalData(local);

    try {
      await supabase.from('storyboard_comments').delete().neq('created_at', '1970-01-01T00:00:00Z');
      await supabase.from('storyboards').delete().neq('created_at', '1970-01-01T00:00:00Z');
      await supabase.from('script_comments').delete().neq('created_at', '1970-01-01T00:00:00Z');
      await supabase.from('scripts').delete().neq('created_at', '1970-01-01T00:00:00Z');
      await supabase.from('idea_comments').delete().neq('created_at', '1970-01-01T00:00:00Z');
      await supabase.from('reference_ideas').delete().neq('created_at', '1970-01-01T00:00:00Z');
    } catch (e) {
      console.warn('Supabase clear all creative content error:', e);
    }
  },

  async toggleLikeReferenceIdea(ideaId) {
    const local = getLocalData();
    const item = (local.reference_ideas || []).find(i => i.id === ideaId);
    if (!item) return null;

    if (item.user_liked) {
      item.user_liked = false;
      item.likes_count = Math.max(0, (item.likes_count || 1) - 1);
    } else {
      item.user_liked = true;
      item.likes_count = (item.likes_count || 0) + 1;
      if (item.user_disliked) {
        item.user_disliked = false;
        item.dislikes_count = Math.max(0, (item.dislikes_count || 1) - 1);
      }
    }
    saveLocalData(local);
    return {
      likes_count: item.likes_count,
      dislikes_count: item.dislikes_count,
      user_liked: item.user_liked,
      user_disliked: item.user_disliked
    };
  },

  async toggleDislikeReferenceIdea(ideaId) {
    const local = getLocalData();
    const item = (local.reference_ideas || []).find(i => i.id === ideaId);
    if (!item) return null;

    if (item.user_disliked) {
      item.user_disliked = false;
      item.dislikes_count = Math.max(0, (item.dislikes_count || 1) - 1);
    } else {
      item.user_disliked = true;
      item.dislikes_count = (item.dislikes_count || 0) + 1;
      if (item.user_liked) {
        item.user_liked = false;
        item.likes_count = Math.max(0, (item.likes_count || 1) - 1);
      }
    }
    saveLocalData(local);
    return {
      likes_count: item.likes_count,
      dislikes_count: item.dislikes_count,
      user_liked: item.user_liked,
      user_disliked: item.user_disliked
    };
  },

  // ─── REFERENCE DISCUSSION / COMMENTS ─────────────────────────────────────
  async getComments(ideaId) {
    if (!ideaId) return [];
    let list = [];
    try {
      const { data, error } = await supabase
        .from('idea_comments')
        .select('*')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        list = data;
      } else {
        const local = getLocalData();
        list = (local.idea_comments || []).filter(c => c.idea_id === ideaId);
      }
    } catch (e) {
      const local = getLocalData();
      list = (local.idea_comments || []).filter(c => c.idea_id === ideaId);
    }
    return list;
  },

  async addComment(commentData) {
    const newComment = {
      id: 'comm-' + Date.now(),
      idea_id: commentData.idea_id,
      user_name: commentData.user_name || 'Demo Creator',
      user_avatar: commentData.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      comment_text: commentData.comment_text,
      is_outgoing: Boolean(commentData.is_outgoing),
      created_at: new Date().toISOString()
    };

    try {
      await supabase.from('idea_comments').insert([newComment]).select();
    } catch (e) {
      console.warn('Supabase addComment failed, saving locally:', e);
    }

    const local = getLocalData();
    local.idea_comments.push(newComment);
    saveLocalData(local);
    return newComment;
  },

  // ─── SCRIPTS STUDIO (Visible to everyone across all accounts) ─────────────
  async getScripts(projectId = null) {
    const local = getLocalData();
    let all = local.scripts || [];
    try {
      const { data, error } = await supabase
        .from('scripts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const ids = new Set(data.map(d => d.id));
        all = [...data, ...all.filter(s => !ids.has(s.id))];
      }
    } catch (e) {
      // fallback
    }
    return all.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  },

  async saveScript(scriptData) {
    const now = new Date().toISOString();
    let saved;

    const local = getLocalData();
    if (scriptData.id) {
      const idx = local.scripts.findIndex(s => s.id === scriptData.id);
      saved = { ...scriptData, updated_at: now };
      if (idx !== -1) {
        local.scripts[idx] = saved;
      } else {
        local.scripts.unshift(saved);
      }
    } else {
      saved = {
        ...scriptData,
        id: 'scr-' + Date.now(),
        created_at: now,
        updated_at: now
      };
      local.scripts.unshift(saved);
    }
    saveLocalData(local);

    try {
      await supabase.from('scripts').upsert([saved]);
    } catch (e) {
      console.warn('Supabase script upsert failed:', e);
    }

    return saved;
  },

  async deleteScript(scriptId) {
    const local = getLocalData();
    local.scripts = local.scripts.filter(s => s.id !== scriptId);
    local.script_comments = (local.script_comments || []).filter(c => c.script_id !== scriptId);
    saveLocalData(local);
    try {
      await supabase.from('scripts').delete().eq('id', scriptId);
    } catch (e) {
      console.warn('Supabase delete script failed:', e);
    }
  },

  async clearAllScripts(projectId = null) {
    const local = getLocalData();
    local.scripts = [];
    local.script_comments = [];
    saveLocalData(local);
    try {
      await supabase.from('script_comments').delete().neq('created_at', '1970-01-01T00:00:00Z');
      await supabase.from('scripts').delete().neq('created_at', '1970-01-01T00:00:00Z');
    } catch (e) {
      console.warn('Supabase clear scripts failed:', e);
    }
  },

  // Script Comments (Discussion Stream)
  async getScriptComments(scriptId) {
    if (!scriptId) return [];
    const local = getLocalData();
    let list = (local.script_comments || []).filter(c => c.script_id === scriptId);
    return list;
  },

  async addScriptComment(commentData) {
    const newComment = {
      id: 'scmsg-' + Date.now(),
      script_id: commentData.script_id,
      user_name: commentData.user_name || 'Demo Creator',
      user_avatar: commentData.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      comment_text: commentData.comment_text,
      is_outgoing: Boolean(commentData.is_outgoing),
      created_at: new Date().toISOString()
    };
    const local = getLocalData();
    if (!local.script_comments) local.script_comments = [];
    local.script_comments.push(newComment);
    saveLocalData(local);

    try {
      await supabase.from('script_comments').insert([newComment]).select();
    } catch (e) {
      // fallback
    }
    return newComment;
  },

  // ─── STORYBOARD STUDIO (Visible to everyone across all accounts) ──────────
  async getStoryboards(projectId = null) {
    const local = getLocalData();
    let all = local.storyboards || [];
    try {
      const { data, error } = await supabase
        .from('storyboards')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const ids = new Set(data.map(d => d.id));
        all = [...data, ...all.filter(b => !ids.has(b.id))];
      }
    } catch (e) {
      // fallback
    }
    return all.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  },

  async saveStoryboard(boardData) {
    const now = new Date().toISOString();
    let saved;

    const local = getLocalData();
    if (boardData.id) {
      const idx = local.storyboards.findIndex(b => b.id === boardData.id);
      saved = { ...boardData, updated_at: now };
      if (idx !== -1) {
        local.storyboards[idx] = saved;
      } else {
        local.storyboards.unshift(saved);
      }
    } else {
      saved = {
        ...boardData,
        id: 'sb-' + Date.now(),
        created_at: now,
        updated_at: now
      };
      local.storyboards.unshift(saved);
    }
    saveLocalData(local);

    try {
      await supabase.from('storyboards').upsert([saved]);
    } catch (e) {
      console.warn('Supabase storyboard upsert failed:', e);
    }

    return saved;
  },

  async deleteStoryboard(boardId) {
    const local = getLocalData();
    local.storyboards = (local.storyboards || []).filter(b => b.id !== boardId);
    local.storyboard_comments = (local.storyboard_comments || []).filter(c => c.board_id !== boardId);
    saveLocalData(local);
    try {
      await supabase.from('storyboards').delete().eq('id', boardId);
    } catch (e) {
      console.warn('Supabase delete storyboard failed:', e);
    }
  },

  async clearAllStoryboards(projectId = null) {
    const local = getLocalData();
    local.storyboards = [];
    local.storyboard_comments = [];
    saveLocalData(local);
    try {
      await supabase.from('storyboard_comments').delete().neq('created_at', '1970-01-01T00:00:00Z');
      await supabase.from('storyboards').delete().neq('created_at', '1970-01-01T00:00:00Z');
    } catch (e) {
      console.warn('Supabase clear storyboards failed:', e);
    }
  },

  // Storyboard Comments (Discussion Stream)
  async getStoryboardComments(boardId) {
    if (!boardId) return [];
    const local = getLocalData();
    let list = (local.storyboard_comments || []).filter(c => c.board_id === boardId);
    return list;
  },

  async addStoryboardComment(commentData) {
    const newComment = {
      id: 'sbmsg-' + Date.now(),
      board_id: commentData.board_id,
      user_name: commentData.user_name || 'Demo Creator',
      user_avatar: commentData.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      comment_text: commentData.comment_text,
      is_outgoing: Boolean(commentData.is_outgoing),
      created_at: new Date().toISOString()
    };
    const local = getLocalData();
    if (!local.storyboard_comments) local.storyboard_comments = [];
    local.storyboard_comments.push(newComment);
    saveLocalData(local);

    try {
      await supabase.from('storyboard_comments').insert([newComment]).select();
    } catch (e) {
      // fallback
    }
    return newComment;
  },

  // ─── PROFILE AVATAR SYNCHRONIZATION ──────────────────────────────────────
  updateUserProfiles(newAvatar, newName) {
    const local = getLocalData();
    if (local.projects && Array.isArray(local.projects)) {
      local.projects.forEach(p => {
        if (p.attached_profiles && Array.isArray(p.attached_profiles)) {
          p.attached_profiles.forEach(ap => {
            if (newAvatar) ap.avatar = newAvatar;
            if (newName && (ap.name === newName || ap.role === 'Account Lead')) {
              ap.name = newName;
            }
          });
        }
      });
    }
    if (local.reference_ideas && Array.isArray(local.reference_ideas)) {
      local.reference_ideas.forEach(idea => {
        if (newAvatar) idea.added_by_avatar = newAvatar;
        if (newName) idea.added_by_name = newName;
      });
    }
    if (local.scripts && Array.isArray(local.scripts)) {
      local.scripts.forEach(s => {
        if (newAvatar) s.author_avatar = newAvatar;
        if (newName) {
          s.scripted_by = newName;
          s.author_name = newName;
        }
      });
    }
    if (local.storyboards && Array.isArray(local.storyboards)) {
      local.storyboards.forEach(b => {
        if (newAvatar) b.author_avatar = newAvatar;
        if (newName) {
          b.created_by = newName;
          b.author_name = newName;
        }
      });
    }
    if (local.idea_comments && Array.isArray(local.idea_comments)) {
      local.idea_comments.forEach(c => {
        if (c.is_outgoing) {
          if (newAvatar) c.user_avatar = newAvatar;
          if (newName) c.user_name = newName;
        }
      });
    }
    if (local.script_comments && Array.isArray(local.script_comments)) {
      local.script_comments.forEach(c => {
        if (c.is_outgoing) {
          if (newAvatar) c.user_avatar = newAvatar;
          if (newName) c.user_name = newName;
        }
      });
    }
    if (local.storyboard_comments && Array.isArray(local.storyboard_comments)) {
      local.storyboard_comments.forEach(c => {
        if (c.is_outgoing) {
          if (newAvatar) c.user_avatar = newAvatar;
          if (newName) c.user_name = newName;
        }
      });
    }
    saveLocalData(local);
  }
};

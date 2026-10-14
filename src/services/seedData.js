// Generic demo records; no personal account data is distributed.
const project = (id, name, handle) => ({
  id, name, insta_handle: handle, insta_url: 'https://www.instagram.com/' + handle + '/',
  bio: 'Sample workspace. Add your own account to retrieve profile information.',
  avatar_url: '', followers_count: '0', followers_numeric: 0, following_count: '0',
  posts_count: '0', category: 'Digital creator', attached_profiles: [], browser_sections: [],
  created_at: new Date().toISOString()
});
export const THROTTLE_PROJECT = project('proj-throttle', 'Demo Creator', 'demo.creator');
export const THROTTLE_BACKSTAGE_PROJECT = project('proj-throttle-backstage', 'Demo Studio', 'demo.studio');
export const SEED_REFERENCE_IDEAS = [];
export const SEED_IDEA_COMMENTS = [];
export const SEED_SCRIPTS = [];
export const SEED_SCRIPT_COMMENTS = [];
export const SEED_STORYBOARDS = [];
export const SEED_STORYBOARD_COMMENTS = [];

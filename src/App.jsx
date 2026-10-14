import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import LoginPage from './components/LoginPage';
import CreateProjectModal from './components/CreateProjectModal';
import ProjectList from './components/ProjectList';
import ProjectDashboard from './components/ProjectDashboard';
import ProfileSettingsPage from './components/ProfileSettingsPage';
import AdminPortal from './components/AdminPortal';
import { dataService } from './services/dataService';
import { activityTracker } from './services/activityTracker';

function cleanHandle(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, '')
    .replace(/\/+$/, '');
}

function parseWorkflowHash(hashStr = window.location.hash) {
  if (!hashStr) return null;
  const clean = hashStr.replace(/^#\/?/, '').replace(/\/+$/, '');
  if (clean === 'profile-settings') return { isProfileSettings: true };
  const parts = clean.split('/').filter(Boolean);
  if (parts[0] === 'workflow-studios' && parts[1]) {
    const handle = cleanHandle(decodeURIComponent(parts[1]));
    const tab = parts[2] ? parts[2].toLowerCase() : null;
    return { handle, tab };
  }
  return null;
}

function checkIsAdminRoute() {
  const p = (window.location.pathname || '').toLowerCase();
  const h = (window.location.hash || '').toLowerCase();
  return p === '/admin' || p === '/admin/' || h === '#admin' || h === '#/admin';
}

function MainApp() {
  const { user, loading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(
    window.location.hash === '#profile-settings'
  );

  // Start background presence and engagement tracking for active user
  useEffect(() => {
    if (user) {
      activityTracker.startTracking(user);
    }
  }, [user]);

  const handleSelectProject = (proj) => {
    setIsProfileSettingsOpen(false);
    setCurrentProject(proj);
    if (proj) {
      const handle = cleanHandle(proj.insta_handle || proj.name);
      activityTracker.setActiveProject(handle);
      activityTracker.logAction(
        'VIEW_PROJECT',
        proj.name || handle,
        `Opened workspace and studios for @${handle}`,
        handle
      );
      const newHash = `#workflow-studios/${handle}`;
      if (window.location.hash !== newHash) {
        window.history.pushState(null, '', newHash);
      }
    } else {
      if (window.location.hash) {
        window.history.pushState(null, '', window.location.pathname);
      }
    }
  };

  const handleOpenProfileSettings = () => {
    setIsProfileSettingsOpen(true);
    activityTracker.logAction('PROFILE_UPDATE', 'Account Profile Settings', 'Accessed profile settings page', 'System');
    if (window.location.hash !== '#profile-settings') {
      window.history.pushState(null, '', '#profile-settings');
    }
  };

  const handleBackFromProfileSettings = () => {
    setIsProfileSettingsOpen(false);
    if (currentProject) {
      const handle = cleanHandle(currentProject.insta_handle || currentProject.name);
      window.history.pushState(null, '', `#workflow-studios/${handle}`);
    } else {
      window.history.pushState(null, '', window.location.pathname);
    }
  };

  // Load projects visible to everyone (filtered by admin permissions if restricted)
  useEffect(() => {
    async function fetchProjects() {
      const list = await dataService.getProjects(user?.email || null);
      setProjects(list);

      const parsedHash = parseWorkflowHash(window.location.hash);
      if (parsedHash?.handle) {
        const matched = list.find(p => cleanHandle(p.insta_handle) === parsedHash.handle || cleanHandle(p.name) === parsedHash.handle);
        if (matched) {
          setCurrentProject(matched);
          activityTracker.setActiveProject(parsedHash.handle);
          return;
        } else {
          // Immediately activate workspace shell for instant display
          const known = dataService.getKnownProfile(parsedHash.handle);
          const initialShell = {
            id: 'proj-' + parsedHash.handle,
            name: known?.name || parsedHash.handle,
            insta_handle: parsedHash.handle,
            insta_url: known?.insta_url || `https://www.instagram.com/${parsedHash.handle}/`,
            bio: known?.bio || '',
            avatar_url: known?.avatar_url || '',
            followers_count: known?.followers_count || '0',
            following_count: known?.following_count || '0',
            posts_count: known?.posts_count || '0'
          };
          setCurrentProject(initialShell);
          setProjects(prev => [initialShell, ...prev]);

          // Fetch live profile info and persist
          try {
            const res = await fetch(`http://localhost:5000/api/instagram/profile-info?query=${parsedHash.handle}&live=true`);
            const json = await res.json();
            const d = json?.data || {};
            const newProj = await dataService.createProject({
              name: d.name || known?.name || parsedHash.handle,
              insta_handle: parsedHash.handle,
              insta_url: `https://www.instagram.com/${parsedHash.handle}/`,
              bio: d.bio !== undefined ? d.bio : (known?.bio || ''),
              avatar_url: d.avatarUrl !== undefined ? d.avatarUrl : (known?.avatar_url || ''),
              followers_count: d.followersCount || known?.followers_count || '0',
              following_count: d.followingCount || known?.following_count || '0',
              posts_count: d.postsCount || known?.posts_count || '0'
            });
            setProjects(prev => [newProj, ...prev.filter(p => p.id !== initialShell.id && cleanHandle(p.insta_handle) !== parsedHash.handle)]);
            setCurrentProject(newProj);
            return;
          } catch (_) {
            const newProj = await dataService.createProject(initialShell);
            setProjects(prev => [newProj, ...prev.filter(p => p.id !== initialShell.id)]);
            setCurrentProject(newProj);
            return;
          }
        }
      }

      // Default: show project list — do NOT auto-redirect to any project
      setCurrentProject(null);
    }
    fetchProjects();
  }, [user?.email]);

  // Listen for browser back/forward or manual address bar hash navigation
  useEffect(() => {
    const onHashChange = async () => {
      const hash = window.location.hash;
      if (hash === '#profile-settings') {
        setIsProfileSettingsOpen(true);
        return;
      } else {
        setIsProfileSettingsOpen(false);
      }

      const parsedHash = parseWorkflowHash(hash);
      if (parsedHash?.handle) {
        const list = await dataService.getProjects(user?.email || null);
        setProjects(list);
        const matched = list.find(p => cleanHandle(p.insta_handle) === parsedHash.handle || cleanHandle(p.name) === parsedHash.handle);
        if (matched) {
          setCurrentProject(matched);
          activityTracker.setActiveProject(parsedHash.handle);
        } else {
          const known = dataService.getKnownProfile(parsedHash.handle);
          const newProj = await dataService.createProject({
            name: known?.name || parsedHash.handle,
            insta_handle: parsedHash.handle,
            insta_url: known?.insta_url || `https://www.instagram.com/${parsedHash.handle}/`,
            bio: known?.bio || '',
            avatar_url: known?.avatar_url || '',
            followers_count: known?.followers_count || '0',
            following_count: known?.following_count || '0',
            posts_count: known?.posts_count || '0'
          });
          setProjects(prev => [newProj, ...prev.filter(p => cleanHandle(p.insta_handle) !== parsedHash.handle)]);
          setCurrentProject(newProj);
          activityTracker.setActiveProject(parsedHash.handle);
        }
      } else {
        setCurrentProject(null);
      }
    };

    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('popstate', onHashChange);
    };
  }, [user?.email]);

  const handleCreateProject = async (projectData) => {
    const newProj = await dataService.createProject(projectData);
    setProjects(prev => [newProj, ...prev]);
    setIsCreateModalOpen(false);
    activityTracker.logAction(
      'CREATE_PROJECT',
      newProj.name || newProj.insta_handle,
      `Created and added new Instagram account @${newProj.insta_handle}`,
      newProj.insta_handle
    );
    handleSelectProject(newProj);
  };

  const handleDeleteProject = async (projectId) => {
    const toDelete = projects.find(p => p.id === projectId);
    await dataService.deleteProject(projectId);
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (toDelete) {
      activityTracker.logAction(
        'demo-shortcode',
        toDelete.name || toDelete.insta_handle,
        `Removed project @${toDelete.insta_handle}`,
        toDelete.insta_handle
      );
    }
    if (currentProject?.id === projectId) {
      handleSelectProject(null);
    }
  };

  // Show login page if user not authenticated
  if (!loading && !user) {
    return <LoginPage />;
  }

  // Loading spinner while checking initial user session
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        color: '#64748b',
        fontSize: '0.95rem',
        fontWeight: 600,
        gap: '10px'
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          border: '2.5px solid #e2e8f0',
          borderTopColor: '#e1306c',
          animation: 'spin 0.8s linear infinite'
        }} />
        Loading InstaCreator OS...
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      {/* Top Main Navigation Bar (NO BUTTONS OR LINKS TO /admin) */}
      <Navbar
        projects={projects}
        currentProject={currentProject}
        onSelectProject={handleSelectProject}
        onOpenNewProject={() => setIsCreateModalOpen(true)}
        onOpenProfileSettings={handleOpenProfileSettings}
        isProfileSettingsActive={isProfileSettingsOpen}
      />

      {/* Main Workspace Body */}
      <main className="app-main-content" style={{ flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        {isProfileSettingsOpen ? (
          <ProfileSettingsPage
            onBack={handleBackFromProfileSettings}
            projects={projects}
            onSelectProject={(proj) => {
              setIsProfileSettingsOpen(false);
              handleSelectProject(proj);
            }}
          />
        ) : currentProject ? (
          <ProjectDashboard
            project={currentProject}
            onBackToProjects={() => handleSelectProject(null)}
            onDeleteProject={handleDeleteProject}
          />
        ) : (
          <ProjectList
            projects={projects}
            onSelectProject={handleSelectProject}
            onOpenCreateProject={() => setIsCreateModalOpen(true)}
            onDeleteProject={handleDeleteProject}
          />
        )}
      </main>

      {/* Create Instagram Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(checkIsAdminRoute);

  useEffect(() => {
    const handler = () => {
      setIsAdminRoute(checkIsAdminRoute());
    };
    window.addEventListener('popstate', handler);
    window.addEventListener('hashchange', handler);
    return () => {
      window.removeEventListener('popstate', handler);
      window.removeEventListener('hashchange', handler);
    };
  }, []);

  // ONLY ACCESSIBLE BY DIRECT LINK: http://localhost:5173/admin (no buttons in UI)
  if (isAdminRoute) {
    return <AdminPortal />;
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </AuthProvider>
  );
}

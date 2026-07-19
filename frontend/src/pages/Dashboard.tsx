import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, createProject, renameProject, duplicateProject, deleteProject } from '../services/project';
import { logout } from '../services/auth';
import type { Project } from '../types';
import {
  Folder, Plus, Edit3, Copy, Trash2, Calendar,
  ArrowRight, Database, FolderHeart
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProjectsList = async () => {
    setLoading(true);
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsList();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameInput = newProjectName.trim();
    if (!nameInput) return;

    if (projects.some((p) => p.name.toLowerCase() === nameInput.toLowerCase())) {
      alert(`A project named "${nameInput}" already exists. Please choose a unique name!`);
      return;
    }

    try {
      const proj = await createProject(nameInput);
      setNewProjectName('');
      navigate(`/designer/${proj.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create project.');
    }
  };

  const handleRename = async (id: number, currentName: string) => {
    const newName = prompt('Enter new project name:', currentName);
    if (!newName || !newName.trim()) return;

    const trimmedNewName = newName.trim();
    if (trimmedNewName === currentName) return;

    if (projects.some((p) => p.name.toLowerCase() === trimmedNewName.toLowerCase() && p.id !== id)) {
      alert(`A project named "${trimmedNewName}" already exists. Please choose a unique name!`);
      return;
    }

    try {
      await renameProject(id, trimmedNewName);
      fetchProjectsList();
    } catch (err: any) {
      alert(err.message || 'Failed to rename project.');
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await duplicateProject(id);
      fetchProjectsList();
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate project.');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;

    try {
      await deleteProject(id);
      fetchProjectsList();
    } catch (err: any) {
      alert(err.message || 'Failed to delete project.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col select-none">
      {/* Dashboard Top Header */}
      <header 
        className="h-16 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-4 sm:px-8"
        data-aos="fade-down"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md flex items-center justify-center">
            <Database size={15} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg text-white tracking-wide">
            DrawSchema
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 hidden sm:inline">
            Welcome, <strong className="text-slate-200">{localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).name : 'Developer'}</strong>
          </span>
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-8 space-y-8">
        {/* Top welcome/creation bar */}
        <div 
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-800/40 border border-slate-800/80 rounded-2xl backdrop-blur"
          data-aos="fade-up"
        >
          <div className="space-y-1">
            <h2 className="text-xl font-bold">Your Diagrams</h2>
            <p className="text-xs text-slate-400">Create a new schema canvas or pick an existing project to edit</p>
          </div>

          <form onSubmit={handleCreateProject} className="flex gap-2">
            <input
              required
              type="text"
              placeholder="Project name..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="px-4 py-2 bg-slate-900 border border-slate-750 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-500 w-52 md:w-64"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-1.5 flex-shrink-0"
              title="Create new project"
            >
              <Plus size={16} className="flex-shrink-0" />
              <span className="hidden min-[400px]:inline">New Project</span>
            </button>
          </form>
        </div>

        {error && (
          <div className="p-4 bg-red-500/15 border border-red-500/30 text-red-400 text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-500 text-sm flex flex-col items-center gap-3">
            <Database size={28} className="animate-bounce text-indigo-500" />
            <span>Loading your projects...</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-2xl p-16 text-center text-slate-500 flex flex-col items-center gap-3 bg-slate-850/10">
            <FolderHeart size={36} className="text-slate-650" />
            <h3 className="font-semibold text-slate-400 text-sm">No Projects Found</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              You haven't designed any database schema yet. Type a name above and click "New Project" to start!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj, index) => (
              <div
                key={proj.id}
                onClick={() => navigate(`/designer/${proj.id}`)}
                className="group relative bg-slate-800/30 border border-slate-800 hover:border-indigo-650 hover:bg-slate-800/60 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-md hover:shadow-indigo-550/5"
                data-aos="fade-up"
                data-aos-delay={index * 50}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 bg-slate-800 rounded-xl group-hover:bg-indigo-600/10 group-hover:text-indigo-400 transition-colors">
                      <Folder size={18} className="text-slate-400 group-hover:text-indigo-400" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono group-hover:text-indigo-400/80 flex items-center gap-1 transition-colors">
                      Open Canvas
                      <ArrowRight size={10} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-100 group-hover:text-indigo-350 transition truncate">
                    {proj.name}
                  </h3>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-850 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Calendar size={11} />
                    <span>Edited {new Date(proj.updated_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleRename(proj.id, proj.name)}
                      title="Rename Project"
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(proj.id)}
                      title="Duplicate Project"
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(proj.id, proj.name)}
                      title="Delete Project"
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded transition"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

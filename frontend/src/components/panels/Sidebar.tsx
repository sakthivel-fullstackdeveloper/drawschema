import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchemaStore } from '../../store/schemaStore';
import { Search, Plus, Table as TableIcon, LogOut, Folder, ChevronDown, X, ArrowRight } from 'lucide-react';
import { logout } from '../../services/auth';
import { getProjects } from '../../services/project';
import type { Project } from '../../types';

interface SidebarProps {
  onBackToProjects: () => void;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onBackToProjects, onClose }) => {
  const {
    tables,
    addTable,
    selectElement,
    searchTerm,
    setSearchTerm,
    currentProject,
    selectedTableIds,
    toggleSelectTable,
    clearSelectedTables
  } = useSchemaStore();

  const navigate = useNavigate();
  const [newTableName, setNewTableName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectsDropdown, setShowProjectsDropdown] = useState(false);

  useEffect(() => {
    getProjects()
      .then((data) => setProjects(data))
      .catch((err) => console.error('Failed to load projects for switcher:', err));
  }, []);

  const handleSwitchProject = (id: number) => {
    setShowProjectsDropdown(false);
    navigate(`/designer/${id}`);
  };

  const filteredTables = React.useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      return [...tables].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return [...tables]
      .filter((t) => t.name.toLowerCase().includes(term))
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        const aStarts = aName.startsWith(term);
        const bStarts = bName.startsWith(term);
        
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        return aName.localeCompare(bName);
      });
  }, [tables, searchTerm]);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    try {
      await addTable(newTableName.trim());
      setNewTableName('');
      setIsCreating(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create table.');
    }
  };

  const handleTableClick = (tableId: number) => {
    selectElement('table', tableId);
  };

  return (
    <div className="w-64 h-full border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col select-none">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 flex items-center gap-2 relative">
        {/* Project Selector Indicator */}
        <div className="flex-1 relative">
          <div
            onClick={() => setShowProjectsDropdown(!showProjectsDropdown)}
            title="Switch Projects"
            className="flex items-center justify-between px-3 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded-lg cursor-pointer transition text-xs font-semibold shadow border border-transparent truncate"
          >
            <div className="flex items-center gap-2 truncate">
              <Folder size={14} className="text-indigo-100 dark:text-indigo-200" />
              <span className="truncate">{currentProject?.name || 'Loading project...'}</span>
            </div>
            <ChevronDown size={14} className="text-indigo-100 dark:text-indigo-200 flex-shrink-0" strokeWidth={2.5} />
          </div>

          {showProjectsDropdown && (
            <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl py-1 z-[999] animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="max-h-[135px] overflow-y-auto pr-0.5">
                {projects
                  .filter((p) => p.id !== currentProject?.id)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSwitchProject(p.id)}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition"
                    >
                      <Folder size={12} className="text-slate-450 dark:text-slate-500" />
                      <span className="truncate font-medium">{p.name}</span>
                    </button>
                  ))}
                {projects.filter((p) => p.id !== currentProject?.id).length === 0 && (
                  <div className="px-3 py-2 text-[10px] text-slate-400 dark:text-slate-500 italic text-center">
                    No other projects
                  </div>
                )}
              </div>
              <div className="h-[1px] bg-slate-150 dark:bg-slate-800 my-1" />
              <button
                onClick={() => {
                  setShowProjectsDropdown(false);
                  onBackToProjects();
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 font-bold transition"
              >
                <ArrowRight size={12} className="text-slate-450 dark:text-slate-500" />
                Back to Dashboard
              </button>
            </div>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition min-[1101px]:hidden flex-shrink-0"
            title="Close Sidebar Menu"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Search Input Filter */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={13} />
          <input
            type="text"
            placeholder="Filter tables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/80 rounded-lg focus:outline-none focus:bg-white focus:dark:bg-slate-800 focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 transition-all duration-150"
          />
        </div>
      </div>

      {/* Tables Section Header */}
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Tables ({filteredTables.length})
          </span>
          {selectedTableIds.length > 0 && (
            <span className="text-[9px] font-bold bg-indigo-55/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">
              {selectedTableIds.length} focused
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedTableIds.length > 0 && (
            <button
              onClick={() => clearSelectedTables()}
              title="Show all tables"
              className="text-[9px] font-extrabold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition underline underline-offset-2 decoration-1 mr-1.5"
            >
              Clear Focus
            </button>
          )}
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              title="Create new table"
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-850 rounded text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition"
            >
              <Plus size={13} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Tables List / Content Area */}
      <div className="flex-1 overflow-y-auto">
        {isCreating && (
          <form 
            onSubmit={handleCreateTable} 
            className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 space-y-3 border-l-4 border-l-indigo-600 animate-in slide-in-from-top-1 duration-150"
          >
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Table Name
              </label>
              <input
                type="text"
                placeholder="e.g. customers, products..."
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all font-medium"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setIsCreating(false); setNewTableName(''); }}
                className="px-3.5 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-md shadow-indigo-600/10"
              >
                Create
              </button>
            </div>
          </form>
        )}

        <div className="p-3">
          {filteredTables.length === 0 ? (
            <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-4 italic">
              {searchTerm ? 'No tables match search' : 'No tables yet'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTables.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleTableClick(t.id)}
                  className={`flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg cursor-pointer transition text-xs group ${
                    selectedTableIds.includes(t.id) 
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-750 dark:text-indigo-300 font-semibold' 
                      : 'text-slate-700 dark:text-slate-350'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTableIds.includes(t.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelectTable(t.id);
                    }}
                    className="w-3.5 h-3.5 text-indigo-600 border-slate-300 dark:border-slate-750 rounded focus:ring-indigo-500/20 cursor-pointer accent-indigo-600 flex-shrink-0"
                  />
                  <TableIcon size={13} className={`${selectedTableIds.includes(t.id) ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} flex-shrink-0`} />
                  <span className="truncate flex-1 font-medium group-hover:text-indigo-950 dark:group-hover:text-white transition-colors">{t.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-mono">
                    {t.columns.length}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 mt-auto bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
        <div className="flex flex-col truncate">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Logged in as</span>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
            {localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).name : 'Developer'}
          </span>
        </div>
        <button
          onClick={logout}
          className="p-1.5 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-md transition"
          title="Logout"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
};

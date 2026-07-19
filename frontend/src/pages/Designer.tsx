import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSchemaStore } from '../store/schemaStore';
import { Sidebar } from '../components/panels/Sidebar';
import { Toolbar } from '../components/panels/Toolbar';
import { PropertiesPanel } from '../components/panels/PropertiesPanel';
import { DesignerCanvas } from '../components/canvas/DesignerCanvas';
import { ReactFlowProvider } from '@xyflow/react';
import { VersionHistoryDrawer } from '../components/panels/VersionHistoryDrawer';
import { getProject } from '../services/project';
import * as versionApi from '../services/version';
import type { Project } from '../types';
import { CheckCircle, AlertCircle, Info, RefreshCw } from 'lucide-react';

export const Designer: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const projId = parseInt(projectId || '0', 10);

  const {
    loadSchema,
    setProject,
    toast,
    showToast,
    hideToast,
    isPreviewMode,
    previewVersionId,
    versions,
    exitPreview,
    restoreVersion,
    saveVersion,
    selectedElement,
    isSaving,
    importProgress
  } = useSchemaStore();

  const [project, setLocalProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1100);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1100) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const projData = await getProject(projId);
        setLocalProject(projData);
        setProject(projData);
        await loadSchema(projId);
      } catch (err) {
        console.error('Failed to load project schema:', err);
        alert('Failed to load project schema. Returning to dashboard.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    if (projId) {
      load();
    }
  }, [projId, loadSchema, setProject, navigate]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        hideToast();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, hideToast]);

  // 30-minute auto-save timer loop
  useEffect(() => {
    if (!project) return;
    const interval = setInterval(() => {
      const state = useSchemaStore.getState();
      if (state.isPreviewMode) return;

      const timestamp = new Date().toLocaleTimeString();
      showToast('Creating background auto-save checkpoint...', 'info');
      versionApi
        .createVersion(
          project.id,
          'Auto-save Version',
          `Automatically saved background checkpoint at ${timestamp}`,
          true
        )
        .then(() => {
          const s = useSchemaStore.getState();
          s.loadVersions(1, 20, 'all');
        })
        .catch((err) => console.error('Failed background autosave snapshot:', err));
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [project, showToast]);



  const handleConfirmRestore = async () => {
    if (!previewVersionId) return;
    const ver = versions.find((v) => v.id === previewVersionId);
    const numStr = ver ? `v${ver.version_number}` : '';
    if (
      window.confirm(
        `Are you sure you want to restore ${numStr}? This will overwrite your current workspace tables, but a backup of your current state will be created automatically.`
      )
    ) {
      try {
        await restoreVersion(previewVersionId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold">Loading designer canvas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      {/* Top Toolbar */}
      <Toolbar 
        onOpenVersions={() => setIsVersionsOpen(!isVersionsOpen)} 
        onSaveVersionClick={() => setIsSaveModalOpen(true)} 
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main workspace layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Backdrop overlay for closing floating sidebar on mobile click */}
        {isSidebarOpen && window.innerWidth <= 1100 && (
          <div 
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40 min-[1101px]:hidden"
          />
        )}

        {/* Left Navigator Sidebar Wrapper */}
        <div 
          className={`h-full border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col select-none transition-all duration-300 min-[1101px]:relative max-[1100px]:absolute max-[1100px]:left-0 max-[1100px]:top-0 max-[1100px]:z-50 max-[1100px]:shadow-2xl ${
            isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'
          }`}
        >
          <Sidebar 
            onBackToProjects={() => navigate('/dashboard')} 
            onClose={() => setIsSidebarOpen(false)} 
          />
        </div>

        {/* Central interactive Infinite Canvas */}
        <div className="flex-1 h-full overflow-hidden relative">
          {/* Read-Only Preview Mode Top Banner */}
          {isPreviewMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-600 dark:bg-emerald-700 text-white px-5 py-2.5 rounded-full shadow-2xl z-30 flex items-center gap-4 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-150">
              <span className="flex items-center gap-1.5">
                <RefreshCw size={13} className="animate-spin-slow" />
                Previewing Version #{versions.find((v) => v.id === previewVersionId)?.version_number || ''} (Read-Only)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={exitPreview}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md border border-white/20 transition"
                >
                  Exit Preview
                </button>
                <button
                  onClick={handleConfirmRestore}
                  className="px-2.5 py-1 bg-white text-emerald-700 hover:bg-slate-100 rounded-md transition shadow"
                >
                  Restore Snapshot
                </button>
              </div>
            </div>
          )}

          <ReactFlowProvider>
            <DesignerCanvas />
          </ReactFlowProvider>
          
          {isSaving && (
            <div className="absolute bottom-6 right-6 bg-slate-900/90 dark:bg-slate-900/95 border border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl shadow-2xl z-40 flex items-center gap-2.5 text-xs font-semibold backdrop-blur animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span>Saving changes...</span>
            </div>
          )}
        </div>

        {/* Right configuration properties panel */}
        {!isPreviewMode && selectedElement && <PropertiesPanel />}

        {/* Version History Drawer */}
        {isVersionsOpen && (
          <VersionHistoryDrawer
            onClose={() => setIsVersionsOpen(false)}
          />
        )}
      </div>

      {/* Manual Save Checkpoint Dialog */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-200">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350">
                Save Version Checkpoint
              </h3>
              <p className="text-xs text-slate-450 text-slate-400 dark:text-slate-500 mt-1">
                Capture the current diagram state in a permanent snapshot.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Version Name</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="e.g. Stable checkpoint before primary keys migration"
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Description</label>
                <textarea
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                  placeholder="Add detailed checkpoint notes (optional)..."
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-indigo-500 mt-1 h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2.5 justify-end pt-2">
              <button
                onClick={() => {
                  setIsSaveModalOpen(false);
                  setSaveName('');
                  setSaveDesc('');
                }}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (saveName.trim() === '') {
                    showToast('Version name is required', 'error');
                    return;
                  }
                  try {
                    await saveVersion(saveName.trim(), saveDesc.trim());
                    setIsSaveModalOpen(false);
                    setSaveName('');
                    setSaveDesc('');
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow"
              >
                Create Snapshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Full-screen SQL/JSON Schema Import Progress Overlay */}
      {importProgress?.active && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[999] flex flex-col items-center justify-center select-none text-slate-200">
          <div className="flex flex-col items-center gap-5 max-w-sm text-center">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="absolute text-xs font-black text-indigo-400">
                {Math.round((importProgress.current / importProgress.total) * 100)}%
              </span>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400">
                {importProgress.stage === 'deleting' ? 'Clearing workspace...' : 
                 importProgress.stage === 'tables' ? 'Importing Tables' : 'Connecting relationships...'}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {importProgress.stage === 'tables' && `Creating table ${importProgress.current} of ${importProgress.total}...`}
                {importProgress.stage === 'relationships' && `Creating relationship ${importProgress.current} of ${importProgress.total}...`}
                {importProgress.stage === 'deleting' && `Removing old element ${importProgress.current} of ${importProgress.total}...`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Box */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-55 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-2xl animate-in slide-in-from-right-full duration-300 text-white ${
            toast.type === 'error'
              ? 'bg-red-600 border border-red-500/30'
              : toast.type === 'success'
              ? 'bg-emerald-600 border border-emerald-500/30'
              : 'bg-indigo-600 border border-indigo-550/30'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle size={15} />
          ) : toast.type === 'success' ? (
            <CheckCircle size={15} />
          ) : (
            <Info size={15} />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useSchemaStore } from '../../store/schemaStore';
import {
  X,
  Clock,
  Calendar,
  Star,
  Trash2,
  Edit3,
  Eye,
  RefreshCw,
  Info,
  ChevronLeft,
  ChevronRight,
  Bookmark
} from 'lucide-react';
import type { ProjectVersion } from '../../types';

interface VersionHistoryDrawerProps {
  onClose: () => void;
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({ onClose }) => {
  const {
    versions,
    totalVersions,
    loadVersions,
    deleteVersion,
    restoreVersion,
    updateVersionDetails,
    enterPreview,
    isPreviewMode,
    previewVersionId,
    exitPreview,
    showToast
  } = useSchemaStore();

  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<'all' | 'manual' | 'auto' | 'pinned'>('all');
  const [editingVersion, setEditingVersion] = useState<ProjectVersion | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const limit = 6; // Compact view size for sidebar

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      await loadVersions(page, limit, filterType);
      setLoading(false);
    };
    fetch();
  }, [page, filterType, loadVersions]);

  const handleFilterChange = (type: 'all' | 'manual' | 'auto' | 'pinned') => {
    setFilterType(type);
    setPage(1);
  };

  const handleTogglePin = async (e: React.MouseEvent, version: ProjectVersion) => {
    e.stopPropagation();
    try {
      await updateVersionDetails(version.id, { isPinned: !version.is_pinned });
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEdit = (e: React.MouseEvent, version: ProjectVersion) => {
    e.stopPropagation();
    setEditingVersion(version);
    setEditName(version.version_name || '');
    setEditDescription(version.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editingVersion) return;
    if (editName.trim() === '') {
      showToast('Version name cannot be empty', 'error');
      return;
    }
    try {
      await updateVersionDetails(editingVersion.id, {
        name: editName.trim(),
        description: editDescription.trim()
      });
      setEditingVersion(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (versionId: number) => {
    try {
      await deleteVersion(versionId);
      setConfirmDeleteId(null);
      // If deleted item matches count limits, recalculate page
      if (versions.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await loadVersions(page, limit, filterType);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestore = async (versionId: number) => {
    try {
      await restoreVersion(versionId);
      setConfirmRestoreId(null);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalVersions / limit));

  return (
    <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-200 select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-indigo-500" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Version History
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
        >
          <X size={16} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pt-3 flex flex-wrap gap-1 border-b border-slate-100 dark:border-slate-800/60 pb-2">
        {(['all', 'manual', 'pinned', 'auto'] as const).map((type) => (
          <button
            key={type}
            onClick={() => handleFilterChange(type)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition ${
              filterType === type
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2 text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-semibold">Loading version history...</span>
          </div>
        ) : versions.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500">
            <Info size={20} className="mb-1.5 text-slate-300 dark:text-slate-700" />
            <p className="text-xs">No versions found.</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Try saving a manual checkpoint first.</p>
          </div>
        ) : (
          versions.map((version) => {
            const isEditing = editingVersion?.id === version.id;
            const isPreviewed = isPreviewMode && previewVersionId === version.id;

            return (
              <div
                key={version.id}
                onClick={() => {
                  if (!isEditing) {
                    if (isPreviewed) {
                      exitPreview();
                    } else {
                      enterPreview(version.id);
                    }
                  }
                }}
                className={`p-3 rounded-lg border transition cursor-pointer relative group ${
                  isPreviewed
                    ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/20 dark:bg-slate-900/30'
                }`}
              >
                {/* Pin Icon */}
                <button
                  onClick={(e) => handleTogglePin(e, version)}
                  className={`absolute top-3 right-3 p-1 rounded-md transition ${
                    version.is_pinned
                      ? 'text-amber-500 hover:text-amber-600'
                      : 'text-slate-300 hover:text-slate-500 dark:text-slate-700 dark:hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity'
                  }`}
                  title={version.is_pinned ? 'Unpin version' : 'Pin version'}
                >
                  <Star size={13} fill={version.is_pinned ? 'currentColor' : 'none'} />
                </button>

                {/* Edit Form */}
                {isEditing ? (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none"
                    />
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Add description..."
                      className="w-full px-2.5 py-1 text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none h-12 resize-none"
                    />
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => setEditingVersion(null)}
                        className="px-2 py-0.5 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-2 py-0.5 bg-indigo-600 text-[10px] font-semibold rounded text-white hover:bg-indigo-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Badge and Name */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                        v{version.version_number}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {version.version_name || `Version ${version.version_number}`}
                      </span>

                      {/* Badges */}
                      <div className="flex gap-1">
                        {!!version.is_pinned && (
                          <span className="px-1 py-0.2 bg-amber-500/10 text-amber-500 text-[8px] font-bold uppercase rounded">
                            Pinned
                          </span>
                        )}
                        {version.is_auto_save ? (
                          <span className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8px] font-bold uppercase rounded">
                            Auto
                          </span>
                        ) : (
                          <span className="px-1 py-0.2 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 text-[8px] font-bold uppercase rounded">
                            Manual
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {version.description && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-2">
                        {version.description}
                      </p>
                    )}

                    {/* Stats & Date */}
                    <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500 mt-2.5 border-t border-slate-100 dark:border-slate-800/40 pt-1.5">
                      <div className="flex items-center gap-1">
                        <Bookmark size={8} />
                        <span>
                          {version.tables_count} Tables · {version.relationships_count} Links
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={8} />
                        <span>{new Date(version.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="flex gap-2 justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isPreviewed) {
                            exitPreview();
                          } else {
                            enterPreview(version.id);
                          }
                        }}
                        className={`p-1 rounded text-[9px] font-bold flex items-center gap-1 transition ${
                          isPreviewed
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Eye size={10} />
                        {isPreviewed ? 'Previewing' : 'Preview'}
                      </button>
                      <button
                        onClick={(e) => handleStartEdit(e, version)}
                        className="p-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-[9px] font-bold flex items-center gap-1 transition"
                      >
                        <Edit3 size={10} />
                        Rename
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmRestoreId(version.id);
                        }}
                        className="p-1 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 rounded text-[9px] font-bold flex items-center gap-1 transition"
                      >
                        <RefreshCw size={10} />
                        Restore
                      </button>
                      {!version.is_pinned && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(version.id);
                          }}
                          className="p-1 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 rounded text-[9px] font-bold flex items-center gap-1 transition"
                        >
                          <Trash2 size={10} />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Confirm Delete Overlay */}
                {confirmDeleteId === version.id && (
                  <div
                    className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 rounded-lg flex items-center justify-center p-2 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-center space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                        Confirm deletion of v{version.version_number}?
                      </p>
                      <div className="flex gap-1.5 justify-center">
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-0.5 border border-slate-200 dark:border-slate-700 text-[9px] font-bold rounded text-slate-500 hover:bg-slate-50"
                        >
                          No
                        </button>
                        <button
                          onClick={() => handleDelete(version.id)}
                          className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirm Restore Overlay */}
                {confirmRestoreId === version.id && (
                  <div
                    className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 rounded-lg flex items-center justify-center p-2 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-center space-y-1.5">
                      <p className="text-[9px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                        Restore version v{version.version_number}? <br />
                        <span className="text-[8px] text-slate-400 font-normal">
                          This creates a backup of your current state.
                        </span>
                      </p>
                      <div className="flex gap-1.5 justify-center">
                        <button
                          onClick={() => setConfirmRestoreId(null)}
                          className="px-2 py-0.5 border border-slate-200 dark:border-slate-700 text-[9px] font-bold rounded text-slate-500 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleRestore(version.id)}
                          className="px-2 py-0.5 bg-indigo-650 text-white text-[9px] font-bold rounded hover:bg-indigo-700"
                        >
                          Confirm Restore
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-slate-500 disabled:opacity-40 disabled:hover:bg-transparent transition"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-[10px] font-semibold text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-slate-500 disabled:opacity-40 disabled:hover:bg-transparent transition"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

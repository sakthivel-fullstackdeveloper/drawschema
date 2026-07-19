import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSchemaStore } from '../../store/schemaStore';
import type { DataType, RelationType, ReferentialRule } from '../../types';
import { Trash2, AlertCircle, X } from 'lucide-react';

export const PropertiesPanel: React.FC = () => {
  const {
    selectedElement,
    tables,
    relationships,
    updateTable,
    updateColumn,
    updateRelationship,
    deleteTable,
    deleteColumn,
    deleteRelationship,
    showToast,
    clearSelection
  } = useSchemaStore();

  const [width, setWidth] = useState(320);
  const isResizing = useRef(false);

  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= 280 && newWidth <= 650) {
      setWidth(newWidth);
    }
  }, []);

  const stopResize = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  }, [handleResize]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
  }, [handleResize, stopResize]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResize);
    };
  }, [handleResize, stopResize]);

  // Find selected elements
  const selectedTable = selectedElement?.type === 'table'
    ? tables.find((t) => t.id === selectedElement.id)
    : null;

  const selectedColumn = selectedElement?.type === 'column'
    ? tables
        .find((t) => t.id === selectedElement.tableId)
        ?.columns.find((c) => c.id === selectedElement.id)
    : null;

  const selectedRel = selectedElement?.type === 'relationship'
    ? relationships.find((r) => r.id === selectedElement.id)
    : null;

  const fromTable = selectedRel ? tables.find((t) => t.id === selectedRel.fromTableId) : null;
  const toTable = selectedRel ? tables.find((t) => t.id === selectedRel.toTableId) : null;
  const fromCol = fromTable?.columns.find((c) => c.id === selectedRel?.fromColumnId);
  const toCol = toTable?.columns.find((c) => c.id === selectedRel?.toColumnId);

  // Preset Colors for Tables
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#64748b', // slate
    '#14b8a6'  // teal
  ];

  const currentName = selectedTable ? selectedTable.name : (selectedColumn ? selectedColumn.name : '');
  const currentLength = selectedColumn?.length || '';
  const currentDefault = selectedColumn?.defaultValue || '';
  const currentComment = selectedColumn?.comment || '';

  const [nameInput, setNameInput] = useState(currentName);
  const [lengthInput, setLengthInput] = useState(currentLength);
  const [defaultInput, setDefaultInput] = useState(currentDefault);
  const [commentInput, setCommentInput] = useState(currentComment);

  // Sync state when selected element changes
  useEffect(() => {
    setNameInput(currentName);
    setLengthInput(selectedColumn?.length || '');
    setDefaultInput(selectedColumn?.defaultValue || '');
    setCommentInput(selectedColumn?.comment || '');
  }, [selectedElement?.id, selectedElement?.type, currentName, selectedColumn]);

  const handleSaveTable = async () => {
    if (!selectedTable) return;
    const name = nameInput.trim();
    if (name === '') {
      showToast('Table name cannot be empty', 'error');
      setNameInput(selectedTable.name);
      return;
    }
    try {
      await updateTable(selectedTable.id, { name });
      showToast('Table properties saved!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save table.', 'error');
    }
  };

  const handleSaveColumn = async () => {
    if (!selectedColumn) return;
    const name = nameInput.trim();
    if (name === '') {
      showToast('Column name cannot be empty', 'error');
      setNameInput(selectedColumn.name);
      return;
    }

    // 1. Validate SQL identifier syntax for column name
    const sqlIdentifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!sqlIdentifierRegex.test(name)) {
      showToast('Column name must only contain letters, numbers, and underscores, and cannot start with a number.', 'error');
      return;
    }

    const lengthVal = lengthInput.trim();
    if (lengthVal) {
      if (selectedColumn.datatype === 'ENUM') {
        // 2. Validate ENUM values formatting (quoted strings separated by commas)
        const enumRegex = /^('[^']*'\s*,\s*)*'[^']*'$|^("[^"]*"\s*,\s*)*"[^"]*"$/;
        if (!enumRegex.test(lengthVal)) {
          showToast("Enum values must be quoted comma-separated strings (e.g. 'active','inactive').", 'error');
          return;
        }
      } else {
        // 3. Validate regular datatype length (numeric or precision coordinate e.g. 10,2)
        const lengthRegex = /^\d+(,\d+)?$/;
        if (!lengthRegex.test(lengthVal)) {
          showToast('Length must be a valid number (e.g. 255) or precision (e.g. 10,2).', 'error');
          return;
        }
      }
    }

    try {
      await updateColumn(selectedColumn.id, {
        name,
        length: lengthVal || null,
        defaultValue: defaultInput.trim() || null,
        comment: commentInput.trim() || null
      });
      showToast('Column properties saved!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save column.', 'error');
    }
  };

  if (!selectedElement) {
    return (
      <div 
        style={{ width: `${width}px` }}
        className="h-full border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col items-center justify-center text-center select-none relative"
      >
        <div
          onMouseDown={startResize}
          className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/25 transition-colors z-20 group"
          title="Drag to resize panel"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-5 bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors" />
        </div>
        <AlertCircle size={24} className="text-slate-400 dark:text-slate-600 mb-2" />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select an item on the canvas to configure its settings.
        </p>
      </div>
    );
  }

  return (
    <div 
      style={{ width: `${width}px` }}
      className="h-full border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col select-none overflow-y-auto relative"
    >
      <div
        onMouseDown={startResize}
        className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/25 transition-colors z-20 group"
        title="Drag to resize panel"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-5 bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors" />
      </div>
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Properties Panel
        </span>
        <button
          onClick={clearSelection}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          title="Close Properties Panel"
        >
          <X size={14} />
        </button>
      </div>

      {/* Selected Table Properties */}
      {selectedTable && (
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              Table Name
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">
              Header Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => updateTable(selectedTable.id, { color: c })}
                  className={`h-7 rounded border transition-all ${
                    selectedTable.color === c
                      ? 'border-black dark:border-white scale-105'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                Width (px)
              </label>
              <input
                type="number"
                value={selectedTable.width}
                onChange={(e) =>
                  updateTable(selectedTable.id, { width: parseInt(e.target.value, 10) || 220 })
                }
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                Height (px)
              </label>
              <input
                type="number"
                value={selectedTable.height}
                onChange={(e) =>
                  updateTable(selectedTable.id, { height: parseInt(e.target.value, 10) || 180 })
                }
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <button
              onClick={handleSaveTable}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow transition"
            >
              Save Changes
            </button>
            <button
              onClick={() => deleteTable(selectedTable.id)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-red-200 dark:border-red-950 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md text-xs font-semibold transition"
            >
              <Trash2 size={14} />
              Delete Table
            </button>
          </div>
        </div>
      )}

      {/* Selected Column Properties */}
      {selectedColumn && (
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              Column Name
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                Data Type
              </label>
              <select
                value={selectedColumn.datatype}
                onChange={(e) =>
                  updateColumn(selectedColumn.id, { datatype: e.target.value as DataType })
                }
                className="w-full px-2 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none text-slate-700 dark:text-slate-300"
              >
                {[
                  'INT', 'INT[]',
                  'BIGINT', 'BIGINT[]',
                  'VARCHAR', 'VARCHAR[]',
                  'TEXT', 'TEXT[]',
                  'BOOLEAN', 'BOOLEAN[]',
                  'DATE', 'DATE[]',
                  'DATETIME', 'DATETIME[]',
                  'TIMESTAMP', 'TIMESTAMP[]',
                  'FLOAT', 'FLOAT[]',
                  'DOUBLE', 'DOUBLE[]',
                  'DECIMAL', 'DECIMAL[]',
                  'JSON', 'JSON[]',
                  'UUID', 'UUID[]',
                  'ENUM', 'ENUM[]'
                ].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                {selectedColumn.datatype === 'ENUM' ? 'Enum Values' : 'Length'}
              </label>
              <input
                type="text"
                placeholder={selectedColumn.datatype === 'ENUM' ? "'active','inactive'" : "255"}
                value={lengthInput}
                onChange={(e) => setLengthInput(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none"
              />
              {selectedColumn.datatype === 'ENUM' && (
                <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5">
                  Comma-separated values e.g. 'active','inactive'
                </span>
              )}
            </div>
          </div>

          {/* Constraints Grid */}
          <div className="space-y-2.5 pt-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">
              Constraints
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-md cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={selectedColumn.primaryKey}
                  onChange={(e) => updateColumn(selectedColumn.id, { primaryKey: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">Primary Key</span>
              </label>

              <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-md cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={selectedColumn.nullable}
                  onChange={(e) => updateColumn(selectedColumn.id, { nullable: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">Nullable</span>
              </label>

              <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-md cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={selectedColumn.uniqueKey}
                  onChange={(e) => updateColumn(selectedColumn.id, { uniqueKey: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">Unique</span>
              </label>

              <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-md cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={selectedColumn.autoIncrement}
                  onChange={(e) =>
                    updateColumn(selectedColumn.id, { autoIncrement: e.target.checked })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">Auto Inc</span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              Default Value
            </label>
            <input
              type="text"
              placeholder="NULL"
              value={defaultInput}
              onChange={(e) => setDefaultInput(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              Comment
            </label>
            <textarea
              placeholder="Add details about column..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none h-16 resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <button
              onClick={handleSaveColumn}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow transition"
            >
              Save Changes
            </button>
            <button
              onClick={() => deleteColumn(selectedColumn.id)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-red-200 dark:border-red-950 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md text-xs font-semibold transition"
            >
              <Trash2 size={14} />
              Delete Column
            </button>
          </div>
        </div>
      )}

      {/* Selected Relationship Properties */}
      {selectedRel && (
        <div className="p-4 space-y-4">
          {/* Connector Info */}
          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 text-[10px] space-y-1 text-slate-500 dark:text-slate-400">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-350">From: </span>
              {fromTable?.name}.{fromCol?.name} (FK)
            </div>
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-350">To: </span>
              {toTable?.name}.{toCol?.name} (PK)
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              Relation Type
            </label>
            <select
              value={selectedRel.relationType}
              onChange={(e) =>
                updateRelationship(selectedRel.id, { relationType: e.target.value as RelationType })
              }
              className="w-full px-2 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none text-slate-700 dark:text-slate-300"
            >
              <option value="OneToOne">One-to-One (1 : 1)</option>
              <option value="OneToMany">One-to-Many (1 : N)</option>
              <option value="ManyToOne">Many-to-One (N : 1)</option>
              <option value="ManyToMany">Many-to-Many (N : M)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              ON DELETE Rule
            </label>
            <select
              value={selectedRel.onDelete}
              onChange={(e) =>
                updateRelationship(selectedRel.id, { onDelete: e.target.value as ReferentialRule })
              }
              className="w-full px-2 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none text-slate-700 dark:text-slate-300"
            >
              <option value="CASCADE">CASCADE</option>
              <option value="SET NULL">SET NULL</option>
              <option value="RESTRICT">RESTRICT</option>
              <option value="NO ACTION">NO ACTION</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              ON UPDATE Rule
            </label>
            <select
              value={selectedRel.onUpdate}
              onChange={(e) =>
                updateRelationship(selectedRel.id, { onUpdate: e.target.value as ReferentialRule })
              }
              className="w-full px-2 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none text-slate-700 dark:text-slate-300"
            >
              <option value="CASCADE">CASCADE</option>
              <option value="SET NULL">SET NULL</option>
              <option value="RESTRICT">RESTRICT</option>
              <option value="NO ACTION">NO ACTION</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => deleteRelationship(selectedRel.id)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-red-200 dark:border-red-950 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md text-xs font-semibold transition"
            >
              <Trash2 size={14} />
              Delete Relationship
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

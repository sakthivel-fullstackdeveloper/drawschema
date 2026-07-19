import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useSchemaStore } from '../../store/schemaStore';
import type { Table } from '../../types';
import { Key, Link, Plus, Trash2, Copy } from 'lucide-react';

interface TableNodeData {
  table: Table;
}

const formatLength = (len: string | null) => {
  if (!len) return '';
  // Trim quotes if any
  const cleanLen = len.replace(/^['"`]|['"`]$/g, '');
  if (cleanLen.length > 15) {
    return `(${cleanLen.substring(0, 12)}...)`;
  }
  return `(${cleanLen})`;
};

export const TableNode: React.FC<NodeProps> = ({ data, selected }) => {
  const { table } = data as unknown as TableNodeData;
  const {
    deleteTable,
    addColumn,
    selectElement,
    selectedElement,
    showToast,
    duplicateTable,
    isPreviewMode,
    relationships,
    previewRelationships,
    tables,
    previewTables,
    selectedTableIds
  } = useSchemaStore();

  const activeRels = isPreviewMode ? previewRelationships : relationships;

  // Find relationships to tables that are currently not in selectedTableIds
  const hiddenRelationships = React.useMemo(() => {
    const ids = selectedTableIds || [];
    if (ids.length === 0) return [];
    if (!ids.includes(table.id)) return [];

    return activeRels.filter((r) => {
      const isSourceThisTable = r.fromTableId === table.id;
      const isTargetThisTable = r.toTableId === table.id;
      
      if (isSourceThisTable) {
        return !ids.includes(r.toTableId);
      }
      if (isTargetThisTable) {
        return !ids.includes(r.fromTableId);
      }
      return false;
    });
  }, [selectedTableIds, activeRels, table.id]);

  const handleDuplicateTable = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateTable(table.id);
  };

  const handleAddColumn = (e: React.MouseEvent) => {
    e.stopPropagation();
    const hasNewColumn = table.columns.some((col) => col.name === 'new_column');
    if (hasNewColumn) {
      showToast("A column named 'new_column' already exists. Please edit/rename it first!", 'error');
      return;
    }
    addColumn(table.id, 'new_column', 'VARCHAR');
  };

  const handleSelectTable = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectElement('table', table.id);
  };

  const handleSelectColumn = (e: React.MouseEvent, colId: number) => {
    e.stopPropagation();
    selectElement('column', colId, table.id);
  };

  return (
    <div
      onClick={handleSelectTable}
      style={{ width: `${table.width}px` }}
      className={`group/table bg-white dark:bg-slate-900 border rounded-lg shadow-xl transition-all duration-200 select-none cursor-pointer ${
        selected
          ? 'border-indigo-600 ring-2 ring-indigo-500/20 scale-[1.01]'
          : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400/80 dark:hover:border-slate-700 hover:shadow-2xl'
      }`}
    >
      {/* Table Color Header Indicator */}
      <div
        className="h-1.5 w-full rounded-t-lg"
        style={{ backgroundColor: table.color || '#3b82f6' }}
      />

      {/* Table Header */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
          {table.name}
        </span>
        {!isPreviewMode && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleAddColumn}
              title="Add Column"
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={handleDuplicateTable}
              title="Duplicate Table"
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-indigo-650 dark:text-slate-400 dark:hover:text-indigo-400 transition"
            >
              <Copy size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteTable(table.id);
              }}
              title="Delete Table"
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Column List */}
      <div className="py-1">
        {table.columns.length === 0 ? (
          <div className="px-3 py-3 text-center text-xs text-slate-400 dark:text-slate-500 italic">
            No columns yet
          </div>
        ) : (
          table.columns.map((col) => {
            const isColSelected = selectedElement?.type === 'column' && selectedElement.id === col.id;
            const isTargetConnected = activeRels.some((r) => r.toColumnId === col.id);
            const isSourceConnected = activeRels.some((r) => r.fromColumnId === col.id);
            return (
              <div
                key={col.id}
                onClick={(e) => handleSelectColumn(e, col.id)}
                className={`relative px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs transition group cursor-pointer ${
                  isColSelected ? 'bg-indigo-50/80 dark:bg-indigo-950/30' : ''
                }`}
              >
                {/* Left handle for connecting relationships (target) */}
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`${col.id}-target`}
                  className={`!w-3 !h-3 hover:!w-4 hover:!h-4 !bg-indigo-500 hover:!bg-indigo-600 !border-2 !border-white dark:!border-slate-900 !z-30 cursor-crosshair transition-all ${isTargetConnected ? 'opacity-100' : 'opacity-0 group-hover/table:opacity-100'}`}
                />

                {/* Column details (Icons + Name) */}
                <div className="flex items-center gap-1.5 overflow-hidden mr-2">
                  <div className="flex items-center min-w-[14px] justify-center">
                    {col.primaryKey ? (
                      <div title="Primary Key" className="flex items-center justify-center">
                        <Key size={12} className="text-amber-500 flex-shrink-0" />
                      </div>
                    ) : col.foreignKey ? (
                      <div title="Foreign Key" className="flex items-center justify-center">
                        <Link size={12} className="text-blue-500 flex-shrink-0" />
                      </div>
                    ) : (
                      <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 flex-shrink-0" />
                    )}
                  </div>
                  <span
                    className={`truncate font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${
                      col.primaryKey ? 'font-semibold text-slate-850 dark:text-slate-150' : ''
                    }`}
                  >
                    {col.name}
                  </span>
                </div>

                {/* Datatype and length */}
                <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono" title={col.length ? `${col.datatype.toLowerCase()}(${col.length})` : col.datatype.toLowerCase()}>
                    {col.datatype.toLowerCase()}
                    {formatLength(col.length)}
                    {!col.nullable ? '*' : ''}
                  </span>
                </div>

                {/* Right handle for connecting relationships (source) */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${col.id}-source`}
                  className={`!w-3 !h-3 hover:!w-4 hover:!h-4 !bg-indigo-500 hover:!bg-indigo-600 !border-2 !border-white dark:!border-slate-900 !z-30 cursor-crosshair transition-all ${isSourceConnected ? 'opacity-100' : 'opacity-0 group-hover/table:opacity-100'}`}
                />
              </div>
            );
          })
        )}
      </div>

      {/* External Connections Indicators */}
      {hiddenRelationships.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 text-[10px] text-slate-500 dark:text-slate-400">
          <div className="font-bold uppercase tracking-wider text-[8px] text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            External Links ({hiddenRelationships.length})
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
            {hiddenRelationships.map((r) => {
              const isSource = r.fromTableId === table.id;
              const otherTableId = isSource ? r.toTableId : r.fromTableId;
              const allTables = isPreviewMode ? previewTables : tables;
              const otherTable = allTables.find((tbl) => tbl.id === otherTableId);
              const otherTableName = otherTable ? otherTable.name : `Table #${otherTableId}`;
              const relType = r.relationType || 'OneToMany';
              
              return (
                <div key={r.id} className="flex items-center justify-between bg-white dark:bg-slate-950 px-2 py-1 rounded border border-slate-200/50 dark:border-slate-850">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]" title={otherTableName}>
                    {otherTableName}
                  </span>
                  <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1 rounded font-mono font-bold">
                    {isSource ? '→ ' : '← '}
                    {relType === 'OneToOne' ? '1:1' : relType === 'OneToMany' ? '1:N' : 'N:N'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

import { useDispatch, useSelector } from 'react-redux';
import { useMemo } from 'react';
import type { RootState, AppDispatch } from './reduxStore';
import { schemaSlice } from './reduxStore';
import * as thunks from './reduxStore';
import type { Project, Table, Column, Relationship, DataType, RelationType, ProjectVersion } from '../types';

export interface SchemaState {
  currentProject: Project | null;
  tables: Table[];
  relationships: Relationship[];
  selectedElement: {
    type: 'table' | 'column' | 'relationship';
    id: number;
    tableId?: number; // for column selection context
  } | null;
  history: { tables: Table[]; relationships: Relationship[] }[];
  future: { tables: Table[]; relationships: Relationship[] }[];
  clipboard: { table: Table } | null;
  searchTerm: string;
  snapToGrid: boolean;
  darkMode: boolean;
  isSaving: boolean;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  versions: ProjectVersion[];
  totalVersions: number;
  isPreviewMode: boolean;
  previewTables: Table[];
  previewRelationships: Relationship[];
  previewVersionId: number | null;
  changesCount: number;
  importProgress: {
    active: boolean;
    current: number;
    total: number;
    stage: 'deleting' | 'tables' | 'relationships';
  } | null;
  selectedTableIds: number[];

  setProject: (project: Project | null) => void;
  loadSchema: (projectId: number) => Promise<void>;
  toggleDarkMode: () => void;
  setSnapToGrid: (snap: boolean) => void;
  setSearchTerm: (term: string) => void;
  addTable: (name: string, x?: number, y?: number) => Promise<void>;
  updateTable: (tableId: number, data: Partial<Omit<Table, 'id' | 'columns'>>) => Promise<void>;
  updateTablePositionLocal: (tableId: number, x: number, y: number) => void;
  saveTablePosition: (tableId: number, x: number, y: number) => Promise<void>;
  deleteTable: (tableId: number) => Promise<void>;
  duplicateTable: (tableId: number) => Promise<void>;
  addColumn: (tableId: number, name: string, datatype: DataType) => Promise<void>;
  updateColumn: (columnId: number, data: Partial<Omit<Column, 'id' | 'tableId'>>) => Promise<void>;
  deleteColumn: (columnId: number) => Promise<void>;
  addRelationship: (
    fromTableId: number,
    fromColumnId: number,
    toTableId: number,
    toColumnId: number,
    relationType?: RelationType
  ) => Promise<void>;
  updateRelationship: (relId: number, data: Partial<Omit<Relationship, 'id' | 'projectId'>>) => Promise<void>;
  deleteRelationship: (relId: number) => Promise<void>;
  selectElement: (type: 'table' | 'column' | 'relationship', id: number, tableId?: number) => void;
  clearSelection: () => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  copySelected: () => void;
  pasteCopied: () => Promise<void>;
  deleteSelected: () => Promise<void>;
  clearSchema: () => Promise<void>;
  autoLayout: () => void;
  importJsonSchema: (jsonStr: string, mode?: 'replace' | 'extend') => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  versionsList?: ProjectVersion[]; // compatibility check
  loadVersions: (page?: number, limit?: number, type?: string) => Promise<void>;
  saveVersion: (name: string, description: string) => Promise<void>;
  restoreVersion: (versionId: number) => Promise<void>;
  deleteVersion: (versionId: number) => Promise<void>;
  updateVersionDetails: (versionId: number, data: { name?: string; description?: string; isPinned?: boolean }) => Promise<void>;
  enterPreview: (versionId: number) => Promise<void>;
  exitPreview: () => void;
  incrementChangeCount: () => void;
  toggleSelectTable: (tableId: number) => void;
  clearSelectedTables: () => void;
}

// Custom hook matching Zustand store interface
export const useSchemaStore = (): SchemaState => {
  const dispatch = useDispatch<AppDispatch>();
  const state = useSelector((s: RootState) => s.schema);

  const actions = useMemo(() => ({
    // Set project context
    setProject: (project: Project | null) => dispatch(schemaSlice.actions.setProject(project)),
    
    // Core Actions
    loadSchema: (projectId: number) => dispatch(thunks.loadSchema(projectId)).unwrap().then(() => {}),
    toggleDarkMode: () => dispatch(schemaSlice.actions.toggleDarkMode()),
    setSnapToGrid: (snap: boolean) => dispatch(schemaSlice.actions.setSnapToGrid(snap)),
    setSearchTerm: (term: string) => dispatch(schemaSlice.actions.setSearchTerm(term)),

    // Table Actions
    addTable: (name: string, x?: number, y?: number) => dispatch(thunks.addTable({ name, x, y })).unwrap().then(() => {}),
    updateTable: (tableId: number, data: Partial<Omit<Table, 'id' | 'columns'>>) => dispatch(thunks.updateTable({ tableId, data })).unwrap().then(() => {}),
    updateTablePositionLocal: (tableId: number, x: number, y: number) => dispatch(schemaSlice.actions.updateTablePositionLocal({ tableId, x, y })),
    saveTablePosition: (tableId: number, x: number, y: number) => dispatch(thunks.saveTablePosition({ tableId, x, y })).unwrap().then(() => {}),
    deleteTable: (tableId: number) => dispatch(thunks.deleteTable(tableId)).unwrap().then(() => {}),
    duplicateTable: (tableId: number) => dispatch(thunks.duplicateTable(tableId)).unwrap().then(() => {}),

    // Column Actions
    addColumn: (tableId: number, name: string, datatype: DataType) => dispatch(thunks.addColumn({ tableId, name, datatype })).unwrap().then(() => {}),
    updateColumn: (columnId: number, data: Partial<Omit<Column, 'id' | 'tableId'>>) => dispatch(thunks.updateColumn({ columnId, data })).unwrap().then(() => {}),
    deleteColumn: (columnId: number) => dispatch(thunks.deleteColumn(columnId)).unwrap().then(() => {}),

    // Relationship Actions
    addRelationship: (fromTableId: number, fromColumnId: number, toTableId: number, toColumnId: number, relationType?: RelationType) =>
      dispatch(thunks.addRelationship({ fromTableId, fromColumnId, toTableId, toColumnId, relationType })).unwrap().then(() => {}),
    updateRelationship: (relId: number, data: Partial<Omit<Relationship, 'id' | 'projectId'>>) => dispatch(thunks.updateRelationship({ relId, data })).unwrap().then(() => {}),
    deleteRelationship: (relId: number) => dispatch(thunks.deleteRelationship(relId)).unwrap().then(() => {}),

    // Selection
    selectElement: (type: 'table' | 'column' | 'relationship', id: number, tableId?: number) => dispatch(schemaSlice.actions.selectElement({ type, id, tableId })),
    clearSelection: () => dispatch(schemaSlice.actions.clearSelection()),

    // History and Shortcuts
    pushHistory: () => dispatch(schemaSlice.actions.pushHistory()),
    undo: () => dispatch(schemaSlice.actions.undo()),
    redo: () => dispatch(schemaSlice.actions.redo()),
    copySelected: () => dispatch(schemaSlice.actions.copySelected()),
    pasteCopied: () => dispatch(thunks.pasteCopied()).unwrap().then(() => {}),
    deleteSelected: () => dispatch(thunks.deleteSelected()).unwrap().then(() => {}),
    clearSchema: () => dispatch(thunks.clearSchema()).unwrap().then(() => {}),

    // Layout and Import/Export
    autoLayout: () => dispatch(schemaSlice.actions.autoLayout()),
    importJsonSchema: (jsonStr: string, mode: 'replace' | 'extend' = 'replace') =>
      dispatch(thunks.importJsonSchema({ jsonStr, mode })).unwrap().then(() => {}),

    // Toasts
    showToast: (message: string, type: 'success' | 'error' | 'info' = 'info') => dispatch(schemaSlice.actions.showToast({ message, type })),
    hideToast: () => dispatch(schemaSlice.actions.hideToast()),

    // Version History
    loadVersions: (page = 1, limit = 20, type = 'all') =>
      dispatch(thunks.loadVersions({ page, limit, type })).unwrap().then(() => {}),
    saveVersion: (name: string, description: string) =>
      dispatch(thunks.saveVersion({ name, description })).unwrap().then(() => {}),
    restoreVersion: (versionId: number) =>
      dispatch(thunks.restoreVersion(versionId)).unwrap().then(() => {}),
    deleteVersion: (versionId: number) =>
      dispatch(thunks.deleteVersion(versionId)).unwrap().then(() => {}),
    updateVersionDetails: (versionId: number, data: { name?: string; description?: string; isPinned?: boolean }) =>
      dispatch(thunks.updateVersionDetails({ versionId, data })).unwrap().then(() => {}),
    enterPreview: (versionId: number) =>
      dispatch(thunks.enterPreview(versionId)).unwrap().then(() => {}),
    exitPreview: () => dispatch(schemaSlice.actions.exitPreview()),
    incrementChangeCount: () => dispatch(thunks.incrementChangeCount()).unwrap().then(() => {}),
    toggleSelectTable: (tableId: number) => dispatch(schemaSlice.actions.toggleSelectTableLocal(tableId)),
    clearSelectedTables: () => dispatch(schemaSlice.actions.clearSelectedTablesLocal())
  }), [dispatch]);

  return useMemo(() => ({
    ...state,
    ...actions
  }), [state, actions]);
};

// Expose store state helper (for timers/loops querying getState directly)
useSchemaStore.getState = () => {
  const reduxState = store.getState();
  return {
    ...reduxState.schema,
    showToast: (message: string, type?: 'success' | 'error' | 'info') => store.dispatch(schemaSlice.actions.showToast({ message, type })),
    hideToast: () => store.dispatch(schemaSlice.actions.hideToast()),
    loadVersions: (page = 1, limit = 20, type = 'all') => store.dispatch(thunks.loadVersions({ page, limit, type })).unwrap(),
    saveVersion: (name: string, description: string) => store.dispatch(thunks.saveVersion({ name, description })).unwrap()
  };
};

import { store } from './reduxStore';

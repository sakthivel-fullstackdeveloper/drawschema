import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../services/api';
import type { Project, Table, Column, Relationship, DataType, RelationType, ProjectVersion } from '../types';
import * as versionApi from '../services/version';

// Types and states
export interface SchemaState {
  currentProject: Project | null;
  tables: Table[];
  relationships: Relationship[];
  selectedElement: {
    type: 'table' | 'column' | 'relationship';
    id: number;
    tableId?: number;
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
}

const initialState: SchemaState = {
  currentProject: null,
  tables: [],
  relationships: [],
  selectedElement: null,
  history: [],
  future: [],
  clipboard: null,
  searchTerm: '',
  snapToGrid: true,
  darkMode: true,
  isSaving: false,
  toast: null,
  versions: [],
  totalVersions: 0,
  isPreviewMode: false,
  previewTables: [],
  previewRelationships: [],
  previewVersionId: null,
  changesCount: 0,
  importProgress: null,
  selectedTableIds: [],
};

// Graph helper for circular relationship check
const hasPath = (graph: Record<number, number[]>, start: number, target: number, visited = new Set<number>()): boolean => {
  if (start === target) return true;
  if (!graph[start]) return false;
  visited.add(start);
  for (const neighbor of graph[start]) {
    if (!visited.has(neighbor)) {
      if (hasPath(graph, neighbor, target, visited)) return true;
    }
  }
  return false;
};

// Async Thunks
export const loadSchema = createAsyncThunk(
  'schema/loadSchema',
  async (projectId: number) => {
    const response: any = await api.get(`/schema/${projectId}`);
    if (response.success) {
      return {
        tables: response.data.tables,
        relationships: response.data.relationships
      };
    }
    throw new Error('Failed to load schema');
  }
);

export const addTable = createAsyncThunk(
  'schema/addTable',
  async ({ name, x = 100, y = 100 }: { name: string; x?: number; y?: number }, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const project = state.schema.currentProject;
    if (!project) throw new Error('No active project');

    const backup = { tables: state.schema.tables, relationships: state.schema.relationships };
    thunkAPI.dispatch(schemaSlice.actions.pushHistory());

    // Prevent overlapping by shifting new table down if coordinates match an existing table
    let finalX = x;
    let finalY = y;
    while (state.schema.tables.some((t) => Math.abs(t.x - finalX) < 15 && Math.abs(t.y - finalY) < 15)) {
      finalY += 80;
      if (finalY > 700) {
        finalY = 100;
        finalX += 260;
      }
    }

    try {
      const response: any = await api.post('/tables', {
        projectId: project.id,
        name,
        x: finalX,
        y: finalY,
        width: 220,
        height: 180,
        color: '#3b82f6'
      });

      if (response.success) {
        const newTable: Table = {
          ...response.data.table,
          columns: []
        };
        thunkAPI.dispatch(incrementChangeCount());
        thunkAPI.dispatch(schemaSlice.actions.showToast({
          message: `Table "${name}" created successfully!`,
          type: 'success'
        }));
        return newTable;
      }
      throw new Error('Failed to create table');
    } catch (err: any) {
      thunkAPI.dispatch(schemaSlice.actions.rollbackState(backup));
      throw err;
    }
  }
);

export const updateTable = createAsyncThunk(
  'schema/updateTable',
  async ({ tableId, data }: { tableId: number; data: Partial<Omit<Table, 'id' | 'columns'>> }, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const backup = { tables: state.schema.tables, relationships: state.schema.relationships };
    thunkAPI.dispatch(schemaSlice.actions.pushHistory());

    // Optimistic Update
    thunkAPI.dispatch(schemaSlice.actions.updateTableOptimistic({ tableId, data }));

    try {
      await api.put(`/tables/${tableId}`, data);
      thunkAPI.dispatch(incrementChangeCount());
    } catch (err: any) {
      thunkAPI.dispatch(schemaSlice.actions.rollbackState(backup));
      throw err;
    }
  }
);

export const saveTablePosition = createAsyncThunk(
  'schema/saveTablePosition',
  async ({ tableId, x, y }: { tableId: number; x: number; y: number }) => {
    await api.put(`/tables/${tableId}`, { x, y });
  }
);

export const deleteTable = createAsyncThunk(
  'schema/deleteTable',
  async (tableId: number, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const backup = { tables: state.schema.tables, relationships: state.schema.relationships };
    thunkAPI.dispatch(schemaSlice.actions.pushHistory());

    // Optimistic Update
    thunkAPI.dispatch(schemaSlice.actions.deleteTableOptimistic(tableId));

    try {
      await api.delete(`/tables/${tableId}`);
      thunkAPI.dispatch(incrementChangeCount());
      thunkAPI.dispatch(schemaSlice.actions.showToast({
        message: 'Table deleted successfully!',
        type: 'success'
      }));
    } catch (err: any) {
      thunkAPI.dispatch(schemaSlice.actions.rollbackState(backup));
      throw err;
    }
  }
);

export const duplicateTable = createAsyncThunk(
  'schema/duplicateTable',
  async (tableId: number, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const project = state.schema.currentProject;
    const tables = state.schema.tables;
    const tableToDup = tables.find((t) => t.id === tableId);
    if (!project || !tableToDup) return;

    const backup = { tables: state.schema.tables, relationships: state.schema.relationships };
    thunkAPI.dispatch(schemaSlice.actions.pushHistory());

    try {
      let baseName = `${tableToDup.name}_copy`;
      let count = 1;
      while (tables.some((t) => t.name === (count === 1 ? baseName : `${baseName}_${count}`))) {
        count++;
      }
      const newName = count === 1 ? baseName : `${baseName}_${count}`;

      const res: any = await api.post('/tables', {
        projectId: project.id,
        name: newName,
        x: tableToDup.x + 40,
        y: tableToDup.y + 40,
        width: tableToDup.width,
        height: tableToDup.height,
        color: tableToDup.color
      });

      if (res.success) {
        const newTable = { ...res.data.table, columns: [] };
        thunkAPI.dispatch(schemaSlice.actions.addTableLocal(newTable));

        const createdCols: Column[] = [];
        for (const col of tableToDup.columns) {
          const colRes: any = await api.post('/columns', {
            tableId: newTable.id,
            name: col.name,
            datatype: col.datatype,
            length: col.length,
            nullable: col.nullable,
            primaryKey: col.primaryKey,
            foreignKey: false,
            uniqueKey: col.uniqueKey,
            autoIncrement: col.autoIncrement,
            defaultValue: col.defaultValue,
            comment: col.comment
          });
          if (colRes.success) {
            createdCols.push(colRes.data.column);
          }
        }

        thunkAPI.dispatch(schemaSlice.actions.updateTableColumnsLocal({ tableId: newTable.id, columns: createdCols }));
      }
    } catch (err: any) {
      thunkAPI.dispatch(schemaSlice.actions.rollbackState(backup));
      throw err;
    }
  }
);

export const addColumn = createAsyncThunk(
  'schema/addColumn',
  async ({ tableId, name, datatype }: { tableId: number; name: string; datatype: DataType }, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const backup = { tables: state.schema.tables, relationships: state.schema.relationships };
    thunkAPI.dispatch(schemaSlice.actions.pushHistory());

    try {
      const response: any = await api.post('/columns', {
        tableId,
        name,
        datatype,
        nullable: true,
        primaryKey: false,
        foreignKey: false,
        uniqueKey: false,
        autoIncrement: false
      });

      if (response.success) {
        const newCol: Column = response.data.column;
        thunkAPI.dispatch(schemaSlice.actions.addColumnLocal({ tableId, column: newCol }));
        thunkAPI.dispatch(incrementChangeCount());
      }
    } catch (err: any) {
      thunkAPI.dispatch(schemaSlice.actions.rollbackState(backup));
      throw err;
    }
  }
);

export const updateColumn = createAsyncThunk(
  'schema/updateColumn',
  async ({ columnId, data }: { columnId: number; data: Partial<Omit<Column, 'id' | 'tableId'>> }, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const backup = { tables: state.schema.tables, relationships: state.schema.relationships };
    thunkAPI.dispatch(schemaSlice.actions.pushHistory());

    // Optimistic Update
    thunkAPI.dispatch(schemaSlice.actions.updateColumnOptimistic({ columnId, data }));

    try {
      await api.put(`/columns/${columnId}`, data);
      thunkAPI.dispatch(incrementChangeCount());
    } catch (err: any) {
      thunkAPI.dispatch(schemaSlice.actions.rollbackState(backup));
      throw err;
    }
  }
);

export const deleteColumn = createAsyncThunk(
  'schema/deleteColumn',
  async (columnId: number, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const backup = { tables: state.schema.tables, relationships: state.schema.relationships };
    thunkAPI.dispatch(schemaSlice.actions.pushHistory());

    // Optimistic Update
    thunkAPI.dispatch(schemaSlice.actions.deleteColumnOptimistic(columnId));

    try {
      await api.delete(`/columns/${columnId}`);
      thunkAPI.dispatch(incrementChangeCount());
    } catch (err: any) {
      thunkAPI.dispatch(schemaSlice.actions.rollbackState(backup));
      throw err;
    }
  }
);

export const mapRelationship = (raw: any): Relationship => ({
  id: raw.id,
  projectId: raw.project_id ?? raw.projectId,
  fromTableId: raw.from_table_id ?? raw.fromTableId,
  fromColumnId: raw.from_column_id ?? raw.fromColumnId,
  toTableId: raw.to_table_id ?? raw.toTableId,
  toColumnId: raw.to_column_id ?? raw.toColumnId,
  relationType: raw.relation_type ?? raw.relationType,
  onDelete: raw.on_delete ?? raw.onDelete,
  onUpdate: raw.on_update ?? raw.onUpdate
});

export const addRelationship = createAsyncThunk(
  'schema/addRelationship',
  async (
    { fromTableId, fromColumnId, toTableId, toColumnId, relationType = 'OneToMany' }:
    { fromTableId: number; fromColumnId: number; toTableId: number; toColumnId: number; relationType?: RelationType },
    thunkAPI
  ) => {
    const state = thunkAPI.getState() as RootState;
    const project = state.schema.currentProject;
    const relationships = state.schema.relationships;
    if (!project) throw new Error('No active project');

    // Circular check
    const graph: Record<number, number[]> = {};
    relationships.forEach((rel) => {
      if (!graph[rel.fromTableId]) graph[rel.fromTableId] = [];
      graph[rel.fromTableId].push(rel.toTableId);
    });

    if (hasPath(graph, toTableId, fromTableId)) {
      throw new Error('Circular dependency detected. This relationship would create a loop.');
    }

    const backup = { tables: state.schema.tables, relationships: state.schema.relationships };
    thunkAPI.dispatch(schemaSlice.actions.pushHistory());

    try {
      const response: any = await api.post('/relationships', {
        projectId: project.id,
        fromTableId,
        fromColumnId,
        toTableId,
        toColumnId,
        relationType,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      if (response.success) {
        const newRel = mapRelationship(response.data.relationship);
        thunkAPI.dispatch(schemaSlice.actions.addRelationshipLocal(newRel));
        await thunkAPI.dispatch(updateColumn({ columnId: fromColumnId, data: { foreignKey: true } }));
      }
    } catch (err: any) {
      thunkAPI.dispatch(schemaSlice.actions.rollbackState(backup));
      throw err;
    }
  }
);

export const updateRelationship = createAsyncThunk(
  'schema/updateRelationship',
  async ({ relId, data }: { relId: number; data: Partial<Omit<Relationship, 'id' | 'projectId'>> }, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const backup = { tables: state.schema.tables, relationships: state.schema.relationships };
    thunkAPI.dispatch(schemaSlice.actions.pushHistory());

    thunkAPI.dispatch(schemaSlice.actions.updateRelationshipOptimistic({ relId, data }));

    try {
      await api.put(`/relationships/${relId}`, data);
      thunkAPI.dispatch(incrementChangeCount());
    } catch (err: any) {
      thunkAPI.dispatch(schemaSlice.actions.rollbackState(backup));
      throw err;
    }
  }
);

export const deleteRelationship = createAsyncThunk(
  'schema/deleteRelationship',
  async (relId: number, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const rel = state.schema.relationships.find((r) => r.id === relId);
    if (!rel) return;

    const backup = { tables: state.schema.tables, relationships: state.schema.relationships };
    thunkAPI.dispatch(schemaSlice.actions.pushHistory());

    thunkAPI.dispatch(schemaSlice.actions.deleteRelationshipOptimistic(relId));

    try {
      await api.delete(`/relationships/${relId}`);
      
      const updatedState = thunkAPI.getState() as RootState;
      const remainingRels = updatedState.schema.relationships.filter((r) => r.fromColumnId === rel.fromColumnId);
      if (remainingRels.length === 0) {
        await thunkAPI.dispatch(updateColumn({ columnId: rel.fromColumnId, data: { foreignKey: false } }));
      } else {
        thunkAPI.dispatch(incrementChangeCount());
      }
    } catch (err: any) {
      thunkAPI.dispatch(schemaSlice.actions.rollbackState(backup));
      throw err;
    }
  }
);

export const pasteCopied = createAsyncThunk(
  'schema/pasteCopied',
  async (_, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const { clipboard, currentProject, tables } = state.schema;
    if (!clipboard || !currentProject) return;

    const { table } = clipboard;
    const backup = { tables: state.schema.tables, relationships: state.schema.relationships };
    thunkAPI.dispatch(schemaSlice.actions.pushHistory());

    try {
      let baseName = `${table.name}_copy`;
      let count = 1;
      while (tables.some((t) => t.name === (count === 1 ? baseName : `${baseName}_${count}`))) {
        count++;
      }
      const newName = count === 1 ? baseName : `${baseName}_${count}`;

      const res: any = await api.post('/tables', {
        projectId: currentProject.id,
        name: newName,
        x: table.x + 50,
        y: table.y + 50,
        width: table.width,
        height: table.height,
        color: table.color
      });

      if (res.success) {
        const newTable = { ...res.data.table, columns: [] };
        thunkAPI.dispatch(schemaSlice.actions.addTableLocal(newTable));

        const createdCols: Column[] = [];
        for (const col of table.columns) {
          const colRes: any = await api.post('/columns', {
            tableId: newTable.id,
            name: col.name,
            datatype: col.datatype,
            length: col.length,
            nullable: col.nullable,
            primaryKey: col.primaryKey,
            foreignKey: false,
            uniqueKey: col.uniqueKey,
            autoIncrement: col.autoIncrement,
            defaultValue: col.defaultValue,
            comment: col.comment
          });
          if (colRes.success) {
            createdCols.push(colRes.data.column);
          }
        }

        thunkAPI.dispatch(schemaSlice.actions.updateTableColumnsLocal({ tableId: newTable.id, columns: createdCols }));
      }
    } catch (err: any) {
      thunkAPI.dispatch(schemaSlice.actions.rollbackState(backup));
      throw err;
    }
  }
);

export const deleteSelected = createAsyncThunk(
  'schema/deleteSelected',
  async (_, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const { selectedElement } = state.schema;
    if (!selectedElement) return;

    if (selectedElement.type === 'table') {
      await thunkAPI.dispatch(deleteTable(selectedElement.id));
    } else if (selectedElement.type === 'column') {
      await thunkAPI.dispatch(deleteColumn(selectedElement.id));
    } else if (selectedElement.type === 'relationship') {
      await thunkAPI.dispatch(deleteRelationship(selectedElement.id));
    }
  }
);

export const clearSchema = createAsyncThunk(
  'schema/clearSchema',
  async (_, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const { tables, relationships } = state.schema;

    const backup = { tables: state.schema.tables, relationships: state.schema.relationships };
    thunkAPI.dispatch(schemaSlice.actions.pushHistory());

    try {
      const totalDelete = relationships.length + tables.length;
      let deleteCount = 0;

      // Clear current structure relationships first
      for (const rel of relationships) {
        deleteCount++;
        thunkAPI.dispatch(schemaSlice.actions.setImportProgress({
          active: true,
          stage: 'deleting',
          current: deleteCount,
          total: totalDelete
        }));
        try {
          await api.delete(`/relationships/${rel.id}`);
        } catch (err) {
          console.warn(`Ignore delete rel error:`, err);
        }
      }
      // Clear tables
      for (const t of tables) {
        deleteCount++;
        thunkAPI.dispatch(schemaSlice.actions.setImportProgress({
          active: true,
          stage: 'deleting',
          current: deleteCount,
          total: totalDelete
        }));
        try {
          await api.delete(`/tables/${t.id}`);
        } catch (err) {
          console.warn(`Ignore delete table error:`, err);
        }
      }

      thunkAPI.dispatch(schemaSlice.actions.clearSchemaLocal());
      thunkAPI.dispatch(incrementChangeCount());
      thunkAPI.dispatch(schemaSlice.actions.clearImportProgress());
    } catch (err: any) {
      thunkAPI.dispatch(schemaSlice.actions.clearImportProgress());
      thunkAPI.dispatch(schemaSlice.actions.rollbackState(backup));
      throw err;
    }
  }
);

export const importJsonSchema = createAsyncThunk(
  'schema/importJsonSchema',
  async ({ jsonStr, mode = 'replace' }: { jsonStr: string; mode?: 'replace' | 'extend' }, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const { currentProject, tables } = state.schema;
    if (!currentProject) return;

    const data = JSON.parse(jsonStr);
    if (!data.tables || !Array.isArray(data.tables)) {
      throw new Error('Invalid schema format. Missing tables array.');
    }

    const backup = { tables: state.schema.tables, relationships: state.schema.relationships };
    thunkAPI.dispatch(schemaSlice.actions.pushHistory());

    try {
      const tableIdMap: Record<string | number, number> = {};
      const columnIdMap: Record<string | number, number> = {};

      if (mode === 'replace') {
        // ── REPLACE MODE: delete everything first ──────────────────────
        const totalDelete = state.schema.relationships.length + tables.length;
        let deleteCount = 0;

        for (const rel of state.schema.relationships) {
          deleteCount++;
          thunkAPI.dispatch(schemaSlice.actions.setImportProgress({
            active: true, stage: 'deleting', current: deleteCount, total: totalDelete
          }));
          try { await api.delete(`/relationships/${rel.id}`); } catch (err) { /* ignore */ }
        }
        for (const t of tables) {
          deleteCount++;
          thunkAPI.dispatch(schemaSlice.actions.setImportProgress({
            active: true, stage: 'deleting', current: deleteCount, total: totalDelete
          }));
          try { await api.delete(`/tables/${t.id}`); } catch (err) { /* ignore */ }
        }
        thunkAPI.dispatch(schemaSlice.actions.clearSchemaLocal());

      } else {
        // ── EXTEND MODE: seed tableIdMap with existing tables so FK links work ──
        for (const t of tables) {
          tableIdMap[t.name.toLowerCase()] = t.id;
          for (const col of t.columns) {
            columnIdMap[`${t.name.toLowerCase()}.${col.name.toLowerCase()}`] = col.id;
          }
        }

        // Compute offset so new tables don't overlap existing ones
        const existingMaxY = tables.reduce((max, t) => Math.max(max, t.y + 240), 100);
        const yOffset = existingMaxY + 80;

        // Assign offset to incoming tables
        data.tables = data.tables.map((t: any) => ({
          ...t,
          y: (t.y || 100) + yOffset
        }));

        // Skip tables whose name already exists
        const existingNames = new Set(tables.map((t) => t.name.toLowerCase()));
        data.tables = data.tables.filter((t: any) => !existingNames.has(t.name.toLowerCase()));
      }

      // ── CREATE TABLES (both modes) ───────────────────────────────────
      let tableCount = 0;
      for (const t of data.tables) {
        tableCount++;
        thunkAPI.dispatch(schemaSlice.actions.setImportProgress({
          active: true, stage: 'tables', current: tableCount, total: data.tables.length
        }));

        const tableRes: any = await api.post('/tables', {
          projectId: currentProject.id,
          name: t.name,
          x: t.x || 100,
          y: t.y || 100,
          width: t.width || 220,
          height: t.height || 180,
          color: t.color || '#3b82f6'
        });

        if (tableRes.success) {
          const newTable = { ...tableRes.data.table, columns: [] };
          tableIdMap[String(t.id).toLowerCase()] = newTable.id;
          tableIdMap[t.name.toLowerCase()] = newTable.id;
          thunkAPI.dispatch(schemaSlice.actions.addTableLocal(newTable));

          const createdCols: Column[] = [];
          if (t.columns && Array.isArray(t.columns)) {
            for (const col of t.columns) {
              const colRes: any = await api.post('/columns', {
                tableId: newTable.id,
                name: col.name,
                datatype: col.datatype || 'INT',
                length: col.length || null,
                nullable: col.nullable !== false,
                primaryKey: col.primaryKey === true,
                foreignKey: false,
                uniqueKey: col.uniqueKey === true,
                autoIncrement: col.autoIncrement === true,
                defaultValue: col.defaultValue || null,
                comment: col.comment || null
              });

              if (colRes.success) {
                const newCol = colRes.data.column;
                createdCols.push(newCol);
                columnIdMap[`${t.name.toLowerCase()}.${col.name.toLowerCase()}`] = newCol.id;
              }
            }
          }
          thunkAPI.dispatch(schemaSlice.actions.updateTableColumnsLocal({ tableId: newTable.id, columns: createdCols }));
        }
      }

      // ── CREATE RELATIONSHIPS (both modes) ────────────────────────────
      if (data.relationships && Array.isArray(data.relationships)) {
        let relCount = 0;
        for (const rel of data.relationships) {
          relCount++;
          thunkAPI.dispatch(schemaSlice.actions.setImportProgress({
            active: true, stage: 'relationships', current: relCount, total: data.relationships.length
          }));

          const fromTableNameStr = String(rel.fromTableName || '').toLowerCase();
          const toTableNameStr = String(rel.toTableName || '').toLowerCase();
          const fromColNameStr = String(rel.fromColumnName || '').toLowerCase();
          const toColNameStr = String(rel.toColumnName || '').toLowerCase();

          const fromTableId = tableIdMap[fromTableNameStr] || tableIdMap[String(rel.fromTableId).toLowerCase()];
          const toTableId = tableIdMap[toTableNameStr] || tableIdMap[String(rel.toTableId).toLowerCase()];
          const fromColumnId = columnIdMap[`${fromTableNameStr}.${fromColNameStr}`];
          const toColumnId = columnIdMap[`${toTableNameStr}.${toColNameStr}`];

          if (fromTableId && toTableId && fromColumnId && toColumnId) {
            const relRes: any = await api.post('/relationships', {
              projectId: currentProject.id,
              fromTableId, fromColumnId, toTableId, toColumnId,
              relationType: rel.relationType || 'OneToMany',
              onDelete: rel.onDelete || 'CASCADE',
              onUpdate: rel.onUpdate || 'CASCADE'
            });

            if (relRes.success) {
              thunkAPI.dispatch(schemaSlice.actions.addRelationshipLocal(mapRelationship(relRes.data.relationship)));
              await thunkAPI.dispatch(updateColumn({ columnId: fromColumnId, data: { foreignKey: true } }));
            }
          }
        }
      }

      thunkAPI.dispatch(schemaSlice.actions.clearImportProgress());
    } catch (err: any) {
      thunkAPI.dispatch(schemaSlice.actions.clearImportProgress());
      thunkAPI.dispatch(schemaSlice.actions.rollbackState(backup));
      throw err;
    }
  }
);

export const loadVersions = createAsyncThunk(
  'schema/loadVersions',
  async ({ page = 1, limit = 20, type = 'all' }: { page?: number; limit?: number; type?: string }, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const project = state.schema.currentProject;
    if (!project) throw new Error('No active project');
    try {
      const result = await versionApi.getVersions(project.id, page, limit, type);
      return result;
    } catch (err: any) {
      thunkAPI.dispatch(schemaSlice.actions.showToast({ message: err.message || 'Failed to load versions', type: 'error' }));
      throw err;
    }
  }
);

export const saveVersion = createAsyncThunk(
  'schema/saveVersion',
  async ({ name, description }: { name: string; description: string }, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const project = state.schema.currentProject;
    if (!project) throw new Error('No active project');
    try {
      const version = await versionApi.createVersion(project.id, name, description, false);
      thunkAPI.dispatch(schemaSlice.actions.showToast({ message: 'Version snapshot created!', type: 'success' }));
      return version;
    } catch (err: any) {
      thunkAPI.dispatch(schemaSlice.actions.showToast({ message: err.message || 'Failed to save version', type: 'error' }));
      throw err;
    }
  }
);

export const restoreVersion = createAsyncThunk(
  'schema/restoreVersion',
  async (versionId: number, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const project = state.schema.currentProject;
    if (!project) throw new Error('No active project');
    try {
      thunkAPI.dispatch(schemaSlice.actions.showToast({ message: 'Restoring version...', type: 'info' }));
      const restored = await versionApi.restoreVersion(project.id, versionId);
      thunkAPI.dispatch(schemaSlice.actions.showToast({ message: 'Version restored successfully!', type: 'success' }));
      thunkAPI.dispatch(loadVersions({ page: 1, limit: 20, type: 'all' }));
      return restored;
    } catch (err: any) {
      thunkAPI.dispatch(schemaSlice.actions.showToast({ message: err.message || 'Failed to restore version', type: 'error' }));
      throw err;
    }
  }
);

export const deleteVersion = createAsyncThunk(
  'schema/deleteVersion',
  async (versionId: number, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const project = state.schema.currentProject;
    if (!project) throw new Error('No active project');
    try {
      await versionApi.deleteVersion(project.id, versionId);
      thunkAPI.dispatch(schemaSlice.actions.showToast({ message: 'Version deleted', type: 'success' }));
      return versionId;
    } catch (err: any) {
      thunkAPI.dispatch(schemaSlice.actions.showToast({ message: err.message || 'Failed to delete version', type: 'error' }));
      throw err;
    }
  }
);

export const updateVersionDetails = createAsyncThunk(
  'schema/updateVersionDetails',
  async ({ versionId, data }: { versionId: number; data: { name?: string; description?: string; isPinned?: boolean } }, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const project = state.schema.currentProject;
    if (!project) throw new Error('No active project');
    try {
      await versionApi.updateVersion(project.id, versionId, data);
      thunkAPI.dispatch(schemaSlice.actions.showToast({ message: 'Version properties updated', type: 'success' }));
      return { versionId, data };
    } catch (err: any) {
      thunkAPI.dispatch(schemaSlice.actions.showToast({ message: err.message || 'Failed to update version details', type: 'error' }));
      throw err;
    }
  }
);

export const enterPreview = createAsyncThunk(
  'schema/enterPreview',
  async (versionId: number, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const project = state.schema.currentProject;
    if (!project) throw new Error('No active project');
    try {
      thunkAPI.dispatch(schemaSlice.actions.showToast({ message: 'Loading version preview...', type: 'info' }));
      const version = await versionApi.getVersion(project.id, versionId);
      if (version.snapshot) {
        thunkAPI.dispatch(schemaSlice.actions.showToast({ message: `Previewing Version #${version.version_number}`, type: 'success' }));
        return { versionId, snapshot: version.snapshot };
      }
      throw new Error('Snapshot payload is empty');
    } catch (err: any) {
      thunkAPI.dispatch(schemaSlice.actions.showToast({ message: err.message || 'Failed to load preview', type: 'error' }));
      throw err;
    }
  }
);

export const incrementChangeCount = createAsyncThunk(
  'schema/incrementChangeCount',
  async (_, thunkAPI) => {
    const state = thunkAPI.getState() as RootState;
    const project = state.schema.currentProject;
    const count = state.schema.changesCount;
    if (!project) return;

    const newCount = count + 1;
    thunkAPI.dispatch(schemaSlice.actions.setChangesCount(newCount));

    if (newCount >= 100) {
      thunkAPI.dispatch(schemaSlice.actions.setChangesCount(0));
      try {
        await versionApi.createVersion(
          project.id,
          'Auto-save Version',
          'Automatically created snapshot triggered by 100 significant changes',
          true
        );
        thunkAPI.dispatch(loadVersions({ page: 1, limit: 20, type: 'all' }));
      } catch (err) {
        console.error('Failed to create auto-save snapshot:', err);
      }
    }
  }
);

// Slice Definition
export const schemaSlice = createSlice({
  name: 'schema',
  initialState,
  reducers: {
    setProject: (state, action: PayloadAction<Project | null>) => {
      state.currentProject = action.payload;
      state.tables = [];
      state.relationships = [];
      state.selectedElement = null;
      state.history = [];
      state.future = [];
      state.versions = [];
      state.isPreviewMode = false;
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
      if (state.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    setSnapToGrid: (state, action: PayloadAction<boolean>) => {
      state.snapToGrid = action.payload;
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    selectElement: (state, action: PayloadAction<{ type: 'table' | 'column' | 'relationship'; id: number; tableId?: number } | null>) => {
      state.selectedElement = action.payload;
    },
    clearSelection: (state) => {
      state.selectedElement = null;
    },
    pushHistory: (state) => {
      state.history = [...state.history, {
        tables: JSON.parse(JSON.stringify(state.tables)),
        relationships: JSON.parse(JSON.stringify(state.relationships))
      }].slice(-30);
      state.future = [];
    },
    undo: (state) => {
      if (state.history.length === 0) return;
      const previous = state.history[state.history.length - 1];
      state.future = [
        {
          tables: JSON.parse(JSON.stringify(state.tables)),
          relationships: JSON.parse(JSON.stringify(state.relationships))
        },
        ...state.future
      ];
      state.tables = previous.tables;
      state.relationships = previous.relationships;
      state.history = state.history.slice(0, -1);
      state.selectedElement = null;
    },
    redo: (state) => {
      if (state.future.length === 0) return;
      const next = state.future[0];
      state.history = [
        ...state.history,
        {
          tables: JSON.parse(JSON.stringify(state.tables)),
          relationships: JSON.parse(JSON.stringify(state.relationships))
        }
      ];
      state.tables = next.tables;
      state.relationships = next.relationships;
      state.future = state.future.slice(1);
      state.selectedElement = null;
    },
    copySelected: (state) => {
      if (state.selectedElement && state.selectedElement.type === 'table') {
        const table = state.tables.find((t) => t.id === state.selectedElement?.id);
        if (table) {
          state.clipboard = { table: JSON.parse(JSON.stringify(table)) };
        }
      }
    },
    updateTablePositionLocal: (state, action: PayloadAction<{ tableId: number; x: number; y: number }>) => {
      const { tableId, x, y } = action.payload;
      state.tables = state.tables.map((t) => (t.id === tableId ? { ...t, x, y } : t));
    },
    showToast: (state, action: PayloadAction<{ message: string; type?: 'success' | 'error' | 'info' }>) => {
      const { message, type = 'info' } = action.payload;
      state.toast = { message, type };
    },
    hideToast: (state) => {
      state.toast = null;
    },
    exitPreview: (state) => {
      state.isPreviewMode = false;
      state.previewTables = [];
      state.previewRelationships = [];
      state.previewVersionId = null;
      state.toast = { message: 'Returned to active workspace', type: 'info' };
    },
    rollbackState: (state, action: PayloadAction<{ tables: Table[]; relationships: Relationship[] }>) => {
      state.tables = action.payload.tables;
      state.relationships = action.payload.relationships;
    },
    updateTableOptimistic: (state, action: PayloadAction<{ tableId: number; data: Partial<Omit<Table, 'id' | 'columns'>> }>) => {
      const { tableId, data } = action.payload;
      state.tables = state.tables.map((t) => (t.id === tableId ? { ...t, ...data } : t));
    },
    deleteTableOptimistic: (state, action: PayloadAction<number>) => {
      const tableId = action.payload;
      state.tables = state.tables.filter((t) => t.id !== tableId);
      state.relationships = state.relationships.filter((r) => r.fromTableId !== tableId && r.toTableId !== tableId);
      if (state.selectedElement?.id === tableId) {
        state.selectedElement = null;
      }
    },
    addTableLocal: (state, action: PayloadAction<Table>) => {
      state.tables.push(action.payload);
    },
    updateTableColumnsLocal: (state, action: PayloadAction<{ tableId: number; columns: Column[] }>) => {
      const { tableId, columns } = action.payload;
      state.tables = state.tables.map((t) => (t.id === tableId ? { ...t, columns } : t));
    },
    addColumnLocal: (state, action: PayloadAction<{ tableId: number; column: Column }>) => {
      const { tableId, column } = action.payload;
      state.tables = state.tables.map((t) =>
        t.id === tableId ? { ...t, columns: [...t.columns, column] } : t
      );
    },
    updateColumnOptimistic: (state, action: PayloadAction<{ columnId: number; data: Partial<Omit<Column, 'id' | 'tableId'>> }>) => {
      const { columnId, data } = action.payload;
      state.tables = state.tables.map((t) => {
        if (t.columns.some((c) => c.id === columnId)) {
          return {
            ...t,
            columns: t.columns.map((c) => (c.id === columnId ? { ...c, ...data } : c))
          };
        }
        return t;
      });
    },
    deleteColumnOptimistic: (state, action: PayloadAction<number>) => {
      const columnId = action.payload;
      state.tables = state.tables.map((t) => ({
        ...t,
        columns: t.columns.filter((c) => c.id !== columnId)
      }));
      state.relationships = state.relationships.filter((r) => r.fromColumnId !== columnId && r.toColumnId !== columnId);
      if (state.selectedElement?.id === columnId) {
        state.selectedElement = null;
      }
    },
    addRelationshipLocal: (state, action: PayloadAction<Relationship>) => {
      state.relationships.push(action.payload);
    },
    updateRelationshipOptimistic: (state, action: PayloadAction<{ relId: number; data: Partial<Omit<Relationship, 'id' | 'projectId'>> }>) => {
      const { relId, data } = action.payload;
      state.relationships = state.relationships.map((r) => (r.id === relId ? { ...r, ...data } : r));
    },
    deleteRelationshipOptimistic: (state, action: PayloadAction<number>) => {
      const relId = action.payload;
      state.relationships = state.relationships.filter((r) => r.id !== relId);
      if (state.selectedElement?.id === relId) {
        state.selectedElement = null;
      }
    },
    clearSchemaLocal: (state) => {
      state.tables = [];
      state.relationships = [];
      state.selectedElement = null;
    },
    setChangesCount: (state, action: PayloadAction<number>) => {
      state.changesCount = action.payload;
    },
    setImportProgress: (state, action: PayloadAction<SchemaState['importProgress']>) => {
      state.importProgress = action.payload;
    },
    clearImportProgress: (state) => {
      state.importProgress = null;
    },
    toggleSelectTableLocal: (state, action: PayloadAction<number>) => {
      const id = action.payload;
      if (state.selectedTableIds.includes(id)) {
        state.selectedTableIds = state.selectedTableIds.filter((tId) => tId !== id);
      } else {
        state.selectedTableIds.push(id);
      }
    },
    clearSelectedTablesLocal: (state) => {
      state.selectedTableIds = [];
    },
    autoLayout: (state) => {
      if (state.tables.length === 0) return;
      state.history = [...state.history, {
        tables: JSON.parse(JSON.stringify(state.tables)),
        relationships: JSON.parse(JSON.stringify(state.relationships))
      }].slice(-30);
      state.future = [];

      const COLS_COUNT = 5;
      const colHeights = new Array(COLS_COUNT).fill(100);
      const GAP_X = 380;
      const GAP_Y_BUFFER = 100;

      state.tables = state.tables.map((t, idx) => {
        const colIdx = idx % COLS_COUNT;
        const x = 100 + colIdx * GAP_X;
        const y = colHeights[colIdx];
        
        const cardHeight = 100 + t.columns.length * 32;
        colHeights[colIdx] = y + cardHeight + GAP_Y_BUFFER;
        
        api.put(`/tables/${t.id}`, { x, y }).catch(err => console.error(err));

        return { ...t, x, y };
      });
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSchema.fulfilled, (state, action) => {
        state.tables = action.payload.tables;
        state.relationships = action.payload.relationships;
        state.history = [];
        state.future = [];
      })
      .addCase(addTable.pending, (state) => {
        state.isSaving = true;
      })
      .addCase(addTable.fulfilled, (state, action) => {
        state.tables.push(action.payload);
        state.isSaving = false;
      })
      .addCase(addTable.rejected, (state) => {
        state.isSaving = false;
      })
      .addCase(loadVersions.fulfilled, (state, action) => {
        state.versions = action.payload.versions;
        state.totalVersions = action.payload.total;
      })
      .addCase(saveVersion.fulfilled, (state, action) => {
        state.versions = [action.payload, ...state.versions];
        state.totalVersions += 1;
      })
      .addCase(restoreVersion.fulfilled, (state, action) => {
        state.tables = action.payload.tables;
        state.relationships = action.payload.relationships;
        state.isPreviewMode = false;
        state.previewTables = [];
        state.previewRelationships = [];
        state.previewVersionId = null;
        state.selectedElement = null;
      })
      .addCase(deleteVersion.fulfilled, (state, action) => {
        state.versions = state.versions.filter((v) => v.id !== action.payload);
        state.totalVersions -= 1;
      })
      .addCase(updateVersionDetails.fulfilled, (state, action) => {
        const { versionId, data } = action.payload;
        state.versions = state.versions.map((v) =>
          v.id === versionId
            ? {
                ...v,
                version_name: data.name !== undefined ? data.name : v.version_name,
                description: data.description !== undefined ? data.description : v.description,
                is_pinned: data.isPinned !== undefined ? data.isPinned : v.is_pinned
              }
            : v
        );
      })
      .addCase(enterPreview.fulfilled, (state, action) => {
        state.isPreviewMode = true;
        state.previewTables = action.payload.snapshot.tables;
        state.previewRelationships = action.payload.snapshot.relationships;
        state.previewVersionId = action.payload.versionId;
        state.selectedElement = null;
      })
      .addCase(addRelationship.pending, (state) => {
        state.isSaving = true;
      })
      .addCase(addRelationship.fulfilled, (state) => {
        state.isSaving = false;
      })
      .addCase(addRelationship.rejected, (state) => {
        state.isSaving = false;
      })
      .addCase(clearSchema.pending, (state) => {
        state.isSaving = true;
      })
      .addCase(clearSchema.fulfilled, (state) => {
        state.isSaving = false;
      })
      .addCase(clearSchema.rejected, (state) => {
        state.isSaving = false;
      });
  }
});

// Configure Redux Store
export const store = configureStore({
  reducer: {
    schema: schemaSlice.reducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

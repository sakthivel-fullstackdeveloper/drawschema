export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Project {
  id: number;
  name: string;
  userId?: number;
  created_at: string;
  updated_at: string;
}

export type DataType =
  | 'INT' | 'INT[]'
  | 'BIGINT' | 'BIGINT[]'
  | 'VARCHAR' | 'VARCHAR[]'
  | 'TEXT' | 'TEXT[]'
  | 'BOOLEAN' | 'BOOLEAN[]'
  | 'DATE' | 'DATE[]'
  | 'DATETIME' | 'DATETIME[]'
  | 'TIMESTAMP' | 'TIMESTAMP[]'
  | 'FLOAT' | 'FLOAT[]'
  | 'DOUBLE' | 'DOUBLE[]'
  | 'DECIMAL' | 'DECIMAL[]'
  | 'JSON' | 'JSON[]'
  | 'UUID' | 'UUID[]'
  | 'ENUM' | 'ENUM[]';

export interface Column {
  id: number;
  tableId: number;
  name: string;
  datatype: DataType;
  length: string | null;
  nullable: boolean;
  primaryKey: boolean;
  foreignKey: boolean;
  uniqueKey: boolean;
  autoIncrement: boolean;
  defaultValue: string | null;
  comment: string | null;
}

export interface Table {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  columns: Column[];
}

export type RelationType = 'OneToOne' | 'OneToMany' | 'ManyToOne' | 'ManyToMany';
export type ReferentialRule = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';

export interface Relationship {
  id: number;
  projectId: number;
  fromTableId: number;
  fromColumnId: number;
  toTableId: number;
  toColumnId: number;
  relationType: RelationType;
  onDelete: ReferentialRule;
  onUpdate: ReferentialRule;
}

export interface ProjectVersion {
  id: number;
  project_id: number;
  version_number: number;
  version_name: string | null;
  description: string | null;
  tables_count: number;
  relationships_count: number;
  is_pinned: boolean;
  is_auto_save: boolean;
  created_by: number;
  created_at: string;
  snapshot?: {
    tables: Table[];
    relationships: Relationship[];
    viewport?: any;
    projectSettings?: any;
  } | null;
}

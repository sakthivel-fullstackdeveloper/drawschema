import api from './api';

export interface ColumnDefinition {
  name: string;
  datatype: string;
  length?: string;
  nullable?: boolean;
  primaryKey?: boolean;
  foreignKey?: boolean;
  uniqueKey?: boolean;
  autoIncrement?: boolean;
  defaultValue?: string;
  comment?: string;
}

export type AIAction =
  | {
      type: 'CREATE_TABLE';
      name: string;
      columns: ColumnDefinition[];
      color?: string;
    }
  | {
      type: 'ADD_COLUMN';
      tableName: string;
      column: ColumnDefinition;
    }
  | {
      type: 'RENAME_COLUMN';
      tableName: string;
      oldColumnName: string;
      newColumnName: string;
    }
  | {
      type: 'UPDATE_COLUMN';
      tableName: string;
      columnName: string;
      updates: Partial<ColumnDefinition>;
    }
  | {
      type: 'CREATE_RELATIONSHIP';
      fromTable: string;
      fromColumn: string;
      toTable: string;
      toColumn: string;
      relationType: 'OneToOne' | 'OneToMany' | 'ManyToOne' | 'ManyToMany';
      onDelete?: string;
      onUpdate?: string;
    }
  | {
      type: 'EXPLAIN_SCHEMA';
      focusTables?: string[];
    }
  | {
      type: 'ANALYZE_SCHEMA';
    };

export interface AICommandResponse {
  success: boolean;
  message: string;
  data: {
    explanation: string;
    actions: AIAction[];
    errors?: string[];
  };
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Sends a natural language prompt to generate an AI Action Plan for preview.
 * This endpoint NEVER modifies the database.
 * Supports AbortSignal for immediate client-side cancellation.
 */
export const generateAIActionPlan = async (
  projectId: number,
  prompt: string,
  history: ChatTurn[] = [],
  signal?: AbortSignal
): Promise<AICommandResponse> => {
  const response: any = await api.post(
    '/ai/command',
    { projectId, prompt, history },
    { signal }
  );
  return response;
};

export interface AIExecutionResponse {
  success: boolean;
  message: string;
  data: {
    schema: {
      tables: any[];
      relationships: any[];
    };
    summary: {
      tablesCreated: number;
      columnsAdded: number;
      columnsRenamed: number;
      columnsUpdated: number;
      relationshipsCreated: number;
    };
  };
}

/**
 * Executes an approved AI Action Plan atomically within a single backend transaction.
 * Returns the authoritative updated schema with confirmed database IDs.
 */
export const executeAIActionPlan = async (
  projectId: number,
  actionPlan: { explanation: string; actions: AIAction[] }
): Promise<AIExecutionResponse> => {
  const response: any = await api.post('/ai/execute-plan', { projectId, actionPlan });
  return response;
};

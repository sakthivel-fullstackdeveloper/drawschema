import api from './api';
import type { ProjectVersion, Table, Relationship } from '../types';

export const getVersions = async (
  projectId: number,
  page: number = 1,
  limit: number = 20,
  type: string = 'all'
): Promise<{ versions: ProjectVersion[]; total: number }> => {
  const response: any = await api.get(`/projects/${projectId}/versions`, {
    params: { page, limit, type }
  });
  return {
    versions: response.data.versions,
    total: response.data.total
  };
};

export const getVersion = async (projectId: number, versionId: number): Promise<ProjectVersion> => {
  const response: any = await api.get(`/projects/${projectId}/versions/${versionId}`);
  return response.data.version;
};

export const createVersion = async (
  projectId: number,
  name?: string,
  description?: string,
  isAutoSave?: boolean
): Promise<ProjectVersion> => {
  const response: any = await api.post(`/projects/${projectId}/versions`, {
    name,
    description,
    isAutoSave
  });
  return response.data.version;
};

export const updateVersion = async (
  projectId: number,
  versionId: number,
  data: { name?: string; description?: string; isPinned?: boolean }
): Promise<void> => {
  await api.put(`/projects/${projectId}/versions/${versionId}`, data);
};

export const deleteVersion = async (projectId: number, versionId: number): Promise<void> => {
  await api.delete(`/projects/${projectId}/versions/${versionId}`);
};

export const restoreVersion = async (
  projectId: number,
  versionId: number
): Promise<{ tables: Table[]; relationships: Relationship[] }> => {
  const response: any = await api.post(`/projects/${projectId}/versions/${versionId}/restore`);
  return {
    tables: response.data.tables,
    relationships: response.data.relationships
  };
};

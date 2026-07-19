import api from './api';
import type { Project } from '../types';

export const getProjects = async (): Promise<Project[]> => {
  const response: any = await api.get('/projects');
  return response.data.projects;
};

export const getProject = async (id: number): Promise<Project> => {
  const response: any = await api.get(`/projects/${id}`);
  return response.data.project;
};

export const createProject = async (name: string): Promise<Project> => {
  const response: any = await api.post('/projects', { name });
  return response.data.project;
};

export const renameProject = async (id: number, name: string): Promise<void> => {
  await api.put(`/projects/${id}`, { name });
};

export const deleteProject = async (id: number): Promise<void> => {
  await api.delete(`/projects/${id}`);
};

export const duplicateProject = async (id: number): Promise<Project> => {
  const response: any = await api.post(`/projects/${id}/duplicate`);
  return response.data.project;
};

// Shared types for client app

export interface Board {
  id: number | string;
  name: string;
  type?: string;
  project_id?: string | number;
  created_at?: string;
  [key: string]: any;
}

export interface User {
  id: number | string;
  name: string;
  email?: string;
  avatar?: string;
  role_name?: string;
  [key: string]: any;
}

export interface Member extends User {
  role_name?: string;
}

export interface Project {
  id: number | string;
  name: string;
  img_url?: string;
  created_at?: string;
  workspace_id?: number | string;
  workspace?: Workspace | null;
  [key: string]: any;
}

export interface Workspace {
  id: number | string;
  name: string;
  image?: string;
  projects?: Project[];
  created_at?: string;
  [key: string]: any;
}

export interface Page {
  id: number | string;
  title: string;
  content?: string;
  parent_id?: number | string | null;
  children?: Page[];
  [key: string]: any;
}

export interface Issue {
  id: number | string;
  title: string;
  content?: string;
  status?: string;
  members?: Member[];
  created_at?: string;
  [key: string]: any;
}

export interface ChatRoom {
  id: number | string;
  name: string;
  project_id?: number | string;
  creator_id?: number | string;
  created_at?: string;
  [key: string]: any;
}

export interface Message {
  id: number | string;
  content: string;
  creator_name?: string;
  creator_img?: string;
  created_at?: string;
  [key: string]: any;
}

// add more domain types as needed

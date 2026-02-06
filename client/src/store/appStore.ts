import { createStore } from "solid-js/store";

interface AppState {
  currentProjectId?: string | null;
  currentWorkspaceId?: string | null;
  currentUser?: any;
}

const [appState, setAppState] = createStore<AppState>({
  currentProjectId: null,
  currentWorkspaceId: null,
  currentUser: null,
});

export const setCurrentProjectId = (id?: string | null) => setAppState("currentProjectId", id || null);
export const setCurrentWorkspaceId = (id?: string | null) => setAppState("currentWorkspaceId", id || null);
export const setCurrentUser = (user: any) => setAppState("currentUser", user);

export const getCurrentProjectId = () => appState.currentProjectId;
export const getCurrentWorkspaceId = () => appState.currentWorkspaceId;
export const getCurrentUser = () => appState.currentUser;

export default appState;

import { publicRoutes } from "./public";
import { projectRoutes } from "./project";
import { workspaceRoutes } from "./workspace";

export const routes = [...publicRoutes, ...workspaceRoutes, ...projectRoutes];

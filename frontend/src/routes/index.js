import { publicRoutes } from "./public";
import { projectRoutes } from "./project";
import { workspaceRoutes } from "./workspace";
import { adminRoutes } from "./admin";

export const routes = [...publicRoutes, ...workspaceRoutes, ...projectRoutes, ...adminRoutes];

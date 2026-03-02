import TaskDetailPage from "../views/project/TaskDetailPage.vue";
import KanbanHomePage from "../views/project/KanbanHomePage.vue";
import KanbanLayout from "../views/project/KanbanLayout.vue";
import WikiLayout from "../views/project/WikiLayout.vue";
import MessengerLayout from "../views/project/MessengerLayout.vue";
import ProjectLayout from "../views/project/ProjectLayout.vue";
import KanbanPage from "../views/project/KanbanPage.vue";
import GanttPage from "../views/project/GanttPage.vue";
import WikiHomePage from "../views/project/WikiHomePage.vue";
import WikiPage from "../views/project/WikiPage.vue";
import ChannelHomePage from "../views/project/ChannelHomePage.vue";
import ChannelArchivePage from "../views/project/ChannelArchivePage.vue";
import ChannelRoomPage from "../views/project/ChannelRoomPage.vue";
import ChannelSettingsPage from "../views/project/ChannelSettingsPage.vue";
import KanbanSettingsPage from "../views/project/KanbanSettingsPage.vue";
import ProjectSettingsLayout from "../views/project/ProjectSettingsLayout.vue";
import ProjectSettingsHomePage from "../views/project/ProjectSettingsHomePage.vue";
import ProjectSettingsMemberPage from "../views/project/ProjectSettingsMemberPage.vue";
import NotificationHistoryPage from "../views/project/NotificationHistoryPage.vue";
import BlankPage from "../views/project/BlankPage.vue";
import BacklogPage from "../views/project/BacklogPage.vue";

export const projectRoutes = [
  {
    path: "/project/:projectId",
    component: ProjectLayout,
    children: [
      {
        path: "",
        beforeEnter: async (to, from) => {
          const { projectId } = to.params;
          return `/project/${projectId}/kanban`;
        },
        component: BlankPage,
      },
      {
        path: "kanban",
        component: KanbanLayout,
        children: [
          {
            path: "",
            component: KanbanHomePage,
          },
          {
            path: "gantt",
            component: GanttPage,
          },
          {
            path: ":kanbanId",
            component: KanbanPage,
          },
          {
            path: ":kanbanId/settings",
            component: KanbanSettingsPage,
          },
          {
            path: ":kanbanId/task/:taskId",
            component: TaskDetailPage,
          },
          {
            path: "backlog",
            component: BacklogPage,
          },
        ],
      },

      {
        path: "wiki",
        component: WikiLayout,
        children: [
          {
            path: "",
            component: WikiHomePage,
          },
          {
            path: ":pageId",
            component: WikiPage,
          },
        ],
      },
      {
        path: "channel",
        component: MessengerLayout,
        children: [
          {
            path: "",
            component: ChannelHomePage,
          },
          {
            path: "archive",
            component: ChannelArchivePage,
          },
          {
            path: ":roomId/settings",
            component: ChannelSettingsPage,
          },
          {
            path: ":roomId",
            component: ChannelRoomPage,
          },
        ],
      },
      {
        path: "settings",
        meta: { requiresProjectAdmin: true },
        component: ProjectSettingsLayout,
        children: [
          {
            path: "",
            component: ProjectSettingsHomePage,
          },
          {
            path: "member",
            component: ProjectSettingsMemberPage,
          },
          {
            path: "notifications",
            component: NotificationHistoryPage,
          },
        ],
      },
    ],
  },
];

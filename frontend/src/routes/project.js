import IssueDetailPage from "../views/project/IssueDetailPage.vue";
import BoardHomePage from "../views/project/BoardHomePage.vue";
import BoardLayout from "../views/project/BoardLayout.vue";
import WikiLayout from "../views/project/WikiLayout.vue";
import MessengerLayout from "../views/project/MessengerLayout.vue";
import ProjectLayout from "../views/project/ProjectLayout.vue";
import BoardPage from "../views/project/BoardPage.vue";
import BoardSettingsPage from "../views/project/BoardSettingsPage.vue";
import WikiHomePage from "../views/project/WikiHomePage.vue";
import WikiPage from "../views/project/WikiPage.vue";
import ChannelHomePage from "../views/project/ChannelHomePage.vue";
import ChannelArchivePage from "../views/project/ChannelArchivePage.vue";
import ChannelRoomPage from "../views/project/ChannelRoomPage.vue";
import ChannelSettingsPage from "../views/project/ChannelSettingsPage.vue";
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
          return `/project/${projectId}/board`;
        },
        component: BlankPage,
      },
      {
        path: "board",
        component: BoardLayout,
        children: [
          {
            path: "",
            component: BoardHomePage,
          },
          {
            path: ":boardId",
            component: BoardPage,
          },
          {
            path: ":boardId/settings",
            component: BoardSettingsPage,
          },
          {
            path: ":boardId/issue/:issueId",
            component: IssueDetailPage,
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

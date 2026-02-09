<template>
  <div class="WorkspaceLayout">
    <header :style="gnbStyle">
      <div class="left">
        <span class="projectName">{{ projectName || "프로젝트" }}</span>
        <template v-if="projectId">
          <nav class="mainnav">
            <router-link
              class="mainnav-link"
              :to="`/workspace/${workspaceId}/project/${projectId}/board`"
            >
              <MaterialSymbol name="view_kanban" :size="20" alt="" />
              <span>보드</span>
            </router-link>
            <router-link
              class="mainnav-link"
              :to="`/workspace/${workspaceId}/project/${projectId}/wiki`"
            >
              <MaterialSymbol name="menu_book" :size="20" alt="" />
              <span>위키</span>
            </router-link>
            <router-link
              class="mainnav-link"
              :to="`/workspace/${workspaceId}/project/${projectId}/messenger`"
            >
              <MaterialSymbol name="chat_bubble" :size="20" alt="" />
              <span>메신저</span>
            </router-link>
          </nav>
        </template>
      </div>
      <nav class="utilnav">
        <router-link :to="`/workspace/${workspaceId}/project/${projectId}/settings`"
          >설정</router-link
        >
        <router-link to="/account">계정</router-link>
      </nav>
    </header>
    <router-view></router-view>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { useAppStore } from "../stores/appStore";
import MaterialSymbol from "../components/MaterialSymbol.vue";

const route = useRoute();
const router = useRouter();
const selectedProjectId = ref("");
const workspaceStore = useWorkspaceStore();
const appStore = useAppStore();
const { gnbPreviewTheme } = storeToRefs(appStore);

const workspaceId = computed(() => route.params.workspaceId);
const projectId = computed(() => route.params.projectId);

const projects = computed(() => workspaceStore.getProjects(workspaceId.value));
const currentProject = computed(() => {
  if (!projectId.value) return "";
  const list = projects.value || [];
  return list.find((project) => String(project.id) === String(projectId.value)) || null;
});
const projectName = computed(() => currentProject.value?.name || "");
const gnbStyle = computed(() => {
  const preview = gnbPreviewTheme.value;
  const theme = currentProject.value?.theme_json?.gnb;
  const background = preview?.background || theme?.background || "#ffffff";
  const foreground = preview?.foreground || theme?.foreground || "#111827";
  return {
    "--gnb-bg": background,
    "--gnb-fg": foreground,
  };
});

const fetchWorkspace = async () => {
  if (!workspaceId.value) return;
  await workspaceStore.fetchWorkspace(workspaceId.value);
};

const fetchProjects = async () => {
  if (!workspaceId.value) {
    selectedProjectId.value = "";
    return;
  }

  await workspaceStore.fetchProjects(workspaceId.value);
  selectedProjectId.value = projectId.value ? String(projectId.value) : "";
};

const handleProjectChange = () => {
  if (!selectedProjectId.value || !workspaceId.value) {
    return;
  }

  router.push(`/workspace/${workspaceId.value}/project/${selectedProjectId.value}/board`);
};

onMounted(() => {
  fetchWorkspace();
  fetchProjects();
});

watch(
  () => route.params.workspaceId,
  () => {
    fetchWorkspace();
    fetchProjects();
  }
);

watch(
  () => route.params.projectId,
  (newProjectId) => {
    selectedProjectId.value = newProjectId ? String(newProjectId) : "";
  }
);
</script>

<style scoped>
.projectName {
  font-weight: 600;
  font-size: 20px;
  text-transform: capitalize;
}

.mainnav-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 4px 12px;
  border-radius: 4px;
  color: var(--gnb-fg);
  text-decoration: none;
  font-size: 16px;
}

.mainnav-link:hover {
  background-color: color-mix(in srgb, var(--gnb-bg) 95%, var(--gnb-fg) 5%);
}

.mainnav-link.router-link-active {
  background-color: color-mix(in srgb, var(--gnb-bg) 90%, var(--gnb-fg) 10%);
  font-weight: 600;
}
</style>

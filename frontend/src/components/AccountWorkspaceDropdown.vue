<template>
  <div v-if="isAuthenticated" class="account-menu" ref="menuRef">
    <button
      type="button"
      class="account-menu__trigger"
      :aria-label="t('layout.default.util.accountMenu')"
      :aria-expanded="isMenuOpen ? 'true' : 'false'"
      @click="toggleMenu"
    >
      <Avatar
        :text="accountInitials"
        :label="accountLabel"
        :image-url="accountImageUrl"
        :size="32"
      />
    </button>

    <div v-if="isMenuOpen" class="account-menu__panel" role="menu">
      <div class="account-menu__header">
        <router-link class="account-menu__profile-link" to="/settings/profile" @click="closeMenu">
          {{ t("layout.default.util.profile") }}
        </router-link>
      </div>

      <p class="account-menu__caption">{{ t("layout.default.util.quickMove") }}</p>

      <p v-if="isMenuLoading" class="account-menu__status">
        {{ t("layout.default.util.loading") }}
      </p>
      <p v-else-if="menuError" class="account-menu__status account-menu__status--error">
        {{ menuError }}
      </p>
      <ul v-else-if="workspaceItems.length" class="account-menu__tree">
        <li v-for="workspace in workspaceItems" :key="workspace.id" class="account-menu__workspace">
          <div class="account-menu__workspace-head">
            <Avatar
              :text="getWorkspaceInitials(workspace)"
              :label="workspace.name || 'Workspace'"
              :image-url="workspace.img_url || ''"
              :size="24"
            />
            <router-link
              class="account-menu__workspace-link"
              :to="`/settings/workspaces/${workspace.id}`"
              @click="closeMenu"
            >
              {{ workspace.name }}
            </router-link>
          </div>
          <ul v-if="workspace.projects.length" class="account-menu__projects">
            <li v-for="project in workspace.projects" :key="project.id">
              <router-link
                class="account-menu__project-link"
                :to="`/project/${project.id}`"
                @click="closeMenu"
              >
                {{ project.name }}
              </router-link>
            </li>
          </ul>
          <p v-else class="account-menu__empty">{{ t("layout.default.util.emptyProjects") }}</p>
        </li>
      </ul>
      <div v-else class="account-menu__status-wrap">
        <p class="account-menu__status">
          {{ t("layout.default.util.emptyWorkspaces") }}
        </p>
        <router-link class="account-menu__empty-link" to="/settings/workspaces" @click="closeMenu">
          {{ t("layout.account.nav.workspaces") }}
        </router-link>
      </div>

      <div class="account-menu__footer">
        <button
          type="button"
          class="account-menu__logout-btn"
          :disabled="isLoggingOut"
          @click="logout"
        >
          {{ isLoggingOut ? t("profile.actions.loggingOut") : t("profile.actions.logout") }}
        </button>
        <p v-if="logoutError" class="account-menu__status account-menu__status--error">
          {{ logoutError }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useAppStore } from "../stores/appStore";
import api from "../lib/axios";
import Avatar from "./Avatar.vue";

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const isAuthenticated = computed(() => Boolean(appStore.currentUser));
const currentMemberId = computed(() => appStore.currentUser?.id || null);

const menuRef = ref(null);
const isMenuOpen = ref(false);
const isMenuLoading = ref(false);
const menuError = ref("");
const loadedMemberId = ref(null);
const hasLoadedTree = ref(false);
const inflightLoad = ref(null);
const workspaceItems = ref([]);
const isLoggingOut = ref(false);
const logoutError = ref("");

const accountInitials = computed(() => {
  const name = appStore.currentUser?.name || "";
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
});

const accountLabel = computed(() => appStore.currentUser?.name || t("layout.default.util.account"));
const accountImageUrl = computed(() => String(appStore.currentUser?.img_url || ""));

const getWorkspaceInitials = (workspace) => {
  const name = String(workspace?.name || "").trim();
  if (!name) return "W";
  return name.slice(0, 2).toUpperCase();
};

const closeMenu = () => {
  isMenuOpen.value = false;
  document.removeEventListener("click", onDocumentClick);
};

const onDocumentClick = (event) => {
  if (!isMenuOpen.value) return;
  const target = event.target;
  if (!menuRef.value || menuRef.value.contains(target)) return;
  closeMenu();
};

const ensureWorkspaceTree = async ({ force = false } = {}) => {
  const memberId = currentMemberId.value;
  if (!memberId) return;

  const isSameMemberLoaded =
    hasLoadedTree.value && String(loadedMemberId.value) === String(memberId);
  if (!force && isSameMemberLoaded) return;
  if (inflightLoad.value) {
    await inflightLoad.value;
    return;
  }

  isMenuLoading.value = true;
  menuError.value = "";

  inflightLoad.value = (async () => {
    try {
      const workspaceRes = await api.get("/workspaces/my");
      const workspaces = Array.isArray(workspaceRes.data) ? workspaceRes.data : [];

      const projectsPerWorkspace = await Promise.all(
        workspaces.map(async (workspace) => {
          const projectsRes = await api.get(`/projects?workspaceId=${workspace.id}`);
          const projects = Array.isArray(projectsRes.data) ? projectsRes.data : [];
          return {
            ...workspace,
            projects,
          };
        })
      );

      workspaceItems.value = projectsPerWorkspace;
      loadedMemberId.value = memberId;
      hasLoadedTree.value = true;
    } catch (error) {
      workspaceItems.value = [];
      menuError.value = error?.response?.data?.message || t("layout.default.util.errorLoad");
    } finally {
      isMenuLoading.value = false;
      inflightLoad.value = null;
    }
  })();

  await inflightLoad.value;
};

const toggleMenu = async () => {
  if (!isAuthenticated.value) return;

  if (isMenuOpen.value) {
    closeMenu();
    return;
  }

  isMenuOpen.value = true;
  await ensureWorkspaceTree();

  await nextTick();
  document.removeEventListener("click", onDocumentClick);
  document.addEventListener("click", onDocumentClick);
};

const logout = async () => {
  if (isLoggingOut.value) return;
  isLoggingOut.value = true;
  logoutError.value = "";

  try {
    await api.post("/members/logout");
    appStore.setCurrentUser(null);
    closeMenu();
    await router.push("/login");
  } catch (error) {
    logoutError.value = error?.response?.data?.message || t("profile.status.logoutError");
  } finally {
    isLoggingOut.value = false;
  }
};

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
});

watch(
  () => [isAuthenticated.value, currentMemberId.value],
  ([authed, memberId], prev = []) => {
    const [prevAuthed, prevMemberId] = prev;
    if (!authed || !memberId) {
      closeMenu();
      workspaceItems.value = [];
      hasLoadedTree.value = false;
      loadedMemberId.value = null;
      inflightLoad.value = null;
      return;
    }

    if (String(memberId) !== String(prevMemberId) || !prevAuthed) {
      hasLoadedTree.value = false;
      loadedMemberId.value = null;
      ensureWorkspaceTree();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.account-menu {
  position: relative;
}

.account-menu__trigger {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.account-menu__panel {
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  width: 320px;
  max-height: min(70vh, 520px);
  overflow: auto;
  background-color: var(--color-page-bg);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.12);
  padding: 10px;
  z-index: 20;
  color: var(--color-text);
}

.account-menu__panel a {
  color: var(--color-text);
}

.account-menu__header {
  display: flex;
  gap: 8px;
  padding: 4px 2px 10px;
  border-bottom: 1px solid var(--color-divider);
}

.account-menu__caption {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
  padding: 8px 2px 2px;
}

.account-menu__profile-link {
  font-size: 14px;
  color: var(--color-text) !important;
  text-decoration: none;
}

.account-menu__profile-link:hover {
  text-decoration: underline;
}

.account-menu__status {
  margin: 12px 2px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.account-menu__status-wrap {
  margin: 12px 2px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.account-menu__status--error {
  color: var(--color-danger);
}

.account-menu__tree {
  list-style: none;
  margin: 0;
  padding: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.account-menu__workspace {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px;
  background-color: var(--color-surface);
}

.account-menu__workspace-link {
  display: inline-flex;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text) !important;
  text-decoration: none;
}

.account-menu__workspace-head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.account-menu__workspace-link:hover,
.account-menu__project-link:hover {
  text-decoration: underline;
}

.account-menu__projects {
  list-style: none;
  margin: 0;
  margin-top: 4px;
  padding: 0 0 0 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.account-menu__project-link {
  font-size: 13px;
  color: var(--color-text) !important;
  text-decoration: none;
}

.account-menu__empty {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.account-menu__empty-link {
  font-size: 13px;
  color: var(--color-accent);
  text-decoration: none;
}

.account-menu__empty-link:hover {
  text-decoration: underline;
}

.account-menu__footer {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--color-divider);
}

.account-menu__logout-btn {
  width: 100%;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  cursor: pointer;
}

.account-menu__logout-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.account-menu__logout-btn:hover:not(:disabled) {
  background: var(--color-surface-muted);
  color: var(--color-text);
  border-color: var(--color-divider);
}
</style>

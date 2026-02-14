<template>
  <BaseModal
    :open="open"
    :title="t('profile.danger.guide.title')"
    max-width="760px"
    @close="handleClose"
  >
    <div class="ownership-guide">
      <p class="ownership-guide__desc">{{ t("profile.danger.guide.description") }}</p>
      <p v-if="isLoading" class="ownership-guide__empty">
        {{ t("profile.danger.guide.loading") }}
      </p>
      <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>
      <ul v-else-if="ownershipItems.length" class="ownership-guide__list">
        <li
          v-for="item in ownershipItems"
          :key="`${item.type}-${item.id}`"
          class="ownership-guide__item"
        >
          <div class="ownership-guide__item-main">
            <Tag variant="danger">{{ item.typeLabel }}</Tag>
            <span class="title">{{ item.name }}</span>
          </div>
          <router-link
            v-if="item.route"
            class="ownership-guide__link"
            :to="item.route"
            @click="handleClose"
          >
            {{ t("profile.danger.guide.open") }}
          </router-link>
        </li>
      </ul>
      <p v-else class="ownership-guide__empty">{{ t("profile.danger.guide.empty") }}</p>
      <div class="ownership-guide__actions">
        <button type="button" class="btn btn--secondary" @click="handleClose">
          {{ t("profile.danger.guide.close") }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import api from "../../lib/axios";
import BaseModal from "../BaseModal.vue";
import Tag from "../Tag.vue";

const { t } = useI18n();

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(["close"]);

const ownershipResources = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");

const ownershipItems = computed(() => {
  const resources = Array.isArray(ownershipResources.value) ? ownershipResources.value : [];
  return resources.map((resource) => {
    let typeLabel = "";
    let route = "";

    if (resource.type === "workspace") {
      typeLabel = t("profile.danger.guide.types.workspace");
      route = `/settings/workspaces/${resource.id}`;
    } else if (resource.type === "project") {
      typeLabel = t("profile.danger.guide.types.project");
      route = `/project/${resource.id}`;
    } else if (resource.type === "page") {
      typeLabel = t("profile.danger.guide.types.page");
      route = resource.project_id ? `/project/${resource.project_id}/wiki/${resource.id}` : "";
    } else if (resource.type === "board") {
      typeLabel = t("profile.danger.guide.types.board");
      route = resource.project_id ? `/project/${resource.project_id}/board/${resource.id}` : "";
    } else if (resource.type === "channel") {
      typeLabel = t("profile.danger.guide.types.channel");
      route = resource.project_id ? `/project/${resource.project_id}/messenger/${resource.id}` : "";
    }

    return {
      type: resource.type,
      id: resource.id,
      name: resource.name || resource.title || "",
      typeLabel,
      route,
    };
  });
});

const handleClose = () => {
  emit("close");
};

const fetchOwnershipResources = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get("/members/me/owned-resources");
    // Handle both array response and object with resources property
    if (Array.isArray(res.data)) {
      ownershipResources.value = res.data;
    } else if (res.data && Array.isArray(res.data.resources)) {
      ownershipResources.value = res.data.resources;
    } else {
      ownershipResources.value = [];
    }
  } catch (error) {
    ownershipResources.value = [];
    errorMessage.value = t("profile.danger.guide.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

// Fetch ownership resources when modal opens
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      fetchOwnershipResources();
    }
  }
);
</script>

<style scoped>
.ownership-guide {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ownership-guide__desc {
  margin: 0;
  color: var(--color-text-muted);
}

.ownership-guide__empty {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-muted);
}

.status.error {
  color: var(--color-danger);
  text-align: center;
  padding: 1rem;
}

.ownership-guide__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

@media (max-width: 768px) {
  .ownership-guide__list {
    grid-template-columns: 1fr;
  }
}

.ownership-guide__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-surface);
}

.ownership-guide__item-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.ownership-guide__item-main .title {
  font-weight: 500;
}

.ownership-guide__link {
  color: var(--color-primary);
  text-decoration: none;
  font-size: 0.875rem;
}

.ownership-guide__link:hover {
  text-decoration: underline;
}

.ownership-guide__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}
</style>

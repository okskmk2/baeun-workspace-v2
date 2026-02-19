<template>
  <BaseModal :open="open" :title="t('messenger.layout.modal.title')" @close="handleClose">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <label for="channel-type">{{ t("messenger.layout.modal.typeLabel") }}</label>
      <select id="channel-type" v-model="form.type">
        <option value="GENERAL">{{ t("messenger.layout.modal.types.general") }}</option>
        <option value="DM">{{ t("messenger.layout.modal.types.dm") }}</option>
        <option value="AGENT">{{ t("messenger.layout.modal.types.agent") }}</option>
      </select>

      <label v-if="form.type !== 'DM'" for="channel-name">{{ t("messenger.layout.modal.nameLabel") }}</label>
      <input
        v-if="form.type !== 'DM'"
        id="channel-name"
        v-model.trim="form.name"
        type="text"
        :placeholder="t('messenger.layout.modal.namePlaceholder')"
      />

      <template v-if="form.type === 'DM'">
        <label for="dm-target">{{ t("messenger.layout.modal.dmTargetLabel") }}</label>
        <select id="dm-target" v-model="form.targetMemberId">
          <option value="">{{ t("messenger.layout.modal.dmTargetPlaceholder") }}</option>
          <option v-for="member in dmCandidates" :key="member.id" :value="String(member.id)">
            {{ member.name }}
          </option>
        </select>
      </template>

      <template v-if="form.type === 'AGENT'">
        <label for="agent-key">{{ t("messenger.layout.modal.agentKeyLabel") }}</label>
        <input
          id="agent-key"
          v-model.trim="form.agentKey"
          type="text"
          :placeholder="t('messenger.layout.modal.agentKeyPlaceholder')"
        />
      </template>

      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="handleClose">
          {{ t("messenger.layout.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{
            isCreating
              ? t("messenger.layout.actions.creating")
              : t("messenger.layout.actions.create")
          }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import api from "../../lib/axios";
import { addToast } from "../../lib/toast";
import BaseModal from "../BaseModal.vue";

const { t } = useI18n();
const router = useRouter();

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  projectId: {
    type: [Number, String],
    required: true,
  },
  projectMembers: {
    type: Array,
    default: () => [],
  },
  currentUserId: {
    type: [Number, String, null],
    default: null,
  },
});

const emit = defineEmits(["close", "created"]);

const form = ref({
  type: "GENERAL",
  name: "",
  targetMemberId: "",
  agentKey: "",
});
const isCreating = ref(false);
const formError = ref("");

const dmCandidates = computed(() =>
  (props.projectMembers || []).filter(
    (member) => String(member.id) !== String(props.currentUserId)
  )
);

const handleClose = () => {
  emit("close");
};

const handleSubmit = async () => {
  if (form.value.type === "DM") {
    if (!form.value.targetMemberId) {
      formError.value = t("messenger.layout.validation.selectDmTarget");
      return;
    }
  } else if (!form.value.name) {
    formError.value = t("messenger.layout.validation.nameRequired");
    return;
  }

  if (form.value.type === "AGENT" && !form.value.agentKey) {
    formError.value = t("messenger.layout.validation.agentKeyRequired");
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    let res;
    if (form.value.type === "DM") {
      res = await api.post("/channels/dm", {
        project_id: props.projectId,
        target_member_id: Number(form.value.targetMemberId),
      });
    } else {
      res = await api.post("/channels", {
        name: form.value.name,
        project_id: props.projectId,
        type: form.value.type,
        agent_key: form.value.type === "AGENT" ? form.value.agentKey : null,
      });
    }
    const newChannel = res.data;
    
    addToast({
      message: t("messenger.layout.toast.created"),
      type: "success",
    });
    
    emit("created", newChannel);
    handleClose();
    
    // Navigate to the new channel
    if (newChannel?.id) {
      router.push(`/project/${props.projectId}/messenger/${newChannel.id}`);
    }
  } catch (error) {
    formError.value = error?.response?.data?.message || t("messenger.layout.status.errorCreate");
  } finally {
    isCreating.value = false;
  }
};

// Reset form when modal opens
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      form.value = {
        type: "GENERAL",
        name: "",
        targetMemberId: "",
        agentKey: "",
      };
      formError.value = "";
    }
  }
);
</script>

<style scoped>
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.form-error {
  color: var(--color-danger);
  font-size: 0.85rem;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>

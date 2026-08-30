<script setup>
import FeatureGrid from "./FeatureGrid.vue";
import IntegrationScene from "./IntegrationScene.vue";
import UnifiedReveal from "./UnifiedReveal.vue";
import MockChannelToTask from "../mock/MockChannelToTask.vue";
import MockDataEmbed from "../mock/MockDataEmbed.vue";
import MockWikiTaskEmbed from "../mock/MockWikiTaskEmbed.vue";
</script>

<template>
  <section id="unified" class="unified">
    <div class="unified__inner landing-wrap">
      <UnifiedReveal />

      <div class="unified__scenes">
        <IntegrationScene
          :title="$t('landing.scenes.channel.title')"
          :body="$t('landing.scenes.channel.body')"
          side="left"
        >
          <template #mock>
            <MockChannelToTask variant="light" />
          </template>
        </IntegrationScene>

        <IntegrationScene
          :title="$t('landing.scenes.wiki.title')"
          :body="$t('landing.scenes.wiki.body')"
          side="right"
        >
          <template #mock>
            <MockWikiTaskEmbed variant="light" />
          </template>
        </IntegrationScene>

        <IntegrationScene
          :title="$t('landing.scenes.data.title')"
          :body="$t('landing.scenes.data.body')"
          side="left"
        >
          <template #mock>
            <MockDataEmbed variant="light" />
          </template>
        </IntegrationScene>
      </div>

      <FeatureGrid />
    </div>
  </section>
</template>

<style scoped>
.unified {
  padding: var(--space-section) 0;
  scroll-margin-top: 64px;
}

.unified__inner {
  display: flex;
  flex-direction: column;
  gap: var(--space-section);
}

.unified__scenes {
  display: flex;
  flex-direction: column;
  gap: 120px;
}

@media (max-width: 767px) {
  .unified {
    padding: var(--space-section-m) 0;
  }

  .unified__inner {
    gap: var(--space-section-m);
  }

  .unified__scenes {
    gap: 80px;
  }
}

@media (min-width: 1200px) {
  .unified__scenes {
    gap: 140px;
  }
}
</style>

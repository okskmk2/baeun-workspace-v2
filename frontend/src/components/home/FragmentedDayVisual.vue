<script setup>
import { onMounted, ref } from "vue";
import MockCard from "../mock/primitives/MockCard.vue";
import MockLine from "../mock/primitives/MockLine.vue";
import MockWindow from "../mock/primitives/MockWindow.vue";

defineProps({
  variant: { type: String, default: "dim" },
});

const reduceMotion = ref(true);

onMounted(() => {
  reduceMotion.value = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
});
</script>

<template>
  <div class="frag" aria-hidden="true">
    <MockWindow class="frag__win frag__win--doc" :variant="variant">
      <div class="frag__doc">
        <MockLine width="46%" height="11px" />
        <MockLine />
        <MockLine width="88%" />
        <MockLine width="72%" />
        <MockLine width="80%" />
      </div>
    </MockWindow>

    <MockWindow class="frag__win frag__win--board" :variant="variant">
      <div class="frag__board">
        <div v-for="n in 3" :key="n" class="frag__col">
          <MockCard :variant="variant">
            <MockLine width="80%" height="8px" />
            <MockLine width="50%" height="8px" />
          </MockCard>
          <MockCard v-if="n !== 3" :variant="variant">
            <MockLine width="64%" height="8px" />
          </MockCard>
        </div>
      </div>
    </MockWindow>

    <MockWindow class="frag__win frag__win--chat" :variant="variant">
      <div class="frag__chat">
        <span class="frag__bubble is-left" />
        <span class="frag__bubble is-right" />
        <span class="frag__bubble is-left is-short" />
        <span class="frag__bubble is-right is-mid" />
      </div>
    </MockWindow>

    <MockWindow class="frag__win frag__win--sheet" :variant="variant">
      <div class="frag__sheet">
        <span v-for="n in 20" :key="n" class="frag__cell" />
      </div>
    </MockWindow>

    <svg class="frag__svg frag__svg--desktop" viewBox="0 0 1000 560" fill="none">
      <path
        id="frag-path-desktop"
        d="M190 140 C 360 70, 520 70, 690 130 C 780 240, 740 330, 640 400 C 430 470, 280 460, 210 390 C 90 300, 90 210, 190 140"
        stroke="currentColor"
        stroke-width="1.25"
        stroke-dasharray="5 8"
        opacity="0.35"
      />
      <circle
        v-if="reduceMotion"
        cx="190"
        cy="140"
        r="4.5"
        fill="currentColor"
        opacity="0.8"
      />
      <circle v-else r="4.5" fill="currentColor" opacity="0.8">
        <animateMotion dur="12s" repeatCount="indefinite" rotate="auto">
          <mpath href="#frag-path-desktop" />
        </animateMotion>
      </circle>
    </svg>

    <svg class="frag__svg frag__svg--mobile" viewBox="0 0 360 780" fill="none">
      <path
        id="frag-path-mobile"
        d="M130 110 C 200 150, 230 200, 220 250 C 200 330, 140 380, 130 430 C 150 500, 210 540, 210 590 C 160 650, 90 200, 130 110"
        stroke="currentColor"
        stroke-width="1.25"
        stroke-dasharray="5 8"
        opacity="0.35"
      />
      <circle
        v-if="reduceMotion"
        cx="130"
        cy="110"
        r="4.5"
        fill="currentColor"
        opacity="0.8"
      />
      <circle v-else r="4.5" fill="currentColor" opacity="0.8">
        <animateMotion dur="12s" repeatCount="indefinite" rotate="auto">
          <mpath href="#frag-path-mobile" />
        </animateMotion>
      </circle>
    </svg>
  </div>
</template>

<style scoped>
.frag {
  position: relative;
  width: 100%;
  max-width: 1120px;
  aspect-ratio: 1000 / 560;
  margin: 0 auto;
  color: var(--color-muted);
  overflow: hidden;
}

.frag__win {
  position: absolute;
}

.frag__win--doc {
  top: 6%;
  left: 4%;
  width: 32%;
  transform: rotate(-3deg);
  z-index: 2;
}

.frag__win--board {
  top: 3%;
  left: 48%;
  width: 38%;
  transform: rotate(2.4deg);
  z-index: 3;
}

.frag__win--chat {
  top: 50%;
  left: 6%;
  width: 28%;
  transform: rotate(3.6deg);
  z-index: 2;
}

.frag__win--sheet {
  top: 54%;
  left: 44%;
  width: 34%;
  transform: rotate(-2deg);
  z-index: 1;
}

.frag__doc,
.frag__chat {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.frag__board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.frag__col {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.frag__bubble {
  height: 18px;
  background-color: var(--mock-fill);
  opacity: 0.9;
}

.frag__bubble.is-left {
  width: 72%;
  border-radius: 2px 10px 10px 10px;
}

.frag__bubble.is-right {
  width: 64%;
  margin-left: auto;
  border-radius: 10px 2px 10px 10px;
}

.frag__bubble.is-short {
  width: 48%;
}

.frag__bubble.is-mid {
  width: 56%;
}

.frag__sheet {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

.frag__cell {
  height: 16px;
  border-radius: 2px;
  background-color: var(--mock-fill);
}

.frag__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 4;
}

.frag__svg--mobile {
  display: none;
}

@media (max-width: 767px) {
  .frag {
    aspect-ratio: 360 / 840;
    max-width: 420px;
  }

  .frag__win--doc {
    top: 2%;
    left: 2%;
    width: 78%;
  }

  .frag__win--board {
    top: 24%;
    left: 18%;
    width: 80%;
  }

  .frag__win--chat {
    top: 50%;
    left: 4%;
    width: 72%;
  }

  .frag__win--sheet {
    top: 72%;
    left: 16%;
    width: 80%;
  }

  .frag__svg--desktop {
    display: none;
  }

  .frag__svg--mobile {
    display: block;
  }
}
</style>

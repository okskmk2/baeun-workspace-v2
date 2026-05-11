<template>
  <BaseModal
    :open="open"
    :title="t('settings.home.themeBuilder.title')"
    max-width="560px"
    @close="handleClose"
  >
    <div class="builder-body">
      <!-- Brand color preview + HSL display -->
      <div class="brand-row">
        <div class="brand-swatch" :style="{ backgroundColor: primaryHex }"></div>
        <div class="brand-info">
          <span class="brand-hsl">HSL({{ seed.h }}, {{ seed.s }}%, {{ seed.l }}%)</span>
          <span class="brand-hint">{{ t("settings.home.themeBuilder.brandHint") }}</span>
        </div>
        <span class="contrast-badge" :class="contrastOk ? 'ok' : 'warn'">
          {{ contrastRatio }}:1
        </span>
      </div>

      <!-- Hue -->
      <div class="slider-group">
        <input type="range" min="0" max="360" v-model.number="seed.h" class="hue-slider" />
        <div class="slider-labels">
          <span>HUE</span><span>{{ seed.h }}°</span>
        </div>
      </div>

      <!-- Saturation -->
      <div class="slider-group">
        <input type="range" min="0" max="100" v-model.number="seed.s" />
        <div class="slider-labels">
          <span>SATURATION</span><span>{{ seed.s }}%</span>
        </div>
      </div>

      <!-- Lightness -->
      <div class="slider-group">
        <input type="range" min="0" max="100" v-model.number="seed.l" />
        <div class="slider-labels">
          <span>LIGHTNESS</span><span>{{ seed.l }}%</span>
        </div>
      </div>

      <!-- Preview -->
      <div class="preview-box">
        <div class="preview-gnb" :style="{ backgroundColor: resultBackground, color: resultForeground }">
          <span class="preview-gnb-text">GNB Preview</span>
        </div>
        <div class="preview-content">
          <div class="preview-btn" :style="{ backgroundColor: primaryHex, color: btnTextColor }">
            Action
          </div>
          <div class="preview-palette">
            <div class="palette-dot" :style="{ backgroundColor: primaryHex }"></div>
            <div class="palette-dot" :style="{ backgroundColor: secondaryHex }"></div>
            <div class="palette-dot" :style="{ backgroundColor: accentHex }"></div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="handleClose">
          {{ t("common.actions.close") }}
        </button>
        <button type="button" class="btn" @click="handleApply">
          {{ t("settings.home.themeBuilder.apply") }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import BaseModal from "../BaseModal.vue";

const { t } = useI18n();

const props = defineProps({
  open: { type: Boolean, required: true },
  initialBackground: { type: String, default: "#1f2937" },
  initialForeground: { type: String, default: "#ffffff" },
  initialSeedH: { type: Number, default: null },
  initialSeedS: { type: Number, default: null },
  initialSeedL: { type: Number, default: null },
});

const emit = defineEmits(["close", "apply"]);

const seed = ref({ h: 210, s: 80, l: 50 });

const TARGET_CONTRAST = 4.7;

// --- Color math ---
function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return [f(0), f(8), f(4)];
}

function getLuminance(h, s, l) {
  const [r, g, b] = hslToRgb(h, s, l);
  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrast(l1, l2) {
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

function solveLightness(h, s, targetL, bgLuminance) {
  const direction = bgLuminance > 0.5 ? -1 : 1;
  for (let i = 0; i <= 100; i++) {
    const testL = Math.max(0, Math.min(100, targetL + i * direction));
    const testLum = getLuminance(h, s, testL);
    if (getContrast(testLum, bgLuminance) >= TARGET_CONTRAST) return testL;
  }
  return Math.max(0, Math.min(100, targetL + 100 * direction));
}

function hslToHex(h, s, l) {
  const [r, g, b] = hslToRgb(h, s, l);
  const toHex = (c) => {
    const hex = Math.round(Math.max(0, Math.min(255, c * 255)))
      .toString(16)
      .padStart(2, "0");
    return hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex) {
  const input = String(hex || "").trim();
  const match = input.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return null;
  let hexStr = match[1];
  if (hexStr.length === 3) {
    hexStr = hexStr
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = Number.parseInt(hexStr, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }
  h = Math.round((h * 60 + 360) % 360);
  const lVal = (max + min) / 2;
  const sVal = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lVal - 1));
  return { h, s: Math.round(sVal * 100), l: Math.round(lVal * 100) };
}

// -- Palette computation (light-mode preview) --
const palette = computed(() => {
  const p = seed.value;

  const bgH = p.h;
  const bgS = Math.min(100, p.s * 0.05);
  const bgL = 98;
  const bgLum = getLuminance(bgH, bgS, bgL);

  const sH = (p.h + 360) % 360;
  const sS = Math.min(100, Math.max(4, p.s * 0.08));
  const sBaseL = Math.max(0, p.l - 25);
  const sL = solveLightness(sH, sS, sBaseL, bgLum);

  const aH = (p.h + 120 + 360) % 360;
  const aS = Math.min(100, p.s * 0.9);
  const aBaseL = Math.max(0, p.l - 10);
  const aL = solveLightness(aH, aS, aBaseL, bgLum);

  const pLum = getLuminance(p.h, p.s, p.l);
  const contrast = getContrast(pLum, bgLum);

  return {
    s: { h: sH, s: sS, l: sL },
    a: { h: aH, s: aS, l: aL },
    pLum,
    contrast,
  };
});

const primaryHex = computed(() => hslToHex(seed.value.h, seed.value.s, seed.value.l));
const secondaryHex = computed(() => hslToHex(palette.value.s.h, palette.value.s.s, palette.value.s.l));
const accentHex = computed(() => hslToHex(palette.value.a.h, palette.value.a.s, palette.value.a.l));

const contrastRatio = computed(() => palette.value.contrast.toFixed(1));
const contrastOk = computed(() => palette.value.contrast >= TARGET_CONTRAST);

const btnTextColor = computed(() =>
  palette.value.pLum > 0.4 ? "#000000" : "#ffffff",
);

const resultBackground = computed(() => {
  const p = seed.value;
  return hslToHex(p.h, Math.min(80, p.s), 26);
});

const resultForeground = computed(() => {
  const p = seed.value;
  return hslToHex(p.h, Math.min(35, p.s * 0.5), 96);
});

// Init from props
watch(
  () => props.open,
  (val) => {
    if (!val) return;
    if (props.initialSeedH !== null && props.initialSeedS !== null && props.initialSeedL !== null) {
      seed.value = { h: props.initialSeedH, s: props.initialSeedS, l: props.initialSeedL };
    } else {
      const parsed = hexToHsl(props.initialBackground);
      if (parsed) {
        seed.value = { h: parsed.h, s: Math.min(100, Math.max(40, parsed.s * 2)), l: 50 };
      } else {
        seed.value = { h: 210, s: 80, l: 50 };
      }
    }
  },
);

function handleClose() {
  emit("close");
}

function handleApply() {
  emit("apply", {
    background: resultBackground.value,
    foreground: resultForeground.value,
    seedH: seed.value.h,
    seedS: seed.value.s,
    seedL: seed.value.l,
  });
  emit("close");
}
</script>

<style scoped>
.builder-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-swatch {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
  transition: background-color 0.2s;
}

.brand-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-hsl {
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
}

.brand-hint {
  font-size: 10px;
  color: var(--color-text-muted);
  opacity: 0.7;
}

.contrast-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.contrast-badge.ok {
  background-color: hsl(142, 60%, 92%);
  color: hsl(142, 60%, 30%);
}

.contrast-badge.warn {
  background-color: hsl(0, 60%, 92%);
  color: hsl(0, 60%, 35%);
}

.slider-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.slider-group input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  outline: none;
  background: var(--color-border);
}

.slider-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 2px solid var(--color-text);
  cursor: pointer;
}

.hue-slider {
  background: linear-gradient(
    to right,
    hsl(0, 80%, 50%),
    hsl(60, 80%, 50%),
    hsl(120, 80%, 50%),
    hsl(180, 80%, 50%),
    hsl(240, 80%, 50%),
    hsl(300, 80%, 50%),
    hsl(360, 80%, 50%)
  ) !important;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.preview-box {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.preview-gnb {
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 700;
  transition: background-color 0.3s, color 0.3s;
}

.preview-gnb-text {
  font-weight: 700;
}

.preview-content {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--color-surface);
}

.preview-btn {
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  transition: background-color 0.3s, color 0.3s;
}

.preview-palette {
  display: flex;
  gap: 6px;
}

.palette-dot {
  width: 20px;
  height: 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}
</style>

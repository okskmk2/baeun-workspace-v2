const PRESET_THEME_IDS = new Set([
  "indigo",
  "rose",
  "emerald",
  "amber",
  "sky",
  "stone",
  "violet",
  "teal",
]);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeHue = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const normalized = ((number % 360) + 360) % 360;
  return Math.round(normalized);
};

const normalizePercent = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(clamp(number, 0, 100));
};

const isObject = (value) => value && typeof value === "object";

const parseHexToRgb = (value) => {
  const input = String(value || "").trim();
  const match = input.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return null;

  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  const int = Number.parseInt(hex, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

const parseHslString = (value) => {
  const input = String(value || "").trim();
  const match = input.match(/^hsl\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)$/i);
  if (!match) return null;

  const h = normalizeHue(match[1]);
  const s = normalizePercent(match[2]);
  const l = normalizePercent(match[3]);
  if (h === null || s === null || l === null) return null;
  return { h, s, l };
};

const rgbToHsl = ({ r, g, b }) => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === red) {
      h = ((green - blue) / delta) % 6;
    } else if (max === green) {
      h = (blue - red) / delta + 2;
    } else {
      h = (red - green) / delta + 4;
    }
  }

  h = Math.round((h * 60 + 360) % 360);
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

const parseColorToHsl = (value) => {
  const hsl = parseHslString(value);
  if (hsl) return hsl;

  const rgb = parseHexToRgb(value);
  if (rgb) return rgbToHsl(rgb);

  return null;
};

const resolveSeedFromObject = (theme) => {
  if (!isObject(theme)) return null;

  const h = normalizeHue(theme.seedH ?? theme.hue ?? theme.h ?? theme.colorH);
  const s = normalizePercent(theme.seedS ?? theme.saturation ?? theme.s ?? theme.colorS);
  const l = normalizePercent(theme.seedL ?? theme.lightness ?? theme.l ?? theme.colorL);

  if (h !== null && s !== null && l !== null) {
    return { h, s, l };
  }

  const colorValue =
    theme.seedColor ||
    theme.color ||
    theme.accent ||
    theme.background ||
    theme.bg ||
    theme.primary;

  const parsed = parseColorToHsl(colorValue);
  if (parsed) return parsed;

  return null;
};

const toPercent = (value) => `${Math.round(value)}%`;

export const isPresetThemeId = (themeId) => PRESET_THEME_IDS.has(String(themeId || ""));

export const resolveThemeSeed = (theme) => resolveSeedFromObject(theme);

export const applyThemeSeedToRoot = (seed) => {
  if (typeof document === "undefined") return;
  if (!seed) return;

  const root = document.documentElement;
  const normalized = {
    h: normalizeHue(seed.h),
    s: normalizePercent(seed.s),
    l: normalizePercent(seed.l),
  };

  if (normalized.h === null || normalized.s === null || normalized.l === null) return;

  root.style.setProperty("--theme-custom-h", String(normalized.h));
  root.style.setProperty("--theme-custom-s", toPercent(normalized.s));
  root.style.setProperty("--theme-custom-l", toPercent(normalized.l));
};

export const clearThemeSeedFromRoot = () => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.removeProperty("--theme-custom-h");
  root.style.removeProperty("--theme-custom-s");
  root.style.removeProperty("--theme-custom-l");
};

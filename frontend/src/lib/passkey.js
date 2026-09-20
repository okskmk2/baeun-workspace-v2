import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  startAuthentication,
  startRegistration,
  WebAuthnAbortService,
} from "@simplewebauthn/browser";
import api from "./axios";

const CEREMONY_TIMEOUT_MS = 45_000;
const PASSKEY_OFFER_SKIP_LIMIT = 3;
const BROWSER_FLAG_KEY = "baeun.passkeyOnThisBrowser.v1";
const passkeyOfferStorageKey = (userId) => `baeun.passkeyOffer.v2:${userId}`;
const passkeyOfferLegacyKey = (userId) => `baeun.passkeyOffer.v1:${userId}`;
const passkeyOnThisDeviceKey = (userId) => `baeun.passkeyOnThisDevice.v1:${userId}`;

export const cancelPasskeyCeremony = () => {
  try {
    WebAuthnAbortService.cancelCeremony();
  } catch {
    /* ignore */
  }
};

export const waitAfterCancel = () => new Promise((resolve) => setTimeout(resolve, 150));

const withCeremonyTimeout = async (operation) => {
  let timer;
  try {
    return await Promise.race([
      operation(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          cancelPasskeyCeremony();
          const error = new Error("Passkey timed out.");
          error.name = "TimeoutError";
          reject(error);
        }, CEREMONY_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

const readStorage = (key) => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key, value) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
};

const removeStorage = (key) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

export const supportsPasskeys = () =>
  typeof window !== "undefined" && browserSupportsWebAuthn();

export const supportsPasskeyAutofill = async () => {
  if (typeof window === "undefined") return false;
  try {
    return await browserSupportsWebAuthnAutofill();
  } catch {
    return false;
  }
};

export const detectPasskeyPlatform = () => {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Mac/i.test(platform) && Number(navigator.maxTouchPoints || 0) > 1) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Mac/i.test(platform) || /Mac OS X/i.test(ua)) return "macos";
  if (/Win/i.test(platform) || /Windows/i.test(ua)) return "windows";
  return "other";
};

export const passkeyMethodKey = () => {
  switch (detectPasskeyPlatform()) {
    case "ios":
      return "faceId";
    case "macos":
      return "touchId";
    case "windows":
      return "windowsHello";
    case "android":
      return "screenLock";
    default:
      return "generic";
  }
};

export const passkeyIconName = () => (detectPasskeyPlatform() === "ios" ? "face" : "fingerprint");

export const isPasskeyCanceled = (error) => {
  const name = error?.name || error?.code || "";
  const message = String(error?.message || "").toLowerCase();
  return (
    name === "NotAllowedError" ||
    name === "AbortError" ||
    name === "TimeoutError" ||
    message.includes("the operation either timed out") ||
    message.includes("abort")
  );
};

export const isPasskeyTimeout = (error) => error?.name === "TimeoutError";

export const isPasskeyAlreadyRegistered = (error) => error?.name === "InvalidStateError";

export const isPasskeyNotDeviceBound = (error) =>
  error?.response?.data?.name === "DeviceBoundRequired";

export async function registerPasskey(nickname) {
  cancelPasskeyCeremony();
  await waitAfterCancel();
  const { data: optionsJSON } = await api.post("/members/passkeys/register/options");
  const credential = await withCeremonyTimeout(() => startRegistration({ optionsJSON }));
  const { data } = await api.post("/members/passkeys/register", {
    credential,
    nickname,
  });
  return data;
}

const readOfferSkipCount = (userId) => {
  if (!userId) return 0;
  if (readStorage(passkeyOfferLegacyKey(userId)) === "1") {
    return PASSKEY_OFFER_SKIP_LIMIT;
  }
  const count = Number.parseInt(readStorage(passkeyOfferStorageKey(userId)) || "0", 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

export const shouldOfferPasskeySetup = (userId) =>
  Boolean(userId) && readOfferSkipCount(userId) < PASSKEY_OFFER_SKIP_LIMIT;

export const recordPasskeyOfferSkip = (userId) => {
  if (!userId) return;
  writeStorage(passkeyOfferStorageKey(userId), String(readOfferSkipCount(userId) + 1));
};

export const hasPasskeyOnThisBrowser = () => readStorage(BROWSER_FLAG_KEY) === "1";

export const hasPasskeyOnThisDevice = (userId) =>
  Boolean(userId) && readStorage(passkeyOnThisDeviceKey(userId)) === "1";

export const markPasskeyOnThisBrowser = (userId) => {
  writeStorage(BROWSER_FLAG_KEY, "1");
  if (userId) writeStorage(passkeyOnThisDeviceKey(userId), "1");
};

export const clearPasskeyOfferDismissed = (userId) => {
  if (!userId) return;
  removeStorage(passkeyOfferStorageKey(userId));
  removeStorage(passkeyOfferLegacyKey(userId));
};

export const clearPasskeyOnThisBrowser = (userId) => {
  if (userId) removeStorage(passkeyOnThisDeviceKey(userId));
  removeStorage(BROWSER_FLAG_KEY);
};

export const passkeySourceLabel = (item, t) => {
  if (item?.nickname) return item.nickname;
  if (item?.device_type === "multiDevice") return t("settings.security.passkeys.otherDevice");
  return t("settings.security.passkeys.thisDevice");
};

export const numberedPasskeyLabels = (items, t) => {
  const list = Array.isArray(items) ? items : [];
  const bases = list.map((item) => passkeySourceLabel(item, t));
  const counts = new Map();
  for (const base of bases) {
    counts.set(base, (counts.get(base) || 0) + 1);
  }
  const seen = new Map();
  return list.map((item, index) => {
    const base = bases[index];
    const total = counts.get(base) || 1;
    if (total <= 1) return base;
    const next = (seen.get(base) || 0) + 1;
    seen.set(base, next);
    return `${base} ${next}`;
  });
};

export async function listPasskeys() {
  const { data } = await api.get("/members/passkeys");
  return Array.isArray(data?.items) ? data.items : [];
}

export async function authenticatePasskey({ email, remember, useBrowserAutofill } = {}) {
  if (!useBrowserAutofill) {
    cancelPasskeyCeremony();
    await waitAfterCancel();
  }
  const { data: optionsJSON } = await api.post("/members/passkeys/login/options", {
    email: useBrowserAutofill ? undefined : email || undefined,
  });
  const run = () =>
    startAuthentication({
      optionsJSON,
      useBrowserAutofill: Boolean(useBrowserAutofill),
    });
  const credential = useBrowserAutofill ? await run() : await withCeremonyTimeout(run);
  const { data } = await api.post("/members/passkeys/login", {
    credential,
    remember: Boolean(remember),
  });
  return data;
}

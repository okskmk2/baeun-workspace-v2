import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  startAuthentication,
  startRegistration,
  WebAuthnAbortService,
} from "@simplewebauthn/browser";
import api from "./axios";

const CEREMONY_TIMEOUT_MS = 45_000;

export const cancelPasskeyCeremony = () => {
  try {
    WebAuthnAbortService.cancelCeremony();
  } catch {
    /* ignore */
  }
};

const waitAfterCancel = () => new Promise((resolve) => setTimeout(resolve, 80));

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

const PASSKEY_OFFER_SKIP_LIMIT = 3;
const passkeyOfferStorageKey = (userId) => `baeun.passkeyOffer.v2:${userId}`;
const passkeyOfferLegacyKey = (userId) => `baeun.passkeyOffer.v1:${userId}`;

const readOfferSkipCount = (userId) => {
  if (typeof window === "undefined" || !userId) return 0;
  try {
    if (window.localStorage.getItem(passkeyOfferLegacyKey(userId)) === "1") {
      return PASSKEY_OFFER_SKIP_LIMIT;
    }
    const raw = window.localStorage.getItem(passkeyOfferStorageKey(userId));
    const count = Number.parseInt(raw || "0", 10);
    return Number.isFinite(count) && count > 0 ? count : 0;
  } catch {
    return 0;
  }
};

export const shouldOfferPasskeySetup = (userId) =>
  readOfferSkipCount(userId) < PASSKEY_OFFER_SKIP_LIMIT;

export const recordPasskeyOfferSkip = (userId) => {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(passkeyOfferStorageKey(userId), String(readOfferSkipCount(userId) + 1));
  } catch {
    /* ignore quota / private mode */
  }
};

export const clearPasskeyOfferDismissed = (userId) => {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.removeItem(passkeyOfferStorageKey(userId));
    window.localStorage.removeItem(passkeyOfferLegacyKey(userId));
  } catch {
    /* ignore */
  }
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
    email: email || undefined,
  });
  const credential = await withCeremonyTimeout(() =>
    startAuthentication({
      optionsJSON,
      useBrowserAutofill: Boolean(useBrowserAutofill),
    }),
  );
  const { data } = await api.post("/members/passkeys/login", {
    credential,
    remember: Boolean(remember),
  });
  return data;
}

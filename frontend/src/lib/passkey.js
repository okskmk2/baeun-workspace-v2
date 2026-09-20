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

const passkeyOfferStorageKey = (userId) => `baeun.passkeyOffer.v1:${userId}`;

export const isPasskeyOfferDismissed = (userId) => {
  if (typeof window === "undefined" || !userId) return false;
  try {
    return window.localStorage.getItem(passkeyOfferStorageKey(userId)) === "1";
  } catch {
    return false;
  }
};

export const dismissPasskeyOffer = (userId) => {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(passkeyOfferStorageKey(userId), "1");
  } catch {
    /* ignore quota / private mode */
  }
};

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

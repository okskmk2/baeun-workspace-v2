import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import api from "./axios";

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
    message.includes("the operation either timed out") ||
    message.includes("abort")
  );
};

export async function registerPasskey(nickname) {
  const { data: optionsJSON } = await api.post("/members/passkeys/register/options");
  const credential = await startRegistration({ optionsJSON });
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
  const { data: optionsJSON } = await api.post("/members/passkeys/login/options", {
    email: email || undefined,
  });
  const credential = await startAuthentication({
    optionsJSON,
    useBrowserAutofill: Boolean(useBrowserAutofill),
  });
  const { data } = await api.post("/members/passkeys/login", {
    credential,
    remember: Boolean(remember),
  });
  return data;
}

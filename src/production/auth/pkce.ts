const encoder = new TextEncoder();

const base64Url = (bytes: Uint8Array): string => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export const randomUrlSafe = (length = 32): string => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
};

export const createCodeVerifier = (): string => randomUrlSafe(64);

export const createCodeChallenge = async (verifier: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
  return base64Url(new Uint8Array(digest));
};

export const decodeJwtPayload = <T extends Record<string, unknown>>(
  token: string,
): T => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("The identity token is malformed.");
  }
  const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const json = decodeURIComponent(
    Array.from(atob(padded))
      .map((character) =>
        `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`,
      )
      .join(""),
  );
  return JSON.parse(json) as T;
};

export const constantTimeEqual = (left: string, right: string): boolean => {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    difference |=
      (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
};

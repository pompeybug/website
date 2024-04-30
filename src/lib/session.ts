import type { Session } from "@lib/types";

export const getSessionClient = async () => {
  let res;

  try {
    res = await fetch("/api/auth/session");
  } catch (err) {
    console.error(err);
    return null;
  }

  if (!res.ok) {
    return null;
  }

  const session = (await res.json()) as
    | Session
    | null;

  return session;
};

export const validateSessionClient = async () => {
  return !!(await getSessionClient());
};

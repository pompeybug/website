import { defineMiddleware } from "astro:middleware";
import { getSession } from "auth-astro/server";

export const onRequest = defineMiddleware(async ({ request, locals }, next) => {
  const session = await getSession(request);

  locals.session = session;

  await next();
});

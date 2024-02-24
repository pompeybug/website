import type { APIRoute } from "astro";
import slugify from "@sindresorhus/slugify";
import { getSession } from "auth-astro/server";
import { Octokit } from "@octokit/rest";
import { createOrUpdateFile, getFile } from "@lib/api/content";
import matter from "gray-matter";

export const PUT: APIRoute = async ({ request }) => {
  const session = await getSession(request);

  if (!session) {
    return new Response("", { status: 401 });
  }

  const data = await request.formData();

  console.debug(data);

  let slug = data.get("slug") as string | null;
  const title = data.get("title") as string | null;
  let content = data.get("content") as string | null;

  if (!title) {
    return new Response("Missing Title", { status: 400 });
  } else if (!content) {
    return new Response("Missing Content", { status: 400 });
  }

  slug ??= slugify(title);

  const octokit = new Octokit({
    auth: session.accessToken,
  });

  const existingFile = await getFile(octokit, `articles/${slug}/index.md`);

  let sha;

  if (existingFile) {
    const { data } = existingFile;

    // Has to be done due to a bug https://github.com/octokit/rest.js/issues/32#issuecomment-1215114432
    if (!Array.isArray(data)) {
      sha = data.sha;
    }
  }

  const frontmatter = {
    title,
    author: session.user?.name,
    date: new Date().toISOString(),
  };

  content = matter.stringify(content, frontmatter);

  console.debug(content);

  const contentEncoded = Buffer.from(content).toString("base64");

  const k = await createOrUpdateFile(
    octokit,
    `articles/${slug}/index.md`,
    contentEncoded,
    title,
    session.user?.name ?? "Unknown",
    session.user?.email ?? "Unknown",
    sha
  );

  console.debug(k);

  return new Response("", { status: 200 });
};

import type { APIRoute } from "astro";
import slugify from "@sindresorhus/slugify";
import { getSession } from "auth-astro/server";
import { Octokit } from "@octokit/rest";
import {
  createBlob,
  createCommit,
  createOrUpdateFile,
  createTree,
  getFile,
  getRef,
  updateReference,
} from "@lib/api/content";
import matter from "gray-matter";
import type { Endpoints } from "@octokit/types";

async function buildCommitTree(
  slug: string,
  content: string,
  uploadedFiles: File[],
  deletedFiles: string[]
): Promise<
  Endpoints["POST /repos/{owner}/{repo}/git/trees"]["request"]["data"]["tree"]
> {
  const tree: Endpoints["POST /repos/{owner}/{repo}/git/trees"]["request"]["data"]["tree"] =
    [];

  tree.push({
    path: `articles/${slug}/${slug}.md`,
    mode: "100644",
    type: "blob",
    content,
  });

  // for (const file of uploadedFiles) {
  //   const content = await file.arrayBuffer();

  //   tree.push({
  //     path: `articles/${slug}/${file.name}`,
  //     mode: "100644",
  //     type: "blob",
  //     content: Buffer.from(content).toString("base64"),
  //   });
  // }

  // deletedFiles.forEach((file) => {
  //   tree.push({
  //     path: `articles/${slug}/${file}`,
  //     mode: "100644",
  //     type: "blob",
  //   });
  // });

  return tree;
}

export const PUT: APIRoute = async ({ request }) => {
  const session = await getSession(request);

  if (!session) {
    return new Response("", { status: 401 });
  }

  const data = await request.formData();

  // console.debug(data);

  let slug = data.get("slug") as string | null;
  const title = data.get("title") as string | null;
  let content = data.get("content") as string | null;
  const uploadedFiles = (data.getAll("uploads") ?? []) as File[];
  const deletedFiles = (data.getAll("deletedFiles") ?? []) as string[];
  const showAuthor = data.get("showAuthor") === "on";
  let authorName = (data.get("authorName") ??
    session.user?.name ??
    "Unknown") as string;

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

  const frontmatter: Record<string, unknown> = {
    title,
    date: new Date(),
  };

  if (showAuthor) {
    frontmatter.author = authorName;
  }

  content = matter.stringify(content, frontmatter);

  const contentEncoded = Buffer.from(content).toString("base64");

  const blob = await createBlob(octokit, contentEncoded);

  const x = await getRef(octokit, "heads/test2");

  const lol = await buildCommitTree(
    slug,
    contentEncoded,
    uploadedFiles,
    deletedFiles
  );

  // console.debug("lol", lol);

  if (x && blob) {
    const o = await createTree(octokit, [{
      path: `articles/${slug}/${slug}.md`,
      mode: "100644",
      type: "blob",
      sha: blob.data.sha,
    }], x.data.object.sha);

    console.debug("o", o);

    if (o) {
      const c = await createCommit(octokit, o.data.sha, [x.data.object.sha]);

      console.debug("c", c);

      if (c) {
        const r = await updateReference(octokit, "heads/test2", c.data.sha);

        console.debug("r", r);
      }
    }
  }

  return new Response("", { status: 200 });

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

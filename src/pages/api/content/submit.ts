import type { APIRoute } from "astro";
import { getSession } from "auth-astro/server";
import type { Session } from "@auth/core/types";
import slugify from "@sindresorhus/slugify";
import path from "path";
import matter from "gray-matter";
import GithubApi from "@lib/githubApi";
import type { Endpoints } from "@octokit/types";
import type { FrontmatterImage } from "@lib/types";

class AuthError extends Error {}
class InvalidDataError extends Error {}
class UpdateRepoError extends Error {}

const protectRoute = async (request: Request) => {
  const session = await getSession(request);

  if (!session) {
    throw new AuthError();
  }

  return session;
};

const getData = async (request: Request, session: Session) => {
  const formData = await request.formData();

  const title = formData.get("title") as string | null;
  const content = formData.get("content") as string | null;
  const uploadedFiles = (formData.getAll("uploads") ?? []) as File[];
  const deletedFiles = (formData.getAll("deletedFiles") ?? []) as string[];
  const showAuthor = formData.get("showAuthor") === "on";
  const authorName = (formData.get("authorName") ??
    session.user?.name ??
    "Unknown") as string;
  const coverImage = formData.get("coverImage") as File | null;
  const originalFrontmatterString = formData.get("originalFrontmatter") as
    | string
    | null;

  if (!title) {
    throw new InvalidDataError("Missing title");
  } else if (!content) {
    throw new InvalidDataError("Missing content");
  }

  let originalFrontmatter: Record<string, any> | undefined = undefined;

  if (originalFrontmatterString) {
    originalFrontmatter = JSON.parse(originalFrontmatterString);
  }

  return {
    title,
    content,
    uploadedFiles,
    deletedFiles,
    showAuthor,
    authorName,
    coverImage,
    originalFrontmatter,
  };
};

async function buildCommitTree(
  client: GithubApi,
  slug: string,
  content: string,
  coverImage: File | null,
  uploadedFiles: File[],
  deletedFiles: string[],
  deletedCoverImage?: string
): Promise<CommitTree> {
  const tree: Endpoints["POST /repos/{owner}/{repo}/git/trees"]["request"]["data"]["tree"] =
    [];

  const contentEncoded = Buffer.from(content).toString("base64");
  const articleBlob = await client.createBlob(contentEncoded);

  if (articleBlob) {
    tree.push({
      path: `articles/${slug}/index.md`,
      mode: "100644",
      type: "blob",
      sha: articleBlob.data.sha,
    });
  } else {
    throw new Error("Failed to upload article content");
  }

  if (coverImage && coverImage.size > 0) {
    const coverImageBuffer = await coverImage.arrayBuffer();
    const coverImageEncoded = Buffer.from(coverImageBuffer).toString("base64");

    const coverImageBlob = await client.createBlob(coverImageEncoded);

    if (coverImageBlob) {
      tree.push({
        path: `articles/${slug}/${coverImage.name}`,
        mode: "100644",
        type: "blob",
        sha: coverImageBlob.data.sha,
      });
    } else {
      throw new Error("Failed to upload cover image");
    }
  }

  if (deletedCoverImage) {
    tree.push({
      path: `articles/${slug}/${deletedCoverImage}`,
      mode: "100644",
      type: "blob",
      sha: null,
    });
  }

  for (const file of uploadedFiles) {
    const content = await file.arrayBuffer();
    const encodedContent = Buffer.from(content).toString("base64");

    const blob = await client.createBlob(encodedContent);

    if (blob) {
      tree.push({
        path: `articles/${slug}/${file.name}`,
        mode: "100644",
        type: "blob",
        sha: blob.data.sha,
      });
    } else {
      throw new Error("Failed to upload file");
    }
  }

  deletedFiles.forEach((file) => {
    tree.push({
      path: `articles/${slug}/${file}`,
      mode: "100644",
      type: "blob",
      sha: null,
    });
  });

  return tree;
}

const updateRepo = async (client: GithubApi, commitTree: CommitTree) => {
  const mainBranchRef = await client.getRef(
    `heads/${import.meta.env.GITHUB_CONTENT_REPOSITORY_BRANCH}`
  );

  if (!mainBranchRef) {
    throw new UpdateRepoError("Failed to get branch ref");
  }

  const createdTree = await client.createTree(
    commitTree,
    mainBranchRef.data.object.sha
  );

  if (!createdTree) {
    throw new UpdateRepoError("Failed to create new tree");
  }

  const createdCommit = await client.createCommit(createdTree.data.sha, [
    mainBranchRef.data.object.sha,
  ]);

  if (!createdCommit) {
    throw new UpdateRepoError("Failed to create new commit for tree");
  }

  const updatedReference = await client.updateReference(
    `heads/${import.meta.env.GITHUB_CONTENT_REPOSITORY_BRANCH}`,
    createdCommit.data.sha
  );

  if (!updatedReference) {
    throw new UpdateRepoError("Failed to update main branch reference");
  }
};

const buildUpdatedFrontmatterData = (
  formData: FormData,
  originalFrontmatterData: Record<string, any>
) => {
  const frontmatterData: FrontmatterData = {
    title: formData.title,
    date: new Date(originalFrontmatterData.date as string),
    initialSlug: originalFrontmatterData.initialSlug as string,
    images: [],
  };

  if (formData.showAuthor) {
    frontmatterData.author = formData.authorName;
  }

  if (formData.coverImage) {
    if (originalFrontmatterData.coverImage && formData.coverImage.size === 0) {
      frontmatterData.coverImage = `./${path.basename(
        originalFrontmatterData.coverImage.fsPath
      )}`;
    } else {
      frontmatterData.coverImage = `./${formData.coverImage.name}`;
    }
  }

  frontmatterData.images = originalFrontmatterData.images
    .filter(
      (image: FrontmatterImage) => !formData.deletedFiles.includes(image.file)
    )
    .map((image: FrontmatterImage) => ({
      file: image.file,
      image: `./${image.file}`,
    }));

  frontmatterData.images.push(
    ...formData.uploadedFiles.map((file) => ({
      file: file.name,
      image: `./${file.name}`,
    }))
  );

  return frontmatterData;
};

type CommitTree =
  Endpoints["POST /repos/{owner}/{repo}/git/trees"]["request"]["data"]["tree"];

type FormData = Awaited<ReturnType<typeof getData>>;

type FrontmatterData = {
  title: string;
  date: Date;
  initialSlug: string;
  images: {
    file: string;
    image: string;
  }[];
  author?: string;
  coverImage?: string;
};

export const PUT: APIRoute = async ({ request }) => {
  let session: Session;

  try {
    session = await protectRoute(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return new Response("", { status: 401 });
    }

    return new Response("Unknown server error occurred", { status: 500 });
  }

  let formData: FormData;

  try {
    formData = await getData(request, session);
  } catch (error) {
    if (error instanceof InvalidDataError) {
      return new Response(error.message, { status: 400 });
    }

    return new Response("Unknown server error occurred", { status: 500 });
  }

  const { originalFrontmatter: originalFrontmatterData } = formData;

  if (!originalFrontmatterData) {
    return new Response("Missing original article frontmatter data", {
      status: 400,
    });
  }

  let frontmatterData: FrontmatterData;

  try {
    frontmatterData = buildUpdatedFrontmatterData(
      formData,
      originalFrontmatterData
    );
  } catch (error) {
    return new Response("Unknown error occurred updating frontmatter data", {
      status: 500,
    });
  }

  formData.content = matter.stringify(formData.content, frontmatterData);

  let deletedCoverImage: string | undefined;

  if (!formData.coverImage && originalFrontmatterData.coverImage) {
    deletedCoverImage = path.basename(
      originalFrontmatterData.coverImage.fsPath
    );
  } else if (formData.coverImage && formData.coverImage.size > 0) {
    deletedCoverImage = path.basename(
      originalFrontmatterData.coverImage.fsPath
    );
  }

  const client = GithubApi.makeGithubApi(session.accessToken);

  let commitTree: CommitTree;

  try {
    commitTree = await buildCommitTree(
      client,
      frontmatterData.initialSlug,
      formData.content,
      formData.coverImage,
      formData.uploadedFiles,
      formData.deletedFiles,
      deletedCoverImage
    );
  } catch (error) {
    if (error instanceof Error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }

    return new Response("Unknown error occurred", { status: 500 });
  }

  try {
    await updateRepo(client, commitTree);
  } catch (error) {
    if (error instanceof UpdateRepoError) {
      return new Response(error.message, { status: 500 });
    }

    return new Response("Unknown error occurred", { status: 500 });
  }

  return new Response("", { status: 200 });
};

export const POST: APIRoute = async ({ request }) => {
  let session: Session;

  try {
    session = await protectRoute(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return new Response("", { status: 401 });
    }

    return new Response("Unknown server error occurred", { status: 500 });
  }

  let formData: FormData;

  try {
    formData = await getData(request, session);
  } catch (error) {
    if (error instanceof InvalidDataError) {
      return new Response(error.message, { status: 400 });
    }

    return new Response("Unknown server error occurred", { status: 500 });
  }

  const slug = slugify(formData.title);

  const frontmatterData: FrontmatterData = {
    title: formData.title,
    date: new Date(),
    initialSlug: slug,
    images: formData.uploadedFiles.map((file) => ({
      file: file.name,
      image: `./${file.name}`,
    })),
  };

  if (formData.showAuthor) {
    frontmatterData.author = formData.authorName;
  }

  if (formData.coverImage && formData.coverImage.size > 0) {
    frontmatterData.coverImage = `./${formData.coverImage.name}`;
  }

  formData.content = matter.stringify(formData.content, frontmatterData);

  const client = GithubApi.makeGithubApi(session.accessToken);

  let commitTree: CommitTree;

  try {
    commitTree = await buildCommitTree(
      client,
      slug,
      formData.content,
      formData.coverImage,
      formData.uploadedFiles,
      formData.deletedFiles
    );
  } catch (error) {
    if (error instanceof Error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }

    return new Response("Unknown error occurred", { status: 500 });
  }

  try {
    await updateRepo(client, commitTree);
  } catch (error) {
    if (error instanceof UpdateRepoError) {
      return new Response(error.message, { status: 500 });
    }

    return new Response("Unknown error occurred", { status: 500 });
  }

  return new Response("", { status: 200 });
};

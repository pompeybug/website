import type { APIRoute } from "astro";
import slugify from "@sindresorhus/slugify";
import { getSession } from "auth-astro/server";
import type { Session } from "@auth/core/types";
import { Octokit } from "@octokit/rest";
import {
  createBlob,
  createCommit,
  createTree,
  getFile,
  getRef,
  updateReference,
} from "@lib/api/content";
import matter from "gray-matter";
import type { Endpoints } from "@octokit/types";
import type { FrontmatterImage } from "@lib/types";
import path from "path";

async function buildCommitTree(
  client: Octokit,
  slug: string,
  content: string,
  coverImage: File | null,
  uploadedFiles: File[],
  deletedFiles: string[],
  originalFrontmatter: Record<string, any> | null
): Promise<
  Endpoints["POST /repos/{owner}/{repo}/git/trees"]["request"]["data"]["tree"]
> {
  const tree: Endpoints["POST /repos/{owner}/{repo}/git/trees"]["request"]["data"]["tree"] =
    [];

  const contentEncoded = Buffer.from(content).toString("base64");
  const articleBlob = await createBlob(client, contentEncoded);

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

    const coverImageBlob = await createBlob(client, coverImageEncoded);

    if (coverImageBlob) {
      tree.push({
        path: `articles/${slug}/coverImage${path.extname(coverImage.name)}`,
        mode: "100644",
        type: "blob",
        sha: coverImageBlob.data.sha,
      });
    } else {
      throw new Error("Failed to upload cover image");
    }
  } else if (!coverImage && originalFrontmatter?.coverImage) {
    tree.push({
      path: `articles/${slug}/${originalFrontmatter.coverImage.replace(
        "./",
        ""
      )}`,
      mode: "100644",
      type: "blob",
      sha: null,
    });
  }

  for (const file of uploadedFiles) {
    const content = await file.arrayBuffer();
    const encodedContent = Buffer.from(content).toString("base64");

    const blob = await createBlob(client, encodedContent);

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

function getData(formData: FormData, session: Session) {
  const title = formData.get("title") as string | null;
  const content = formData.get("content") as string | null;
  const uploadedFiles = (formData.getAll("uploads") ?? []) as File[];
  const deletedFiles = (formData.getAll("deletedFiles") ?? []) as string[];
  const showAuthor = formData.get("showAuthor") === "on";
  const authorName = (formData.get("authorName") ??
    session.user?.name ??
    "Unknown") as string;
  const coverImage = formData.get("coverImage") as File | null;
  const originalSlug = formData.get("originalSlug") as string | null;

  if (!title) {
    throw new Error("Missing title");
  } else if (!content) {
    throw new Error("Missing content");
  }

  return {
    title,
    content,
    uploadedFiles,
    deletedFiles,
    showAuthor,
    authorName,
    coverImage,
    originalSlug,
  };
}

async function getExistingArticleFrontmatter(client: Octokit, slug: string) {
  const existingFile = await getFile(
    client,
    `articles/${slug}/index.md`,
    "test2"
  );

  if (existingFile) {
    const { data } = existingFile;

    // Has to be done due to a bug https://github.com/octokit/rest.js/issues/32#issuecomment-1215114432
    if (!Array.isArray(data)) {
      if (data.type === "file") {
        const decodedContent = Buffer.from(data.content, "base64");

        const existingFrontmater = matter(decodedContent).data;

        return existingFrontmater as Record<string, any>;
      }
    }
  }

  return null;
}

function buildFrontmatter(
  data: ReturnType<typeof getData>,
  existingFrontmatter: Record<string, any> | null,
  slug: string
) {
  let frontmatter: Record<string, any>;

  if (existingFrontmatter) {
    frontmatter = {
      ...existingFrontmatter,
      title: data.title,
      images: existingFrontmatter.images ?? [],
    };

    console.debug("frontmatter pre", frontmatter);

    frontmatter.title = data.title;

    if (!data.showAuthor) {
      delete existingFrontmatter.author;
    } else {
      frontmatter.author = data.authorName;
    }

    if (!data.coverImage) {
      delete existingFrontmatter.coverImage;
    } else if (
      data.coverImage.size > 0 &&
      `./${data.coverImage.name}` !== existingFrontmatter.coverImage
    ) {
      frontmatter.coverImage = `./${data.coverImage}`;
    }

    // Remove deleted images
    frontmatter.images = existingFrontmatter.images.filter(
      (image: FrontmatterImage) => !data.deletedFiles.includes(image.file)
    );

    frontmatter.images.push(
      ...data.uploadedFiles.map((file) => ({
        file: file.name,
        image: `./${file.name}`,
      }))
    );

    console.debug("frontmatter pre reduce", frontmatter);

    // Remove duplicate entries by filename
    frontmatter.images.reduce(
      (acc: FrontmatterImage[], cur: FrontmatterImage) => {
        if (!acc.find((image) => image.file !== cur.file)) {
          acc.push(cur);
        }

        return acc;
      }
    );
  } else {
    frontmatter = {
      title: data.title,
      date: new Date(),
      originalSlug: slug,
      images: data.uploadedFiles.map((file) => ({
        file: file.name,
        image: `./${file.name}`,
      })),
      author: data.authorName,
    };

    if (!data.showAuthor) {
      delete frontmatter.author;
    }

    if (data.coverImage) {
      frontmatter.coverImage = `./coverImage${path.extname(
        data.coverImage.name
      )}`;
    }
  }

  return frontmatter;
}

export const PUT: APIRoute = async ({ request }) => {
  const session = await getSession(request);

  if (!session) {
    return new Response("", { status: 401 });
  }

  const formData = await request.formData();

  let data: ReturnType<typeof getData>;

  try {
    data = getData(formData, session);
  } catch (error) {
    if (error instanceof Error) {
      return new Response(error.message, { status: 400 });
    }

    return new Response("Unknown error occured", { status: 500 });
  }

  // always use original slug since changing the title would result in the slug changing
  const slug = data.originalSlug ?? slugify(data.title);

  const octokit = new Octokit({
    auth: session.accessToken,
  });

  const existingFrontmatter = await getExistingArticleFrontmatter(
    octokit,
    slug
  );

  console.debug("existingFrontmatter", existingFrontmatter);

  const frontmatter = buildFrontmatter(data, existingFrontmatter, slug);

  console.debug("frontmatter", frontmatter);

  data.content = matter.stringify(data.content, frontmatter);

  let commitTree: Awaited<ReturnType<typeof buildCommitTree>>;

  try {
    commitTree = await buildCommitTree(
      octokit,
      slug,
      data.content,
      data.coverImage,
      data.uploadedFiles,
      data.deletedFiles,
      existingFrontmatter
    );
  } catch (error) {
    if (error instanceof Error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }

    return new Response("Unknown error occured", { status: 500 });
  }

  const mainBranchRef = await getRef(octokit, "heads/test2");

  if (!mainBranchRef) {
    return new Response(JSON.stringify({ error: "Failed to get branch ref" }), {
      status: 500,
    });
  }

  const createdTree = await createTree(
    octokit,
    commitTree,
    mainBranchRef.data.object.sha
  );

  if (!createdTree) {
    return new Response(
      JSON.stringify({ error: "Failed to create new tree" }),
      {
        status: 500,
      }
    );
  }

  const createdCommit = await createCommit(octokit, createdTree.data.sha, [
    mainBranchRef.data.object.sha,
  ]);

  if (!createdCommit) {
    return new Response(
      JSON.stringify({ error: "Failed to create new commit for tree" }),
      {
        status: 500,
      }
    );
  }

  const updatedReference = await updateReference(
    octokit,
    "heads/test2",
    createdCommit.data.sha
  );

  if (!updatedReference) {
    return new Response(
      JSON.stringify({ error: "Failed to update main branch reference" }),
      {
        status: 500,
      }
    );
  }

  return new Response("", { status: 200 });
};

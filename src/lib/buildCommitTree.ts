import type { CommitTree } from "./githubApi";
import type GithubApi from "./githubApi";

async function buildCommitTree(
  client: GithubApi,
  slug: string,
  content: string,
  coverImage: File | null,
  uploadedFiles: File[],
  deletedFiles: string[],
  deletedCoverImage?: string
): Promise<CommitTree> {
  const tree: CommitTree = [];

  const contentEncoded = Buffer.from(content).toString("base64");
  const articleBlob = await client.createBlob(contentEncoded);

  const mainBranchRef = await client.getRef(
    `heads/${import.meta.env.GITHUB_CONTENT_REPOSITORY_BRANCH}`
  );

  if (!mainBranchRef) {
    throw new Error("womp");
  }

  const currentTree = await client.getTree(
    mainBranchRef.data.object.sha,
    "true"
  );

  if (!currentTree) {
    throw new Error("rere");
  }

  const files = currentTree.data.tree
    .filter(
      (leaf) =>
        leaf?.type === "blob" && leaf.path?.startsWith(`articles/${slug}`)
    )
    .map((leaf) => ({ ...leaf, sha: null })) as CommitTree;

  tree.push(...files);

  console.dir(files, { depth: null });

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

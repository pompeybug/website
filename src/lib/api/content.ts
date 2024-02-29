import type { Octokit } from "@octokit/rest";
import type { Endpoints } from "@octokit/types";

export async function getFile(client: Octokit, path: string) {
  try {
    return await client.repos.getContent({
      owner: import.meta.env.GITHUB_ORGANISATION,
      repo: import.meta.env.GITHUB_CONTENT_REPOSITORY,
      path,
    });
  } catch (error) {
    return null;
  }
}

export async function createOrUpdateFile(
  client: Octokit,
  path: string,
  content: string,
  title: string,
  name: string,
  email: string,
  sha?: string
) {
  try {
    return await client.repos.createOrUpdateFileContents({
      owner: import.meta.env.GITHUB_ORGANISATION,
      repo: import.meta.env.GITHUB_CONTENT_REPOSITORY,
      path,
      message: `Writing content for ${title}`,
      committer: {
        name,
        email,
      },
      content,
      sha,
    });
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function createTree(
  client: Octokit,
  tree: Endpoints["POST /repos/{owner}/{repo}/git/trees"]["request"]["data"]["tree"],
  baseTree?: string
) {
  try {
    return await client.git.createTree({
      owner: import.meta.env.GITHUB_ORGANISATION,
      repo: import.meta.env.GITHUB_CONTENT_REPOSITORY,
      tree,
      base_tree: baseTree,
    });
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function createCommit(client: Octokit, treeSha: string, parents?: string[]) {
  try {
    return await client.git.createCommit({
      owner: import.meta.env.GITHUB_ORGANISATION,
      repo: import.meta.env.GITHUB_CONTENT_REPOSITORY,
      message: "test",
      tree: treeSha,
      parents,
    });
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function updateReference(
  client: Octokit,
  ref: string,
  sha: string
) {
  try {
    return await client.git.updateRef({
      owner: import.meta.env.GITHUB_ORGANISATION,
      repo: import.meta.env.GITHUB_CONTENT_REPOSITORY,
      ref,
      sha,
      
    });
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getRef(client: Octokit, ref: string) {
  try {
    return await client.git.getRef({
      owner: import.meta.env.GITHUB_ORGANISATION,
      repo: import.meta.env.GITHUB_CONTENT_REPOSITORY,
      ref,
    });
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function createBlob(client: Octokit, content: string, encoding = 'base64') {
  try {
    return await client.git.createBlob({
      owner: import.meta.env.GITHUB_ORGANISATION,
      repo: import.meta.env.GITHUB_CONTENT_REPOSITORY,
      content,
      encoding
    });
  } catch (error) {
    console.error(error);
    return null;
  }
}

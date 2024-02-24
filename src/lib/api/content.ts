import type { Octokit } from "@octokit/rest";

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

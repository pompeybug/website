import { Octokit } from "@octokit/rest";
import type { Endpoints } from "@octokit/types";

export default class GithubApi {
  readonly client: Octokit;
  readonly accessToken: string;

  constructor(client: Octokit, accessToken: string) {
    this.client = client;
    this.accessToken = accessToken;
  }

  static makeGithubApi(accessToken: string) {
    const client = new Octokit({
      auth: accessToken,
    });

    return new GithubApi(client, accessToken);
  }

  async getFile(path: string, ref = "main") {
    try {
      return await this.client.repos.getContent({
        owner: import.meta.env.GITHUB_ORGANISATION,
        repo: import.meta.env.GITHUB_CONTENT_REPOSITORY,
        path,
        ref,
      });
    } catch (error) {
      return null;
    }
  }

  async createOrUpdateFile(
    path: string,
    content: string,
    title: string,
    name: string,
    email: string,
    sha?: string
  ) {
    try {
      return await this.client.repos.createOrUpdateFileContents({
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

  async createTree(
    tree: Endpoints["POST /repos/{owner}/{repo}/git/trees"]["request"]["data"]["tree"],
    baseTree?: string
  ) {
    try {
      return await this.client.git.createTree({
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

  async createCommit(treeSha: string, parents?: string[]) {
    try {
      return await this.client.git.createCommit({
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

  async updateReference(ref: string, sha: string) {
    try {
      return await this.client.git.updateRef({
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

  async getRef(ref: string) {
    try {
      return await this.client.git.getRef({
        owner: import.meta.env.GITHUB_ORGANISATION,
        repo: import.meta.env.GITHUB_CONTENT_REPOSITORY,
        ref,
      });
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async createBlob(content: string, encoding = "base64") {
    try {
      return await this.client.git.createBlob({
        owner: import.meta.env.GITHUB_ORGANISATION,
        repo: import.meta.env.GITHUB_CONTENT_REPOSITORY,
        content,
        encoding,
      });
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}

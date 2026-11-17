// Keeps the content folder in step with its git remote. Every save is one
// commit, so the repository is both the backup and the edit history, and
// people who prefer git can still push changes that the site then picks up.
//
// CONTENT_GIT: "off" (default, nothing runs), "commit" (local commits only)
// or "push" (commit, then pull and push the branch).

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

const MODE = process.env.CONTENT_GIT ?? 'off';
const BRANCH = process.env.CONTENT_BRANCH ?? 'main';
const COMMITTER = { name: 'PCF website editor', email: 'noreply@pompey.bike' };

export function createGit(contentDir) {
  const enabled = MODE !== 'off' && existsSync(path.join(contentDir, '.git'));
  const status = { mode: enabled ? MODE : 'off', lastSyncAt: null, lastError: null };
  let chain = Promise.resolve();

  const git = (args) =>
    run('git', args, {
      cwd: contentDir,
      timeout: 120_000,
      env: {
        ...process.env,
        GIT_COMMITTER_NAME: COMMITTER.name,
        GIT_COMMITTER_EMAIL: COMMITTER.email,
        GIT_AUTHOR_NAME: COMMITTER.name,
        GIT_AUTHOR_EMAIL: COMMITTER.email,
        GIT_TERMINAL_PROMPT: '0',
      },
    });

  const head = async () => (await git(['rev-parse', 'HEAD'])).stdout.trim();

  // One git command at a time: saves and the periodic sync share this queue.
  const queued = (task) => {
    const next = chain.then(task, task);
    chain = next.catch(() => {});
    return next;
  };

  async function commitNow(message, authorName) {
    await git(['add', '-A']);
    const staged = await git(['diff', '--cached', '--name-only']);
    if (!staged.stdout.trim()) return false;
    // Only the editor's display name is recorded: the repository is public.
    const author = `${String(authorName || COMMITTER.name).replace(/[<>\n]/g, '')} <${COMMITTER.email}>`;
    await git(['commit', '-m', message, '--author', author]);
    return true;
  }

  // Returns true when the pull brought in changes made elsewhere.
  async function syncNow() {
    if (status.mode !== 'push') return false;
    try {
      const before = await head();
      await git(['pull', '--rebase', '--autostash', 'origin', BRANCH]);
      const pulled = (await head()) !== before;
      await git(['push', 'origin', `HEAD:${BRANCH}`]);
      status.lastSyncAt = new Date().toISOString();
      status.lastError = null;
      return pulled;
    } catch (error) {
      status.lastError = String(error.stderr || error.message).trim().split('\n').slice(-3).join(' ');
      console.error('Content sync failed:', status.lastError);
      return false;
    }
  }

  return {
    status: () => ({ ...status }),
    // Resolves once the commit exists; the push carries on in the background.
    commit(message, authorName, onPulled) {
      if (!enabled) return Promise.resolve();
      const committed = queued(() => commitNow(message, authorName));
      queued(syncNow).then((pulled) => pulled && onPulled?.());
      return committed;
    },
    sync(onPulled) {
      if (!enabled) return Promise.resolve(false);
      return queued(syncNow).then((pulled) => {
        if (pulled) onPulled?.();
        return pulled;
      });
    },
  };
}

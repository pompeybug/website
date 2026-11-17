# Portsmouth Cycle Forum (PCF) - Website source code

## Concepts

Several concepts underpin this site; keep them in mind when developing.

0. **Extend**.  This list is incomplete and inexhaustive.  Adding to it is good, so long as it's a high-level concept that can be easily grokked. 

1. **Mobile first**.  Our primary platform for readers is the mobile phone, so improvements to the UI should always focus on those users first, and their experience should not be diminished by unnecessarily focusing on desktop development.

2. **Encourage Discovery**.  We want people who find an article that's relevent to be easily able to discover other articles.  For this tags are key.  Careful maintenance of tags can help build useful paths across the site.

3. **Colours and Affordance**.  Generally speaking aim for the concept that if it's orange it's a hyperlink to somewhere useful and an be clicked.

## How the site works

The site is a small Node.js server (Express). It reads the articles and pages,
which are Markdown files, and sends each visitor a finished HTML page. There is
no build step and no framework: plain HTML, CSS and JavaScript.

- **Content** lives in its own repository, [pompeybug/content](https://github.com/pompeybug/content):
  `articles/` and `pages/`, each entry a Markdown file with a few details at the
  top (title, date, tags, top picture). An entry that has pictures is a folder
  holding `index.md` and its pictures.
- **Editing** happens at `/edit`. Committee members sign in with a Google
  account that a site owner has added on the People screen. A save is live
  straight away, and is also committed to the content repository, so that
  repository is both the backup and the history of every change.
- **Editing with git** still works: push to the content repository and the
  server picks the change up within five minutes.

### Code layout

| Path | What it is |
| --- | --- |
| `src/server.js` | Routes: public pages, images, and the editor's REST API under `/edit/api` |
| `src/content.js` | Reads, searches and saves the Markdown files |
| `src/markdown.js` | Markdown to HTML |
| `src/render.js` | The HTML templates for every public page |
| `src/images.js` | Resizes pictures on first request and prepares uploads |
| `src/auth.js` | Google sign-in and the list of editors |
| `src/git.js` | Commits each save and keeps the content repository in step |
| `public/` | Stylesheets, browser scripts, icons, and old uploads in `public/assets` |
| `views/edit.html` | The editor page |

### Running it on your own computer

You need Node.js 22.12 or newer.

```sh
npm install
git clone https://github.com/pompeybug/content.git data/content
cp .env.example .env
```

In `.env`, set `NODE_ENV=development`, `PORT=3000`, `SITE_ORIGIN=http://localhost:3000`,
`CONTENT_GIT=off`, remove the `DATA_DIR` line, and set both `ADMIN_EMAILS` and
`DEV_LOGIN_EMAIL` to your own email address so you can open the editor without
setting up Google sign-in. Then:

```sh
npm run dev     # http://localhost:3000 and http://localhost:3000/edit
npm test
npm run lint
```

### Hosting

The site runs under pm2 on the VPS, behind nginx. Code is deployed by
`deploy.sh` (run by GitHub Actions on a push to `main`). Content, the resized
picture cache and the list of editors live in `DATA_DIR`, outside the code
folder, so a deploy never touches them. `deploy/install-nginx.sh` installs the
nginx site and its certificate.


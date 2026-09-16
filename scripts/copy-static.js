/**
 * Copies everything in `public/` except `index.html` into `dist/`.
 *
 * ★ Why this is a script and not a plugin. `HtmlWebpackPlugin` takes
 *   `public/index.html` as a template and emits it, but it does not know about
 *   the other files sitting beside it — the favicon, the manifest, the icons,
 *   the social image. Without this they exist in the repo, are referenced by
 *   the HTML, and 404 in production: the tab shows a blank page icon and a
 *   WhatsApp link preview shows nothing.
 *
 *   The alternative was `copy-webpack-plugin`, which is another dependency and
 *   another lock-file entry for twelve lines of `fs.copyFileSync`. 12_STACK's
 *   rule is that a dependency has to earn its place; this one does not.
 */

const fs = require('fs');
const path = require('path');

const from = path.resolve(__dirname, '..', 'public');
const to = path.resolve(__dirname, '..', 'dist');

if (!fs.existsSync(to)) {
  console.error('copy-static: dist/ does not exist — run webpack first.');
  process.exit(1);
}

let copied = 0;
for (const name of fs.readdirSync(from)) {
  // index.html is the HtmlWebpackPlugin template; it emits its own, with the
  // hashed bundle injected. Copying ours over it would erase the script tag.
  if (name === 'index.html') continue;
  const src = path.join(from, name);
  if (fs.statSync(src).isDirectory()) continue;
  fs.copyFileSync(src, path.join(to, name));
  copied += 1;
}

console.log(`copy-static: ${copied} file(s) → dist/`);

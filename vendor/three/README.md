# Three.js browser runtime

Version: **0.180.0**. Original files are distributed under the included MIT `LICENSE`.

This folder is committed with the game. It contains the WebGL ES modules and the
transitive dependencies of the addons used by the game and preview pages.
Playing the game does not require `node_modules`, npm, pnpm, or a network download.
The local launcher still requires Node.js 20 or newer to serve the game files.

To refresh after changing the locked Three.js version or adding an addon:

```sh
pnpm install --frozen-lockfile
node scripts/vendor-three.mjs
```

Review and commit this folder together with the dependency and import changes.
`manifest.json` records the version and SHA-256 of each copied upstream file.

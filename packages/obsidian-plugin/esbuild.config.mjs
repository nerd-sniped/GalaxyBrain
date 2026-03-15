import esbuild from 'esbuild';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const watch = process.argv.includes('--watch');
const packageDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(packageDir, 'dist');
const vaultPluginDir = path.resolve(
  packageDir,
  '../../vault/.obsidian/plugins/galaxybrain-preview',
);
const staticFiles = ['manifest.json', 'styles.css', 'versions.json'];

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function copyStaticFiles(targetDir) {
  ensureDir(targetDir);
  for (const file of staticFiles) {
    copyFileSync(path.join(packageDir, file), path.join(targetDir, file));
  }
}

function copyBuildOutputs() {
  const builtMain = path.join(distDir, 'main.js');
  if (!existsSync(builtMain)) return;

  copyStaticFiles(distDir);
  copyStaticFiles(vaultPluginDir);
  copyFileSync(builtMain, path.join(vaultPluginDir, 'main.js'));
}

const copyPluginFiles = {
  name: 'copy-plugin-files',
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length > 0) return;
      copyBuildOutputs();
      console.log(`[galaxybrain-preview] Copied build to ${vaultPluginDir}`);
    });
  },
};

const buildOptions = {
  entryPoints: [path.join(packageDir, 'main.ts')],
  outfile: path.join(distDir, 'main.js'),
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'es2022',
  jsx: 'automatic',
  jsxImportSource: 'react',
  sourcemap: watch ? 'inline' : false,
  external: ['obsidian', 'electron'],
  logLevel: 'info',
  plugins: [copyPluginFiles],
};

ensureDir(distDir);

if (watch) {
  const context = await esbuild.context(buildOptions);
  await context.watch();
  console.log('[galaxybrain-preview] Watching for changes...');
} else {
  await esbuild.build(buildOptions);
}

const fs = require('fs');
const path = require('path');
const { defineConfig } = require('vite');

const root = __dirname;
const input = {
  index: path.resolve(root, 'index.html'),
  'kode-akun': path.resolve(root, 'kode-akun.html'),
  'input-jurnal': path.resolve(root, 'input-jurnal.html'),
  'jurnal-umum': path.resolve(root, 'jurnal-umum.html'),
  'neraca-jalur': path.resolve(root, 'neraca-jalur.html'),
  'laba-rugi': path.resolve(root, 'laba-rugi.html'),
  neraca: path.resolve(root, 'neraca.html'),
  'inventaris/index': path.resolve(root, 'inventaris/index.html'),
};

// Fallback: sertakan halaman HTML lain yang mungkin ditambahkan kemudian.
for (const file of fs.readdirSync(root)) {
  if (!file.endsWith('.html') || file === 'input-data.html') continue;
  const name = file.replace(/\.html$/, '');
  if (!input[name]) input[name] = path.resolve(root, file);
}

const copyClassicScripts = {
  name: 'copy-classic-scripts',
  closeBundle() {
    const outDir = path.resolve(root, 'dist');
    const files = ['data.js', 'app.js', 'input-data.html', 'inventaris/app.js'];
    files.forEach((file) => {
      const target = path.resolve(outDir, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.resolve(root, file), target);
    });
  },
};

module.exports = defineConfig({
  root,
  base: './',
  publicDir: path.resolve(root, 'public'),
  plugins: [copyClassicScripts],
  build: {
    outDir: path.resolve(root, 'dist'),
    emptyOutDir: true,
    rollupOptions: { input },
  },
  server: { host: true },
});

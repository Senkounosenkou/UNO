import { build } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  console.log('Building lobby_action.js...');
  // lobby_action (ロビー用) のビルド
  await build({
    configFile: false, // 共通設定ファイルとの競合を防止
    build: {
      lib: {
        entry: resolve(__dirname, 'src/lobby_main.js'),
        name: 'UnoLobby',
        formats: ['iife'],
        fileName: () => 'lobby_action.js'
      },
      outDir: 'dist',
      minify: false,
      emptyOutDir: true // 最初のビルドで dist をクリアする
    }
  });

  console.log('Building UNO.js...');
  // UNO (ゲーム盤面用) のビルド
  await build({
    configFile: false,
    build: {
      lib: {
        entry: resolve(__dirname, 'src/main.js'),
        name: 'UnoGame',
        formats: ['iife'],
        fileName: () => 'UNO.js'
      },
      outDir: 'dist',
      minify: false,
      emptyOutDir: false // 成果物を上書き消去しないよう false にする
    }
  });

  console.log('Build completed successfully!');
}

run().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});

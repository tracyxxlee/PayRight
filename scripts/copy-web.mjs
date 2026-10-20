import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const www = join(root, 'www');
const vendor = join(root, 'vendor', 'tesseract');

function stageOcrAssets() {
  const coreDir = join(vendor, 'core');
  const langDir = join(vendor, 'lang');
  rmSync(vendor, { recursive: true, force: true });
  mkdirSync(coreDir, { recursive: true });
  mkdirSync(langDir, { recursive: true });

  const dist = join(root, 'node_modules', 'tesseract.js', 'dist');
  cpSync(join(dist, 'tesseract.min.js'), join(vendor, 'tesseract.min.js'));
  cpSync(join(dist, 'worker.min.js'), join(vendor, 'worker.min.js'));

  const corePkg = join(root, 'node_modules', 'tesseract.js-core');
  const coreScripts = [
    'tesseract-core.wasm.js',
    'tesseract-core-simd.wasm.js',
    'tesseract-core-lstm.wasm.js',
    'tesseract-core-simd-lstm.wasm.js',
  ];
  const coreBinaries = [
    'tesseract-core.wasm',
    'tesseract-core-simd.wasm',
    'tesseract-core-lstm.wasm',
    'tesseract-core-simd-lstm.wasm',
  ];
  for (const name of coreScripts) {
    cpSync(join(corePkg, name), join(coreDir, name));
  }
  // 核心 JS 在 Worker 裡載入時，document 不存在，wasm 會改跟 worker.min.js 同一個目錄找
  for (const name of coreBinaries) {
    cpSync(join(corePkg, name), join(vendor, name));
  }

  cpSync(
    join(root, 'node_modules', '@tesseract.js-data', 'chi_tra', '4.0.0', 'chi_tra.traineddata.gz'),
    join(langDir, 'chi_tra.traineddata.gz'),
  );
}

stageOcrAssets();

const files = [
  'index.html',
  'styles.css',
  'app.js',
  'ocr-service.js',
  'product-manager.js',
  'price-calculator.js',
];

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

for (const file of files) {
  cpSync(join(root, file), join(www, file));
}

cpSync(vendor, join(www, 'vendor', 'tesseract'), { recursive: true });

console.log(`Copied ${files.length} files and local OCR assets to www/`);

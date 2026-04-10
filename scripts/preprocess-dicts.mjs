import { createReadStream, mkdirSync, writeFileSync, renameSync } from 'fs';
import { createInterface } from 'readline';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DICT_DIR = resolve(__dirname, '../');
const OUT_DIR = resolve(__dirname, '../public/dicts');
const VALID_CHARS = new Set([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'Ñ']);
const MIN_LEN = 2;
const MAX_LEN = 15;

async function processFile(filePath, outPath, lang) {
  const result = {};
  let total = 0;
  let kept = 0;

  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const raw of rl) {
    const word = raw.trim().toUpperCase();
    if (!word) continue;
    total++;

    if (word.length < MIN_LEN || word.length > MAX_LEN) continue;

    let valid = true;
    for (const ch of word) {
      if (!VALID_CHARS.has(ch)) { valid = false; break; }
    }
    if (!valid) continue;

    const len = word.length;
    if (!result[len]) result[len] = [];
    result[len].push(word);
    kept++;
  }

  // Remove duplicates per length bucket
  for (const len of Object.keys(result)) {
    result[len] = [...new Set(result[len])];
  }

  const tmp = outPath + '.tmp';
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(tmp, JSON.stringify(result));
  renameSync(tmp, outPath);

  const byLen = Object.entries(result)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([len, words]) => `  ${len}-letter: ${words.length}`)
    .join('\n');

  console.log(`\n[${lang}] ${filePath}`);
  console.log(`  Total lines: ${total}, kept: ${kept}`);
  console.log(`  By length:\n${byLen}`);
  console.log(`  Written to: ${outPath}`);
}

async function main() {
  const enSrc = resolve(DICT_DIR, 'English.txt');
  const esSrc = resolve(DICT_DIR, 'Spanish.txt');
  const enOut = resolve(OUT_DIR, 'en.json');
  const esOut = resolve(OUT_DIR, 'es.json');

  console.log('Preprocessing dictionaries...');
  await Promise.all([
    processFile(enSrc, enOut, 'English'),
    processFile(esSrc, esOut, 'Spanish'),
  ]);
  console.log('\nDone!');
}

main().catch((err) => { console.error(err); process.exit(1); });

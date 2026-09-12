import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/utils/collectionCovers.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { buildCollectionCovers } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const photos = [
  { category: 'wildlife', imageUrl: 'wildlife-original', thumbnailUrl: 'wildlife-preview', tags: ['macro'] },
  { category: 'birds', imageUrl: 'bird-original', thumbnailUrl: 'bird-preview' },
  { category: 'macro', imageUrl: 'private', published: false },
  { category: 'macro', imageUrl: 'video', type: 'video' },
];
const covers = buildCollectionCovers(photos, { nature: 'admin-cover' }, [
  { category: 'others', imageUrl: 'unrelated' },
  { category: 'landscapes', imageUrl: 'landscape-cover' },
]);
const cover = (key) => covers.find((item) => item.key === key);
assert.equal(covers.length, 8);
assert.equal(cover('birds').imageUrl, 'bird-preview', 'Covers can include categories outside the latest homepage photos');
assert.deepEqual(cover('birds').fallbackImageUrls, ['bird-original']);
assert.equal(cover('macro').imageUrl, '', 'Tags, unpublished photos, videos and unrelated gallery buckets must not supply covers');
assert.equal(cover('domestic').imageUrl, '');
assert.equal(cover('nature').imageUrl, 'admin-cover', 'Respect a configured cover');
assert.equal(cover('landscape').imageUrl, 'landscape-cover');
assert.equal(cover('wildlife').imageUrl, 'wildlife-preview');
console.log('Collection cover regression checks passed.');

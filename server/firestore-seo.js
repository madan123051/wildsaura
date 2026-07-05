const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.FIREBASE_WEB_API_KEY;

function getFirestoreBase() {
  if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
    console.warn('Firestore SEO env is missing FIREBASE_PROJECT_ID or FIREBASE_WEB_API_KEY');
    return '';
  }
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
}

export const strField = (doc, key) => doc.fields?.[key]?.stringValue || '';
export const timestampField = (doc, key) => doc.fields?.[key]?.timestampValue || '';
export const intField = (doc, key, fallback = 0) => {
  const value = doc.fields?.[key]?.integerValue ?? doc.fields?.[key]?.doubleValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
export const boolField = (doc, key, fallback = true) => {
  const v = doc.fields?.[key]?.booleanValue;
  return v === undefined ? fallback : v;
};
export const arrayField = (doc, key) => (doc.fields?.[key]?.arrayValue?.values || [])
  .map((v) => v.stringValue || '')
  .filter(Boolean);

async function firestoreFetch(url) {
  if (!url) return null;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  return res.json();
}

export async function listCollection(collectionId, pageSize = 1000) {
  const firestoreBase = getFirestoreBase();
  if (!firestoreBase) return [];
  const docs = [];
  let pageToken = '';
  do {
    const url = `${firestoreBase}/${collectionId}?key=${FIREBASE_API_KEY}&pageSize=${pageSize}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const data = await firestoreFetch(url);
    if (!data) break;
    if (data.documents) docs.push(...data.documents);
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}

export async function getDocumentByIdOrSlug(collectionId, idOrSlug) {
  const firestoreBase = getFirestoreBase();
  if (!firestoreBase) return null;
  const id = String(idOrSlug || '').trim();
  if (!id) return null;

  const directUrl = `${firestoreBase}/${collectionId}/${encodeURIComponent(id)}?key=${FIREBASE_API_KEY}`;
  const direct = await firestoreFetch(directUrl);
  if (direct) return direct;

  const queryUrl = `${firestoreBase}:runQuery?key=${FIREBASE_API_KEY}`;
  const body = {
    structuredQuery: {
      from: [{ collectionId }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'slug' },
          op: 'EQUAL',
          value: { stringValue: id },
        },
      },
      limit: 1,
    },
  };
  const res = await fetch(queryUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows.find((row) => row.document)?.document || null;
}

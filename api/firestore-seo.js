const FIREBASE_PROJECT_ID = 'wildsaura-1ef8a';
const FIREBASE_API_KEY = 'AIzaSyCXDJrFmn-pzbqys91tj4Fruqn4tl58p9Y';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export const strField = (doc, key) => doc.fields?.[key]?.stringValue || '';
export const boolField = (doc, key, fallback = true) => {
  const v = doc.fields?.[key]?.booleanValue;
  return v === undefined ? fallback : v;
};
export const arrayField = (doc, key) => (doc.fields?.[key]?.arrayValue?.values || [])
  .map((v) => v.stringValue || '')
  .filter(Boolean);

async function firestoreFetch(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  return res.json();
}

export async function listCollection(collectionId, pageSize = 1000) {
  const docs = [];
  let pageToken = '';
  do {
    const url = `${FIRESTORE_BASE}/${collectionId}?key=${FIREBASE_API_KEY}&pageSize=${pageSize}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const data = await firestoreFetch(url);
    if (!data) break;
    if (data.documents) docs.push(...data.documents);
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}

export async function getDocumentByIdOrSlug(collectionId, idOrSlug) {
  const id = String(idOrSlug || '').trim();
  if (!id) return null;

  const directUrl = `${FIRESTORE_BASE}/${collectionId}/${encodeURIComponent(id)}?key=${FIREBASE_API_KEY}`;
  const direct = await firestoreFetch(directUrl);
  if (direct) return direct;

  const queryUrl = `${FIRESTORE_BASE}:runQuery?key=${FIREBASE_API_KEY}`;
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

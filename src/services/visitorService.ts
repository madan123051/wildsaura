import { db, realtimeDb } from '../firebaseCore';
import { onDisconnect, onValue, ref as rtdbRef, remove, set, update as rtdbUpdate, type Unsubscribe as RtdbUnsubscribe } from 'firebase/database';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const VISITORS_COLLECTION = 'visitors';

export interface FirestoreVisitor {
  email: string;
  displayName: string;
  avatarColor: string;
  avatarUrl: string;
  avatarAnimal: string;
  loginMethod: string;
  downloadCount: number;
  createdAt?: any;
}

function emailToDocId(email: string): string {
  return email.replace(/[.@]/g, '_');
}

export async function saveVisitorToFirestore(visitor: Omit<FirestoreVisitor, 'createdAt'>): Promise<void> {
  const docId = emailToDocId(visitor.email);
  await setDoc(doc(db, VISITORS_COLLECTION, docId), {
    ...visitor,
    createdAt: serverTimestamp(),
  }, { merge: true });
}

export async function getVisitorFromFirestore(email: string): Promise<FirestoreVisitor | null> {
  const docId = emailToDocId(email);
  const snapshot = await getDoc(doc(db, VISITORS_COLLECTION, docId));
  if (snapshot.exists()) {
    return snapshot.data() as FirestoreVisitor;
  }
  return null;
}

export async function updateVisitorDownloadCount(email: string, count: number): Promise<void> {
  const docId = emailToDocId(email);
  await updateDoc(doc(db, VISITORS_COLLECTION, docId), { downloadCount: count });
}

export async function updateVisitorProfile(email: string, data: Partial<FirestoreVisitor>): Promise<void> {
  const docId = emailToDocId(email);
  await updateDoc(doc(db, VISITORS_COLLECTION, docId), data);
}

// ── Live Online Visitor Tracking (Realtime Database) ──────────────────────
export function trackOnlineVisitor(sessionId: string, displayName: string, avatarUrl?: string): () => void {
  if (!realtimeDb || localStorage.getItem('wa_admin_session') === 'true') return () => {};
  const presenceRef = rtdbRef(realtimeDb, `presence/${sessionId}`);
  const payload = { displayName, avatarUrl: avatarUrl || '', lastSeen: Date.now(), online: true };
  set(presenceRef, payload).catch(console.warn);
  onDisconnect(presenceRef).remove().catch(console.warn);
  const interval = window.setInterval(() => {
    rtdbUpdate(presenceRef, { lastSeen: Date.now(), online: true }).catch(console.warn);
  }, 30000);
  return () => {
    window.clearInterval(interval);
    remove(presenceRef).catch(console.warn);
  };
}

export function subscribeToOnlineVisitors(onUpdate: (count: number) => void, onError?: (error: Error) => void): RtdbUnsubscribe {
  if (!realtimeDb) { onUpdate(0); return () => {}; }
  return onValue(rtdbRef(realtimeDb, 'presence'), (snapshot) => {
    const cutoff = Date.now() - 90000;
    const count = Object.values(snapshot.val() || {}).filter((item: any) => item?.online && Number(item.lastSeen || 0) > cutoff).length;
    onUpdate(count);
  }, (error) => { console.error('Online visitors subscription error:', error); onError?.(error); });
}

import { db } from '../firebase';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, onSnapshot, deleteDoc, Unsubscribe } from 'firebase/firestore';

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

// ── Live Online Visitor Tracking ──────────────────────────────────────────

const ONLINE_COLLECTION = 'online_visitors';

/**
 * Track a visitor as online. Sets presence and heartbeats every 30s.
 * Returns a cleanup function to call when the visitor goes offline.
 */
export function trackOnlineVisitor(
  sessionId: string,
  displayName: string,
  avatarUrl?: string
): () => void {
  const docRef = doc(db, ONLINE_COLLECTION, sessionId);

  // Set initial presence
  setDoc(docRef, {
    displayName,
    avatarUrl: avatarUrl || '',
    lastSeen: serverTimestamp(),
    online: true,
  }, { merge: true }).catch(console.warn);

  // Heartbeat every 30 seconds
  const interval = setInterval(() => {
    setDoc(docRef, { lastSeen: serverTimestamp(), online: true }, { merge: true }).catch(console.warn);
  }, 30000);

  // Cleanup function
  const cleanup = () => {
    clearInterval(interval);
    deleteDoc(docRef).catch(console.warn);
  };

  // Also clean up on page unload
  const handleUnload = () => cleanup();
  window.addEventListener('beforeunload', handleUnload);

  return () => {
    window.removeEventListener('beforeunload', handleUnload);
    cleanup();
  };
}

/**
 * Subscribe to live online visitor count.
 * Returns unsubscribe function.
 */
export function subscribeToOnlineVisitors(
  onUpdate: (count: number) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(db, ONLINE_COLLECTION), where('online', '==', true));
  return onSnapshot(q,
    (snapshot) => {
      onUpdate(snapshot.size);
    },
    (error) => {
      console.error('Online visitors subscription error:', error);
      if (onError) onError(error);
    }
  );
}

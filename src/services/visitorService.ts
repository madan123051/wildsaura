import { db } from '../firebase';
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

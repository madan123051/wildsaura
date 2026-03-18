import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';

const COMMENTS_COLLECTION = 'comments';

export interface FirestoreComment {
  id?: string;
  targetType: 'photo' | 'story';
  targetId: number;
  displayName: string;
  avatarColor: string;
  content: string;
  createdAt?: any;
}

export async function addCommentToFirestore(comment: Omit<FirestoreComment, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, COMMENTS_COLLECTION), {
    ...comment,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getCommentsForTarget(targetType: 'photo' | 'story', targetId: number): Promise<FirestoreComment[]> {
  try {
    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where('targetType', '==', targetType),
      where('targetId', '==', targetId),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreComment));
  } catch (err) {
    // If composite index is missing, try without ordering
    try {
      const q = query(
        collection(db, COMMENTS_COLLECTION),
        where('targetType', '==', targetType),
        where('targetId', '==', targetId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreComment));
    } catch {
      console.warn('Firestore comments fetch failed:', err);
      return [];
    }
  }
}

export async function getAllComments(): Promise<FirestoreComment[]> {
  try {
    const q = query(collection(db, COMMENTS_COLLECTION), orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreComment));
  } catch (err) {
    try {
      const snapshot = await getDocs(collection(db, COMMENTS_COLLECTION));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreComment));
    } catch {
      console.warn('Firestore comments fetch failed:', err);
      return [];
    }
  }
}

export async function deleteCommentFromFirestore(docId: string): Promise<void> {
  await deleteDoc(doc(db, COMMENTS_COLLECTION, docId));
}

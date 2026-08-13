import { db } from '../firebaseCore';
import { doc, setDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

const LIKES_COLLECTION = 'user_likes';

function emailToDocId(email: string): string {
  return email.replace(/[.@]/g, '_');
}

export async function addUserLike(email: string, targetType: 'photo' | 'story' | 'video', targetId: string): Promise<void> {
  const docId = `${emailToDocId(email)}_${targetType}_${targetId}`;
  await setDoc(doc(db, LIKES_COLLECTION, docId), {
    email,
    targetType,
    targetId,
    createdAt: serverTimestamp(),
  });
}

export async function removeUserLike(email: string, targetType: 'photo' | 'story' | 'video', targetId: string): Promise<void> {
  const docId = `${emailToDocId(email)}_${targetType}_${targetId}`;
  await deleteDoc(doc(db, LIKES_COLLECTION, docId));
}

export async function getUserLikes(email: string): Promise<{targetType: string, targetId: string}[]> {
  try {
    const q = query(collection(db, LIKES_COLLECTION), where('email', '==', email));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
      targetType: d.data().targetType,
      targetId: String(d.data().targetId), // Ensure string (backward compat with old number IDs)
    }));
  } catch (err) {
    console.warn('Failed to load user likes:', err);
    return [];
  }
}

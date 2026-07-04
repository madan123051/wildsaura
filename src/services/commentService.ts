import { collection, addDoc, getDocs, query, orderBy, onSnapshot, Unsubscribe, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { sendToAiControlCenter } from './aiControlWebhook';

export interface FirestoreComment {
  id?: string;
  targetType: 'photo' | 'story' | 'video';
  targetId: string; // firestoreId of the photo/story/video
  displayName: string;
  avatarColor: string;
  avatarUrl?: string;
  content: string;
  createdAt?: any;
}

export async function addCommentToFirestore(comment: Omit<FirestoreComment, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'comments'), {
      ...comment,
      avatarUrl: comment.avatarUrl || '',
      createdAt: new Date(),
    });
    void sendToAiControlCenter({
      source: 'website',
      type: 'comment',
      sender_name: comment.displayName,
      body: comment.content,
      metadata: {
        targetType: comment.targetType,
        targetId: comment.targetId,
        collection: 'comments',
        docId: docRef.id,
      },
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

export async function deleteCommentFromFirestore(commentId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'comments', commentId));
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}

export async function getCommentsForTarget(targetType: string, targetId: string): Promise<FirestoreComment[]> {
  try {
    const q = query(collection(db, 'comments'), orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as FirestoreComment))
      .filter(c => c.targetType === targetType && c.targetId === targetId);
  } catch (error) {
    console.error('Error getting comments:', error);
    return [];
  }
}

export async function getAllComments(): Promise<FirestoreComment[]> {
  try {
    const q = query(collection(db, 'comments'), orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreComment));
  } catch (error) {
    console.error('Error getting all comments:', error);
    return [];
  }
}

/**
 * Real-time subscription to all comments.
 * Calls onUpdate whenever comments change (add/edit/delete).
 * Returns an unsubscribe function.
 */
export function subscribeToAllComments(
  onUpdate: (comments: FirestoreComment[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'comments'), orderBy('createdAt', 'asc'));
  return onSnapshot(q,
    (snapshot) => {
      const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreComment));
      onUpdate(comments);
    },
    (error) => {
      console.error('Comment subscription error:', error);
      if (onError) onError(error);
    }
  );
}

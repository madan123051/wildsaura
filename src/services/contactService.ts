import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp, onSnapshot, Unsubscribe } from 'firebase/firestore';

export interface ContactMessage {
  id?: string;
  name: string;
  email: string;
  message: string;
  createdAt?: any;
  read?: boolean;
}

const COLLECTION = 'contactMessages';

export async function saveContactMessage(msg: Omit<ContactMessage, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...msg,
    read: false,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getContactMessages(): Promise<ContactMessage[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ContactMessage));
  } catch {
    const snapshot = await getDocs(collection(db, COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ContactMessage));
  }
}

export async function deleteContactMessage(docId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, docId));
}

export function subscribeToContactMessages(
  onUpdate: (messages: ContactMessage[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q,
    (snapshot) => {
      const messages = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ContactMessage));
      onUpdate(messages);
    },
    (error) => {
      console.error('Contact messages subscription error:', error);
      if (onError) onError(error);
    }
  );
}

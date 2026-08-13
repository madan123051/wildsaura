import { getAuth, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import app from './firebaseCore';

export const auth = getAuth(app);

export const observeAuthState = (listener: (user: User | null) => void) =>
  onAuthStateChanged(auth, listener);

export const signOutCurrentUser = () => signOut(auth);

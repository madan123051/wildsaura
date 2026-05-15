import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  User,
  updateProfile,
  sendPasswordResetEmail,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider, appleProvider } from '../firebase';

/**
 * Create a new user account with email and password
 */
export const registerWithEmail = async (
  email: string,
  password: string,
  displayName: string
) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile with display name
    await updateProfile(userCredential.user, {
      displayName: displayName,
      photoURL: null,
    });
    
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message || 'Registration failed');
  }
};

/**
 * Sign in with email and password
 */
export const loginWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message || 'Login failed');
  }
};

/**
 * Sign in with Google
 */
export const loginWithGoogle = async () => {
  try {
    const userCredential = await signInWithPopup(auth, googleProvider);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message || 'Google login failed');
  }
};

/**
 * Sign in with Facebook
 */
export const loginWithFacebook = async () => {
  try {
    const userCredential = await signInWithPopup(auth, facebookProvider);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message || 'Facebook login failed');
  }
};

/**
 * Sign in with Apple
 */
export const loginWithApple = async () => {
  try {
    const userCredential = await signInWithPopup(auth, appleProvider);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message || 'Apple login failed');
  }
};

/**
 * Sign out current user
 */
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message || 'Logout failed');
  }
};

/**
 * Get current user
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

/**
 * Update user display name
 */
export const updateUserName = async (displayName: string) => {
  try {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName });
      return auth.currentUser;
    }
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update name');
  }
};

/**
 * Update user email
 */
export const updateUserEmail = async (newEmail: string) => {
  try {
    if (auth.currentUser) {
      await updateEmail(auth.currentUser, newEmail);
      return auth.currentUser;
    }
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update email');
  }
};

/**
 * Update user password
 */
export const updateUserPassword = async (newPassword: string) => {
  try {
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, newPassword);
      return auth.currentUser;
    }
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update password');
  }
};

/**
 * Send password reset email
 */
export const sendResetEmail = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send reset email');
  }
};

/**
 * Subscribe to auth state changes
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return auth.onAuthStateChanged(callback);
};

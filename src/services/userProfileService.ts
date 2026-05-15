import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentUser } from './authService';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  avatarColor?: string; // Default avatar color if no image
  spiritAnimal?: string; // Animal spirit assigned by user
  bio?: string;
  location?: string;
  website?: string;
  loginMethod: 'email' | 'google' | 'facebook' | 'apple';
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  isVerified?: boolean;
  totalPhotosLiked?: number;
  totalStoriesLiked?: number;
  followerCount?: number;
  followingCount?: number;
}

const USERS_COLLECTION = 'users';

/**
 * Create a new user profile in Firestore
 */
export const createUserProfile = async (
  uid: string,
  email: string,
  displayName: string,
  loginMethod: 'email' | 'google' | 'facebook' | 'apple',
  avatarUrl?: string
): Promise<UserProfile> => {
  try {
    const now = Timestamp.now();
    const userProfile: UserProfile = {
      uid,
      email,
      displayName,
      loginMethod,
      avatarUrl,
      createdAt: now,
      updatedAt: now,
      totalPhotosLiked: 0,
      totalStoriesLiked: 0,
      followerCount: 0,
      followingCount: 0,
    };

    await setDoc(doc(db, USERS_COLLECTION, uid), userProfile);
    return userProfile;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create user profile');
  }
};

/**
 * Get user profile by UID
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch user profile');
  }
};

/**
 * Get current logged-in user's profile
 */
export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) return null;
    
    return await getUserProfile(currentUser.uid);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch current user profile');
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now(),
    };
    
    await updateDoc(userRef, updateData);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update user profile');
  }
};

/**
 * Update current user's profile
 */
export const updateCurrentUserProfile = async (
  updates: Partial<UserProfile>
): Promise<void> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('No user logged in');
    }
    
    await updateUserProfile(currentUser.uid, updates);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update user profile');
  }
};

/**
 * Update user's spirit animal
 */
export const updateSpiritAnimal = async (
  uid: string,
  spiritAnimal: string
): Promise<void> => {
  try {
    await updateUserProfile(uid, { spiritAnimal });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update spirit animal');
  }
};

/**
 * Update user's avatar
 */
export const updateUserAvatar = async (
  uid: string,
  avatarUrl: string,
  avatarColor?: string
): Promise<void> => {
  try {
    const updates: any = { avatarUrl };
    if (avatarColor) {
      updates.avatarColor = avatarColor;
    }
    await updateUserProfile(uid, updates);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update avatar');
  }
};

/**
 * Get user profile by email
 */
export const getUserProfileByEmail = async (email: string): Promise<UserProfile | null> => {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('email', '==', email)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return null;
    
    return querySnapshot.docs[0].data() as UserProfile;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch user profile by email');
  }
};

/**
 * Check if email already exists
 */
export const emailExists = async (email: string): Promise<boolean> => {
  try {
    const profile = await getUserProfileByEmail(email);
    return profile !== null;
  } catch (error) {
    return false;
  }
};

/**
 * Delete user profile
 */
export const deleteUserProfile = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    // Instead of deleting, we can mark as deleted or archive
    await updateDoc(userRef, {
      deleted: true,
      deletedAt: Timestamp.now(),
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to delete user profile');
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async (uid: string) => {
  try {
    const profile = await getUserProfile(uid);
    if (!profile) return null;

    return {
      uid,
      displayName: profile.displayName,
      followerCount: profile.followerCount || 0,
      followingCount: profile.followingCount || 0,
      totalPhotosLiked: profile.totalPhotosLiked || 0,
      totalStoriesLiked: profile.totalStoriesLiked || 0,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch user stats');
  }
};

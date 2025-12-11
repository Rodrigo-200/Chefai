import { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { User } from '../types';
import { db } from './firebase';

const userDocRef = (uid: string) => doc(db, 'users', uid);

export const ensureUserProfile = async (fbUser: FirebaseUser): Promise<User> => {
  const baseProfile: User = {
    uid: fbUser.uid,
    displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'ChefAI User',
    email: fbUser.email || undefined,
    photoURL: fbUser.photoURL || undefined,
    provider: fbUser.providerData?.[0]?.providerId || 'password',
    savedRecipeIds: [],
    folders: [],
  };
  try {
    const ref = userDocRef(fbUser.uid);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      await setDoc(ref, baseProfile);
      return baseProfile;
    }
    const data = snapshot.data();
    return {
      uid: fbUser.uid,
      displayName: (data.displayName as string) || baseProfile.displayName,
      email: (data.email as string | undefined) || baseProfile.email,
      photoURL: (data.photoURL as string | undefined) || baseProfile.photoURL,
      provider: (data.provider as string | undefined) || baseProfile.provider,
      savedRecipeIds: Array.isArray(data.savedRecipeIds) ? (data.savedRecipeIds as string[]) : [],
      folders: Array.isArray(data.folders) ? (data.folders as any[]) : [],
    };
  } catch (err) {
    console.warn('Falling back to local profile (offline)', err);
    return baseProfile;
  }
};

export const addSavedRecipeId = async (uid: string, recipeId: string) => {
  try {
    const ref = userDocRef(uid);
    await updateDoc(ref, { savedRecipeIds: arrayUnion(recipeId) });
  } catch (err) {
    console.warn('Could not sync saved recipe to Firestore', err);
    throw err;
  }
};

export const removeSavedRecipeId = async (uid: string, recipeId: string) => {
  try {
    const ref = userDocRef(uid);
    await updateDoc(ref, { savedRecipeIds: arrayRemove(recipeId) });
  } catch (err) {
    console.warn('Could not remove saved recipe from Firestore', err);
    throw err;
  }
};

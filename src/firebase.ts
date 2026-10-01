import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firestore Database instance with configured database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Firebase Authentication instance
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test as required by Firebase integration guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore connection: Client is offline or initializing.");
    }
    return false;
  }
}

export interface AppUser {
  uid: string;
  isAnonymous?: boolean;
}

export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'server_user';
  let uid = localStorage.getItem('vr_card_player_uid');
  if (!uid) {
    uid = `player_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem('vr_card_player_uid', uid);
  }
  return uid;
}

// Auto sign-in anonymously for seamless WebXR Quest 3 & Browser play with fallback
export function initAuth(): Promise<AppUser> {
  return new Promise((resolve) => {
    const fallbackId = getOrCreateUserId();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        unsubscribe();
        resolve({ uid: user.uid, isAnonymous: user.isAnonymous });
      } else {
        try {
          const userCred = await signInAnonymously(auth);
          unsubscribe();
          resolve({ uid: userCred.user.uid, isAnonymous: true });
        } catch {
          // Fallback to persistent client user ID if Auth provider is not enabled
          unsubscribe();
          resolve({ uid: fallbackId, isAnonymous: true });
        }
      }
    });
  });
}

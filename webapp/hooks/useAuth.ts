// import * as AuthSession from 'expo-auth-session';
// import { discovery as googleOidcDiscovery } from 'expo-auth-session/providers/google';
// import * as WebBrowser from 'expo-web-browser';
import { useRouter, useSegments } from 'expo-router';
import {
  // GoogleAuthProvider,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  // signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactElement, ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { auth, db } from '@/lib/firebase';
import type { User, UserRole } from '@/types';

// WebBrowser.maybeCompleteAuthSession();

function getFirebaseErrorCode(error: unknown): string | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  ) {
    return (error as { code: string }).code;
  }
  return null;
}

function formatAuthError(error: unknown): string {
  const code = getFirebaseErrorCode(error);
  if (code === 'auth/configuration-not-found') {
    return (
      'Firebase Authentication is not enabled for this project. In the Firebase console, open Build → Authentication, ' +
      'click Get started, then enable the Email/Password and Google sign-in methods.'
    );
  }
  if (code === 'auth/operation-not-allowed') {
    return 'This sign-in method is disabled in Firebase. Enable it under Authentication → Sign-in method.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This app’s domain is not authorized for Firebase Auth. Add it under Authentication → Settings → Authorized domains.';
  }
  if (code === 'auth/invalid-email') {
    return 'That email address is not valid.';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Use a longer password (Firebase requires at least 6 characters).';
  }
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Incorrect password for this email.';
  }
  if (code === 'auth/user-not-found') {
    return 'No account found for that email.';
  }
  if (code === 'permission-denied') {
    return (
      'Could not read or write your user profile in Firestore (permission denied). ' +
      'Check Firestore security rules for `users/{userId}` so signed-in users can read/write their own document.'
    );
  }
  return error instanceof Error ? error.message : 'Sign-in failed';
}

/** Try password sign-in; if that fails in a way that can mean “no account”, register instead. */
async function signInOrCreateWithEmail(email: string, password: string): Promise<void> {
  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error('Enter your email.');
  }
  if (!password) {
    throw new Error('Enter a password.');
  }

  try {
    await signInWithEmailAndPassword(auth, trimmed, password);
    return;
  } catch (signInErr) {
    const c = getFirebaseErrorCode(signInErr);
    if (
      c === 'auth/invalid-email' ||
      c === 'auth/missing-password' ||
      c === 'auth/user-disabled' ||
      c === 'auth/too-many-requests' ||
      c === 'auth/configuration-not-found' ||
      c === 'auth/operation-not-allowed' ||
      c === 'auth/unauthorized-domain' ||
      c === 'auth/network-request-failed' ||
      c === 'auth/internal-error'
    ) {
      throw new Error(formatAuthError(signInErr));
    }

    try {
      await createUserWithEmailAndPassword(auth, trimmed, password);
    } catch (createErr) {
      const c2 = getFirebaseErrorCode(createErr);
      if (c2 === 'auth/email-already-in-use') {
        throw new Error('That email is already registered. Check your password and try again.');
      }
      throw new Error(formatAuthError(createErr));
    }
  }

  const current = auth.currentUser;
  if (!current) {
    throw new Error('Sign-in failed: no active session. Try again.');
  }
  try {
    await ensureUserDocument(current);
  } catch (profileErr) {
    await firebaseSignOut(auth);
    throw new Error(formatAuthError(profileErr));
  }
}

const defaultRole: UserRole = 'caregiver';

async function ensureUserDocument(firebaseUser: FirebaseUser): Promise<UserRole> {
  const ref = doc(db, 'users', firebaseUser.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const role: UserRole = defaultRole;
    await setDoc(ref, {
      email: firebaseUser.email ?? '',
      role,
      createdAt: serverTimestamp(),
    });
    return role;
  }
  const data = snap.data() as { role?: UserRole };
  return data.role ?? defaultRole;
}

function mapFirebaseUser(firebaseUser: FirebaseUser, role: UserRole): User {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    role,
  };
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Google sign-in disabled — use email & password. Re-enable by restoring imports above and this function body.
// async function signInWithGoogleInternal(): Promise<void> {
//   const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
//   ...
// }

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          return;
        }
        const role = await ensureUserDocument(firebaseUser);
        setUser(mapFirebaseUser(firebaseUser, role));
      } catch (error) {
        console.error('Auth state error', error);
        setUser(null);
        try {
          await firebaseSignOut(auth);
        } catch {
          /* ignore */
        }
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    throw new Error('Google sign-in is disabled. Use email and password.');
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInOrCreateWithEmail(email, password);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signOut,
    }),
    [user, loading, signInWithGoogle, signInWithEmail, signOut],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function AuthRouterShell({ children }: { children: ReactNode }): ReactElement {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }
    const inAuthGroup = segments.includes('sign-in');

    if (!user && !inAuthGroup) {
      router.replace('/sign-in');
      return;
    }
    if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return createElement(
      View,
      { style: styles.centered },
      createElement(ActivityIndicator, { size: 'large' }),
    );
  }

  return createElement(React.Fragment, null, children);
}

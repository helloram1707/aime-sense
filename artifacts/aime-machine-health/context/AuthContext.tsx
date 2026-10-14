import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const SESSION_KEY = 'aime-sense:auth:session:v2';
const TOKEN_KEY = 'aime-sense:auth:token:v2';
const LOCAL_ACCOUNTS_KEY = 'aime-sense:auth:accounts:v2';

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  workshop: string;
  createdAtMs: number;
  isDemo?: boolean;
}

interface StoredAccount extends UserProfile {
  passwordHash: string;
}

interface AuthValue {
  user: UserProfile | null;
  token: string | null;
  ready: boolean;
  isOfflineMode: boolean;
  signUp: (input: {
    name: string;
    email: string;
    workshop: string;
    password: string;
  }) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  enterDemoMode: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

// Safe local hash for offline prototype fallback
function localHash(email: string, pass: string): string {
  let hash = 0;
  const str = `aime::${email}::${pass}::salt9812`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(16);
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(SESSION_KEY);
        if (storedUser && mounted) {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        }
      } catch {
        // Unreadable storage defaults to signed out
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const signUp = useCallback<AuthValue['signUp']>(async (input) => {
    const name = input.name.trim();
    const email = normalizeEmail(input.email);
    const workshop = input.workshop.trim() || 'My Workshop';

    if (name.length < 2) return 'Please enter your name.';
    if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email address.';
    if (input.password.length < 6) return 'Password must be at least 6 characters.';

    // Try backend registration first
    try {
      const response = await fetch('https://aime-sense.onrender.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, workshop, password: input.password }),
      });
      if (response.ok) {
        const data = await response.json();
        const profile: UserProfile = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          workshop: data.user.workshop,
          createdAtMs: data.user.createdAtMs,
        };
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(profile));
        await AsyncStorage.setItem(TOKEN_KEY, data.token);
        setUser(profile);
        setToken(data.token);
        setIsOfflineMode(false);
        return null;
      } else if (response.status === 409) {
        return 'An account with this email already exists.';
      }
    } catch {
      // Backend not running on this port, use local persistent store
    }

    // Local fallback
    try {
      const rawAccounts = await AsyncStorage.getItem(LOCAL_ACCOUNTS_KEY);
      const accounts: StoredAccount[] = rawAccounts ? JSON.parse(rawAccounts) : [];
      if (accounts.some((a) => a.email === email)) {
        return 'An account with this email already exists on this device.';
      }
      const newAccount: StoredAccount = {
        id: `local_${Date.now()}`,
        name,
        email,
        workshop,
        createdAtMs: Date.now(),
        passwordHash: localHash(email, input.password),
      };
      await AsyncStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify([...accounts, newAccount]));
      const profile: UserProfile = {
        id: newAccount.id,
        name: newAccount.name,
        email: newAccount.email,
        workshop: newAccount.workshop,
        createdAtMs: newAccount.createdAtMs,
      };
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(profile));
      setUser(profile);
      setIsOfflineMode(true);
      return null;
    } catch {
      return 'Could not save account on device. Please try again.';
    }
  }, []);

  const signIn = useCallback<AuthValue['signIn']>(async (rawEmail, password) => {
    const email = normalizeEmail(rawEmail);
    if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email address.';
    if (!password) return 'Enter your password.';

    // Try backend sign-in first
    try {
      const response = await fetch('https://aime-sense.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        const data = await response.json();
        const profile: UserProfile = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          workshop: data.user.workshop,
          createdAtMs: data.user.createdAtMs,
        };
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(profile));
        await AsyncStorage.setItem(TOKEN_KEY, data.token);
        setUser(profile);
        setToken(data.token);
        setIsOfflineMode(false);
        return null;
      }
    } catch {
      // Backend unavailable, fallback to local accounts
    }

    // Local fallback
    try {
      const rawAccounts = await AsyncStorage.getItem(LOCAL_ACCOUNTS_KEY);
      const accounts: StoredAccount[] = rawAccounts ? JSON.parse(rawAccounts) : [];
      const account = accounts.find((a) => a.email === email);
      if (!account || account.passwordHash !== localHash(email, password)) {
        return 'Incorrect email or password.';
      }
      const profile: UserProfile = {
        id: account.id,
        name: account.name,
        email: account.email,
        workshop: account.workshop,
        createdAtMs: account.createdAtMs,
      };
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(profile));
      setUser(profile);
      setIsOfflineMode(true);
      return null;
    } catch {
      return 'Authentication could not be processed.';
    }
  }, []);

  const enterDemoMode = useCallback(() => {
    const demoProfile: UserProfile = {
      id: 'demo_user',
      name: 'Workshop Operator (Demo)',
      email: 'demo@aimesense.local',
      workshop: 'NIT Andhra Demonstration Unit',
      createdAtMs: Date.now(),
      isDemo: true,
    };
    setUser(demoProfile);
    setIsOfflineMode(true);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
      await AsyncStorage.removeItem(TOKEN_KEY);
    } finally {
      setUser(null);
      setToken(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      ready,
      isOfflineMode,
      signUp,
      signIn,
      signOut,
      enterDemoMode,
    }),
    [user, token, ready, isOfflineMode, signUp, signIn, signOut, enterDemoMode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}

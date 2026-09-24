import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { fetchMe, login as loginRequest, signup as signupRequest, type PublicUser } from "./api";

const TOKEN_STORAGE_KEY = "meetup.token";

interface AuthContextValue {
  user: PublicUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY)
  );
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    fetchMe(token)
      .then((res) => setUser(res.user))
      .catch(() => {
        setToken(null);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const persistToken = useCallback((nextToken: string) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setToken(nextToken);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await loginRequest({ email, password });
      setUser(res.user);
      persistToken(res.token);
    },
    [persistToken]
  );

  const signup = useCallback(
    async (email: string, password: string, displayName: string) => {
      await signupRequest({ email, password, displayName });
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, isLoading, login, signup, logout }),
    [user, token, isLoading, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

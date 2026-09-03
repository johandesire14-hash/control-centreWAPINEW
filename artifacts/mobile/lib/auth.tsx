import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

WebBrowser.maybeCompleteAuthSession();

const AUTH_TOKEN_KEY = "auth_session_token";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isNewUser: boolean;
  isGuest: boolean;
  clearIsNewUser: () => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (reason?: string, reasonDetail?: string) => Promise<void>;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isNewUser: false,
  isGuest: false,
  clearIsNewUser: () => {},
  login: async () => {},
  logout: async () => {},
  deleteAccount: async (_reason?: string, _reasonDetail?: string) => {},
  enterGuestMode: () => {},
  exitGuestMode: () => {},
  refreshUser: async () => {},
});

function getApiBaseUrl(): string {
  if ((process.env.EXPO_PUBLIC_API_DOMAIN || "6c2221bd-c94a-4551-a181-36ee1b366c83-00-2nn64jxbrnxn0.archer.replit.dev")) {
    return `https://${(process.env.EXPO_PUBLIC_API_DOMAIN || "6c2221bd-c94a-4551-a181-36ee1b366c83-00-2nn64jxbrnxn0.archer.replit.dev")}`;
  }
  return "";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/auth/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.user) {
        setUser(data.user);
      } else {
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      if (!apiBase) {
        console.error("API base URL is not configured.");
        setIsLoading(false);
        return;
      }

      // ⚠️ NE PAS MODIFIER : path Expo attendu par oauthRedirect.ts côté backend
      const redirectUri = AuthSession.makeRedirectUri({ path: "auth" });
      console.log("REDIRECT URI GENERATED:", redirectUri);
      const startUrl = `${apiBase}/api/auth/google?mobile_redirect=${encodeURIComponent(redirectUri)}`;

      const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUri);

      if (result.type !== "success" || !result.url) {
        setIsLoading(false);
        return;
      }

      const resultUrl = new URL(result.url);
      const error = resultUrl.searchParams.get("error");

      if (error) {
        console.error("Google sign-in error:", error);
        setIsLoading(false);
        return;
      }

      const exchangeCode = resultUrl.searchParams.get("code");
      let token: string | null = null;

      if (exchangeCode) {
        const exchangeRes = await fetch(`${apiBase}/api/auth/mobile/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: exchangeCode }),
        });
        const exchangeData = await exchangeRes.json().catch(() => null);
        if (!exchangeRes.ok || typeof exchangeData?.token !== "string") {
          console.error("Google session exchange failed", exchangeData?.error ?? exchangeRes.status);
          setIsLoading(false);
          return;
        }
        token = exchangeData.token;
        setIsNewUser(exchangeData.isNewUser === true);
      }

      if (token) {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
        setIsGuest(false);
        await fetchUser();
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setIsLoading(false);
    }
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (token) {
        const apiBase = getApiBaseUrl();
        await fetch(`${apiBase}/api/mobile-auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
    } finally {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem("user_active_mode");
      setUser(null);
      setIsNewUser(false);
      setIsGuest(false);
    }
  }, []);

  const deleteAccount = useCallback(async (reason?: string, reasonDetail?: string) => {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (token) {
        const apiBase = getApiBaseUrl();
        await fetch(`${apiBase}/api/users/me`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason, reasonDetail }),
        });
      }
    } catch {
      // silently ignored — local cleanup runs regardless
    } finally {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem("user_active_mode");
      setUser(null);
      setIsNewUser(false);
      setIsGuest(false);
    }
  }, []);

  const enterGuestMode = useCallback(() => setIsGuest(true), []);
  const exitGuestMode = useCallback(() => setIsGuest(false), []);
  const clearIsNewUser = useCallback(() => setIsNewUser(false), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isNewUser,
        isGuest,
        clearIsNewUser,
        login,
        logout,
        deleteAccount,
        enterGuestMode,
        exitGuestMode,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

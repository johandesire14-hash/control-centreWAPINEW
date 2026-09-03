import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DARK_MODE_KEY = "wapi_dark_mode";

interface ThemeContextValue {
  isDark: boolean;
  setIsDark: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  setIsDark: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDarkState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DARK_MODE_KEY).then((val) => {
      if (val === "true") setIsDarkState(true);
    });
  }, []);

  const setIsDark = useCallback((value: boolean) => {
    setIsDarkState(value);
    AsyncStorage.setItem(DARK_MODE_KEY, value ? "true" : "false");
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

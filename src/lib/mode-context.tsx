import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type AppMode = "manager" | "team";

interface ModeContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const ModeContext = createContext<ModeContextValue>({
  mode: "manager",
  setMode: () => {},
});

const MODE_KEY = "uncertainty-navigator/mode-v1";

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>("manager");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(MODE_KEY);
    if (saved === "team" || saved === "manager") setModeState(saved);
  }, []);

  const setMode = (next: AppMode) => {
    setModeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MODE_KEY, next);
    }
  };

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>;
}

export function useMode() {
  return useContext(ModeContext);
}

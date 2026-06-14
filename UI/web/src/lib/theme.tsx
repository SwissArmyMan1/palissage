import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type ThemePref = 'light' | 'dark' | 'system';
type Resolved = 'light' | 'dark';

interface ThemeCtx {
  pref: ThemePref;
  theme: Resolved;
  setPref: (p: ThemePref) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);
const STORAGE_KEY = 'palissage-theme';

function systemTheme(): Resolved {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function resolve(pref: ThemePref): Resolved {
  return pref === 'system' ? systemTheme() : pref;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem(STORAGE_KEY) as ThemePref) || 'system';
  });
  const [theme, setTheme] = useState<Resolved>(() => resolve(pref));

  useEffect(() => {
    const r = resolve(pref);
    setTheme(r);
    document.documentElement.setAttribute('data-theme', r);
  }, [pref]);

  // follow OS changes while in "system"
  useEffect(() => {
    if (pref !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const r = systemTheme();
      setTheme(r);
      document.documentElement.setAttribute('data-theme', r);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [pref]);

  const setPref = (p: ThemePref) => {
    localStorage.setItem(STORAGE_KEY, p);
    setPrefState(p);
  };

  const toggle = () => setPref(theme === 'dark' ? 'light' : 'dark');

  return (
    <Ctx.Provider value={{ pref, theme, setPref, toggle }}>
      {children}
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

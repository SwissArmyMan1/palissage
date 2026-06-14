import { createRoot } from 'react-dom/client';

// self-hosted fonts (no runtime network) — Fraunces / Inter / JetBrains Mono
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';

import './index.css';
import App from './App.tsx';

// NOTE: React.StrictMode is intentionally omitted. Its dev-only double-mount
// (mount → unmount → remount) tears down and re-initialises the wagmi/WalletConnect
// connector and its relay subscription, so the *first* wallet connect's events are
// emitted to the discarded instance and never reach React. The symptom is a wallet
// that connects but leaves the UI stuck until a manual page refresh (which re-reads
// the now-persisted, already-connected snapshot via wagmi's reconnectOnMount).
// Production builds never double-mount, so this only ever affected `vite dev`.
createRoot(document.getElementById('root')!).render(<App />);

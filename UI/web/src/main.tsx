import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted fonts: no runtime request leaves the page for typography.
// Each face carries a unicode-range, so a browser fetches only the subsets the
// page actually renders — Latin and Latin Extended for English and French.
// JetBrains Mono is loaded at one weight; it is only used for hashes and IDs.
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import '@fontsource/jetbrains-mono/400.css';

import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

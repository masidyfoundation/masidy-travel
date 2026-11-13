import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { MarketplaceProvider } from './context/MarketplaceContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <MarketplaceProvider>
    <App />
  </MarketplaceProvider>
);

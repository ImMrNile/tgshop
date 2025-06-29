// pages/_app.tsx
import type { AppProps } from 'next/app';
import { AppProvider } from '../contexts/AppContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AppProvider>
      <Component {...pageProps} />
    </AppProvider>
  );
}
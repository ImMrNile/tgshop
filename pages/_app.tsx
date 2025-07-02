// pages/_app.tsx
import type { AppProps } from 'next/app';
import { AppProvider } from '../contexts/AppContext';
import { AuthProvider } from '../components/AuthProvider';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <AppProvider>
        <Component {...pageProps} />
      </AppProvider>
    </AuthProvider>
  );
}
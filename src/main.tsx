import React from 'react';
import { createRoot } from 'react-dom/client';
import './utils/pwaInstallCapture';
import App from './App.tsx';
import './index.css';
import './i18n/config';
import { offlineStorage } from './lib/offlineStorage';
import { initCrashlytics } from './utils/crashlytics';
import { initDownloadNotifications } from './utils/fileDownloader';

const DEV_PREVIEW_REFRESH_KEY = '__dev_preview_cache_reset__';
const DEV_CACHE_PREFIXES = ['workbox', 'api-cache-', 'images-cache-', 'dynamic-cache-', 'navigation-cache-'];

async function cleanupPreviewCachesIfNeeded() {
  if (!import.meta.env.DEV || typeof window === 'undefined' || !('serviceWorker' in navigator) || !('caches' in window)) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const cacheNames = await caches.keys();
    const managedCacheNames = cacheNames.filter((name) =>
      DEV_CACHE_PREFIXES.some((prefix) => name.includes(prefix) || name.startsWith(prefix))
    );
    const needsCleanup = registrations.length > 0 || managedCacheNames.length > 0;

    if (!needsCleanup) {
      sessionStorage.removeItem(DEV_PREVIEW_REFRESH_KEY);
      return false;
    }

    await Promise.all(registrations.map((registration) => registration.unregister()));
    await Promise.all(managedCacheNames.map((name) => caches.delete(name)));

    if (sessionStorage.getItem(DEV_PREVIEW_REFRESH_KEY) !== 'done') {
      sessionStorage.setItem(DEV_PREVIEW_REFRESH_KEY, 'done');
      const url = new URL(window.location.href);
      url.searchParams.set('_preview_refresh', Date.now().toString());
      window.location.replace(url.toString());
      return true;
    }

    console.log('🧹 Cleared stale preview service workers and caches');
  } catch (error) {
    console.warn('⚠️ Preview cache cleanup failed:', error);
  }

  return false;
}

console.log('🚀 App starting...');

const root = document.getElementById('root');
if (!root) {
  console.error('❌ Root element not found');
  throw new Error('Root element not found');
}

console.log('🎨 Rendering app...');
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
console.log('✅ App rendered successfully');

(async () => {
  try {
    const reloadingPreview = await cleanupPreviewCachesIfNeeded();
    if (reloadingPreview) return;

    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      const { registerSW } = await import('virtual:pwa-register');
      registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('🔄 New content available, will refresh');
        },
        onOfflineReady() {
          console.log('📴 App ready to work offline');
        },
        onRegistered(registration) {
          console.log('✅ Service Worker registered', registration);
        },
        onRegisterError(error) {
          console.error('❌ Service Worker registration error:', error);
        }
      });
    } else {
      console.log('🧪 Skipping service worker registration in development');
    }
  } catch (error) {
    console.warn('⚠️ Service Worker registration failed:', error);
  }

  try {
    console.log('📦 Initializing offline storage...');
    await offlineStorage.init();
    console.log('✅ Offline storage ready');
  } catch (error) {
    console.warn('⚠️ Offline storage init failed:', error);
  }

  try {
    await initDownloadNotifications();
    console.log('✅ Download notifications initialized');
  } catch (error) {
    console.warn('⚠️ Download notifications init failed:', error);
  }

  try {
    await initCrashlytics();
  } catch (error) {
    console.warn('⚠️ Crashlytics init failed:', error);
  }
})();

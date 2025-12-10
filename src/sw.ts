/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import type { ManifestEntry } from 'workbox-build';

// Give TypeScript service worker context + precache manifest typings
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<ManifestEntry> };

self.skipWaiting();
clientsClaim();

// Precache assets generated at build time
precacheAndRoute(self.__WB_MANIFEST);

const SHARE_TARGET_PATH = '/share-target';

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === SHARE_TARGET_PATH) {
    if (event.request.method === 'POST') {
      event.respondWith(handleShareTarget(event));
    } else if (event.request.method === 'GET') {
      event.respondWith(Response.redirect('/', 303));
    }
  }
});

async function handleShareTarget(event: FetchEvent): Promise<Response> {
  try {
    const formData = await event.request.formData();

    const title = formData.get('title')?.toString();
    const text = formData.get('text')?.toString();
    const sharedUrl = formData.get('url')?.toString();

    const redirectUrl = new URL('/', self.location.origin);
    if (title) redirectUrl.searchParams.set('title', title);
    if (text) redirectUrl.searchParams.set('text', text);
    if (sharedUrl) redirectUrl.searchParams.set('url', sharedUrl);

    // Redirect into the app so the client can read the shared payload via URL params
    return Response.redirect(redirectUrl.toString(), 303);
  } catch (error) {
    console.error('Share target handling failed', error);
    return Response.redirect('/', 303);
  }
}

export {};

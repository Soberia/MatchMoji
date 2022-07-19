export type {};

declare const self: ServiceWorkerGlobalScope;
declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: {
      url: string;
      integrity?: string;
      revision?: string | null;
    }[];
  }
}

const CACHE_NAME = `${process.env.REACT_APP_NAME}-v${process.env.REACT_APP_VERSION}-assets`;

// Installing the service worker
self.addEventListener('install', event => {
  // Static files' path should be relative to the service worker's scope.
  // Because this file will be compiled ahead of time and the path
  // of which `App` component will be served on is unknown.
  // All assets path in `manifest.webmanifest` file also
  // should be treated the same.
  const urls = [
    '.',
    'manifest.webmanifest',
    'favicon.svg',
    'icon192.webp',
    'icon512.webp',
    'changelog.json'
  ];

  /**
   * Selecting required assets.
   * Due to bug in `CRA`, SVG files also will be included in `self.__WB_MANIFEST`.
   * @see https://github.com/facebook/create-react-app/issues/9167
   */
  for (const file of self.__WB_MANIFEST)
    if (
      file.url.endsWith('.js') ||
      file.url.endsWith('.css') ||
      file.url.endsWith('.m4a') ||
      // Size of the other font formats is too big to be included
      // without tweaking the `workbox-webpack-plugin`'s
      // `maximumFileSizeToCacheInBytes` value.
      (file.url.endsWith('.woff2') && file.url.includes('colr'))
    )
      urls.push(file.url);

  // `ExtendableEvent.waitUntil()` has to be called synchronously
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urls)));
});

// Activating the service worker
self.addEventListener('activate', event => {
  // `ExtendableEvent.waitUntil()` has to be called synchronously
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(
          key =>
            key.startsWith(process.env.REACT_APP_NAME!) && // Only this web application caches
            key !== CACHE_NAME && // Only older versions
            caches.delete(key)
        )
      )
    )
  );
});

// Serving assets from cache
self.addEventListener('fetch', event => {
  // `FetchEvent.respondWith()` has to be called synchronously
  event.respondWith(
    caches
      .match(event.request)
      .then(response => response || fetch(event.request))
  );
});

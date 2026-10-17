// sw.js: the service worker. It keeps a copy of the app files on the phone so
// the app opens instantly and works with no internet.
//
// IMPORTANT: whenever you change any app file, also change the version number
// below (v1 -> v2). That tells the phone to download the new files.
var CACHE = "money-tracker-v1";

var FILES = [
  "./",
  "index.html",
  "logic.js",
  "app.js",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(function (cache) {
        // cache: "reload" makes sure we fetch fresh copies, not old ones
        return cache.addAll(
          FILES.map(function (f) {
            return new Request(f, { cache: "reload" });
          })
        );
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) {
              return k !== CACHE;
            })
            .map(function (k) {
              return caches.delete(k);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

// Open from the saved copy straight away, and refresh the copy in the background.
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (cached) {
        var network = fetch(req)
          .then(function (res) {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(function () {
            return null;
          });

        if (cached) return cached;

        return network.then(function (res) {
          if (res) return res;
          return req.mode === "navigate" ? cache.match("index.html") : Response.error();
        });
      });
    })
  );
});

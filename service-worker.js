const CACHE_NAME = "dictionary-pwa-v1"
const urlsToCache = [
    "/",
    "/index.html",
    "/index.js",
    "/manifest.json",
    "https://raw.githubusercontent.com/notshekhar/dictionary/refs/heads/main/dictionary.csv",
]

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("Opened cache")
            return cache.addAll(urlsToCache)
        })
    )
})

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response
            }
            return fetch(event.request)
        })
    )
})

self.addEventListener("activate", (event) => {
    const cacheWhitelist = [CACHE_NAME]
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName)
                    }
                })
            )
        })
    )
})

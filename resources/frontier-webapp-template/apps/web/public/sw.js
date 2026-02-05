self.addEventListener("install", (_event) => {
	self.skipWaiting();
});
self.addEventListener("activate", (_event) => {
	clients.claim();
});
self.addEventListener("fetch", (_event) => {
	// Placeholder: add cache strategies via Workbox or Cache API.
});

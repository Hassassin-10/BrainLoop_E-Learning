
// Scripts for Firebase products (using compat for broader compatibility in SW)
importScripts('https://www.gstatic.com/firebasejs/11.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.7.1/firebase-messaging-compat.js');

// Get Firebase config from query parameters
const urlParams = new URLSearchParams(self.location.search);
const firebaseConfig = {
    apiKey: urlParams.get('apiKey'),
    authDomain: urlParams.get('authDomain'),
    projectId: urlParams.get('projectId'),
    storageBucket: urlParams.get('storageBucket'),
    messagingSenderId: urlParams.get('messagingSenderId'),
    appId: urlParams.get('appId'),
    databaseURL: urlParams.get('databaseURL'), // Make sure this is passed if needed by other FB services in SW
};

// Ensure core config values are present for Firebase App initialization
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.messagingSenderId) {
    console.error('Service Worker: Firebase core config (apiKey, projectId, messagingSenderId) is missing or incomplete from query params.', firebaseConfig);
} else {
    try {
        // Initialize the Firebase app in the service worker
        firebase.initializeApp(firebaseConfig);
        const messaging = firebase.messaging();

        console.log('Service Worker: Firebase app and messaging initialized successfully.');

        // Optional: Handle background messages here
        messaging.onBackgroundMessage((payload) => {
            console.log('[firebase-messaging-sw.js] Received background message ', payload);
            
            const notificationTitle = payload.notification?.title || 'BrainLoop Notification';
            const notificationOptions = {
                body: payload.notification?.body || 'You have a new message.',
                icon: payload.notification?.icon || '/logo.png', // Default icon
                data: payload.data // Pass along any data for click handling
            };

            self.registration.showNotification(notificationTitle, notificationOptions);
        });

        // Optional: Handle notification click
        self.addEventListener('notificationclick', (event) => {
            console.log('[firebase-messaging-sw.js] Notification click Received.', event);
            event.notification.close();
            
            // Example: Open a specific URL or focus an existing window
            // You might get this URL from event.notification.data
            const targetUrl = event.notification.data && event.notification.data.FCM_MSG && event.notification.data.FCM_MSG.notification && event.notification.data.FCM_MSG.notification.click_action
                ? event.notification.data.FCM_MSG.notification.click_action
                : '/'; // Default to homepage

            event.waitUntil(
                clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                    for (let i = 0; i < clientList.length; i++) {
                        const client = clientList[i];
                        if (client.url === targetUrl && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    if (clients.openWindow) {
                        return clients.openWindow(targetUrl);
                    }
                })
            );
        });

    } catch (e) {
        console.error('Service Worker: Error initializing Firebase App or Messaging.', e, firebaseConfig);
    }
}

// public/firebase-messaging-sw.js
importScripts(
  "https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyBDa_47QLpQI1mFRQN1lP-tzL4K55wuytQ",
  authDomain: "fir-fcm-296e5.firebaseapp.com",
  projectId: "fir-fcm-296e5",
  storageBucket: "fir-fcm-296e5.firebasestorage.app",
  messagingSenderId: "394584611952",
  appId: "1:394584611952:web:d90f18757eee951e3b28b5",
  measurementId: "G-YEE6T0K659",
});

const messaging = firebase.messaging();

// Xử lý notification khi app ở background
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: "/logo192.png",
  });
});

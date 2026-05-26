// src/firebase.js
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBDa_47QLpQI1mFRQN1lP-tzL4K55wuytQ",
  authDomain: "fir-fcm-296e5.firebaseapp.com",
  projectId: "fir-fcm-296e5",
  storageBucket: "fir-fcm-296e5.firebasestorage.app",
  messagingSenderId: "394584611952",
  appId: "1:394584611952:web:d90f18757eee951e3b28b5",
  measurementId: "G-YEE6T0K659",
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export const requestPermissionAndGetToken = async () => {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("Notification permission denied");
    return null;
  }

  const token = await getToken(messaging, {
    vapidKey:
      "BD5eW9QDZIHyZlt-rl9CAcWuyCL-jfQcYLAV5TfxObQelSF6RKpfkYEcP41ycbo1JCqFFpOciWsLR3pk-u4-pws", // Lấy từ Firebase Console > Project Settings > Cloud Messaging
  });

  console.log("FCM Token:", token);
  return token;
};

export { onMessage };

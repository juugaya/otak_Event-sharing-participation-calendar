const firebaseConfig = {
  apiKey: "AIzaSyB0GeJuhjZ5hkArwWp1Hm9Bv1A9tDcU0W8",
  authDomain: "otak-shared-event.firebaseapp.com",
  databaseURL: "https://otak-shared-event-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "otak-shared-event",
  storageBucket: "otak-shared-event.firebasestorage.app",
  messagingSenderId: "635469279283",
  appId: "1:635469279283:web:96a0d986181ee009443346",
  measurementId: "G-6GHCR0648F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
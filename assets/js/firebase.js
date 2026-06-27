import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBMfbWaK22kemOXFjbl-ntdGD4f7XdLIWU",
  authDomain: "ministerio-seven-v4.firebaseapp.com",
  projectId: "ministerio-seven-v4",
  storageBucket: "ministerio-seven-v4.firebasestorage.app",
  messagingSenderId: "166878468529",
  appId: "1:166878468529:web:0219ed16c888aa7c044590",
  measurementId: "G-1T1DTCQVY6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, provider, db, storage };

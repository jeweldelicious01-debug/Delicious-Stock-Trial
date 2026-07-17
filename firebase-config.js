import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBJYyWQSkEqczA9oYPmg4kx3OvlX7zyjok",
  authDomain: "jewel-delicious-new.firebaseapp.com",
  projectId: "jewel-delicious-new",
  storageBucket: "jewel-delicious-new.firebasestorage.app",
  messagingSenderId: "378165873441",
  appId: "1:378165873441:web:2d8f1051e72a010f74cc60",
  measurementId: "G-G3VNQFVTZH"
};

console.log("Firebase system core initializing sequence mounting...");

export const app = initializeApp(firebaseConfig);
export const dbFs = getFirestore(app);

console.log("Firestore secure cloud routing mapped successfully.");

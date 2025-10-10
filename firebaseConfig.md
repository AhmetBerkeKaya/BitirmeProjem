// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCXt4geUfuV8XD5O1TkxoP43vresSDQgAk",
  authDomain: "klinikapp-6555e.firebaseapp.com",
  projectId: "klinikapp-6555e",
  storageBucket: "klinikapp-6555e.firebasestorage.app",
  messagingSenderId: "205859731101",
  appId: "1:205859731101:web:072d9474efadf442fb8674",
  measurementId: "G-NRWZKPNY7N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
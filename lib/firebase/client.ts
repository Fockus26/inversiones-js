"use client";

import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { type Auth, connectAuthEmulator, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  type Firestore,
  getFirestore,
} from "firebase/firestore";

/**
 * Cliente de Firebase para el navegador (D004). La config web de Firebase no es secreta:
 * la seguridad la ponen las reglas de Firestore (firestore.rules), no esconder estas claves.
 *
 * NEXT_PUBLIC_USE_EMULATORS=true → Auth en :9099 y Firestore en :8080 (`bun run emulators`).
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const usarEmuladores = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

export function firebaseApp(): FirebaseApp {
  if (!app) app = getApps().length ? getApp() : initializeApp(config);
  return app;
}

export function firebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(firebaseApp());
    if (usarEmuladores) {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", {
        disableWarnings: true,
      });
    }
  }
  return auth;
}

export function firestore(): Firestore {
  if (!db) {
    db = getFirestore(firebaseApp());
    if (usarEmuladores) connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  return db;
}

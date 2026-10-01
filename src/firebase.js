// Firebase — общее хранилище данных (Firestore), чтобы записи технадзора сразу
// были видны КАЖ на любом другом устройстве/браузере.
//
// Конфиг берётся из .env (см. .env.example). Если переменные не заданы,
// приложение остаётся рабочим в офлайн-демо-режиме на localStorage (как раньше),
// но тогда данные видны только в этом браузере.

import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

export const FIREBASE_CONFIGURED = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let app = null;
let db = null;

if (FIREBASE_CONFIGURED) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  db = getFirestore(app);
}

const ENTRIES_COLLECTION = "entries";

// Подписка на коллекцию записей в реальном времени.
// callback(entries) вызывается сразу и затем при каждом изменении у любого пользователя.
// Возвращает функцию отписки.
export function subscribeEntries(callback, onError) {
  if (!FIREBASE_CONFIGURED) return () => {};
  const q = query(collection(db, ENTRIES_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(entries);
    },
    (err) => {
      console.error("Firestore subscribe error", err);
      if (onError) onError(err);
    }
  );
}

export async function addEntry(entry) {
  const { id, ...data } = entry; // Firestore сам назначит id документа
  const ref = await addDoc(collection(db, ENTRIES_COLLECTION), data);
  return ref.id;
}

export async function updateEntry(id, patch) {
  await updateDoc(doc(db, ENTRIES_COLLECTION, id), patch);
}

export async function deleteEntry(id) {
  await deleteDoc(doc(db, ENTRIES_COLLECTION, id));
}

export async function clearAllEntries(entries) {
  await Promise.all(entries.map((e) => deleteEntry(e.id)));
}

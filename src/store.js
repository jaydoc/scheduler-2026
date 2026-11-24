// =====================================================================
//  Data + sign-in layer.
//  • Firebase mode (default): passwordless email-link sign-in, Firestore.
//  • Preview mode (add ?demo to the URL): no Firebase at all — pick a name,
//    data is kept in this browser only. For trying the app safely.
// =====================================================================
import { initializeApp } from "firebase/app";
import {
  getAuth, onAuthStateChanged, sendSignInLinkToEmail, isSignInWithEmailLink,
  signInWithEmailLink, signOut,
} from "firebase/auth";
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, serverTimestamp,
} from "firebase/firestore";
import { YEAR, ATTENDING_BY_EMAIL } from "./config.js";

const LOCAL_FALLBACK = {
  apiKey: "AIzaSyB6CvHk5u4jvvO8oXGnf_GTq1RMbwhT-JU",
  authDomain: "attending-schedule-2026.firebaseapp.com",
  projectId: "attending-schedule-2026",
  storageBucket: "attending-schedule-2026.firebasestorage.app",
  messagingSenderId: "777996986623",
  appId: "1:777996986623:web:0a8697cccb63149d9744ca",
  measurementId: "G-TJXCM9P7W2",
};

export const firebaseConfig = (() => {
  try {
    // eslint-disable-next-line no-undef
    if (typeof __firebase_config !== "undefined" && __firebase_config) return JSON.parse(__firebase_config);
  } catch { /* ignore */ }
  if (typeof window !== "undefined" && window.FALLBACK_FIREBASE_CONFIG) return window.FALLBACK_FIREBASE_CONFIG;
  return LOCAL_FALLBACK;
})();

export const IS_DEMO = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo");

const COL = {
  drafts: `weekend${YEAR}_drafts`,
  subs: `weekend${YEAR}_submissions`,
  meta: `weekend${YEAR}_meta`,
  alloc: `weekend${YEAR}_allocations`,
};
const EMAIL_KEY = `weekend${YEAR}_emailForSignIn`;

export const isAllowedEmail = (email) => !!email && !!ATTENDING_BY_EMAIL[String(email).toLowerCase()];

// ---------------------------------------------------------------------
function firebaseStore() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const key = (email) => String(email).toLowerCase();

  return {
    mode: "firebase",
    projectId: firebaseConfig.projectId,

    /** Calls cb(email|null). Completes an email-link sign-in if the URL is one. */
    async init(cb, onError) {
      try {
        if (isSignInWithEmailLink(auth, window.location.href)) {
          let email = window.localStorage.getItem(EMAIL_KEY);
          if (!email) email = window.prompt("Please confirm your UAB email address to finish signing in:");
          if (email) {
            await signInWithEmailLink(auth, email.trim(), window.location.href);
            window.localStorage.removeItem(EMAIL_KEY);
          }
          window.history.replaceState(null, "", window.location.pathname);
        }
      } catch (e) {
        onError?.(e.code === "auth/invalid-action-code"
          ? "That sign-in link has expired or was already used. Please request a new one."
          : `Sign-in failed: ${e.message}`);
        window.history.replaceState(null, "", window.location.pathname);
      }
      return onAuthStateChanged(auth, async (user) => {
        if (user && !isAllowedEmail(user.email)) {
          await signOut(auth);
          onError?.(`${user.email} is not on the scheduler list.`);
          cb(null);
          return;
        }
        cb(user ? key(user.email) : null);
      });
    },

    async sendLink(email) {
      const settings = { url: window.location.origin + window.location.pathname, handleCodeInApp: true };
      await sendSignInLinkToEmail(auth, email, settings);
      window.localStorage.setItem(EMAIL_KEY, email);
    },

    signOut: () => signOut(auth),

    async getDraft(email) {
      const s = await getDoc(doc(db, COL.drafts, key(email)));
      return s.exists() ? s.data() : null;
    },
    saveDraft: (email, data) => setDoc(doc(db, COL.drafts, key(email)), { ...data, email: key(email), ts: serverTimestamp() }, { merge: true }),
    submit: (email, data) => setDoc(doc(db, COL.subs, key(email)), { ...data, email: key(email), ts: serverTimestamp() }),
    async getSubmission(email) {
      const s = await getDoc(doc(db, COL.subs, key(email)));
      return s.exists() ? s.data() : null;
    },
    async listSubmissions() {
      const snap = await getDocs(collection(db, COL.subs));
      const out = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      return out;
    },
    async resetUser(email) {
      await deleteDoc(doc(db, COL.drafts, key(email)));
      await deleteDoc(doc(db, COL.subs, key(email)));
    },
    async getMeta() {
      const s = await getDoc(doc(db, COL.meta, "public"));
      return s.exists() ? s.data() : {};
    },
    setMeta: (data) => setDoc(doc(db, COL.meta, "public"), { ...data, ts: serverTimestamp() }, { merge: true }),
    saveAllocation: (data) => setDoc(doc(db, COL.alloc, "final"), { ...data, ts: serverTimestamp() }),
  };
}

// ---------------------------------------------------------------------
function demoStore() {
  const ls = window.localStorage;
  const k = (...p) => `demo${YEAR}:${p.join(":")}`;
  const get = (key) => { try { return JSON.parse(ls.getItem(key)); } catch { return null; } };
  const set = (key, v) => { try { ls.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } };
  let listener = null;
  return {
    mode: "demo",
    projectId: "preview mode",
    async init(cb) { listener = cb; cb(get(k("me"))); return () => {}; },
    async sendLink(email) { set(k("me"), email.toLowerCase()); listener?.(email.toLowerCase()); },
    async signOut() { ls.removeItem(k("me")); listener?.(null); },
    async getDraft(email) { return get(k("draft", email)); },
    async saveDraft(email, data) { set(k("draft", email), data); },
    async submit(email, data) { set(k("sub", email), { ...data, email }); },
    async getSubmission(email) { return get(k("sub", email)); },
    async listSubmissions() {
      const out = [];
      for (let i = 0; i < ls.length; i++) {
        const key = ls.key(i);
        if (key.startsWith(k("sub", ""))) out.push({ id: key, ...get(key) });
      }
      return out;
    },
    async resetUser(email) { ls.removeItem(k("draft", email)); ls.removeItem(k("sub", email)); },
    async getMeta() { return get(k("meta")) || {}; },
    async setMeta(data) { set(k("meta"), { ...(get(k("meta")) || {}), ...data }); },
    async saveAllocation(data) { set(k("alloc"), data); },
  };
}

export function createStore() {
  return IS_DEMO ? demoStore() : firebaseStore();
}

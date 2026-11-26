// =====================================================================
//  Data + sign-in layer.
//
//  • Attendings open a PERSONAL LINK (…/?k=<random key>) that the admin
//    emails them. The key identifies them; it keeps working all week, on
//    any device. Their draft and submission are stored under that key, and
//    the database only lets someone read/write the record whose key they hold.
//  • The admin signs in with a one-time email link (Firebase Auth) and can
//    see everything, create/reissue personal links and run the allocation.
//  • Preview mode (add ?demo to the URL, not on the live site): no Firebase,
//    pick a name, data kept in this browser only.
// =====================================================================
import { initializeApp } from "firebase/app";
import {
  getAuth, onAuthStateChanged, sendSignInLinkToEmail, isSignInWithEmailLink,
  signInWithEmailLink, signOut,
} from "firebase/auth";
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, serverTimestamp,
} from "firebase/firestore";
import { YEAR, ATTENDINGS, ATTENDING_BY_NAME, ADMIN_EMAIL, LIVE_HOSTS } from "./config.js";

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

export const IS_DEMO =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("demo") &&
  !LIVE_HOSTS.includes(window.location.hostname);

const COL = {
  links: `weekend${YEAR}_links`,
  drafts: `weekend${YEAR}_drafts`,
  subs: `weekend${YEAR}_submissions`,
  meta: `weekend${YEAR}_meta`,
  alloc: `weekend${YEAR}_allocations`,
};
const EMAIL_KEY = `weekend${YEAR}_emailForSignIn`;
const TOKEN_KEY = `weekend${YEAR}_personalKey`;

/** 128-bit random key, URL-safe. */
export function newToken() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function personalLinkUrl(token) {
  const base = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  const demo = IS_DEMO ? "demo&" : "";
  return `${base}?${demo}k=${token}`;
}

/** Reads ?k= from the URL (and remembers it in this browser), then cleans the URL. */
function takeTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const k = params.get("k");
  if (k) {
    try { window.localStorage.setItem(TOKEN_KEY, k); } catch { /* ignore */ }
    params.delete("k");
    const q = [...params].map(([key, v]) => (v ? `${key}=${encodeURIComponent(v)}` : key)).join("&");
    window.history.replaceState(null, "", window.location.pathname + (q ? `?${q}` : ""));
    return k;
  }
  try { return window.localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function forgetToken() {
  try { window.localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

// Identity passed to the app: { name, key, isAdmin } or null.

// ---------------------------------------------------------------------
function firebaseStore() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const isAdminUser = (u) => !!u && String(u.email).toLowerCase() === ADMIN_EMAIL;
  let listener = null;
  let errorCb = null;

  async function resolveToken() {
    let t = null;
    try { t = window.localStorage.getItem(TOKEN_KEY); } catch { /* ignore */ }
    if (!t) return null;
    const s = await getDoc(doc(db, COL.links, t));
    if (s.exists() && s.data().active && ATTENDING_BY_NAME[s.data().name]) return { name: s.data().name, key: t, isAdmin: false };
    forgetToken();
    errorCb?.("This personal link is no longer valid. Please use the newest link you were sent, or contact Dr. Kandasamy.");
    return null;
  }

  async function adminKey() {
    // The admin's own preferences live under their personal link key; create one if needed.
    const snap = await getDocs(collection(db, COL.links));
    // If there is more than one active link, always use the newest one.
    let mine = null, mineTs = -1;
    const myName = ATTENDINGS.find((a) => a.email.toLowerCase() === ADMIN_EMAIL)?.name;
    snap.forEach((d) => {
      const v = d.data();
      const ts = v.created?.toMillis?.() ?? 0;
      if (v.name === myName && v.active && ts >= mineTs) { mine = d.id; mineTs = ts; }
    });
    if (mine) return mine;
    const me = ATTENDINGS.find((a) => a.email.toLowerCase() === ADMIN_EMAIL);
    const t = newToken();
    await setDoc(doc(db, COL.links, t), { name: me.name, email: me.email, active: true, created: serverTimestamp() });
    return t;
  }

  return {
    mode: "firebase",
    projectId: firebaseConfig.projectId,

    async init(cb, onError) {
      listener = cb; errorCb = onError;
      takeTokenFromUrl();
      // Wait until Firebase has restored any existing sign-in on this browser.
      await new Promise((resolve) => { const u = onAuthStateChanged(auth, () => { u(); resolve(); }); });

      // Admin email-link sign-in (only the admin uses this).
      if (isSignInWithEmailLink(auth, window.location.href)) {
        const href = window.location.href;
        window.history.replaceState(null, "", window.location.pathname);
        if (!auth.currentUser) {
          let email = null;
          try { email = window.localStorage.getItem(EMAIL_KEY); } catch { /* ignore */ }
          if (!email) email = window.prompt("Please confirm your UAB email address to finish signing in:");
          if (email) {
            try {
              await signInWithEmailLink(auth, email.trim(), href);
              try { window.localStorage.removeItem(EMAIL_KEY); } catch { /* ignore */ }
            } catch (e) {
              onError?.(e.code === "auth/invalid-email"
                ? "That email doesn't match the sign-in link. Please use the address the email was sent to."
                : e.code === "auth/invalid-action-code"
                  ? "That sign-in link has expired or was already used (only the newest link works). Please request a new one."
                  : `Sign-in failed: ${e.message}`);
            }
          }
        }
      }

      return onAuthStateChanged(auth, async (user) => {
        try {
          if (user && isAdminUser(user)) {
            const me = ATTENDINGS.find((a) => a.email.toLowerCase() === ADMIN_EMAIL);
            cb({ name: me.name, key: await adminKey(), isAdmin: true });
            return;
          }
          if (user && !isAdminUser(user)) await signOut(auth);
          cb(await resolveToken());
        } catch (e) {
          onError?.(`Could not open your page: ${e.message}`);
          cb(null);
        }
      });
    },

    async sendAdminLink(email) {
      const settings = { url: window.location.origin + window.location.pathname, handleCodeInApp: true };
      await sendSignInLinkToEmail(auth, email, settings);
      try { window.localStorage.setItem(EMAIL_KEY, email); } catch { /* ignore */ }
    },

    async signOut() {
      forgetToken();
      if (auth.currentUser) await signOut(auth);
      else listener?.(null);
    },

    async getDraft(key) {
      const s = await getDoc(doc(db, COL.drafts, key));
      return s.exists() ? s.data() : null;
    },
    saveDraft: (key, data) => setDoc(doc(db, COL.drafts, key), { ...data, token: key, ts: serverTimestamp() }),
    submit: (key, data) => setDoc(doc(db, COL.subs, key), { ...data, token: key, ts: serverTimestamp() }),
    async getSubmission(key) {
      const s = await getDoc(doc(db, COL.subs, key));
      return s.exists() ? s.data() : null;
    },
    async listSubmissions() {
      const snap = await getDocs(collection(db, COL.subs));
      const out = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      return out;
    },
    async resetUser(key) {
      await deleteDoc(doc(db, COL.drafts, key));
      await deleteDoc(doc(db, COL.subs, key));
    },
    async getMeta() {
      const s = await getDoc(doc(db, COL.meta, "public"));
      return s.exists() ? s.data() : {};
    },
    setMeta: (data) => setDoc(doc(db, COL.meta, "public"), { ...data, ts: serverTimestamp() }, { merge: true }),
    saveAllocation: (data) => setDoc(doc(db, COL.alloc, "final"), { ...data, ts: serverTimestamp() }),

    // ---- personal links (admin) ----
    async listLinks() {
      const snap = await getDocs(collection(db, COL.links));
      const out = [];
      snap.forEach((d) => out.push({ token: d.id, ...d.data() }));
      return out;
    },
    async createLink(name) {
      const a = ATTENDING_BY_NAME[name];
      const t = newToken();
      await setDoc(doc(db, COL.links, t), { name, email: a.email, active: true, created: serverTimestamp() });
      return t;
    },
    /** New key for a person; their saved draft/submission move to it; the old link stops working. */
    async reissueLink(oldToken, name) {
      const t = await this.createLink(name);
      for (const col of [COL.drafts, COL.subs]) {
        const s = await getDoc(doc(db, col, oldToken));
        if (s.exists()) {
          await setDoc(doc(db, col, t), { ...s.data(), token: t });
          await deleteDoc(doc(db, col, oldToken));
        }
      }
      await setDoc(doc(db, COL.links, oldToken), { active: false }, { merge: true });
      return t;
    },
  };
}

// ---------------------------------------------------------------------
function demoStore() {
  const ls = window.localStorage;
  const k = (...p) => `demo${YEAR}:${p.join(":")}`;
  const get = (key) => { try { return JSON.parse(ls.getItem(key)); } catch { return null; } };
  const set = (key, v) => { try { ls.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } };
  const links = () => get(k("links")) || {};
  let listener = null;
  let errorCb = null;
  const resolve = () => {
    const me = get(k("me"));
    if (me) return me;
    const t = takeTokenFromUrl();
    if (t) {
      const l = links()[t];
      if (l && l.active) return { name: l.name, key: t, isAdmin: false };
      forgetToken();
      errorCb?.("This personal link is no longer valid. Please use the newest link you were sent, or contact Dr. Kandasamy.");
    }
    return null;
  };
  return {
    mode: "demo",
    projectId: "preview mode",
    async init(cb, onError) { listener = cb; errorCb = onError; cb(resolve()); return () => {}; },
    async sendAdminLink() {},
    /** Preview only: sign in as anyone by picking a name. */
    async demoSignIn(name) {
      const a = ATTENDING_BY_NAME[name];
      const id = { name, key: a.email, isAdmin: a.email.toLowerCase() === ADMIN_EMAIL };
      set(k("me"), id); listener?.(id);
    },
    async signOut() { ls.removeItem(k("me")); forgetToken(); listener?.(null); },
    async getDraft(key) { return get(k("draft", key)); },
    async saveDraft(key, data) { set(k("draft", key), { ...data, token: key }); },
    async submit(key, data) { set(k("sub", key), { ...data, token: key, ts: Date.now() }); },
    async getSubmission(key) { return get(k("sub", key)); },
    async listSubmissions() {
      const out = [];
      for (let i = 0; i < ls.length; i++) {
        const key = ls.key(i);
        if (key.startsWith(k("sub", ""))) out.push({ id: key.slice(k("sub", "").length), ...get(key) });
      }
      return out;
    },
    async resetUser(key) { ls.removeItem(k("draft", key)); ls.removeItem(k("sub", key)); },
    async getMeta() { return get(k("meta")) || {}; },
    async setMeta(data) { set(k("meta"), { ...(get(k("meta")) || {}), ...data }); },
    async saveAllocation(data) { set(k("alloc"), data); },
    async listLinks() { return Object.entries(links()).map(([token, v]) => ({ token, ...v })); },
    async createLink(name) {
      const t = newToken(); const all = links();
      all[t] = { name, email: ATTENDING_BY_NAME[name].email, active: true }; set(k("links"), all); return t;
    },
    async reissueLink(oldToken, name) {
      const t = await this.createLink(name);
      for (const c of ["draft", "sub"]) {
        const v = get(k(c, oldToken));
        if (v) { set(k(c, t), { ...v, token: t }); ls.removeItem(k(c, oldToken)); }
      }
      const all = links(); if (all[oldToken]) all[oldToken].active = false; set(k("links"), all);
      return t;
    },
  };
}

export function createStore() {
  return IS_DEMO ? demoStore() : firebaseStore();
}

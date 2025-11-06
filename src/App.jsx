import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, query, onSnapshot, runTransaction, where, getDocs } from 'firebase/firestore';

// ... rest of your Firebase config and the App component ...

// ----------------------------------------------------------------------
// *** ACTION REQUIRED: REPLACE THESE PLACEHOLDERS WITH YOUR OWN KEYS ***
// ----------------------------------------------------------------------

// 1. PASTE YOUR FIREBASE WEB APP CONFIGURATION OBJECT HERE
const YOUR_FIREBASE_CONFIG = {
    apiKey: "AIzaSyB6CvHk5u4jvvO8oXGnf_GTq1RMbwhT-JU",
    authDomain: "attending-schedule-2026.firebaseapp.com",
    projectId: "attending-schedule-2026",
    storageBucket: "attending-schedule-2026.firebasestorage.app",
    messagingSenderId: "777996986623",
    appId: "1:777996986623:web:0a8697cccb63149d9744ca",
    measurementId: "G-TJXCM9P7W2"
};

// --- GLOBAL VARIABLES ---
const firebaseConfig = YOUR_FIREBASE_CONFIG;
const appId = "attending-scheduler-v1"; // The unique ID for this app's data path

// Attending Roster & Services (Used for Initialization and Algorithm)
const ATTENDING_ROSTER = [
    { name: "Namasivayam Ambalavanan", goal: 5, met: 4 }, { name: "Amelia Schuyler", goal: 3, met: 2 },
    { name: "Amy Mackay", goal: 5, met: 1 }, { name: "Andrea Kane", goal: 1, met: 1 },
    { name: "Ariel Salas", goal: 3, met: 0 }, { name: "Brian Sims", goal: 8, met: 4 },
    { name: "Colm Travers", goal: 7, met: 4 }, { name: "Jegen Kandasamy", goal: 9, met: 6 },
    { name: "Kent Willis", goal: 9, met: 4 }, { name: "Kulsajan Bhatia", goal: 6, met: 5 },
    { name: "Lindy Winter", goal: 5, met: 3 }, { name: "Neal Boone", goal: 9, met: 6 },
    { name: "Nitin Arora", goal: 9, met: 7 }, { name: "Viral Jain", goal: 9, met: 1 },
    { name: "Vivek Lal", goal: 0, met: 0 }, { name: "Vivek Shukla", goal: 9, met: 1 },
    { name: "Vivian Valcarce", goal: 2, met: 0 }, { name: "Waldemar Carlo", goal: 5, met: 5 },
];
const SERVICES = ['RNI', 'COA'];

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


// Helper function to get the current Firestore path
const getPreferencesDocRef = (userId) => {
    // Stores preferences under a path based on the user's ID
    const userPrefsCollection = collection(db, 'artifacts', appId, 'users', userId, 'preferences');
    return doc(userPrefsCollection, 'shift-preferences');
};

// --- Component for Drag and Drop Shift Tags ---
const ShiftTag = ({ shift, list, onClick }) => (
    <div
        draggable="true"
        onDragStart={(e) => {
            e.dataTransfer.setData("shift", shift);
            e.dataTransfer.setData("source", list); // Source list: open, most, or least
        }}
        onClick={() => onClick(shift, list)}
        className={`
            p-2 m-1 text-xs rounded-lg shadow-md cursor-pointer 
            transition-colors duration-200 ease-in-out
            ${list === 'open' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : ''}
            ${list === 'most' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'text-gray-900'}
            ${list === 'least' ? 'bg-rose-500 text-white hover:bg-rose-600' : 'text-gray-900'}
        `}
    >
        {shift}
    </div>
);


// --- MAIN APP COMPONENT ---
export default function App() {
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingMessage, setLoadingMessage] = useState("Authenticating...");
    const [shifts, setShifts] = useState({
        open: [],
        most: [],
        least: [],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState('');
    const [draggedShift, setDraggedShift] = useState(null);

    // --- 1. AUTHENTICATION (Initial Sign-In) ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                try {
                    // Use anonymous sign-in if no token is available
                    const anonUser = await signInAnonymously(auth);
                    setUserId(anonUser.user.uid);
                } catch (error) {
                    console.error("Error signing in anonymously:", error);
                    setLoadingMessage(`Error initializing Firebase: ${error.message}`);
                }
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    // --- 2. DATA INITIALIZATION & LISTENER ---
    useEffect(() => {
        if (!isAuthReady || !userId) return;

        // Find the current user object in the roster
        const userRosterData = ATTENDING_ROSTER.find(a => a.name.toLowerCase().includes('viral jain'.toLowerCase())); // Example: hardcoded user for test
        setCurrentUser(userRosterData);

        const ref = getPreferencesDocRef(userId);

        // Function to create initial dummy shifts if needed
        const createInitialShifts = async () => {
            const initialShifts = [];
            let day = 1;
            for (let m = 7; m <= 12; m++) {
                const service = SERVICES[day % SERVICES.length]; // Simple rotating service assignment
                for (let i = 1; i <= 3; i++) {
                    const date = `2026-${m.toString().padStart(2, '0')}-${(day++).toString().padStart(2, '0')}`;
                    initialShifts.push(`${date} (${service})`);
                }
            }

            const initialData = {
                open: initialShifts,
                most: [],
                least: [],
                lastUpdated: new Date().toISOString(),
            };

            await setDoc(ref, initialData, { merge: true });
            console.log("Initial shifts created in Firestore.");
        };


        // Setup real-time listener
        setLoadingMessage("Listening for real-time updates...");
        const unsubscribe = onSnapshot(ref, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setShifts({
                    open: data.open || [],
                    most: data.most || [],
                    least: data.least || [],
                });
                setLoadingMessage("Database already seeded. Listening for real-time updates.");
            } else {
                // If no document exists, create initial shifts (only happens once)
                createInitialShifts().catch(e => {
                    console.error("Error creating initial shifts:", e);
                    setLoadingMessage(`Error initializing shifts: ${e.message}`);
                });
            }
        }, (error) => {
            console.error("@firebase/firestore: Firestore (9.23.0): Uncaught Error in snapshot listener:", error);
            setLoadingMessage(`Error initializing Firebase: ${error.message}`);
        });

        return () => unsubscribe();
    }, [isAuthReady, userId]);

    // --- 3. DRAG AND DROP HANDLERS (The Fix) ---

    // Generic function to move a shift from source list to destination list
    const moveShift = useCallback((shift, sourceList, destList) => {
        if (sourceList === destList) return;

        setShifts(prev => {
            // Check if destination list is full
            if (destList !== 'open' && prev[destList].length >= 10 && !prev[destList].includes(shift)) {
                setSubmitStatus(`Error: Cannot add more than 10 shifts to the ${destList} list.`);
                return prev; // Do not update state
            }
            setSubmitStatus(''); // Clear status message

            const newSource = prev[sourceList].filter(s => s !== shift);

            // Ensure shift doesn't exist in destination before adding
            const newDest = [...prev[destList].filter(s => s !== shift), shift];

            return {
                ...prev,
                [sourceList]: newSource,
                [destList]: newDest
            };
        });
    }, []);

    // Handles movement on simple click (open -> most, most/least -> open)
    const handleShiftClick = useCallback((shift, sourceList) => {
        let destList;
        if (sourceList === 'open') {
            // If clicking an open shift, move it to 'most' unless 'most' is full
            if (shifts.most.length < 10) {
                destList = 'most';
            } else {
                setSubmitStatus(`Error: 10 MOST Preferred shifts already selected. Drag or click on a shift in that list to remove it first.`);
                return;
            }
        } else {
            destList = 'open'; // Clicking preferred/avoided returns it to open
        }
        moveShift(shift, sourceList, destList);
    }, [moveShift, shifts.most.length]); // Added shifts.most.length as dependency

    // Drag over handler (prevents default to allow dropping)
    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('border-indigo-500'); // Visual feedback
    };

    // Drag leave handler
    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('border-indigo-500');
    };

    // Drop handler
    const handleDrop = useCallback((e, destList) => {
        e.preventDefault();
        e.currentTarget.classList.remove('border-indigo-500');

        const shift = e.dataTransfer.getData("shift");
        const sourceList = e.dataTransfer.getData("source");

        if (shift && sourceList) {
            moveShift(shift, sourceList, destList);
        }
    }, [moveShift]);

    // --- 4. DATA SUBMISSION (The Fix) ---
    const handleSubmit = async () => {
        if (!userId) {
            setSubmitStatus('Error: User not authenticated.');
            return;
        }

        if (shifts.most.length !== 10 || shifts.least.length !== 10) {
            setSubmitStatus('Error: You must rank exactly 10 MOST Preferred and 10 LEAST Preferred.');
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus('Submitting preferences...');

        try {
            const docRef = getPreferencesDocRef(userId);

            // Update Firestore document with new preference arrays
            await setDoc(docRef, {
                most: shifts.most,
                least: shifts.least,
                open: shifts.open, // Keep open list synchronized
                lastUpdated: new Date().toISOString(),
                userName: currentUser ? currentUser.name : 'Unknown User',
            });

            setSubmitStatus('Success! Preferences saved in real-time. Try refreshing to verify persistence!');

        } catch (e) {
            console.error("Error saving preferences:", e);
            setSubmitStatus(`Error saving preferences: ${e.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };


    // Helper to render a list of shift tags
    const renderShiftList = (listName, shiftArray) => (
        <div
            className={`
                p-2 mt-2 min-h-[100px] border-2 border-dashed rounded-lg bg-gray-50 flex flex-wrap content-start
                ${listName === 'most' ? 'border-emerald-300' : ''}
                ${listName === 'least' ? 'border-rose-300' : ''}
                ${listName === 'open' ? 'border-indigo-300' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, listName)}
        >
            {shiftArray.map(shift => (
                <ShiftTag
                    key={shift}
                    shift={shift}
                    list={listName}
                    onClick={handleShiftClick}
                />
            ))}
            {shiftArray.length === 0 && (
                <p className="text-gray-400 text-sm p-2 w-full text-center">
                    {listName === 'open' ? 'All assignments are claimed!' : 'Drag shifts here to rank (Max 10)'}
                </p>
            )}
        </div>
    );

    // --- RENDER ---
    return (
        <div className="p-6 max-w-7xl mx-auto font-sans bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">2026 Attending Fair Scheduling System</h1>
            <p className="text-sm text-gray-600 mb-4">
                Mode: Attending Preference Input | Current User: <span className="font-semibold text-gray-900">{currentUser ? currentUser.name : 'Authenticating...'}</span>
            </p>
            <p className={`text-sm font-medium ${loadingMessage.includes('Error') ? 'text-red-600' : 'text-green-600'} mb-6`}>
                Status: {loadingMessage}
            </p>

            <h2 className="text-xl font-semibold text-gray-700 mb-4">Preference Submission for {currentUser?.name || 'User'}</h2>
            <p className="text-sm text-gray-500 mb-6">
                Select slots from the list on the left and drag them into the ranking lists below. You must rank exactly 10 Most Preferred and 10 Least Preferred.
            </p>

            {/* --- Open Assignments List --- */}
            <h3 className="text-lg font-medium text-gray-700 mb-2">Open Assignments ({shifts.open.length} left)</h3>
            {renderShiftList('open', shifts.open)}

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* --- MOST Preferred Shifts --- */}
                <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                        10 MOST Preferred Shifts <span className="text-emerald-600 font-bold">({shifts.most.length} / 10 ranked)</span>
                    </h3>
                    {renderShiftList('most', shifts.most)}
                </div>

                {/* --- LEAST Preferred Shifts --- */}
                <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                        10 LEAST Preferred Shifts (Avoid) <span className="text-rose-600 font-bold">({shifts.least.length} / 10 ranked)</span>
                    </h3>
                    {renderShiftList('least', shifts.least)}
                </div>
            </div>

            {/* --- Submit Button & Status --- */}
            <div className="mt-8 flex flex-col items-center">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || shifts.most.length !== 10 || shifts.least.length !== 10}
                    className={`
                        py-3 px-8 text-lg font-semibold rounded-xl shadow-lg transition-all duration-300
                        ${(shifts.most.length === 10 && shifts.least.length === 10) && !isSubmitting
                            ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }
                    `}
                >
                    {isSubmitting ? 'Saving...' : 'Submit Final 20 Preferences'}
                </button>
                {submitStatus && (
                    <p className={`mt-3 text-sm font-medium ${submitStatus.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                        {submitStatus}
                    </p>
                )}
            </div>

            <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-500">
                <p>Data stored in Firestore under App ID: <span className="font-mono text-gray-700">{appId}</span>. Your unique user ID is: <span className="font-mono text-gray-700">{userId || 'Authenticating...'}</span></p>
            </div>
        </div>
    );
}
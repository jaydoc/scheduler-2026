import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot } from 'firebase/firestore'; 

// ----------------------------------------------------------------------
// FIX FOR REFERENCE ERROR: Declaring FALLBACK_FIREBASE_CONFIG first
// ----------------------------------------------------------------------
const FALLBACK_FIREBASE_CONFIG = {
    apiKey: "AIzaSyB6CvHk5u4jvvO8oXGnf_GTq1RMbwhT-JU",
    authDomain: "attending-schedule-2026.firebaseapp.com",
    projectId: "attending-schedule-2026",
    storageBucket: "attending-schedule-2026.firebasestorage.app",
    messagingSenderId: "777996986623",
    appId: "1:777996986623:web:0a8697cccb63149d9744ca",
    measurementId: "G-TJXCM9P7W2"
};

// --- GLOBAL VARIABLES ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : FALLBACK_FIREBASE_CONFIG;
const appId = typeof __app_id !== 'undefined' ? __app_id : "attending-scheduler-v6-final"; 
const SERVICES = { 'RNI': 'RNI', 'COA': 'COA' };
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Helper function to get the current Firestore path
const getPreferencesDocRef = (userId) => {
    // Path: /artifacts/{appId}/users/{userId}/preferences/calendar-preferences
    const userPrefsCollection = collection(db, 'artifacts', appId, 'users', userId, 'preferences');
    return doc(userPrefsCollection, 'calendar-preferences');
};

// --- Data Generation: Based on the 2026 Weekend Schedule Document ---

const generateMasterShifts = () => {
    // Data extracted from the 2026 Attending Weekend Schedule document (36 shifts total, Jan-Sept).
    const rawShifts = [
        // JANUARY 2026 (4 shifts)
        { date: '2026-01-10', service: SERVICES.RNI, assigned: 'RNI/BPD/COA QB-H' }, 
        { date: '2026-01-17', service: SERVICES.COA, assigned: 'MLK Day' },
        { date: '2026-01-24', service: SERVICES.RNI, assigned: 'Kane/Winter/Hightower/Coghill' },
        { date: '2026-01-31', service: SERVICES.COA, assigned: 'Kane/Winter/Hightower/Coghill' },

        // FEBRUARY 2026 (4 shifts)
        { date: '2026-02-07', service: SERVICES.COA, assigned: 'Boone' }, 
        { date: '2026-02-14', service: SERVICES.RNI, assigned: 'Boone' }, 
        { date: '2026-02-21', service: SERVICES.COA, assigned: 'Willis' }, 
        { date: '2026-02-28', service: SERVICES.RNI, assigned: 'Willis' }, 

        // MARCH 2026 (4 shifts)
        { date: '2026-03-07', service: SERVICES.RNI, assigned: 'Ambal/Arora' },
        { date: '2026-03-14', service: SERVICES.COA, assigned: 'Winter' }, 
        { date: '2026-03-21', service: SERVICES.RNI, assigned: 'Ambal/Arora' },
        { date: '2026-03-28', service: SERVICES.COA, assigned: 'Arora' }, 

        // APRIL 2026 (4 shifts)
        { date: '2026-04-04', service: SERVICES.COA, assigned: 'Sims' }, 
        { date: '2026-04-11', service: SERVICES.RNI, assigned: 'Sims/Kane/Black/Yazdi' }, 
        { date: '2026-04-18', service: SERVICES.COA, assigned: 'Sims' }, 
        { date: '2026-04-25', service: SERVICES.RNI, assigned: 'PAS' }, 
        
        // MAY 2026 (4 shifts)
        { date: '2026-05-02', service: SERVICES.RNI, assigned: 'Arora/Lal/Kabani/Summerlin' },
        { date: '2026-05-09', service: SERVICES.COA, assigned: 'Arora' }, 
        { date: '2026-05-16', service: SERVICES.RNI, assigned: 'Arora' }, 
        { date: '2026-05-23', service: SERVICES.COA, assigned: 'Memorial Day' },

        // JUNE 2026 (4 shifts)
        { date: '2026-06-06', service: SERVICES.RNI, assigned: 'Schuyler/Winter' },
        { date: '2026-06-13', service: SERVICES.COA, assigned: 'Boone' }, 
        { date: '2026-06-19', service: SERVICES.RNI, assigned: 'Juneteenth Day' },
        { date: '2026-06-27', service: SERVICES.COA, assigned: 'Boone' }, 
        
        // JULY 2026 (4 shifts)
        { date: '2026-07-04', service: SERVICES.RNI, assigned: '4th of July' },
        { date: '2026-07-11', service: SERVICES.COA, assigned: 'Willis' }, 
        { date: '2026-07-18', service: SERVICES.RNI, assigned: 'Jain/Shukla/Willis/Carlo' }, 
        { date: '2026-07-25', service: SERVICES.COA, assigned: 'Shukla/Willis' },

        // AUGUST 2026 (4 shifts)
        { date: '2026-08-01', service: SERVICES.COA, assigned: 'Boone' }, 
        { date: '2026-08-08', service: SERVICES.RNI, assigned: 'Sims/Carlo' },
        { date: '2026-08-15', service: SERVICES.COA, assigned: 'Boone' }, 
        { date: '2026-08-22', service: SERVICES.RNI, assigned: 'Sims' }, 

        // SEPTEMBER 2026 (4 shifts)
        { date: '2026-09-05', service: SERVICES.RNI, assigned: 'Labor Day' },
        { date: '2026-09-12', service: SERVICES.COA, assigned: 'Mackay/Philips/Black/Stoops' }, 
        { date: '2026-09-19', service: SERVICES.RNI, assigned: 'Mackay/Philips/Black/Stoops' },
        { date: '2026-09-26', service: SERVICES.COA, assigned: 'Mackay/Philips/Black/Stoops' },
    ];
    
    // Process and group the shifts by month
    const shiftsByMonth = rawShifts.reduce((acc, s) => {
        const dateParts = s.date.split('-');
        const monthIndex = parseInt(dateParts[1], 10) - 1;
        const monthName = MONTH_NAMES[monthIndex];

        // A shift is 'Taken' (FILLED) if the 'assigned' detail is a single attending's name
        const isTaken = s.assigned && !s.assigned.includes('/') && !s.assigned.includes('Day') && s.assigned !== 'PAS' && s.assigned !== 'RNI/BPD/COA QB-H';
        
        const shift = {
            id: s.date, 
            month: monthName,
            day: dateParts[2],
            service: s.service,
            isTaken: isTaken, 
            detail: s.assigned
        };

        if (!acc[monthName]) {
            acc[monthName] = [];
        }
        acc[monthName].push(shift);
        return acc;
    }, {});
    
    return shiftsByMonth;
};

// --- Shared Components ---

const PreferenceDropdown = React.memo(({ shiftId, currentType, currentRank, onUpdate, isTaken }) => {
    if (isTaken) {
        return (
            <div className="text-xs font-bold text-red-600 py-1 px-2 mt-1 bg-red-100 rounded-lg text-center shadow-inner">
                FILLED
            </div>
        );
    }
    
    // Options: None (0), Most (1-10), Least (1-10)
    const mostOptions = Array.from({ length: 10 }, (_, i) => ({ 
        label: `Most Pref. #${i + 1}`, 
        value: `most-${i + 1}`, 
    }));
    const leastOptions = Array.from({ length: 10 }, (_, i) => ({ 
        label: `Least Pref. #${i + 1}`, 
        value: `least-${i + 1}`, 
    }));
    
    const options = [
        { label: "None", value: "none" },
        ...mostOptions,
        ...leastOptions,
    ];

    const currentValue = currentType === 'none' ? 'none' : `${currentType}-${currentRank}`;
    
    const handleChange = (e) => {
        const value = e.target.value;
        const [type, rank] = value.split('-');
        onUpdate(shiftId, type || 'none', rank ? parseInt(rank, 10) : 0);
    };

    return (
        <select
            value={currentValue}
            onChange={handleChange}
            className={`
                mt-1 w-full text-xs p-1 rounded-lg border-2 shadow-sm
                transition-all duration-150 ease-in-out cursor-pointer
                ${currentType === 'most' ? 'bg-emerald-100 border-emerald-500 text-emerald-800 font-semibold' : ''}
                ${currentType === 'least' ? 'bg-rose-100 border-rose-500 text-rose-800 font-semibold' : ''}
                ${currentType === 'none' ? 'bg-white border-gray-300 text-gray-700' : ''}
                focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
            `}
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
});


// --- MAIN APP COMPONENT ---
export default function App() {
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Authenticating...");
    
    const [shiftsByMonth] = useState(generateMasterShifts); 
    const [preferences, setPreferences] = useState({});
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState('');
    
    const allShifts = useMemo(() => Object.values(shiftsByMonth).flat(), [shiftsByMonth]);
    // Count shifts not marked as 'isTaken' (e.g., those with multiple names or holiday placeholders)
    const availableShiftsCount = useMemo(() => allShifts.filter(s => !s.isTaken).length, [allShifts]);

    // --- 1. AUTHENTICATION & Initialization ---
    useEffect(() => {
        const initializeAuth = async () => {
            const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
            let unsubscribe = () => {};

            try {
                if (token) {
                    await signInWithCustomToken(auth, token);
                } else {
                    await signInAnonymously(auth);
                }

                unsubscribe = onAuthStateChanged(auth, (user) => {
                    if (user) {
                        setUserId(user.uid);
                    }
                    setIsAuthReady(true);
                });
            } catch (error) {
                console.error("Error during authentication:", error);
                setLoadingMessage(`Authentication Error: ${error.message}`);
                setIsAuthReady(true); 
            }
            return unsubscribe;
        };

        const cleanup = initializeAuth();
        return () => { if (typeof cleanup === 'function') cleanup(); };
    }, []);

    // --- 2. DATA LISTENER ---
    useEffect(() => {
        if (!isAuthReady || !userId) return;

        const ref = getPreferencesDocRef(userId);

        setLoadingMessage("Listening for real-time updates...");
        const unsubscribe = onSnapshot(ref, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setPreferences(data.preferences || {});
                setLoadingMessage("Preferences loaded.");
            } else {
                // Initialize only the UNTAKEN shifts with 'none' preferences
                const initialPrefs = allShifts.reduce((acc, shift) => {
                    if (!shift.isTaken) {
                        acc[shift.id] = { type: 'none', rank: 0 };
                    }
                    return acc;
                }, {});
                setPreferences(initialPrefs);
                setLoadingMessage("Ready to select preferences.");
                
                // Write initial empty state to Firestore
                setDoc(ref, { preferences: initialPrefs, lastUpdated: new Date().toISOString() }, { merge: true }).catch(e => console.error("Error setting initial doc:", e));
            }
        }, (error) => {
            console.error("@firebase/firestore: Error in snapshot listener:", error);
            setLoadingMessage(`Error loading data: ${error.message}`);
        });

        return () => unsubscribe();
    }, [isAuthReady, userId, allShifts]);

    // --- 3. Interaction Logic ---
    
    const handlePreferenceChange = useCallback((shiftId, type, rank) => {
        setPreferences(prevPreferences => {
            const newPreferences = { ...prevPreferences };
            
            // Check for duplicate ranks
            if (type !== 'none' && rank > 0) {
                const isRankUsed = Object.entries(newPreferences).some(([id, pref]) => 
                    id !== shiftId && pref.type === type && pref.rank === rank
                );
                
                if (isRankUsed) {
                    setSubmitStatus(`Error: Rank #${rank} in the ${type.toUpperCase()} category is already selected for another shift. Please choose a different rank.`);
                    return prevPreferences; 
                }
            }
            
            // Update or reset preference
            if (type === 'none') {
                newPreferences[shiftId] = { type: 'none', rank: 0 };
            } else {
                newPreferences[shiftId] = { type, rank };
            }
            
            setSubmitStatus(''); // Clear status on successful change
            return newPreferences;
        });
    }, []);

    // Memoized computation of current counts and validation messages
    const counts = useMemo(() => {
        const most = Object.values(preferences).filter(p => p.type === 'most');
        const least = Object.values(preferences).filter(p => p.type === 'least');
        
        let isValid = true;
        let validationMessage = "";
        
        // Check for unique ranks within each group (Most/Least)
        const mostRanks = new Set(most.map(p => p.rank));
        const leastRanks = new Set(least.map(p => p.rank));
        
        if (most.length !== mostRanks.size || least.length !== leastRanks.size) {
            isValid = false;
            validationMessage = "All ranks within the MOST or LEAST preferred categories must be unique.";
        }
        
        // Check for correct ranking ranges (1-10)
        if (most.some(p => p.rank < 1 || p.rank > 10) || least.some(p => p.rank < 1 || p.rank > 10)) {
            isValid = false;
            validationMessage = "Ranks must be between 1 and 10.";
        }

        return {
            mostCount: most.length,
            leastCount: least.length,
            isValid,
            validationMessage: isValid ? "Ready to submit." : validationMessage
        };
    }, [preferences]);

    // --- 4. DATA SUBMISSION ---
    const handleSubmit = async () => {
        if (!userId) {
            setSubmitStatus('Error: User not authenticated.');
            return;
        }

        if (!counts.isValid) {
            setSubmitStatus(`Submission Blocked: ${counts.validationMessage}`);
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus('Submitting preferences...');

        try {
            const docRef = getPreferencesDocRef(userId);

            // Only save non-'none' preferences
            const preferencesToSave = Object.fromEntries(
                Object.entries(preferences).filter(([, pref]) => pref.type !== 'none')
            );
            
            await setDoc(docRef, {
                preferences: preferencesToSave,
                lastUpdated: new Date().toISOString(),
                totalShifts: allShifts.length,
                submittedCounts: { most: counts.mostCount, least: counts.leastCount }
            }, { merge: true });

            setSubmitStatus('Success! Full calendar preferences saved in real-time.');

        } catch (e) {
            console.error("Error saving preferences:", e);
            setSubmitStatus(`Error saving preferences: ${e.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };


    // --- RENDER ---
    return (
        <div className="p-6 max-w-7xl mx-auto font-sans bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">2026 Attending Weekend Preference System</h1>
            <p className="text-sm text-gray-600 mb-4">
                Full-Year Calendar View | **Available Shifts to Rank**: <span className="font-semibold text-blue-700">{availableShiftsCount}</span>
            </p>
            
            <p className={`text-sm font-medium ${loadingMessage.includes('Error') ? 'text-red-600' : 'text-green-600'} mb-6`}>
                Database Status: {loadingMessage}
            </p>

            {/* --- Count & Instructions Bar --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 p-4 bg-white shadow-lg rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600 sm:mr-4 mb-4 sm:mb-0">
                    **Instructions:** Rank your **Top 10 Most Preferred** and **Top 10 Least Preferred** shifts using the dropdowns on the available dates. All ranks (1-10) must be unique within their respective category. You can update your selections at any time.
                </p>
                <div className="flex-shrink-0 flex space-x-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold 
                        ${counts.mostCount >= 1 && counts.mostCount <= 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        Most Pref: {counts.mostCount} / 10
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold 
                        ${counts.leastCount >= 1 && counts.leastCount <= 10 ? 'bg-rose-100 text-rose-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        Least Pref: {counts.leastCount} / 10
                    </span>
                </div>
            </div>
            
            {/* --- CALENDAR GRID VIEW by MONTH --- */}
            {MONTH_NAMES.map((monthName) => {
                const shifts = shiftsByMonth[monthName];
                if (!shifts || shifts.length === 0) return null;

                return (
                    <div key={monthName} className="mb-8">
                        <h3 className="text-2xl font-bold text-gray-700 mb-4 border-b-2 border-indigo-200 pb-2">{monthName} 2026}</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {shifts.map((shift) => {
                                const currentPref = preferences[shift.id] || { type: 'none', rank: 0 };
                                
                                let bgColor = 'bg-white';
                                let borderColor = 'border-gray-300';

                                if (shift.isTaken) {
                                    // Already assigned to a single attending
                                    bgColor = 'bg-gray-100';
                                    borderColor = 'border-red-400';
                                } else if (currentPref.type === 'most') {
                                    // User selected as most preferred
                                    bgColor = 'bg-emerald-50';
                                    borderColor = 'border-emerald-500';
                                } else if (currentPref.type === 'least') {
                                    // User selected as least preferred
                                    bgColor = 'bg-rose-50';
                                    borderColor = 'border-rose-500';
                                }

                                return (
                                    <div 
                                        key={shift.id}
                                        className={`p-3 rounded-xl shadow-md border-2 ${bgColor} ${borderColor} transition-all duration-300 min-h-[160px] flex flex-col justify-between`}
                                    >
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase">{shift.month}</p>
                                            <p className="text-3xl font-extrabold text-gray-800 leading-none">{shift.day}</p>
                                            
                                            <div className={`mt-1 text-sm font-bold rounded-md px-2 py-1 inline-block 
                                                ${shift.service === SERVICES.RNI ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}
                                            >
                                                {shift.service}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 h-8 overflow-hidden" title={shift.detail}>
                                                {shift.detail}
                                            </p>
                                        </div>
                                        
                                        <div className="mt-2 h-14 flex-shrink-0">
                                            <PreferenceDropdown
                                                shiftId={shift.id}
                                                currentType={currentPref.type}
                                                currentRank={currentPref.rank}
                                                onUpdate={handlePreferenceChange}
                                                isTaken={shift.isTaken}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {/* --- Submit Button & Status --- */}
            <div className="mt-12 flex flex-col items-center">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !counts.isValid}
                    className={`
                        py-3 px-8 text-lg font-semibold rounded-xl shadow-lg transition-all duration-300
                        ${counts.isValid && !isSubmitting
                            ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }
                    `}
                >
                    {isSubmitting ? 'Saving...' : 'Submit Preferences'}
                </button>
                {submitStatus && (
                    <p className={`mt-3 text-sm font-medium text-center ${submitStatus.includes('Error') || submitStatus.includes('Blocked') ? 'text-red-600' : 'text-green-600'}`}>
                        {submitStatus}
                    </p>
                )}
                {!counts.isValid && (
                    <p className="mt-3 text-sm font-medium text-center text-red-600">
                        {counts.validationMessage}
                    </p>
                )}
            </div>

            <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-500 text-center">
                <p>Your unique user ID is: <span className="font-mono text-gray-700">{userId || 'Authenticating...'}</span>. This ID ensures your rankings are saved securely to the database.</p>
            </div>
        </div>
    );
}
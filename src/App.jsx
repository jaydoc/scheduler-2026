import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot } from 'firebase/firestore'; 

// ----------------------------------------------------------------------
// Firebase Config & Global Constants
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
const appId = typeof __app_id !== 'undefined' ? __app_id : "attending-scheduler-v6-refined"; 
const YEAR = 2026;
const SERVICES = {
    RNI: 'RNI', 
    COA: 'COA',
    NONE: 'none'
};

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

// ----------------------------------------------------------------------
// DATA PROCESSING (Manually refined based on user feedback and document structure)
// ----------------------------------------------------------------------

// The service property now dictates which service the user can bid on (RNI, COA, or BOTH/NONE if filled).
const rawShiftsByMonth = {
    // RNI Attending is listed first, COA Attending is listed second.
    // If rni/coa is null, that service is OPEN for bidding.
    
    // JANUARY 2026 (Assigned Attending List: Kane/Winter/Hightower/Coghill)
    '01': [
        { day: '10', date: '2026-01-10', detail: 'Kane/Winter/Hightower/Coghill', rni: 'Kane', coa: 'Winter' },
        { day: '17-19', date: '2026-01-17', detail: 'MLK Day', rni: 'MLK Day', coa: 'Holiday', isTaken: true }, // Holiday, fully taken
        { day: '24', date: '2026-01-24', detail: 'Kane/Winter/Hightower/Coghill', rni: 'Hightower', coa: 'Coghill' },
        { day: '31', date: '2026-01-31', detail: 'Kane/Winter/Hightower/Coghill', rni: 'Kane', coa: 'Winter' },
    ],
    // FEBRUARY 2026 (Assigned Attending List: Philips/Boone/Willis/Stoops/Kabani)
    '02': [
        { day: '7', date: '2026-02-07', detail: 'Boone/', rni: 'Boone', coa: null }, // COA OPEN
        { day: '14', date: '2026-02-14', detail: 'Boone/', rni: 'Boone', coa: null }, // COA OPEN
        { day: '21', date: '2026-02-21', detail: 'Willis /', rni: 'Willis', coa: null }, // COA OPEN
        { day: '28', date: '2026-02-28', detail: 'Willis/', rni: 'Willis', coa: null }, // COA OPEN
    ],
    // MARCH 2026 (Assigned Attending List: Valcarce/Ambal/Arora/Winter)
    '03': [
        { day: '7', date: '2026-03-07', detail: 'Ambal/Arora', rni: 'Ambal', coa: 'Arora' },
        { day: '14', date: '2026-03-14', detail: '/Winter', rni: null, coa: 'Winter' }, // RNI OPEN
        { day: '21', date: '2026-03-21', detail: 'Ambal/Arora', rni: 'Ambal', coa: 'Arora' },
        { day: '28', date: '2026-03-28', detail: '/Arora', rni: null, coa: 'Arora' }, // RNI OPEN
    ],
    // APRIL 2026 (Assigned Attending List: Sims/Kane/Black/Yazdi)
    '04': [
        { day: '4', date: '2026-04-04', detail: 'Sims', rni: 'Sims', coa: null }, // COA OPEN
        { day: '11', date: '2026-04-11', detail: 'Sims/Kane/Black/Yazdi', rni: 'Kane', coa: 'Black' },
        { day: '18', date: '2026-04-18', detail: 'Sims', rni: 'Sims', coa: null }, // COA OPEN
        { day: '25', date: '2026-04-25', detail: '(PAS)', rni: 'PAS', coa: 'PAS', isTaken: true }, // PAS is a detail, fully taken
    ],
    // MAY 2026 (Assigned Attending List: Arora/Lal/Kabani/Summerlin)
    '05': [
        { day: '2', date: '2026-05-02', detail: 'Arora/Lal/Kabani/Summerlin', rni: 'Arora', coa: 'Lal' },
        { day: '9', date: '2026-05-09', detail: 'Arora', rni: 'Arora', coa: null }, // COA OPEN
        { day: '16', date: '2026-05-16', detail: 'Arora', rni: 'Arora', coa: null }, // COA OPEN
        { day: '23-25', date: '2026-05-23', detail: 'Memorial Day', rni: 'Holiday', coa: 'Holiday', isTaken: true }, // Holiday, fully taken
        { day: '30', date: '2026-05-30', detail: 'Arora', rni: 'Arora', coa: null }, // COA OPEN
    ],
    // JUNE 2026 (Assigned Attending List: Schuyler/Boone/Philips/Winter)
    '06': [
        { day: '6', date: '2026-06-06', detail: 'Schuyler/Winter', rni: 'Schuyler', coa: 'Winter' },
        { day: '13', date: '2026-06-13', detail: 'Boone/', rni: 'Boone', coa: null }, // COA OPEN
        { day: '19-21', date: '2026-06-19', detail: 'Juneteenth Day Schuyler/Winter', rni: 'Holiday', coa: 'Holiday', isTaken: true }, // Holiday, fully taken
        { day: '27', date: '2026-06-27', detail: 'Boone', rni: 'Boone', coa: null }, // COA OPEN
    ],
    // JULY 2026 (Assigned Attending List: Jain/Shukla/Willis/Carlo)
    '07': [
        { day: '4-6', date: '2026-07-04', detail: '4th of July Jain/Carlo', rni: 'Jain', coa: 'Carlo', isTaken: true }, // Holiday, fully taken
        { day: '11', date: '2026-07-11', detail: '/Willis', rni: null, coa: 'Willis' }, // RNI OPEN
        { day: '18', date: '2026-07-18', detail: 'Jain/Shukla/Willis/Carlo', rni: 'Shukla', coa: 'Willis' },
        { day: '25', date: '2026-07-25', detail: 'Shukla/Willis', rni: 'Shukla', coa: 'Willis' },
    ],
    // AUGUST 2026 (Assigned Attending List: Boone/Sims/Summerlin/Carlo)
    '08': [
        { day: '1', date: '2026-08-01', detail: 'Boone/', rni: 'Boone', coa: null }, // COA OPEN
        { day: '8', date: '2026-08-08', detail: 'Sims/Carlo', rni: 'Sims', coa: 'Carlo' },
        { day: '15', date: '2026-08-15', detail: 'Boone/', rni: 'Boone', coa: null }, // COA OPEN
        { day: '22', date: '2026-08-22', detail: 'Sims/', rni: 'Sims', coa: null }, // COA OPEN
        { day: '29', date: '2026-08-29', detail: '/Carlo', rni: null, coa: 'Carlo' }, // RNI OPEN
    ],
    // SEPTEMBER 2026 (Assigned Attending List: Mackay/Philips/Black/Stoops)
    '09': [
        { day: '5-7', date: '2026-09-05', detail: 'Labor Day Mackay/', rni: 'Mackay', coa: 'Holiday', isTaken: true }, // Holiday, fully taken
        { day: '12', date: '2026-09-12', detail: 'Mackay/Philips/Black/Stoops', rni: null, coa: null, isAvailable: true }, // BOTH OPEN
        { day: '19', date: '2026-09-19', detail: 'Mackay/Philips/Black/Stoops', rni: null, coa: null, isAvailable: true }, // BOTH OPEN
        { day: '26', date: '2026-09-26', detail: 'Mackay/Philips/Black/Stoops', rni: null, coa: null, isAvailable: true }, // BOTH OPEN
    ],
    // OCTOBER 2026 (Assigned Attending List: Kandasamy/Travers/Yazdi/Carlo/Bhatia)
    '10': [
        { day: '3', date: '2026-10-03', detail: 'Kandasamy/Carlo', rni: 'Kandasamy', coa: 'Carlo' },
        { day: '10', date: '2026-10-10', detail: 'Travers/Bhatia', rni: 'Travers', coa: 'Bhatia' },
        { day: '17', date: '2026-10-17', detail: 'Kandasamy/', rni: 'Kandasamy', coa: null }, // COA OPEN
        { day: '24', date: '2026-10-24', detail: 'Travers/Bhatia', rni: 'Travers', coa: 'Bhatia' },
        { day: '31', date: '2026-10-31', detail: 'Kandasamy/Carlo', rni: 'Kandasamy', coa: 'Carlo' },
    ],
    // NOVEMBER 2026 (Assigned Attending List: Ambal/Bhatia/Hightower/Black)
    '11': [
        { day: '7', date: '2026-11-07', detail: 'Ambal/', rni: 'Ambal', coa: null }, // COA OPEN
        { day: '14', date: '2026-11-14', detail: 'Bhatia', rni: 'Bhatia', coa: null }, // COA OPEN
        { day: '21', date: '2026-11-21', detail: 'Ambal/', rni: 'Ambal', coa: null }, // COA OPEN
        { day: '26-28', date: '2026-11-26', detail: 'Thanksgiving Bhatia/', rni: 'Bhatia', coa: 'Holiday', isTaken: true }, // Holiday, fully taken
    ],
    // DECEMBER 2026 (Assigned Attending List: Travers/Valcarce/Kabani/Kandasamy)
    '12': [
        { day: '5', date: '2026-12-05', detail: 'Travers/Kandasamy', rni: 'Travers', coa: 'Kandasamy' },
        { day: '12', date: '2026-12-12', detail: 'Travers/Valcarce/Kabani/Kandasamy', rni: null, coa: null, isAvailable: true }, // BOTH OPEN
        { day: '19', date: '2026-12-19', detail: 'Travers/Kandasamy', rni: 'Travers', coa: 'Kandasamy' },
        { day: '24-28', date: '2026-12-24', detail: 'Christmas Bhatia/Arora', rni: 'Bhatia', coa: 'Arora', isTaken: true }, // Holiday, fully taken
        { day: '31-Jan 4', date: '2026-12-31', detail: 'New Year Kane/Kandasamy', rni: 'Kane', coa: 'Kandasamy', isTaken: true }, // Holiday, fully taken
    ],
};

const getShiftMap = () => {
    let map = {};
    Object.values(rawShiftsByMonth).flat().forEach(s => {
        const isRniOpen = s.rni === null || s.rni === 'OPEN';
        const isCoaOpen = s.coa === null || s.coa === 'OPEN';
        
        map[s.date] = {
            id: s.date,
            day: s.day,
            detail: s.detail,
            rniAttending: s.rni,
            coaAttending: s.coa,
            isTaken: s.isTaken || (!isRniOpen && !isCoaOpen), // Taken if both slots are filled/holiday
            isRniAvailable: isRniOpen,
            isCoaAvailable: isCoaOpen,
        };
    });
    return map;
};

// ----------------------------------------------------------------------
// SHARED COMPONENTS
// ----------------------------------------------------------------------

const PreferenceSelector = React.memo(({ shiftId, serviceType, currentPref, onUpdate }) => {
    const isSelected = currentPref.service === serviceType;
    const currentRank = currentPref.rank;

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

    // Determine the current value string for the select box
    const currentValue = isSelected && currentPref.type !== 'none' 
        ? `${currentPref.type}-${currentPref.rank}` 
        : 'none';
    
    // Determine button text and styling
    const buttonText = isSelected 
        ? `${serviceType}: ${currentPref.type === 'most' ? 'M#' : 'L#'}${currentRank}` 
        : serviceType;
        
    let buttonClass = "w-1/2 p-1 text-xs font-semibold rounded-md border transition-colors duration-150 shadow-sm";
    if (serviceType === SERVICES.RNI) {
        buttonClass += isSelected ? " bg-blue-600 text-white border-blue-800 hover:bg-blue-700" : " bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200";
    } else { // COA
        buttonClass += isSelected ? " bg-purple-600 text-white border-purple-800 hover:bg-purple-700" : " bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200";
    }


    const handleChange = (e) => {
        const value = e.target.value;
        const [type, rank] = value.split('-');
        // Pass the shiftId, the service, the type ('most'/'least'/'none'), and the rank
        onUpdate(shiftId, serviceType, type || 'none', rank ? parseInt(rank, 10) : 0);
    };

    return (
        <select
            value={currentValue}
            onChange={handleChange}
            className={`
                w-full text-[10px] p-0.5 rounded-md border shadow-sm h-[30px]
                transition-all duration-150 ease-in-out cursor-pointer
                ${currentPref.type === 'most' ? 'bg-emerald-100 border-emerald-500 text-emerald-800 font-semibold' : ''}
                ${currentPref.type === 'least' ? 'bg-rose-100 border-rose-500 text-rose-800 font-semibold' : ''}
                ${currentPref.type === 'none' && isSelected ? 'bg-yellow-100 border-yellow-500 text-yellow-800' : 'bg-white border-gray-300 text-gray-700'}
                focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500
            `}
        >
            <option value="none">
                {isSelected ? `Selected ${serviceType}: Reset/Rank` : `Select ${serviceType}`}
            </option>
            {options.slice(1).map(opt => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
});


const MonthTable = React.memo(({ monthKey, monthTitle, shifts, preferences, onPreferenceUpdate }) => {
    return (
        <table className="w-full text-left border-collapse table-auto">
            <thead>
                <tr>
                    <th colSpan="3" className="bg-yellow-400 text-gray-800 text-lg font-extrabold p-3 border border-gray-300">
                        {monthTitle}
                    </th>
                </tr>
            </thead>
            <tbody>
                {shifts.map((shift, index) => {
                    const shiftId = shift.date;
                    const pref = preferences[shiftId] || { service: SERVICES.NONE, type: SERVICES.NONE, rank: 0 };
                    
                    let rowClass = index % 2 === 0 ? 'bg-gray-50' : 'bg-white';
                    let assignmentText = '';
                    
                    const isRniOpen = shift.isRniAvailable;
                    const isCoaOpen = shift.isCoaAvailable;

                    // Apply preference coloring
                    if (pref.type === 'most') {
                        rowClass += " !bg-emerald-100 ring-2 ring-emerald-300";
                    } else if (pref.type === 'least') {
                        rowClass += " !bg-rose-100 ring-2 ring-rose-300";
                    } else if (shift.isTaken) {
                         rowClass += " opacity-75"; // Subtle opacity for filled shifts
                    }
                    
                    // Construct assignment text
                    if (shift.rniAttending || shift.coaAttending) {
                        const rni = shift.rniAttending && shift.rniAttending !== 'Holiday' ? shift.rniAttending : (isRniOpen ? 'OPEN' : 'FILLED');
                        const coa = shift.coaAttending && shift.coaAttending !== 'Holiday' ? shift.coaAttending : (isCoaOpen ? 'OPEN' : 'FILLED');
                        assignmentText = `${rni} / ${coa}`;
                    } else {
                        assignmentText = shift.detail;
                    }


                    return (
                        <tr key={shiftId} className={`border border-gray-300 ${rowClass}`}>
                            {/* Date Column */}
                            <td className="w-1/4 p-2 font-semibold text-lg border-r border-gray-300 text-center">
                                {shift.day}
                            </td>
                            {/* Attending/Assignment Column */}
                            <td className="w-1/2 p-2 text-sm">
                                <span className={`font-bold ${shift.isTaken ? 'text-red-700' : 'text-gray-800'}`}>
                                    {assignmentText}
                                </span>
                                
                                {/* Show detail if it contains holiday info */}
                                {shift.detail && (shift.detail.includes('Day') || shift.detail.includes('Year')) && (
                                    <span className="ml-2 text-xs italic text-orange-600">
                                        ({shift.detail.split(' ')[0]})
                                    </span>
                                )}
                            </td>
                            {/* Preference Dropdown Column */}
                            <td className="w-1/4 p-1 space-y-1">
                                {shift.isTaken ? (
                                    <div className="text-xs font-bold text-red-600 py-1 px-2 bg-red-100 rounded-md text-center shadow-inner">
                                        FULLY ASSIGNED
                                    </div>
                                ) : (
                                    <>
                                        {shift.isRniAvailable && (
                                            <PreferenceSelector
                                                shiftId={shiftId}
                                                serviceType={SERVICES.RNI}
                                                currentPref={pref.service === SERVICES.RNI ? pref : { service: SERVICES.NONE, type: SERVICES.NONE, rank: 0 }}
                                                onUpdate={onPreferenceUpdate}
                                            />
                                        )}
                                        {shift.isCoaAvailable && (
                                            <PreferenceSelector
                                                shiftId={shiftId}
                                                serviceType={SERVICES.COA}
                                                currentPref={pref.service === SERVICES.COA ? pref : { service: SERVICES.NONE, type: SERVICES.NONE, rank: 0 }}
                                                onUpdate={onPreferenceUpdate}
                                            />
                                        )}
                                        {/* Fallback if data is marked as available but slots are filled */}
                                        {!shift.isRniAvailable && !shift.isCoaAvailable && (
                                             <div className="text-xs font-bold text-gray-500 py-1 px-2 bg-gray-200 rounded-md text-center shadow-inner">
                                                No Open Slots
                                            </div>
                                        )}
                                    </>
                                )}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
});


// ----------------------------------------------------------------------
// MAIN APP COMPONENT
// ----------------------------------------------------------------------
export default function App() {
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Authenticating...");
    
    // Memoize the data map to prevent recalculation on every render
    const shiftMap = useMemo(getShiftMap, []); 
    const [preferences, setPreferences] = useState({});
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState('');
    
    // Calculate total available slots across both RNI and COA
    const availableShiftsCount = useMemo(() => {
        return Object.values(shiftMap).reduce((count, shift) => {
            if (shift.isRniAvailable) count++;
            if (shift.isCoaAvailable) count++;
            return count;
        }, 0);
    }, [shiftMap]);

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
                // Ensure loaded preferences are merged and only include valid shifts/services
                setPreferences(data.preferences || {});
                setLoadingMessage("Preferences loaded.");
            } else {
                // Initialize only the available services for available shifts with 'none' preferences
                const initialPrefs = Object.values(shiftMap).reduce((acc, shift) => {
                    if (shift.isRniAvailable || shift.isCoaAvailable) {
                         // The key is the date, but the value must contain the preferred service
                         // We rely on the user to select the service on change.
                         acc[shift.id] = { service: SERVICES.NONE, type: SERVICES.NONE, rank: 0 };
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
    }, [isAuthReady, userId, shiftMap]);

    // --- 3. Interaction Logic ---
    // shiftId: '2026-09-12', serviceType: 'RNI', type: 'most', rank: 1
    const handlePreferenceChange = useCallback((shiftId, serviceType, type, rank) => {
        setPreferences(prevPreferences => {
            const newPreferences = { ...prevPreferences };
            
            // Check for duplicate ranks across ALL shifts, regardless of service (RNI/COA)
            if (type !== 'none' && rank > 0) {
                const isRankUsed = Object.entries(newPreferences).some(([id, pref]) => 
                    (id !== shiftId || pref.service !== serviceType) && pref.type === type && pref.rank === rank
                );
                
                if (isRankUsed) {
                    setSubmitStatus(`Error: Rank #${rank} in the ${type.toUpperCase()} category is already selected for another shift/service. Please choose a different rank.`);
                    return prevPreferences; 
                }
            }
            
            // If selecting a rank (most/least), update the service type too.
            if (type !== 'none') {
                newPreferences[shiftId] = { service: serviceType, type, rank };
            } else {
                // If selecting 'None', reset the preference for this shift
                newPreferences[shiftId] = { service: SERVICES.NONE, type: SERVICES.NONE, rank: 0 };
            }
            
            setSubmitStatus(''); // Clear status on successful change
            return newPreferences;
        });
    }, []);

    // Memoized computation of current counts and validation messages
    const counts = useMemo(() => {
        const activePreferences = Object.values(preferences).filter(p => p.type !== SERVICES.NONE);
        const most = activePreferences.filter(p => p.type === 'most');
        const least = activePreferences.filter(p => p.type === 'least');
        
        let isValid = true;
        let validationMessage = "";
        
        // Check for unique ranks across ALL selected preferences
        const allRanks = activePreferences.map(p => `${p.type}-${p.rank}`);
        if (allRanks.length !== new Set(allRanks).size) {
            isValid = false;
            validationMessage = "All ranks (Most #1-10, Least #1-10) must be unique across all shifts and services.";
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

            // Only save active preferences
            const preferencesToSave = Object.fromEntries(
                Object.entries(preferences).filter(([, pref]) => pref.type !== SERVICES.NONE)
            );
            
            await setDoc(docRef, {
                preferences: preferencesToSave,
                lastUpdated: new Date().toISOString(),
                totalAvailableSlots: availableShiftsCount,
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
    const monthOrder = Object.keys(rawShiftsByMonth);

    // Group months into two columns (6 months per column)
    const column1Months = monthOrder.slice(0, 6);
    const column2Months = monthOrder.slice(6);
    
    // Helper to extract the month name and attending list from the raw data structure
    const getMonthTitle = (monthKey) => {
        const monthMap = {
            '01': 'JANUARY (Kane/Winter/Hightower/Coghill)',
            '02': 'FEBRUARY (Philips/Boone/Willis/Stoops/Kabani)',
            '03': 'MARCH (Valcarce/Ambal/Arora/Winter)',
            '04': 'APRIL (Sims/Kane/Black/Yazdi)',
            '05': 'MAY (Arora/Lal/Kabani/Summerlin)',
            '06': 'JUNE (Schuyler/Boone/Philips/Winter)',
            '07': 'JULY (Jain/Shukla/Willis/Carlo)',
            '08': 'AUGUST (Boone/Sims/Summerlin/Carlo)',
            '09': 'SEPTEMBER (Mackay/Philips/Black/Stoops)',
            '10': 'OCTOBER (Kandasamy/Travers/Yazdi/Carlo/Bhatia)',
            '11': 'NOVEMBER (Ambal/Bhatia/Hightower/Black)',
            '12': 'DECEMBER (Travers/Valcarce/Kabani/Kandasamy)',
        };
        return monthMap[monthKey] || 'TBD';
    };


    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto font-sans bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">2026 Attending Weekend Preference System</h1>
            <p className="text-sm text-gray-600 mb-4">
                Refined Tabular View | **Total Available Slots to Rank**: <span className="font-semibold text-blue-700">{availableShiftsCount}</span>
            </p>
            
            <p className={`text-sm font-medium ${loadingMessage.includes('Error') ? 'text-red-600' : 'text-green-600'} mb-6`}>
                Database Status: {loadingMessage}
            </p>

            {/* --- Count & Instructions Bar --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 p-4 bg-white shadow-lg rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600 sm:mr-4 mb-4 sm:mb-0">
                    **Instructions:** For **OPEN** shifts, select the service (RNI or COA) and then rank your preference. Ranks (1-10) must be unique across all selections.
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
            
            {/* --- TWO-COLUMN TABULAR VIEW --- */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Column 1: Jan - Jun */}
                <div className="space-y-6">
                    {column1Months.map(monthKey => (
                        <MonthTable 
                            key={monthKey}
                            monthKey={monthKey}
                            monthTitle={getMonthTitle(monthKey)}
                            shifts={rawShiftsByMonth[monthKey]}
                            preferences={preferences}
                            onPreferenceUpdate={handlePreferenceChange}
                        />
                    ))}
                </div>
                
                {/* Column 2: Jul - Dec */}
                <div className="space-y-6">
                    {column2Months.map(monthKey => (
                        <MonthTable 
                            key={monthKey}
                            monthTitle={getMonthTitle(monthKey)}
                            shifts={rawShiftsByMonth[monthKey]}
                            preferences={preferences}
                            onPreferenceUpdate={handlePreferenceUpdate}
                        />
                    ))}
                </div>
            </div>


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
                <p>Your unique user ID is: <span className="font-mono text-gray-700">{userId || 'Authenticating...'}</span>.</p>
            </div>
        </div>
    );
}
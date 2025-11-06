import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot } from 'firebase/firestore'; 

// ----------------------------------------------------------------------
// Firebase Config & Global Constants (Refactored for Error Prevention)
// ----------------------------------------------------------------------

const firebaseConfig = (() => {
    // Define fallback *locally* inside the function for maximum scope safety
    // Using simple mock keys to comply with Firebase initialization requirements
    const FALLBACK_CONFIG = {
       apiKey: "AIzaSyB6CvHk5u4jvvO8oXGnf_GTq1RMbwhT-JU",
		authDomain: "attending-schedule-2026.firebaseapp.com",
		projectId: "attending-schedule-2026",
		storageBucket: "attending-schedule-2026.firebasestorage.app",
		messagingSenderId: "777996986623",
		appId: "1:777996986623:web:0a8697cccb63149d9744ca",
		measurementId: "G-TJXCM9P7W2" 
    };

    // Use the environment's config if available and valid
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
        try {
            return JSON.parse(__firebase_config);
        } catch (e) {
            console.error("Error parsing __firebase_config, using fallback.", e);
            return FALLBACK_CONFIG;
        }
    }
    
    // Return the fallback if the environment config is missing
    return FALLBACK_CONFIG;
})();

// Other essential constants
const appId = typeof __app_id !== 'undefined' ? __app_id : "attending-scheduler-v6-paired"; 
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
// DATA: 2026 WEEKEND SHIFTS
// ----------------------------------------------------------------------

const rawShiftsByMonth = {
    // JANUARY 2026 (Kane/Winter/Hightower/Coghill) - ALL weekends are now OPEN for bidding.
    '01': [
        { day: '10', date: '2026-01-10', rni: null, coa: null }, 
        { day: '17-19', date: '2026-01-17', rni: null, coa: null, detail: 'MLK Day' }, 
        { day: '24', date: '2026-01-24', rni: null, coa: null }, 
        { day: '31', date: '2026-01-31', rni: null, coa: null }, 
    ],
    // FEBRUARY 2026 (Philips/Boone/Willis/Stoops/Kabani) - COA OPEN verified by '/'
    '02': [
        { day: '7', date: '2026-02-07', rni: 'Boone', coa: null }, 
        { day: '14', date: '2026-02-14', rni: 'Boone', coa: null }, 
        { day: '21', date: '2026-02-21', rni: 'Willis', coa: null }, 
        { day: '28', date: '2026-02-28', rni: 'Willis', coa: null }, 
    ],
    // MARCH 2026 (Valcarce/Ambal/Arora/Winter) - RNI OPEN verified by '/'
    '03': [
        { day: '7', date: '2026-03-07', rni: 'Ambal', coa: 'Arora', isTaken: true },
        { day: '14', date: '2026-03-14', rni: null, coa: 'Winter' }, 
        { day: '21', date: '2026-03-21', rni: 'Ambal', coa: 'Arora', isTaken: true },
        { day: '28', date: '2026-03-28', rni: null, coa: 'Arora' }, 
    ],
    // APRIL 2026 (Sims/Kane/Black/Yazdi) - April 11 and 25 are fully OPEN
    '04': [
        { day: '4', date: '2026-04-04', rni: 'Sims', coa: null }, // COA OPEN
        { day: '11', date: '2026-04-11', rni: null, coa: null }, // BOTH OPEN
        { day: '18', date: '2026-04-18', rni: 'Sims', coa: null }, // COA OPEN
        { day: '25', date: '2026-04-25', rni: null, coa: null, detail: 'PAS Meeting Coverage' }, // BOTH OPEN
    ],
    // MAY 2026 (Arora/Lal/Kabani/Summerlin) - Memorial Day is OPEN
    '05': [
        { day: '2', date: '2026-05-02', rni: null, coa: null }, // Both OPEN
        { day: '9', date: '2026-05-09', rni: 'Arora', coa: null }, // COA OPEN
        { day: '16', date: '2026-05-16', rni: 'Arora', coa: null }, // COA OPEN
        { day: '23-25', date: '2026-05-23', rni: null, coa: null, detail: 'Memorial Day' }, // BOTH OPEN
        { day: '30', date: '2026-05-30', rni: 'Arora', coa: null }, // COA OPEN
    ],
    // JUNE 2026 (Schuyler/Boone/Philips/Winter) - COA OPEN verified by '/'
    '06': [
        { day: '6', date: '2026-06-06', rni: 'Schuyler', coa: 'Winter', isTaken: true }, // TAKEN
        { day: '13', date: '2026-06-13', rni: 'Boone', coa: null }, // COA OPEN
        { day: '19-21', date: '2026-06-19', rni: 'Schuyler', coa: 'Winter', isTaken: true, detail: 'Juneteenth Day' }, // TAKEN
        { day: '27', date: '2026-06-27', rni: 'Boone', coa: null }, // COA OPEN
    ],
    // JULY 2026 (Jain/Shukla/Willis/Carlo) - RNI OPEN inferred from lack of assignment
    '07': [
        { day: '4-6', date: '2026-07-04', rni: 'Jain', coa: 'Carlo', isTaken: true, detail: '4th of July' }, 
        { day: '11', date: '2026-07-11', rni: null, coa: 'Willis' }, // RNI OPEN
        { day: '18', date: '2026-07-18', rni: null, coa: null }, // BOTH OPEN 
        { day: '25', date: '2026-07-25', rni: 'Shukla', coa: 'Willis', isTaken: true }, // TAKEN
    ],
    // AUGUST 2026 (Boone/Sims/Summerlin/Carlo) - Data confirmed
    '08': [
        { day: '1', date: '2026-08-01', rni: 'Boone', coa: null }, // COA OPEN
        { day: '8', date: '2026-08-08', rni: 'Sims', coa: 'Carlo', isTaken: true }, // TAKEN
        { day: '15', date: '2026-08-15', rni: 'Boone', coa: null }, // COA OPEN
        { day: '22', date: '2026-08-22', rni: 'Sims', coa: null }, // COA OPEN
        { day: '29', date: '2026-08-29', rni: null, coa: 'Carlo' }, // RNI OPEN
    ],
    // SEPTEMBER 2026 (Mackay/Philips/Black/Stoops) - UPDATED based on snippet review
    '09': [
        { day: '5-7', date: '2026-09-05', rni: 'Mackay', coa: null, detail: 'Labor Day' }, // COA OPEN
        { day: '12', date: '2026-09-12', rni: null, coa: null }, // BOTH OPEN
        { day: '19', date: '2026-09-19', rni: null, coa: null }, // BOTH OPEN
        { day: '26', date: '2026-09-26', rni: null, coa: null }, // BOTH OPEN
    ],
    // OCTOBER 2026 (Kandasamy/Travers/Yazdi/Carlo/Bhatia) - Data confirmed
    '10': [
        { day: '3', date: '2026-10-03', rni: 'Kandasamy', coa: 'Carlo', isTaken: true },
        { day: '10', date: '2026-10-10', rni: 'Travers', coa: 'Bhatia', isTaken: true },
        { day: '17', date: '2026-10-17', rni: 'Kandasamy', coa: null }, // COA OPEN
        { day: '24', date: '2026-10-24', rni: 'Travers', coa: 'Bhatia', isTaken: true },
        { day: '31', date: '2026-10-31', rni: 'Kandasamy', coa: 'Carlo', isTaken: true },
    ],
    // NOVEMBER 2026 (Ambal/Bhatia/Hightower/Black) - Corrected: Thanksgiving COA is now OPEN
    '11': [
        { day: '7', date: '2026-11-07', rni: 'Ambal', coa: null }, // COA OPEN
        { day: '14', date: '2026-11-14', rni: 'Bhatia', coa: null }, // COA OPEN
        { day: '21', date: '2026-11-21', rni: 'Ambal', coa: null }, // COA OPEN
        // CORRECTED: COA is now null, isTaken is false (only RNI is assigned)
        { day: '26-28', date: '2026-11-26', rni: 'Bhatia', coa: null, isTaken: false, detail: 'Thanksgiving' }, 
    ],
    // DECEMBER 2026 (Travers/Valcarce/Kabani/Kandasamy) - Data confirmed
    '12': [
        { day: '5', date: '2026-12-05', rni: 'Travers', coa: 'Kandasamy', isTaken: true },
        { day: '12', date: '2026-12-12', rni: null, coa: null }, // BOTH OPEN
        { day: '19', date: '2026-12-19', rni: 'Travers', coa: 'Kandasamy', isTaken: true },
        { day: '24-28', date: '2026-12-24', rni: 'Bhatia', coa: 'Arora', isTaken: true, detail: 'Christmas' }, 
        { day: '31-Jan 4', date: '2026-12-31', rni: 'Kane', coa: 'Kandasamy', isTaken: true, detail: "New Year's Eve" }, 
    ],
};

const getShiftMap = () => {
    let map = {};
    Object.values(rawShiftsByMonth).flat().forEach(s => {
        const isRniOpen = s.rni === null;
        const isCoaOpen = s.coa === null;
        
        map[s.date] = {
            id: s.date,
            day: s.day,
            detail: s.detail,
            rniAttending: s.rni,
            coaAttending: s.coa,
            // A shift is fully taken if it's explicitly marked as taken OR if neither service is open (e.g., both have names)
            isTaken: s.isTaken || (!isRniOpen && !isCoaOpen),
            isRniAvailable: isRniOpen,
            isCoaAvailable: isCoaOpen,
        };
    });
    return map;
};

// ----------------------------------------------------------------------
// SHARED COMPONENTS
// ----------------------------------------------------------------------

const PreferenceSelector = React.memo(({ shiftId, serviceType, currentPref, onUpdate, isAvailable }) => {
    if (!isAvailable) return null; // Do not render selector if the slot is already assigned

    const isSelectedService = currentPref.service === serviceType;
    
    // Options: None (0), Most (1-10), Least (1-10)
    const mostOptions = Array.from({ length: 10 }, (_, i) => ({ 
        label: `Most Pref. #${i + 1}`, 
        value: `most-${i + 1}`, 
    }));
    const leastOptions = Array.from({ length: 10 }, (_, i) => ({ 
        label: `Least Pref. #${i + 1}`, 
        value: `least-${i + 1}`, 
    }));
    
    // Determine the current value string for the select box
    const currentValue = isSelectedService && currentPref.type !== 'none' 
        ? `${currentPref.type}-${currentPref.rank}` 
        : 'none';
    
    // Determine select box styling based on preference type
    let selectClass = `
        w-full text-[10px] p-0.5 rounded-md border shadow-sm h-[30px]
        transition-all duration-150 ease-in-out cursor-pointer appearance-none
        focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500
        text-center
    `;

    if (currentPref.type === 'most' && isSelectedService) {
        selectClass += ' bg-emerald-100 border-emerald-500 text-emerald-800 font-semibold';
    } else if (currentPref.type === 'least' && isSelectedService) {
        selectClass += ' bg-rose-100 border-rose-500 text-rose-800 font-semibold';
    } else {
        selectClass += ' bg-gray-50 border-gray-300 text-gray-700 hover:bg-white';
    }


    const handleChange = (e) => {
        const value = e.target.value;
        const [type, rankStr] = value.split('-');
        
        // Pass the shiftId, the service, the type ('most'/'least'/'none'), and the rank
        onUpdate(shiftId, serviceType, type || 'none', rankStr ? parseInt(rankStr, 10) : 0);
    };

    return (
        <select
            value={currentValue}
            onChange={handleChange}
            className={selectClass}
        >
            <option value="none" disabled={currentValue !== 'none'}>
                {serviceType}: {currentValue !== 'none' ? `${serviceType} Ranked ${currentPref.rank}` : 'Select Rank'}
            </option>
            <option value="none">
                -- Clear Rank --
            </option>
            <optgroup label="Most Preferred (1-10)">
                {mostOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </optgroup>
            <optgroup label="Least Preferred (1-10)">
                {leastOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </optgroup>
        </select>
    );
});


const MonthTable = React.memo(({ monthKey, monthTitle, shifts, preferences, onPreferenceUpdate }) => {
    
    // Helper to get Attending text for the table cell
    const getAttendingText = (attending, service) => {
        if (attending) return attending;
        return `${service} OPEN`;
    }

    return (
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200">
            <h2 className="bg-yellow-400 text-gray-800 text-md sm:text-lg font-extrabold p-3 text-center border-b-2 border-yellow-500">
                {monthTitle}
            </h2>
            <div className="p-2 sm:p-4 space-y-4">
                {shifts.map((shift, index) => {
                    const shiftId = shift.date;
                    // Get the preference for this specific shift ID
                    const pref = preferences[shiftId] || { service: SERVICES.NONE, type: SERVICES.NONE, rank: 0 };
                    
                    const isRniOpen = shift.isRniAvailable;
                    const isCoaOpen = shift.isCoaAvailable;
                    const isFullyAssigned = shift.isTaken;

                    // Determine visual styles for the shift container
                    let shiftClass = 'p-3 rounded-lg border-2 transition-all duration-200';
                    
                    if (pref.type === 'most') {
                        shiftClass += " bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300";
                    } else if (pref.type === 'least') {
                        shiftClass += " bg-rose-50 border-rose-500 ring-2 ring-rose-300";
                    } else if (isFullyAssigned) {
                         shiftClass += " bg-gray-100 border-gray-300 opacity-70"; 
                    } else {
                         shiftClass += " bg-white border-gray-200 hover:border-blue-400";
                    }
                    
                    const rniText = getAttendingText(shift.rniAttending, SERVICES.RNI);
                    const coaText = getAttendingText(shift.coaAttending, SERVICES.COA);
                    
                    return (
                        <div key={shiftId} className={shiftClass}>
                            {/* Date & Holiday */}
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xl font-bold text-gray-900">{shift.day}</span>
                                {shift.detail && (
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                        {shift.detail}
                                    </span>
                                )}
                            </div>
                            
                            {/* Attending Status */}
                            <div className="mb-3 text-sm font-mono space-y-1">
                                <div className={`px-2 py-1 rounded-md ${isRniOpen ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'}`}>
                                    <span className="font-bold">RNI:</span> {rniText}
                                </div>
                                <div className={`px-2 py-1 rounded-md ${isCoaOpen ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-200 text-gray-700'}`}>
                                    <span className="font-bold">COA:</span> {coaText}
                                </div>
                            </div>
                            
                            {/* Preference Dropdown Column */}
                            <div className="space-y-1 mt-3">
                                {isFullyAssigned ? (
                                    <div className="text-xs font-bold text-red-700 py-2 px-2 bg-red-100 rounded-md text-center shadow-inner">
                                        FULLY ASSIGNED - NO RANKING AVAILABLE
                                    </div>
                                ) : (
                                    <>
                                        {/* RNI Selector - Only if RNI slot is available */}
                                        <PreferenceSelector
                                            shiftId={shiftId}
                                            serviceType={SERVICES.RNI}
                                            currentPref={pref.service === SERVICES.RNI ? pref : { service: SERVICES.NONE, type: SERVICES.NONE, rank: 0 }}
                                            onUpdate={onPreferenceUpdate}
                                            isAvailable={isRniOpen}
                                        />
                                        {/* COA Selector - Only if COA slot is available */}
                                        <PreferenceSelector
                                            shiftId={shiftId}
                                            serviceType={SERVICES.COA}
                                            currentPref={pref.service === SERVICES.COA ? pref : { service: SERVICES.NONE, type: SERVICES.NONE, rank: 0 }}
                                            onUpdate={onPreferenceUpdate}
                                            isAvailable={isCoaOpen}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
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
                setPreferences(data.preferences || {});
                setLoadingMessage("Preferences loaded.");
            } else {
                // Initialize a base preferences object for all rankable slots
                const initialPrefs = Object.values(shiftMap).reduce((acc, shift) => {
                     if (shift.isRniAvailable || shift.isCoaAvailable) {
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
    const handlePreferenceChange = useCallback((shiftId, serviceType, type, rank) => {
        setPreferences(prevPreferences => {
            const newPreferences = { ...prevPreferences };
            
            // Validate against duplicate ranks across all active selections
            if (type !== 'none' && rank > 0) {
                const isRankUsed = Object.entries(newPreferences).some(([id, pref]) => {
                    // Check if another shift (id !== shiftId) or the other service on this shift (pref.service !== serviceType)
                    // has the same type and rank
                    return (id !== shiftId || pref.service !== serviceType) && 
                           pref.type === type && 
                           pref.rank === rank &&
                           pref.service !== SERVICES.NONE;
                });
                
                if (isRankUsed) {
                    setSubmitStatus(`Error: Rank #${rank} in the ${type.toUpperCase()} category is already selected for another shift/service. Please choose a different rank or clear the existing one.`);
                    return prevPreferences; 
                }
            }
            
            const currentShiftPref = newPreferences[shiftId] || { service: SERVICES.NONE, type: SERVICES.NONE, rank: 0 };
            
            if (type !== 'none') {
                // Set the new preference
                newPreferences[shiftId] = { service: serviceType, type, rank };
            } else {
                // Clear the rank for the specific service, but only if it's the currently ranked service
                if (currentShiftPref.service === serviceType) {
                    newPreferences[shiftId] = { service: SERVICES.NONE, type: SERVICES.NONE, rank: 0 };
                }
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
        
        // Check for total rank limits (must be between 1 and 10 for each category)
        if (most.length > 10) {
            isValid = false;
            validationMessage = `You have selected ${most.length} 'Most Preferred' slots. You can only select up to 10.`;
        }
        if (least.length > 10) {
            isValid = false;
            validationMessage = `You have selected ${least.length} 'Least Preferred' slots. You can only select up to 10.`;
        }
        
        // Check for unique ranks across ALL selected preferences
        const allRanks = activePreferences.map(p => `${p.type}-${p.rank}`);
        if (allRanks.length !== new Set(allRanks).size) {
            isValid = false;
            validationMessage = "All ranks (Most #1-10, Least #1-10) must be unique across all shifts and services.";
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


    // --- RENDER HELPERS ---
    const monthOrder = Object.keys(rawShiftsByMonth);

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
        return `${monthMap[monthKey] || 'TBD'} ${YEAR}`;
    };


    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto font-sans bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-extrabold text-gray-800 mb-2">2026 Attending Weekend Preference System</h1>
            <p className="text-sm text-gray-600 mb-4">
                Paired Calendar View | **Total Rankable Slots**: <span className="font-semibold text-blue-700">{availableShiftsCount}</span>
            </p>
            
            {/* --- Status & Auth Info --- */}
            <div className="mb-6 p-3 bg-indigo-50 border-l-4 border-indigo-400 rounded-lg">
                <p className={`text-sm font-medium ${loadingMessage.includes('Error') ? 'text-red-600' : 'text-indigo-800'}`}>
                    Database Status: {loadingMessage}
                </p>
                <p className="text-xs text-indigo-700 mt-1">
                    Your User ID: <span className="font-mono text-xs">{userId || 'Authenticating...'}</span>
                </p>
            </div>

            {/* --- Count & Instructions Bar --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 p-4 bg-white shadow-xl rounded-xl border border-gray-200">
                <div className="text-sm text-gray-700 sm:mr-4 mb-4 sm:mb-0">
                    **Instructions:** For **OPEN** slots, use the dropdowns to select a rank. You must choose **unique** ranks from #1 to #10 for both the Most and Least Preferred categories.
                </div>
                <div className="flex-shrink-0 flex flex-wrap space-x-2 space-y-2 sm:space-y-0">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold 
                        ${counts.mostCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        Most Pref. Selected: {counts.mostCount} / 10
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold 
                        ${counts.leastCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        Least Pref. Selected: {counts.leastCount} / 10
                    </span>
                </div>
            </div>
            
            {/* --- PAIRED TABULAR VIEW (2 COLUMNS) --- */}
            <div className="space-y-6">
                {/* Iterate over months, taking two at a time */}
                {monthOrder.map((_, index) => {
                    if (index % 2 === 0) {
                        const month1Key = monthOrder[index];
                        const month2Key = monthOrder[index + 1];
                        
                        return (
                            // Responsive grid: 1 column on small screens, 2 columns on medium/large screens
                            <div key={month1Key} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <MonthTable 
                                    monthKey={month1Key}
                                    monthTitle={getMonthTitle(month1Key)}
                                    shifts={rawShiftsByMonth[month1Key]}
                                    preferences={preferences}
                                    onPreferenceUpdate={handlePreferenceChange}
                                />
                                
                                {month2Key && (
                                    <MonthTable 
                                        monthKey={month2Key}
                                        monthTitle={getMonthTitle(month2Key)}
                                        shifts={rawShiftsByMonth[month2Key]}
                                        preferences={preferences}
                                        onPreferenceUpdate={handlePreferenceChange}
                                    />
                                )}
                            </div>
                        );
                    }
                    return null;
                })}
            </div>


            {/* --- Submit Button & Status --- */}
            <div className="mt-12 flex flex-col items-center">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !counts.isValid}
                    className={`
                        py-3 px-10 text-xl font-bold rounded-xl shadow-lg transition-all duration-300
                        ${counts.isValid && !isSubmitting
                            ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-2xl'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }
                    `}
                >
                    {isSubmitting ? 'Saving...' : 'Submit Final Preferences'}
                </button>
                {submitStatus && (
                    <p className={`mt-3 text-sm font-medium text-center ${submitStatus.includes('Error') || submitStatus.includes('Blocked') ? 'text-red-600' : 'text-green-600'}`}>
                        {submitStatus}
                    </p>
                )}
                {!counts.isValid && (
                    <p className="mt-3 text-sm font-medium text-center text-red-600">
                        **Validation Error:** {counts.validationMessage}
                    </p>
                )}
            </div>
        </div>
    );
}
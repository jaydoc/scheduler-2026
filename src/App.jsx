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
const appId = typeof __app_id !== 'undefined' ? __app_id : "attending-scheduler-v6-final"; 
const SERVICES = { 'RNI': 'RNI', 'COA': 'COA' };
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const YEAR = 2026;

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
// DATA PROCESSING
// ----------------------------------------------------------------------

const rawShiftsData = [
    // Data extracted from the 2026 Attending Weekend Schedule document (36 shifts total, Jan-Sept).
    // Note: The structure implies all these dates are shift dates, even if covered by multiple people or holidays.
    // Assignments are interpreted as: RNI Attending / COA Attending / Other Details
    // JANUARY 2026 (4 shifts)
    { date: '2026-01-10', service: SERVICES.RNI, assigned: 'RNI/BPD/COA QB-H' }, // Saturday
    { date: '2026-01-17', service: SERVICES.COA, assigned: 'MLK Day' }, // Saturday
    { date: '2026-01-24', service: SERVICES.RNI, assigned: 'Kane/Winter/Hightower/Coghill' }, // Saturday
    { date: '2026-01-31', service: SERVICES.COA, assigned: 'Kane/Winter/Hightower/Coghill' }, // Saturday

    // FEBRUARY 2026 (4 shifts)
    { date: '2026-02-07', service: SERVICES.COA, assigned: 'Boone' }, // Saturday
    { date: '2026-02-14', service: SERVICES.RNI, assigned: 'Boone' }, // Saturday
    { date: '2026-02-21', service: SERVICES.COA, assigned: 'Willis' }, // Saturday
    { date: '2026-02-28', service: SERVICES.RNI, assigned: 'Willis' }, // Saturday

    // MARCH 2026 (4 shifts)
    { date: '2026-03-07', service: SERVICES.RNI, assigned: 'Ambal/Arora' }, // Saturday
    { date: '2026-03-14', service: SERVICES.COA, assigned: 'Winter' }, // Saturday
    { date: '2026-03-21', service: SERVICES.RNI, assigned: 'Ambal/Arora' }, // Saturday
    { date: '2026-03-28', service: SERVICES.COA, assigned: 'Arora' }, // Saturday

    // APRIL 2026 (4 shifts)
    { date: '2026-04-04', service: SERVICES.COA, assigned: 'Sims' }, // Saturday
    { date: '2026-04-11', service: SERVICES.RNI, assigned: 'Sims/Kane/Black/Yazdi' }, // Saturday
    { date: '2026-04-18', service: SERVICES.COA, assigned: 'Sims' }, // Saturday
    { date: '2026-04-25', service: SERVICES.RNI, assigned: 'PAS' }, // Saturday
    
    // MAY 2026 (4 shifts)
    { date: '2026-05-02', service: SERVICES.RNI, assigned: 'Arora/Lal/Kabani/Summerlin' }, // Saturday
    { date: '2026-05-09', service: SERVICES.COA, assigned: 'Arora' }, // Saturday
    { date: '2026-05-16', service: SERVICES.RNI, assigned: 'Arora' }, // Saturday
    { date: '2026-05-23', service: SERVICES.COA, assigned: 'Memorial Day' }, // Saturday

    // JUNE 2026 (4 shifts)
    { date: '2026-06-06', service: SERVICES.RNI, assigned: 'Schuyler/Winter' }, // Saturday
    { date: '2026-06-13', service: SERVICES.COA, assigned: 'Boone' }, // Saturday
    { date: '2026-06-19', service: SERVICES.RNI, assigned: 'Juneteenth Day' }, // Friday (Keeping original shift data)
    { date: '2026-06-27', service: SERVICES.COA, assigned: 'Boone' }, // Saturday
    
    // JULY 2026 (4 shifts)
    { date: '2026-07-04', service: SERVICES.RNI, assigned: '4th of July' }, // Saturday
    { date: '2026-07-11', service: SERVICES.COA, assigned: 'Willis' }, // Saturday
    { date: '2026-07-18', service: SERVICES.RNI, assigned: 'Jain/Shukla/Willis/Carlo' }, // Saturday
    { date: '2026-07-25', service: SERVICES.COA, assigned: 'Shukla/Willis' }, // Saturday

    // AUGUST 2026 (4 shifts)
    { date: '2026-08-01', service: SERVICES.COA, assigned: 'Boone' }, // Saturday
    { date: '2026-08-08', service: SERVICES.RNI, assigned: 'Sims/Carlo' }, // Saturday
    { date: '2026-08-15', service: SERVICES.COA, assigned: 'Boone' }, // Saturday
    { date: '2026-08-22', service: SERVICES.RNI, assigned: 'Sims' }, // Saturday

    // SEPTEMBER 2026 (4 shifts)
    { date: '2026-09-05', service: SERVICES.RNI, assigned: 'Labor Day' }, // Saturday
    { date: '2026-09-12', service: SERVICES.COA, assigned: 'Mackay/Philips/Black/Stoops' }, // Saturday
    { date: '2026-09-19', service: SERVICES.RNI, assigned: 'Mackay/Philips/Black/Stoops' }, // Saturday
    { date: '2026-09-26', service: SERVICES.COA, assigned: 'Mackay/Philips/Black/Stoops' }, // Saturday
    
    // --- Add Oct-Dec Placeholder Shifts (Assuming 4 shifts per month) ---
    // Note: If you provide the actual Oct-Dec 2026 data, replace these placeholders.
    // Example Placeholder Dates (Saturdays in October 2026)
    { date: '2026-10-03', service: SERVICES.RNI, assigned: 'TBD' }, 
    { date: '2026-10-10', service: SERVICES.COA, assigned: 'TBD' },
    { date: '2026-10-17', service: SERVICES.RNI, assigned: 'TBD' },
    { date: '2026-10-24', service: SERVICES.COA, assigned: 'Halloween Week' },
    
    // Example Placeholder Dates (Saturdays in November 2026)
    { date: '2026-11-07', service: SERVICES.RNI, assigned: 'TBD' }, 
    { date: '2026-11-14', service: SERVICES.COA, assigned: 'TBD' },
    { date: '2026-11-21', service: SERVICES.RNI, assigned: 'Thanksgiving Week' },
    { date: '2026-11-28', service: SERVICES.COA, assigned: 'TBD' },

    // Example Placeholder Dates (Saturdays in December 2026)
    { date: '2026-12-05', service: SERVICES.RNI, assigned: 'TBD' }, 
    { date: '2026-12-12', service: SERVICES.COA, assigned: 'TBD' },
    { date: '2026-12-19', service: SERVICES.RNI, assigned: 'TBD' },
    { date: '2026-12-26', service: SERVICES.COA, assigned: 'Christmas Week' },
];

const getWeekendShiftsData = () => {
    return rawShiftsData.reduce((acc, s) => {
        const dateKey = s.date;
        const dateParts = s.date.split('-');
        const monthName = MONTH_NAMES[parseInt(dateParts[1], 10) - 1];
        
        // Parsing Assignment Details based on user instruction: RNI / COA / Other Details
        const assignments = s.assigned.split('/');
        const rniAttending = assignments[0]?.trim() || null;
        const coaAttending = assignments[1]?.trim() || null;
        
        // A shift is 'FILLED' if a single attending is named for both RNI and COA (or a single name if the service matches)
        const isTaken = rniAttending !== 'TBD' && !s.assigned.includes('Day') && !s.assigned.includes('TBD') && s.assigned.split('/').length <= 2;

        acc[dateKey] = {
            id: dateKey, 
            month: monthName,
            day: parseInt(dateParts[2], 10),
            service: s.service, // The core service type for this date
            rniAttending: rniAttending,
            coaAttending: coaAttending,
            detail: s.assigned,
            isTaken: isTaken,
        };
        return acc;
    }, {});
};

// Utility to generate the full calendar structure for a month
const generateFullCalendar = (year, monthIndex, shiftMap) => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstDay = new Date(year, monthIndex, 1).getDay(); // 0 = Sunday

    const calendar = [];
    
    // Add spacer cells for the start of the month
    for (let i = 0; i < firstDay; i++) {
        calendar.push({ type: 'spacer', id: `spacer-${monthIndex}-${i}` });
    }

    // Add days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const shift = shiftMap[dateString];
        const dayOfWeek = new Date(year, monthIndex, day).getDay(); // 0=Sunday, 6=Saturday
        
        calendar.push({
            type: 'day',
            day: day,
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
            dateString: dateString,
            shift: shift,
        });
    }

    // Add trailing spacer cells if necessary (optional for grid consistency)
    const totalCells = calendar.length;
    const remainingCells = totalCells % 7;
    if (remainingCells !== 0) {
        for (let i = 0; i < (7 - remainingCells); i++) {
            calendar.push({ type: 'spacer', id: `end-spacer-${monthIndex}-${i}` });
        }
    }

    return calendar;
};


// ----------------------------------------------------------------------
// SHARED COMPONENTS
// ----------------------------------------------------------------------

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
                mt-1 w-full text-[10px] p-0.5 rounded-lg border shadow-sm
                transition-all duration-150 ease-in-out cursor-pointer
                ${currentType === 'most' ? 'bg-emerald-100 border-emerald-500 text-emerald-800 font-semibold' : ''}
                ${currentType === 'least' ? 'bg-rose-100 border-rose-500 text-rose-800 font-semibold' : ''}
                ${currentType === 'none' ? 'bg-white border-gray-300 text-gray-700' : ''}
                focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500
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


const CalendarMonth = React.memo(({ monthIndex, preferences, onPreferenceUpdate, shiftMap, allShifts }) => {
    const monthName = MONTH_NAMES[monthIndex];
    const calendarDays = useMemo(() => generateFullCalendar(YEAR, monthIndex, shiftMap), [monthIndex, shiftMap]);

    return (
        <div className="mb-10 shadow-xl rounded-xl overflow-hidden bg-white border border-gray-200">
            <h3 className="text-2xl font-extrabold text-gray-700 p-4 bg-indigo-50 border-b-2 border-indigo-200">
                {monthName} {YEAR}
            </h3>
            
            <div className="grid grid-cols-7 text-center font-bold text-sm text-gray-600 bg-gray-100 border-b">
                {DAY_NAMES.map(day => (
                    <div key={day} className="p-2 border-r last:border-r-0">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-fr">
                {calendarDays.map((cell) => {
                    if (cell.type === 'spacer') {
                        return <div key={cell.id} className="min-h-[120px] bg-gray-50 border-r border-b"></div>;
                    }

                    const shift = cell.shift;
                    const isShiftDay = !!shift;
                    
                    const currentPref = preferences[cell.dateString] || { type: 'none', rank: 0 };
                    
                    // Base styling
                    let cellClasses = "p-1 min-h-[120px] border-r border-b relative group transition-all duration-150";

                    if (cell.isWeekend) {
                        cellClasses += " bg-indigo-50 hover:bg-indigo-100";
                    } else {
                        cellClasses += " bg-white hover:bg-gray-50";
                    }
                    
                    if (isShiftDay) {
                         // Apply preference coloring only to shift days
                        if (currentPref.type === 'most') {
                            cellClasses += " !bg-emerald-100 ring-2 ring-emerald-500 z-10";
                        } else if (currentPref.type === 'least') {
                            cellClasses += " !bg-rose-100 ring-2 ring-rose-500 z-10";
                        } else if (shift.isTaken) {
                            cellClasses += " !bg-red-50 opacity-75"; // Highlight filled shifts lightly
                        }
                    }

                    return (
                        <div key={cell.dateString} className={cellClasses}>
                            <div className="absolute top-1 left-2 text-lg font-extrabold text-gray-800">
                                {cell.day}
                            </div>
                            
                            {isShiftDay && (
                                <div className="mt-6 flex flex-col h-full">
                                    <div className="flex-grow space-y-0.5 px-0.5">
                                        {/* RNI Assignment (First Name) */}
                                        <p className="text-[11px] font-semibold text-blue-700 bg-blue-100 rounded-md px-1 leading-tight">
                                            RNI: {shift.rniAttending || 'TBD'}
                                        </p>
                                        
                                        {/* COA Assignment (Second Name) */}
                                        {shift.coaAttending && (
                                            <p className="text-[11px] font-semibold text-purple-700 bg-purple-100 rounded-md px-1 leading-tight">
                                                COA: {shift.coaAttending}
                                            </p>
                                        )}
                                        
                                        {/* If a complex detail or holiday */}
                                        {shift.detail && shift.detail.includes('Day') && (
                                            <p className="text-[10px] italic text-orange-700 font-semibold">
                                                {shift.detail}
                                            </p>
                                        )}
                                    </div>

                                    {/* Preference Dropdown */}
                                    <div className="mt-1">
                                        <PreferenceDropdown
                                            shiftId={shift.id}
                                            currentType={currentPref.type}
                                            currentRank={currentPref.rank}
                                            onUpdate={onPreferenceUpdate}
                                            isTaken={shift.isTaken}
                                        />
                                    </div>
                                </div>
                            )}
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
    
    const [shiftMap] = useState(getWeekendShiftsData); 
    const [preferences, setPreferences] = useState({});
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState('');
    
    const allShifts = useMemo(() => Object.values(shiftMap), [shiftMap]);
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
            
            // Validation check for duplicate ranks
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
        <div className="p-4 sm:p-6 max-w-7xl mx-auto font-sans bg-gray-50 min-h-screen">
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
                    **Instructions:** Rank your **Top 10 Most Preferred** and **Top 10 Least Preferred** shifts using the dropdowns on the available dates. All ranks (1-10) must be unique within their respective category.
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
            <div className="space-y-10">
                {Array.from({ length: 12 }).map((_, monthIndex) => (
                    <CalendarMonth 
                        key={monthIndex}
                        monthIndex={monthIndex}
                        preferences={preferences}
                        onPreferenceUpdate={handlePreferenceChange}
                        shiftMap={shiftMap}
                        allShifts={allShifts}
                    />
                ))}
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
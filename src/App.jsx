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
const appId = typeof __app_id !== 'undefined' ? __app_id : "attending-scheduler-v6-tabular"; 
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
// DATA PROCESSING (Based EXACTLY on the uploaded Word/Image document)
// ----------------------------------------------------------------------

// Structure the data to match the display layout: Grouped by Month for easy rendering.
const rawShiftsByMonth = {
    // RNI Attending is listed first (if a single name is present before a slash or no slash)
    // COA Attending is listed second (if present after a slash)
    // Multiple names, holidays, or complex codes are handled as 'detail'
    
    // JANUARY (Kane/Winter/Hightower/Coghill)
    '01': [
        { day: '10', date: '2026-01-10', detail: 'Kane/Winter/Hightower/Coghill', rni: 'Kane', coa: 'Winter' },
        { day: '17-19', date: '2026-01-17', detail: 'MLK Day', rni: 'MLK Day', coa: null, isTaken: true }, // Holiday - assumed covered
        { day: '24', date: '2026-01-24', detail: 'Kane/Winter/Hightower/Coghill', rni: 'Hightower', coa: 'Coghill' },
        { day: '31', date: '2026-01-31', detail: 'Kane/Winter/Hightower/Coghill', rni: 'Kane', coa: 'Winter' },
    ],
    // FEBRUARY (Philips/Boone/Willis/Stoops/Kabani)
    '02': [
        { day: '7', date: '2026-02-07', detail: 'Boone/', rni: 'Boone', coa: null },
        { day: '14', date: '2026-02-14', detail: 'Boone/', rni: 'Boone', coa: null },
        { day: '21', date: '2026-02-21', detail: 'Willis/', rni: 'Willis', coa: null },
        { day: '28', date: '2026-02-28', detail: 'Willis/', rni: 'Willis', coa: null },
    ],
    // MARCH (Valcarce/Ambal/Arora/Winter)
    '03': [
        { day: '7', date: '2026-03-07', detail: 'Ambal/Arora', rni: 'Ambal', coa: 'Arora' },
        { day: '14', date: '2026-03-14', detail: '/Winter', rni: null, coa: 'Winter' },
        { day: '21', date: '2026-03-21', detail: 'Ambal/Arora', rni: 'Ambal', coa: 'Arora' },
        { day: '28', date: '2026-03-28', detail: '/Arora', rni: null, coa: 'Arora' },
    ],
    // APRIL (Sims/Kane/Black/Yazdi)
    '04': [
        { day: '4', date: '2026-04-04', detail: 'Sims', rni: 'Sims', coa: null },
        { day: '11', date: '2026-04-11', detail: 'Sims/Kane/Black/Yazdi', rni: 'Kane', coa: 'Black' }, // Complex assignments interpreted
        { day: '18', date: '2026-04-18', detail: 'Sims', rni: 'Sims', coa: null },
        { day: '25', date: '2026-04-25', detail: '(PAS)', rni: 'PAS', coa: null }, // PAS is a detail, assume taken for now
    ],
    // MAY (Arora/Lal/Kabani/Summerlin)
    '05': [
        { day: '2', date: '2026-05-02', detail: 'Arora/Lal/Kabani/Summerlin', rni: 'Arora', coa: 'Lal' },
        { day: '9', date: '2026-05-09', detail: 'Arora', rni: 'Arora', coa: null },
        { day: '16', date: '2026-05-16', detail: 'Arora', rni: 'Arora', coa: null },
        { day: '23-25', date: '2026-05-23', detail: 'Memorial Day', rni: 'Memorial Day', coa: null, isTaken: true }, // Holiday - assumed covered
        { day: '30', date: '2026-05-30', detail: 'Arora', rni: 'Arora', coa: null },
    ],
    // JUNE (Schuyler/Boone/Philips/Winter)
    '06': [
        { day: '6', date: '2026-06-06', detail: 'Schuyler/Winter', rni: 'Schuyler', coa: 'Winter' },
        { day: '13', date: '2026-06-13', detail: 'Boone/', rni: 'Boone', coa: null },
        { day: '19-21', date: '2026-06-19', detail: 'Juneteenth Day Schuyler/Winter', rni: 'Juneteenth Day', coa: null, isTaken: true }, // Holiday - assumed covered
        { day: '27', date: '2026-06-27', detail: 'Boone', rni: 'Boone', coa: null },
    ],
    // JULY (Jain/Shukla/Willis/Carlo)
    '07': [
        { day: '4-6', date: '2026-07-04', detail: '4th of July Jain/Carlo', rni: 'Jain', coa: 'Carlo', isTaken: true }, // Holiday - assumed covered
        { day: '11', date: '2026-07-11', detail: '/Willis', rni: null, coa: 'Willis' },
        { day: '18', date: '2026-07-18', detail: 'Jain/Shukla/Willis/Carlo', rni: 'Shukla', coa: 'Willis' }, // Complex assignments interpreted
        { day: '25', date: '2026-07-25', detail: 'Shukla/Willis', rni: 'Shukla', coa: 'Willis' },
    ],
    // AUGUST (Boone/Sims/Summerlin/Carlo)
    '08': [
        { day: '1', date: '2026-08-01', detail: 'Boone/', rni: 'Boone', coa: null },
        { day: '8', date: '2026-08-08', detail: 'Sims/Carlo', rni: 'Sims', coa: 'Carlo' },
        { day: '15', date: '2026-08-15', detail: 'Boone/', rni: 'Boone', coa: null },
        { day: '22', date: '2026-08-22', detail: 'Sims/', rni: 'Sims', coa: null },
        { day: '29', date: '2026-08-29', detail: '/Carlo', rni: null, coa: 'Carlo' },
    ],
    // SEPTEMBER (Mackay/Philips/Black/Stoops)
    '09': [
        { day: '5-7', date: '2026-09-05', detail: 'Labor Day Mackay/', rni: 'Mackay', coa: null, isTaken: true }, // Holiday - assumed covered
        { day: '12', date: '2026-09-12', detail: 'Mackay/Philips/Black/Stoops', rni: 'Philips', coa: 'Black' }, // Complex assignments interpreted
        { day: '19', date: '2026-09-19', detail: 'Mackay/Philips/Black/Stoops', rni: 'Stoops', coa: 'Mackay' }, // Complex assignments interpreted
        { day: '26', date: '2026-09-26', detail: 'Mackay/Philips/Black/Stoops', rni: 'Philips', coa: 'Black' }, // Complex assignments interpreted
    ],
    // OCTOBER (Kandasamy/Travers/Yazdi/Carlo/Bhatia)
    '10': [
        { day: '3', date: '2026-10-03', detail: 'Kandasamy/Carlo', rni: 'Kandasamy', coa: 'Carlo' },
        { day: '10', date: '2026-10-10', detail: 'Travers/Bhatia', rni: 'Travers', coa: 'Bhatia' },
        { day: '17', date: '2026-10-17', detail: 'Kandasamy/', rni: 'Kandasamy', coa: null },
        { day: '24', date: '2026-10-24', detail: 'Travers/Bhatia', rni: 'Travers', coa: 'Bhatia' },
        { day: '31', date: '2026-10-31', detail: 'Kandasamy/Carlo', rni: 'Kandasamy', coa: 'Carlo' },
    ],
    // NOVEMBER (Ambal/Bhatia/Hightower/Black)
    '11': [
        { day: '7', date: '2026-11-07', detail: 'Ambal/', rni: 'Ambal', coa: null },
        { day: '14', date: '2026-11-14', detail: 'Bhatia', rni: 'Bhatia', coa: null },
        { day: '21', date: '2026-11-21', detail: 'Ambal/', rni: 'Ambal', coa: null },
        { day: '26-28', date: '2026-11-26', detail: 'Thanksgiving Bhatia/', rni: 'Bhatia', coa: null, isTaken: true }, // Holiday - assumed covered
    ],
    // DECEMBER (Travers/Valcarce/Kabani/Kandasamy)
    '12': [
        { day: '5', date: '2026-12-05', detail: 'Travers/Kandasamy', rni: 'Travers', coa: 'Kandasamy' },
        { day: '12', date: '2026-12-12', detail: 'Travers/Valcarce/Kabani/Kandasamy', rni: 'Kabani', coa: 'Valcarce' }, // Complex assignments interpreted
        { day: '19', date: '2026-12-19', detail: 'Travers/Kandasamy', rni: 'Travers', coa: 'Kandasamy' },
        { day: '24-28', date: '2026-12-24', detail: 'Christmas Bhatia/Arora', rni: 'Bhatia', coa: 'Arora', isTaken: true }, // Holiday - assumed covered
        { day: '31-Jan 4', date: '2026-12-31', detail: 'New Year Kane/Kandasamy', rni: 'Kane', coa: 'Kandasamy', isTaken: true }, // Holiday - assumed covered
    ],
};

const getShiftMap = () => {
    let map = {};
    Object.values(rawShiftsByMonth).flat().forEach(s => {
        // Ensure the shift ID is the date string
        map[s.date] = {
            id: s.date,
            day: s.day,
            detail: s.detail,
            rniAttending: s.rni,
            coaAttending: s.coa,
            isTaken: s.isTaken || s.detail.toLowerCase().includes('day') || s.detail.toLowerCase().includes('pas'),
        };
    });
    return map;
};

// ----------------------------------------------------------------------
// SHARED COMPONENTS
// ----------------------------------------------------------------------

const PreferenceDropdown = React.memo(({ shiftId, currentType, currentRank, onUpdate, isTaken }) => {
    if (isTaken) {
        return (
            <div className="text-xs font-bold text-red-600 py-1 px-2 bg-red-100 rounded-md text-center shadow-inner">
                FILLED
            </div>
        );
    }
    
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
                w-full text-[10px] p-0.5 rounded-md border shadow-sm h-[30px]
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
                    const currentPref = preferences[shift.date] || { type: 'none', rank: 0 };
                    let rowClass = index % 2 === 0 ? 'bg-gray-50' : 'bg-white';

                    if (currentPref.type === 'most') {
                        rowClass += " !bg-emerald-100 ring-2 ring-emerald-300";
                    } else if (currentPref.type === 'least') {
                        rowClass += " !bg-rose-100 ring-2 ring-rose-300";
                    } else if (shift.isTaken) {
                         rowClass += " opacity-75"; // Subtle opacity for filled shifts
                    }

                    const assignmentText = `${shift.rniAttending || ''}${shift.coaAttending ? ' / ' + shift.coaAttending : ''}`;

                    return (
                        <tr key={shift.date} className={`border border-gray-300 ${rowClass}`}>
                            {/* Date Column */}
                            <td className="w-1/4 p-2 font-semibold text-lg border-r border-gray-300 text-center">
                                {shift.day}
                            </td>
                            {/* Attending/Assignment Column */}
                            <td className="w-1/2 p-2 text-sm">
                                <span className={`font-bold ${shift.isTaken ? 'text-red-700' : 'text-gray-800'}`}>
                                    {assignmentText || shift.detail}
                                </span>
                                
                                {/* Show detail only if different from parsed assignment */}
                                {shift.detail && (shift.detail.includes('Day') || shift.detail.includes('Year')) && (
                                    <span className="ml-2 text-xs italic text-orange-600">
                                        ({shift.detail.split(' ')[0]})
                                    </span>
                                )}
                            </td>
                            {/* Preference Dropdown Column */}
                            <td className="w-1/4 p-1">
                                <PreferenceDropdown
                                    shiftId={shift.date}
                                    currentType={currentPref.type}
                                    currentRank={currentPref.rank}
                                    onUpdate={onPreferenceUpdate}
                                    isTaken={shift.isTaken}
                                />
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
    
    const [shiftMap] = useState(getShiftMap); 
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
                Tabular View (Matches Word Document Layout) | **Available Shifts to Rank**: <span className="font-semibold text-blue-700">{availableShiftsCount}</span>
            </p>
            
            <p className={`text-sm font-medium ${loadingMessage.includes('Error') ? 'text-red-600' : 'text-green-600'} mb-6`}>
                Database Status: {loadingMessage}
            </p>

            {/* --- Count & Instructions Bar --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 p-4 bg-white shadow-lg rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600 sm:mr-4 mb-4 sm:mb-0">
                    **Instructions:** Rank your **Top 10 Most Preferred** and **Top 10 Least Preferred** shifts. All ranks (1-10) must be unique within their respective category. The **RNI** attending is listed first, followed by the **COA** attending.
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
                            monthKey={monthKey}
                            monthTitle={getMonthTitle(monthKey)}
                            shifts={rawShiftsByMonth[monthKey]}
                            preferences={preferences}
                            onPreferenceUpdate={handlePreferenceChange}
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
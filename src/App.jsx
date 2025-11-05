import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
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

// 2. CHOOSE A UNIQUE NAME FOR YOUR APPLICATION
const APP_ID = "attending-scheduler-v1"; // <-- You can leave this as is, or change it

// ----------------------------------------------------------------------
// --- GLOBAL VARIABLES (Now using YOUR configuration) ---
// ----------------------------------------------------------------------
const firebaseConfig = YOUR_FIREBASE_CONFIG;
const appId = APP_ID; 

// The attending roster remains the same for the algorithm logic
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

const getWeekendDates = () => {
    // Generate all 52 weekend dates for 2026 (starting Sat, Jan 3rd)
    const dates = [];
    let currentDate = new Date('2026-01-03T00:00:00');
    for (let i = 0; i < 52; i++) {
        dates.push(currentDate.toISOString().substring(0, 10));
        currentDate.setDate(currentDate.getDate() + 7);
    }
    return dates;
};

// --- DRAG-AND-DROP COMPONENT (REDACTED FOR BREVITY) ---
const DragAndDropList = ({ title, items, onRankChange, maxRanks }) => {
    const [draggingIndex, setDraggingIndex] = useState(null);

    const handleDragStart = (e, index) => {
        setDraggingIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        if (draggingIndex === null || draggingIndex === dropIndex) {
            setDraggingIndex(null);
            return;
        }

        const newItems = Array.from(items);
        const [movedItem] = newItems.splice(draggingIndex, 1);
        newItems.splice(dropIndex, 0, movedItem);

        onRankChange(newItems);
        setDraggingIndex(null);
    };

    const isRankFull = items.length >= maxRanks;
    const isOverLimit = items.length > maxRanks;

    return (
        <div className="p-4 bg-white shadow-lg rounded-lg h-full flex flex-col">
            <h3 className={`text-lg font-semibold mb-3 ${isOverLimit ? 'text-red-600' : 'text-gray-800'}`}>
                {title} ({items.length} / {maxRanks} ranked)
            </h3>
            <div className="space-y-2 flex-grow overflow-y-auto">
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`p-3 bg-indigo-50 border border-indigo-200 rounded-md cursor-grab flex justify-between items-center transition-all ${
                            draggingIndex === index ? 'opacity-50 border-dashed bg-indigo-100' : 'hover:bg-indigo-100'
                        }`}
                    >
                        <span className="font-medium text-indigo-700">{index + 1}. {item.date} ({item.service})</span>
                        <span className="text-sm bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">Rank {index + 1}</span>
                    </div>
                ))}
                {!isRankFull && (
                    <div className="text-center p-4 text-gray-400 border-2 border-dashed border-gray-300 rounded-md mt-4">
                        Drag shifts here to rank (Max {maxRanks})
                    </div>
                )}
            </div>
        </div>
    );
};

// --- CORE APPLICATION COMPONENT ---

const App = () => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [userName, setUserName] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState('');

    // Roster and Schedule Data
    const [roster, setRoster] = useState([]);
    const [scheduleSlots, setScheduleSlots] = useState([]);
    const [preferences, setPreferences] = useState([]); 
    const [finalSchedule, setFinalSchedule] = useState([]);

    // User's Local Preference State
    const [mostPreferred, setMostPreferred] = useState([]);
    const [leastPreferred, setLeastPreferred] = useState([]);

    // --- FIREBASE INITIALIZATION & AUTH ---
    useEffect(() => {
        if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY_HERE") {
            console.error("Firebase config not available. Cannot initialize Firestore.");
            setStatus("Error: Firebase configuration missing or is a placeholder. Please update App.jsx with your keys.");
            setIsLoading(false);
            return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const authentication = getAuth(app);
            setDb(firestore);
            setAuth(authentication);

            // Authentication listener:
            // Signs in anonymously as we don't have the secure token.
            const unsubscribe = onAuthStateChanged(authentication, async (user) => {
                if (user) {
                    setUserId(user.uid);
                    
                    // We need a stable way to identify the admin and other users.
                    // For the Admin (Namasivayam Ambalavanan), we'll use a specific ID.
                    // *** IMPORTANT: After deploying, the first time you log in to the app, 
                    // check the footer for your USER ID and replace 'YOUR_ADMIN_UID' with it.
                    const adminUidPlaceholder = 'YOUR_ADMIN_UID'; 
                    const adminName = ATTENDING_ROSTER[0].name;
                    
                    if (user.uid === adminUidPlaceholder) {
                         setIsAdmin(true);
                         setUserName(adminName + " (Admin)");
                    } else {
                         // Assign attending's name based on a simple index mapping using their UID hash
                         // This is a simple (non-collision-proof) way to ensure anonymous users get stable names.
                         const rosterIndex = user.uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % ATTENDING_ROSTER.length;
                         setUserName(ATTENDING_ROSTER[rosterIndex].name); 
                    }
                    
                } else {
                    // Sign in anonymously if no user is found
                    await signInAnonymously(authentication);
                }
                setIsLoading(false);
            });

            return () => unsubscribe();
        } catch (e) {
            console.error("Firebase init failed:", e);
            setStatus(`Error initializing Firebase: ${e.message}`);
            setIsLoading(false);
        }
    }, []);

    // --- REST OF THE CODE REMAINS IDENTICAL ---
    // Includes seedDatabase, all listeners, preference submission, and the WPS algorithm.
    const seedDatabase = useCallback(async (database) => {
        if (!database || !userId) return;

        // Path: /artifacts/{APP_ID}/public/data/roster
        const rosterRef = collection(database, 'artifacts', appId, 'public', 'data', 'roster');
        const scheduleRef = collection(database, 'artifacts', appId, 'public', 'data', 'schedule');
        
        setStatus('Checking database for required data...');

        const rosterSnapshot = await getDocs(rosterRef);
        if (!rosterSnapshot.empty) {
            setStatus('Database already seeded. Listening for real-time updates.');
            return;
        }
        
        setStatus('Seeding database with 104 slots and 18 attending goals...');
        
        const batch = [];
        
        // A. Seed Roster (Attendance Goals)
        ATTENDING_ROSTER.forEach(att => {
            batch.push(setDoc(doc(rosterRef, att.name), {
                name: att.name,
                mandatoryGoal: att.goal,
                assignmentsMet: att.met,
            }));
        });
        
        // B. Seed Schedule Slots (104 total)
        const allDates = getWeekendDates();
        let claimedCount = 0;
        let claimedSlotsToAssign = ATTENDING_ROSTER.flatMap(a => Array(a.met).fill(a.name));
        let claimedIndex = 0;
        
        allDates.forEach(dateStr => {
            SERVICES.forEach(service => {
                let isAssigned = false;
                let assignedTo = null;
                
                // Randomly assign the 54 claimed shifts to match the 'AssignmentsMet' count
                if (claimedCount < 54 && claimedIndex < claimedSlotsToAssign.length) {
                    assignedTo = claimedSlotsToAssign[claimedIndex];
                    isAssigned = true;
                    claimedCount++;
                    claimedIndex++;
                }
                
                batch.push(setDoc(doc(scheduleRef, `${dateStr}-${service}`), {
                    date: dateStr,
                    service: service,
                    isAssigned: isAssigned,
                    assignedTo: assignedTo,
                    slotId: `${dateStr}-${service}`
                }));
            });
        });
        
        await Promise.all(batch);
        setStatus('Database seeding complete. Ready for preference input.');
    }, [userId]);

    // --- 2. FIRESTORE REAL-TIME LISTENERS ---
    useEffect(() => {
        if (!db || !userId) return;

        // Run Seeding on first load
        seedDatabase(db).catch(e => setStatus(`Seeding failed: ${e.message}`));

        const baseRef = (collectionName) => collection(db, 'artifacts', appId, 'public', 'data', collectionName);

        // Listener 1: Roster
        const unsubscribeRoster = onSnapshot(baseRef('roster'), (snapshot) => {
            const rosterData = snapshot.docs.map(d => d.data());
            setRoster(rosterData.sort((a, b) => b.mandatoryGoal - a.mandatoryGoal));
        });

        // Listener 2: Schedule Slots
        const unsubscribeSchedule = onSnapshot(baseRef('schedule'), (snapshot) => {
            const scheduleData = snapshot.docs.map(d => d.data());
            setScheduleSlots(scheduleData);
            
            // Re-sync user's local preference state based on open slots
            const openSlots = scheduleData.filter(s => !s.isAssigned).map(s => ({
                id: s.slotId,
                date: s.date,
                service: s.service
            }));

            setMostPreferred(prev => prev.filter(p => openSlots.some(s => s.id === p.id)));
            setLeastPreferred(prev => prev.filter(p => openSlots.some(s => s.id === p.id)));
            
            // Check if schedule is final
            if (scheduleData.every(s => s.isAssigned)) {
                setFinalSchedule(scheduleData.filter(s => s.assignedTo).sort((a, b) => a.date.localeCompare(b.date)));
                setStatus('FINAL SCHEDULE IS SET AND VERIFIED.');
            } else {
                 setFinalSchedule([]);
            }
        });
        
        // Listener 3: Preferences (for admin verification)
         const unsubscribePrefs = onSnapshot(baseRef('preferences'), (snapshot) => {
             setPreferences(snapshot.docs.map(d => d.data()));
         });

        return () => {
            unsubscribeRoster();
            unsubscribeSchedule();
            unsubscribePrefs();
        };
    }, [db, userId, seedDatabase]);

    // --- 3. PREFERENCE INPUT LOGIC ---

    const openSlots = useMemo(() => {
        const preferredIds = new Set([...mostPreferred, ...leastPreferred].map(p => p.id));
        return scheduleSlots
            .filter(s => !s.isAssigned && !preferredIds.has(s.slotId))
            .map(s => ({ id: s.slotId, date: s.date, service: s.service }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [scheduleSlots, mostPreferred, leastPreferred]);

    const handleSelectSlot = (slot) => {
        // Default to MOST preferred list unless that list is full
        if (mostPreferred.length < 10) {
            setMostPreferred([...mostPreferred, slot]);
        } else if (leastPreferred.length < 10) {
            setLeastPreferred([...leastPreferred, slot]);
        } else {
            setStatus("Maximum 20 preferences (10 Most, 10 Least) already selected. Please remove one first.");
        }
    };

    const handleSubmitPreferences = async () => {
        if (!db || !userName) {
            setStatus("Application not ready or user name missing.");
            return;
        }
        
        if (mostPreferred.length !== 10 || leastPreferred.length !== 10) {
            setStatus("Please select exactly 10 Most Preferred and 10 Least Preferred shifts.");
            return;
        }

        setStatus('Submitting preferences...');
        
        const prefData = [];
        
        // Format MOST preferred
        mostPreferred.forEach((slot, index) => {
            prefData.push({
                slotId: slot.id,
                attendingName: userName,
                date: slot.date,
                service: slot.service,
                type: 'MOST',
                rank: index + 1, // Rank 1 is most preferred
                timestamp: new Date().toISOString()
            });
        });
        
        // Format LEAST preferred
        leastPreferred.forEach((slot, index) => {
             prefData.push({
                slotId: slot.id,
                attendingName: userName,
                date: slot.date,
                service: slot.service,
                type: 'LEAST',
                rank: index + 1, // Rank 1 is least preferred
                timestamp: new Date().toISOString()
            });
        });

        // Write all 20 preferences to the Firestore document for this user
        const prefsRef = collection(db, 'artifacts', appId, 'public', 'data', 'preferences');
        try {
            await setDoc(doc(prefsRef, userName.replace(/\s/g, '_')), {
                attendingName: userName,
                preferences: prefData
            });
            setStatus(`20 preferences successfully submitted for ${userName}. Thank you!`);
        } catch (e) {
            setStatus(`Submission failed: ${e.message}`);
            console.error(e);
        }
    };

    // --- 4. WPS ALGORITHM LOGIC (ADMIN FUNCTION) ---

    const runWPSAlgorithm = async () => {
        if (!isAdmin || !db) {
            setStatus("Error: Only the administrator can run the algorithm.");
            return;
        }
        
        if (scheduleSlots.every(s => s.isAssigned)) {
             setStatus("Schedule is already final and verified. No assignments left to make.");
             return;
        }

        setStatus('WPS Algorithm running... This may take a moment.');
        
        try {
            await runTransaction(db, async (transaction) => {
                const rosterRef = collection(db, 'artifacts', appId, 'public', 'data', 'roster');
                const scheduleRef = collection(db, 'artifacts', appId, 'public', 'data', 'schedule');
                const preferencesRef = collection(db, 'artifacts', appId, 'public', 'data', 'preferences');

                // 1. Get current Roster and calculate Attending Weights (W)
                const rosterSnapshot = await getDocs(rosterRef);
                const attendingMap = {};
                rosterSnapshot.docs.forEach(d => {
                    const data = d.data();
                    if (data.mandatoryGoal > data.assignmentsMet) {
                        const W = (data.mandatoryGoal - data.assignmentsMet) / data.mandatoryGoal;
                        attendingMap[data.name] = { ...data, W };
                    }
                });

                // 2. Get all open slots
                const scheduleSnapshot = await getDocs(query(scheduleRef, where('isAssigned', '==', false)));
                const openSlotsMap = {};
                scheduleSnapshot.docs.forEach(d => openSlotsMap[d.id] = d.data());

                // 3. Get all preferences
                const preferencesSnapshot = await getDocs(preferencesRef);
                const allPreferences = preferencesSnapshot.docs.flatMap(d => d.data().preferences);

                let assignmentsMade = 0;
                let roundLimit = 55; // Stop after 50-55 assignments to prevent infinite loop

                // --- MAIN WPS LOOP ---
                while (Object.keys(openSlotsMap).length > 0 && Object.keys(attendingMap).length > 0 && assignmentsMade < roundLimit) {
                    let candidates = [];

                    // Generate WPS for all MOST preferred, open slots, for attendings with unmet goals
                    allPreferences.forEach(p => {
                        if (p.attendingName in attendingMap && p.slotId in openSlotsMap && p.type === 'MOST') {
                            const W = attendingMap[p.attendingName].W;
                            const P = 11 - p.rank; // Rank 1 = 10 points
                            const WPS = P * W;
                            
                            candidates.push({
                                wps: WPS,
                                P: P,
                                slotId: p.slotId,
                                attendingName: p.attendingName
                            });
                        }
                    });

                    // Sort by WPS (Highest wins)
                    candidates.sort((a, b) => b.wps - a.wps);
                    
                    if (candidates.length === 0 || candidates[0].wps <= 0) {
                        // No high-priority assignments left, break to mandatory fulfillment
                        break;
                    }
                    
                    const winner = candidates[0];
                    
                    // Assign the shift (Transaction update)
                    transaction.update(doc(scheduleRef, winner.slotId), {
                        isAssigned: true,
                        assignedTo: winner.attendingName
                    });
                    
                    // Update Attending's Met count (Transaction update)
                    const currentAtt = attendingMap[winner.attendingName];
                    const newMet = currentAtt.assignmentsMet + 1;
                    transaction.update(doc(rosterRef, winner.attendingName), {
                        assignmentsMet: newMet
                    });

                    // Remove from maps for next round
                    delete openSlotsMap[winner.slotId];
                    if (newMet >= currentAtt.mandatoryGoal) {
                        delete attendingMap[winner.attendingName];
                    } else {
                        // Re-calculate W for the next round
                        attendingMap[winner.attendingName].assignmentsMet = newMet;
                        attendingMap[winner.attendingName].W = (currentAtt.mandatoryGoal - newMet) / currentAtt.mandatoryGoal;
                    }
                    assignmentsMade++;
                }

                // --- MANDATORY FULFILLMENT PHASE (Penalty/Clean-up) ---
                const finalUnmet = Object.values(attendingMap).sort((a, b) => b.W - a.W); // Order by need
                const remainingSlots = Object.keys(openSlotsMap).sort(); // Order chronologically
                
                let slotIndex = 0;
                let attIndex = 0;
                
                while (slotIndex < remainingSlots.length && attIndex < finalUnmet.length) {
                    const att = finalUnmet[attIndex];
                    const currentAttDocRef = doc(rosterRef, att.name);
                    
                    // Re-fetch the latest data for safety inside the transaction
                    const currentAttDoc = await transaction.get(currentAttDocRef);
                    const currentAttData = currentAttDoc.data();
                    
                    if (currentAttData.assignmentsMet < currentAttData.mandatoryGoal) {
                        const slotId = remainingSlots[slotIndex];
                        
                        // Assign the slot (Transaction update)
                        transaction.update(doc(scheduleRef, slotId), {
                            isAssigned: true,
                            assignedTo: att.name
                        });
                        
                        // Update Attending's Met count (Transaction update)
                        transaction.update(currentAttDocRef, {
                            assignmentsMet: currentAttData.assignmentsMet + 1
                        });
                        
                        slotIndex++;
                        assignmentsMade++;
                    } else {
                        // Attending is complete, move to next person
                        attIndex++;
                    }
                }
            });
            
            setStatus('Algorithm complete. Final schedule written to the database.');
        } catch (e) {
            setStatus(`Algorithm failed: ${e.message}`);
            console.error("WPS Transaction Failed:", e);
        }
    };

    // ... [Rest of the rendering logic remains identical]
    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-xl font-medium text-indigo-600">Loading Application...</div></div>;
    }

    if (!db) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-600 font-bold">Error: Database connection failed. Check console.</div>;
    }

    const renderAttendingUI = () => (
        <div className="p-6 bg-white shadow-xl rounded-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Preference Submission for {userName}</h2>
            <div className="text-sm text-gray-600 mb-6">
                 Select slots from the list on the left and drag them into the ranking lists below. You must rank exactly 10 Most Preferred and 10 Least Preferred.
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
                
                {/* Available Slots */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg overflow-y-auto">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3 sticky top-0 bg-gray-50 py-2">
                        Open Assignments ({openSlots.length} left)
                    </h3>
                    <div className="space-y-2">
                        {openSlots.map(slot => (
                            <button
                                key={slot.id}
                                onClick={() => handleSelectSlot(slot)}
                                className="w-full p-2 text-left text-sm bg-white hover:bg-indigo-50 border rounded-md transition-colors shadow-sm text-gray-700"
                            >
                                {slot.date} ({slot.service})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ranking Lists */}
                <DragAndDropList
                    title="10 MOST Preferred Shifts"
                    items={mostPreferred}
                    onRankChange={setMostPreferred}
                    maxRanks={10}
                />
                
                <DragAndDropList
                    title="10 LEAST Preferred Shifts (Avoid)"
                    items={leastPreferred}
                    onRankChange={setLeastPreferred}
                    maxRanks={10}
                />
            </div>
            
            <div className="mt-6 flex justify-center">
                <button
                    onClick={handleSubmitPreferences}
                    disabled={mostPreferred.length !== 10 || leastPreferred.length !== 10}
                    className={`px-8 py-3 rounded-xl text-white font-bold transition-all shadow-md ${
                        mostPreferred.length === 10 && leastPreferred.length === 10
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-gray-400 cursor-not-allowed'
                    }`}
                >
                    Submit Final 20 Preferences
                </button>
            </div>
        </div>
    );
    
    const renderAdminUI = () => (
        <div className="p-6 bg-white shadow-xl rounded-xl">
            <h2 className="text-3xl font-bold text-indigo-700 mb-6">Schedule Administrator Dashboard</h2>
            
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <div className="text-lg font-medium">Open Assignments: <span className="text-indigo-600 font-extrabold">{scheduleSlots.filter(s => !s.isAssigned).length} / 104</span></div>
                <button
                    onClick={runWPSAlgorithm}
                    disabled={finalSchedule.length > 0}
                    className={`px-6 py-3 rounded-lg text-white font-bold transition-all shadow-lg ${
                        finalSchedule.length > 0
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700 transform hover:scale-105'
                    }`}
                >
                    {finalSchedule.length > 0 ? "Schedule is FINAL" : "RUN WPS ALGORITHM"}
                </button>
            </div>
            
            {/* Roster Verification Table */}
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Attending Roster & Fulfillment Status</h3>
            <div className="overflow-x-auto mb-8">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attending</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mandatory Goal</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignments Met</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WPS Weight (W)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {roster.map((att) => (
                            <tr key={att.name} className={att.assignmentsMet < att.mandatoryGoal ? 'bg-yellow-50' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{att.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{att.mandatoryGoal}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">{att.assignmentsMet}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {(att.mandatoryGoal > 0 && att.assignmentsMet < att.mandatoryGoal) 
                                        ? ((att.mandatoryGoal - att.assignmentsMet) / att.mandatoryGoal).toFixed(3)
                                        : '0.000 (Met)'
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Final Schedule View */}
            {finalSchedule.length > 0 && (
                <>
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">FINAL 104-Shift Schedule</h3>
                    <div className="h-64 overflow-y-auto border p-4 rounded-lg bg-gray-50">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="sticky top-0 bg-gray-200">
                                <tr>
                                    <th className="p-2 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                                    <th className="p-2 text-left text-xs font-medium text-gray-600 uppercase">Service</th>
                                    <th className="p-2 text-left text-xs font-medium text-gray-600 uppercase">Assigned To</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {finalSchedule.map((slot) => (
                                    <tr key={slot.slotId}>
                                        <td className="p-2 whitespace-nowrap text-sm">{slot.date}</td>
                                        <td className="p-2 whitespace-nowrap text-sm font-medium">{slot.service}</td>
                                        <td className="p-2 whitespace-nowrap text-sm text-indigo-700 font-semibold">{slot.assignedTo}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );


    return (
        <div className="min-h-screen bg-gray-100 p-6 font-sans">
            <header className="bg-indigo-600 text-white p-4 rounded-t-lg shadow-md mb-6">
                <h1 className="text-2xl font-extrabold">2026 Attending Fair Scheduling System</h1>
                <p className="text-sm">
                    {isAdmin ? 'Mode: Administrator' : `Mode: Attending Preference Input`} | Current User: {userName || 'Authenticating...'}
                </p>
                <div className="text-xs mt-1">Status: {status}</div>
            </header>
            
            {isAdmin ? renderAdminUI() : renderAttendingUI()}
            
            <footer className="mt-6 text-center text-xs text-gray-500">
                Data stored in Firestore under App ID: {appId}. Your unique user ID is: {userId}
            </footer>
        </div>
    );
};

export default App;

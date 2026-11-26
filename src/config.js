// =====================================================================
//  2027 WEEKEND SCHEDULER — ALL YEAR-SPECIFIC SETTINGS LIVE IN THIS FILE
//  To reuse next year: change YEAR, ATTENDINGS, WEEKENDS, FIXED_BLOCKS
//  and ON_SERVICE. Nothing else in the app needs to change.
// =====================================================================

export const YEAR = 2027;

export const SERVICES = { RNI: "RNI", COA: "COA" };

// The 18 faculty who take weekends. `name` is the short name used
// everywhere (schedule, Word document, tallies).
export const ATTENDINGS = [
  { name: "Ambal",     fullName: "Namasivayam Ambalavanan", email: "nambalav@uabmc.edu" },
  { name: "Arora",     fullName: "Nitin Arora",             email: "nitinarora@uabmc.edu" },
  { name: "Bhatia",    fullName: "Kulsajan Bhatia",         email: "ksbhatia@uabmc.edu" },
  { name: "Boone",     fullName: "Neal Boone",              email: "nboone@uabmc.edu" },
  { name: "Carlo",     fullName: "Waldemar Carlo",          email: "wacarlo@uabmc.edu" },
  { name: "Jain",      fullName: "Viral Jain",              email: "viraljain@uabmc.edu" },
  { name: "Kandasamy", fullName: "Jegen Kandasamy",         email: "jkandasamy@uabmc.edu", isAdmin: true },
  { name: "Kane",      fullName: "Andrea Kane",             email: "akane@uabmc.edu" },
  { name: "Lal",       fullName: "Vivek Lal",               email: "clal@uabmc.edu" },
  { name: "Mackay",    fullName: "Amy Mackay",              email: "amysessions@uabmc.edu" },
  { name: "Salas",     fullName: "Ariel Salas",             email: "asalas@uabmc.edu" },
  { name: "Schuyler",  fullName: "Amelia Schuyler",         email: "aschuyler@uabmc.edu" },
  { name: "Shukla",    fullName: "Vivek Shukla",            email: "vshukla@uabmc.edu" },
  { name: "Sims",      fullName: "Brian Sims",              email: "bsims@uabmc.edu" },
  { name: "Travers",   fullName: "Colm Travers",            email: "cptravers@uabmc.edu" },
  { name: "Valcarce",  fullName: "Vivian Valcarce",         email: "vvalcarceluaces@uabmc.edu" },
  { name: "Willis",    fullName: "Kent Willis",             email: "kentwillis@uabmc.edu" },
  { name: "Winter",    fullName: "Lindy Winter",            email: "lwinter@uabmc.edu" },
];

// The scheduler (gets the +1 when the "as many as possible" share does not
// divide evenly, and any weekend that cannot be filled from rankings).
export const SCHEDULER_NAME = "Kandasamy";

// The only account that signs in by email link and sees the Admin Panel.
// (Must match isAdmin() in firestore.rules.)
export const ADMIN_EMAIL = "jkandasamy@uabmc.edu";

// ---------------------------------------------------------------------
// Weekends to allocate. `month` decides which month block it appears in
// (and whose on-service priority applies). `paid` = UAB paid holiday.
// ---------------------------------------------------------------------
const W = (month, date, day, extra = {}) => ({ month, date, day, ...extra });

export const WEEKENDS = [
  W("01", "2027-01-09", "9"),
  W("01", "2027-01-16", "16-18", { detail: "MLK Day", paid: true }),
  W("01", "2027-01-23", "23"),
  W("01", "2027-01-30", "30"),
  W("02", "2027-02-06", "6"),
  W("02", "2027-02-13", "13"),
  W("02", "2027-02-20", "20"),
  W("02", "2027-02-27", "27"),
  W("03", "2027-03-06", "6"),
  W("03", "2027-03-13", "13"),
  W("03", "2027-03-20", "20"),
  W("03", "2027-03-27", "27"),
  W("04", "2027-04-03", "3"),
  W("04", "2027-04-10", "10"),
  W("04", "2027-04-17", "17"),
  W("04", "2027-04-24", "24"),
  W("05", "2027-04-30", "Apr 30 – May 3", { detail: "PAS" }),
  W("05", "2027-05-08", "8"),
  W("05", "2027-05-15", "15"),
  W("05", "2027-05-22", "22"),
  W("05", "2027-05-29", "29-31", { detail: "Memorial Day", paid: true }),
  W("06", "2027-06-05", "5"),
  W("06", "2027-06-12", "12"),
  W("06", "2027-06-18", "18-20", { detail: "Juneteenth", paid: true }),
  W("06", "2027-06-26", "26"),
  W("07", "2027-07-03", "3-5", { detail: "July 4th", paid: true }),
  W("07", "2027-07-10", "10"),
  W("07", "2027-07-17", "17"),
  W("07", "2027-07-24", "24"),
  W("07", "2027-07-31", "31"),
  W("08", "2027-08-07", "7"),
  W("08", "2027-08-14", "14"),
  W("08", "2027-08-21", "21"),
  W("08", "2027-08-28", "28"),
  W("09", "2027-09-04", "4-6", { detail: "Labor Day", paid: true }),
  W("09", "2027-09-11", "11"),
  W("09", "2027-09-18", "18"),
  W("09", "2027-09-25", "25"),
  W("10", "2027-10-02", "2"),
  W("10", "2027-10-09", "9"),
  W("10", "2027-10-16", "16"),
  W("10", "2027-10-23", "23"),
  W("10", "2027-10-30", "30"),
  W("11", "2027-11-06", "6"),
  W("11", "2027-11-13", "13"),
  W("11", "2027-11-20", "20"),
  W("11", "2027-11-25", "25-28", { detail: "Thanksgiving", paid: true }),
  W("12", "2027-12-04", "4"),
  W("12", "2027-12-11", "11"),
  W("12", "2027-12-18", "18"),
];

// Holiday blocks already covered by the monthly schedule. Shown on the
// calendar and in the Word document, but NOT rankable and NOT counted in
// anyone's weekend total.
export const FIXED_BLOCKS = [
  { month: "12", date: "2027-12-24", day: "24-28", detail: "Christmas", rni: "Bhatia", coa: "Kandasamy" },
  { month: "12", date: "2027-12-29", day: "29-Jan 2 2028", detail: "New Year", rni: "Shukla", coa: "Arora" },
];

// ---------------------------------------------------------------------
// Who is on which service each month (from the final 2027 monthly schedule).
// Split months list both people.
//   RES = RNICU Resident, NNP = NNP/BPD-Cards, QB = COA Quarterback,
//   HARB = COA Harbert, CCN = CCN attending.
// ---------------------------------------------------------------------
export const SERVICE_ROLES = {
  "01": { RES: ["Kane", "Bhatia"], NNP: ["Winter"],        QB: ["Hightower"],        HARB: ["Black"],     CCN: ["Salas"] },
  "02": { RES: ["Philips"],        NNP: ["Boone", "Jain"], QB: ["Stoops"],           HARB: ["Kabani"],    CCN: ["Kandasamy"] },
  "03": { RES: ["Valcarce"],       NNP: ["Ambal"],         QB: ["Arora"],            HARB: ["Winter"],    CCN: ["Boone"] },
  "04": { RES: ["Sims"],           NNP: ["Kane"],          QB: ["Black"],            HARB: ["Yazdi"],     CCN: ["Willis"] },
  "05": { RES: ["Arora"],          NNP: ["Lal"],           QB: ["Kabani"],           HARB: ["Summerlin"], CCN: ["Shukla", "Mackay"] },
  "06": { RES: ["Schuyler"],       NNP: ["Valcarce"],      QB: ["Carlo", "Bhatia"],  HARB: ["Winter"],    CCN: ["Shukla"] },
  "07": { RES: ["Jain"],           NNP: ["Shukla"],        QB: ["Willis"],           HARB: ["Carlo"],     CCN: ["Winter"] },
  "08": { RES: ["Boone"],          NNP: ["Sims"],          QB: ["Summerlin"],        HARB: ["Carlo"],     CCN: ["Arora"] },
  "09": { RES: ["Mackay"],         NNP: ["Schuyler"],      QB: ["Black"],            HARB: ["Stoops"],    CCN: ["Lal"] },
  "10": { RES: ["Kandasamy"],      NNP: ["Travers"],       QB: ["Yazdi"],            HARB: ["Carlo"],     CCN: ["Winter"] },
  "11": { RES: ["Ambal"],          NNP: ["Bhatia"],        QB: ["Hightower"],        HARB: ["Black"],     CCN: ["Kane"] },
  "12": { RES: ["Travers"],        NNP: ["Boone"],         QB: ["Kandasamy"],        HARB: ["Kabani", "Kandasamy"], CCN: ["Mackay", "Jain"] },
};

export const ROLE_LABELS = { RES: "RNICU Resident", NNP: "NNP/BPD", QB: "COA QB", HARB: "COA Harbert", CCN: "CCN" };

// Weekend priority: RNI weekends -> RNICU Resident + NNP/BPD attendings;
// COA weekends -> QB + Harbert attendings. CCN gives no weekend priority.
const uniq = (a) => [...new Set(a)];
export const ON_SERVICE = Object.fromEntries(
  Object.entries(SERVICE_ROLES).map(([mk, r]) => [mk, { RNI: uniq([...r.RES, ...r.NNP]), COA: uniq([...r.QB, ...r.HARB]) }])
);

// The most people will typically get (shown in the pop-up after choosing a number,
// and as the estimate for "as many as possible" until the admin publishes the
// real share from the Admin Panel).
export const DEFAULT_MAX_ESTIMATE = "7–8";

// Submission deadline. After this, attendings can view but not change anything
// (the admin still can). Keep in step with the date in firestore.rules.
export const DEADLINE = "2026-12-09T17:00:00-06:00";
export const DEADLINE_LABEL = "Wednesday, Dec 9, 2026 at 5 PM CST";
export const DEADLINE_MS = Date.parse(DEADLINE);

// The live address. Preview mode (?demo) is switched off here so attendings
// can't end up in it by accident; it still works on Vercel preview links.
export const LIVE_HOSTS = ["uabneo-scheduler-2027.vercel.app"];

// Optional: link shown in the top bar.
export const REPO_URL = "https://github.com/jaydoc/scheduler-2026";

// ---------------------------------------------------------------------
export const MONTH_KEYS = ["01","02","03","04","05","06","07","08","09","10","11","12"];
export const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export const TOTAL_SLOTS = WEEKENDS.length * 2;
export const ATTENDING_BY_EMAIL = Object.fromEntries(ATTENDINGS.map(a => [a.email.toLowerCase(), a]));
export const ATTENDING_BY_NAME = Object.fromEntries(ATTENDINGS.map(a => [a.name, a]));

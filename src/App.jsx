import React, {useEffect,useMemo,useRef,useState,useCallback} from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/* ──────────────────────────────────────────────────────────────────────────
   BASIC CONFIG
   ────────────────────────────────────────────────────────────────────────── */
const YEAR = 2026;
const SERVICES = { RNI:"RNI", COA:"COA", NONE:"none" };

// Use your real project; kept here to avoid FALLBACK_* errors.
const LOCAL_FALLBACK = {
  apiKey: "AIzaSyB6CvHk5u4jvvO8oXGnf_GTq1RMbwhT-JU",
  authDomain: "attending-schedule-2026.firebaseapp.com",
  projectId: "attending-schedule-2026",
  storageBucket: "attending-schedule-2026.firebasestorage.app",
  messagingSenderId: "777996986623",
  appId: "1:777996986623:web:0a8697cccb63149d9744ca",
  measurementId: "G-TJXCM9P7W2"
};

const ATTENDINGS = [
  { name: "Ambal",   email: "nambalav@uab.edu" },
  { name: "Arora",   email: "nitinarora@uabmc.edu" },
  { name: "Bhatia",  email: "ksbhatia@uabmc.edu" },
  { name: "Boone",   email: "boone@uabmc.edu" },
  { name: "Carlo",   email: "wcarlo@uabmc.edu" },
  { name: "Jain",    email: "viraljain@uabmc.edu" },
  { name: "Kandasamy", email: "jkandasamy@uabmc.edu" },
  { name: "Kane",    email: "akane@uabmc.edu" },
  { name: "Mackay",  email: "mackay@uabmc.edu" },
  { name: "Schuyler",email: "aschuyler@uabmc.edu" },
  { name: "Shukla",  email: "vshukla@uabmc.edu" },
  { name: "Sims",    email: "bsims@uabmc.edu" },
  { name: "Travers", email: "cptravers@uabmc.edu" },
  { name: "Willis",  email: "kentwillis@uabmc.edu" },
  { name: "Winter",  email: "lwinter@uabmc.edu" },
  { name: "Salas",   email: "asalas@uabmc.edu" },
  { name: "Lal",     email: "clal@uabmc.edu" },
  { name: "Vivian",  email: "vvalcarceluaces@uabmc.edu" },
];

/* ──────────────────────────────────────────────────────────────────────────
   CALENDAR DATA (Saturdays of 2026 + per-date service availability)
   - You can prefill assignments by setting rni: "Name" or coa: "Name".
   ────────────────────────────────────────────────────────────────────────── */
function saturdaysOf(year){
  const start = new Date(year,0,1), end = new Date(year,11,31), out=[];
  for(let d=new Date(start); d<=end; d.setDate(d.getDate()+1)){
    if(d.getDay()===6){ // Saturday
      const satISO = d.toISOString().slice(0,10);
      const sun = new Date(d); sun.setDate(sun.getDate()+1);
      out.push({ id:satISO, month:d.getMonth(), day:d.getDate(), label:fmtMD(d), sunISO: sun.toISOString().slice(0,10), rni:null, coa:null });
    }
  }
  return out;
}
const monthsFlat = saturdaysOf(YEAR);
// Example pre-assigned slots (keep or expand as needed)
const PREFILL = {
  "2026-03-07": { rni:"Ambal", coa:"Arora" },
  "2026-06-06": { rni:"Schuyler", coa:"Winter" },
  "2026-10-03": { rni:"Kandasamy", coa:"Carlo" }
};
monthsFlat.forEach(w=>{
  if(PREFILL[w.id]) { w.rni=PREFILL[w.id].rni??w.rni; w.coa=PREFILL[w.id].coa??w.coa; }
});

const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_KEYS = Array.from({length:12},(_,i)=>String(i+1).padStart(2,"0"));

// availability map
const availabilityByWeekend = monthsFlat.reduce((m,w)=>{
  const a=[]; if(w.rni===null) a.push(SERVICES.RNI); if(w.coa===null) a.push(SERVICES.COA);
  m[w.id]=a; return m;
}, {});

/* ──────────────────────────────────────────────────────────────────────────
   UTILS
   ────────────────────────────────────────────────────────────────────────── */
function fmtMD(d){ return `${MONTH_FULL[d.getMonth()]} ${d.getDate()}`; }
function idToMD(id){ const d=new Date(id+"T00:00:00"); return fmtMD(d); }

function initEmptyPrefs(){
  const base={};
  monthsFlat.forEach(w=>{
    base[w.id]={ most:{service:SERVICES.NONE, rank:0}, least:{service:SERVICES.NONE, rank:0} };
  });
  return base;
}
function normalizeRanks(prefs, which){ // which: "most" | "least"
  const entries = Object.entries(prefs)
    .filter(([,v]) => v[which].service!==SERVICES.NONE && v[which].rank>0)
    .sort((a,b)=>a[1][which].rank-b[1][which].rank || monthsFlat.findIndex(w=>w.id===a[0]) - monthsFlat.findIndex(w=>w.id===b[0]));
  let r=1;
  entries.forEach(([id])=>{ prefs[id][which].rank=r++; });
}
function csv(rows){
  if(!rows.length) return "";
  const h=Object.keys(rows[0]);
  const esc=s=>`"${String(s??"").replace(/"/g,'""')}"`;
  return [h.join(","), ...rows.map(r=>h.map(k=>esc(r[k])).join(","))].join("\n");
}
function download(name, mime, content){
  const blob=new Blob([content],{type:mime});
  const url=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/* ──────────────────────────────────────────────────────────────────────────
   SHARED WIDGETS
   ────────────────────────────────────────────────────────────────────────── */
function LivePreview({profile,prefs}){
  const most=useMemo(()=>Object.entries(prefs)
    .filter(([,v])=>v.most.service!==SERVICES.NONE && v.most.rank>0)
    .map(([id,v])=>({id, ...v.most})).sort((a,b)=>a.rank-b.rank),[prefs]);
  const least=useMemo(()=>Object.entries(prefs)
    .filter(([,v])=>v.least.service!==SERVICES.NONE && v.least.rank>0)
    .map(([id,v])=>({id, ...v.least})).sort((a,b)=>a.rank-b.rank),[prefs]);
  return (
    <div style={{border:"1px solid #e5e7eb",borderRadius:12,background:"#fff",padding:12}}>
      <div style={{fontWeight:800,marginBottom:6}}>Your live selections</div>
      <div style={{fontSize:12,color:"#475569",marginBottom:6}}>{profile.name||"(no name)"} • {most.length+least.length} item(s)</div>
      {least.map(x=>(
        <div key={"L"+x.id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:11,background:"#fee2e2",border:"1px solid #fecaca",borderRadius:8,padding:"2px 6px"}}>LEAST</span>
          <b style={{fontSize:12}}>#{x.rank}</b>
          <span style={{fontSize:13}}>{idToMD(x.id)} — {x.service}</span>
        </div>
      ))}
      {most.map(x=>(
        <div key={"M"+x.id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:11,background:"#d1fae5",border:"1px solid #bbf7d0",borderRadius:8,padding:"2px 6px"}}>MOST</span>
          <b style={{fontSize:12}}>#{x.rank}</b>
          <span style={{fontSize:13}}>{idToMD(x.id)} — {x.service}</span>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   MODE: CALENDAR (months collapsed by default)
   ────────────────────────────────────────────────────────────────────────── */
function MonthCard({monthIdx,items,prefs,update,collapsed,setCollapsed}){
  const colorBg=["#fde68a","#bfdbfe","#bbf7d0","#fecaca","#ddd6fe","#c7d2fe","#fbcfe8","#a7f3d0","#fcd34d","#fca5a5","#93c5fd","#86efac"][monthIdx];
  return (
    <div id={`month-${String(monthIdx+1).padStart(2,"0")}`} style={{border:"1px solid #e5e7eb",borderRadius:14,background:"#fff"}}>
      <button onClick={()=>setCollapsed(c=>({...c,[monthIdx]:!c[monthIdx]}))}
              style={{width:"100%",textAlign:"center",fontWeight:800,padding:"10px 12px",borderBottom:"1px solid #e5e7eb",background:colorBg}}>
        {MONTH_FULL[monthIdx]} {YEAR} {collapsed[monthIdx]?"▸":"▾"}
      </button>
      {!collapsed[monthIdx] && (
        <div style={{padding:10,display:"flex",flexDirection:"column",gap:10}}>
          {items.map(w=>{
            const avail=availabilityByWeekend[w.id];
            const p=prefs[w.id];
            const taken=avail.length===0;
            const svcBad=(bucket)=>p[bucket].rank>0 && p[bucket].service===SERVICES.NONE;
            return (
              <div key={w.id} style={{border:"1px solid #e5e7eb",borderRadius:12,padding:10,opacity:taken?0.7:1,background:taken?"#f9fafb":"#fff"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{fontWeight:800}}>{idToMD(w.id)}</div>
                  <div style={{fontSize:12,color:"#475569"}}>
                    <span style={{background: w.rni===null?"#e0e7ff":"#e5e7eb",padding:"2px 6px",borderRadius:8,marginRight:6}}>
                      RNI: {w.rni===null?"OPEN":<b>{w.rni}</b>}
                    </span>
                    <span style={{background: w.coa===null?"#dbeafe":"#e5e7eb",padding:"2px 6px",borderRadius:8}}>
                      COA: {w.coa===null?"OPEN":<b>{w.coa}</b>}
                    </span>
                  </div>
                </div>

                {taken ? (
                  <div style={{fontSize:12,fontWeight:700,color:"#991b1b"}}>FULLY ASSIGNED — NO RANKING AVAILABLE</div>
                ):(
                  <div style={{display:"grid",gap:8}}>
                    {/* MOST */}
                    <div style={{border:"1px solid #e5e7eb",borderRadius:10,padding:8}}>
                      <div style={{fontSize:13,fontWeight:700,marginBottom:6}}>Most (service + choice)</div>
                      <ServiceRow
                        name={`most-${w.id}`}
                        avail={avail}
                        value={p.most.service}
                        onService={(svc)=>update("most",w.id,{service:svc})}
                        rank={p.most.rank}
                        onRank={(rk)=>update("most",w.id,{rank:rk})}
                      />
                      {svcBad("most") && <div style={{fontSize:12,color:"#b45309"}}>Pick a service for Most.</div>}
                    </div>
                    {/* LEAST */}
                    <div style={{border:"1px solid #e5e7eb",borderRadius:10,padding:8}}>
                      <div style={{fontSize:13,fontWeight:700,marginBottom:6}}>Least (service + choice)</div>
                      <ServiceRow
                        name={`least-${w.id}`}
                        avail={avail}
                        value={p.least.service}
                        onService={(svc)=>update("least",w.id,{service:svc})}
                        rank={p.least.rank}
                        onRank={(rk)=>update("least",w.id,{rank:rk})}
                      />
                      {svcBad("least") && <div style={{fontSize:12,color:"#b45309"}}>Pick a service for Least.</div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function ServiceRow({name,avail,value,onService,rank,onRank}){
  const maxN=monthsFlat.length;
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"center"}}>
      {avail.includes(SERVICES.RNI) && (
        <label style={{display:"flex",alignItems:"center",gap:6}}>
          <input type="radio" name={name} checked={value===SERVICES.RNI} onChange={()=>onService(SERVICES.RNI)} />
          RNI
        </label>
      )}
      {avail.includes(SERVICES.COA) && (
        <label style={{display:"flex",alignItems:"center",gap:6}}>
          <input type="radio" name={name} checked={value===SERVICES.COA} onChange={()=>onService(SERVICES.COA)} />
          COA
        </label>
      )}
      <select value={String(rank||0)} onChange={e=>onRank(parseInt(e.target.value,10))}
              style={{padding:"5px 10px",border:"1px solid #e2e8f0",borderRadius:10}}>
        <option value="0">Choice #</option>
        {Array.from({length:maxN},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}
      </select>
    </div>
  );
}
function CalendarMode({prefs,update}){
  const grouped = useMemo(()=>{
    const m = Array.from({length:12},()=>[]);
    monthsFlat.forEach(w=>m[w.month].push(w));
    return m;
  },[]);
  const [collapsed,setCollapsed]=useState(()=>Object.fromEntries([...Array(12).keys()].map(i=>[i,true])));
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(380px,1fr))",gap:18}}>
      {grouped.map((items,i)=><MonthCard key={i} monthIdx={i} items={items} prefs={prefs} update={update} collapsed={collapsed} setCollapsed={setCollapsed} />)}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   MODE: DRAG BUCKETS  (fixed: empty target lists initially, compact source)
   ────────────────────────────────────────────────────────────────────────── */
function DragBuckets({prefs,smartAssign,requireName}){
  const library = useMemo(()=>{
    // a chip for each AVAILABLE service for each weekend
    return monthsFlat.flatMap(w=>{
      const avail=availabilityByWeekend[w.id];
      return avail.map(svc=>({ key:`${w.id}:${svc}`, id:w.id, label:`${idToMD(w.id)} — ${svc}`, service:svc }));
    });
  },[]);
  const mostList = useMemo(()=>Object.entries(prefs)
    .filter(([,v])=>v.most.service!==SERVICES.NONE && v.most.rank>0)
    .map(([id,v])=>({id, ...v.most})).sort((a,b)=>a.rank-b.rank),[prefs]);
  const leastList = useMemo(()=>Object.entries(prefs)
    .filter(([,v])=>v.least.service!==SERVICES.NONE && v.least.rank>0)
    .map(([id,v])=>({id, ...v.least})).sort((a,b)=>a.rank-b.rank),[prefs]);

  const onDrop = (bucket)=>(e)=>{
    if(!requireName){e.preventDefault(); return;}
    try{
      const data=JSON.parse(e.dataTransfer.getData("text/plain"));
      if(!data) return;
      smartAssign(bucket, data.id, data.service); // auto-rank + exclusivity inside fn
    }catch{}
  };
  const allow=(e)=>{ if(requireName){ e.preventDefault(); e.dataTransfer.dropEffect="move"; }};

  return (
    <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1fr",gap:16}}>
      {/* Library grid */}
      <div style={{border:"1px solid #e5e7eb",borderRadius:12,background:"#fff"}}>
        <div style={{fontWeight:800,borderBottom:"1px solid #e5e7eb",padding:"8px 10px"}}>Available (drag a chip)</div>
        <div style={{padding:10,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8}}>
          {library.map(it=>(
            <div key={it.key} draggable={requireName}
                 onDragStart={e=>{e.dataTransfer.setData("text/plain",JSON.stringify({id:it.id,service:it.service})); e.dataTransfer.effectAllowed="move";}}
                 title={requireName?"Drag to Most/Least":"Select your name first"}
                 style={{border:"1px solid #e5e7eb",borderRadius:999,padding:"6px 10px",fontSize:12,background:"#fff",cursor:requireName?"grab":"not-allowed",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
              {it.label}
            </div>
          ))}
        </div>
      </div>

      {/* MOST */}
      <div onDragOver={allow} onDrop={onDrop("most")}
           style={{border:"1px solid #e5e7eb",borderRadius:12,background:"#fff"}}>
        <div style={{fontWeight:800,borderBottom:"1px solid #e5e7eb",padding:"8px 10px"}}>Most (drop to add)</div>
        <div style={{padding:10,display:"flex",flexDirection:"column",gap:8,minHeight:120}}>
          {mostList.length===0 && <div style={{fontSize:12,color:"#64748b"}}>— empty —</div>}
          {mostList.map(m=>(
            <div key={"M"+m.id} style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontSize:12,background:"#d1fae5",border:"1px solid #bbf7d0",borderRadius:8,padding:"2px 6px"}}>#{m.rank}</span>
              <span style={{fontSize:13}}>{idToMD(m.id)} — {m.service}</span>
              <button onClick={()=>smartAssign("most-clear", m.id)} style={{marginLeft:"auto",fontSize:12,border:"1px solid #e5e7eb",borderRadius:8,padding:"2px 6px"}}>Remove</button>
            </div>
          ))}
        </div>
      </div>

      {/* LEAST */}
      <div onDragOver={allow} onDrop={onDrop("least")}
           style={{border:"1px solid #e5e7eb",borderRadius:12,background:"#fff"}}>
        <div style={{fontWeight:800,borderBottom:"1px solid #e5e7eb",padding:"8px 10px"}}>Least (drop to add)</div>
        <div style={{padding:10,display:"flex",flexDirection:"column",gap:8,minHeight:120}}>
          {leastList.length===0 && <div style={{fontSize:12,color:"#64748b"}}>— empty —</div>}
          {leastList.map(m=>(
            <div key={"L"+m.id} style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontSize:12,background:"#fee2e2",border:"1px solid #fecaca",borderRadius:8,padding:"2px 6px"}}>#{m.rank}</span>
              <span style={{fontSize:13}}>{idToMD(m.id)} — {m.service}</span>
              <button onClick={()=>smartAssign("least-clear", m.id)} style={{marginLeft:"auto",fontSize:12,border:"1px solid #e5e7eb",borderRadius:8,padding:"2px 6px"}}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   MODE: QUICK ADD (minimal clicks; auto next-rank)
   ────────────────────────────────────────────────────────────────────────── */
function QuickAdd({smartAssign}){
  const [id,setId]=useState(monthsFlat[0]?.id||"");
  const [service,setService]=useState(SERVICES.RNI);
  const avail=availabilityByWeekend[id]||[];
  useEffect(()=>{ if(!avail.includes(service)) setService(avail[0]||SERVICES.RNI); },[id]);

  return (
    <div style={{border:"1px solid #e5e7eb",borderRadius:12,background:"#fff",padding:12,display:"flex",gap:10,flexWrap:"wrap"}}>
      <select value={id} onChange={e=>setId(e.target.value)} style={{padding:"6px 10px",border:"1px solid #e5e7eb",borderRadius:8}}>
        {monthsFlat.map(w=><option key={w.id} value={w.id}>{idToMD(w.id)}</option>)}
      </select>
      <select value={service} onChange={e=>setService(e.target.value)} style={{padding:"6px 10px",border:"1px solid #e5e7eb",borderRadius:8}}>
        {avail.map(a=> <option key={a} value={a}>{a}</option>)}
      </select>
      <button onClick={()=>smartAssign("most", id, service)} style={{padding:"6px 12px",borderRadius:10,border:"1px solid #16a34a",background:"#22c55e",color:"#fff"}}>Add to MOST</button>
      <button onClick={()=>smartAssign("least", id, service)} style={{padding:"6px 12px",borderRadius:10,border:"1px solid #ef4444",background:"#f87171",color:"#fff"}}>Add to LEAST</button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   MODE: RANK BOARD (single click toggles; auto next-rank)
   ────────────────────────────────────────────────────────────────────────── */
function RankBoard({prefs,smartAssign}){
  return (
    <div style={{border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden",background:"#fff"}}>
      <div style={{display:"grid",gridTemplateColumns:"160px 1fr 1fr",gap:0,background:"#f8fafc",fontWeight:800,borderBottom:"1px solid #e5e7eb"}}>
        <div style={{padding:"8px 10px"}}>Weekend</div>
        <div style={{padding:"8px 10px"}}>Most</div>
        <div style={{padding:"8px 10px"}}>Least</div>
      </div>
      {monthsFlat.map(w=>{
        const avail=availabilityByWeekend[w.id];
        const p=prefs[w.id];
        const row=(bucket)=>{
          return (
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",padding:"6px 10px"}}>
              {avail.map(svc=>{
                const active = p[bucket].service===svc && p[bucket].rank>0;
                return (
                  <button key={svc}
                          onClick={()=>smartAssign(active?`${bucket}-clear`:`${bucket}`, w.id, svc)}
                          style={{
                            padding:"4px 10px", borderRadius:999, border:"1px solid #e5e7eb",
                            background: active ? (bucket==="most"?"#d1fae5":"#fee2e2") : "#fff",
                            fontSize:12
                          }}>
                    {svc}{active?`  #${p[bucket].rank}`:""}
                  </button>
                );
              })}
              {avail.length===0 && <span style={{fontSize:12,color:"#64748b"}}>— fully assigned —</span>}
            </div>
          );
        };
        return (
          <div key={w.id} style={{display:"grid",gridTemplateColumns:"160px 1fr 1fr",borderTop:"1px solid #e5e7eb"}}>
            <div style={{padding:"8px 10px",fontWeight:700}}>{idToMD(w.id)}</div>
            {row("most")}
            {row("least")}
          </div>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   COMMAND PALETTE (simple)
   ────────────────────────────────────────────────────────────────────────── */
function CommandPalette({open,setOpen,go}){
  const cmds=[
    {k:"Calendar",cb:()=>go("cal")},
    {k:"DragBuckets",cb:()=>go("drag")},
    {k:"QuickAdd",cb:()=>go("quick")},
    {k:"RankBoard",cb:()=>go("rank")},
    {k:"Collapse all",cb:()=>document.querySelectorAll("[id^='month-'] button")?.forEach(b=>b.click())}
  ];
  if(!open) return null;
  return (
    <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.25)",zIndex:60,display:"grid",placeItems:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{width:520,maxWidth:"90vw",background:"#fff",borderRadius:12,boxShadow:"0 10px 30px rgba(0,0,0,.2)"}}>
        <div style={{padding:10,borderBottom:"1px solid #e5e7eb",fontWeight:800}}>Command Palette</div>
        <div style={{padding:10}}>
          {cmds.map(c=><button key={c.k} onClick={()=>{c.cb();setOpen(false);}} style={{display:"block",width:"100%",textAlign:"left",padding:"8px 10px",border:"1px solid #e5e7eb",borderRadius:8,background:"#fff",marginBottom:8}}>{c.k}</button>)}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   APP
   ────────────────────────────────────────────────────────────────────────── */
export default function App(){
  // Firebase badge
  const [fbStatus,setFbStatus]=useState("Connecting…");
  useEffect(()=>{
    try{
      const app = initializeApp(LOCAL_FALLBACK);
      const auth = getAuth(app);
      signInAnonymously(auth).then(()=>setFbStatus("Connected ✓")).catch(()=>setFbStatus("Failed ✗"));
      getFirestore(app); // init
    }catch{ setFbStatus("Failed ✗"); }
  },[]);

  // Profile + prefs
  const [profile,setProfile]=useState({name:"",email:""});
  const [prefs,setPrefs]=useState(()=>initEmptyPrefs());
  const [ui,setUI]=useState(new URLSearchParams(window.location.search).get("ui")||"cal");
  useEffect(()=>{ const q=new URLSearchParams(window.location.search); q.set("ui",ui); window.history.replaceState(null,"","?"+q.toString()); },[ui]);

  // Central updater with ALL rules (single place):
  const update = useCallback((bucket,id,patch)=>{
    setPrefs(prev=>{
      const next={...prev, [id]: {...prev[id]}};
      next[id][bucket] = {...next[id][bucket], ...patch};

      // RULE 1: service must be one of available (or NONE)
      const avail=availabilityByWeekend[id];
      ["most","least"].forEach(b=>{
        const s=next[id][b].service;
        if(s!==SERVICES.NONE && !avail.includes(s)) next[id][b].service=SERVICES.NONE;
      });

      // RULE 2: cannot select both RNI & COA for same weekend within same bucket
      // (already enforced by radio/choices & library; we only store single service)

      // RULE 3: a weekend cannot be in both buckets simultaneously
      if(next[id].most.rank>0 && next[id].most.service!==SERVICES.NONE){
        next[id].least={service:SERVICES.NONE,rank:0};
      }
      if(next[id].least.rank>0 && next[id].least.service!==SERVICES.NONE){
        next[id].most={service:SERVICES.NONE,rank:0};
      }

      // RULE 4: ranks renormalize 1..N in each bucket
      normalizeRanks(next,"most");
      normalizeRanks(next,"least");
      return next;
    });
  },[]);

  // Helper to auto-assign next rank when adding via quick/drag/board
  const smartAssign = useCallback((action,id,service)=>{
    setPrefs(prev=>{
      const next={...prev, [id]: {...prev[id]}};
      const avail=availabilityByWeekend[id];
      if(!avail.includes(service)) return prev;

      if(action==="most" || action==="least"){
        const bucket=action;
        // put rank = current count + 1
        const count = Object.values(next).filter(v=>v[bucket].service!==SERVICES.NONE && v[bucket].rank>0).length;
        next[id][bucket]={service, rank: count+1};
        // exclusivity: clear the other bucket for this id
        const other=bucket==="most"?"least":"most";
        next[id][other]={service:SERVICES.NONE, rank:0};
      }
      if(action==="most-clear"){ next[id].most={service:SERVICES.NONE,rank:0}; }
      if(action==="least-clear"){ next[id].least={service:SERVICES.NONE,rank:0}; }

      normalizeRanks(next,"most");
      normalizeRanks(next,"least");
      return next;
    });
  },[]);

  // Exposed wrapper for CalendarMode (sets service/rank independently)
  const updateFromCalendar = useCallback((which,id,{service,rank})=>{
    setPrefs(prev=>{
      const next={...prev, [id]: {...prev[id]}};
      if(service!==undefined) next[id][which].service=service;
      if(rank!==undefined)    next[id][which].rank=rank;
      // exclusivity and validity
      const avail=availabilityByWeekend[id];
      if(next[id][which].service!==SERVICES.NONE && !avail.includes(next[id][which].service)) next[id][which].service=SERVICES.NONE;
      const other = which==="most"?"least":"most";
      if(next[id][which].rank>0 && next[id][which].service!==SERVICES.NONE){
        next[id][other]={service:SERVICES.NONE,rank:0};
      }
      normalizeRanks(next,"most");
      normalizeRanks(next,"least");
      return next;
    });
  },[]);

  // Counts
  const counts = useMemo(()=>{
    let mc=0, lc=0;
    Object.values(prefs).forEach(p=>{ if(p.most.rank>0 && p.most.service!==SERVICES.NONE) mc++; if(p.least.rank>0 && p.least.service!==SERVICES.NONE) lc++; });
    return {mc,lc};
  },[prefs]);

  // Jump bar scroll
  const jump=(mIdx)=>{
    const el=document.getElementById(`month-${String(mIdx+1).padStart(2,"0")}`);
    if(el) el.scrollIntoView({behavior:"smooth",block:"start"});
  };

  // Downloads
  const downloadCSV = ()=>{
    const rows=[];
    Object.entries(prefs).forEach(([id,v])=>{
      if(v.most.rank>0 && v.most.service!==SERVICES.NONE) rows.push({attendee:profile.name,email:profile.email||"",kind:"MOST",choice:v.most.rank,service:v.most.service,weekend:id});
      if(v.least.rank>0 && v.least.service!==SERVICES.NONE) rows.push({attendee:profile.name,email:profile.email||"",kind:"LEAST",choice:v.least.rank,service:v.least.service,weekend:id});
    });
    rows.sort((a,b)=>a.kind.localeCompare(b.kind)||a.choice-b.choice);
    download(`preferences_${profile.name||"attending"}.csv`,"text/csv;charset=utf-8;",csv(rows));
  };
  const downloadWord = ()=>{
    const rows=[];
    Object.entries(prefs).forEach(([id,v])=>{
      if(v.most.rank>0 && v.most.service!==SERVICES.NONE) rows.push({kind:"MOST",choice:v.most.rank,service:v.most.service,weekend:id});
      if(v.least.rank>0 && v.least.service!==SERVICES.NONE) rows.push({kind:"LEAST",choice:v.least.rank,service:v.least.service,weekend:id});
    });
    rows.sort((a,b)=>a.kind.localeCompare(b.kind)||a.choice-b.choice);
    const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const tr=r=>`<tr><td>${esc(r.kind)}</td><td>${esc(r.choice)}</td><td>${esc(r.service)}</td><td>${esc(idToMD(r.weekend))}</td></tr>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Preferences</title></head>
      <body><h2>2026 Weekend Preferences</h2>
        <p><b>Name:</b> ${esc(profile.name||"")} &nbsp; <b>Email:</b> ${esc(profile.email||"")}</p>
        <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse">
          <thead><tr><th>Kind</th><th>Choice #</th><th>Service</th><th>Weekend</th></tr></thead>
          <tbody>${rows.map(tr).join("")}</tbody>
        </table>
      </body></html>`;
    download(`preferences_${profile.name||"attending"}.doc`,"application/msword",html);
  };

  // Centered container with gutters
  const Shell = ({children})=>(
    <div style={{background:"#f6f8fb",minHeight:"100vh"}}>
      <div style={{position:"sticky",top:0,zIndex:40,background:"#ffffffcc",backdropFilter:"saturate(180%) blur(4px)",borderBottom:"1px solid #e5e7eb"}}>
        <div style={{maxWidth:1180,margin:"0 auto",padding:"8px 12px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <strong>Jump:</strong>
          {MONTH_FULL.map((m,i)=><button key={m} onClick={()=>jump(i)} style={{padding:"6px 10px",borderRadius:999,border:"1px solid #e5e7eb",background:"#fff",fontSize:12}}>{m.slice(0,3)}</button>)}
          <span style={{flex:1}}/>
          <span style={{fontSize:12, padding:"4px 8px", borderRadius:999, border:"1px solid #e5e7eb", background: fbStatus.includes("Connected")?"#ecfeff":"#fee2e2", color: fbStatus.includes("Connected")?"#155e75":"#7f1d1d"}}>
            Firebase: {fbStatus}
          </span>
          <button onClick={downloadCSV}  style={{padding:"6px 10px",borderRadius:10,border:"1px solid #059669",background:"#10b981",color:"#fff"}}>Preview/My CSV</button>
          <button onClick={downloadWord} style={{padding:"6px 10px",borderRadius:10,border:"1px solid #4f46e5",background:"#6366f1",color:"#fff"}}>Preview/My Word</button>
        </div>
      </div>

      <div style={{maxWidth:1180, margin:"0 auto", padding:"18px 12px"}}>
        {children}
      </div>
    </div>
  );

  const go = (mode)=>setUI(mode);

  return (
    <Shell>
      {/* Title & mode switcher */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:10}}>
        <h1 style={{fontSize:32,fontWeight:900,color:"#0f172a",margin:0}}>2026 Preferences (RNI & COA)</h1>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>go("cal")}   style={tab(ui==="cal")}>Calendar</button>
          <button onClick={()=>go("drag")}  style={tab(ui==="drag")}>DragBuckets</button>
          <button onClick={()=>go("quick")} style={tab(ui==="quick")}>QuickAdd</button>
          <button onClick={()=>go("rank")}  style={tab(ui==="rank")}>RankBoard</button>
          <button onClick={()=>setCP(true)}  style={{padding:"6px 10px",borderRadius:999,border:"1px solid #e5e7eb",background:"#fff"}}>⌘K</button>
        </div>
      </div>

      {/* Instructions */}
      <ol style={{margin:"0 0 10px 18px", color:"#334155", fontSize:14, lineHeight:1.45}}>
        <li>Select your name below. You will see the number of weekends you wanted.</li>
        <li>Choose “Most” and “Least” preferred weekends; for each, select <b>service</b> and <b>choice #</b>. Services are enforced to available slots only; you cannot select both RNI and COA for the same bucket/weekend.</li>
        <li>You can download a preview anytime.</li>
        <li>Submit to lock your preferences once you are done.</li>
      </ol>
      <div style={{fontSize:13,color:"#0f5132",background:"#d1e7dd",border:"1px solid #badbcc",padding:"10px 12px",borderRadius:10,marginBottom:10}}>
        Aim for a balanced spread of <b>COA</b> and <b>RNI</b> on your “Most” list when possible. This is a <b>ranking</b> process; selecting more weekends increases the chance you receive more of your preferred weekends overall.
      </div>

      {/* Status + profile */}
      <div style={{fontSize:14,color:"#334155",marginBottom:8}}>Status: Ready. • Most choices: {counts.mc} • Least choices: {counts.lc}</div>
      <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
        <label style={{fontWeight:700}}>Your name:</label>
        <select value={profile.name} onChange={e=>setProfile(p=>({...p,name:e.target.value,email:ATTENDINGS.find(a=>a.name===e.target.value)?.email||p.email}))}
                style={{padding:"6px 10px",border:"1px solid #e5e7eb",borderRadius:8,minWidth:220}}>
          <option value="">— Select —</option>
          {ATTENDINGS.map(a=><option key={a.name} value={a.name}>{a.name}</option>)}
        </select>
        <label style={{fontWeight:700}}>Email (optional):</label>
        <input value={profile.email} onChange={e=>setProfile(p=>({...p,email:e.target.value}))}
               placeholder="you@uab.edu"
               style={{padding:"6px 10px",border:"1px solid #e5e7eb",borderRadius:8,minWidth:260}}/>
      </div>

      {/* Layout: main + live preview */}
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 320px",gap:16,alignItems:"start"}}>
        <div>
          {ui==="cal"  && <CalendarMode prefs={prefs} update={(which,id,patch)=>updateFromCalendar(which,id,patch)} />}
          {ui==="drag" && <DragBuckets prefs={prefs} smartAssign={smartAssign} requireName={Boolean(profile.name)} />}
          {ui==="quick"&& <QuickAdd smartAssign={smartAssign} />}
          {ui==="rank" && <RankBoard prefs={prefs} smartAssign={smartAssign} />}
        </div>
        <LivePreview profile={profile} prefs={prefs} />
      </div>

      {/* Command palette */}
      <CommandPalette open={cp} setOpen={setCP} go={(mode)=>{go(mode);}} />
    </Shell>
  );
  function tab(active){ return {padding:"6px 10px",borderRadius:999,border:"1px solid #e5e7eb",background:active?"#e2e8f0":"#fff",fontWeight:600}; }
  function setCP(v){ _setCP(v); }
}

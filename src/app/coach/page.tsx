"use client";
import { useEffect, useState } from "react";

type Session = { id:number; session_date:string; start_time:string; end_time:string; capacity:number; booked_count:number; attended_count:number; no_show_count:number; course_name:string; room_name:string|null; status:string };
type Roster = { booking_id:number; member_id:number; member_name:string; member_phone:string|null; booking_status:string; attendance_status:string|null };
type Note = { member_id:number; content:string };

const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };

export default function CoachPage(){
  const [token,setToken]=useState("");
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [msg,setMsg]=useState("");
  const [date,setDate]=useState(today());
  const [sessions,setSessions]=useState<Session[]>([]);
  const [selected,setSelected]=useState<number|null>(null);
  const [roster,setRoster]=useState<Roster[]>([]);
  const [notes,setNotes]=useState<Record<number,string>>({});
  const [noteDraft,setNoteDraft]=useState<Record<number,string>>({});
  const [measure,setMeasure]=useState<Record<number,{weight:string;waist:string}>>({});

  useEffect(()=>{ const t=localStorage.getItem("coachToken")||""; const n=localStorage.getItem("coachName")||""; setToken(t); setName(n); },[]);

  const api=async(url:string, init:RequestInit={})=>{
    const r=await fetch(url,{...init,headers:{...(init.headers||{}),"Authorization":`Bearer ${token}`,"Content-Type":"application/json"}});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.error||"请求失败");
    return d;
  };

  const loadSessions=async(t=token,d=date)=>{
    if(!t) return;
    try{
      const r=await fetch(`/api/coach/sessions?date=${d}`,{headers:{Authorization:`Bearer ${t}`}});
      const data=await r.json();
      if(!r.ok) throw new Error(data.error||"加载失败");
      setSessions(data.sessions||[]); setMsg("");
    }catch(e:any){setMsg(e.message);}
  };
  useEffect(()=>{ if(token) loadSessions(token,date); },[token,date]);

  const login=async(e:React.FormEvent)=>{
    e.preventDefault(); setMsg("");
    try{
      const r=await fetch("/api/coach/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||"登录失败");
      localStorage.setItem("coachToken",d.token); localStorage.setItem("coachName",d.name);
      setToken(d.token); setName(d.name); setMsg("");
    }catch(e:any){setMsg(e.message);}
  };

  const logout=()=>{ localStorage.removeItem("coachToken"); localStorage.removeItem("coachName"); setToken(""); setName(""); setSessions([]); setRoster([]); };

  const openSession=async(id:number)=>{
    setSelected(id); setMsg("");
    try{
      const d=await api(`/api/coach/roster?sessionId=${id}`);
      setRoster(d.roster||[]);
      const n=await api(`/api/coach/notes?sessionId=${id}`).catch(()=>({notes:[]}));
      const map:Record<number,string>={}; (n.notes||[]).forEach((x:Note)=>{map[x.member_id]=x.content;});
      setNotes(map);
    }catch(e:any){setMsg(e.message);}
  };

  const checkIn=async(bookingId:number,status:"attended"|"no_show")=>{
    try{
      const d=await api("/api/coach/check-in",{method:"POST",body:JSON.stringify({bookingId,status})});
      setMsg(d.duplicate?"已处理过，未重复扣次":`已标记${status==="attended"?"到课":"未到"}，剩余 ${d.remainingCount ?? "-"}`);
      if(selected) await openSession(selected);
      await loadSessions();
    }catch(e:any){setMsg(e.message);}
  };

  const saveMeasure=async(memberId:number)=>{
    const m=measure[memberId]||{weight:"",waist:""};
    try{
      await api("/api/coach/measurements",{method:"POST",body:JSON.stringify({memberId,weightKg:m.weight,waistCm:m.waist})});
      setMsg("体围已记入会员成长档案");
    }catch(e:any){setMsg(e.message);}
  };

  const saveNote=async(memberId:number)=>{
    const content=(noteDraft[memberId]??"").trim();
    if(!content||!selected) return;
    try{
      await api("/api/coach/notes",{method:"POST",body:JSON.stringify({sessionId:selected,memberId,content})});
      setMsg("课后记录已保存");
      setNoteDraft({...noteDraft,[memberId]:""});
      await openSession(selected);
    }catch(e:any){setMsg(e.message);}
  };

  if(!token) return <div style={{maxWidth:420,margin:"0 auto",padding:"60px 20px",fontFamily:"-apple-system, sans-serif"}}>
    <div style={{fontSize:12,color:"#8B5E3C"}}>教练工作台</div>
    <h1 style={{fontSize:26,margin:"6px 0 8px",color:"#1C1415"}}>教练登录</h1>
    <p style={{fontSize:13,color:"#7A6B69",marginBottom:20}}>用管理员给你开的教练账号登录，只能看自己的课。</p>
    {msg&&<div style={{background:"#FDECEA",color:"#8A1F17",padding:"10px 12px",borderRadius:8,fontSize:13,marginBottom:14}}>{msg}</div>}
    <form onSubmit={login}>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="教练邮箱" style={{width:"100%",padding:"11px 12px",borderRadius:8,border:"1px solid #D1C7C1",marginBottom:10,boxSizing:"border-box"}}/>
      <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="密码" style={{width:"100%",padding:"11px 12px",borderRadius:8,border:"1px solid #D1C7C1",marginBottom:14,boxSizing:"border-box"}}/>
      <button style={{width:"100%",padding:"12px 0",background:"#0D0C0F",color:"#F6E6DA",border:"none",borderRadius:8,fontSize:14,fontWeight:600}}>登录</button>
    </form>
  </div>;

  return <div style={{maxWidth:560,margin:"0 auto",padding:"24px 18px 60px",fontFamily:"-apple-system, sans-serif"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
      <div><div style={{fontSize:12,color:"#8B5E3C"}}>教练工作台</div><h1 style={{fontSize:24,margin:"4px 0 0",color:"#1C1415"}}>{name} 的课</h1></div>
      <button onClick={logout} style={{fontSize:12,color:"#8C827B",background:"none",border:"none"}}>退出</button>
    </div>
    <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{marginTop:14,padding:"9px 12px",borderRadius:8,border:"1px solid #D1C7C1",fontSize:14}}/>
    {msg&&<div style={{background:"#FFF8E1",border:"1px solid #F0D9A8",color:"#6B4E16",padding:"10px 12px",borderRadius:8,fontSize:13,margin:"14px 0"}}>{msg}</div>}
    {sessions.length===0?<div style={{background:"#fff",border:"1px dashed #D1C7C1",borderRadius:12,padding:"26px",marginTop:16,textAlign:"center",color:"#8C827B",fontSize:13}}>这一天没有你的课</div>:
      <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:16}}>
        {sessions.map(s=><div key={s.id} onClick={()=>openSession(s.id)} style={{background:"#fff",border:selected===s.id?"2px solid #5E1914":"1px solid #EBE4DF",borderRadius:12,padding:"14px 16px",cursor:"pointer"}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:15,fontWeight:600}}>{s.start_time}-{s.end_time} · {s.course_name}</span>
            <span style={{fontSize:12,color:"#8C827B"}}>{s.booked_count}/{s.capacity} 已约</span>
          </div>
          <div style={{fontSize:12,color:"#8C827B",marginTop:4}}>{s.room_name||"未分配教室"} · 到课 {s.attended_count} · 未到 {s.no_show_count}</div>
        </div>)}
      </div>}
    {selected && roster.length>0 && <div style={{marginTop:22}}>
      <div style={{fontSize:14,fontWeight:600,color:"#5E1914",marginBottom:10}}>本节课名单</div>
      {roster.map(r=><div key={r.booking_id} style={{background:"#fff",border:"1px solid #EBE4DF",borderRadius:12,padding:"14px 16px",marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><span style={{fontSize:14,fontWeight:600}}>{r.member_name}</span><span style={{fontSize:11,color:"#8C827B",marginLeft:8}}>{r.member_phone||""}</span></div>
          <span style={{fontSize:12,color:r.attendance_status==="attended"?"#2E7D4F":r.attendance_status==="no_show"?"#9E2A2B":"#8C827B"}}>
            {r.attendance_status==="attended"?"已到课":r.attendance_status==="no_show"?"未到":r.booking_status==="cancelled"?"已取消":"待签到"}
          </span>
        </div>
        {r.booking_status==="booked" && <div style={{display:"flex",gap:8,marginTop:10}}>
          <button onClick={()=>checkIn(r.booking_id,"attended")} style={{padding:"7px 14px",borderRadius:6,border:"none",background:"#0D0C0F",color:"#F6E6DA",fontSize:12}}>到课</button>
          <button onClick={()=>checkIn(r.booking_id,"no_show")} style={{padding:"7px 14px",borderRadius:6,border:"1px solid #E0C9C5",background:"#FDF2F1",color:"#8A1F17",fontSize:12}}>未到</button>
        </div>}
        <div style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
          <input value={(measure[r.member_id]||{}).weight||""} onChange={e=>setMeasure({...measure,[r.member_id]:{weight:e.target.value,waist:(measure[r.member_id]||{}).waist||""}})} placeholder="体重kg" style={{width:72,padding:"6px 8px",borderRadius:6,border:"1px solid #D1C7C1",fontSize:12}}/>
          <input value={(measure[r.member_id]||{}).waist||""} onChange={e=>setMeasure({...measure,[r.member_id]:{weight:(measure[r.member_id]||{}).weight||"",waist:e.target.value}})} placeholder="腰围" style={{width:72,padding:"6px 8px",borderRadius:6,border:"1px solid #D1C7C1",fontSize:12}}/>
          <button onClick={()=>saveMeasure(r.member_id)} style={{padding:"6px 10px",borderRadius:6,border:"1px solid #D1C7C1",background:"#fff",fontSize:12}}>记体围</button>
        </div>
        {r.attendance_status && <div style={{marginTop:10}}>
          {notes[r.member_id] && <div style={{fontSize:12,color:"#6D645D",background:"#FAF7F5",padding:"8px 10px",borderRadius:6,marginBottom:8}}>{notes[r.member_id]}</div>}
          <textarea value={noteDraft[r.member_id]||""} onChange={e=>setNoteDraft({...noteDraft,[r.member_id]:e.target.value})} placeholder="课后 60 秒记录：今天练了什么、身体反应、下次注意" style={{width:"100%",minHeight:60,padding:"8px 10px",borderRadius:6,border:"1px solid #D1C7C1",fontSize:12,boxSizing:"border-box"}}/>
          <button onClick={()=>saveNote(r.member_id)} style={{marginTop:6,padding:"6px 14px",borderRadius:6,border:"1px solid #D1C7C1",background:"#FAF7F5",fontSize:12}}>保存记录</button>
        </div>}
      </div>)}
    </div>}
  </div>;
}

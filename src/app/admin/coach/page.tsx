"use client";
import { useEffect, useState } from "react";

type Coach={id:number;name:string};
type Session={id:number;title:string|null;session_date:string;start_time:string;end_time:string;capacity:number;status:string;course_name:string;room_name:string|null;note:string|null};

async function jf(url:string){const r=await fetch(url);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"请求失败");return d;}

export default function CoachTodayPage(){
  const [coaches,setCoaches]=useState<Coach[]>([]);
  const [coachId,setCoachId]=useState("");
  const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const [sessions,setSessions]=useState<Session[]>([]);
  const [msg,setMsg]=useState("");
  const [newCoach,setNewCoach]=useState({name:"",email:"",password:""});

  useEffect(()=>{jf("/api/admin/coaches").then((d)=>{setCoaches(d);if(d[0])setCoachId(String(d[0].id));}).catch(e=>setMsg(e.message));},[]);
  useEffect(()=>{if(!coachId)return;jf(`/api/admin/schedule?from=${date}&to=${date}&coachId=${coachId}`).then(setSessions).catch(e=>setMsg(e.message));},[coachId,date]);

  const createCoach=async(e:React.FormEvent)=>{
    e.preventDefault(); setMsg("");
    try{
      const r=await fetch("/api/admin/coaches",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(newCoach)});
      const d=await r.json(); if(!r.ok) throw new Error(d.error||"创建失败");
      setNewCoach({name:"",email:"",password:""}); setMsg("教练已创建，可把邮箱和密码发给教练登录 /coach"); window.location.reload();
    }catch(err:any){setMsg(err.message);}
  };
  return <div style={{maxWidth:520,margin:"0 auto",padding:"28px 18px 60px",fontFamily:"-apple-system, sans-serif"}}>
    <div style={{fontSize:12,color:"#8B5E3C",marginBottom:4}}>教练工作台</div>
    <h1 style={{fontSize:24,fontWeight:700,color:"#1C1415",margin:0}}>今日课表</h1>
    <p style={{fontSize:13,color:"#7A6B69",margin:"8px 0 18px"}}>教练只看自己的课；当前用管理员登录进入，正式教练登录在 S5 接入。</p>
    {msg&&<div style={{background:"#FDECEA",border:"1px solid #F5C6C0",color:"#8A1F17",padding:"10px 12px",borderRadius:8,fontSize:13,marginBottom:14}}>{msg}</div>}
    <form onSubmit={createCoach} style={{background:"#fff",border:"1px solid #EBE4DF",borderRadius:12,padding:"14px 16px",marginBottom:18}}>
      <div style={{fontSize:13,fontWeight:600,color:"#5E1914",marginBottom:10}}>新增教练登录账号</div>
      <input value={newCoach.name} onChange={e=>setNewCoach({...newCoach,name:e.target.value})} placeholder="姓名" style={{width:"100%",padding:"9px 11px",borderRadius:6,border:"1px solid #D1C7C1",marginBottom:8,boxSizing:"border-box"}}/>
      <input value={newCoach.email} onChange={e=>setNewCoach({...newCoach,email:e.target.value})} placeholder="登录邮箱" style={{width:"100%",padding:"9px 11px",borderRadius:6,border:"1px solid #D1C7C1",marginBottom:8,boxSizing:"border-box"}}/>
      <input value={newCoach.password} onChange={e=>setNewCoach({...newCoach,password:e.target.value})} type="password" placeholder="初始密码" style={{width:"100%",padding:"9px 11px",borderRadius:6,border:"1px solid #D1C7C1",marginBottom:8,boxSizing:"border-box"}}/>
      <button style={{width:"100%",padding:"9px 0",background:"#0D0C0F",color:"#F6E6DA",border:"none",borderRadius:6,fontSize:13}}>创建教练账号</button>
      <div style={{fontSize:11,color:"#8C827B",marginTop:8}}>教练登录入口：<a href="/coach" style={{color:"#5E1914"}}>/coach</a>（只能看自己的课）</div>
    </form>
    <div style={{display:"flex",gap:10,marginBottom:18}}>
      <select value={coachId} onChange={e=>setCoachId(e.target.value)} style={{flex:1,padding:"10px 12px",borderRadius:8,border:"1px solid #D1C7C1",fontSize:14}}>
        <option value="">选择教练</option>{coaches.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{padding:"10px 12px",borderRadius:8,border:"1px solid #D1C7C1",fontSize:14}}/>
    </div>
    {sessions.length===0?<div style={{background:"#fff",border:"1px dashed #D1C7C1",borderRadius:12,padding:"30px 20px",textAlign:"center",color:"#8C827B",fontSize:13}}>这一天没有课</div>:
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {sessions.map(s=><div key={s.id} style={{background:"#fff",border:"1px solid #EBE4DF",borderRadius:12,padding:"16px 18px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
            <div style={{fontSize:16,fontWeight:600,color:"#1C1415"}}>{s.start_time}-{s.end_time}</div>
            <div style={{fontSize:12,color:s.status==="cancelled"?"#9E2A2B":"#2E7D4F"}}>{s.status==="cancelled"?"已取消":"可上课"}</div>
          </div>
          <div style={{fontSize:14,color:"#5E1914",marginTop:6}}>{s.course_name} · {s.room_name||"未分配教室"}</div>
          <div style={{fontSize:12,color:"#8C827B",marginTop:4}}>容量 {s.capacity} 人{s.note?` · ${s.note}`:""}</div>
        </div>)}
      </div>}
  </div>;
}

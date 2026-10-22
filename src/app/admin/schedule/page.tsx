"use client";
import { useEffect, useState } from "react";

type Course={id:number;name:string;duration_minutes:number;default_capacity:number};
type Coach={id:number;name:string};
type Room={id:number;name:string;capacity:number};
type Session={id:number;course_category_id:number;coach_id:number;room_id:number|null;title:string|null;session_date:string;start_time:string;end_time:string;capacity:number;status:string;course_name:string;coach_name:string;room_name:string|null};
type Template={id:number;course_id:number;coach_id:number;room_id:number|null;weekday:number;start_time:string;end_time:string;capacity:number;course_name:string;coach_name:string;room_name:string|null};

async function jf(url:string,init?:RequestInit){const r=await fetch(url,init);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"请求失败");return d;}
function fmt(d:Date){return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;}
function mondayOf(d:Date){const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=(x.getUTCDay()+6)%7;x.setUTCDate(x.getUTCDate()-day);return fmt(x);}
function addDays(s:string,n:number){const [y,m,dd]=s.split("-").map(Number);const d=new Date(Date.UTC(y,m-1,dd));d.setUTCDate(d.getUTCDate()+n);return fmt(d);}
const weekdays=["周一","周二","周三","周四","周五","周六","周日"];

export default function AdminSchedulePage(){
  const [week,setWeek]=useState(mondayOf(new Date()));
  const [sessions,setSessions]=useState<Session[]>([]);
  const [templates,setTemplates]=useState<Template[]>([]);
  const [courses,setCourses]=useState<Course[]>([]);
  const [coaches,setCoaches]=useState<Coach[]>([]);
  const [rooms,setRooms]=useState<Room[]>([]);
  const [msg,setMsg]=useState("");
  const [warnings,setWarnings]=useState<string[]>([]);
  const [coachName,setCoachName]=useState("");
  const [form,setForm]=useState({courseCategoryId:"",coachId:"",roomId:"",sessionDate:"",startTime:"09:00",capacity:"",note:""});
  const [tpl,setTpl]=useState({courseId:"",coachId:"",roomId:"",weekday:"1",startTime:"09:00",capacity:""});

  const load=async()=>{
    try{
      const [s,t,c,u,r]=await Promise.all([
        jf(`/api/admin/schedule?from=${week}&to=${addDays(week,6)}`),
        jf("/api/admin/schedule/templates"), jf("/api/admin/courses"),
        jf("/api/admin/coaches"), jf("/api/admin/rooms"),
      ]);
      setSessions(s);setTemplates(t);setCourses(c);setCoaches(u);setRooms(r);
    }catch(e:any){setMsg(e.message);}
  };
  useEffect(()=>{load();},[week]);

  const create=async(e:React.FormEvent)=>{
    e.preventDefault();setMsg("");setWarnings([]);
    try{
      const res=await jf("/api/admin/schedule",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,capacity:form.capacity?Number(form.capacity):undefined})});
      setWarnings(res.warnings||[]);setMsg("课次已创建"+(res.warnings?.length?"（有冲突提示，但仍已保存）":""));
      await load();
    }catch(e:any){setMsg(e.message);}
  };
  const del=async(id:number)=>{if(!confirm("确定删除这节课？"))return;try{await jf(`/api/admin/schedule?id=${id}`,{method:"DELETE"});await load();setMsg("已删除");}catch(e:any){setMsg(e.message);}};
  const addCoach=async()=>{if(!coachName.trim())return;try{await jf("/api/admin/coaches",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:coachName.trim()})});setCoachName("");await load();setMsg("教练已新增");}catch(e:any){setMsg(e.message);}};
  const addTpl=async(e:React.FormEvent)=>{e.preventDefault();try{await jf("/api/admin/schedule/templates",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...tpl,weekday:Number(tpl.weekday),capacity:tpl.capacity?Number(tpl.capacity):undefined})});await load();setMsg("模板已新增");}catch(e:any){setMsg(e.message);}};
  const generate=async()=>{try{const r=await jf("/api/admin/schedule/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({weekStart:week})});setWarnings(r.warnings||[]);setMsg(`已生成 ${r.created} 节，跳过 ${r.skipped} 节`);await load();}catch(e:any){setMsg(e.message);}};

  const input={width:"100%",padding:"9px 12px",borderRadius:6,border:"1px solid #D1C7C1",fontSize:13,boxSizing:"border-box" as const};
  return <div style={{maxWidth:1200,margin:"0 auto",padding:"40px 20px",fontFamily:"-apple-system, sans-serif"}}>
    <div style={{fontSize:13,color:"#8B5E3C",marginBottom:6}}>后台 / 排课</div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
      <div><h1 style={{fontSize:26,fontWeight:700,color:"#1C1415",margin:0}}>周排课表</h1><p style={{fontSize:13,color:"#7A6B69",marginTop:8}}>冲突只提示，不拦截；可先排课再调整教室。</p></div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}><button onClick={()=>setWeek(addDays(week,-7))} style={{padding:"8px 14px",borderRadius:6,border:"1px solid #D1C7C1",background:"#fff"}}>上一周</button><span style={{fontSize:13}}>{week} ~ {addDays(week,6)}</span><button onClick={()=>setWeek(addDays(week,7))} style={{padding:"8px 14px",borderRadius:6,border:"1px solid #D1C7C1",background:"#fff"}}>下一周</button></div>
    </div>
    {msg&&<div style={{background:"#FFF8E1",border:"1px solid #F0D9A8",color:"#6B4E16",padding:"10px 14px",borderRadius:8,margin:"16px 0",fontSize:13}}>{msg}</div>}
    {warnings.length>0&&<div style={{background:"#FDECEA",border:"1px solid #F5C6C0",color:"#8A1F17",padding:"10px 14px",borderRadius:8,margin:"12px 0",fontSize:13}}>{warnings.map((w,i)=><div key={i}>⚠ {w}</div>)}</div>}

    <div style={{display:"grid",gridTemplateColumns:"1.1fr 1fr",gap:20,marginTop:20}}>
      <form onSubmit={create} style={{background:"#fff",border:"1px solid #EBE4DF",borderRadius:12,padding:20}}>
        <h2 style={{fontSize:16,margin:"0 0 14px",color:"#5E1914"}}>手动新增课次</h2>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <select style={input} value={form.courseCategoryId} onChange={e=>setForm({...form,courseCategoryId:e.target.value})}><option value="">选择课程</option>{courses.filter(c=>c).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select style={input} value={form.coachId} onChange={e=>setForm({...form,coachId:e.target.value})}><option value="">选择教练</option>{coaches.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select style={input} value={form.roomId} onChange={e=>setForm({...form,roomId:e.target.value})}><option value="">教室（可选）</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}（{r.capacity}人）</option>)}</select>
          <input style={input} type="date" value={form.sessionDate} onChange={e=>setForm({...form,sessionDate:e.target.value})}/>
          <input style={input} type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/>
          <input style={input} type="number" placeholder="容量（可选）" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})}/>
        </div>
        <input style={{...input,marginTop:10}} placeholder="备注（可选）" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/>
        <button style={{width:"100%",marginTop:12,padding:"11px 0",background:"#0D0C0F",color:"#F6E6DA",border:"none",borderRadius:8,fontSize:14,fontWeight:600}}>保存课次</button>
        <div style={{marginTop:14,display:"flex",gap:8}}>
          <input style={input} placeholder="新增教练姓名" value={coachName} onChange={e=>setCoachName(e.target.value)}/>
          <button type="button" onClick={addCoach} style={{padding:"9px 14px",background:"#FAF7F5",border:"1px solid #D1C7C1",borderRadius:6,fontSize:13}}>加教练</button>
        </div>
      </form>

      <form onSubmit={addTpl} style={{background:"#fff",border:"1px solid #EBE4DF",borderRadius:12,padding:20}}>
        <h2 style={{fontSize:16,margin:"0 0 14px",color:"#5E1914"}}>周模板</h2>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <select style={input} value={tpl.courseId} onChange={e=>setTpl({...tpl,courseId:e.target.value})}><option value="">课程</option>{courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select style={input} value={tpl.coachId} onChange={e=>setTpl({...tpl,coachId:e.target.value})}><option value="">教练</option>{coaches.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select style={input} value={tpl.roomId} onChange={e=>setTpl({...tpl,roomId:e.target.value})}><option value="">教室（可选）</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
          <select style={input} value={tpl.weekday} onChange={e=>setTpl({...tpl,weekday:e.target.value})}>{weekdays.map((w,i)=><option key={w} value={i+1}>{w}</option>)}</select>
          <input style={input} type="time" value={tpl.startTime} onChange={e=>setTpl({...tpl,startTime:e.target.value})}/>
          <input style={input} type="number" placeholder="容量（可选）" value={tpl.capacity} onChange={e=>setTpl({...tpl,capacity:e.target.value})}/>
        </div>
        <button style={{width:"100%",marginTop:12,padding:"11px 0",background:"#5E1914",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:600}}>新增模板</button>
        <button type="button" onClick={generate} style={{width:"100%",marginTop:10,padding:"11px 0",background:"#FAF7F5",color:"#5E1914",border:"1px solid #D1C7C1",borderRadius:8,fontSize:14,fontWeight:600}}>用模板生成本周课表</button>
        <div style={{marginTop:12,fontSize:12,color:"#8C827B"}}>已有模板 {templates.length} 条；生成时已存在的课次会跳过。</div>
      </form>
    </div>

    <div style={{marginTop:26}}>
      {weekdays.map((w,i)=>{
        const date=addDays(week,i);const list=sessions.filter(s=>s.session_date===date);
        return <div key={date} style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:600,color:"#5E1914",marginBottom:8}}>{w} · {date}</div>
          {list.length===0?<div style={{background:"#fff",border:"1px dashed #D1C7C1",borderRadius:10,padding:"14px 16px",fontSize:12,color:"#8C827B"}}>暂无课次</div>:
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {list.map(s=><div key={s.id} style={{background:"#fff",border:"1px solid #EBE4DF",borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:600,color:"#1C1415"}}>{s.start_time}-{s.end_time} · {s.course_name}</div>
              <div style={{fontSize:12,color:"#6D645D",marginTop:4}}>{s.coach_name} · {s.room_name||"未分配教室"} · 容量 {s.capacity}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
                <span style={{fontSize:11,color:s.status==="cancelled"?"#9E2A2B":"#2E7D4F"}}>{s.status==="cancelled"?"已取消":"可预约"}</span>
                <button onClick={()=>del(s.id)} style={{padding:"3px 10px",borderRadius:6,border:"1px solid #E0C9C5",background:"#FDF2F1",color:"#8A1F17",fontSize:11}}>删除</button>
              </div>
            </div>)}
          </div>}
        </div>;
      })}
    </div>
    <div style={{marginTop:20}}><a href="/admin/coach" style={{color:"#5E1914",fontSize:13}}>→ 打开教练今日课表</a></div>
  </div>;
}

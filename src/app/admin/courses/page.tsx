"use client";
import { useEffect, useState } from "react";

type Course = { id:number; key:string; name:string; duration_minutes:number; default_capacity:number; is_active:number };
type Room = { id:number; name:string; capacity:number; is_active:number };

async function jf(url:string, init?:RequestInit){const r=await fetch(url,init);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"请求失败");return d;}

export default function AdminCoursesPage(){
  const [courses,setCourses]=useState<Course[]>([]);
  const [rooms,setRooms]=useState<Room[]>([]);
  const [msg,setMsg]=useState("");
  const [c,setC]=useState({key:"",name:"",durationMinutes:"60",defaultCapacity:"6",color:"",sortOrder:"0"});
  const [r,setR]=useState({name:"",capacity:"10"});
  const load=async()=>{try{const [a,b]=await Promise.all([jf("/api/admin/courses"),jf("/api/admin/rooms")]);setCourses(a);setRooms(b);}catch(e:any){setMsg(e.message);}};
  useEffect(()=>{load();},[]);
  const addCourse=async(e:React.FormEvent)=>{e.preventDefault();setMsg("");try{await jf("/api/admin/courses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...c,durationMinutes:Number(c.durationMinutes),defaultCapacity:Number(c.defaultCapacity),sortOrder:Number(c.sortOrder)})});setC({key:"",name:"",durationMinutes:"60",defaultCapacity:"6",color:"",sortOrder:"0"});await load();setMsg("课程已新增");}catch(e:any){setMsg(e.message);}};
  const addRoom=async(e:React.FormEvent)=>{e.preventDefault();setMsg("");try{await jf("/api/admin/rooms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:r.name,capacity:Number(r.capacity)})});setR({name:"",capacity:"10"});await load();setMsg("教室已新增");}catch(e:any){setMsg(e.message);}};
  const toggleCourse=async(x:Course)=>{try{await jf("/api/admin/courses",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:x.id,isActive:x.is_active?0:1})});await load();}catch(e:any){setMsg(e.message);}};
  const toggleRoom=async(x:Room)=>{try{await jf("/api/admin/rooms",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:x.id,isActive:x.is_active?0:1})});await load();}catch(e:any){setMsg(e.message);}};
  const input={width:"100%",padding:"9px 12px",borderRadius:6,border:"1px solid #D1C7C1",fontSize:13,boxSizing:"border-box" as const};
  return <div style={{maxWidth:1100,margin:"0 auto",padding:"40px 20px",fontFamily:"-apple-system, sans-serif"}}>
    <div style={{fontSize:13,color:"#8B5E3C",marginBottom:6}}>后台 / 课程与教室</div>
    <h1 style={{fontSize:26,fontWeight:700,color:"#1C1415",margin:0}}>课程类目与教室</h1>
    <p style={{fontSize:13,color:"#7A6B69",marginTop:8}}>课程类目决定排课下拉项；教室决定容量与冲突提示。停用不会删除历史课次。</p>
    {msg&&<div style={{background:"#FFF8E1",border:"1px solid #F0D9A8",color:"#6B4E16",padding:"10px 14px",borderRadius:8,margin:"16px 0",fontSize:13}}>{msg}</div>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginTop:22}}>
      <form onSubmit={addCourse} style={{background:"#fff",border:"1px solid #EBE4DF",borderRadius:12,padding:20}}>
        <h2 style={{fontSize:16,margin:"0 0 14px",color:"#5E1914"}}>新增课程类目</h2>
        <input style={input} placeholder="key（英文小写，如 yoga）" value={c.key} onChange={e=>setC({...c,key:e.target.value})}/>
        <div style={{height:10}}/>
        <input style={input} placeholder="课程名称，如 瑜伽" value={c.name} onChange={e=>setC({...c,name:e.target.value})}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
          <input style={input} type="number" placeholder="时长(分钟)" value={c.durationMinutes} onChange={e=>setC({...c,durationMinutes:e.target.value})}/>
          <input style={input} type="number" placeholder="默认容量" value={c.defaultCapacity} onChange={e=>setC({...c,defaultCapacity:e.target.value})}/>
        </div>
        <button style={{width:"100%",marginTop:12,padding:"11px 0",background:"#5E1914",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:600}}>新增课程</button>
      </form>
      <form onSubmit={addRoom} style={{background:"#fff",border:"1px solid #EBE4DF",borderRadius:12,padding:20}}>
        <h2 style={{fontSize:16,margin:"0 0 14px",color:"#5E1914"}}>新增教室</h2>
        <input style={input} placeholder="教室名称" value={r.name} onChange={e=>setR({...r,name:e.target.value})}/>
        <div style={{height:10}}/>
        <input style={input} type="number" placeholder="容纳人数" value={r.capacity} onChange={e=>setR({...r,capacity:e.target.value})}/>
        <button style={{width:"100%",marginTop:12,padding:"11px 0",background:"#0D0C0F",color:"#F6E6DA",border:"none",borderRadius:8,fontSize:14,fontWeight:600}}>新增教室</button>
      </form>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:20,marginTop:22}}>
      <div style={{background:"#fff",border:"1px solid #EBE4DF",borderRadius:12,overflow:"hidden"}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid #EBE4DF",fontWeight:600}}>课程类目</div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><tbody>
          {courses.map(x=><tr key={x.id} style={{borderTop:"1px solid #F0EAE6"}}>
            <td style={{padding:"12px 16px"}}>{x.name}<div style={{fontSize:11,color:"#8C827B"}}>{x.key}</div></td>
            <td style={{padding:"12px 16px"}}>{x.duration_minutes}分钟 / {x.default_capacity}人</td>
            <td style={{padding:"12px 16px",textAlign:"right"}}><button onClick={()=>toggleCourse(x)} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #D1C7C1",background:"#FAF7F5",fontSize:12}}>{x.is_active?"停用":"启用"}</button></td>
          </tr>)}
        </tbody></table>
      </div>
      <div style={{background:"#fff",border:"1px solid #EBE4DF",borderRadius:12,overflow:"hidden"}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid #EBE4DF",fontWeight:600}}>教室</div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><tbody>
          {rooms.map(x=><tr key={x.id} style={{borderTop:"1px solid #F0EAE6"}}>
            <td style={{padding:"12px 16px"}}>{x.name}</td>
            <td style={{padding:"12px 16px"}}>{x.capacity}人</td>
            <td style={{padding:"12px 16px",textAlign:"right"}}><button onClick={()=>toggleRoom(x)} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #D1C7C1",background:"#FAF7F5",fontSize:12}}>{x.is_active?"停用":"启用"}</button></td>
          </tr>)}
        </tbody></table>
      </div>
    </div>
  </div>;
}

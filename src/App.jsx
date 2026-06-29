import { useState, useEffect, useRef } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getDatabase, ref, set, get, push, onValue, update, query,
  orderByChild, equalTo, limitToLast
} from "firebase/database";

// ─── Firebase ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyB3sCIQ2YbXfxweb9FAHtYfE2JNi6FvbmY",
  authDomain: "bubblechat-bdb1b.firebaseapp.com",
  projectId: "bubblechat-bdb1b",
  databaseURL: "https://bubblechat-ee3a3-default-rtdb.firebaseio.com",
  storageBucket: "bubblechat-bdb1b.firebasestorage.app",
  messagingSenderId: "1019693296630",
  appId: "1:1019693296630:web:e15acda3f36e752c4db5d7",
};

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(firebaseApp);

// ─── Constants ────────────────────────────────────────────────────────────
const MESSAGE_EFFECTS = [
  { id: "none", label: "None", icon: "💬" },
  { id: "fireworks", label: "Fireworks", icon: "🎆" },
  { id: "confetti", label: "Confetti", icon: "🎉" },
  { id: "balloons", label: "Balloons", icon: "🎈" },
  { id: "lasers", label: "Lasers", icon: "✨" },
  { id: "rain", label: "Rain", icon: "🌧️" },
  { id: "snow", label: "Snow", icon: "❄️" },
  { id: "hearts", label: "Hearts", icon: "❤️" },
  { id: "stars", label: "Stars", icon: "⭐" },
  { id: "spotlight", label: "Spotlight", icon: "💡" },
];

const TEXT_EFFECTS = [
  { id: "none", label: "Normal" },
  { id: "wiggle", label: "Wiggle" },
  { id: "shake", label: "Shake" },
  { id: "jump", label: "Jump" },
  { id: "explode", label: "Explode" },
  { id: "wave", label: "Wave" },
  { id: "spin", label: "Spin" },
  { id: "rainbow", label: "Rainbow" },
  { id: "typewriter", label: "Typewriter" },
  { id: "bounce", label: "Bounce" },
  { id: "pulse", label: "Pulse" },
  { id: "glitch", label: "Glitch" },
];

const ACCENT_COLORS = ["#5B6CF0","#E85D75","#22C9A5","#F5A623","#9B59B6","#E67E22","#1ABC9C","#E74C3C"];

function randomColor() { return ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)]; }
function getInitials(name) { return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2); }
function mkThreadKey(a, b) { return [a, b].sort().join("_"); }
function sanitize(str) { return str.replace(/[.#$[\]]/g, "_"); }

let SESSION = null;

// ─── Particle Canvas ──────────────────────────────────────────────────────
function ParticleEffect({ effect, onDone }) {
  const canvasRef = useRef();
  useEffect(() => {
    if (!effect || effect === "none") { onDone?.(); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let particles = [];
    let frame;
    const configs = {
      fireworks: { count:120, colors:["#ff4444","#ffaa00","#ffff00","#ff8800","#fff"], shapes:["circle"], gravity:0.15, life:90, spread:8 },
      confetti:  { count:200, colors:["#ff6b9d","#c85aff","#00d4ff","#ffdd00","#00e676","#ff9800"], shapes:["rect","circle"], gravity:0.08, life:160, spread:12 },
      balloons:  { count:30, colors:["#ff6b9d","#c85aff","#00d4ff","#ffdd00"], shapes:["balloon"], gravity:-0.06, life:200, spread:4 },
      lasers:    { count:60, colors:["#00ffff","#ff00ff","#fff","#ffff00"], shapes:["line"], gravity:0, life:50, spread:15 },
      rain:      { count:150, colors:["#88ccff","#aaddff","#cceeff"], shapes:["rain"], gravity:0.3, life:80, spread:2 },
      snow:      { count:120, colors:["#fff","#ddeeff","#eef4ff"], shapes:["circle"], gravity:0.04, life:200, spread:1 },
      hearts:    { count:60, colors:["#ff4d79","#ff99bb","#ff2255","#ff80a0"], shapes:["heart"], gravity:-0.05, life:160, spread:4 },
      stars:     { count:80, colors:["#ffdd00","#ffaa00","#fff","#fffacc"], shapes:["star"], gravity:-0.02, life:140, spread:6 },
      spotlight: { count:40, colors:["#fffbe0","#fff0a0","#ffe060"], shapes:["circle"], gravity:0, life:100, spread:3 },
    };
    const cfg = configs[effect] || configs.confetti;
    const cx = canvas.width/2, cy = canvas.height/2;
    for (let i = 0; i < cfg.count; i++) {
      const angle = Math.random()*Math.PI*2, speed = Math.random()*cfg.spread+1;
      particles.push({
        x:cx+(Math.random()-0.5)*200, y:effect==="rain"?Math.random()*canvas.height*0.3:cy+(Math.random()-0.5)*100,
        vx:Math.cos(angle)*speed*(effect==="rain"?0.2:1), vy:Math.sin(angle)*speed,
        color:cfg.colors[Math.floor(Math.random()*cfg.colors.length)],
        shape:cfg.shapes[Math.floor(Math.random()*cfg.shapes.length)],
        life:cfg.life+Math.random()*30, maxLife:cfg.life+30,
        size:Math.random()*8+3, rotation:Math.random()*Math.PI*2, rotSpeed:(Math.random()-0.5)*0.2,
      });
    }
    function drawParticle(p) {
      ctx.save(); ctx.globalAlpha=Math.max(0,p.life/p.maxLife);
      ctx.fillStyle=p.color; ctx.strokeStyle=p.color;
      ctx.translate(p.x,p.y); ctx.rotate(p.rotation);
      switch(p.shape) {
        case "circle": ctx.beginPath(); ctx.arc(0,0,p.size,0,Math.PI*2); ctx.fill(); break;
        case "rect": ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*0.6); break;
        case "heart":
          ctx.beginPath(); ctx.moveTo(0,p.size*0.3);
          ctx.bezierCurveTo(p.size*0.5,-p.size*0.3,p.size,p.size*0.1,0,p.size);
          ctx.bezierCurveTo(-p.size,p.size*0.1,-p.size*0.5,-p.size*0.3,0,p.size*0.3);
          ctx.fill(); break;
        case "star":
          ctx.beginPath();
          for(let j=0;j<5;j++){
            const a=(j*4*Math.PI)/5-Math.PI/2,b=(j*4*Math.PI)/5+(2*Math.PI)/10-Math.PI/2;
            if(j===0)ctx.moveTo(Math.cos(a)*p.size,Math.sin(a)*p.size);
            else ctx.lineTo(Math.cos(a)*p.size,Math.sin(a)*p.size);
            ctx.lineTo(Math.cos(b)*p.size*0.4,Math.sin(b)*p.size*0.4);
          }
          ctx.closePath(); ctx.fill(); break;
        case "balloon":
          ctx.beginPath(); ctx.ellipse(0,0,p.size*0.8,p.size,0,0,Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(0,p.size); ctx.lineTo(0,p.size*2); ctx.lineWidth=1; ctx.stroke(); break;
        case "line": ctx.beginPath(); ctx.moveTo(-p.size*2,0); ctx.lineTo(p.size*2,0); ctx.lineWidth=2; ctx.stroke(); break;
        case "rain": ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,p.size*2); ctx.lineWidth=1.5; ctx.stroke(); break;
      }
      ctx.restore();
    }
    function animate() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      particles=particles.filter(p=>p.life>0);
      particles.forEach(p=>{p.vy+=cfg.gravity;p.x+=p.vx;p.y+=p.vy;p.life--;p.rotation+=p.rotSpeed;drawParticle(p);});
      if(particles.length>0) frame=requestAnimationFrame(animate);
      else onDone?.();
    }
    frame=requestAnimationFrame(animate);
    return()=>cancelAnimationFrame(frame);
  },[effect]);
  if(!effect||effect==="none") return null;
  return <canvas ref={canvasRef} style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:9999}}/>;
}

// ─── Animated Text ────────────────────────────────────────────────────────
function AnimatedText({ text, effect }) {
  const [tick,setTick]=useState(0);
  const [typed,setTyped]=useState(effect==="typewriter"?0:text.length);
  useEffect(()=>{
    if(!effect||effect==="none") return;
    const id=setInterval(()=>setTick(t=>t+1),50);
    return()=>clearInterval(id);
  },[effect]);
  useEffect(()=>{
    if(effect!=="typewriter"){setTyped(text.length);return;}
    setTyped(0);let i=0;
    const id=setInterval(()=>{i++;setTyped(i);if(i>=text.length)clearInterval(id);},40);
    return()=>clearInterval(id);
  },[text,effect]);
  if(!effect||effect==="none") return <span>{text}</span>;
  const displayText=text.slice(0,typed);
  const charStyle=(i)=>{
    const t=tick,base={display:"inline-block",whiteSpace:"pre"};
    switch(effect){
      case "wiggle": return{...base,transform:`rotate(${Math.sin((t+i*0.8)*0.3)*15}deg)`};
      case "shake": return{...base,transform:`translateX(${Math.sin((t+i)*1.5)*3}px) translateY(${Math.cos((t+i*1.2)*1.5)*2}px)`};
      case "jump": return{...base,transform:`translateY(${Math.sin((t*0.15+i*0.7))<0?Math.sin((t*0.15+i*0.7))*10:0}px)`};
      case "explode": return{...base,transform:`translateX(${Math.sin(t*0.2+i*2.1)*(3+i*0.5)}px) translateY(${Math.cos(t*0.2+i*1.7)*(2+i*0.3)}px) scale(${1+Math.sin(t*0.3+i)*0.15})`};
      case "wave": return{...base,transform:`translateY(${Math.sin(t*0.2-i*0.4)*6}px)`};
      case "spin": return{...base,transform:`rotateY(${t*3+i*20}deg)`};
      case "rainbow": return{...base,color:`hsl(${(t*3+i*30)%360},90%,50%)`};
      case "bounce": return{...base,transform:`translateY(${Math.abs(Math.sin(t*0.2+i*0.5))*-8}px)`};
      case "pulse": return{...base,transform:`scale(${1+Math.sin(t*0.2+i*0.5)*0.15})`,opacity:0.7+Math.sin(t*0.15+i*0.4)*0.3};
      case "glitch":{const g=Math.sin(t*0.5+i)>0.7?Math.random()*4-2:0;return{...base,transform:`translateX(${g}px)`,color:g!==0?(Math.random()>0.5?"#ff00ff":"#00ffff"):"inherit"};}
      default: return base;
    }
  };
  return <span>{displayText.split("").map((ch,i)=><span key={i} style={charStyle(i)}>{ch}</span>)}</span>;
}

// ─── Avatar ───────────────────────────────────────────────────────────────
function Avatar({user,size=36}){
  return(
    <div style={{width:size,height:size,borderRadius:"50%",background:user.color,color:"#fff",
      display:"flex",alignItems:"center",justifyContent:"center",
      fontWeight:600,fontSize:size*0.36,flexShrink:0,border:"2px solid rgba(255,255,255,0.2)"}}>
      {getInitials(user.name)}
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────
function AuthScreen({onLogin}){
  const [tab,setTab]=useState("login");
  const [name,setName]=useState("");
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  async function handleLogin(){
    setError("");setLoading(true);
    try{
      if(!username.trim()||!password.trim()){setError("Enter your username and password.");setLoading(false);return;}
      const uname=sanitize(username.trim().toLowerCase());
      const snap=await get(ref(db,`users/${uname}`));
      if(!snap.exists()){setError("No account found with that username.");setLoading(false);return;}
      const userData=snap.val();
      if(userData.password!==password){setError("Wrong password.");setLoading(false);return;}
      SESSION=userData;onLogin(userData);
    }catch(e){
      console.error(e);
      setError("Error: "+e.message);
    }
    setLoading(false);
  }

  async function handleSignup(){
    setError("");setLoading(true);
    try{
      if(!name.trim()||!username.trim()||!password.trim()){setError("All fields are required.");setLoading(false);return;}
      if(password.length<4){setError("Password must be at least 4 characters.");setLoading(false);return;}
      const uname=sanitize(username.trim().toLowerCase());
      const snap=await get(ref(db,`users/${uname}`));
      if(snap.exists()){setError("Username taken — try another.");setLoading(false);return;}
      const user={id:uname,name:name.trim(),username:uname,password,color:randomColor(),joinedAt:Date.now()};
      await set(ref(db,`users/${uname}`),user);
      SESSION=user;onLogin(user);
    }catch(e){
      console.error(e);
      setError("Error: "+e.message);
    }
    setLoading(false);
  }

  const inp={width:"100%",padding:"12px 14px",borderRadius:10,border:"1.5px solid #e0e0e0",
    fontSize:15,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#fafafa",color:"#1a1a2e"};

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)",
      display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui,sans-serif"}}>
      <style>{`
        @keyframes f0{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-30px)}}
        @keyframes f1{0%,100%{transform:translate(0,0)}50%{transform:translate(-15px,25px)}}
        @keyframes f2{0%,100%{transform:translate(0,0)}50%{transform:translate(10px,-20px)}}
        @keyframes f3{0%,100%{transform:translate(0,0)}50%{transform:translate(-20px,15px)}}
      `}</style>
      <div style={{position:"fixed",inset:0,overflow:"hidden",pointerEvents:"none"}}>
        {[...Array(4)].map((_,i)=>(
          <div key={i} style={{position:"absolute",
            width:[300,200,250,180][i],height:[300,200,250,180][i],borderRadius:"50%",
            background:["rgba(91,108,240,0.15)","rgba(232,93,117,0.1)","rgba(34,201,165,0.08)","rgba(91,108,240,0.12)"][i],
            left:["10%","70%","30%","80%"][i],top:["10%","15%","60%","70%"][i],
            animation:`f${i} ${[8,12,10,9][i]}s ease-in-out infinite`}}/>
        ))}
      </div>
      <div style={{background:"rgba(255,255,255,0.97)",borderRadius:24,padding:"40px 36px",
        width:400,maxWidth:"90vw",boxShadow:"0 32px 80px rgba(0,0,0,0.35)",position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:60,height:60,borderRadius:16,background:"linear-gradient(135deg,#5B6CF0,#E85D75)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 12px",
            boxShadow:"0 8px 20px rgba(91,108,240,0.35)"}}>💬</div>
          <h1 style={{margin:0,fontSize:26,fontWeight:800,color:"#1a1a2e"}}>BubbleChat</h1>
          <p style={{margin:"4px 0 0",color:"#888",fontSize:14}}>Real-time messaging with magic ✨</p>
        </div>
        <div style={{display:"flex",background:"#f5f5f7",borderRadius:10,padding:4,marginBottom:24}}>
          {["login","signup"].map(t=>(
            <button key={t} type="button" onClick={()=>{setTab(t);setError("");}} style={{
              flex:1,padding:"8px 0",borderRadius:8,border:"none",cursor:"pointer",
              background:tab===t?"#fff":"transparent",fontWeight:tab===t?600:400,fontSize:14,
              color:tab===t?"#1a1a2e":"#888",boxShadow:tab===t?"0 2px 8px rgba(0,0,0,0.1)":"none"}}>
              {t==="login"?"Log in":"Sign up"}
            </button>
          ))}
        </div>
        {error&&<div style={{background:"#fff0f0",border:"1px solid #ffc0c0",borderRadius:8,
          padding:"10px 14px",marginBottom:16,fontSize:14,color:"#c0392b"}}>{error}</div>}
        {tab==="login"?(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <input style={inp} placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
            <input style={inp} type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
            <button type="button" onClick={handleLogin} disabled={loading} style={{
              padding:"13px",borderRadius:10,border:"none",cursor:"pointer",
              background:"linear-gradient(135deg,#5B6CF0,#7B4FF0)",color:"#fff",
              fontWeight:700,fontSize:16,marginTop:4,opacity:loading?0.7:1,
              boxShadow:"0 4px 15px rgba(91,108,240,0.4)"}}>
              {loading?"Logging in…":"Log in"}
            </button>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <input style={inp} placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSignup()}/>
            <input style={inp} placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSignup()}/>
            <input style={inp} type="password" placeholder="Password (min 4 chars)" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSignup()}/>
            <button type="button" onClick={handleSignup} disabled={loading} style={{
              padding:"13px",borderRadius:10,border:"none",cursor:"pointer",
              background:"linear-gradient(135deg,#E85D75,#F0A030)",color:"#fff",
              fontWeight:700,fontSize:16,marginTop:4,opacity:loading?0.7:1,
              boxShadow:"0 4px 15px rgba(232,93,117,0.4)"}}>
              {loading?"Creating account…":"Create account"}
            </button>
          </div>
        )}
        <p style={{textAlign:"center",color:"#bbb",fontSize:12,marginTop:20,marginBottom:0}}>
          Accounts are shared — anyone with the link can sign up & chat 🌐
        </p>
      </div>
    </div>
  );
}

// ─── Effect Picker ────────────────────────────────────────────────────────
function EffectPicker({selectedEffect,selectedTextEffect,onEffectChange,onTextEffectChange,onClose}){
  return(
    <div style={{position:"absolute",bottom:"100%",left:0,right:0,background:"#fff",
      border:"1px solid #eee",borderRadius:16,boxShadow:"0 -8px 32px rgba(0,0,0,0.15)",
      padding:16,marginBottom:8,zIndex:100}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontWeight:700,fontSize:14,color:"#1a1a2e"}}>Message Effects</span>
        <button type="button" onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#999"}}>✕</button>
      </div>
      <p style={{fontSize:12,color:"#999",margin:"0 0 8px"}}>Screen effect</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
        {MESSAGE_EFFECTS.map(ef=>(
          <button type="button" key={ef.id} onClick={()=>onEffectChange(ef.id)} style={{
            padding:"6px 10px",borderRadius:20,border:"1.5px solid",
            borderColor:selectedEffect===ef.id?"#5B6CF0":"#eee",
            background:selectedEffect===ef.id?"#f0f1ff":"#fff",
            cursor:"pointer",fontSize:12,fontWeight:selectedEffect===ef.id?600:400,
            color:selectedEffect===ef.id?"#5B6CF0":"#555",display:"flex",alignItems:"center",gap:4}}>
            {ef.icon} {ef.label}
          </button>
        ))}
      </div>
      <p style={{fontSize:12,color:"#999",margin:"0 0 8px"}}>Text animation</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {TEXT_EFFECTS.map(ef=>(
          <button type="button" key={ef.id} onClick={()=>onTextEffectChange(ef.id)} style={{
            padding:"6px 10px",borderRadius:20,border:"1.5px solid",
            borderColor:selectedTextEffect===ef.id?"#E85D75":"#eee",
            background:selectedTextEffect===ef.id?"#fff0f3":"#fff",
            cursor:"pointer",fontSize:12,fontWeight:selectedTextEffect===ef.id?600:400,
            color:selectedTextEffect===ef.id?"#E85D75":"#555"}}>
            {ef.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────
function MessageBubble({msg,isOwn,senderUser,msgKey,threadKey}){
  const [showReact,setShowReact]=useState(false);
  const emojis=["❤️","😂","😮","😢","👍","🔥"];
  async function addReaction(emoji){
    setShowReact(false);
    const reactions={...(msg.reactions||{}),[emoji]:((msg.reactions||{})[emoji]||0)+1};
    try{await update(ref(db,`messages/${threadKey}/${msgKey}`),{reactions});}catch{}
  }
  return(
    <div style={{display:"flex",flexDirection:isOwn?"row-reverse":"row",alignItems:"flex-end",gap:8,marginBottom:4}}>
      {!isOwn&&senderUser&&<Avatar user={senderUser} size={30}/>}
      <div style={{maxWidth:"70%",minWidth:60}}>
        {!isOwn&&senderUser&&<div style={{fontSize:11,color:"#999",marginBottom:3,paddingLeft:2}}>{senderUser.name}</div>}
        <div style={{position:"relative"}}>
          <div onMouseEnter={()=>setShowReact(true)} onMouseLeave={()=>setShowReact(false)}
            style={{background:isOwn?"linear-gradient(135deg,#5B6CF0,#7B4FF0)":"#f2f2f7",
              color:isOwn?"#fff":"#1a1a2e",padding:"10px 14px",
              borderRadius:isOwn?"18px 18px 4px 18px":"18px 18px 18px 4px",
              fontSize:15,lineHeight:1.45,wordBreak:"break-word",
              boxShadow:isOwn?"0 4px 12px rgba(91,108,240,0.25)":"0 2px 8px rgba(0,0,0,0.08)"}}>
            <AnimatedText text={msg.text} effect={msg.textEffect}/>
            {msg.effect&&msg.effect!=="none"&&(
              <span style={{marginLeft:6,fontSize:14}}>{MESSAGE_EFFECTS.find(e=>e.id===msg.effect)?.icon}</span>
            )}
            {showReact&&(
              <div style={{position:"absolute",[isOwn?"right":"left"]:0,bottom:"100%",
                background:"#fff",borderRadius:20,boxShadow:"0 4px 20px rgba(0,0,0,0.15)",
                padding:"6px 10px",display:"flex",gap:6,zIndex:10,marginBottom:4}}>
                {emojis.map(e=>(
                  <button type="button" key={e} onClick={()=>addReaction(e)}
                    style={{background:"none",border:"none",cursor:"pointer",fontSize:18,padding:2}}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {msg.reactions&&Object.keys(msg.reactions).length>0&&(
          <div style={{display:"flex",gap:4,marginTop:4,justifyContent:isOwn?"flex-end":"flex-start"}}>
            {Object.entries(msg.reactions).map(([emoji,count])=>(
              <div key={emoji} style={{background:"#fff",border:"1px solid #eee",borderRadius:10,
                padding:"2px 6px",fontSize:12,display:"flex",alignItems:"center",gap:3}}>
                {emoji}<span style={{color:"#888"}}>{count}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{fontSize:11,color:"#bbb",marginTop:3,textAlign:isOwn?"right":"left"}}>
          {msg.at?new Date(msg.at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""}
          {isOwn&&<span style={{marginLeft:4}}>✓</span>}
        </div>
      </div>
      {isOwn&&senderUser&&<Avatar user={senderUser} size={30}/>}
    </div>
  );
}

// ─── Conversation View ────────────────────────────────────────────────────
function ConversationView({currentUser,contact,onBack}){
  const [messages,setMessages]=useState([]);
  const [text,setText]=useState("");
  const [effect,setEffect]=useState("none");
  const [textEffect,setTextEffect]=useState("none");
  const [showEffects,setShowEffects]=useState(false);
  const [activeEffect,setActiveEffect]=useState(null);
  const [isTyping,setIsTyping]=useState(false);
  const endRef=useRef();
  const tk=mkThreadKey(currentUser.id,contact.id);

  useEffect(()=>{
    const msgsRef=ref(db,`messages/${tk}`);
    const unsub=onValue(msgsRef,snap=>{
      if(!snap.exists()){setMessages([]);return;}
      const data=snap.val();
      const list=Object.entries(data).map(([key,val])=>({...val,_key:key}));
      list.sort((a,b)=>a.at-b.at);
      setMessages(list);
    });
    return()=>unsub();
  },[tk]);

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[messages,isTyping]);

  async function sendMessage(){
    if(!text.trim()) return;
    const sentText=text.trim();
    setText("");
    const msgData={threadKey:tk,senderId:currentUser.id,text:sentText,effect,textEffect,at:Date.now(),reactions:{}};
    await push(ref(db,`messages/${tk}`),msgData);
    if(effect!=="none") setActiveEffect(effect);
    setEffect("none");setTextEffect("none");
    setIsTyping(true);
    try{
      const recent=messages.slice(-6);
      const response=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6",max_tokens:1000,
          system:`You are ${contact.name}, a real human friend on BubbleChat. Reply casually and briefly (1-3 sentences). Be warm and funny. Use emojis occasionally. Never say you're an AI.`,
          messages:[
            ...recent.map(m=>({role:m.senderId===currentUser.id?"user":"assistant",content:m.text})),
            {role:"user",content:sentText}
          ]
        })
      });
      const data=await response.json();
      const replyText=data.content?.[0]?.text||"😄";
      const replyEffects=["none","none","none","none","wiggle","wave","bounce","rainbow","none"];
      await push(ref(db,`messages/${tk}`),{
        threadKey:tk,senderId:contact.id,
        text:replyText,effect:"none",
        textEffect:replyEffects[Math.floor(Math.random()*replyEffects.length)],
        at:Date.now()+100,reactions:{}
      });
    }catch(e){console.error(e);}
    finally{setIsTyping(false);}
  }

  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:"#f8f9fa"}}>
      {activeEffect&&<ParticleEffect effect={activeEffect} onDone={()=>setActiveEffect(null)}/>}
      <div style={{background:"#fff",borderBottom:"1px solid #eee",padding:"12px 16px",
        display:"flex",alignItems:"center",gap:12,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
        <button type="button" onClick={onBack} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#5B6CF0",padding:0}}>←</button>
        <Avatar user={contact} size={38}/>
        <div>
          <div style={{fontWeight:700,fontSize:16,color:"#1a1a2e"}}>{contact.name}</div>
          <div style={{fontSize:12,color:"#22C9A5"}}>● Active now</div>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:2}}>
        {messages.length===0&&(
          <div style={{textAlign:"center",color:"#bbb",marginTop:60}}>
            <div style={{fontSize:48,marginBottom:12}}>👋</div>
            <div style={{fontWeight:600,color:"#999"}}>Start a conversation!</div>
            <div style={{fontSize:13,color:"#ccc",marginTop:4}}>Try adding a fun effect ✨</div>
          </div>
        )}
        {messages.map((msg,i)=>{
          const isOwn=msg.senderId===currentUser.id;
          const prev=messages[i-1];
          const showDate=!prev||new Date(msg.at).toDateString()!==new Date(prev.at).toDateString();
          const senderUser=msg.senderId===currentUser.id?currentUser:contact;
          return(
            <div key={msg._key}>
              {showDate&&<div style={{textAlign:"center",color:"#ccc",fontSize:12,margin:"12px 0 8px"}}>
                {new Date(msg.at).toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"})}
              </div>}
              <MessageBubble msg={msg} isOwn={isOwn} senderUser={senderUser} msgKey={msg._key} threadKey={tk}/>
            </div>
          );
        })}
        {isTyping&&(
          <div style={{display:"flex",alignItems:"flex-end",gap:8,marginTop:4}}>
            <Avatar user={contact} size={30}/>
            <div style={{background:"#f2f2f7",borderRadius:"18px 18px 18px 4px",padding:"10px 16px",display:"flex",gap:4,alignItems:"center"}}>
              {[0,1,2].map(j=><div key={j} style={{width:7,height:7,borderRadius:"50%",background:"#bbb",animation:`dot 0.8s ease-in-out ${j*0.15}s infinite alternate`}}/>)}
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>
      <div style={{background:"#fff",borderTop:"1px solid #eee",padding:"10px 12px",position:"relative"}}>
        {showEffects&&(
          <EffectPicker selectedEffect={effect} selectedTextEffect={textEffect}
            onEffectChange={setEffect} onTextEffectChange={setTextEffect}
            onClose={()=>setShowEffects(false)}/>
        )}
        {(effect!=="none"||textEffect!=="none")&&(
          <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
            {effect!=="none"&&<div style={{background:"#f0f1ff",borderRadius:12,padding:"4px 10px",fontSize:12,color:"#5B6CF0",display:"flex",alignItems:"center",gap:4}}>
              {MESSAGE_EFFECTS.find(e=>e.id===effect)?.icon} {MESSAGE_EFFECTS.find(e=>e.id===effect)?.label}
              <button type="button" onClick={()=>setEffect("none")} style={{background:"none",border:"none",cursor:"pointer",color:"#5B6CF0",fontSize:14,padding:0,lineHeight:1}}>✕</button>
            </div>}
            {textEffect!=="none"&&<div style={{background:"#fff0f3",borderRadius:12,padding:"4px 10px",fontSize:12,color:"#E85D75",display:"flex",alignItems:"center",gap:4}}>
              Aa {TEXT_EFFECTS.find(e=>e.id===textEffect)?.label}
              <button type="button" onClick={()=>setTextEffect("none")} style={{background:"none",border:"none",cursor:"pointer",color:"#E85D75",fontSize:14,padding:0,lineHeight:1}}>✕</button>
            </div>}
          </div>
        )}
        <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
          <button type="button" onClick={()=>setShowEffects(s=>!s)} style={{
            background:showEffects?"#f0f1ff":"#f5f5f7",border:"none",borderRadius:20,
            padding:"8px 12px",cursor:"pointer",fontSize:18,flexShrink:0,
            color:showEffects?"#5B6CF0":"#555"}}>✨</button>
          <textarea value={text} onChange={e=>setText(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}}
            placeholder="Message…" rows={1}
            style={{flex:1,padding:"10px 14px",borderRadius:20,border:"1.5px solid #e8e8e8",
              fontSize:15,resize:"none",fontFamily:"inherit",outline:"none",background:"#fafafa",
              maxHeight:100,overflowY:"auto",lineHeight:1.4,color:"#1a1a2e",boxSizing:"border-box"}}/>
          <button type="button" onClick={sendMessage} disabled={!text.trim()} style={{
            background:text.trim()?"linear-gradient(135deg,#5B6CF0,#7B4FF0)":"#e8e8e8",
            border:"none",borderRadius:"50%",width:40,height:40,
            cursor:text.trim()?"pointer":"default",fontSize:18,
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
            boxShadow:text.trim()?"0 4px 12px rgba(91,108,240,0.35)":"none"}}>↑</button>
        </div>
      </div>
      <style>{`@keyframes dot{0%{transform:translateY(0)}100%{transform:translateY(-6px)}}`}</style>
    </div>
  );
}

// ─── People Screen ────────────────────────────────────────────────────────
function PeopleScreen({currentUser,onOpenChat}){
  const [allUsers,setAllUsers]=useState([]);
  const [search,setSearch]=useState("");
  const [tab,setTab]=useState("chats");
  const [lastMessages,setLastMessages]=useState({});

  useEffect(()=>{
    const unsub=onValue(ref(db,"users"),snap=>{
      if(!snap.exists()){setAllUsers([]);return;}
      const list=Object.values(snap.val()).filter(u=>u.id!==currentUser.id);
      setAllUsers(list);
    });
    return()=>unsub();
  },[currentUser.id]);

  useEffect(()=>{
    if(allUsers.length===0) return;
    const unsubs=allUsers.map(u=>{
      const tk=mkThreadKey(currentUser.id,u.id);
      return onValue(ref(db,`messages/${tk}`),snap=>{
        if(!snap.exists()){setLastMessages(prev=>({...prev,[u.id]:null}));return;}
        const msgs=Object.values(snap.val()).sort((a,b)=>b.at-a.at);
        setLastMessages(prev=>({...prev,[u.id]:msgs[0]||null}));
      });
    });
    return()=>unsubs.forEach(u=>u());
  },[allUsers,currentUser.id]);

  const filtered=allUsers.filter(u=>
    u.name.toLowerCase().includes(search.toLowerCase())||
    u.username.toLowerCase().includes(search.toLowerCase())
  );
  const chats=filtered.filter(u=>lastMessages[u.id]);
  const list=tab==="chats"?chats:filtered;

  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:"#fff"}}>
      <div style={{padding:"20px 16px 12px",borderBottom:"1px solid #f0f0f0"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <h2 style={{margin:0,fontSize:22,fontWeight:800,color:"#1a1a2e"}}>BubbleChat</h2>
          <Avatar user={currentUser} size={34}/>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search people…"
          style={{width:"100%",padding:"10px 14px",borderRadius:12,border:"none",
            background:"#f5f5f7",fontSize:14,outline:"none",color:"#1a1a2e",
            boxSizing:"border-box",fontFamily:"inherit"}}/>
        <div style={{display:"flex",gap:0,marginTop:12}}>
          {["chats","people"].map(t=>(
            <button type="button" key={t} onClick={()=>setTab(t)} style={{
              flex:1,padding:"8px 0",border:"none",background:"none",cursor:"pointer",
              fontWeight:tab===t?700:400,fontSize:14,color:tab===t?"#5B6CF0":"#aaa",
              borderBottom:tab===t?"2px solid #5B6CF0":"2px solid transparent"}}>
              {t==="chats"?"Chats":"All People"}
            </button>
          ))}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {list.length===0&&(
          <div style={{textAlign:"center",color:"#bbb",paddingTop:60}}>
            <div style={{fontSize:40,marginBottom:10}}>{tab==="chats"?"💬":"👥"}</div>
            <div style={{fontSize:14,padding:"0 20px"}}>
              {tab==="chats"?"No chats yet — go to People to start one!":"No other users yet. Share the link so friends can sign up!"}
            </div>
          </div>
        )}
        {list.map(user=>{
          const last=lastMessages[user.id];
          return(
            <button type="button" key={user.id} onClick={()=>onOpenChat(user)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:12,
                padding:"12px 16px",background:"none",border:"none",cursor:"pointer",
                borderBottom:"1px solid #f8f8f8",textAlign:"left"}}
              onMouseEnter={e=>e.currentTarget.style.background="#f9f9fb"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              <Avatar user={user} size={46}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                  <span style={{fontWeight:600,fontSize:15,color:"#1a1a2e"}}>{user.name}</span>
                  {last&&<span style={{fontSize:11,color:"#ccc"}}>
                    {new Date(last.at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                  </span>}
                </div>
                <div style={{fontSize:13,color:"#aaa",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {last?(last.senderId===currentUser.id?"You: ":"")+last.text:`@${user.username}`}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────
function ProfileScreen({currentUser,onLogout}){
  const [stats,setStats]=useState({sent:0,effects:0,textFx:0});
  useEffect(()=>{
    get(ref(db,"messages")).then(snap=>{
      if(!snap.exists()) return;
      const all=[];
      Object.values(snap.val()).forEach(thread=>Object.values(thread).forEach(m=>all.push(m)));
      const mine=all.filter(m=>m.senderId===currentUser.id);
      setStats({sent:mine.length,effects:mine.filter(m=>m.effect!=="none").length,textFx:mine.filter(m=>m.textEffect!=="none").length});
    });
  },[currentUser.id]);
  return(
    <div style={{height:"100%",overflowY:"auto",background:"#fff"}}>
      <div style={{padding:"28px 20px 20px",textAlign:"center",borderBottom:"1px solid #f0f0f0"}}>
        <Avatar user={currentUser} size={72}/>
        <h2 style={{margin:"14px 0 4px",fontWeight:800,color:"#1a1a2e"}}>{currentUser.name}</h2>
        <div style={{color:"#aaa",fontSize:14}}>@{currentUser.username}</div>
      </div>
      <div style={{padding:20}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:24}}>
          {[
            {label:"Messages sent",value:stats.sent,color:"#5B6CF0"},
            {label:"Screen effects",value:stats.effects,color:"#E85D75"},
            {label:"Text animations",value:stats.textFx,color:"#22C9A5"},
          ].map(s=>(
            <div key={s.label} style={{background:"#f9f9fb",borderRadius:14,padding:"14px 10px",textAlign:"center"}}>
              <div style={{fontSize:26,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:11,color:"#aaa",marginTop:3}}>{s.label}</div>
            </div>
          ))}
        </div>
        <button type="button" onClick={onLogout} style={{
          width:"100%",padding:"13px",borderRadius:12,border:"none",
          background:"#fff0f3",color:"#E85D75",fontWeight:700,fontSize:15,cursor:"pointer"}}>
          Sign out
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────
export default function App(){
  const [user,setUser]=useState(SESSION);
  const [activeChat,setActiveChat]=useState(null);
  const [bottomTab,setBottomTab]=useState("chats");
  function handleLogout(){SESSION=null;setUser(null);setActiveChat(null);}
  if(!user) return <AuthScreen onLogin={u=>{SESSION=u;setUser(u);}}/>;
  return(
    <div style={{width:"100%",maxWidth:480,margin:"0 auto",height:"100vh",
      display:"flex",flexDirection:"column",background:"#fff",
      fontFamily:"system-ui,-apple-system,sans-serif",
      boxShadow:"0 0 0 1px #eee",overflow:"hidden"}}>
      <div style={{flex:1,overflow:"hidden"}}>
        {activeChat?(
          <ConversationView currentUser={user} contact={activeChat} onBack={()=>setActiveChat(null)}/>
        ):bottomTab==="chats"?(
          <PeopleScreen currentUser={user} onOpenChat={u=>setActiveChat(u)}/>
        ):(
          <ProfileScreen currentUser={user} onLogout={handleLogout}/>
        )}
      </div>
      {!activeChat&&(
        <div style={{display:"flex",borderTop:"1px solid #f0f0f0",background:"#fff"}}>
          {[["chats","💬"],["profile","👤"]].map(([t,icon])=>(
            <button type="button" key={t} onClick={()=>setBottomTab(t)} style={{
              flex:1,padding:"12px 0 10px",border:"none",background:"none",cursor:"pointer",
              display:"flex",flexDirection:"column",alignItems:"center",gap:3,
              color:bottomTab===t?"#5B6CF0":"#bbb"}}>
              <span style={{fontSize:22}}>{icon}</span>
              <span style={{fontSize:11,fontWeight:bottomTab===t?700:400,textTransform:"capitalize"}}>{t}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

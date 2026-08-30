// AthleteMorph — Canvas silhouette morphing between 6 sports
// Running → Cycling aero → Swimming → Strength → Rowing → Trail

(function(){

const SPORTS = [
  { label: 'Course à pied', c: '#00c8e0' },
  { label: 'Vélo aéro',     c: '#5b6fff' },
  { label: 'Natation',      c: '#00c8e0' },
  { label: 'Musculation',   c: '#a855f7' },
  { label: 'Aviron',        c: '#5b6fff' },
  { label: 'Trail',         c: '#00c8e0' },
];

// Joint keys (consistent across all poses)
const JK = ['neck','lS','rS','lE','rE','lW','rW','lH','rH','lK','rK','lA','rA'];

const POSES = [
  // 0 — Running (midstride)
  { head:[245,72,26], joints:{
    neck:[242,106], lS:[205,128], rS:[282,124],
    lE:[175,180],  rE:[316,158], lW:[158,137], rW:[336,124],
    lH:[225,232],  rH:[262,228], lK:[205,335], rK:[278,315],
    lA:[188,425],  rA:[298,398]
  }},
  // 1 — Cycling aero (body horizontal, arms forward)
  { head:[310,145,24], joints:{
    neck:[284,170], lS:[254,184], rS:[312,184],
    lE:[222,226],  rE:[348,220], lW:[182,254], rW:[382,246],
    lH:[215,230],  rH:[252,236], lK:[188,328], rK:[256,310],
    lA:[180,415],  rA:[248,398]
  }},
  // 2 — Swimming freestyle (body horizontal, arm reaching)
  { head:[163,220,24], joints:{
    neck:[206,240], lS:[244,250], rS:[248,266],
    lE:[356,232],  rE:[164,296], lW:[424,222], rW:[118,322],
    lH:[268,282],  rH:[265,302], lK:[320,340], rK:[314,360],
    lA:[368,404],  rA:[360,420]
  }},
  // 3 — Overhead press (arms raised)
  { head:[242,75,26], joints:{
    neck:[242,108], lS:[204,130], rS:[280,130],
    lE:[178,88],   rE:[308,88],  lW:[175,50], rW:[308,50],
    lH:[228,235],  rH:[262,235], lK:[224,338], rK:[268,338],
    lA:[218,428],  rA:[275,428]
  }},
  // 4 — Rowing catch (leaning forward, arms extended)
  { head:[268,176,24], joints:{
    neck:[258,200], lS:[232,216], rS:[286,214],
    lE:[204,246],  rE:[312,240], lW:[170,266], rW:[342,258],
    lH:[240,266],  rH:[265,266], lK:[212,340], rK:[286,336],
    lA:[194,424],  rA:[302,418]
  }},
  // 5 — Trail (uphill, exaggerated lean + high knee)
  { head:[260,64,26], joints:{
    neck:[255,97], lS:[218,119], rS:[296,114],
    lE:[188,176],  rE:[330,144], lW:[172,126], rW:[350,110],
    lH:[238,234],  rH:[276,229], lK:[210,330], rK:[302,304],
    lA:[194,424],  rA:[324,390]
  }},
];

// Limbs: [jointA, jointB, lineWidth]
const LIMBS = [
  ['neck','lS',9], ['neck','rS',9],
  ['lS','lE',9],   ['rS','rE',9],
  ['lE','lW',7],   ['rE','rW',7],
  ['lS','lH',13],  ['rS','rH',13],
  ['lH','rH',10],
  ['lH','lK',11],  ['rH','rK',11],
  ['lK','lA',9],   ['rK','rA',9],
];

function lerp(a,b,t){ return a+(b-a)*t; }
function easeIO(t){ return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; }

function hexRgb(h){ return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]; }

function lerpSportColor(i1,i2,t,alpha=1){
  const [r1,g1,b1]=hexRgb(SPORTS[i1].c),[r2,g2,b2]=hexRgb(SPORTS[i2].c);
  return `rgba(${Math.round(lerp(r1,r2,t))},${Math.round(lerp(g1,g2,t))},${Math.round(lerp(b1,b2,t))},${alpha})`;
}

function lerpPose(p1,p2,t){
  return {
    head: [lerp(p1.head[0],p2.head[0],t), lerp(p1.head[1],p2.head[1],t), lerp(p1.head[2],p2.head[2],t)],
    joints: Object.fromEntries(JK.map(k => [k, [lerp(p1.joints[k][0],p2.joints[k][0],t), lerp(p1.joints[k][1],p2.joints[k][1],t)]]))
  };
}

function AthleteMorph(){
  const ref = React.useRef(null);

  React.useEffect(()=>{
    const canvas = ref.current;
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    const HOLD=2600, MORPH=1100;
    let si=0, ni=1, phaseTime=0, phase='hold';
    let particles=[], rings=[], lastTs=null, raf;

    function spawnBurst(pose){
      const cx=(pose.joints.lS[0]+pose.joints.rS[0])/2;
      const cy=(pose.head[1]+pose.joints.lA[1])/2;
      for(let i=0;i<40;i++){
        const a=Math.random()*Math.PI*2;
        const spd=0.8+Math.random()*4.2;
        particles.push({
          x:cx+(Math.random()-.5)*80, y:cy+(Math.random()-.5)*160,
          vx:Math.cos(a)*spd, vy:Math.sin(a)*spd,
          life:1, decay:.014+Math.random()*.018,
          r:1+Math.random()*3.5,
          ci: Math.random()>.5?si:ni,
        });
      }
      rings.push({ x:cx, y:cy, r:18, maxR:220, life:1, ci:ni });
    }

    function drawFrame(pose, si, ni, morphT, phT){
      ctx.clearRect(0,0,W,H);
      const j = pose.joints;

      // Background glow
      const cx=(j.lS[0]+j.rS[0])/2, cy=(pose.head[1]+j.lA[1])/2;
      const blob=ctx.createRadialGradient(cx,cy,20,cx,cy,210);
      blob.addColorStop(0, lerpSportColor(si,ni,morphT,0.13));
      blob.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=blob;
      ctx.fillRect(0,0,W,H);

      // Subtle scanline grid
      ctx.save();
      ctx.globalAlpha=0.025;
      ctx.strokeStyle='#00c8e0';
      ctx.lineWidth=0.5;
      for(let y=0;y<H;y+=28){ ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke(); }
      for(let x=0;x<W;x+=28){ ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke(); }
      ctx.restore();

      // Energy rings
      for(const r of rings){
        ctx.save();
        ctx.globalAlpha=r.life*0.55;
        ctx.strokeStyle=SPORTS[r.ci].c;
        ctx.lineWidth=1.2;
        ctx.shadowColor=SPORTS[r.ci].c;
        ctx.shadowBlur=14;
        ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();
        ctx.restore();
      }

      // Second faint ring (always visible, pulsing)
      const pulseR = 165 + Math.sin(Date.now()/800)*12;
      ctx.save();
      ctx.globalAlpha=0.07;
      ctx.strokeStyle=lerpSportColor(si,ni,morphT,1);
      ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(cx,cy,pulseR,0,Math.PI*2);ctx.stroke();
      ctx.restore();

      // Torso fill
      ctx.save();
      ctx.globalAlpha=0.22;
      ctx.beginPath();
      ctx.moveTo(j.lS[0],j.lS[1]);
      ctx.lineTo(j.rS[0],j.rS[1]);
      ctx.lineTo(j.rH[0],j.rH[1]);
      ctx.lineTo(j.lH[0],j.lH[1]);
      ctx.closePath();
      const tg=ctx.createLinearGradient(j.lS[0],j.lS[1],j.lH[0],j.lH[1]);
      tg.addColorStop(0, lerpSportColor(si,ni,morphT,0.7));
      tg.addColorStop(1, lerpSportColor(si,ni,morphT,0.1));
      ctx.fillStyle=tg;
      ctx.fill();
      ctx.restore();

      // Limbs
      for(const [a,b,lw] of LIMBS){
        const p1=j[a], p2=j[b];
        if(!p1||!p2) continue;
        const solidC=lerpSportColor(si,ni,morphT,1);

        // Outer glow halo
        ctx.save();
        ctx.beginPath(); ctx.moveTo(p1[0],p1[1]); ctx.lineTo(p2[0],p2[1]);
        ctx.strokeStyle=solidC; ctx.lineWidth=lw+10;
        ctx.lineCap='round'; ctx.globalAlpha=0.10;
        ctx.shadowColor=solidC; ctx.shadowBlur=22;
        ctx.stroke(); ctx.restore();

        // Main stroke
        ctx.save();
        ctx.beginPath(); ctx.moveTo(p1[0],p1[1]); ctx.lineTo(p2[0],p2[1]);
        ctx.strokeStyle=solidC; ctx.lineWidth=lw;
        ctx.lineCap='round';
        ctx.shadowColor=solidC; ctx.shadowBlur=16;
        ctx.stroke(); ctx.restore();

        // Inner highlight
        ctx.save();
        ctx.beginPath(); ctx.moveTo(p1[0],p1[1]); ctx.lineTo(p2[0],p2[1]);
        ctx.strokeStyle='rgba(255,255,255,0.30)'; ctx.lineWidth=lw*0.26;
        ctx.lineCap='round';
        ctx.stroke(); ctx.restore();
      }

      // Head
      ctx.save();
      ctx.shadowColor=lerpSportColor(si,ni,morphT,1);
      ctx.shadowBlur=30;
      ctx.beginPath();
      ctx.arc(pose.head[0],pose.head[1],pose.head[2],0,Math.PI*2);
      const hg=ctx.createRadialGradient(
        pose.head[0]-7,pose.head[1]-7,3,
        pose.head[0],pose.head[1],pose.head[2]
      );
      hg.addColorStop(0,'rgba(255,255,255,0.96)');
      hg.addColorStop(0.42, lerpSportColor(si,ni,morphT,1));
      hg.addColorStop(1, lerpSportColor(si,ni,morphT,0.55));
      ctx.fillStyle=hg;
      ctx.fill();
      ctx.restore();

      // Particles
      for(const p of particles){
        ctx.save();
        ctx.globalAlpha=Math.max(0,p.life)*0.88;
        ctx.shadowColor=SPORTS[p.ci].c;
        ctx.shadowBlur=7;
        ctx.fillStyle=SPORTS[p.ci].c;
        ctx.beginPath();
        ctx.arc(p.x,p.y,Math.max(0.4,p.r*p.life),0,Math.PI*2);
        ctx.fill();
        ctx.restore();
      }

      // Sport label
      const activeSport = phase==='hold'||morphT<0.5 ? si : ni;
      const labelAlpha = phase==='hold'
        ? Math.min(1,phT/280)
        : morphT<0.5 ? Math.max(0,1-morphT*2.2) : Math.min(1,(morphT-0.5)*2.4);

      ctx.save();
      ctx.globalAlpha=labelAlpha;
      ctx.font="600 10px 'DM Mono',monospace";
      ctx.fillStyle=SPORTS[activeSport].c;
      ctx.textAlign='center';
      ctx.shadowColor=SPORTS[activeSport].c;
      ctx.shadowBlur=12;
      ctx.fillText(SPORTS[activeSport].label.toUpperCase(), W/2, H-36);
      ctx.restore();

      // Progress dots
      const dotGap=20, dotR=3.5, total=SPORTS.length;
      const ox=W/2-(total-1)*dotGap/2;
      for(let i=0;i<total;i++){
        const active=i===activeSport;
        ctx.save();
        ctx.globalAlpha=active?1:0.27;
        if(active){ctx.shadowColor=SPORTS[i].c;ctx.shadowBlur=11;}
        ctx.fillStyle=active?SPORTS[i].c:'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(ox+i*dotGap, H-18, active?dotR+1.4:dotR, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }
    }

    function frame(ts){
      if(!lastTs) lastTs=ts;
      const dt=Math.min(ts-lastTs,50);
      lastTs=ts;
      phaseTime+=dt;

      if(phase==='hold'&&phaseTime>=HOLD){
        phase='morph'; phaseTime=0;
        spawnBurst(POSES[si]);
      } else if(phase==='morph'&&phaseTime>=MORPH){
        phase='hold'; phaseTime=0;
        si=ni; ni=(ni+1)%POSES.length;
      }

      particles=particles.filter(p=>p.life>0);
      for(const p of particles){
        p.x+=p.vx; p.y+=p.vy;
        p.vx*=0.96; p.vy*=0.96;
        p.life-=p.decay;
      }
      rings=rings.filter(r=>r.life>0);
      for(const r of rings){
        r.r=lerp(r.r,r.maxR,0.055);
        r.life-=0.020;
      }

      let morphT=0, pose;
      if(phase==='hold'){
        pose=POSES[si]; morphT=0;
      } else {
        morphT=easeIO(Math.min(phaseTime/MORPH,1));
        pose=lerpPose(POSES[si],POSES[ni],morphT);
      }

      drawFrame(pose,si,ni,morphT,phaseTime);
      raf=requestAnimationFrame(frame);
    }

    raf=requestAnimationFrame(frame);
    return ()=>cancelAnimationFrame(raf);
  },[]);

  return (
    <div style={{
      position:'relative', display:'flex', justifyContent:'center', alignItems:'center',
      animation:'fadeUpSlow 0.9s 0.15s cubic-bezier(0.4,0,0.2,1) both',
    }}>
      <div style={{
        position:'absolute', inset:'-12% -8%', zIndex:0,
        background:'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,200,224,0.14), transparent 70%)',
        filter:'blur(48px)', pointerEvents:'none',
      }}/>
      <canvas ref={ref} width={480} height={580} style={{
        position:'relative', zIndex:2,
        maxWidth:'100%', height:'auto',
      }}/>
    </div>
  );
}

window.AthleteMorph = AthleteMorph;
})();

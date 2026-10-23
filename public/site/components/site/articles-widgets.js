/* THW — widgets interactifs des articles (curseurs, tableaux). Le script d'origine de chaque article était retiré
   à l'import (le HTML injecté n'exécute pas de <script>) : il est repris ici, localisé (fr, en, es, it, de).
   Appelé par le lecteur (Articles.jsx) une fois l'article affiché : window.THW_ARTICLE_WIDGETS[slug](langue). */

function THW_bareme(LG){
  /* ---------- textes par langue (le français reste la référence) ---------- */
  function ordEn(n){ var m=n%100, d=n%10; return n+((m>=11&&m<=13)?'th':d===1?'st':d===2?'nd':d===3?'rd':'th'); }
  var TX = {
    fr: { dec:',', ord:function(n){return n+'e';}, pctl:function(n){return n+'e percentile';},
      lt:function(p){return 'sous le '+p+' (le tableau ne descend pas plus bas)';}, gt:function(p){return 'au-dessus du '+p+' (le tableau ne monte pas plus haut)';}, mid:function(p){return 'environ le '+p;},
      lt100:function(n){return 'moins de '+n+' personnes sur 100 de ce groupe ont une valeur plus basse (le tableau ne descend pas plus bas)';},
      gt100:function(n){return 'plus de '+n+' personnes sur 100 de ce groupe ont une valeur plus basse (le tableau ne monte pas plus haut)';},
      mid100:function(n){return 'environ '+n+' personnes sur 100 de ce groupe ont une valeur plus basse';},
      bellOut:function(v,t,pt){return 'À <b>'+v+' mL/kg/min</b>, '+t+' : '+pt+'. Médiane du groupe : 48,0.';},
      thisPerson:'cette personne : 47', median:'médiane : 45', varScore:'score variable : ', mean:'moyenne : ',
      pos:['au-dessus de','sous'],
      toyOut:function(m,med,below,pct,pos){return 'Moyenne : <b>'+m+'</b>. Médiane : <b>'+med+'</b>. La personne à 47 a '+below+' personnes sur 7 en dessous : <b>'+pct+'e percentile</b>. Elle est <b>'+pos+' la moyenne</b>, son rang est le même.';},
      friend:'Table FRIEND : percentiles mesurés au tapis', cooper:'Table Cooper Institute : seuils des catégories',
      sexes:['Homme','Femme'], cat:['faible','passable','bon','excellent','supérieur'], catp:['0e à 40e','40e à 60e','60e à 80e','80e à 95e','95e et au-delà'],
      cmpOut:function(sex,age,v,pt,fMed,cat,catp,cMed){return '<b>'+sex+', '+age+', '+v+' mL/kg/min.</b><br>Table FRIEND : '+pt+'. Médiane : '+fMed+'.<br>Table Cooper Institute : catégorie « '+cat+' » ('+catp+' percentile). Médiane estimée au milieu du 40e et du 60e : '+cMed+'.';} },
    en: { dec:'.', ord:ordEn, pctl:function(n){return ordEn(n)+' percentile';},
      lt:function(p){return 'below the '+p+' (the table goes no lower)';}, gt:function(p){return 'above the '+p+' (the table goes no higher)';}, mid:function(p){return 'about the '+p;},
      lt100:function(n){return 'fewer than '+n+' in 100 people in this group have a lower value (the table goes no lower)';},
      gt100:function(n){return 'more than '+n+' in 100 people in this group have a lower value (the table goes no higher)';},
      mid100:function(n){return 'about '+n+' in 100 people in this group have a lower value';},
      bellOut:function(v,t,pt){return 'At <b>'+v+' mL/kg/min</b>, '+t+': '+pt+'. Group median: 48.0.';},
      thisPerson:'this person: 47', median:'median: 45', varScore:'variable score: ', mean:'mean: ',
      pos:['above','below'],
      toyOut:function(m,med,below,pct,pos){return 'Mean: <b>'+m+'</b>. Median: <b>'+med+'</b>. The person at 47 has '+below+' people out of 7 below them: <b>'+ordEn(pct)+' percentile</b>. They are <b>'+pos+' the mean</b>, their rank is the same.';},
      friend:'FRIEND table: percentiles measured on a treadmill', cooper:'Cooper Institute table: category thresholds',
      sexes:['Man','Woman'], cat:['poor','fair','good','excellent','superior'], catp:['0th to 40th','40th to 60th','60th to 80th','80th to 95th','95th and above'],
      cmpOut:function(sex,age,v,pt,fMed,cat,catp,cMed){return '<b>'+sex+', '+age+', '+v+' mL/kg/min.</b><br>FRIEND table: '+pt+'. Median: '+fMed+'.<br>Cooper Institute table: category “'+cat+'” ('+catp+' percentile). Median estimated midway between the 40th and 60th: '+cMed+'.';} },
    es: { dec:',', ord:function(n){return n+'.º';}, pctl:function(n){return 'percentil '+n;},
      lt:function(p){return 'por debajo del '+p+' (la tabla no baja más)';}, gt:function(p){return 'por encima del '+p+' (la tabla no sube más)';}, mid:function(p){return 'aproximadamente el '+p;},
      lt100:function(n){return 'menos de '+n+' de cada 100 personas de este grupo tienen un valor más bajo (la tabla no baja más)';},
      gt100:function(n){return 'más de '+n+' de cada 100 personas de este grupo tienen un valor más bajo (la tabla no sube más)';},
      mid100:function(n){return 'aproximadamente '+n+' de cada 100 personas de este grupo tienen un valor más bajo';},
      bellOut:function(v,t,pt){return 'Con <b>'+v+' mL/kg/min</b>, '+t+': '+pt+'. Mediana del grupo: 48,0.';},
      thisPerson:'esta persona: 47', median:'mediana: 45', varScore:'puntuación variable: ', mean:'media: ',
      pos:['por encima de','por debajo de'],
      toyOut:function(m,med,below,pct,pos){return 'Media: <b>'+m+'</b>. Mediana: <b>'+med+'</b>. La persona con 47 tiene '+below+' personas de 7 por debajo: <b>percentil '+pct+'</b>. Está <b>'+pos+' la media</b>, su posición es la misma.';},
      friend:'Tabla FRIEND: percentiles medidos en cinta', cooper:'Tabla del Cooper Institute: umbrales de las categorías',
      sexes:['Hombre','Mujer'], cat:['baja','aceptable','buena','excelente','superior'], catp:['0 a 40','40 a 60','60 a 80','80 a 95','95 en adelante'],
      cmpOut:function(sex,age,v,pt,fMed,cat,catp,cMed){return '<b>'+sex+', '+age+', '+v+' mL/kg/min.</b><br>Tabla FRIEND: '+pt+'. Mediana: '+fMed+'.<br>Tabla del Cooper Institute: categoría «'+cat+'» (percentiles '+catp+'). Mediana estimada entre los percentiles 40 y 60: '+cMed+'.';} },
    it: { dec:',', ord:function(n){return n+'º';}, pctl:function(n){return n+'º percentile';},
      lt:function(p){return 'sotto il '+p+' (la tabella non scende oltre)';}, gt:function(p){return 'sopra il '+p+' (la tabella non sale oltre)';}, mid:function(p){return 'circa il '+p;},
      lt100:function(n){return 'meno di '+n+' persone su 100 di questo gruppo hanno un valore più basso (la tabella non scende oltre)';},
      gt100:function(n){return 'più di '+n+' persone su 100 di questo gruppo hanno un valore più basso (la tabella non sale oltre)';},
      mid100:function(n){return 'circa '+n+' persone su 100 di questo gruppo hanno un valore più basso';},
      bellOut:function(v,t,pt){return 'A <b>'+v+' mL/kg/min</b>, '+t+': '+pt+'. Mediana del gruppo: 48,0.';},
      thisPerson:'questa persona: 47', median:'mediana: 45', varScore:'punteggio variabile: ', mean:'media: ',
      pos:['sopra','sotto'],
      toyOut:function(m,med,below,pct,pos){return 'Media: <b>'+m+'</b>. Mediana: <b>'+med+'</b>. La persona a 47 ha '+below+' persone su 7 sotto di sé: <b>'+pct+'º percentile</b>. Si trova <b>'+pos+' la media</b>, la sua posizione è la stessa.';},
      friend:'Tabella FRIEND: percentili misurati su tapis roulant', cooper:'Tabella del Cooper Institute: soglie delle categorie',
      sexes:['Uomo','Donna'], cat:['scarsa','sufficiente','buona','eccellente','superiore'], catp:['dallo 0º al 40º','dal 40º al 60º','dal 60º all’80º','dall’80º al 95º','dal 95º in poi'],
      cmpOut:function(sex,age,v,pt,fMed,cat,catp,cMed){return '<b>'+sex+', '+age+', '+v+' mL/kg/min.</b><br>Tabella FRIEND: '+pt+'. Mediana: '+fMed+'.<br>Tabella del Cooper Institute: categoria «'+cat+'» (percentile: '+catp+'). Mediana stimata a metà tra il 40º e il 60º: '+cMed+'.';} },
    de: { dec:',', ord:function(n){return n+'.';}, pctl:function(n){return n+'. Perzentil';},
      lt:function(p){return 'unter dem '+p+' (die Tabelle reicht nicht weiter nach unten)';}, gt:function(p){return 'über dem '+p+' (die Tabelle reicht nicht weiter nach oben)';}, mid:function(p){return 'etwa das '+p;},
      lt100:function(n){return 'weniger als '+n+' von 100 Personen dieser Gruppe haben einen niedrigeren Wert (die Tabelle reicht nicht weiter nach unten)';},
      gt100:function(n){return 'mehr als '+n+' von 100 Personen dieser Gruppe haben einen niedrigeren Wert (die Tabelle reicht nicht weiter nach oben)';},
      mid100:function(n){return 'etwa '+n+' von 100 Personen dieser Gruppe haben einen niedrigeren Wert';},
      bellOut:function(v,t,pt){return 'Bei <b>'+v+' mL/kg/min</b>: '+t+' – '+pt+'. Median der Gruppe: 48,0.';},
      thisPerson:'diese Person: 47', median:'Median: 45', varScore:'variabler Wert: ', mean:'Mittelwert: ',
      pos:['über','unter'],
      toyOut:function(m,med,below,pct,pos){return 'Mittelwert: <b>'+m+'</b>. Median: <b>'+med+'</b>. Die Person mit 47 hat '+below+' von 7 Personen unter sich: <b>'+pct+'. Perzentil</b>. Sie liegt <b>'+pos+' dem Mittelwert</b>, ihr Rang bleibt gleich.';},
      friend:'FRIEND-Tabelle: auf dem Laufband gemessene Perzentile', cooper:'Cooper-Institute-Tabelle: Schwellenwerte der Kategorien',
      sexes:['Mann','Frau'], cat:['schwach','ausreichend','gut','ausgezeichnet','überlegen'], catp:['0. bis 40.','40. bis 60.','60. bis 80.','80. bis 95.','ab dem 95.'],
      cmpOut:function(sex,age,v,pt,fMed,cat,catp,cMed){return '<b>'+sex+', '+age+', '+v+' mL/kg/min.</b><br>FRIEND-Tabelle: '+pt+'. Median: '+fMed+'.<br>Cooper-Institute-Tabelle: Kategorie „'+cat+'“ (Perzentil: '+catp+'). Geschätzter Median zwischen dem 40. und 60.: '+cMed+'.';} }
  };
  var T = TX[LG] || TX.fr;

  /* ---------- outils ---------- */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function f1(x){ return (Math.round(x*10)/10).toFixed(1).replace('.',T.dec); }
  function ease(t){ return t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; }
  function el(id){ return document.getElementById(id); }
  var NS='http://www.w3.org/2000/svg';
  function mk(tag, attrs, txt){ var e=document.createElementNS(NS,tag); for(var k in attrs){ e.setAttribute(k, attrs[k]); } if(txt!=null){ e.textContent=txt; } return e; }

  /* Percentile par interpolation linéaire entre les valeurs d'un tableau */
  function pctInterp(v, vals, pcts){
    if(v < vals[0]) return {lt: pcts[0]};
    if(v > vals[vals.length-1]) return {gt: pcts[pcts.length-1]};
    for(var i=0;i<vals.length-1;i++){
      if(v>=vals[i] && v<=vals[i+1]){
        return {p: pcts[i] + (pcts[i+1]-pcts[i])*(v-vals[i])/(vals[i+1]-vals[i])};
      }
    }
    return {p:50};
  }
  function pctText(r){
    if(r.lt) return T.lt(T.pctl(r.lt));
    if(r.gt) return T.gt(T.pctl(r.gt));
    return T.mid(T.pctl(Math.round(r.p)));
  }

  /* ---------- Figure 1 : cloche et curseur ---------- */
  var bellInit = (function(){
    var svg = el('bell'); if(!svg) return null;
    var MU=48.0, SD=11.6, VMIN=15, VMAX=80, BASE=230, H=165;
    var PV=[32.1,40.1,48.0,55.2,61.8], PP=[10,25,50,75,90];
    function X(v){ return 40+(v-VMIN)*(560/(VMAX-VMIN)); }
    function F(v){ return Math.exp(-0.5*Math.pow((v-MU)/SD,2)); }
    function Yv(v){ return BASE-F(v)*H; }
    var d='';
    for(var v=VMIN; v<=VMAX+0.01; v+=0.5){ d += (v===VMIN?'M':'L')+X(v).toFixed(1)+' '+Yv(v).toFixed(1)+' '; }
    el('bellCurve').setAttribute('d', d);
    var tg = el('bellTicks');
    for(var i=0;i<5;i++){
      tg.appendChild(mk('line',{x1:X(PV[i]),y1:BASE,x2:X(PV[i]),y2:BASE+6,'class':'grid'}));
      tg.appendChild(mk('text',{x:X(PV[i]),y:BASE+20,'class':'lab','text-anchor':'middle'}, T.ord(PP[i])));
      tg.appendChild(mk('text',{x:X(PV[i]),y:BASE+35,'class':'tick','text-anchor':'middle'}, f1(PV[i])));
    }
    var m = el('bellMed'); m.setAttribute('x1',X(MU)); m.setAttribute('x2',X(MU));
    el('bellMedT').setAttribute('x', X(MU)+8); el('bellMedT').setAttribute('text-anchor','start');
    var range = el('bellRange'), out = el('bellOut'), cur = el('bellCursor'), val = el('bellVal'), shade = el('bellShade');
    function set(v){
      var s='M'+X(VMIN).toFixed(1)+' '+BASE+' ';
      for(var u=VMIN; u<=v; u+=0.5){ s += 'L'+X(u).toFixed(1)+' '+Yv(u).toFixed(1)+' '; }
      s += 'L'+X(v).toFixed(1)+' '+Yv(v).toFixed(1)+' L'+X(v).toFixed(1)+' '+BASE+' Z';
      shade.setAttribute('d', s);
      cur.setAttribute('transform','translate('+X(v).toFixed(1)+' 0)');
      val.textContent = f1(v)+' mL/kg/min';
      var r = pctInterp(v, PV, PP), t;
      if(r.lt) t = T.lt100(r.lt);
      else if(r.gt) t = T.gt100(r.gt);
      else t = T.mid100(Math.round(r.p));
      out.innerHTML = T.bellOut(f1(v), t, pctText(r));
      range.value = v;
    }
    var raf=null;
    function stop(){ if(raf){ cancelAnimationFrame(raf); raf=null; } }
    function play(){
      stop();
      if(reduce){ set(MU); return; }
      var t0=null, A=32.1, B=61.8, T1=3200, T2=1100;
      function step(ts){
        if(t0===null) t0=ts;
        var t=ts-t0;
        if(t<T1){ set(A+(B-A)*ease(t/T1)); raf=requestAnimationFrame(step); }
        else if(t<T1+T2){ set(B+(MU-B)*ease((t-T1)/T2)); raf=requestAnimationFrame(step); }
        else { set(MU); raf=null; }
      }
      raf=requestAnimationFrame(step);
    }
    range.addEventListener('input', function(){ stop(); set(parseFloat(range.value)); });
    el('bellReplay').addEventListener('click', play);
    set(MU);
    return play;
  })();

  /* ---------- Figure 2 : moyenne, médiane, rang ---------- */
  var toyInit = (function(){
    var svg = el('toy'); if(!svg) return null;
    var FIX=[40,42,44,45,47,48], HL=47, AX=150;
    function X(v){ return 40+(v-36)*(560/60); }
    svg.appendChild(mk('line',{x1:40,y1:AX,x2:600,y2:AX,'class':'grid'}));
    for(var t=40;t<=90;t+=10){
      svg.appendChild(mk('line',{x1:X(t),y1:AX,x2:X(t),y2:AX+5,'class':'grid'}));
      svg.appendChild(mk('text',{x:X(t),y:AX+19,'class':'tick','text-anchor':'middle'}, String(t)));
    }
    FIX.forEach(function(v){
      svg.appendChild(mk('circle',{cx:X(v),cy:AX-16,r:8,'class': v===HL?'acc':'bar'}));
    });
    svg.appendChild(mk('text',{x:X(HL)+6,y:AX-34,'class':'tick','text-anchor':'end'}, 'cette personne : 47'));
    var out = mk('circle',{id:'toyOutlier',cy:AX-16,r:8,'class':'hot'}); svg.appendChild(out);
    var outT = mk('text',{id:'toyOutT','class':'tick','text-anchor':'middle',y:AX-54}); svg.appendChild(outT);
    var meanL = mk('line',{id:'toyMeanL',y1:62,y2:AX,'class':'dash'}); svg.appendChild(meanL);
    var meanT = mk('text',{id:'toyMeanT',y:52,'class':'val','text-anchor':'middle'}); svg.appendChild(meanT);
    var medL = mk('line',{id:'toyMedL',x1:X(45),x2:X(45),y1:AX,y2:AX+30,'class':'medl'}); svg.appendChild(medL);
    svg.appendChild(mk('text',{x:X(45),y:AX+46,'class':'val','text-anchor':'middle'}, 'médiane : 45'));
    var range = el('toyRange'), o = el('toyOut');
    function set(x){
      x=Math.round(x*10)/10;
      var all = FIX.concat([x]).sort(function(a,b){return a-b;});
      var mean = all.reduce(function(a,b){return a+b;},0)/all.length;
      var med = all[3];
      var below = all.filter(function(v){return v<HL;}).length;
      out.setAttribute('cx', X(x));
      outT.setAttribute('x', X(x)); outT.textContent = T.varScore+f1(x).replace(T.dec+'0','');
      meanL.setAttribute('x1', X(mean)); meanL.setAttribute('x2', X(mean));
      meanT.setAttribute('x', X(mean)); meanT.textContent = T.mean+f1(mean);
      var pos = HL>mean ? T.pos[0] : T.pos[1];
      o.innerHTML = T.toyOut(f1(mean), med, below, Math.round(below/7*100), pos);
      range.value = x;
    }
    var raf=null;
    function stop(){ if(raf){ cancelAnimationFrame(raf); raf=null; } }
    function play(){
      stop();
      if(reduce){ set(90); return; }
      var t0=null, T=2800;
      function step(ts){
        if(t0===null) t0=ts;
        var t=Math.min(1,(ts-t0)/T);
        set(50+(90-50)*ease(t));
        if(t<1) raf=requestAnimationFrame(step); else raf=null;
      }
      raf=requestAnimationFrame(step);
    }
    range.addEventListener('input', function(){ stop(); set(parseFloat(range.value)); });
    set(90);
    return play;
  })();

  /* ---------- Figure 4 : deux barèmes ---------- */
  var cmpInit = (function(){
    var svg = el('cmp'); if(!svg) return null;
    var FR = {
      M:[[32.1,40.1,48.0,55.2,61.8],[30.2,35.9,42.4,49.2,56.5],[26.8,31.9,37.8,45.0,52.1],[22.8,27.1,32.6,39.7,45.6],[19.8,23.7,28.2,34.5,40.3],[17.1,20.4,24.4,30.4,36.6]],
      F:[[23.9,30.5,37.6,44.7,51.3],[20.9,25.3,30.2,36.1,41.4],[18.8,22.1,26.7,32.4,38.4],[17.3,19.9,23.4,27.6,32.0],[14.6,17.2,20.0,23.8,27.0],[13.6,15.6,18.3,20.8,23.1]]
    };
    var CO = {
      M:[[41.7,45.4,51.1,55.4],[40.5,44.0,48.3,54.0],[38.5,42.4,46.4,52.5],[35.6,39.2,43.4,48.9],[32.3,35.5,39.5,45.7],[29.4,32.3,36.7,42.1]],
      F:[[36.1,39.5,43.9,49.6],[34.4,37.8,42.4,47.4],[33.0,36.3,39.7,45.3],[30.1,33.0,36.7,41.1],[27.5,30.0,33.0,37.8],[25.9,28.1,30.9,36.7]]
    };
    var FP=[10,25,50,75,90], CP=[40,60,80,95];
    var CAT=T.cat, CATP=T.catp;
    var VMIN=10, VMAX=70, Y1=62, Y2=144, AXY=205;
    function X(v){ return 40+(v-VMIN)*(560/(VMAX-VMIN)); }
    var ticks = mk('g',{}); var curG = mk('g',{id:'cmpCur'});
    curG.appendChild(mk('line',{x1:0,y1:28,x2:0,y2:205,'class':'cur'}));
    svg.appendChild(curG);
    svg.appendChild(mk('text',{x:40,y:14,'class':'lab'}, 'Table FRIEND : percentiles mesurés au tapis'));
    svg.appendChild(mk('text',{x:40,y:98,'class':'lab'}, 'Table Cooper Institute : seuils des catégories'));
    svg.appendChild(mk('line',{x1:40,y1:Y1,x2:600,y2:Y1,'class':'grid base'}));
    svg.appendChild(mk('line',{x1:40,y1:Y2,x2:600,y2:Y2,'class':'grid base'}));
    svg.appendChild(mk('line',{x1:40,y1:AXY,x2:600,y2:AXY,'class':'grid'}));
    for(var t=10;t<=70;t+=10){
      svg.appendChild(mk('line',{x1:X(t),y1:AXY,x2:X(t),y2:AXY+5,'class':'grid'}));
      svg.appendChild(mk('text',{x:X(t),y:AXY+19,'class':'tick','text-anchor':'middle'}, String(t)));
    }
    svg.appendChild(ticks);
    curG.appendChild(mk('circle',{cx:0,cy:Y1,r:5,'class':'hotc'}));
    curG.appendChild(mk('circle',{cx:0,cy:Y2,r:5,'class':'hotc'}));
    var curT = mk('text',{x:0,y:243,'class':'curt','text-anchor':'middle'}); curG.appendChild(curT);
    var sex=el('cSex'), age=el('cAge'), val=el('cVal'), valT=el('cValTxt'), out=el('cmpOut');
    function drawTicks(){
      while(ticks.firstChild) ticks.removeChild(ticks.firstChild);
      var s=sex.value, a=parseInt(age.value,10);
      var fv=FR[s][a], cv=CO[s][a];
      fv.forEach(function(v,i){
        ticks.appendChild(mk('line',{x1:X(v),y1:Y1-7,x2:X(v),y2:Y1+7,'class':'grid base','style':'stroke-dasharray:none;stroke:var(--fg)'}));
        ticks.appendChild(mk('text',{x:X(v),y:(i%2===0?Y1-13:Y1+22),'class':'tick','text-anchor':'middle'}, T.ord(FP[i])));
      });
      cv.forEach(function(v,i){
        ticks.appendChild(mk('line',{x1:X(v),y1:Y2-7,x2:X(v),y2:Y2+7,'class':'grid base','style':'stroke-dasharray:none;stroke:var(--fg)'}));
        ticks.appendChild(mk('text',{x:X(v),y:(i%2===0?Y2-13:Y2+22),'class':'tick','text-anchor':'middle'}, T.ord(CP[i])));
      });
    }
    var first=true;
    function render(){
      drawTicks();
      var s=sex.value, a=parseInt(age.value,10), v=parseFloat(val.value);
      var fv=FR[s][a], cv=CO[s][a];
      curG.style.transition = first ? 'none' : 'transform .25s ease';
      curG.style.transform = 'translateX('+X(v).toFixed(1)+'px)';
      first=false;
      curT.textContent = f1(v)+' mL/kg/min';
      valT.textContent = f1(v);
      var r = pctInterp(v, fv, FP);
      var ci=0; while(ci<cv.length && v>=cv[ci]) ci++;
      var fMed = fv[2], cMed = (cv[0]+cv[1])/2;
      out.innerHTML = T.cmpOut(T.sexes[s==='M'?0:1], age.options[a].text, f1(v), pctText(r), f1(fMed), CAT[ci], CATP[ci], f1(cMed));
    }
    sex.addEventListener('change', render); age.addEventListener('change', render); val.addEventListener('input', render);
    Array.prototype.forEach.call(document.querySelectorAll('[data-p]'), function(b){
      b.addEventListener('click', function(){
        var p=b.getAttribute('data-p').split(',');
        sex.value=p[0]; age.value=p[1]; val.value=p[2]; render();
      });
    });
    render();
    return null;
  })();

  /* ---------- Déclenchement à l'entrée dans l'écran ---------- */
  var plays = {bell: bellInit, toy: toyInit};
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting) return;
        e.target.classList.add('play');
        var k = e.target.getAttribute('data-js');
        if(k && plays[k]) plays[k]();
        io.unobserve(e.target);
      });
    },{threshold:0.2});
    Array.prototype.forEach.call(document.querySelectorAll('[data-play],[data-js]'), function(n){ io.observe(n); });
  }
  var rep = el('bellReplay');
}

window.THW_ARTICLE_WIDGETS = { 'lire-un-bareme': THW_bareme };

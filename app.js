(function(){
'use strict';
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[rnd(0,a.length-1)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(0,i);[a[i],a[j]]=[a[j],a[i]]}return a};
const T=(h,m=0)=>h*60+m, p2=n=>String(n).padStart(2,'0');
const d24=t=>{t=((t%1440)+1440)%1440;return p2(Math.floor(t/60))+':'+p2(t%60)};
const d12=t=>{t=((t%1440)+1440)%1440;const h=Math.floor(t/60),m=t%60;return ((h%12)||12)+':'+p2(m)+' '+(h<12?'a.m.':'p.m.')};
const ap=t=>((t%1440)<720?'a.m.':'p.m.');
const hm=n=>{const h=Math.floor(n/60),m=n%60,o=[];if(h)o.push(h+(h===1?' hour':' hours'));if(m||!h)o.push(m+(m===1?' minute':' minutes'));return o.join(' ')};
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const NS='http://www.w3.org/2000/svg';

/* ---------- answer parsing ---------- */
function parseTime(v){ // returns {t, padded}
  v=String(v).trim().replace(/[.\s]/g,':').replace(/:+/g,':');
  if(/^\d{4}$/.test(v))v=v.slice(0,2)+':'+v.slice(2);
  const m=/^(\d{1,2}):(\d{2})$/.exec(v);if(!m)return null;
  return {t:T(+m[1],+m[2]),padded:m[1].length===2};
}
const num=v=>{v=String(v).trim().replace(/[,\s\u00A0]/g,'').replace(/[\u2212\u2013]/g,'-');return /^-?\d+(\.\d+)?$/.test(v)?Number(v):NaN};

/* ---------- question building blocks ---------- */
function inputs(box,spec){ // spec: [{id,label,suffix,w}]
  const row=document.createElement('div');row.className='row';const refs={};
  spec.forEach(s=>{
    if(s.label){const l=document.createElement('label');l.textContent=s.label;row.appendChild(l)}
    const i=document.createElement('input');i.type='text';i.inputMode=s.mode||'text';i.autocomplete='off';i.setAttribute('aria-label',s.aria||s.label||'answer');
    if(s.w)i.style.width=s.w;refs[s.id]=i;row.appendChild(i);
    if(s.suffix){const x=document.createElement('span');x.textContent=s.suffix;row.appendChild(x)}
  });
  box.appendChild(row);return refs;
}
function choices(box,opts,answer){
  const wrap=document.createElement('div');wrap.className='opts';let sel=null;const btns=[];
  opts.forEach(o=>{const b=document.createElement('button');b.type='button';b.className='opt';b.textContent=o;
    b.onclick=()=>{if(b.disabled)return;btns.forEach(x=>x.classList.remove('sel'));b.classList.add('sel');sel=o};
    wrap.appendChild(b);btns.push(b)});
  box.appendChild(wrap);
  return {btns,get:()=>sel,lock:()=>btns.forEach(b=>{b.disabled=true;if(b.textContent===answer)b.classList.add('right')}),reveal:()=>btns.forEach(b=>{if(b.textContent===answer)b.classList.add('right')})};
}

/* ---------- shared helpers (units 1 and 3) ---------- */
const sample=(a,n)=>shuffle(a).slice(0,n);
const fmt=n=>{const neg=n<0,s=String(Math.abs(n));const t=Math.abs(n)>=10000?s.replace(/\B(?=(\d{3})+(?!\d))/g,' '):s;return (neg?'−':'')+t};
const plain=n=>String(n);
const ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function words(n){if(n<20)return ONES[n];if(n<100)return TENS[Math.floor(n/10)]+(n%10?'-'+ONES[n%10]:'');
  if(n<1000)return ONES[Math.floor(n/100)]+' hundred'+(n%100?' and '+words(n%100):'');
  const th=Math.floor(n/1000),r=n%1000;return words(th)+' thousand'+(r?(r<100?' and '+words(r):', '+words(r)):'')}
const r10=n=>Math.floor((n+5)/10)*10, r100=n=>Math.floor((n+50)/100)*100, r1000=n=>Math.floor((n+500)/1000)*1000;
const same=(a,b)=>String(a)===String(b);
function ask(prompt,spec,ans,hint,o){o=o||{};
  return{prompt,
    render(b){if(o.pre)b.insertAdjacentHTML('beforeend',typeof o.pre==='function'?o.pre():o.pre);this.r=inputs(b,spec)},
    check(){const bad=[];for(const s of spec){const v=this.r[s.id].value.trim();if(!v)return{ok:false,hint:'Fill in every box first.'};
        const want=ans[s.id];const okk=typeof want==='number'?num(v)===want:v.toLowerCase().replace(/\s+/g,' ')===String(want).toLowerCase();if(!okk)bad.push(s)}
      return bad.length?{ok:false,hint:typeof hint==='function'?hint(bad.map(s=>s.id)):hint}:{ok:true}},
    answer:o.answer||spec.map(s=>(s.label?s.label+' ':'')+(typeof ans[s.id]==='number'?fmt(ans[s.id]):ans[s.id])+(s.suffix?' '+s.suffix:'')).join(' · '),
    auto(){spec.forEach(s=>{this.r[s.id].value=String(ans[s.id])})}}}
function mc(prompt,pre,opts,correct,hint,answer){
  return{prompt,render(b){if(pre)b.insertAdjacentHTML('beforeend',typeof pre==='function'?pre():pre);this.c=choices(b,opts,correct)},
    check(){const g=this.c.get();if(g===null)return{ok:false,hint:'Tap an answer first.'};return g===correct?{ok:true}:{ok:false,hint}},
    answer:answer||correct,auto(){this.c.btns.find(x=>x.textContent===correct).click()}}}
function nlSVG(lo,hi,marks,o){o=o||{};const W=360,H=74,L=18,pw=W-2*L,n=hi-lo;const X=v=>L+pw*(v-lo)/n;const lab=o.every||1;
  let s='<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="number line"><line x1="'+(L-8)+'" y1="46" x2="'+(W-L+8)+'" y2="46" stroke="var(--ink)" stroke-width="2.5"/>';
  for(let v=lo;v<=hi;v++){const x=X(v),big=(v%lab===0);s+='<line x1="'+x+'" y1="'+(big?39:42)+'" x2="'+x+'" y2="52" stroke="var(--ink)" stroke-width="'+(v===0?3:1.5)+'"/>';
    if(big)s+='<text x="'+x+'" y="68" font-size="'+(o.fs||10)+'" font-weight="800" text-anchor="middle" fill="var(--ink)">'+(v<0?'−'+(-v):v)+'</text>'}
  (marks||[]).forEach(m=>{const x=X(m.v);s+='<circle cx="'+x+'" cy="46" r="5" fill="#C8452F" stroke="var(--ink)" stroke-width="1.5"/><text x="'+x+'" y="26" font-size="15" font-weight="900" text-anchor="middle" fill="#C8452F">'+m.l+'</text>'});
  return s+'</svg>'}
function colHTML(a,b,op){const A=fmt(a).replace(' ',' '),B=fmt(b).replace(' ',' ');const w=Math.max(A.length,B.length)+1;
  const pad=s=>' '.repeat(w-s.length)+s;return '<pre class="colsum">'+pad(A)+'\n'+op+pad(B).slice(1)+'\n'+'─'.repeat(w)+'</pre>'}
const lead=(a,b)=>a<b?'<':a>b?'>':'=';
/* ---------- shared game helpers ---------- */
function optQ(play,api,html,ans,wrongs){const h=document.createElement('div');h.className='big';h.innerHTML=html;const A=String(ans);
  let w=[...new Set(wrongs.map(String))].filter(x=>x!==A);const base=parseFloat(A.replace(/\u00A0/g,'').replace(/\u2212/g,'-'));
  for(let k=1;w.length<2&&!isNaN(base);k++){[base+k,base-k].forEach(c=>{const t=Math.abs(c)>=10000||c<0?fmt(c):String(c);if(t!==A&&!w.includes(t)&&w.length<2)w.push(t)})}
  w=w.slice(0,2);
  const o=document.createElement('div');o.className='opts';shuffle([A,...w]).forEach(v=>{const b=mkbtn(v,()=>{if(v===A)api.right();else api.wrong(b)},'opt');o.append(b)});play.append(h,o)}
function near(ans,cands){const s=new Set();cands.forEach(x=>{if(x!==ans&&x!==undefined)s.add(x)});return shuffle([...s]).slice(0,2)}
function memGame(body,rkey,lskey,makePairs,np){
  const info=document.createElement('div');info.className='big';info.textContent='Best: '+(R[rkey]?R[rkey]+' moves':'–');
  const grid=document.createElement('div');grid.className='mem';let moves=0,open=[],lock=false,found=0;
  const startB=mkbtn('Start',deal);
  function deal(){startB.hidden=true;moves=0;open=[];found=0;lock=false;grid.innerHTML='';info.textContent='Moves: 0';
    const pr=makePairs(np);const cards=shuffle(pr.flatMap((p,i)=>[{i,k:0,h:p[0]},{i,k:1,h:p[1]}]));
    cards.forEach(c=>{const el=document.createElement('button');el.type='button';el.className='card';el.innerHTML='<span class="qm">?</span>';el.setAttribute('aria-label','Hidden card');
      el.onclick=()=>{if(lock||el.classList.contains('up')||el.classList.contains('gone'))return;
        el.classList.add('up');el.innerHTML='<b style="font-size:13px;line-height:1.15">'+c.h+'</b>';open.push({el,c});
        if(open.length===2){moves++;info.textContent='Moves: '+moves;lock=true;const[a,b]=open;
          if(a.c.i===b.c.i&&a.c.k!==b.c.k){setTimeout(()=>{[a,b].forEach(x=>{x.el.classList.remove('up');x.el.classList.add('gone')});open=[];lock=false;found++;
            if(found===np){if(!R[rkey]||moves<R[rkey]){R[rkey]=moves;ls(lskey,moves)}info.textContent='You did it in '+moves+' moves! Best: '+R[rkey];confetti();queueSave();startB.hidden=false;startB.textContent='Play again'}},500)}
          else setTimeout(()=>{[a,b].forEach(x=>{x.el.classList.remove('up');x.el.innerHTML='<span class="qm">?</span>'});open=[];lock=false},900)}};
      grid.append(el)})}
  body.append(info,grid,startB)}

/* ---------- Unit 3 questions ---------- */
const SECTIONS=[
 {id:'dec',title:'Number Builder',sub:'Decompose and regroup numbers to show the value of each digit.'},
 {id:'est',title:'Round and Estimate',sub:'Near multiples of 10, rounding and estimating answers.'},
 {id:'ads',title:'Add and Subtract',sub:'Adding on, decomposing, regrouping and column methods.'},
 {id:'fct',title:'Times Table Power',sub:'Multiplication and division facts, doubles and triples.'}
];
const QS=[];const add=(sec,gen,tag)=>QS.push({sec,gen,tag});
const dg=()=>rnd(1,9);
/* A. number builder */
add('dec',()=>{const a=dg(),b=dg(),c=dg(),d=dg(),n=a*1000+b*100+c*10+d;
  return ask('Decompose <b>'+fmt(n)+'</b> to show the value of each digit: <b>'+fmt(n)+' = '+fmt(a*1000)+' + ___ + ___ + ___</b>',[{id:'a',w:'4em'},{id:'b',w:'4em'},{id:'c',w:'4em'}],{a:b*100,b:c*10,c:d},'Look at each digit and its place: hundreds, tens, then ones.')});
add('dec',()=>{const a=dg(),b=dg(),c=dg(),d=dg(),e=dg(),n=a*10000+b*1000+c*100+d*10+e;
  return ask('Decompose <b>'+fmt(n)+'</b>: <b>'+fmt(n)+' = '+fmt(a*10000)+' + ___ + ___ + ___ + ___</b>',[{id:'a',w:'4.5em'},{id:'b',w:'4em'},{id:'c',w:'4em'},{id:'d',w:'4em'}],{a:b*1000,b:c*100,c:d*10,d:e},'A 5-digit number has a 10 000s place. Take each digit in turn: thousands, hundreds, tens, ones.')});
add('dec',()=>{const a=rnd(2,9),b=rnd(1,9),r=rnd(11,99),n=a*1000+b*100+r;
  return ask('Regroup <b>'+fmt(n)+'</b>: <b>'+fmt(n)+' = '+fmt((a-1)*1000)+' + ___ + '+r+'</b>',[{id:'a',w:'4.5em'}],{a:(b+10)*100},'One 1000 becomes 10 hundreds. So you have '+b+' hundreds plus 10 more hundreds.')});
add('dec',()=>{const a=rnd(2,9),r=rnd(101,999),n=a*1000+r;
  return ask('Regroup <b>'+fmt(n)+'</b> two ways. <b>'+fmt(n)+' = '+fmt(a*1000)+' + ___</b> and <b>'+fmt(n)+' = '+fmt((a-1)*1000)+' + ___</b>',[{id:'a',w:'4.5em'},{id:'b',w:'4.5em'}],{a:r,b:1000+r},'The second one has one less 1000, so add 1000 to the other part.')});
add('dec',()=>{const a=rnd(2,9),b=dg(),c=dg(),d=dg(),n=a*1000+b*100+c*10+d,rs=n%1000,
  ok=[fmt(a*1000)+' + '+b*100+' + '+c*10+' + '+d,fmt(a*1000)+' + '+rs,fmt((a-1)*1000)+' + '+(1000+rs),fmt(a*1000)+' + '+b*100+' + '+(n%100)],
  bad=fmt((a-1)*1000)+' + '+rs;
  return mc('Which one is <b>not</b> equal to <b>'+fmt(n)+'</b>?',null,shuffle([bad,...sample(ok,3)]),bad,'Add up each choice. When you take 1000 away, you must put 10 hundreds back.')});
add('dec',()=>{const a=rnd(3,9),b=rnd(0,9),r=rnd(10,99),n=a*1000+b*100+r,e=pick([0,0,1,-1]),h=b+10+e,right=e===0,
  claim=fmt((a-1)*1000)+' + '+h+' hundreds + '+r;
  return mc('Zara regrouped <b>'+fmt(n)+'</b> like this: <b>'+claim+'</b>. Is she right?',null,['Yes, she is right','No, she is wrong'],right?'Yes, she is right':'No, she is wrong','Work it out: '+fmt((a-1)*1000)+' + '+h+'00 + '+r+'. Is the total '+fmt(n)+'?')},'Think');
/* B. round and estimate */
add('est',()=>{const add2=Math.random()<.5,m=10*rnd(2,6),dl=pick([-2,-1,1,2]),b=m+dl,a=add2?rnd(20,60):rnd(b+10,99),f=add2?a+m:a-m,ans=add2?a+b:a-b;
  return ask('Solve <b>'+a+(add2?' + ':' − ')+b+'</b> using the near multiple of 10. First '+(add2?'add':'take away')+' <b>'+m+'</b>.',[{id:'a',label:a+(add2?' + ':' − ')+m+' =',w:'4em'},{id:'b',label:'So '+a+(add2?' + ':' − ')+b+' =',w:'4em'}],{a:f,b:ans},
   b>m?'You '+(add2?'added':'took away')+' '+m+', but needed '+b+', so you '+(add2?'need to add':'need to take away')+' '+dl+' more.':'You '+(add2?'added':'took away')+' '+m+', which is '+(-dl)+' too many, so '+(add2?'take':'add')+' '+(-dl)+' back.')});
add('est',()=>{const a=rnd(21,89),b=rnd(21,89),add2=Math.random()<.5,A=add2?a:Math.max(a,b),B=add2?b:Math.min(a,b),est=add2?r10(A)+r10(B):r10(A)-r10(B);
  return ask('Estimate <b>'+A+(add2?' + ':' − ')+B+'</b> by rounding both numbers to the nearest 10.',[{id:'a',suffix:'(estimate)',w:'4.5em'}],{a:est},'Round '+A+' to '+r10(A)+' and '+B+' to '+r10(B)+'. Then '+(add2?'add':'subtract')+'.')});
add('est',()=>{let a,b;for(;;){a=rnd(300,900);b=rnd(120,a-100);if(r10(a)-r10(b)>0)break}
  return ask('Estimate <b>'+a+' − '+b+'</b> by rounding each number to the nearest 10.',[{id:'a',suffix:'(estimate)',w:'4.5em'}],{a:r10(a)-r10(b)},'Round each number to the nearest 10 first: look at the ones digit. 5 or more rounds up.')});
add('est',()=>{const add2=Math.random()<.5,a=rnd(2000,9000)+rnd(0,999),b=rnd(1000,Math.min(a-500,5000)),A=a,B=b;
  return ask('Estimate <b>'+fmt(A)+(add2?' + ':' − ')+fmt(B)+'</b> by rounding each number to the nearest 1000.',[{id:'a',suffix:'(estimate)',w:'5.5em'}],{a:add2?r1000(A)+r1000(B):r1000(A)-r1000(B)},'Look at the hundreds digit to round to the nearest 1000. 5 or more rounds up.')});
add('est',()=>{for(;;){const a=rnd(300,900),b=rnd(120,a-100),est=r10(a)-r10(b),act=a-b;if(est===act)continue;
  return mc('<b>'+a+' − '+b+'</b>. Estimate by rounding to the nearest 10. Will the actual answer be <b>more</b> or <b>less</b> than your estimate?',null,['More than the estimate','Less than the estimate'],act>est?'More than the estimate':'Less than the estimate','Estimate: '+r10(a)+' − '+r10(b)+' = '+est+'. Work out the real answer '+a+' − '+b+' and compare.',(act>est?'More':'Less')+' than the estimate: estimate '+est+', actual '+act)}});
add('est',()=>{const M=[['Mount Everest',8848],['K2',8611],['Makalu',8485],['Broad Peak',8051],['Nanda Devi',7816]],[x,y]=sample(M,2).sort((p,q)=>q[1]-p[1]);
  return ask('Mountain heights: <b>'+x[0]+' '+fmt(x[1])+' m</b> and <b>'+y[0]+' '+fmt(y[1])+' m</b>. Round both to the nearest 100 m. Approximately how many metres higher is '+x[0]+'?',[{id:'a',suffix:'m (approx.)',w:'4.5em'}],{a:r100(x[1])-r100(y[1])},'Round '+fmt(x[1])+' to '+fmt(r100(x[1]))+' and '+fmt(y[1])+' to '+fmt(r100(y[1]))+'. Then subtract.')});
add('est',()=>{const t=pick([300,350,400,450,500,550,600,650,700,800,900,1000]);
  return{prompt:'Find <b>two numbers</b>, neither a multiple of 10, that add up to exactly <b>'+t+'</b> and whose estimate (both rounded to the nearest 10) is also exactly <b>'+t+'</b>.',
   render(b){this.r=inputs(b,[{id:'a',label:'1st number',mode:'numeric',w:'4.5em'},{id:'b',label:'2nd number',mode:'numeric',w:'4.5em'}])},
   check(){const a=num(this.r.a.value),b=num(this.r.b.value);if(isNaN(a)||isNaN(b))return{ok:false,hint:'Write a number in each box.'};
     if(a%10===0||b%10===0)return{ok:false,hint:'Neither number can be a multiple of 10.'};if(a+b!==t)return{ok:false,hint:'Add your two numbers. Do they make '+t+'?'};
     if(r10(a)+r10(b)!==t)return{ok:false,hint:'Round each number to the nearest 10 and add: '+r10(a)+' + '+r10(b)+' = '+(r10(a)+r10(b))+'. That is not '+t+'. Try a number that rounds down and one that rounds up.'};return{ok:true}},
   answer:'For example '+(t/2-7)+' and '+(t/2+7)+' ('+r10(t/2-7)+' + '+r10(t/2+7)+' = '+t+')',auto(){this.r.a.value=t/2-7;this.r.b.value=t/2+7}}},'Think');
/* C. add and subtract */
add('ads',()=>{const a=rnd(120,499),h=rnd(1,4),t=rnd(1,9),o=rnd(1,9),b=h*100+t*10+o;
  return ask('Add on to work out <b>'+a+' + '+b+'</b>: '+a+' + '+h*100+' = ___, then + '+t*10+' = ___, then + '+o+' = ___',[{id:'a',w:'4em'},{id:'b',w:'4em'},{id:'c',w:'4em'}],{a:a+h*100,b:a+h*100+t*10,c:a+b},'Add the hundreds, then the tens, then the ones to the number you have each time.')});
add('ads',()=>{const ha=rnd(1,4),ta=rnd(1,9),oa=rnd(1,9),hb=rnd(1,4),tb=rnd(1,9),ob=rnd(1,9),a=ha*100+ta*10+oa,b=hb*100+tb*10+ob;
  return ask('Decompose to work out <b>'+a+' + '+b+'</b>. Add the hundreds, then the tens, then the ones, then find the total.',[{id:'a',label:'Hundreds',w:'4em'},{id:'b',label:'Tens',w:'4em'},{id:'c',label:'Ones',w:'4em'},{id:'d',label:'Total',w:'4em'}],{a:(ha+hb)*100,b:(ta+tb)*10,c:oa+ob,d:a+b},
   'Hundreds: '+ha*100+' + '+hb*100+'. Tens: '+ta*10+' + '+tb*10+'. Ones: '+oa+' + '+ob+'. Then add the three answers.')});
add('ads',()=>{for(;;){const a=rnd(1200,5999),b=rnd(1200,3999),s=String(a).split('').reverse(),t=String(b).split('').reverse();let c=0,k=0;for(let i=0;i<4;i++){const x=+s[i]+ +t[i]+c;if(x>=10){k++;c=1}else c=0}if(k<2)continue;
  return{prompt:'Work out in columns: <b>'+fmt(a)+' + '+fmt(b)+'</b>. (Estimate first: about '+fmt(r1000(a)+r1000(b))+'.)',render(bx){bx.insertAdjacentHTML('beforeend',colHTML(a,b,'+'));this.r=inputs(bx,[{id:'a',label:'=',w:'6em'}])},
   check(){return num(this.r.a.value)===a+b?{ok:true}:{ok:false,hint:'Start with the ones. Carry when a column makes 10 or more. Check your answer is close to the estimate.'}},answer:fmt(a+b),auto(){this.r.a.value=a+b}}}});
add('ads',()=>{let a,b,h,t,o;for(;;){a=rnd(400,999);h=rnd(1,3);t=rnd(1,9);o=rnd(1,9);b=h*100+t*10+o;if(a-b>0)break}
  return ask('Subtract back to work out <b>'+a+' − '+b+'</b>: '+a+' − '+h*100+' = ___, then − '+t*10+' = ___, then − '+o+' = ___',[{id:'a',w:'4em'},{id:'b',w:'4em'},{id:'c',w:'4em'}],{a:a-h*100,b:a-h*100-t*10,c:a-b},'Take away the hundreds, then the tens, then the ones.')});
add('ads',()=>{const A=rnd(5,9),B=rnd(0,5),C=rnd(0,4),n=A*100+B*10+C,D=rnd(1,A-2),E=rnd(B+1,9),F=rnd(C+1,9),m=D*100+E*10+F;
  return ask('To work out <b>'+n+' − '+m+'</b> in columns you need to regroup <b>'+n+'</b>. Regroup it as <b>'+(A-1)+' hundreds, ___ tens and ___ ones</b>.',[{id:'a',label:'Tens',w:'4em'},{id:'b',label:'Ones',w:'4em'}],{a:B+9,b:C+10},
   'The ones digit ('+C+') is too small, and so is the tens digit ('+B+'). Take 1 hundred = 10 tens. Then take 1 ten = 10 ones.')});
add('ads',()=>{for(;;){const a=rnd(3000,9000),b=rnd(1100,a-600),s=String(a).split('').reverse(),t=String(b).padStart(4,'0').split('').reverse();let k=0;for(let i=0;i<4;i++)if(+s[i]<+t[i])k++;if(k<1)continue;
  return{prompt:'Work out in columns: <b>'+fmt(a)+' − '+fmt(b)+'</b>. (Estimate first: about '+fmt(r1000(a)-r1000(b))+'.)',render(bx){bx.insertAdjacentHTML('beforeend',colHTML(a,b,'−'));this.r=inputs(bx,[{id:'a',label:'=',w:'6em'}])},
   check(){return num(this.r.a.value)===a-b?{ok:true}:{ok:false,hint:'Start with the ones. If the top digit is smaller, regroup from the next column. Check with addition: answer + '+fmt(b)+' should be '+fmt(a)+'.'}},answer:fmt(a-b),auto(){this.r.a.value=a-b}}}});
add('ads',()=>{const s=rnd(2000,5000),so=rnd(300,900),mo=rnd(500,1500),T=pick([['stickers','The shop had','sold','got','more']]);
  return ask('A shop had <b>'+fmt(s)+'</b> stickers. It sold <b>'+so+'</b> and then got <b>'+fmt(mo)+'</b> more. How many stickers does the shop have now?',[{id:'a',suffix:'stickers',w:'5.5em'}],{a:s-so+mo},'Two steps: first take away what was sold, then add the new stickers.')});
add('ads',()=>{const x=rnd(1000,4000),y=rnd(1000,4000);
  return ask('Find the missing number: <b>___ − '+fmt(x)+' = '+fmt(y)+'</b>',[{id:'a',w:'6em'}],{a:x+y},'Use the inverse: add. The missing number is '+fmt(y)+' + '+fmt(x)+'. Then check by subtracting.')},'Think');
/* D. facts */
add('fct',()=>{const t=pick([3,4,6,7,8,9]),k=pick([2,3]);
  return ask('Use the array idea. <b>'+k+' × '+t+' = ___</b>, double it: <b>'+2*k+' × '+t+' = ___</b>, triple it: <b>'+3*k+' × '+t+' = ___</b>',[{id:'a',w:'4em'},{id:'b',w:'4em'},{id:'c',w:'4em'}],{a:k*t,b:2*k*t,c:3*k*t},'Doubling means × 2. Tripling means × 3.')});
add('fct',()=>{const x=pick([2,3,4]),t=pick([3,6,7,9]),p=x*t;
  return ask('<b>'+x+' × '+t+' = '+p+'</b>. Use doubling: <b>'+2*x+' × '+t+' = ___</b> and <b>'+4*x+' × '+t+' = ___</b>',[{id:'a',w:'4em'},{id:'b',w:'4em'}],{a:2*p,b:4*p},'Double '+p+' for the first. Double again for the second.')});
add('fct',()=>{let a=rnd(3,9),b=rnd(3,9);while(a===b)b=rnd(3,9);const p=a*b;
  return ask('<b>'+a+' × '+b+' = '+p+'</b>. Write the two division facts: <b>'+p+' ÷ '+a+' = ___</b> and <b>'+p+' ÷ '+b+' = ___</b>',[{id:'a',w:'4em'},{id:'b',w:'4em'}],{a:b,b:a},'Division undoes multiplication. Think: what multiplied by '+a+' makes '+p+'?')});
add('fct',()=>{const t=rnd(3,9),q=rnd(3,9),u=rnd(3,9),v=rnd(3,9),w=rnd(3,9);
  return ask('Find the missing numbers: <b>___ × '+t+' = '+t*q+'</b> &nbsp; <b>'+u*v+' ÷ ___ = '+v+'</b> &nbsp; <b>___ ÷ '+w+' = '+q+'</b>',[{id:'a',label:'1st',w:'4em'},{id:'b',label:'2nd',w:'4em'},{id:'c',label:'3rd',w:'4em'}],{a:q,b:u,c:q*w},'Use the fact family. For the 3rd one: what do you divide by '+w+' to get '+q+'? Multiply: '+q+' × '+w+'.')});
add('fct',()=>{const r=rnd(3,9),s=rnd(3,9),s2=rnd(3,9),q=rnd(3,9);
  return ask('A hall has <b>'+r+' rows</b> of <b>'+s+' chairs</b>. a) How many chairs are there? Then <b>'+s2*q+' more chairs</b> are put in rows of <b>'+s2+'</b>. b) How many new rows are there?',[{id:'a',label:'a) chairs',w:'4em'},{id:'b',label:'b) rows',w:'4em'}],{a:r*s,b:q},'a) multiply rows by chairs in each row. b) divide the chairs by the number in each row.')});
add('fct',()=>{const a=pick([3,4,6,7,8,9]),b=pick([3,4,6,7,8,9]),p=a*b;
  return ask('<b>'+a+' × '+b+' = '+p+'</b>. Use this to work out: <b>'+a+' × '+2*b+' = ___</b>, <b>'+10*a+' × '+b+' = ___</b>, <b>'+10*p+' ÷ '+a+' = ___</b>',[{id:'a',w:'4em'},{id:'b',w:'4.5em'},{id:'c',w:'4em'}],{a:2*p,b:10*p,c:10*b},'2 × '+b+' is double '+b+'. 10 × '+a+' is 10 times as big. For the division: '+10*p+' is 10 times '+p+'.')},'Think');
const MISS_OF={dec:1,est:2,ads:3,fct:4,final:5};
SECTIONS.push({id:'final',title:'Unit 3 Challenge',sub:'10 mixed questions on everything in Unit 3. Two of them are hard (Think harder). Can you get all 10?'});
[0,2,5,7,10,14,18,20,22,24].forEach(i=>QS.push({sec:'final',gen:QS[i].gen,tag:QS[i].tag,src:i,fixed:false}));

/* ---------- storage, results ---------- */
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(_){return null}};
const R={xb:+ls('t3xb')||0,xm:+ls('t3xm')||0,xd:+ls('t3xd')||0,dr:+ls('t3dr')||0,er:+ls('t3er')||0,ar:+ls('t3ar')||0,tr:+ls('t3tr')||0,fm:+ls('t3fm')||0,solved:0,total:0};
document.getElementById('artog').onclick=()=>{const h=document.body.classList.toggle('noar');document.getElementById('artog').textContent=h?'إظهار الشرح بالعربي / Show Arabic help':'إخفاء الشرح بالعربي / Hide Arabic help'};
const nmEl=document.getElementById('nm');nmEl.value=ls('t3name')||ls('t4name')||'';
nmEl.addEventListener('input',()=>{ls('t3name',nmEl.value);queueSave()});
const myName=()=>(nmEl.value||'').trim()||'Student';
function resultText(only){const nm=n=>+ls('t3m'+n)||0;const tot=k=>secCount[k]||0;
  const q=n=>{const m=MIS.find(x=>x.n===n);return nm(n)+' / '+m.secs.reduce((s,k)=>s+tot(k),0)};
  const GM={1:' · Decompose Race best score: '+(R.dr||'not played'),2:' · Estimate Race best score: '+(R.er||'not played'),3:' · Mental Maths Rush best score: '+(R.ar||'not played'),4:' · Times Table Race best score: '+(R.tr||'not played')+' · Fact Match: '+(R.fm?R.fm+' moves':'not played')};
  [{3:' · Mistake Detective: '+(R.xm||0)+' cases closed',5:' · Boss battles won: '+(R.xb||0)}].forEach(o=>Object.keys(o).forEach(k=>GM[k]=(GM[k]||'')+o[k]));
  const sum=[1,2,3,4,5].reduce((s,n)=>s+nm(n),0),all=[1,2,3,4,5].reduce((s,n)=>s+MIS.find(x=>x.n===n).secs.reduce((t,k)=>t+tot(k),0),0);
  const line=n=>'Mission '+n+' · '+MIS.find(x=>x.n===n).title+': '+q(n)+(GM[n]||'');
  if(only)return 'ThinkUp Year 4 · Unit 3 Calculating\nName: '+myName()+'\n\n'+line(only);
  return 'ThinkUp Year 4 · Unit 3 Calculating\nName: '+myName()+'\n\n'+[1,2,3,4,5].map(line).join('\n')+'\n\nTotal questions: '+sum+' / '+all}
function confetti(){for(let i=0;i<18;i++){const e=document.createElement('div');e.className='conf';e.textContent=['⭐','🎉','✨','🌟'][i%4];e.style.left=Math.random()*100+'vw';e.style.animationDelay=(Math.random()*.4)+'s';document.body.appendChild(e);setTimeout(()=>e.remove(),2200)}}
function showResult(){const pg=document.body.dataset.page||'map',one=pg==='map'?0:+pg.slice(1);const txt=resultText(one);const w=document.getElementById('wa');if(w)w.href='https://wa.me/201026794126?text='+encodeURIComponent(txt);document.getElementById('resulttext').textContent=txt;if(one){const h=document.querySelector('#resultcard h2'),p=document.querySelector('#resultcard p');if(h)h.textContent='Send this mission\'s result to Miss Eman';if(p)p.textContent='Finished this mission? Type your name at the top, then press the green button.';const wa=document.getElementById('wa');if(wa)wa.textContent='Send this mission to Miss Eman (WhatsApp)';const cp=document.getElementById('copyres');if(cp)cp.textContent='Copy my result'}document.getElementById('resultcard').classList.add('show')}
function queueSave(){showResult()}
document.getElementById('copyres').onclick=()=>{const pg=document.body.dataset.page||'map',t=resultText(pg==='map'?0:+pg.slice(1)),fb=document.getElementById('copyfb');
  const ok=()=>{fb.className='fb good';fb.textContent='Copied! Send it to your teacher.'};const no=()=>{fb.className='fb info';fb.textContent='Select the text above and copy it.'};
  try{navigator.clipboard.writeText(t).then(ok,no)}catch(_){no()}};
{const note=document.getElementById('savenote');if(note){note.hidden=false;note.textContent='Type your name, play all the missions, then come back to the Mission Map and press the green button to send ALL your results to Miss Eman.'}}

/* ---------- games ---------- */
const gamesEl=document.getElementById('games');
function gcard(title,pill,desc,ar,em){const g=document.createElement('div');g.className='g';g.innerHTML='<div class="gribbon"><img alt="ThinkUp" src="logo.png"><span>ThinkUp Games · Think Better. Aim Higher.</span></div><h3><span class="mascot" style="font-size:34px">'+em+'</span>'+title+' <span class="pill">'+pill+'</span></h3><div class="gtip">'+desc+(ar?'<div class="ar" lang="ar">'+ar+'</div>':'')+'</div><div class="gbody"></div>';gamesEl.appendChild(g);return g.querySelector('.gbody')}
const mkbtn=(t,fn,cls)=>{const b=document.createElement('button');b.type='button';b.textContent=t;if(cls)b.className=cls;b.onclick=fn;return b};
function raceGame(body,key,best,qfn,seconds){
  const area=document.createElement('div');area.className='gbody';area.style.width='100%';const bar=document.createElement('div');bar.className='timer';bar.innerHTML='<i></i>';const fill=bar.firstChild;
  const info=document.createElement('div');info.className='big';info.textContent='Best: '+(R[best]||'–');
  let score=0,streak=0,left=0,iv=null;const play=document.createElement('div');play.className='gbody';
  const api={right(){streak++;score+=10+(streak>=3?5:0);info.textContent='Score: '+score;next()},wrong(b){streak=0;b.classList.add('shake');b.disabled=true;score=Math.max(0,score-2);info.textContent='Score: '+score}};
  function next(){play.innerHTML='';qfn(play,api)}
  function end(){clearInterval(iv);play.innerHTML='';if(score>R[best]){R[best]=score;ls(key,score)}info.textContent='Time! Score: '+score+(score>=R[best]?' ★ best':'')+' · Best: '+R[best];queueSave();startB.hidden=false;startB.textContent='Play again'}
  const startB=mkbtn('Start',()=>{score=0;streak=0;left=seconds;startB.hidden=true;info.textContent='Score: 0';next();fill.style.width='100%';clearInterval(iv);iv=setInterval(()=>{left-=0.25;fill.style.width=Math.max(0,left/seconds*100)+'%';if(left<=0)end()},250)});
  area.append(info,bar,play,startB);body.append(area)}
const RACEDESC='Each right answer gives 10 points (3 in a row gives bonus points). A wrong answer takes away 2 points.';
const RACEAR='كل إجابة صح 10 نقاط، وكل غلطة بتخصم نقطتين.';
/* Game 1: decompose race */
(function(){
  const body=gcard('Decompose Race','45 seconds','<b>How to play:</b> press <b>Start</b>. Find the missing part of the number. '+RACEDESC,'طريقة اللعب: دوس Start. دوّر على الجزء الناقص في تفكيك الرقم. '+RACEAR,'🧱');
  raceGame(body,'t3dr','dr',(play,api)=>{const ds=[rnd(1,9),rnd(1,9),rnd(1,9),rnd(1,9)],n=+ds.join(''),k=rnd(1,3),pv=[1000,100,10,1],parts=ds.map((d,i)=>d*pv[i]),v=parts[k];
    const html=fmt(n)+' = '+parts.map((p,i)=>i===k?'<u style="color:#C8452F">?</u>':fmt(p)).join(' + ');
    const w=sample([1,2,3].filter(i=>i!==k),2).map(i=>ds[k]*pv[i]);optQ(play,api,html,fmt(v),w.filter(x=>x!==v).map(fmt).concat([fmt(v*10)]).slice(0,2))},45);
})();
/* Game 2: estimate race */
(function(){
  const body=gcard('Estimate Race','45 seconds','<b>How to play:</b> press <b>Start</b>. Round each number as asked, then tap the best estimate. '+RACEDESC,'طريقة اللعب: دوس Start. قرّب كل رقم زي المطلوب وبعدها اختار أحسن تقدير. '+RACEAR,'🎯');
  raceGame(body,'t3er','er',(play,api)=>{const big=Math.random()<.5,a=big?rnd(300,900):rnd(21,89),b=big?rnd(120,299):rnd(21,89),add2=Math.random()<.5,A=add2?a:Math.max(a,b),B=add2?b:Math.min(a,b),
      est=add2?r10(A)+r10(B):r10(A)-r10(B);
    optQ(play,api,'Estimate<br>'+A+(add2?' + ':' − ')+B+'<br><small>(round to the nearest 10)</small>',est,[est+10,est-10])},45);
})();
/* Game 3: add and subtract rush */
(function(){
  const body=gcard('Mental Maths Rush','45 seconds','<b>How to play:</b> press <b>Start</b>. Use a near multiple of 10 or 100 to work it out in your head. '+RACEDESC,'طريقة اللعب: دوس Start. استخدم أقرب عشرة أو مئة عشان تحسبها في دماغك. '+RACEAR,'⚡');
  raceGame(body,'t3ar','ar',(play,api)=>{const k=pick([10,100]),dl=pick([-2,-1,1,2]),b=k*rnd(2,6)+dl*(k===10?1:1),a=rnd(b+20,b+300),add2=Math.random()<.5,ans=add2?a+b:a-b;
    optQ(play,api,a+(add2?' + ':' − ')+b,ans,[ans+(k===10?10:100),ans-(k===10?10:1)])},45);
})();
/* Game 4: times table race */
(function(){
  const body=gcard('Times Table Race','45 seconds','<b>How to play:</b> press <b>Start</b>. Tap the right answer to the multiplication or division fact. '+RACEDESC,'طريقة اللعب: دوس Start. دوس على الإجابة الصح لحقيقة الضرب أو القسمة. '+RACEAR,'✖️');
  raceGame(body,'t3tr','tr',(play,api)=>{const a=rnd(2,9),b=rnd(2,9),p=a*b,div=Math.random()<.5;
    if(div)optQ(play,api,p+' ÷ '+a,b,[b+1,b-1<1?b+2:b-1]);else optQ(play,api,a+' × '+b,p,[p+a,p-b>0?p-b:p+b+1])},45);
})();
/* Game 5: fact memory */
(function(){
  const body=gcard('Fact Match','6 pairs','<b>How to play:</b> press <b>Start</b>. Turn over two cards. If a fact matches its answer, the pair stays. Find all 6 pairs with as few moves as you can.','طريقة اللعب: دوس Start. اقلب كارتين. لو المسألة وإجابتها متطابقين، الكارتين بيفضلوا. دوّر على الـ 6 أزواج بأقل عدد محاولات.','🧠');
  memGame(body,'fm','t3fm',np=>{const used=new Set(),out=[];while(out.length<np){const a=rnd(3,9),b=rnd(3,9),p=a*b,m=Math.random()<.5,B=String(m?p:b),A=m?a+' × '+b:p+' ÷ '+a;if(a===b||used.has(B)||used.has(A))continue;used.add(B);used.add(A);out.push([A,B])}return out},6);
})();

/* ---------- new game engines: boss battle, mistake detective, builders ---------- */
const NGf=n=>{const neg=n<0,s=String(Math.abs(n));return (neg?'−':'')+(Math.abs(n)>=10000?s.replace(/\B(?=(\d{3})+(?!\d))/g,' '):s)};
const NGfr=(n,d)=>'<span class="fr"><i>'+n+'</i><i>'+d+'</i></span>';
function NGopts(ans,wr){const A=String(ans),s=[A];shuffle(wr.map(String)).forEach(x=>{if(!s.includes(x)&&s.length<3)s.push(x)});
  const b=parseFloat(A.replace(/ /g,'').replace(/−/g,'-'));for(let k=1;s.length<3&&!isNaN(b);k++){[b+k,b-k].forEach(c=>{const t=NGf(c);if(!s.includes(t)&&s.length<3)s.push(t)})}return shuffle(s)}
function NGdragon(hp,col){return '<svg viewBox="0 0 200 190" aria-label="Boss" style="width:150px"><path d="M30 150 Q10 100 45 70 L40 25 L68 50 Q100 38 132 50 L160 25 L155 70 Q190 100 170 150 Q100 188 30 150Z" fill="'+col+'" stroke="#0F2742" stroke-width="5" stroke-linejoin="round"/><path d="M40 25 L52 55 L68 50Z M160 25 L148 55 L132 50Z" fill="#E0A21B" stroke="#0F2742" stroke-width="4" stroke-linejoin="round"/><ellipse cx="100" cy="140" rx="46" ry="30" fill="#FBE9B7" stroke="#0F2742" stroke-width="4"/><circle cx="76" cy="88" r="15" fill="#fff" stroke="#0F2742" stroke-width="4"/><circle cx="124" cy="88" r="15" fill="#fff" stroke="#0F2742" stroke-width="4"/><circle cx="79" cy="91" r="6" fill="#0F2742"/><circle cx="121" cy="91" r="6" fill="#0F2742"/><path d="M82 118 Q100 132 118 118" fill="none" stroke="#0F2742" stroke-width="5" stroke-linecap="round"/><text x="100" y="146" font-family="Baloo 2,Trebuchet MS,sans-serif" font-weight="800" font-size="26" text-anchor="middle" fill="#0F2742">'+hp+'/10</text></svg>'}
function NGboss(c){
  const body=gcard(c.title,'10 health points','<b>How to play:</b> press <b>Start battle</b>. Answer the question. A right answer hits the boss (it loses 1 health). A wrong answer lets it heal 1 health, and you get a hint. Beat the boss to win!','طريقة اللعب: دوس Start battle. جاوب على السؤال. الإجابة الصح بتضرب الزعيم، والغلط بيرجّع له نقطة وبتاخد تلميح. اهزم الزعيم!','🐉');
  const info=document.createElement('div');info.className='mdinfo';const boss=document.createElement('div');boss.className='bossbox';const hpEl=document.createElement('div');hpEl.className='hp5';
  const qEl=document.createElement('div');qEl.className='bbq';const oEl=document.createElement('div');oEl.className='opts';const fb=document.createElement('div');fb.className='fb';fb.setAttribute('aria-live','polite');
  const st=mkbtn('Start battle',()=>go());body.append(info,boss,hpEl,qEl,oEl,fb,st);
  let hp=10,streak=0,Q=null,on=false;
  const draw=()=>{boss.innerHTML=NGdragon(hp,c.color||'#1F7A7A');hpEl.innerHTML=Array.from({length:10},(_,i)=>'<i class="'+(i<hp?'':'off')+'"></i>').join('')};
  const ask=()=>{Q=pick(c.gens)();qEl.innerHTML=Q.h;oEl.innerHTML='';NGopts(Q.a,Q.wr).forEach(v=>{const b=mkbtn(v,()=>hit(b,v===String(Q.a)),'opt');b.innerHTML=Q.html?Q.html(v):v;oEl.append(b)});window.__NGB={ans:String(Q.a)}};
  function hit(b,ok){if(!on)return;
    if(ok){streak++;hp=Math.max(0,hp-1);fb.className='fb good';fb.textContent=streak>=3?'🔥 '+streak+' in a row! Direct hit!':'✓ Hit! The boss loses 1 health.';draw();
      if(hp===0){on=false;qEl.innerHTML='<b class="winb">🏆 You beat the boss!</b>';oEl.innerHTML='';fb.textContent='';R.xb=(R.xb||0)+1;ls(c.ls,R.xb);confetti();queueSave();st.hidden=false;st.textContent='Play again';info.textContent='Bosses beaten: '+R.xb;return}ask()}
    else{streak=0;hp=Math.min(10,hp+1);fb.className='fb bad';fb.innerHTML='Oops, the boss heals 1 health. Hint: '+Q.hint;b.disabled=true;draw()}
    info.textContent='Streak: '+streak+' · Bosses beaten: '+(R.xb||0)}
  function go(){hp=10;streak=0;on=true;st.hidden=true;fb.textContent='';info.textContent='Bosses beaten: '+(R.xb||0);draw();ask()}
  info.textContent='Bosses beaten: '+(R.xb||0);draw()}
/* mistake detective: a list of claims, 3 are wrong */
function NGclaims(c){
  const body=gcard('Mistake Detective','3 mistakes in every case','<b>How to play:</b> press <b>Start case</b>. Some answers are right and <b>3 are wrong</b>. Tap each wrong answer. If you tap a right one, you use up a try. Close as many cases as you can.','طريقة اللعب: دوس Start case. فيه إجابات صح و3 غلط. دوس على كل إجابة غلط. لو دوست على إجابة صح بتتحسب محاولة غلط. اقفل أكبر عدد من القضايا.','🕵️');
  const info=document.createElement('div');info.className='mdinfo';const stage=document.createElement('div');stage.className='mdstage';const fb=document.createElement('div');fb.className='fb';fb.setAttribute('aria-live','polite');const logEl=document.createElement('div');logEl.className='mdlog';
  const st=mkbtn('Start case',()=>next());body.append(info,stage,fb,logEl,st);
  let order=[],cur=null,found=0,miss=0,done=false,no=0;
  const upd=()=>{info.textContent='Case '+no+' · Found '+found+' / 3 · Wrong taps '+miss+' · Cases closed '+(R.xm||0)};
  function next(){if(!order.length)order=shuffle(c.gens.slice());const g=order.pop();const flags=shuffle([false,false,false,true,true,true,true,true]);
    cur=flags.map((ok,i)=>({i,ok,...g.item(ok)}));found=0;miss=0;done=false;no++;window.__NGC=cur;logEl.innerHTML='';fb.textContent='';fb.className='fb';
    stage.innerHTML='<div class="hint" style="margin:0 0 8px">'+g.intro+'</div><div class="claims">'+cur.map(x=>'<button type="button" class="claim" data-i="'+x.i+'">'+x.t+'</button>').join('')+'</div>';st.hidden=true;upd()}
  stage.addEventListener('click',e=>{if(done||!cur)return;const el=e.target.closest('.claim');if(!el||el.classList.contains('found'))return;const x=cur[+el.dataset.i];
    if(x.ok){miss++;fb.className='fb bad';fb.textContent='That one is correct. Look again!';upd();return}
    found++;el.classList.add('found');fb.className='fb good';fb.textContent='✓ You found a mistake!';logEl.insertAdjacentHTML('beforeend','<div class="item">✓ '+x.fix+'</div>');upd();
    if(found===3){done=true;const s=miss<=1?'⭐⭐⭐':miss<=3?'⭐⭐':'⭐';R.xm=(R.xm||0)+1;ls(c.ls,R.xm);fb.textContent='🏆 Case closed! '+s;confetti();queueSave();upd();st.hidden=false;st.textContent='Next case'}});
  info.textContent='Cases closed: '+(R.xm||0)}
/* number line builder */
function NGnumline(c){
  const body=gcard('Number Line Builder','8 numbers','<b>How to play:</b> press <b>Start</b>. A number appears. Tap the place on the number line where it belongs. Try to get all 8 on the first try.','طريقة اللعب: دوس Start. هيظهر رقم. دوس على مكانه على خط الأعداد. حاول تجيب الـ 8 من أول مرة.','📏');
  const info=document.createElement('div');info.className='mdinfo';const q=document.createElement('div');q.className='bbq';const area=document.createElement('div');area.className='chartbox';const fb=document.createElement('div');fb.className='fb';
  const st=mkbtn('Start',()=>go());body.append(info,q,area,fb,st);
  let n=0,score=0,tgt=0,tries=0,on=false;const lo=-10,hi=10;
  function line(){const W=360,L=18,pw=W-2*L;let s='<svg class="chart" viewBox="0 0 '+W+' 80" role="img" aria-label="number line"><line x1="8" y1="38" x2="352" y2="38" stroke="var(--ink)" stroke-width="2.5"/>';
    for(let v=lo;v<=hi;v++){const x=L+pw*(v-lo)/(hi-lo);s+='<line x1="'+x+'" y1="'+(v%5===0?28:32)+'" x2="'+x+'" y2="44" stroke="var(--ink)" stroke-width="'+(v===0?3:1.5)+'"/>';if(v%5===0)s+='<text x="'+x+'" y="62" font-size="12" font-weight="800" text-anchor="middle" fill="var(--ink)">'+(v<0?'−'+(-v):v)+'</text>';
      s+='<g class="nlhit" data-v="'+v+'" style="cursor:pointer"><rect x="'+(x-8)+'" y="18" width="16" height="40" fill="transparent"/></g>'}return s+'</svg>'}
  area.innerHTML=line();
  area.addEventListener('click',e=>{if(!on)return;const g=e.target.closest('.nlhit');if(!g)return;const v=+g.dataset.v;
    if(v===tgt){if(tries===0)score++;fb.className='fb good';fb.textContent='✓ Yes! '+NGf(tgt)+' is there.';n++;if(n>=8)return end();setTimeout(nextQ,500)}
    else{tries++;fb.className='fb bad';fb.textContent=(v>tgt?'Too far right. Numbers on the left are smaller.':'Too far left. Numbers on the right are bigger.')+(tgt<0?' '+NGf(tgt)+' is a negative number: it is left of zero.':'')}});
  function nextQ(){tgt=rnd(lo,hi);window.__NGN=tgt;tries=0;q.innerHTML='Tap <b>'+NGf(tgt)+'</b> on the number line.';fb.textContent='';info.textContent='Number '+(n+1)+' / 8 · First-try score '+score}
  function end(){on=false;q.innerHTML='<b class="winb">Done! First-try score: '+score+' / 8</b>';fb.textContent='';if(score>(R.xd||0)){R.xd=score;ls(c.ls,score)}if(score>=6)confetti();queueSave();info.textContent='Best score: '+(R.xd||0)+' / 8';st.hidden=false;st.textContent='Play again'}
  function go(){n=0;score=0;on=true;st.hidden=true;nextQ()}
  info.textContent='Best score: '+(R.xd||0)+' / 8';q.textContent='Press Start to begin.'}
/* fraction builder */
function NGfracbuild(c){
  const body=gcard('Fraction Builder','6 builds','<b>How to play:</b> press <b>Start</b>. Tap the parts to shade the fraction you are asked for. Then press <b>Check</b>.','طريقة اللعب: دوس Start. دوس على الأجزاء عشان تلوّن الكسر المطلوب. بعدين دوس Check.','🍰');
  const info=document.createElement('div');info.className='mdinfo';const q=document.createElement('div');q.className='bbq';const topEl=document.createElement('div');const bar=document.createElement('div');bar.className='shade';const fb=document.createElement('div');fb.className='fb';
  const chk=mkbtn('Check',()=>check());const st=mkbtn('Start',()=>go());body.append(info,q,topEl,bar,fb,chk,st);
  let n=0,score=0,tgt=0,tries=0,on=false;const DEN=[2,3,4,5,6,8,10,12];
  const cells=()=>[...bar.children];
  function build(d){bar.innerHTML='';for(let i=0;i<d;i++){const b=document.createElement('button');b.type='button';b.className='cell';b.setAttribute('aria-label','part '+(i+1));b.onclick=()=>{if(on)b.classList.toggle('on')};bar.append(b)}}
  function nextQ(){tries=0;fb.textContent='';topEl.innerHTML='';const eq=n%2===1;
    if(!eq){const d=pick(DEN),k=rnd(1,d-1);tgt=k;build(d);q.innerHTML='Shade <b>'+NGfr(k,d)+'</b> of the bar.'}
    else{const d=pick([2,3,4,5,6]),m=pick([2,3,4].filter(x=>d*x<=12)),k=rnd(1,d-1);tgt=k*m;
      topEl.innerHTML='<div class="shade static">'+Array.from({length:d},(_,i)=>'<span class="cell'+(i<k?' on':'')+'"></span>').join('')+'</div>';build(d*m);q.innerHTML='The top bar shows <b>'+NGfr(k,d)+'</b>. Shade the <b>same amount</b> on the bottom bar ('+NGfr('?',d*m)+').'}
    window.__NGF=tgt;info.textContent='Build '+(n+1)+' / 6 · First-try score '+score}
  function check(){if(!on)return;const k=cells().filter(x=>x.classList.contains('on')).length;
    if(k===tgt){if(tries===0)score++;fb.className='fb good';fb.textContent='✓ Correct!';n++;if(n>=6)return end();setTimeout(nextQ,500)}
    else{tries++;fb.className='fb bad';fb.textContent=k===0?'Tap the parts to shade them.':'You shaded '+k+' parts. Count again: the numerator tells you how many parts to shade.'}}
  function end(){on=false;q.innerHTML='<b class="winb">Done! First-try score: '+score+' / 6</b>';topEl.innerHTML='';bar.innerHTML='';fb.textContent='';if(score>(R.xd||0)){R.xd=score;ls(c.ls,score)}if(score>=5)confetti();queueSave();info.textContent='Best score: '+(R.xd||0)+' / 6';st.hidden=false;st.textContent='Play again';chk.hidden=true}
  function go(){n=0;score=0;on=true;st.hidden=true;chk.hidden=false;nextQ()}
  chk.hidden=true;info.textContent='Best score: '+(R.xd||0)+' / 6';q.textContent='Press Start to begin.'}
/* shape builder: area and perimeter on a grid */
function NGshape(c){
  const body=gcard('Shape Builder','6 builds','<b>How to play:</b> press <b>Start</b>. Tap squares on the grid to build a shape with the <b>area</b> and the <b>perimeter</b> you are asked for. The squares must touch along a side. Then press <b>Check</b>.','طريقة اللعب: دوس Start. دوس على المربعات عشان تبني شكل بالمساحة والمحيط المطلوبين. المربعات لازم تتلامس بالضلع. بعدين دوس Check.','🧱');
  const info=document.createElement('div');info.className='mdinfo';const q=document.createElement('div');q.className='bbq';const live=document.createElement('div');live.className='hint';const grid=document.createElement('div');grid.className='sgrid';const fb=document.createElement('div');fb.className='fb';
  const chk=mkbtn('Check',()=>check());const clr=mkbtn('Clear',()=>{[...grid.children].forEach(x=>x.classList.remove('on'));upd()},'ghost');const st=mkbtn('Start',()=>go());body.append(info,q,live,grid,fb,chk,clr,st);
  const N=6;let n=0,score=0,A=0,P=0,tries=0,on=false;
  const set=()=>{const s=new Set();[...grid.children].forEach((x,i)=>{if(x.classList.contains('on'))s.add(i)});return s};
  const per=s=>{let p=0;s.forEach(i=>{const r=Math.floor(i/N),cc=i%N;[[r-1,cc],[r+1,cc],[r,cc-1],[r,cc+1]].forEach(([a,b])=>{if(a<0||b<0||a>=N||b>=N||!s.has(a*N+b))p++})});return p};
  const conn=s=>{if(!s.size)return false;const f=[...s][0],seen=new Set([f]),qq=[f];while(qq.length){const i=qq.pop(),r=Math.floor(i/N),cc=i%N;[[r-1,cc],[r+1,cc],[r,cc-1],[r,cc+1]].forEach(([a,b])=>{if(a>=0&&b>=0&&a<N&&b<N){const j=a*N+b;if(s.has(j)&&!seen.has(j)){seen.add(j);qq.push(j)}}})}return seen.size===s.size};
  function upd(){const s=set();live.textContent='Your shape now: area '+s.size+' square units · perimeter '+per(s)+' units'}
  function target(){const a=rnd(4,8),s=new Set([rnd(0,N*N-1)]);while(s.size<a){const i=pick([...s]),r=Math.floor(i/N),cc=i%N,nb=[[r-1,cc],[r+1,cc],[r,cc-1],[r,cc+1]].filter(([x,y])=>x>=0&&y>=0&&x<N&&y<N).map(([x,y])=>x*N+y);s.add(pick(nb))}window.__NGS=[...s];return{a,p:per(s)}}
  function nextQ(){tries=0;const t=target();A=t.a;P=t.p;grid.innerHTML='';for(let i=0;i<N*N;i++){const b=document.createElement('button');b.type='button';b.className='sc';b.setAttribute('aria-label','square '+(i+1));b.onclick=()=>{if(on){b.classList.toggle('on');upd()}};grid.append(b)}
    q.innerHTML='Build a shape with area <b>'+A+'</b> square units and perimeter <b>'+P+'</b> units.';fb.textContent='';upd();info.textContent='Build '+(n+1)+' / 6 · First-try score '+score}
  function check(){if(!on)return;const s=set();
    if(s.size===A&&per(s)===P&&conn(s)){if(tries===0)score++;fb.className='fb good';fb.textContent='✓ Correct! Area '+A+' and perimeter '+P+'.';n++;if(n>=6)return end();setTimeout(nextQ,700)}
    else{tries++;fb.className='fb bad';fb.textContent=s.size!==A?'The area is the number of squares. You have '+s.size+', you need '+A+'.':!conn(s)?'The squares must touch along a side.':'Right area, but the perimeter is '+per(s)+'. Count the outside edges. Try moving a square.'}}
  function end(){on=false;q.innerHTML='<b class="winb">Done! First-try score: '+score+' / 6</b>';grid.innerHTML='';live.textContent='';fb.textContent='';if(score>(R.xd||0)){R.xd=score;ls(c.ls,score)}if(score>=5)confetti();queueSave();info.textContent='Best score: '+(R.xd||0)+' / 6';st.hidden=false;st.textContent='Play again';chk.hidden=true;clr.hidden=true}
  function go(){n=0;score=0;on=true;st.hidden=true;chk.hidden=false;clr.hidden=false;nextQ()}
  chk.hidden=true;clr.hidden=true;info.textContent='Best score: '+(R.xd||0)+' / 6';q.textContent='Press Start to begin.'}

NGboss({title:'Boss Battle: The Calculation Cyclops',ls:'t3xb',color:'#C8452F',gens:[
 ()=>{const a=rnd(30,90),m=10*rnd(2,6),dl=pick([-1,1]),b=m+dl,add=Math.random()<.5,A=add?a:a+m,ans=add?A+b:A-b;return{h:'<b>'+A+(add?' + ':' − ')+b+'</b> = ?',a:String(ans),wr:[String(ans+1),String(ans-1),String(ans+10),String(ans-10)],hint:'Use the near multiple of 10: '+(add?'add ':'subtract ')+m+' first, then adjust by 1.'}},
 ()=>{const a=rnd(21,89),b=rnd(21,89),est=r10(a)+r10(b);return{h:'Estimate <b>'+a+' + '+b+'</b> (round to the nearest 10)',a:String(est),wr:[String(est+10),String(est-10),String(a+b)],hint:'Round '+a+' to '+r10(a)+' and '+b+' to '+r10(b)+', then add.'}},
 ()=>{const ds=[rnd(1,9),rnd(1,9),rnd(1,9),rnd(1,9)],n=+ds.join(''),k=rnd(1,3),pv=[1000,100,10,1],parts=ds.map((d,i)=>d*pv[i]);return{h:NGf(n)+' = '+parts.map((p,i)=>i===k?'<u>?</u>':NGf(p)).join(' + '),a:NGf(parts[k]),wr:[NGf(parts[k]*10),NGf(Math.max(1,parts[k]/10)),String(ds[k])],hint:'Each digit has its own value: look at its place.'}},
 ()=>{const a=rnd(3,9),b=rnd(3,9);return{h:'<b>'+a+' × '+b+'</b> = ?',a:String(a*b),wr:[String(a*b+a),String(a*b-b),String(a*b+b)],hint:'Use a fact you know: double or triple a smaller one.'}},
 ()=>{const a=rnd(3,9),b=rnd(3,9);return{h:'<b>'+a*b+' ÷ '+a+'</b> = ?',a:String(b),wr:[String(b+1),String(b-1<1?b+2:b-1),String(a)],hint:'Division undoes multiplication: what × '+a+' = '+a*b+'?'}},
 ()=>{const a=rnd(120,499),h=rnd(1,4),t=rnd(1,9),o=rnd(1,9),b=h*100+t*10+o;return{h:'<b>'+a+' + '+b+'</b> = ?',a:String(a+b),wr:[String(a+b+10),String(a+b-10),String(a+b+100)],hint:'Add the hundreds, then the tens, then the ones.'}}]});
NGclaims({ls:'t3xm',gens:[
 {intro:'Naomi used near multiples of 10. Tap the <b>wrong</b> answers.',item:ok=>{const m=10*rnd(2,6),dl=pick([-2,-1,1,2]),b=m+dl,a=rnd(b+10,99),add=Math.random()<.5,A=add?rnd(20,60):a,ans=add?A+b:A-b,w=ans+pick([1,-1,10,-10]);return{t:A+(add?' + ':' − ')+b+' = '+(ok?ans:w),fix:A+(add?' + ':' − ')+b+' = '+ans+', not '+w+'.'}}},
 {intro:'Naomi estimated by rounding to the nearest 10. Tap the <b>wrong</b> estimates.',item:ok=>{const a=rnd(210,890),b=rnd(120,a-100),est=r10(a)-r10(b),w=est+pick([10,-10,20]);return{t:a+' − '+b+' ≈ '+(ok?est:w),fix:'Round: '+r10(a)+' − '+r10(b)+' = '+est+', not '+w+'.'}}},
 {intro:'Naomi wrote times table facts. Tap the <b>wrong</b> ones.',item:ok=>{const a=rnd(3,9),b=rnd(3,9),p=a*b,w=p+pick([a,-a,b,-b,1,-1]);return{t:a+' × '+b+' = '+(ok?p:w),fix:a+' × '+b+' = '+p+', not '+w+'.'}}},
 {intro:'Naomi did column sums. Tap the <b>wrong</b> answers.',item:ok=>{const a=rnd(1200,5999),b=rnd(1200,3999),ans=a+b,w=ans+pick([100,-100,1000,-10]);return{t:NGf(a)+' + '+NGf(b)+' = '+NGf(ok?ans:w),fix:NGf(a)+' + '+NGf(b)+' = '+NGf(ans)+', not '+NGf(w)+'.'}}}]});

const AR=["فكّك الرقم حسب قيمة كل خانة: مئات وعشرات وآحاد.","الرقم الخماسي ليه خانة عشرات الآلاف. فكّكه خانة خانة.","ألف واحدة بتتحول لـ 10 مئات. زوّد 10 على عدد المئات.","الشكل التاني ناقص ألف، فزوّد 1000 على الجزء التاني.","اجمع كل اختيار. لما تشيل ألف لازم ترجّع 10 مئات.","احسبها: هل المجموع بيساوي الرقم الأصلي؟","استخدم أقرب عشرة: اطرح أو اجمع العشرة الأقرب وبعدين عدّل الفرق (1 أو 2).","قرّب كل رقم لأقرب 10 وبعدين اجمع أو اطرح.","قرّب كل رقم لأقرب 10: بص على خانة الآحاد. 5 أو أكتر يطلع لفوق.","قرّب لأقرب 1000: بص على خانة المئات.","احسب التقدير وبعدين الإجابة الحقيقية وقارن: هل أكبر ولا أصغر؟","قرّب الارتفاعين لأقرب 100 وبعدين اطرح.","دوّر على رقمين يجمعوا بالظبط على الرقم، وفي نفس الوقت واحد بيتقرب لتحت والتاني لفوق.","زوّد المئات وبعدين العشرات وبعدين الآحاد على الرقم اللي معاك.","اجمع المئات، وبعدها العشرات، وبعدها الآحاد، وبعدين اجمع الثلاثة.","ابدأ بالآحاد. احمل 1 لو الخانة وصلت 10 أو أكتر. قارن بالتقدير.","اطرح المئات وبعدين العشرات وبعدين الآحاد.","خد مئة = 10 عشرات، وبعدين عشرة = 10 آحاد.","ابدأ بالآحاد. لو الرقم اللي فوق أصغر استلف من الخانة اللي بعدها. اتأكد بالجمع.","خطوتين: اطرح اللي اتباع الأول وبعدين زوّد الجديد.","استخدم العملية العكسية: الرقم الناقص = الناتج + المطروح.","الضعف يعني × 2، والتلات أضعاف يعني × 3.","ضاعف الناتج، وبعدين ضاعفه تاني.","القسمة عكس الضرب. فكّر: إيه اللي لما أضربه في الرقم ده يطلع الناتج؟","استخدم عائلة الحقائق: الضرب والقسمة مرتبطين.","الصفوف × الكراسي للسؤال الأول. والقسمة للسؤال التاني.","استخدم الحقيقة اللي عندك: ×2 تضاعف، و×10 تكبّر 10 مرات."];

/* ---------- engine ---------- */
const main=document.getElementById('main'),nav=document.getElementById('nav');
let solved=0;const secCount={},secDone={};
function updateScore(){
  const _t=(typeof CUR!=='undefined'&&CUR&&CUR.secs)?CUR.secs.reduce((a,k)=>a+secCount[k],0):QS.length,_d=(typeof CUR!=='undefined'&&CUR&&CUR.secs)?CUR.secs.reduce((a,k)=>a+secDone[k],0):solved;
  document.getElementById('score').textContent=(typeof CUR!=='undefined'&&CUR&&!CUR.secs)?'Games':'★ '+_d+' / '+_t;
  document.getElementById('barfill').style.width=(100*_d/Math.max(1,_t))+'%';
  SECTIONS.forEach(s=>{const a=document.getElementById('chip-'+s.id);if(a)a.classList.toggle('done',secDone[s.id]===secCount[s.id]);const c=document.getElementById('cnt-'+s.id);if(c)c.textContent=secDone[s.id]+' / '+secCount[s.id]});
  if(typeof MIS!=='undefined')MIS.forEach(m=>{let d=0,t=0;m.secs&&m.secs.forEach(k=>{d+=secDone[k];t+=secCount[k]});const sv=+ls('t3m'+m.n)||0;if(!CUR||CUR.n!==m.n)d=sv;const e=document.getElementById('st-'+m.n);if(e&&t)e.textContent=d+' / '+t+(d===t?' ★ complete':' questions')});
  MIS.forEach(m=>{if(!m.secs)return;let d=0;m.secs.forEach(k=>d+=secDone[k]);if(CUR&&CUR.n===m.n&&d>(+ls('t3m'+m.n)||0))ls('t3m'+m.n,d)});
  R.solved=solved;R.total=QS.length;queueSave();
  if(_t>0&&_d===_t)document.getElementById('win').classList.add('show');
}
SECTIONS.forEach(s=>{
  secCount[s.id]=QS.filter(q=>q.sec===s.id).length;secDone[s.id]=0;
  const a=document.createElement('a');a.href='#';a.id='chip-'+s.id;a.textContent=s.title;a.onclick=e=>{e.preventDefault();document.getElementById('sec-'+s.id).scrollIntoView({behavior:'smooth',block:'start'})};nav.appendChild(a);
  const sec=document.createElement('section');sec.id='sec-'+s.id;sec.innerHTML='<h2>'+esc(s.title)+' <small id="cnt-'+s.id+'"></small></h2><p class="sub">'+esc(s.sub)+'</p>';main.appendChild(sec);
});
let n=0;const MCOUNT={};
QS.forEach(def=>{
  n++;const sec=document.getElementById('sec-'+def.sec);
  const card=document.createElement('div');card.className='q';sec.appendChild(card);
  let inst,attempts=0,done=false;
  const build=()=>{
    inst=def.gen();attempts=0;
    card.innerHTML='<div class="qh"><div class="num">'+qnum+'</div><div class="prompt">'+(def.tag?'<span class="tag">Think harder</span>':'')+inst.prompt+'</div></div><div class="body"></div>';
    const pr=card.querySelector('.prompt');const ar=document.createElement('div');ar.className='ar';ar.lang='ar';ar.textContent=AR[def.src!=null?def.src:n-1]||'';if(ar.textContent)pr.appendChild(ar);
    const body=card.querySelector('.body');inst.render(body);
    const row=document.createElement('div');row.className='row';
    const chk=document.createElement('button');chk.type='button';chk.textContent='Check';
    const nw=document.createElement('button');nw.type='button';nw.className='ghost';nw.textContent='New numbers';nw.hidden=!!def.fixed;
    const sh=document.createElement('button');sh.type='button';sh.className='ghost';sh.textContent='Show answer';sh.hidden=true;
    const fb=document.createElement('div');fb.className='fb';fb.setAttribute('aria-live','polite');
    row.append(chk,nw,sh);body.append(row,fb);
    const lockAll=()=>{body.querySelectorAll('input').forEach(i=>i.disabled=true);if(inst.lock)inst.lock();chk.disabled=true;nw.hidden=true;sh.hidden=true};
    chk.onclick=()=>{
      if(done)return;
      const r=inst.check();
      if(r.ok){done=true;card.classList.add('ok');fb.className='fb good';fb.textContent='✓ Correct! '+(r.note||'');confetti();lockAll();solved++;secDone[def.sec]++;updateScore()}
      else{attempts++;fb.className='fb bad';fb.textContent='Not yet. '+(r.hint||'Try again.');if(attempts>=2)sh.hidden=false}
    };
    sh.onclick=()=>{fb.className='fb info';fb.textContent='Answer: '+inst.answer+''+(def.fixed?'':'. Press "New numbers" to try another one.');if(inst.c&&inst.c.reveal)inst.c.reveal()};
    nw.onclick=()=>{if(!done)build()};
    body.querySelectorAll('input').forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter')chk.click()}));
  };
  const qnum=(MCOUNT[MISS_OF[def.sec]]=(MCOUNT[MISS_OF[def.sec]]||0)+1);build();
});

/* ---------- Mission Map ---------- */
const MIS=[
 {n:1,id:'mission-1',title:'Number Builder',tag:'DECOMPOSE AND REGROUP',ds:'Break numbers into parts and regroup them. Then play Decompose Race.',secs:['dec'],games:[0]},
 {n:2,id:'mission-2',title:'Round and Estimate',tag:'NEAR MULTIPLES AND ESTIMATING',ds:'Use rounding to estimate and to calculate in your head. Then play Estimate Race.',secs:['est'],games:[1]},
 {n:3,id:'mission-3',title:'Add and Subtract',tag:'ADDING AND SUBTRACTING',ds:'Adding on, subtracting back and column methods. Then play Mental Maths Rush.',secs:['ads'],games:[2,6]},
 {n:4,id:'mission-4',title:'Times Table Power',tag:'MULTIPLICATION AND DIVISION FACTS',ds:'Doubles, triples and fact families. Two games: Times Table Race and Fact Match.',secs:['fct'],games:[3,4]},
 {n:5,id:'mission-5',title:'Unit 3 Challenge',tag:'FINAL TEST: 10 MIXED QUESTIONS',ds:'Questions on everything in Unit 3, with 2 hard ones. Can you get all 10?',secs:['final'],games:[5],final:true}];
const mapv=document.createElement('div');mapv.id='mapview';
mapv.innerHTML='<h2 style="font-family:var(--display);font-weight:700;font-size:30px;margin:24px 0 0">🗺️ Mission Map</h2><p style="color:var(--muted);margin:2px 0 0">Tap a mission to play. Do them in order. You can play each mission again.</p><div class="maplist">'+MIS.map(m=>'<a class="mc'+(m.final?' final':'')+'" href="mission-'+m.n+'.html"><span class="no">'+m.n+'</span><span class="em" aria-hidden="true">'+['🧱','🎯','➕','✖️','🏆'][m.n-1]+'</span><span class="tx"><b>'+esc(m.title)+'</b><span class="tg">'+esc(m.tag)+'</span><span class="ds">'+esc(m.ds)+'</span><span class="st" id="st-'+m.n+'"></span></span><span class="go">PLAY</span></a>').join('')+'</div>';
nav.style.display='none';nav.before(mapv);document.getElementById('sec-games').hidden=true;
const GC=[...gamesEl.children];const missionEls=[];
MIS.forEach(m=>{const c=document.createElement('div');c.className='mission';c.id=m.id;
  c.innerHTML='<div class="mhead"><img alt="" src="logo.png"><span>Year 4 · Unit 3</span></div><a class="back" href="index.html">← Mission Map</a><h2 style="font-family:var(--display);font-weight:700;font-size:28px;margin:6px 0 0">'+m.n+'. '+esc(m.title)+'</h2>';
  (m.games||[]).forEach(g=>{const w=document.createElement('div');w.className='games';w.appendChild(GC[g]);c.appendChild(w)});
  (m.secs||[]).forEach(k=>c.appendChild(document.getElementById('sec-'+k)));
  main.appendChild(c);missionEls.push(c)});
const PAGE=document.body.dataset.page||'map';const CUR=MIS.find(x=>'m'+x.n===PAGE)||null;
mapv.classList.toggle('off',!!CUR);missionEls.forEach(c=>c.classList.toggle('on',!!CUR&&c.id===CUR.id));
if(CUR){document.title='ThinkUp Y4 Unit 3 · '+CUR.title;const hp=document.querySelector('header p');if(hp)hp.textContent='Mission '+CUR.n+': '+CUR.title}
updateScore();

/* floating send button + version */
(function(){const b=document.createElement('button');b.type='button';b.id='fsend';b.textContent='📤 Send my result';
b.onclick=()=>{const c=document.getElementById('resultcard');if(c){c.classList.add('show');c.scrollIntoView({behavior:'smooth',block:'center'})}};document.body.appendChild(b);
const f=document.querySelector('footer');if(f){const v=document.createElement('div');v.style.cssText='font-size:11px;opacity:.6;margin-top:8px';v.textContent='Version 2';f.appendChild(v)}})();
})();

function lum(hex){const c=hex.replace('#','');const r=parseInt(c.slice(0,2),16)/255,g=parseInt(c.slice(2,4),16)/255,b=parseInt(c.slice(4,6),16)/255;const f=v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);}
function ratio(a,b){const L1=lum(a),L2=lum(b);const hi=Math.max(L1,L2),lo=Math.min(L1,L2);return (hi+0.05)/(lo+0.05);}
const light={bg:'#F6F1E9',surface:'#FFFDF8',surface2:'#EFE8DC',ink:'#12151A',ink2:'#3E434B',ink3:'#6B7079',ink4:'#9A9EA5',brand:'#1B3A6B',signal:'#B5781C',up:'#0B7A4B',down:'#C0332A',upSoft:'#E3F2EA',downSoft:'#F8E5E2'};
const dark={bg:'#0A0D12',surface:'#11151C',surface2:'#171C25',ink:'#ECEEF1',ink2:'#B4BAC4',ink3:'#868D98',ink4:'#5D6470',brand:'#7FA6FF',signal:'#E8A93B',up:'#2FC48A',down:'#FF6A5C',upSoft:'#0F2A20',downSoft:'#33161A'};
function check(name,t){
  const pairs=[['ink / bg',t.ink,t.bg,4.5],['ink / surface',t.ink,t.surface,4.5],['ink2 / bg',t.ink2,t.bg,4.5],['ink3 / bg (small)',t.ink3,t.bg,4.5],['ink3 / surface',t.ink3,t.surface,4.5],['ink4 / bg (UI 3:1)',t.ink4,t.bg,3],['brand / bg',t.brand,t.bg,4.5],['brand / surface',t.brand,t.surface,4.5],['signal / bg',t.signal,t.bg,4.5],['signal / surface2',t.signal,t.surface2,4.5],['up / bg',t.up,t.bg,4.5],['down / bg',t.down,t.bg,4.5],['up / upSoft',t.up,t.upSoft,4.5],['down / downSoft',t.down,t.downSoft,4.5]];
  console.log('\n== '+name+' ==');
  for(const [lbl,a,b,min] of pairs){const r=ratio(a,b);console.log(`${r>=min?'PASS':'FAIL'}  ${r.toFixed(2)}:1 (min ${min})  ${lbl}`);}
}
check('LIGHT (Ledger)',light);
check('DARK (Terminal Night)',dark);
// colorblind-safe
console.log('\n== Colorblind-safe (up #2563EB / down #D97706) ==');
console.log('light up/bg', ratio('#2563EB',light.bg).toFixed(2), '| down/bg', ratio('#D97706',light.bg).toFixed(2));
console.log('dark up/bg', ratio('#2563EB',dark.bg).toFixed(2), '| down/bg', ratio('#D97706',dark.bg).toFixed(2));

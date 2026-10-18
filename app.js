/* ================= Configuración ================= */
const SUPABASE_URL='https://yjvhdkwdylrduunkbykw.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlqdmhka3dkeWxyZHV1bmtieWt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNjc1NzQsImV4cCI6MjEwNzg0MzU3NH0.r0b7VfCZIbTuEE7KA0vD-gUVfoZSfJSnyu-sLr-Xv2s';
const VERSION='1.3.2';
const VAPID_PUBLIC='BKdmYfjnL3uiR_q1sSb18aNBr2QnrcuWiZYZ8qwFTISiMWAzmgXHJcDMeQZGihYobRFfrj2FlSH1oXocK37StQo';
const LIBS={
  xlsx:'vendor/xlsx.full.min.js',
  jspdf:'vendor/jspdf.umd.min.js',
  autotable:'vendor/jspdf.plugin.autotable.min.js',
  html2canvas:'vendor/html2canvas.min.js'};
const _libs={};
function loadScript(k){return _libs[k]||(_libs[k]=new Promise((res,rej)=>{const s=document.createElement('script');s.src=LIBS[k];s.onload=res;s.onerror=()=>{delete _libs[k];rej(new Error('No se pudo cargar la herramienta de exportación. Revise la conexión.'))};document.head.appendChild(s)}))}
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});

const STEPS=[{k:'A',t:'Identificación'},{k:'B',t:'Domicilio'},{k:'C',t:'Actividad'},{k:'D',t:'Ahorro'},{k:'E',t:'Beneficiarios y referencias'},{k:'F',t:'Documentos'},{k:'G',t:'Declaraciones'},{k:'H',t:'Revisar y enviar'}];
const DEPTOS=['Atlántida','Choluteca','Colón','Comayagua','Copán','Cortés','El Paraíso','Francisco Morazán','Gracias a Dios','Intibucá','Islas de la Bahía','La Paz','Lempira','Ocotepeque','Olancho','Santa Bárbara','Valle','Yoro'];
const DECL=['Declaro que los fondos que depositaré provienen de actividades lícitas.','Conozco y acepto los estatutos y el reglamento de ahorro y crédito de la caja.','Me comprometo a asistir a las asambleas y reuniones ordinarias.','Sé que mis aportaciones a capital no se devuelven antes del plazo que fijan los estatutos.'];
const DEFAULT_PARAMS={nombre:'CACIH',lema:'Un camino hacia la inversión estratégica',registro:'',inscripcion:50,aportacion:200,ahorro_min:100,frecuencia:'Mensual',acepta_menores:true,exportar_solo_admin:true,minutos_inactividad:15};

/* ================= IndexedDB mínimo (borrador y cola sin conexión) ================= */
const idb={_db:null,
  open(){return this._db||(this._db=new Promise((res,rej)=>{const r=indexedDB.open('cacih',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))},
  async get(k){const db=await this.open();return new Promise((res,rej)=>{const r=db.transaction('kv').objectStore('kv').get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})},
  async set(k,v){const db=await this.open();return new Promise((res,rej)=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}};

/* ================= Estado ================= */
const S={session:null,perfil:null,params:{...DEFAULT_PARAMS},view:'nueva',step:0,errors:{},draft:null,queue:[],sent:null,
  filter:'Pendiente',q:'',bandeja:[],open:null,detail:null,mine:[],usuarios:[],uFilter:'Todos',uCount:{},uLog:[],uAction:null,syncing:false,busy:false};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const L=n=>'L '+Number(n||0).toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtDni=v=>{const d=String(v||'').replace(/\D/g,'');return d.length===13?d.slice(0,4)+'-'+d.slice(4,8)+'-'+d.slice(8):d};
const fecha=s=>s?new Date(s).toLocaleDateString('es-HN',{day:'2-digit',month:'short',year:'numeric'}):'';
const fechaHora=s=>s?new Date(s).toLocaleString('es-HN',{day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}):'';
function edad(nac){if(!nac)return null;const b=new Date(nac+'T12:00'),n=new Date();let a=n.getFullYear()-b.getFullYear();const m=n.getMonth()-b.getMonth();if(m<0||(m===0&&n.getDate()<b.getDate()))a--;return a}
const uuid=()=>crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)});
function toast(m,ms=2600){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>t.hidden=true,ms)}
const isOficina=()=>S.perfil&&S.perfil.activo&&['oficina','admin'].includes(S.perfil.rol);
const isAdmin=()=>S.perfil&&S.perfil.activo&&S.perfil.rol==='admin';
function errMsg(e){const m=(e&&(e.message||e.error_description))||String(e);
  if(/Invalid login/i.test(m))return 'Correo o contraseña incorrectos.';
  if(/Email not confirmed/i.test(m))return 'Falta confirmar el correo. Revise su bandeja de entrada o pida a la oficina que lo active.';
  if(/already registered/i.test(m))return 'Ese correo ya tiene una cuenta. Use Entrar.';
  if(/solicitudes_dni_vigente|duplicate key.*dni/i.test(m))return 'Ya existe una solicitud vigente con ese documento.';
  if(/documento_valido|dni_check/i.test(m))return 'El número de documento no tiene el formato correcto.';
  if(/Failed to fetch|NetworkError|network/i.test(m))return 'Sin conexión. Intente de nuevo cuando haya señal.';
  return m}

function blankDraft(){const p=S.params;return{client_id:uuid(),nombres:'',apellidos:'',dni:'',nac:'',sexo:'',civil:'',escolaridad:'',depend:'',aldea:'',municipio:'',depto:'Olancho',ref:'',cel:'',wa:true,cel2:'',email:'',vivienda:'',actividad:'',rubro:'',fuente:'',ingreso:'',pep:'No',pepCargo:'',ahorroIni:Number(p.ahorro_min),ahorroMes:Number(p.ahorro_min),frecuencia:p.frecuencia,pago:'Efectivo en reunión',boleta:'',benef:[{n:'',dni:'',p:'',pct:100}],tutor:{n:'',dni:'',p:''},decl:[false,false,false,false],consent:false,waAvisos:false,fotoDni1:'',fotoDni2:'',firma:'',tipoDoc:'DNI',docVence:'',nacionalidad:'Hondureña',lugarNac:'',llenado:'',lat:null,lng:null,gpsPrec:null,negocio:'',negocioDir:'',conyuge:{n:'',dni:'',tel:''},famDir:'No',famDirDet:'',refs:[{n:'',tel:'',rel:''},{n:'',tel:'',rel:''}],selfie:'',aRuego:false,testigo:{n:'',dni:''},firmaTestigo:''}}
function completarDraft(d){const b=blankDraft();for(const k in b)if(d[k]===undefined)d[k]=b[k];return d}
let saveT;function saveDraft(){clearTimeout(saveT);saveT=setTimeout(()=>idb.set('draft',S.draft).catch(()=>{}),300)}
async function saveQueue(){try{await idb.set('queue',S.queue)}catch(e){}}

/* ================= Validación ================= */
function validate(step){
  const d=S.draft,e={},a=edad(d.nac),p=S.params;
  if(step===0){
    if(!d.nombres.trim())e.nombres='Escriba los nombres como aparecen en el DNI.';
    if(!d.apellidos.trim())e.apellidos='Escriba los apellidos.';
    if(d.tipoDoc==='DNI'?!/^\d{13}$/.test(d.dni):!/^[A-Za-z0-9-]{5,20}$/.test(d.dni))e.dni=d.tipoDoc==='DNI'?'El DNI debe tener 13 dígitos.':'Número de documento de 5 a 20 letras o números.';
    else if(S.queue.some(q=>q.d.dni===d.dni&&q.d.client_id!==d.client_id))e.dni='Este documento ya está en su cola de envío.';
    if(!d.docVence)e.docVence='Indique la fecha de vencimiento del documento.';
    else if(new Date(d.docVence+'T23:59')<new Date())e.docVence='El documento está vencido. Pida al solicitante que lo renueve antes de afiliarse.';
    if(!d.nacionalidad.trim())e.nacionalidad='Indique la nacionalidad.';
    if(!d.lugarNac.trim())e.lugarNac='Indique el lugar de nacimiento.';
    if(!d.nac)e.nac='Indique la fecha de nacimiento.';
    else if(a<0||a>110)e.nac='Revise la fecha de nacimiento.';
    else if(a<18&&!p.acepta_menores)e.nac='La caja no está aceptando socios menores de edad.';
    if(!d.sexo)e.sexo='Seleccione una opción.';
  }
  if(step===1){
    if(!d.aldea.trim())e.aldea='Indique aldea, caserío o barrio.';
    if(!d.municipio.trim())e.municipio='Indique el municipio.';
    if(!/^\d{4}-?\d{4}$/.test(d.cel))e.cel='Celular de 8 dígitos (ej. 9876-5432).';
    if(!d.llenado)e.llenado='Indique dónde se llena la solicitud.';
    else if(d.llenado==='Vivienda del solicitante'&&d.lat==null)e.gps='Guarde la ubicación GPS de la vivienda.';
  }
  if(step===2){
    if(!d.actividad)e.actividad='Seleccione la actividad principal.';
    if(!d.fuente)e.fuente='Seleccione la fuente de ingresos.';
    if(!d.ingreso)e.ingreso='Seleccione un rango.';
    if(d.pep==='Sí'&&!d.pepCargo.trim())e.pepCargo='Indique el cargo.';
    if(conPareja(d)&&!d.conyuge.n.trim())e.conyuge='Escriba el nombre del cónyuge o compañero/a.';
    else if(conPareja(d)&&d.conyuge.dni&&!/^\d{13}$/.test(d.conyuge.dni))e.conyuge='El DNI del cónyuge debe tener 13 dígitos (o dejarlo vacío).';
    if(d.famDir==='Sí'&&!d.famDirDet.trim())e.famDirDet='Indique el directivo y el parentesco.';
  }
  if(step===3){
    if(Number(d.ahorroIni)<Number(p.ahorro_min))e.ahorroIni='El ahorro inicial mínimo es '+L(p.ahorro_min)+'.';
    if(Number(d.ahorroMes)<Number(p.ahorro_min))e.ahorroMes='La cuota mínima es '+L(p.ahorro_min)+'.';
    if(d.pago==='Depósito a cuenta de la caja'&&!d.boleta.trim())e.boleta='Anote el número de boleta.';
  }
  if(step===4){
    const t=d.benef.reduce((s,b)=>s+Number(b.pct||0),0);
    if(d.benef.some(b=>!b.n.trim()||!b.p))e.benef='Complete nombre y parentesco de cada beneficiario.';
    else if(d.benef.some(b=>b.dni&&!/^\d{13}$/.test(b.dni)))e.benef='El DNI de un beneficiario debe tener 13 dígitos (o dejarlo vacío).';
    else if(t!==100)e.benef='Los porcentajes suman '+t+'%; deben sumar 100%.';
    if(a!==null&&a<18&&(!d.tutor.n.trim()||!/^\d{13}$/.test(d.tutor.dni)))e.tutor='Socio menor de edad: complete nombre y DNI del padre, madre o tutor.';
    if(d.refs.some(r=>!r.n.trim()||!r.rel||!/^\d{4}-?\d{4}$/.test(r.tel)))e.refs='Complete las dos referencias: nombre, relación y teléfono de 8 dígitos.';
  }
  if(step===5){
    if(!d.fotoDni1)e.fotoDni1='Agregue la foto del frente del DNI.';
    if(!d.selfie)e.selfie='Tome una foto del rostro del solicitante.';
    if(!d.firma)e.firma=d.aRuego?'Marque la huella del solicitante en el recuadro.':'El solicitante debe firmar o marcar su huella.';
    if(d.aRuego&&(!d.testigo.n.trim()||!/^\d{13}$/.test(d.testigo.dni)))e.testigo='Complete nombre y DNI (13 dígitos) del testigo.';
    else if(d.aRuego&&!d.firmaTestigo)e.firmaTestigo='Falta la firma del testigo.';
  }
  if(step===6){
    if(d.decl.some(x=>!x))e.decl='El solicitante debe aceptar las cuatro declaraciones.';
    if(!d.consent)e.consent='Sin la autorización de datos no se puede registrar la solicitud.';
  }
  return e;
}
const conPareja=d=>['Casado/a','Unión libre'].includes(d.civil);
const firstInvalid=()=>{for(let i=0;i<7;i++)if(Object.keys(validate(i)).length)return i;return -1};

/* ================= Envío y cola sin conexión ================= */
function dataURLtoBlob(u){const[h,b]=u.split(',');const bin=atob(b);const a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return new Blob([a],{type:h.match(/:(.*?);/)[1]})}
function toRow(d,paths){
  return{client_id:d.client_id,promotor_nombre:S.perfil.nombre||S.session.user.email,
    nombres:d.nombres.trim(),apellidos:d.apellidos.trim(),dni:d.dni,fecha_nacimiento:d.nac,sexo:d.sexo,estado_civil:d.civil||null,escolaridad:d.escolaridad||null,dependientes:d.depend===''?null:Number(d.depend),
    aldea:d.aldea.trim(),municipio:d.municipio.trim(),departamento:d.depto,referencia:d.ref||null,celular:d.cel,whatsapp:!!d.wa,telefono_alterno:d.cel2||null,email:d.email||null,vivienda:d.vivienda||null,
    actividad:d.actividad,rubro:d.rubro||null,fuente_ingresos:d.fuente,rango_ingreso:d.ingreso,es_pep:d.pep==='Sí',pep_cargo:d.pep==='Sí'?d.pepCargo:null,
    ahorro_inicial:Number(d.ahorroIni),ahorro_periodo:Number(d.ahorroMes),frecuencia:d.frecuencia,forma_pago:d.pago,boleta:d.pago==='Depósito a cuenta de la caja'?d.boleta:null,
    beneficiarios:d.benef.map(b=>({nombre:b.n.trim(),dni:b.dni||null,parentesco:b.p,porcentaje:Number(b.pct)})),
    tutor:(edad(d.nac)<18&&d.tutor.n)?{nombre:d.tutor.n,dni:d.tutor.dni,parentesco:d.tutor.p}:null,
    foto_dni_frente:paths.f1||null,foto_dni_reverso:paths.f2||null,firma:paths.firma||null,
    declaraciones:d.decl.every(Boolean),consentimiento_datos:!!d.consent,avisos_whatsapp:!!d.waAvisos,
    tipo_documento:d.tipoDoc,documento_vencimiento:d.docVence||null,nacionalidad:d.nacionalidad.trim(),lugar_nacimiento:d.lugarNac.trim()||null,
    lugar_llenado:d.llenado||null,latitud:d.lat,longitud:d.lng,gps_precision_m:d.gpsPrec,
    negocio_nombre:d.negocio.trim()||null,negocio_direccion:d.negocioDir.trim()||null,
    conyuge:conPareja(d)&&d.conyuge.n.trim()?{nombre:d.conyuge.n.trim(),dni:d.conyuge.dni||null,telefono:d.conyuge.tel||null}:null,
    familiar_directivo:d.famDir==='Sí',familiar_directivo_detalle:d.famDir==='Sí'?d.famDirDet.trim():null,
    referencias:d.refs.map(r=>({nombre:r.n.trim(),telefono:r.tel,relacion:r.rel})),
    foto_solicitante:paths.selfie||null,firma_a_ruego:!!d.aRuego,
    testigo:d.aRuego?{nombre:d.testigo.n.trim(),dni:d.testigo.dni}:null,firma_testigo:d.aRuego?(paths.firmaTestigo||null):null}
}
async function uploadOne(item){
  const d=item.d,uid=S.session.user.id,base=uid+'/'+d.client_id+'/',paths={};
  const keyMap={fotoDni1:'f1',fotoDni2:'f2',firma:'firma',selfie:'selfie',firmaTestigo:'firmaTestigo'};
  for(const[key,file]of[['fotoDni1','dni-frente.jpg'],['fotoDni2','dni-reverso.jpg'],['firma','firma.jpg'],['selfie','solicitante.jpg'],['firmaTestigo','firma-testigo.jpg']]){
    if(!d[key]||(key==='firmaTestigo'&&!d.aRuego))continue;
    const{error}=await sb.storage.from('documentos').upload(base+file,dataURLtoBlob(d[key]),{contentType:'image/jpeg',upsert:false});
    if(error&&!/exists|Duplicate/i.test(error.message))throw error;
    paths[keyMap[key]]=base+file;
  }
  const{data,error}=await sb.from('solicitudes').insert(toRow(d,paths)).select('folio').single();
  if(error){if(/client_id/.test(error.message))return{folio:'(ya enviada)'};throw error}
  return data;
}
async function syncQueue(){
  if(S.syncing||!navigator.onLine||!S.session||!S.queue.length)return;
  S.syncing=true;netbar();let ok=0;
  for(const item of [...S.queue]){
    try{const r=await uploadOne(item);S.queue=S.queue.filter(q=>q.d.client_id!==item.d.client_id);ok++;item.folio=r.folio}
    catch(e){item.error=errMsg(e);if(/Sin conexión/.test(item.error))break}
  }
  await saveQueue();S.syncing=false;netbar();
  if(ok){toast(ok===1?'Solicitud enviada a la oficina':ok+' solicitudes enviadas a la oficina');if(S.view==='envios')loadMine()}
  if(['envios','nueva'].includes(S.view))render();
}
async function enviar(){
  const d=S.draft;const item={d:JSON.parse(JSON.stringify(d)),creado:new Date().toISOString(),error:null};
  S.queue.push(item);await saveQueue();
  S.draft=blankDraft();await idb.set('draft',S.draft);S.step=0;
  if(navigator.onLine){S.busy=true;render();
    try{const r=await uploadOne(item);S.queue=S.queue.filter(q=>q.d.client_id!==item.d.client_id);await saveQueue();S.sent={folio:r.folio,nombre:d.nombres+' '+d.apellidos,dni:d.dni,online:true}}
    catch(e){item.error=errMsg(e);await saveQueue();S.sent={nombre:d.nombres+' '+d.apellidos,dni:d.dni,online:false,error:item.error}}
    S.busy=false}
  else S.sent={nombre:d.nombres+' '+d.apellidos,dni:d.dni,online:false};
  render();netbar();
}

/* ================= Datos de oficina ================= */
const COLS_LIST='id,folio,estado,nombres,apellidos,dni,aldea,municipio,promotor_nombre,ahorro_inicial,codigo_socio,creado_en';
async function loadBandeja(){
  let q=sb.from('solicitudes').select(COLS_LIST).order('creado_en',{ascending:false}).limit(200);
  if(S.filter!=='Todas')q=q.eq('estado',S.filter);
  const t=S.q.trim();if(t){const s=t.replace(/[%,()]/g,'');q=q.or(`nombres.ilike.%${s}%,apellidos.ilike.%${s}%,dni.ilike.%${s.replace(/\D/g,'')||s}%,codigo_socio.ilike.%${s}%`)}
  const{data,error}=await q;if(error){toast(errMsg(error));return}
  S.bandeja=data;render();
}
async function countPend(){if(!isOficina())return;const{count}=await sb.from('solicitudes').select('id',{count:'exact',head:true}).eq('estado','Pendiente');S.pend=count||0;tabs()}
async function loadDetail(id){
  S.detail=null;render();
  const{data:s,error}=await sb.from('solicitudes').select('*').eq('id',id).single();if(error){toast(errMsg(error));return}
  const paths=[s.foto_dni_frente,s.foto_dni_reverso,s.firma,s.foto_solicitante,s.firma_testigo].filter(Boolean);const urls={};
  if(paths.length){const{data:su}=await sb.storage.from('documentos').createSignedUrls(paths,900);(su||[]).forEach(x=>urls[x.path]=x.signedUrl)}
  const{data:log}=await sb.from('bitacora').select('accion,detalle,creado_en').eq('solicitud_id',id).order('creado_en');
  S.detail={s,urls,log:log||[]};render();
}
async function loadMine(){const{data}=await sb.from('solicitudes').select('folio,estado,nombres,apellidos,codigo_socio,motivo_rechazo,creado_en').eq('promotor_id',S.session.user.id).order('creado_en',{ascending:false}).limit(50);S.mine=data||[];render()}
async function loadUsuarios(){
  const[p,c,l]=await Promise.all([sb.from('perfiles').select('*').order('creado_en'),sb.rpc('resumen_usuarios'),sb.from('bitacora_usuarios').select('*').order('creado_en',{ascending:false}).limit(15)]);
  if(p.error){toast(errMsg(p.error));return}
  S.usuarios=p.data;S.uCount={};(c.data||[]).forEach(r=>S.uCount[r.user_id]=r);S.uLog=l.data||[];S.uAction=null;render()}
async function uRpc(fn,args,ok){const{error}=await sb.rpc(fn,args);if(error){toast(errMsg(error),5000);return false}toast(ok);await loadUsuarios();return true}
async function loadParams(){const{data}=await sb.from('parametros').select('*').eq('id',1).maybeSingle();if(data){S.params=data;try{localStorage.setItem('cacih_params',JSON.stringify(data))}catch(e){}}else{try{const c=localStorage.getItem('cacih_params');if(c)S.params=JSON.parse(c)}catch(e){}}$('#lema').textContent=S.params.lema}

/* ================= Exportar Excel y PDF ================= */
const puedeExportar=()=>isAdmin()||(isOficina()&&!S.params.exportar_solo_admin);
async function registrarExport(tipo,filtro,cantidad){const{error}=await sb.rpc('registrar_exportacion',{p_tipo:tipo,p_filtro:filtro,p_cantidad:cantidad});if(error)throw error}
const filtroTxt=()=>S.filter+(S.q?' · búsqueda: '+S.q:'');
async function fetchExport(){
  let q=sb.from('solicitudes').select('*').order('creado_en',{ascending:true}).limit(5000);
  if(S.filter!=='Todas')q=q.eq('estado',S.filter);
  const t=S.q.trim();if(t){const s=t.replace(/[%,()]/g,'');q=q.or(`nombres.ilike.%${s}%,apellidos.ilike.%${s}%,dni.ilike.%${s.replace(/\D/g,'')||s}%,codigo_socio.ilike.%${s}%`)}
  const{data,error}=await q;if(error)throw error;return data}
const exportName=ext=>`CACIH_solicitudes_${S.filter==='Todas'?'todas':S.filter.toLowerCase()+'s'}_${new Date().toISOString().slice(0,10)}.${ext}`;
async function exportExcel(btn){
  btn.disabled=true;const txt=btn.textContent;btn.innerHTML='<span class="spin"></span> Preparando…';
  try{await loadScript('xlsx');const rows=await fetchExport();if(!rows.length){toast('No hay solicitudes para exportar.');return}
    await registrarExport('Excel',filtroTxt(),rows.length);
    const data=rows.map(s=>{const ben=(s.beneficiarios||[]);return{
      'Folio':s.folio,'Estado':s.estado,'Código de socio':s.codigo_socio||'','Acta':s.acta||'','Fecha de envío':new Date(s.creado_en),'Fecha de revisión':s.revisado_en?new Date(s.revisado_en):'','Motivo de rechazo':s.motivo_rechazo||'',
      'Nombres':s.nombres,'Apellidos':s.apellidos,'Tipo de documento':s.tipo_documento,'No. de documento':fmtDni(s.dni),'Vence':s.documento_vencimiento?s.documento_vencimiento.split('-').reverse().join('/'):'','Nacionalidad':s.nacionalidad||'','Lugar de nacimiento':s.lugar_nacimiento||'','Fecha de nacimiento':s.fecha_nacimiento.split('-').reverse().join('/'),'Edad':edad(s.fecha_nacimiento),'Sexo':s.sexo,'Estado civil':s.estado_civil||'','Escolaridad':s.escolaridad||'','Dependientes':s.dependientes??'',
      'Aldea / barrio':s.aldea,'Municipio':s.municipio,'Departamento':s.departamento,'Referencia':s.referencia||'','Celular':s.celular,'WhatsApp':s.whatsapp?'Sí':'No','Teléfono alterno':s.telefono_alterno||'','Correo':s.email||'','Vivienda':s.vivienda||'','Lugar de llenado':s.lugar_llenado||'','Latitud':s.latitud!=null?Number(s.latitud):'','Longitud':s.longitud!=null?Number(s.longitud):'',
      'Actividad':s.actividad,'Rubro':s.rubro||'','Fuente de ingresos':s.fuente_ingresos,'Ingreso mensual (L)':s.rango_ingreso,'PEP':s.es_pep?'Sí':'No','Cargo PEP':s.pep_cargo||'','Negocio o empleador':s.negocio_nombre||'','Dirección del negocio':s.negocio_direccion||'','Cónyuge':s.conyuge?`${s.conyuge.nombre}${s.conyuge.dni?' (DNI '+fmtDni(s.conyuge.dni)+')':''}${s.conyuge.telefono?' · '+s.conyuge.telefono:''}`:'','Familiar de directivo':s.familiar_directivo?'Sí · '+(s.familiar_directivo_detalle||''):'No',
      'Ahorro inicial (L)':Number(s.ahorro_inicial),'Ahorro por periodo (L)':Number(s.ahorro_periodo),'Frecuencia':s.frecuencia,'Forma de pago':s.forma_pago,'Boleta':s.boleta||'',
      'Beneficiarios':ben.map(b=>`${b.nombre} (${b.parentesco}, ${b.porcentaje}%${b.dni?', DNI '+fmtDni(b.dni):''})`).join('; '),
      'Referencias':(s.referencias||[]).map(r=>`${r.nombre} (${r.relacion}, ${r.telefono})`).join('; '),
      'Tutor':s.tutor?`${s.tutor.nombre} (DNI ${fmtDni(s.tutor.dni)}, ${s.tutor.parentesco||''})`:'',
      'Declaraciones':s.declaraciones?'Sí':'No','Autoriza datos':s.consentimiento_datos?'Sí':'No','Avisos WhatsApp':s.avisos_whatsapp?'Sí':'No',
      'Foto DNI':s.foto_dni_frente?'Sí':'No','Foto solicitante':s.foto_solicitante?'Sí':'No','Firma':s.firma?'Sí':'No','Firma a ruego':s.firma_a_ruego?`Sí · testigo ${s.testigo?.nombre||''} (DNI ${fmtDni(s.testigo?.dni)})`:'No','Promotor':s.promotor_nombre}});
    const ws=XLSX.utils.json_to_sheet(data,{cellDates:true,dateNF:'dd/mm/yyyy'});
    const keys=Object.keys(data[0]);ws['!cols']=keys.map(k=>({wch:Math.min(40,Math.max(k.length+2,...data.slice(0,200).map(r=>String(r[k]??'').length+1)))}));
    ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:data.length,c:keys.length-1}})};ws['!freeze']={xSplit:2,ySplit:1};
    keys.forEach((k,c)=>{if(/\(L\)$/.test(k)&&k!=='Ingreso mensual (L)')for(let r=1;r<=data.length;r++){const cell=ws[XLSX.utils.encode_cell({r,c})];if(cell)cell.z='#,##0.00'}
      if(/^Fecha/.test(k))for(let r=1;r<=data.length;r++){const cell=ws[XLSX.utils.encode_cell({r,c})];if(cell&&cell.t==='d')cell.z=k==='Fecha de nacimiento'?'dd/mm/yyyy':'dd/mm/yyyy hh:mm'}});
    const tot={Pendiente:0,Aprobada:0,Rechazada:0};let ahorro=0;rows.forEach(s=>{tot[s.estado]++;if(s.estado==='Aprobada')ahorro+=Number(s.ahorro_inicial)});
    const res=XLSX.utils.aoa_to_sheet([['CACIH · '+S.params.lema],['Exportado',new Date().toLocaleString('es-HN')],['Filtro',S.filter+(S.q?' · búsqueda: '+S.q:'')],[],['Estado','Solicitudes'],['Pendientes',tot.Pendiente],['Aprobadas',tot.Aprobada],['Rechazadas',tot.Rechazada],['Total',rows.length],[],['Ahorro inicial de aprobadas (L)',ahorro]]);
    res['!cols']=[{wch:34},{wch:28}];
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Solicitudes');XLSX.utils.book_append_sheet(wb,res,'Resumen');
    XLSX.writeFile(wb,exportName('xlsx'));toast(rows.length+' solicitudes exportadas a Excel')}
  catch(e){toast(errMsg(e),4000)}finally{btn.disabled=false;btn.textContent=txt}}
async function exportListPDF(btn){
  btn.disabled=true;const txt=btn.textContent;btn.innerHTML='<span class="spin"></span> Preparando…';
  try{await loadScript('jspdf');await loadScript('autotable');const rows=await fetchExport();if(!rows.length){toast('No hay solicitudes para exportar.');return}
    await registrarExport('PDF listado',filtroTxt(),rows.length);
    const{jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'landscape',unit:'pt',format:'letter'});
    const W=doc.internal.pageSize.getWidth();
    doc.setFillColor(23,63,44);doc.rect(0,0,W,58,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(20);doc.text('CACIH',36,32);
    doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(243,226,179);doc.text(S.params.lema,36,46);
    doc.setTextColor(255);doc.setFontSize(11);doc.text(`Solicitudes de afiliación · ${S.filter==='Todas'?'todas':S.filter.toLowerCase()+'s'}${S.q?' · "'+S.q+'"':''}`,W-36,32,{align:'right'});
    doc.setFontSize(9);doc.text('Generado '+new Date().toLocaleString('es-HN'),W-36,46,{align:'right'});
    doc.autoTable({startY:72,margin:{left:36,right:36},styles:{fontSize:8.5,cellPadding:4,overflow:'linebreak'},headStyles:{fillColor:[42,107,73],textColor:255},alternateRowStyles:{fillColor:[242,244,239]},
      head:[['Folio','Código','Estado','Nombre','DNI','Domicilio','Celular','Actividad','Ahorro inicial','Cuota','Promotor','Enviada']],
      body:rows.map(s=>[s.folio,s.codigo_socio||'',s.estado,s.nombres+' '+s.apellidos,fmtDni(s.dni),s.aldea+', '+s.municipio,s.celular,s.actividad+(s.rubro?' · '+s.rubro:''),L(s.ahorro_inicial),L(s.ahorro_periodo)+' '+s.frecuencia.toLowerCase(),s.promotor_nombre,fecha(s.creado_en)]),
      columnStyles:{8:{halign:'right'},9:{halign:'right'}},
      didDrawPage:d=>{doc.setFontSize(8);doc.setTextColor(110);doc.text('Página '+doc.internal.getNumberOfPages(),W-36,doc.internal.pageSize.getHeight()-18,{align:'right'})}});
    const ap=rows.filter(s=>s.estado==='Aprobada');doc.setFontSize(9.5);doc.setTextColor(30);
    doc.text(`Total: ${rows.length} · Aprobadas: ${ap.length} · Ahorro inicial de aprobadas: ${L(ap.reduce((a,s)=>a+Number(s.ahorro_inicial),0))}`,36,doc.lastAutoTable.finalY+20);
    doc.save(exportName('pdf'));toast('Reporte PDF descargado')}
  catch(e){toast(errMsg(e),4000)}finally{btn.disabled=false;btn.textContent=txt}}
async function fichaPDF(btn){
  btn.disabled=true;const txt=btn.textContent;btn.innerHTML='<span class="spin"></span> Generando…';
  try{await loadScript('html2canvas');await loadScript('jspdf');await registrarExport('PDF ficha',S.detail.s.folio,1);
    const area=$('#pdfArea');area.innerHTML=fichaHTML(S.detail.s,S.detail.urls);
    await Promise.all([...area.querySelectorAll('img')].map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r})));
    const canvas=await html2canvas(area.firstElementChild,{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false});
    const{jsPDF}=window.jspdf;const doc=new jsPDF({unit:'pt',format:'letter'});
    const pw=doc.internal.pageSize.getWidth(),ph=doc.internal.pageSize.getHeight(),m=24,iw=pw-2*m,pageH=Math.floor(canvas.width*(ph-2*m)/iw);
    if(canvas.height<=pageH*1.4){const k=Math.min(1,pageH/canvas.height),w=iw*k;doc.addImage(canvas.toDataURL('image/jpeg',.92),'JPEG',(pw-w)/2,m,w,canvas.height*w/canvas.width)}
    else for(let y=0,p=0;y<canvas.height;y+=pageH,p++){const h=Math.min(pageH,canvas.height-y),c=document.createElement('canvas');c.width=canvas.width;c.height=h;c.getContext('2d').drawImage(canvas,0,y,canvas.width,h,0,0,canvas.width,h);
      if(p)doc.addPage();doc.addImage(c.toDataURL('image/jpeg',.92),'JPEG',m,m,iw,h*iw/canvas.width)}
    const s=S.detail.s;doc.save(`Ficha_${s.codigo_socio||s.folio}_${(s.apellidos+'_'+s.nombres).replace(/\s+/g,'_')}.pdf`);area.innerHTML='';toast('Ficha descargada en PDF')}
  catch(e){toast(errMsg(e),4000)}finally{btn.disabled=false;btn.textContent=txt}}

/* ================= Avisos (notificaciones push) ================= */
const pushSupported=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function b64u(s){const p='='.repeat((4-s.length%4)%4),b=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(b,c=>c.charCodeAt(0))}
async function pushState(){
  const b=$('#pushBtn');if(!S.perfil?.activo){b.hidden=true;return}
  b.hidden=false;
  if(!pushSupported()){S.push=isIOS()&&!isStandalone()?'instalar':'no';}
  else if(Notification.permission==='denied')S.push='bloqueado';
  else{const reg=await navigator.serviceWorker.ready.catch(()=>null);const sub=reg&&await reg.pushManager.getSubscription();S.push=sub?'on':'off'}
  b.textContent=S.push==='on'?'Avisos activos':'Activar avisos';b.classList.toggle('on',S.push==='on')}
async function togglePush(){
  if(S.push==='instalar'){toast('En iPhone primero instale la app: Compartir → Agregar a inicio. Luego active los avisos desde la app instalada.',7000);return}
  if(S.push==='no'){toast('Este navegador no admite avisos. Use Chrome o Edge.',5000);return}
  if(S.push==='bloqueado'){toast('Los avisos están bloqueados para este sitio. Permítalos en la configuración del navegador (ícono del candado junto a la dirección).',7000);return}
  const reg=await navigator.serviceWorker.ready;
  if(S.push==='on'){const sub=await reg.pushManager.getSubscription();if(sub){await sb.from('push_suscripciones').delete().eq('endpoint',sub.endpoint);await sub.unsubscribe()}toast('Avisos desactivados en este dispositivo');return pushState()}
  if(await Notification.requestPermission()!=='granted'){toast('Sin permiso no se pueden mostrar avisos.');return pushState()}
  try{let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(VAPID_PUBLIC)});
    const j=sub.toJSON();
    const{error}=await sb.from('push_suscripciones').upsert({endpoint:j.endpoint,p256dh:j.keys.p256dh,auth:j.keys.auth,dispositivo:navigator.userAgent.slice(0,160)},{onConflict:'endpoint'});
    if(error)throw error;
    await sb.functions.invoke('avisos',{body:{tipo:'prueba'}});
    toast(isOficina()?'Avisos activados: le llegará uno de prueba y luego uno por cada solicitud nueva.':'Avisos activados: le llegará uno de prueba y luego uno cuando la oficina apruebe o rechace sus solicitudes.',6000)}
  catch(e){toast('No se pudieron activar los avisos: '+errMsg(e),6000)}
  pushState()}
async function quitarDispositivo(){try{if(!pushSupported())return;const reg=await navigator.serviceWorker.getRegistration();const sub=reg&&await reg.pushManager.getSubscription();if(sub){await sb.from('push_suscripciones').delete().eq('endpoint',sub.endpoint);await sub.unsubscribe()}}catch(e){}}
function irA(hash){
  const m=hash.match(/solicitud=([0-9a-f-]{36})/);
  if(m&&isOficina()){S.view='bandeja';S.open=m[1];render();loadDetail(m[1])}
  else if(/envios/.test(hash)){setView('envios')}
  if(hash)history.replaceState(null,'',location.pathname)}

/* ================= Vistas ================= */
const err=k=>S.errors[k]?`<span class="err">${esc(S.errors[k])}</span>`:'';
function inp(k,label,o={}){const d=S.draft;return `<div class="f ${o.full?'full':''}"><label class="t" for="i_${k}">${label}${o.req?' <i>*</i>':''}</label><input id="i_${k}" data-k="${k}" type="${o.type||'text'}" class="${o.mono?'mono':''}" value="${esc(d[k])}" ${o.ph?`placeholder="${esc(o.ph)}"`:''} ${o.mode?`inputmode="${o.mode}"`:''} ${o.max?`maxlength="${o.max}"`:''} autocomplete="off">${o.hint?`<span class="hint">${o.hint}</span>`:''}${err(k)}</div>`}
function chips(k,label,opts,o={}){const d=S.draft;return `<div class="f ${o.full?'full':''}"><span class="t">${label}${o.req?' <i>*</i>':''}</span><div class="chips" role="radiogroup" aria-label="${esc(label)}">${opts.map((x,i)=>`<label><input type="radio" name="r_${k}" id="r_${k}_${i}" data-k="${k}" value="${esc(x)}" ${d[k]===x?'checked':''}>${esc(x)}</label>`).join('')}</div>${err(k)}</div>`}

function vAuth(mode){
  return `<div class="auth"><div class="hero"><svg width="72" height="72" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="31" fill="#b48a2c"/><circle cx="32" cy="32" r="26" fill="#173f2c"/><path d="M18 44 L28 32 L35 38 L46 22" fill="none" stroke="#f3e2b3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M40 22 H46 V28" fill="none" stroke="#f3e2b3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><b>CACIH</b><span>Un camino hacia la inversión estratégica</span></div>
  <form class="card" id="authForm" novalidate><h2>${mode==='reg'?'Crear cuenta de promotor':'Entrar'}</h2><div class="grid" style="margin-top:14px;grid-template-columns:1fr">
  ${mode==='reg'?`<div class="f"><label class="t" for="a_nombre">Nombre completo</label><input id="a_nombre" autocomplete="name" required></div>`:''}
  <div class="f"><label class="t" for="a_email">Correo</label><input id="a_email" type="email" autocomplete="email" required></div>
  <div class="f"><label class="t" for="a_pass">Contraseña</label><input id="a_pass" type="password" autocomplete="${mode==='reg'?'new-password':'current-password'}" required>${mode==='reg'?'<span class="hint">Mínimo 10 caracteres, con letras y números.</span>':''}</div>
  <span class="err" id="a_err"></span>
  <button class="btn-primary" type="submit" id="a_go">${mode==='reg'?'Crear cuenta':'Entrar'}</button></div>
  <p class="hint" style="margin:14px 0 0;text-align:center">${mode==='reg'?'¿Ya tiene cuenta? <button type="button" class="btn-sm" id="toLogin">Entrar</button>':'¿Es promotor nuevo? <button type="button" class="btn-sm" id="toReg">Crear cuenta</button>'}</p></form>
  <p class="hint" style="text-align:center;margin-top:14px">Las cuentas nuevas quedan pendientes hasta que la oficina las active.</p></div>`;
}
function vPendiente(){
  if(S.perfil?.suspendido_en)return `<div class="auth card" style="text-align:center"><h2>Cuenta suspendida</h2><p class="lead">Su acceso a CACIH fue suspendido el ${fecha(S.perfil.suspendido_en)}. Si cree que es un error, comuníquese con la oficina de la caja.</p><div class="rowbtns" style="justify-content:center"><button id="recheck">Volver a comprobar</button></div></div>`;
  return `<div class="auth card" style="text-align:center"><h2>Cuenta pendiente de activación</h2><p class="lead">Hola ${esc(S.perfil?.nombre||'')}. La oficina de CACIH debe activar su cuenta y asignarle un rol antes de que pueda registrar solicitudes.</p><div class="rowbtns" style="justify-content:center"><button class="btn-primary" id="recheck">Ya me activaron</button></div></div>`}

function vNueva(){
  if(S.busy)return `<div class="card empty"><span class="spin"></span> Enviando solicitud y documentos…</div>`;
  if(S.sent){const s=S.sent;return `<div class="card" style="text-align:center;padding:32px 20px"><h1>${s.online?'Solicitud enviada':'Guardada para enviar'}</h1><p class="lead">${s.online?'La oficina ya la recibió como pendiente de aprobación.':s.error?'No se pudo enviar: '+esc(s.error)+' Quedó en la cola.':'No hay señal. Se enviará sola cuando el teléfono tenga conexión.'}</p>${s.folio?`<p class="mono" style="font-size:24px;color:var(--accent-2);margin:12px 0">${esc(s.folio)}</p>`:''}<p class="hint">${esc(s.nombre)} · DNI ${esc(fmtDni(s.dni))}</p><div class="warnnote" style="margin-top:14px;text-align:left">Recuerde al solicitante: el ahorro inicial se entrega en la reunión o se deposita en la cuenta de la caja. El promotor no recibe dinero.</div><div class="rowbtns" style="justify-content:center"><button class="btn-primary" id="newReq">Nueva solicitud</button><button id="goEnvios">Ver mis envíos</button></div></div>`}
  const d=S.draft,s=S.step,a=edad(d.nac),p=S.params;let body='';
  if(s===0)body=`<div class="grid">${inp('nombres','Nombres',{req:1,ph:'Como aparecen en el DNI'})}${inp('apellidos','Apellidos',{req:1})}${chips('tipoDoc','Documento de identidad',['DNI','Carné de residente','Pasaporte'],{req:1,full:1})}${d.tipoDoc==='DNI'?inp('dni','No. de DNI',{req:1,mono:1,mode:'numeric',max:13,ph:'0000000000000',hint:'13 dígitos, sin guiones'}):inp('dni','No. de '+d.tipoDoc.toLowerCase(),{req:1,mono:1,max:20,hint:'Como aparece en el documento'})}${inp('docVence','Vencimiento del documento',{req:1,type:'date'})}${inp('nacionalidad','Nacionalidad',{req:1})}${inp('lugarNac','Lugar de nacimiento',{req:1,ph:'Municipio y departamento, o país'})}${inp('nac','Fecha de nacimiento',{req:1,type:'date',hint:a!==null&&a>=0?`Edad: ${a} años${a<18?' · requiere tutor':''}`:''})}${chips('sexo','Sexo',['Mujer','Hombre'],{req:1})}${chips('civil','Estado civil',['Soltero/a','Casado/a','Unión libre','Viudo/a','Divorciado/a'],{full:1})}${chips('escolaridad','Escolaridad',['Ninguna','Primaria','Secundaria','Universitaria'],{full:1})}${inp('depend','No. de dependientes',{type:'number',mode:'numeric'})}</div>`;
  if(s===1)body=`<div class="grid">${inp('aldea','Aldea / caserío / barrio',{req:1})}${inp('municipio','Municipio',{req:1})}<div class="f"><label class="t" for="i_depto">Departamento</label><select id="i_depto" data-k="depto">${DEPTOS.map(x=>`<option ${d.depto===x?'selected':''}>${x}</option>`).join('')}</select></div>${inp('ref','Punto de referencia de la vivienda',{full:1,ph:'Ej. frente a la escuela'})}${inp('cel','Celular',{req:1,mono:1,mode:'tel',ph:'9876-5432',max:9})}<div class="f"><span class="t">WhatsApp</span><div class="chips"><label><input type="checkbox" id="c_wa" data-k="wa" ${d.wa?'checked':''}> El celular tiene WhatsApp</label></div></div>${inp('cel2','Teléfono alterno (familiar)',{mono:1,mode:'tel'})}${inp('email','Correo (opcional)',{type:'email'})}${chips('vivienda','Vivienda',['Propia','Alquilada','Familiar'],{full:1})}${chips('llenado','¿Dónde se llena esta solicitud?',['Vivienda del solicitante','Reunión de la caja','Otro lugar'],{req:1,full:1})}<div class="f full"><span class="t">Ubicación GPS de la vivienda${d.llenado==='Vivienda del solicitante'?' <i>*</i>':''}</span><div class="rowbtns" style="margin-top:0;justify-content:flex-start"><button id="gpsBtn" class="${d.lat==null?'btn-primary':''}">${d.lat==null?'Guardar ubicación':'Actualizar ubicación'}</button><span class="hint" id="gpsTxt">${d.lat!=null?`Guardada: ${Number(d.lat).toFixed(5)}, ${Number(d.lng).toFixed(5)} · precisión ${Math.round(d.gpsPrec||0)} m`:'Tóquelo estando en la casa del solicitante.'}</span></div>${err('gps')}</div></div>`;
  if(s===2)body=`<div class="grid">${chips('actividad','Actividad principal',['Agricultura','Ganadería','Comercio','Empleado/a','Oficio','Ama de casa','Otro'],{req:1,full:1})}${inp('rubro','Rubro o producto',{ph:'Ej. café, granos, pulpería'})}${chips('fuente','Fuente de ingresos',['Actividad propia','Salario','Remesas','Otro'],{req:1,full:1})}${chips('ingreso','Ingreso mensual aproximado (L)',['Menos de 5,000','5,000–10,000','10,001–20,000','Más de 20,000'],{req:1,full:1})}${chips('pep','¿Es o fue funcionario público de alto nivel, o familiar cercano de uno?',['No','Sí'],{full:1})}${d.pep==='Sí'?inp('pepCargo','Cargo',{req:1}):''}${inp('negocio','Nombre del negocio o empleador',{ph:'Opcional'})}${inp('negocioDir','Dirección del negocio o trabajo',{ph:'Opcional'})}${conPareja(d)?`<div class="f full"><h3 style="margin-top:6px">Cónyuge o compañero/a</h3></div><div class="f"><label class="t" for="cy_n">Nombre completo <i>*</i></label><input id="cy_n" data-cy="n" value="${esc(d.conyuge.n)}"></div><div class="f"><label class="t" for="cy_dni">DNI</label><input id="cy_dni" class="mono" data-cy="dni" inputmode="numeric" maxlength="13" value="${esc(d.conyuge.dni)}"></div><div class="f"><label class="t" for="cy_tel">Teléfono</label><input id="cy_tel" class="mono" data-cy="tel" inputmode="tel" maxlength="9" value="${esc(d.conyuge.tel)}"></div><div class="f full">${err('conyuge')}</div>`:''}${chips('famDir','¿Es familiar de algún miembro de la Junta Directiva de la caja?',['No','Sí'],{full:1})}${d.famDir==='Sí'?inp('famDirDet','¿De quién y qué parentesco?',{req:1,full:1}):''}</div>`;
  if(s===3)body=`<p class="hint" style="margin-top:0">Inscripción ${L(p.inscripcion)} · aportación a capital ${L(p.aportacion)} · ahorro mínimo ${L(p.ahorro_min)}</p><div class="grid">${inp('ahorroIni','Ahorro inicial (L)',{req:1,type:'number',mode:'decimal'})}${inp('ahorroMes','Ahorro comprometido por periodo (L)',{req:1,type:'number',mode:'decimal'})}${chips('frecuencia','Frecuencia de depósito',['Semanal','Quincenal','Mensual'],{full:1})}${chips('pago','Forma de pago del depósito inicial',['Efectivo en reunión','Depósito a cuenta de la caja'],{full:1})}${d.pago==='Depósito a cuenta de la caja'?inp('boleta','No. de boleta bancaria',{req:1,mono:1}):''}<div class="f full note">Total a entregar al ser aprobado: <b class="num">${L(Number(p.inscripcion)+Number(p.aportacion)+Number(d.ahorroIni||0))}</b> (inscripción + aportación + ahorro inicial). El promotor no recibe dinero.</div></div>`;
  if(s===4){const t=d.benef.reduce((x,b)=>x+Number(b.pct||0),0);body=`<p class="hint" style="margin-top:0">Personas que reciben el ahorro en caso de fallecimiento del socio/a.</p>${d.benef.map((b,i)=>`<div class="benef"><div class="f"><label class="t" for="b_n_${i}">Nombre completo</label><input id="b_n_${i}" data-b="${i}" data-bk="n" value="${esc(b.n)}"></div><div class="f"><label class="t" for="b_dni_${i}">DNI</label><input id="b_dni_${i}" class="mono" data-b="${i}" data-bk="dni" inputmode="numeric" maxlength="13" value="${esc(b.dni)}"></div><div class="f"><label class="t" for="b_p_${i}">Parentesco</label><select id="b_p_${i}" data-b="${i}" data-bk="p"><option value=""></option>${['Esposo/a','Hijo/a','Madre','Padre','Hermano/a','Otro'].map(x=>`<option ${b.p===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="f"><label class="t" for="b_pct_${i}">%</label><input id="b_pct_${i}" type="number" inputmode="numeric" data-b="${i}" data-bk="pct" value="${esc(b.pct)}"></div><button class="rm" data-rmb="${i}" aria-label="Quitar beneficiario" ${d.benef.length<2?'disabled':''}>×</button></div>`).join('')}<div class="rowbtns" style="margin-top:12px"><button id="addB" ${d.benef.length>=4?'disabled':''}>Agregar beneficiario</button><span class="num" id="sumB" style="font-weight:600;color:${t===100?'var(--ok)':'var(--warn)'}">Total: ${t}%</span></div>${err('benef')}${a!==null&&a<18?`<h3 style="margin-top:20px">Padre, madre o tutor (socio menor de edad)</h3><div class="grid" style="margin-top:10px"><div class="f"><label class="t" for="t_n">Nombre</label><input id="t_n" data-t="n" value="${esc(d.tutor.n)}"></div><div class="f"><label class="t" for="t_dni">DNI</label><input id="t_dni" class="mono" data-t="dni" inputmode="numeric" maxlength="13" value="${esc(d.tutor.dni)}"></div><div class="f"><label class="t" for="t_p">Parentesco</label><input id="t_p" data-t="p" value="${esc(d.tutor.p)}"></div></div>${err('tutor')}`:''}<h3 style="margin-top:22px">Referencias personales</h3><p class="hint" style="margin:2px 0 10px">Dos personas que conozcan al solicitante y no vivan con él/ella.</p>${d.refs.map((r,i)=>`<div class="grid" style="margin-bottom:10px"><div class="f"><label class="t" for="r_n_${i}">Referencia ${i+1} · nombre <i>*</i></label><input id="r_n_${i}" data-r="${i}" data-rk="n" value="${esc(r.n)}"></div><div class="f"><label class="t" for="r_rel_${i}">Relación <i>*</i></label><select id="r_rel_${i}" data-r="${i}" data-rk="rel"><option value=""></option>${['Familiar','Vecino/a','Amigo/a','Compañero/a de trabajo','Otro'].map(x=>`<option ${r.rel===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="f"><label class="t" for="r_tel_${i}">Teléfono <i>*</i></label><input id="r_tel_${i}" class="mono" data-r="${i}" data-rk="tel" inputmode="tel" maxlength="9" placeholder="9876-5432" value="${esc(r.tel)}"></div></div>`).join('')}${err('refs')}`}
  if(s===5)body=`<div class="grid"><div class="f full"><label class="t" for="f0">Foto del rostro del solicitante <i>*</i></label><div class="photo"><input id="f0" type="file" accept="image/*" capture="user" data-photo="selfie">${d.selfie?`<img src="${d.selfie}" alt="Rostro del solicitante">`:''}</div><span class="hint">Con buena luz y sin gorra ni lentes oscuros. La oficina la compara con la foto del documento.</span>${err('selfie')}</div><div class="f"><label class="t" for="f1">Foto del documento · frente <i>*</i></label><div class="photo"><input id="f1" type="file" accept="image/*" capture="environment" data-photo="fotoDni1">${d.fotoDni1?`<img src="${d.fotoDni1}" alt="Frente del DNI">`:''}</div>${err('fotoDni1')}</div><div class="f"><label class="t" for="f2">Foto del documento · reverso</label><div class="photo"><input id="f2" type="file" accept="image/*" capture="environment" data-photo="fotoDni2">${d.fotoDni2?`<img src="${d.fotoDni2}" alt="Reverso del DNI">`:''}</div></div><div class="f full"><span class="t">Firma o huella del solicitante <i>*</i></span><canvas class="sig" id="sig" aria-label="Área de firma"></canvas><div class="rowbtns" style="margin-top:6px"><span class="hint" id="sigHint">${d.firma?'Firma guardada.':'Firme con el dedo dentro del recuadro.'}</span><button id="clrSig" class="btn-sm">Borrar firma</button></div>${err('firma')}</div><label class="check f full" for="c_ruego"><input type="checkbox" id="c_ruego" data-k="aRuego" ${d.aRuego?'checked':''}><span>El solicitante <b>no sabe firmar</b> y pone su huella. Firma un testigo a su ruego.</span></label>${d.aRuego?`<div class="f"><label class="t" for="tg_n">Nombre del testigo <i>*</i></label><input id="tg_n" data-tg="n" value="${esc(d.testigo.n)}"></div><div class="f"><label class="t" for="tg_dni">DNI del testigo <i>*</i></label><input id="tg_dni" class="mono" data-tg="dni" inputmode="numeric" maxlength="13" value="${esc(d.testigo.dni)}"></div>${err('testigo')?`<div class="f full">${err('testigo')}</div>`:''}<div class="f full"><span class="t">Firma del testigo <i>*</i></span><canvas class="sig" id="sig2" aria-label="Firma del testigo"></canvas><div class="rowbtns" style="margin-top:6px"><span class="hint" id="sig2Hint">${d.firmaTestigo?'Firma guardada.':'El testigo firma dentro del recuadro.'}</span><button id="clrSig2" class="btn-sm">Borrar firma</button></div>${err('firmaTestigo')}</div>`:''}</div>`;
  if(s===6)body=`${DECL.map((t,i)=>`<label class="check" for="dc${i}"><input type="checkbox" id="dc${i}" data-decl="${i}" ${d.decl[i]?'checked':''}><span>${t}</span></label>`).join('')}${err('decl')}<h3 style="margin-top:18px">Autorización de uso de datos</h3><p class="hint">CACIH guarda estos datos solo para administrar la cuenta de ahorro, los créditos y enviar avisos. No los vende ni los comparte, salvo obligación legal o con el banco donde la caja tiene su cuenta. El socio puede pedir verlos, corregirlos o retirarlos.</p><label class="check" for="cs"><input type="checkbox" id="cs" data-k="consent" ${d.consent?'checked':''}><span><b>Acepto</b> el uso de mis datos en estos términos.</span></label><label class="check" for="cw"><input type="checkbox" id="cw" data-k="waAvisos" ${d.waAvisos?'checked':''}><span>Acepto recibir avisos por WhatsApp.</span></label>${err('consent')}`;
  if(s===7){const bad=firstInvalid();body=`${bad>=0?`<div class="warnnote">Falta completar el paso ${STEPS[bad].k} · ${STEPS[bad].t}. <button id="goBad" class="btn-sm" style="margin-left:8px">Ir</button></div>`:''}<table class="plain" style="margin-top:10px">${[['Solicitante',d.nombres+' '+d.apellidos],[d.tipoDoc,fmtDni(d.dni)+(d.docVence?' · vence '+d.docVence.split('-').reverse().join('/'):'')],['Nacionalidad',d.nacionalidad],['Edad',a!==null?a+' años':''],['Domicilio',[d.aldea,d.municipio,d.depto].filter(Boolean).join(', ')],['Celular',d.cel],['Actividad',d.actividad+(d.rubro?' · '+d.rubro:'')],['Ahorro inicial / periodo',L(d.ahorroIni)+' / '+L(d.ahorroMes)+' '+(d.frecuencia||'').toLowerCase()],['Ubicación',d.lat!=null?'GPS guardado ('+Math.round(d.gpsPrec||0)+' m)':(d.llenado||'')],['Beneficiarios',d.benef.map(b=>b.n+' ('+b.pct+'%)').join(', ')],['Referencias',d.refs.map(r=>r.n).filter(Boolean).join(', ')],['Documentos',[d.selfie&&'foto del rostro',d.fotoDni1&&'documento frente',d.fotoDni2&&'documento reverso',d.firma&&(d.aRuego?'huella':'firma'),d.aRuego&&d.firmaTestigo&&'firma del testigo'].filter(Boolean).join(', ')]].map(r=>`<tr><td style="color:var(--muted);width:38%">${r[0]}</td><td>${esc(r[1])}</td></tr>`).join('')}</table><p class="hint">Registra: ${esc(S.perfil.nombre||S.session.user.email)}${navigator.onLine?'':' · sin señal: se guardará y enviará después'}</p>`}
  return `<h1>Nueva solicitud de afiliación</h1><p class="lead">Llenar junto al solicitante, en su casa o en la reunión. El borrador se guarda solo.</p>
  <div class="steps">${STEPS.map((x,i)=>`<button data-go="${i}" class="${i===s?'cur':''} ${i<s?'done':''}"><span class="l">${x.k}</span>${x.t}</button>`).join('')}</div>
  <div class="card"><h2 style="margin-bottom:14px">${STEPS[s].k}. ${STEPS[s].t}</h2>${body}
  <div class="rowbtns"><button id="prev" ${s===0?'disabled':''}>Atrás</button>${s<7?`<button class="btn-primary" id="next">Siguiente</button>`:`<button class="btn-primary" id="send" ${firstInvalid()>=0?'disabled':''}>${navigator.onLine?'Enviar a la oficina':'Guardar para enviar'}</button>`}</div></div>
  <p style="margin-top:14px"><button id="resetDraft" class="btn-bad btn-sm">Descartar borrador</button></p>`;
}

function pill(e){return `<span class="pill ${e==='Pendiente'?'p-pend':e==='Aprobada'?'p-ok':e==='Rechazada'?'p-bad':'p-q'}">${esc(e)}</span>`}
function vEnvios(){
  const q=S.queue.map(it=>`<div class="card item" style="cursor:default"><b>${esc(it.d.nombres+' '+it.d.apellidos)}</b>${pill(it.error?'Con error':'Sin enviar')}<span class="meta">DNI ${esc(fmtDni(it.d.dni))} · guardada ${fechaHora(it.creado)}${it.error?' · '+esc(it.error):''}</span><span>${it.error?`<button class="btn-sm" data-editq="${esc(it.d.client_id)}">Corregir</button>`:''}</span></div>`).join('');
  return `<h1>Mis envíos</h1><p class="lead">Solicitudes que usted registró y su estado en la oficina.</p>
  ${S.queue.length?`<h2 style="margin:20px 0 8px">En el teléfono (${S.queue.length})</h2><div class="list">${q}</div><div class="rowbtns"><span class="hint">${navigator.onLine?'Hay señal.':'Sin señal: se enviarán solas al conectarse.'}</span><button class="btn-primary btn-sm" id="syncNow" ${!navigator.onLine||S.syncing?'disabled':''}>${S.syncing?'<span class="spin"></span> Enviando…':'Enviar ahora'}</button></div>`:''}
  <h2 style="margin:22px 0 8px">Recibidas por la oficina</h2>
  <div class="list">${S.mine.length?S.mine.map(m=>`<div class="card item" style="cursor:default"><b>${esc(m.nombres+' '+m.apellidos)}</b>${pill(m.estado)}<span class="meta"><span class="mono">${esc(m.codigo_socio||m.folio)}</span> · ${fecha(m.creado_en)}${m.motivo_rechazo?' · '+esc(m.motivo_rechazo):''}</span><span></span></div>`).join(''):`<div class="card empty">${navigator.onLine?'Todavía no ha enviado solicitudes.':'Sin señal para consultar.'}</div>`}</div>`;
}

function vBandeja(){
  if(S.open)return vDetalle();
  return `<h1>Solicitudes recibidas</h1><p class="lead">Revise cada ficha, imprímala para firma y apruébela con el número de acta.</p>
  <div class="filters">${['Pendiente','Aprobada','Rechazada','Todas'].map(f=>`<button data-f="${f}" class="${S.filter===f?'on':''}">${f==='Todas'?'Todas':f+'s'}</button>`).join('')}</div>
  <div class="toolbar"><span class="hint">${S.bandeja.length} ${S.bandeja.length===1?'solicitud':'solicitudes'} en esta vista</span>${puedeExportar()?`<div class="grp"><button class="btn-sm" id="xlsBtn">Exportar Excel</button><button class="btn-sm" id="pdfListBtn">Exportar PDF</button></div>`:'<span class="hint">Exportar listados: solo el administrador</span>'}</div>
  <form id="searchF" style="display:flex;gap:8px;margin-bottom:12px"><label for="qBox" class="t" hidden>Buscar</label><input id="qBox" placeholder="Buscar por nombre, DNI o código" value="${esc(S.q)}"><button type="submit">Buscar</button></form>
  <div class="list">${S.bandeja.length?S.bandeja.map(s=>`<button class="item" data-open="${s.id}"><b>${esc(s.nombres+' '+s.apellidos)}</b>${pill(s.estado)}<span class="meta"><span class="mono">${esc(s.codigo_socio||s.folio)}</span> · DNI ${esc(fmtDni(s.dni))} · ${esc(s.aldea)}, ${esc(s.municipio)} · ${esc(s.promotor_nombre)} · ${fecha(s.creado_en)}</span><span class="meta num">${L(s.ahorro_inicial)}</span></button>`).join(''):`<div class="card empty">No hay solicitudes ${S.filter==='Todas'?'':S.filter.toLowerCase()+'s'} ${S.q?'que coincidan con la búsqueda':''}.</div>`}</div>`;
}

function fichaHTML(s,urls){
  const p=S.params,a=edad(s.fecha_nacimiento),row=(k,v)=>`<tr><td class="k">${k}</td><td>${esc(v)}</td></tr>`;
  const ben=Array.isArray(s.beneficiarios)?s.beneficiarios:[];
  return `<div class="sheet"><div class="hd"><div class="nm"><svg width="40" height="40" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="31" fill="#b48a2c"/><circle cx="32" cy="32" r="26" fill="#173f2c"/><path d="M18 44 L28 32 L35 38 L46 22" fill="none" stroke="#f3e2b3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M40 22 H46 V28" fill="none" stroke="#f3e2b3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><div><b>${esc(p.nombre)}</b><em>${esc(p.lema)}</em><div>Ficha de Afiliación de Socio/a Ahorrante${p.registro?' · Registro No. '+esc(p.registro):''}</div></div></div><div class="code">${esc(s.codigo_socio||'CR-____-____')}<br><small>Folio ${esc(s.folio)}</small></div></div>
  <h4>A. Identificación</h4><table>${row('Nombres y apellidos',s.nombres+' '+s.apellidos)}${row(s.tipo_documento||'DNI',fmtDni(s.dni)+(s.documento_vencimiento?' · vence '+s.documento_vencimiento.split('-').reverse().join('/'):''))}${row('Nacionalidad / lugar de nacimiento',[s.nacionalidad,s.lugar_nacimiento].filter(Boolean).join(' · '))}${row('Fecha de nacimiento / edad',new Date(s.fecha_nacimiento+'T12:00').toLocaleDateString('es-HN')+(a!==null?' · '+a+' años':''))}${row('Sexo / estado civil',[s.sexo,s.estado_civil].filter(Boolean).join(' · '))}${row('Escolaridad / dependientes',[s.escolaridad,s.dependientes!=null?s.dependientes+' dependientes':''].filter(Boolean).join(' · '))}</table>
  <h4>B. Domicilio y contacto</h4><table>${row('Domicilio',[s.aldea,s.municipio,s.departamento].filter(Boolean).join(', '))}${row('Referencia',s.referencia)}${row('Celular / alterno',s.celular+(s.whatsapp?' (WhatsApp)':'')+(s.telefono_alterno?' · '+s.telefono_alterno:''))}${row('Correo / vivienda',[s.email,s.vivienda].filter(Boolean).join(' · '))}${row('Lugar de llenado / GPS',[s.lugar_llenado,s.latitud!=null?Number(s.latitud).toFixed(6)+', '+Number(s.longitud).toFixed(6):''].filter(Boolean).join(' · '))}</table>
  <h4>C. Actividad económica</h4><table>${row('Actividad / rubro',[s.actividad,s.rubro].filter(Boolean).join(' · '))}${row('Fuente / ingreso mensual',s.fuente_ingresos+' · L '+s.rango_ingreso)}${row('Negocio o empleador',[s.negocio_nombre,s.negocio_direccion].filter(Boolean).join(' · '))}${row('Persona expuesta políticamente',s.es_pep?'Sí · '+(s.pep_cargo||''):'No')}${row('Familiar de directivo',s.familiar_directivo?'Sí · '+(s.familiar_directivo_detalle||''):'No')}${s.conyuge?row('Cónyuge',s.conyuge.nombre+(s.conyuge.dni?' · DNI '+fmtDni(s.conyuge.dni):'')+(s.conyuge.telefono?' · '+s.conyuge.telefono:'')):''}</table>
  <h4>D. Ahorro y aportaciones</h4><table>${row('Inscripción + aportación a capital',L(p.inscripcion)+' + '+L(p.aportacion))}${row('Ahorro inicial',L(s.ahorro_inicial))}${row('Ahorro comprometido',L(s.ahorro_periodo)+' · '+s.frecuencia)}${row('Forma de pago',s.forma_pago+(s.boleta?' · boleta '+s.boleta:''))}</table>
  <h4>E. Beneficiarios</h4><table><tr><td class="k">Nombre</td><td class="k">DNI</td><td class="k">Parentesco</td><td class="k" style="width:50px">%</td></tr>${ben.map(b=>`<tr><td>${esc(b.nombre)}</td><td>${esc(fmtDni(b.dni))}</td><td>${esc(b.parentesco)}</td><td>${esc(b.porcentaje)}</td></tr>`).join('')}</table>
  ${s.tutor?`<table style="margin-top:5px">${row('Tutor (socio menor de edad)',s.tutor.nombre+' · DNI '+fmtDni(s.tutor.dni)+' · '+(s.tutor.parentesco||''))}</table>`:''}
  ${(s.referencias||[]).length?`<table style="margin-top:5px"><tr><td class="k">Referencia</td><td class="k">Relación</td><td class="k">Teléfono</td></tr>${s.referencias.map(r=>`<tr><td>${esc(r.nombre)}</td><td>${esc(r.relacion)}</td><td>${esc(r.telefono)}</td></tr>`).join('')}</table>`:''}
  <h4>F–G. Declaraciones y autorización de datos</h4><p style="margin:3px 0">${s.declaraciones?'☑':'☐'} Origen lícito de fondos, aceptación de estatutos y reglamento, asistencia a asambleas, plazo de devolución de aportaciones. ${s.consentimiento_datos?'☑':'☐'} Autoriza el uso de sus datos. ${s.avisos_whatsapp?'☑':'☐'} Avisos por WhatsApp.</p>
  <div class="sigs"><div>${s.firma&&urls[s.firma]?`<img src="${urls[s.firma]}" crossorigin="anonymous" alt="Firma del solicitante">`:''}<span>${s.firma_a_ruego?'Huella del socio/a':'Firma o huella del socio/a'}</span></div>${s.firma_a_ruego?`<div>${s.firma_testigo&&urls[s.firma_testigo]?`<img src="${urls[s.firma_testigo]}" crossorigin="anonymous" alt="Firma del testigo">`:''}<span>Testigo a ruego: ${esc(s.testigo?.nombre||'')} · DNI ${esc(fmtDni(s.testigo?.dni))}</span></div>`:''}<div><span>Secretario/a</span></div><div><span>Tesorero/a</span></div></div>
  <h4>H. Uso exclusivo de la caja</h4><table>${row('Promotor / fecha de envío',s.promotor_nombre+' · '+fechaHora(s.creado_en))}${row('Estado',s.estado+(s.acta?' · acta No. '+s.acta:'')+(s.motivo_rechazo?' · '+s.motivo_rechazo:'')+(s.revisado_en?' · '+fecha(s.revisado_en):''))}${row('Copia de DNI',s.foto_dni_frente?'Foto recibida'+(s.foto_dni_reverso?' (frente y reverso)':' (frente)'):'No')}${row('Foto del solicitante',s.foto_solicitante?'Recibida':'No')}${row('Nivel de riesgo',s.es_pep?'Alto (PEP)':s.familiar_directivo?'Medio (familiar de directivo)':'Bajo')}</table>
  <div class="foot"><span>FA-01 v1.3 · Original: archivo · Copia: socio/a</span><span>Impreso ${fechaHora(new Date())}</span></div></div>`;
}
function vDetalle(){
  if(!S.detail)return `<button id="back" class="btn-sm">← Volver</button><p class="empty"><span class="spin"></span> Cargando ficha…</p>`;
  const{s,urls,log}=S.detail;
  return `<button id="back" class="btn-sm">← Volver a la bandeja</button>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px"><h1>${esc(s.nombres+' '+s.apellidos)}</h1>${pill(s.estado)}</div>
  ${s.estado==='Pendiente'?`<div class="card" style="margin-top:14px"><h3>Autorizar como socio/a ahorrante</h3><p class="hint" style="margin:4px 0 0">Verifique que la foto del DNI coincide con los datos antes de aprobar.</p><div class="actions"><div class="f" style="width:150px"><label class="t" for="acta">No. de acta</label><input id="acta" class="mono" placeholder="Ej. 15"></div><button class="btn-primary" id="approve">Aprobar y generar código</button></div><div class="actions"><div class="f" style="flex:1;min-width:200px"><label class="t" for="motivo">Motivo de rechazo</label><input id="motivo" placeholder="Ej. DNI ilegible, volver a visitar"></div><button class="btn-bad" id="reject">Rechazar</button></div><p class="err" id="apErr"></p></div>`:''}
  <div class="card" style="margin-top:14px"><div class="rowbtns" style="margin-top:0"><h3>Documentos</h3><div class="grp" style="display:flex;gap:8px;flex-wrap:wrap"><button id="pdfFichaBtn">Descargar PDF</button><button class="btn-primary" id="printBtn">Imprimir ficha</button></div></div>
  <div class="docs">${[['foto_solicitante','Rostro del solicitante'],['foto_dni_frente','Documento · frente'],['foto_dni_reverso','Documento · reverso'],['firma',s.firma_a_ruego?'Huella':'Firma'],['firma_testigo','Firma del testigo']].map(([k,t])=>s[k]&&urls[s[k]]?`<figure><a href="${urls[s[k]]}" target="_blank" rel="noopener"><img src="${urls[s[k]]}" crossorigin="anonymous" alt="${t}"></a><figcaption>${t}</figcaption></figure>`:'').join('')||'<span class="hint">Sin documentos adjuntos.</span>'}</div>
  ${s.latitud!=null?`<p style="margin:12px 0 0"><a href="https://www.google.com/maps?q=${Number(s.latitud)},${Number(s.longitud)}" target="_blank" rel="noopener noreferrer">Ver la vivienda en el mapa</a> <span class="hint">· precisión ${Math.round(s.gps_precision_m||0)} m</span></p>`:''}<h3 style="margin-top:16px">Historial</h3><ul class="log">${log.map(l=>`<li>${fechaHora(l.creado_en)} · ${esc(l.accion)}${l.detalle?' · '+esc(l.detalle):''}</li>`).join('')}</ul></div>
  <div class="sheet-wrap">${fichaHTML(s,urls)}</div>`;
}

const uEstado=u=>u.activo?'Activo':u.suspendido_en?'Suspendido':'Pendiente';
function vUsuarios(){
  const cnt=S.uCount||{},orden={Pendiente:0,Activo:1,Suspendido:2};
  const lista=[...S.usuarios].filter(u=>S.uFilter==='Todos'||uEstado(u)===S.uFilter).sort((a,b)=>orden[uEstado(a)]-orden[uEstado(b)]||(a.nombre||'').localeCompare(b.nombre||''));
  const n=e=>S.usuarios.filter(u=>uEstado(u)===e).length;
  const card=u=>{const me=u.user_id===S.session.user.id,e=uEstado(u),c=cnt[u.user_id]||{registradas:0,revisadas:0},hist=Number(c.registradas)+Number(c.revisadas),open=S.uAction&&S.uAction.id===u.user_id;
    return `<div class="card" style="padding:14px 16px">
    <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start"><div style="min-width:0"><b>${esc(u.nombre||'Sin nombre')}</b>${me?' <span class="hint">(usted)</span>':''}<div class="hint" style="word-break:break-all">${esc(u.email)}</div>
      <div class="hint">${hist?`${c.registradas} registradas · ${c.revisadas} revisadas`:'Sin solicitudes'} · cuenta desde ${fecha(u.creado_en)}</div>
      ${e==='Suspendido'?`<div class="hint" style="color:var(--bad)">Suspendido el ${fecha(u.suspendido_en)} · ${esc(u.motivo_suspension||'')}</div>`:''}</div>
      <span class="pill ${e==='Activo'?'p-ok':e==='Suspendido'?'p-bad':'p-pend'}">${e==='Pendiente'?'Pendiente de activar':e}</span></div>
    ${me?'':`<div class="actions" style="margin-top:10px">
      <div class="f" style="width:170px"><label class="t" for="rol_${u.user_id}">Rol</label><select id="rol_${u.user_id}" data-urol="${u.user_id}">${['promotor','oficina','admin'].map(r=>`<option value="${r}" ${u.rol===r?'selected':''}>${r==='admin'?'Administrador':r==='oficina'?'Oficina':'Promotor'}</option>`).join('')}</select></div>
      ${e==='Activo'?`<button class="btn-bad" data-usus="${u.user_id}">Suspender</button>`:`<button class="btn-primary" data-uact="${u.user_id}">${e==='Suspendido'?'Reactivar':'Activar'}</button>`}
      ${e!=='Activo'?`<button class="btn-bad" data-udel="${u.user_id}" ${hist?'disabled title="Tiene historial: solo se puede suspender"':''}>Eliminar</button>`:''}
    </div>
    ${open&&S.uAction.tipo==='sus'?`<div class="actions" style="border-top:1px solid var(--line);padding-top:12px"><div class="f" style="flex:1;min-width:200px"><label class="t" for="susMotivo">Motivo de la suspensión</label><input id="susMotivo" placeholder="Ej. ya no labora con la caja"></div><button class="btn-bad" data-ususok="${u.user_id}">Confirmar suspensión</button><button class="btn-sm" data-ucancel>Cancelar</button></div><p class="hint" style="margin:6px 0 0">Pierde el acceso de inmediato y deja de recibir avisos. Sus solicitudes y su historial se conservan.</p>`:''}
    ${open&&S.uAction.tipo==='del'?`<div class="warnnote" style="margin-top:12px">¿Eliminar definitivamente la cuenta de ${esc(u.email)}? No se puede deshacer. <div class="actions"><button class="btn-bad" data-udelok="${u.user_id}">Sí, eliminar</button><button class="btn-sm" data-ucancel>Cancelar</button></div></div>`:''}`}
    </div>`};
  return `<h1>Usuarios</h1><p class="lead">Promotor: registra solicitudes. Oficina: aprueba, imprime y exporta. Administrador: además gestiona usuarios y parámetros.</p>
  <div class="filters">${['Pendiente','Activo','Suspendido','Todos'].map(f=>`<button data-uf="${f}" class="${S.uFilter===f?'on':''}">${f==='Todos'?'Todos':f==='Pendiente'?'Por activar':f+'s'}${f!=='Todos'?' · '+n(f):''}</button>`).join('')}</div>
  <div class="list">${lista.length?lista.map(card).join(''):`<div class="card empty">No hay usuarios en este grupo.</div>`}</div>
  <div class="note" style="margin-top:16px"><b>¿Alguien dejó de trabajar con la caja?</b> Use <b>Suspender</b>: pierde el acceso al momento y se conserva todo lo que registró. <b>Eliminar</b> solo está disponible para cuentas sin solicitudes, por ejemplo las creadas por error. Si alguien olvida su contraseña, restablézcala en el panel de Supabase (Authentication → Users).</div>
  ${S.uLog&&S.uLog.length?`<h2 style="margin:22px 0 8px">Últimos cambios</h2><ul class="log">${S.uLog.map(l=>`<li>${fechaHora(l.creado_en)} · ${esc(l.accion)} · ${esc(l.email_afectado||'')}${l.detalle?' · '+esc(l.detalle):''}</li>`).join('')}</ul>`:''}`;
}
function vParams(){
  const p=S.params,P=(k,t,desc,type='number')=>`<div class="param"><div><label class="t" for="p_${k}">${t}</label><p>${desc}</p></div><input id="p_${k}" data-p="${k}" type="${type}" value="${esc(p[k])}"></div>`;
  return `<h1>Parámetros de la caja</h1><p class="lead">Lo que aprueba la Asamblea. El formulario de los promotores usa estos valores.</p>
  <form class="card" id="paramsF" style="margin-top:16px">
  ${P('nombre','Nombre de la caja','Encabezado de la ficha impresa.','text')}${P('lema','Lema','Debajo del nombre.','text')}${P('registro','No. de registro o personería','Según el Registro Nacional de Cajas Rurales o la SDE.','text')}
  ${P('inscripcion','Cuota de inscripción (L)','No reembolsable.')}${P('aportacion','Aportación a capital (L)','Da derecho a voto; se devuelve según estatutos.')}${P('ahorro_min','Ahorro mínimo (L)','Mínimo del depósito inicial y de cada cuota.')}
  <div class="param"><div><label class="t" for="p_frecuencia">Frecuencia sugerida</label><p>Valor inicial en el formulario.</p></div><select id="p_frecuencia" data-p="frecuencia">${['Semanal','Quincenal','Mensual'].map(x=>`<option ${p.frecuencia===x?'selected':''}>${x}</option>`).join('')}</select></div>
  <div class="param"><div><label class="t" for="p_acepta_menores">Aceptar socios menores de edad</label><p>Ahorro infantil; exige datos del tutor.</p></div><select id="p_acepta_menores" data-p="acepta_menores"><option value="true" ${p.acepta_menores?'selected':''}>Sí</option><option value="false" ${!p.acepta_menores?'selected':''}>No</option></select></div>
  <div class="param"><div><label class="t" for="p_exportar_solo_admin">Quién puede exportar listados</label><p>Excel y PDF con los datos de todos los socios. Cada exportación queda registrada.</p></div><select id="p_exportar_solo_admin" data-p="exportar_solo_admin"><option value="true" ${p.exportar_solo_admin!==false?'selected':''}>Solo el administrador</option><option value="false" ${p.exportar_solo_admin===false?'selected':''}>Oficina y administrador</option></select></div>
  ${P('minutos_inactividad','Cierre de sesión por inactividad (minutos)','Para Oficina y Administrador. Entre 5 y 120.')}
  <div class="rowbtns"><span class="hint">Versión de la app ${VERSION}</span><button class="btn-primary" type="submit">Guardar parámetros</button></div></form>`;
}

/* ================= Render ================= */
function tabsFor(){const t=[];if(S.perfil?.activo){t.push(['nueva','Nueva solicitud'],['envios','Mis envíos'+(S.queue.length?` <span class="badge">${S.queue.length}</span>`:'')]);if(isOficina())t.push(['bandeja','Bandeja'+(S.pend?` <span class="badge">${S.pend}</span>`:'')]);if(isAdmin())t.push(['usuarios','Usuarios'],['params','Parámetros'])}return t}
function tabs(){$('#tabs').innerHTML=tabsFor().map(([k,l])=>`<button role="tab" data-tab="${k}" aria-selected="${S.view===k}">${l}</button>`).join('')}
function netbar(){const b=$('#netbar');if(!S.session){b.hidden=true;return}
  if(!navigator.onLine){b.hidden=false;b.textContent='Sin conexión · puede seguir llenando solicitudes; se enviarán al volver la señal'+(S.queue.length?` (${S.queue.length} en espera)`:'')}
  else if(S.syncing){b.hidden=false;b.innerHTML='<span class="spin"></span> Enviando solicitudes guardadas…'}
  else if(S.queue.length){b.hidden=false;b.textContent=S.queue.length+' solicitud(es) en el teléfono sin enviar · revise Mis envíos'}
  else b.hidden=true}
function render(){
  const app=$('#app');
  if(!S.session){$('#hdr').hidden=true;app.innerHTML=vAuth(S.authMode||'login');return}
  $('#hdr').hidden=false;$('#whoName').textContent=(S.perfil?.nombre||S.session.user.email).split(' ')[0];tabs();netbar();
  if(!S.perfil||!S.perfil.activo){app.innerHTML=vPendiente();return}
  const v=S.view;
  app.innerHTML=v==='nueva'?vNueva():v==='envios'?vEnvios():v==='bandeja'?vBandeja():v==='usuarios'?vUsuarios():vParams();
  if(v==='nueva'&&S.step===5&&!S.sent&&!S.busy){initSig('#sig','firma','#sigHint');initSig('#sig2','firmaTestigo','#sig2Hint')}
}
function go(step){S.step=step;S.errors={};render();window.scrollTo({top:0})}
function setView(v){S.view=v;S.open=null;S.detail=null;S.sent=null;render();window.scrollTo({top:0});
  if(v==='bandeja')loadBandeja();if(v==='envios'&&navigator.onLine)loadMine();if(v==='usuarios')loadUsuarios();if(v==='params')loadParams().then(render)}

/* ================= Eventos ================= */
document.addEventListener('submit',async e=>{
  e.preventDefault();const f=e.target;
  if(f.id==='authForm'){const email=$('#a_email').value.trim(),pass=$('#a_pass').value,b=$('#a_go'),er=$('#a_err');er.textContent='';
    if(!email||!pass){er.textContent='Escriba su correo y su contraseña.';return}
    if(S.authMode==='reg'&&(pass.length<10||!/[A-Za-z]/.test(pass)||!/\d/.test(pass))){er.textContent='La contraseña debe tener al menos 10 caracteres, con letras y números.';return}
    b.disabled=true;b.innerHTML='<span class="spin"></span>';
    try{if(S.authMode==='reg'){const nombre=$('#a_nombre').value.trim();if(!nombre)throw new Error('Escriba su nombre completo.');
        const{data,error}=await sb.auth.signUp({email,password:pass,options:{data:{nombre},emailRedirectTo:location.origin+location.pathname}});if(error)throw error;
        if(!data.session){S.authMode='login';render();toast('Cuenta creada. Confirme su correo y luego entre.',5000);return}}
      else{const{error}=await sb.auth.signInWithPassword({email,password:pass});if(error)throw error}}
    catch(x){er.textContent=errMsg(x);b.disabled=false;b.textContent=S.authMode==='reg'?'Crear cuenta':'Entrar'}}
  if(f.id==='searchF'){S.q=$('#qBox').value;loadBandeja()}
  if(f.id==='paramsF'){const p={};f.querySelectorAll('[data-p]').forEach(el=>{const k=el.dataset.p;p[k]=(k==='acepta_menores'||k==='exportar_solo_admin')?el.value==='true':(el.type==='number'?Number(el.value):el.value.trim())});
    if(['inscripcion','aportacion','ahorro_min'].some(k=>!(p[k]>=0))){toast('Revise los montos.');return}
    if(!(p.minutos_inactividad>=5&&p.minutos_inactividad<=120)){toast('El cierre por inactividad debe estar entre 5 y 120 minutos.');return}
    p.actualizado_en=new Date().toISOString();const{error}=await sb.from('parametros').update(p).eq('id',1);if(error){toast(errMsg(error));return}
    await loadParams();toast('Parámetros guardados')}
});
document.addEventListener('click',async e=>{
  const t=e.target.closest('button');if(!t)return;
  if(t.id==='toReg'){S.authMode='reg';render()} if(t.id==='toLogin'){S.authMode='login';render()}
  if(t.id==='logout'){const pend=S.queue.length+(S.draft&&S.draft.nombres?1:0);if(pend&&!t.dataset.sure){t.dataset.sure='1';t.textContent=`¿Salir? Se borrará${pend>1?'n':''} ${pend} solicitud${pend>1?'es':''} sin enviar`;setTimeout(()=>{t.textContent='Salir';delete t.dataset.sure},5000);return}await cerrarSesion()}
  if(t.dataset.uf){S.uFilter=t.dataset.uf;S.uAction=null;render()}
  if(t.dataset.usus){S.uAction={id:t.dataset.usus,tipo:'sus'};render();$('#susMotivo')?.focus()}
  if(t.dataset.udel){S.uAction={id:t.dataset.udel,tipo:'del'};render()}
  if(t.dataset.ucancel!==undefined){S.uAction=null;render()}
  if(t.dataset.ususok){const m=$('#susMotivo').value.trim();if(!m){toast('Escriba el motivo de la suspensión.');return}t.disabled=true;await uRpc('suspender_usuario',{p_id:t.dataset.ususok,p_motivo:m},'Usuario suspendido')}
  if(t.dataset.uact){t.disabled=true;await uRpc('activar_usuario',{p_id:t.dataset.uact},'Usuario activado')}
  if(t.dataset.udelok){t.disabled=true;await uRpc('eliminar_usuario',{p_id:t.dataset.udelok},'Cuenta eliminada')}
  if(t.id==='pushBtn'){t.disabled=true;await togglePush();t.disabled=false}
  if(t.id==='xlsBtn')exportExcel(t);
  if(t.id==='pdfListBtn')exportListPDF(t);
  if(t.id==='pdfFichaBtn')fichaPDF(t);
  if(t.id==='recheck'){await loadPerfil();render()}
  if(t.dataset.tab)setView(t.dataset.tab);
  if(t.dataset.go!==undefined)go(+t.dataset.go);
  if(t.id==='prev')go(S.step-1);
  if(t.id==='next'){const er=validate(S.step);
    if(!Object.keys(er).length&&S.step===0&&navigator.onLine){t.disabled=true;try{const{data}=await sb.rpc('dni_registrado',{p_dni:S.draft.dni});if(data)er.dni='Ya existe una solicitud vigente con este DNI.'}catch(x){}t.disabled=false}
    if(Object.keys(er).length){S.errors=er;render();toast('Revise los campos marcados')}else go(S.step+1)}
  if(t.id==='goBad')go(firstInvalid());
  if(t.id==='addB'){S.draft.benef.push({n:'',dni:'',p:'',pct:0});saveDraft();render()}
  if(t.dataset.rmb!==undefined){S.draft.benef.splice(+t.dataset.rmb,1);saveDraft();render()}
  if(t.id==='clrSig'){S.draft.firma='';saveDraft();render()}
  if(t.id==='clrSig2'){S.draft.firmaTestigo='';saveDraft();render()}
  if(t.id==='gpsBtn'){if(!('geolocation' in navigator)){toast('Este teléfono no permite obtener la ubicación.');return}
    t.disabled=true;t.innerHTML='<span class="spin"></span> Buscando señal GPS…';
    navigator.geolocation.getCurrentPosition(p=>{const d=S.draft;d.lat=+p.coords.latitude.toFixed(6);d.lng=+p.coords.longitude.toFixed(6);d.gpsPrec=Math.round(p.coords.accuracy*10)/10;delete S.errors.gps;saveDraft();render();toast(d.gpsPrec>100?'Ubicación guardada, pero con poca precisión ('+Math.round(d.gpsPrec)+' m). Si puede, salga al aire libre e inténtelo otra vez.':'Ubicación guardada')},
      er=>{render();toast(er.code===1?'Permita el acceso a la ubicación en el navegador para guardar el GPS.':'No se pudo obtener la ubicación. Intente al aire libre.',6000)},{enableHighAccuracy:true,timeout:25000,maximumAge:0})}
  if(t.id==='send'){t.disabled=true;await enviar()}
  if(t.id==='newReq'){S.sent=null;render()}
  if(t.id==='goEnvios')setView('envios');
  if(t.id==='resetDraft'){if(!t.dataset.sure){t.dataset.sure='1';t.textContent='Toque otra vez para descartar';setTimeout(()=>{t.textContent='Descartar borrador';delete t.dataset.sure},4000);return}S.draft=blankDraft();S.step=0;S.errors={};await idb.set('draft',S.draft);render();toast('Borrador descartado')}
  if(t.id==='syncNow')syncQueue();
  if(t.dataset.editq){const it=S.queue.find(q=>q.d.client_id===t.dataset.editq);if(it){S.queue=S.queue.filter(q=>q!==it);await saveQueue();S.draft=it.d;saveDraft();S.view='nueva';S.step=0;render();toast('Corrija y vuelva a enviar')}}
  if(t.dataset.f){S.filter=t.dataset.f;loadBandeja()}
  if(t.dataset.open){S.open=t.dataset.open;loadDetail(S.open);window.scrollTo({top:0})}
  if(t.id==='back'){S.open=null;S.detail=null;render();loadBandeja()}
  if(t.id==='approve'){const acta=$('#acta').value.trim();if(!acta){$('#apErr').textContent='Anote el número de acta para aprobar.';return}
    t.disabled=true;const{data,error}=await sb.rpc('aprobar_solicitud',{p_id:S.open,p_acta:acta});if(error){$('#apErr').textContent=errMsg(error);t.disabled=false;return}
    toast('Aprobada · código '+data,4000);loadDetail(S.open);countPend()}
  if(t.id==='reject'){const m=$('#motivo').value.trim();if(!m){$('#apErr').textContent='Escriba el motivo del rechazo.';return}
    t.disabled=true;const{error}=await sb.rpc('rechazar_solicitud',{p_id:S.open,p_motivo:m});if(error){$('#apErr').textContent=errMsg(error);t.disabled=false;return}
    toast('Solicitud rechazada');loadDetail(S.open);countPend()}
  if(t.id==='printBtn'){const pr=$('#print');pr.innerHTML=fichaHTML(S.detail.s,S.detail.urls);
    try{await registrarExport('Impresión',S.detail.s.folio,1)}catch(x){}
    const imgs=[...pr.querySelectorAll('img')];await Promise.all(imgs.map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r})));window.print()}
});
document.addEventListener('input',e=>{
  const el=e.target,d=S.draft;if(!d)return;
  if(el.dataset.k&&el.type!=='radio'&&el.type!=='checkbox'){let v=el.value;if(el.dataset.k==='dni')v=el.value=d.tipoDoc==='DNI'?v.replace(/\D/g,'').slice(0,13):v.replace(/[^A-Za-z0-9-]/g,'').toUpperCase().slice(0,20);d[el.dataset.k]=v;delete S.errors[el.dataset.k];saveDraft()}
  if(el.dataset.b!==undefined){let v=el.value;if(el.dataset.bk==='dni')v=el.value=v.replace(/\D/g,'').slice(0,13);d.benef[+el.dataset.b][el.dataset.bk]=el.dataset.bk==='pct'?Number(v):v;saveDraft();
    const sum=$('#sumB');if(sum){const tt=d.benef.reduce((s,b)=>s+Number(b.pct||0),0);sum.textContent='Total: '+tt+'%';sum.style.color=tt===100?'var(--ok)':'var(--warn)'}}
  if(el.dataset.t){let v=el.value;if(el.dataset.t==='dni')v=el.value=v.replace(/\D/g,'').slice(0,13);d.tutor[el.dataset.t]=v;saveDraft()}
  if(el.dataset.cy){let v=el.value;if(el.dataset.cy==='dni')v=el.value=v.replace(/\D/g,'').slice(0,13);d.conyuge[el.dataset.cy]=v;saveDraft()}
  if(el.dataset.tg){let v=el.value;if(el.dataset.tg==='dni')v=el.value=v.replace(/\D/g,'').slice(0,13);d.testigo[el.dataset.tg]=v;saveDraft()}
  if(el.dataset.r!==undefined&&el.tagName==='INPUT'){d.refs[+el.dataset.r][el.dataset.rk]=el.value;saveDraft()}
});
document.addEventListener('change',async e=>{
  const el=e.target,d=S.draft;
  if(el.dataset.urol){el.disabled=true;await uRpc('cambiar_rol',{p_id:el.dataset.urol,p_rol:el.value},'Rol actualizado');return}
  if(!d)return;
  if(el.type==='radio'&&el.dataset.k){if(el.dataset.k==='tipoDoc'&&d.tipoDoc!==el.value)d.dni='';d[el.dataset.k]=el.value;delete S.errors[el.dataset.k];saveDraft();if(['pep','pago','tipoDoc','civil','famDir','llenado'].includes(el.dataset.k))render()}
  if(el.type==='checkbox'&&el.dataset.k){d[el.dataset.k]=el.checked;saveDraft();if(el.dataset.k==='aRuego')render()}
  if(el.dataset.r!==undefined&&el.tagName==='SELECT'){d.refs[+el.dataset.r][el.dataset.rk]=el.value;saveDraft()}
  if(el.dataset.decl!==undefined){d.decl[+el.dataset.decl]=el.checked;saveDraft()}
  if(el.dataset.k==='nac'||el.dataset.k==='depto')render();
  if(el.dataset.photo&&el.files[0]){const key=el.dataset.photo,r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas'),s=Math.min(1,1200/Math.max(img.width,img.height));c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);d[key]=c.toDataURL('image/jpeg',.72);saveDraft();render()};img.src=r.result};r.readAsDataURL(el.files[0])}
});
function initSig(sel,key,hintSel){
  const c=$(sel);if(!c)return;const r=c.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  c.width=r.width*dpr;c.height=r.height*dpr;const x=c.getContext('2d');x.scale(dpr,dpr);x.lineWidth=2.4;x.lineCap='round';x.lineJoin='round';x.strokeStyle='#14231a';
  if(S.draft[key]){const im=new Image();im.onload=()=>x.drawImage(im,0,0,r.width,r.height);im.src=S.draft[key]}
  let drawing=false;const pos=e=>{const b=c.getBoundingClientRect();return[e.clientX-b.left,e.clientY-b.top]};
  c.addEventListener('pointerdown',e=>{drawing=true;c.setPointerCapture(e.pointerId);const[a,b]=pos(e);x.beginPath();x.moveTo(a,b)});
  c.addEventListener('pointermove',e=>{if(!drawing)return;const[a,b]=pos(e);x.lineTo(a,b);x.stroke()});
  const end=()=>{if(!drawing)return;drawing=false;const out=document.createElement('canvas');out.width=Math.min(c.width,900);out.height=Math.round(c.height*out.width/c.width);const o=out.getContext('2d');o.fillStyle='#fff';o.fillRect(0,0,out.width,out.height);o.drawImage(c,0,0,out.width,out.height);S.draft[key]=out.toDataURL('image/jpeg',.8);saveDraft();const h=$(hintSel);if(h)h.textContent='Firma guardada.';delete S.errors[key]};
  c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);
}

/* ================= Sesión segura ================= */
async function limpiarDispositivo(){
  try{await idb.set('draft',null);await idb.set('queue',[])}catch(e){}
  try{Object.keys(localStorage).filter(k=>k.startsWith('cacih_')).forEach(k=>localStorage.removeItem(k))}catch(e){}
  S.draft=null;S.queue=[];S.bandeja=[];S.detail=null;S.mine=[];S.usuarios=[];S.uLog=[];
  const pr=$('#print');if(pr)pr.innerHTML='';const pa=$('#pdfArea');if(pa)pa.innerHTML=''}
async function cerrarSesion(motivo){await quitarDispositivo();await limpiarDispositivo();S.motivoSalida=motivo||null;await sb.auth.signOut()}
let ultimaActividad=Date.now(),avisoInactividad=false;
['pointerdown','keydown','scroll','touchstart'].forEach(ev=>document.addEventListener(ev,()=>{ultimaActividad=Date.now();avisoInactividad=false},{passive:true}));
setInterval(()=>{
  if(!S.session||!isOficina())return;
  const lim=(Number(S.params.minutos_inactividad)||15)*60000,idle=Date.now()-ultimaActividad;
  if(idle>=lim)cerrarSesion('Su sesión se cerró por inactividad. Vuelva a entrar.');
  else if(idle>=lim-60000&&!avisoInactividad){avisoInactividad=true;toast('La sesión se cerrará en 1 minuto por inactividad. Toque la pantalla para continuar.',8000)}
},15000);

/* ================= Arranque ================= */
async function loadPerfil(){if(!S.session){S.perfil=null;return}
  const{data,error}=await sb.from('perfiles').select('*').eq('user_id',S.session.user.id).maybeSingle();
  if(data){S.perfil=data;try{localStorage.setItem('cacih_perfil',JSON.stringify(data))}catch(e){}}
  else if(error){try{const c=JSON.parse(localStorage.getItem('cacih_perfil')||'null');if(c&&c.user_id===S.session.user.id)S.perfil=c}catch(e){}}
  else S.perfil=null}
async function boot(session){
  S.session=session;
  if(!session){S.perfil=null;render();return}
  await Promise.all([loadPerfil(),loadParams()]);
  const dr=await idb.get('draft').catch(()=>null);S.draft=dr?completarDraft(dr):blankDraft();
  S.queue=((await idb.get('queue').catch(()=>null))||[]).map(q=>({...q,d:completarDraft(q.d)}));ultimaActividad=Date.now();
  if(isOficina()&&S.view==='nueva'&&!S.draft.nombres){S.view='bandeja';loadBandeja()}
  render();countPend();syncQueue();pushState();
  if(location.hash&&S.perfil?.activo)irA(location.hash);
}
let booted=false;
sb.auth.onAuthStateChange((ev,session)=>{
  if(ev==='INITIAL_SESSION'){booted=true;boot(session)}
  else if(ev==='SIGNED_IN'&&(!S.session||S.session.user.id!==session.user.id)){S.view='nueva';boot(session)}
  else if(ev==='SIGNED_OUT'){limpiarDispositivo();S.session=null;S.perfil=null;S.view='nueva';S.authMode='login';S.open=null;render();if(S.motivoSalida){toast(S.motivoSalida,6000);S.motivoSalida=null}}
  else if(session)S.session=session;
});
window.addEventListener('online',()=>{netbar();syncQueue();if(S.view==='nueva')render()});
window.addEventListener('offline',()=>{netbar();if(S.view==='nueva')render()});
setInterval(()=>{syncQueue();if(S.view==='bandeja'&&!S.open&&navigator.onLine)countPend()},60000);
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
  navigator.serviceWorker.addEventListener('message',e=>{const m=e.data||{};if(!S.session||!S.perfil?.activo)return;
    if(m.type==='aviso'){if(m.tipo==='nueva'){countPend();if(S.view==='bandeja'&&!S.open)loadBandeja()}else if(S.view==='envios')loadMine()}
    if(m.type==='navegar'&&m.url)irA(m.url)});
}

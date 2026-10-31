/* =====================================================================
   CACIH · Seguridad y operación (v1.7)
   - Verificación en dos pasos (código de 6 dígitos) para Oficina y Administrador
   - PIN para abrir la app en el teléfono
   - Cierre de sesiones a distancia
   - Registro de errores, aviso de versión nueva, modo práctica
   - Productos de crédito y errores recientes en Parámetros
   ===================================================================== */

/* ---------- Cambio de contraseña obligatorio (cuentas creadas o restablecidas por el administrador) ---------- */
function vCambiarClave(){return `<div class="auth card"><h2>Cree su contraseña</h2><p class="lead">El administrador le dio una contraseña temporal. Cámbiela por una que solo usted conozca.</p>
  <form id="claveForm"><div class="f"><label class="t" for="cc1">Contraseña nueva</label><input id="cc1" type="password" autocomplete="new-password"></div>
  <div class="f"><label class="t" for="cc2">Repita la contraseña</label><input id="cc2" type="password" autocomplete="new-password"></div>
  <p class="hint">Al menos 10 caracteres, con letras y números.</p><span class="err" id="ccErr"></span><div class="rowbtns"><button class="btn-primary" type="submit" id="ccGo">Guardar contraseña</button></div></form></div>`}
async function guardarClave(){const a=$('#cc1').value,b=$('#cc2').value,er=$('#ccErr'),bt=$('#ccGo');er.textContent='';
  if(a.length<10||!/[A-Za-z]/.test(a)||!/\d/.test(a)){er.textContent='La contraseña debe tener al menos 10 caracteres, con letras y números.';return}
  if(a!==b){er.textContent='Las dos contraseñas no coinciden.';return}
  bt.disabled=true;bt.innerHTML='<span class="spin"></span>';
  const{data,error}=await sb.auth.updateUser({password:a,data:{cambiar_clave:false}});
  if(error){er.textContent=/same|different/i.test(error.message)?'Use una contraseña distinta a la temporal.':errMsg(error);bt.disabled=false;bt.textContent='Guardar contraseña';return}
  S.cambiarClave=false;if(data?.user)S.session.user=data.user;toast('Contraseña guardada');await boot(S.session)}

/* ---------- Crear usuarios y restablecer contraseñas (Administrador) ---------- */
function claveTemporal(){const L='abcdefghjkmnpqrstuvwxyz',N='23456789',r=n=>crypto.getRandomValues(new Uint32Array(1))[0]%n;
  let s='Cacih-';for(let i=0;i<4;i++)s+=N[r(N.length)];s+='-';for(let i=0;i<3;i++)s+=L[r(L.length)];return s}
function vNuevoUsuario(){const n=S.nuevoU;if(!n)return `<div class="rowbtns" style="justify-content:flex-start;margin:6px 0 14px"><button class="btn-primary" id="uNuevo">+ Crear usuario</button></div>`;
  if(n.listo)return `<div class="card" style="margin-bottom:14px;border-color:var(--accent-2)"><h3>Usuario creado y activo</h3><p>Entregue estos datos a <b>${esc(n.nombre)}</b>. Al entrar por primera vez, la app le pedirá cambiar la contraseña.</p>
    <table class="plain"><tr><td style="color:var(--muted)">Dirección de la app</td><td class="mono">${esc(location.origin+location.pathname)}</td></tr><tr><td style="color:var(--muted)">Correo</td><td class="mono">${esc(n.email)}</td></tr><tr><td style="color:var(--muted)">Contraseña temporal</td><td class="mono"><b>${esc(n.clave)}</b></td></tr><tr><td style="color:var(--muted)">Rol</td><td>${esc(rolNombre(n.rol))}</td></tr></table>
    <div class="rowbtns"><button id="uCopiar">Copiar datos</button><button class="btn-wa" id="uWa">Enviar por WhatsApp</button><button class="btn-primary" id="uListo">Listo</button></div></div>`;
  return `<form class="card" id="uNuevoF" style="margin-bottom:14px"><h3>Crear usuario</h3><div class="grid" style="margin-top:10px">
    <div class="f"><label class="t" for="nu_nombre">Nombre completo</label><input id="nu_nombre" value="${esc(n.nombre)}" autocomplete="off"></div>
    <div class="f"><label class="t" for="nu_email">Correo</label><input id="nu_email" type="email" value="${esc(n.email)}" autocomplete="off"></div>
    <div class="f"><label class="t" for="nu_cel">Celular (para enviarle sus datos)</label><input id="nu_cel" inputmode="tel" value="${esc(n.cel||'')}" placeholder="Opcional"></div>
    <div class="f"><label class="t" for="nu_rol">Rol</label><select id="nu_rol">${['promotor','oficina','admin'].map(r=>`<option value="${r}" ${n.rol===r?'selected':''}>${rolNombre(r)}</option>`).join('')}</select></div>
    <div class="f full"><label class="t" for="nu_clave">Contraseña temporal</label><div style="display:flex;gap:8px"><input id="nu_clave" class="mono" value="${esc(n.clave)}" autocomplete="off"><button type="button" class="btn-sm" id="nuOtra">Generar otra</button></div><span class="hint">La persona la cambia al entrar por primera vez.</span></div></div>
    <div class="rowbtns"><span class="err" id="nuErr"></span><button type="button" class="btn-sm" id="uCancelar">Cancelar</button><button class="btn-primary" type="submit" id="nuGo">Crear y activar</button></div></form>`}
const rolNombre=r=>r==='admin'?'Administrador':r==='oficina'?'Oficina':'Promotor';
function vClaveUsuario(u){const c=S.uClave;if(!c||c.id!==u.user_id)return '';
  if(c.listo)return `<div class="note" style="margin-top:12px">Nueva contraseña temporal de ${esc(u.nombre||u.email)}: <b class="mono">${esc(c.clave)}</b>. Su app se cerró en sus teléfonos; al entrar con esta contraseña deberá crear una nueva. <div class="actions"><button class="btn-sm" id="ucCopiar">Copiar</button><button class="btn-sm btn-wa" id="ucWa">WhatsApp</button><button class="btn-sm" data-ucancel>Cerrar</button></div></div>`;
  return `<div class="actions" style="border-top:1px solid var(--line);padding-top:12px"><div class="f" style="flex:1;min-width:200px"><label class="t" for="ucClave">Contraseña temporal</label><input id="ucClave" class="mono" value="${esc(c.clave)}"></div><button class="btn-primary" data-uclaveok="${u.user_id}">Asignar</button><button class="btn-sm" data-ucancel>Cancelar</button></div><span class="err" id="ucErr"></span>`}
async function llamarUsuarios(body){const{data,error}=await sb.functions.invoke('usuarios',{body});
  if(error){let m=error.message;try{const j=await error.context.json();if(j?.error)m=j.error}catch(e){}throw new Error(m)}
  if(data?.error)throw new Error(data.error);return data}
const textoAcceso=(nombre,email,clave)=>`Hola ${nombre}. Su acceso a la app de CACIH:\n${location.origin+location.pathname}\nCorreo: ${email}\nContraseña temporal: ${clave}\nAl entrar, la app le pedirá crear su propia contraseña.`;
function waLink(cel,txt){const c=String(cel||'').replace(/\D/g,'');return `https://wa.me/${c.length===8?'504'+c:c}?text=${encodeURIComponent(txt)}`}
async function copiar(txt){try{await navigator.clipboard.writeText(txt);toast('Copiado')}catch(e){toast('No se pudo copiar; selecciónelo a mano')}}

/* ---------- PIN del teléfono ---------- */
const PIN_KEY='cacih_pin',PIN_FALLOS='cacih_pin_fallos',PIN_MINUTOS=3,PIN_MAX_FALLOS=5;
async function pinHash(pin,salt){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
  const b=await crypto.subtle.deriveBits({name:'PBKDF2',salt:Uint8Array.from(atob(salt),c=>c.charCodeAt(0)),iterations:150000,hash:'SHA-256'},k,256);return btoa(String.fromCharCode(...new Uint8Array(b)))}
const pinGuardado=()=>{try{return JSON.parse(localStorage.getItem(PIN_KEY)||'null')}catch(e){return null}};
let pinBloqueado=false,ocultoDesde=null;
function pinPantalla(modo){if(!window.crypto?.subtle)return;
  let el=$('#lock');if(!el){el=document.createElement('div');el.id='lock';document.body.appendChild(el)}
  pinBloqueado=true;el.hidden=false;document.body.classList.add('locked');
  const nuevo=modo==='nuevo';
  el.innerHTML=`<div class="lockbox"><img src="logo-icono.png" width="64" height="64" alt="" style="border-radius:50%;background:#fff"><h2>${nuevo?'Cree su PIN':'Escriba su PIN'}</h2>
    <p class="hint">${nuevo?'Protege las solicitudes y fotos guardadas en este teléfono. Use de 4 a 6 números que solo usted conozca.':'La app se bloqueó para proteger los datos de los clientes.'}</p>
    <form id="pinForm"><input id="pinIn" type="password" inputmode="numeric" autocomplete="off" maxlength="6" class="mono" aria-label="PIN" placeholder="••••">${nuevo?'<input id="pinIn2" type="password" inputmode="numeric" autocomplete="off" maxlength="6" class="mono" aria-label="Repita el PIN" placeholder="Repita el PIN" style="margin-top:8px">':''}
    <span class="err" id="pinErr"></span><button class="btn-primary" type="submit" style="width:100%;margin-top:10px">${nuevo?'Guardar PIN':'Desbloquear'}</button></form>
    ${nuevo?'':'<button class="btn-sm" id="pinOlvido" style="margin-top:14px">Olvidé mi PIN</button>'}</div>`;
  el.dataset.modo=modo;setTimeout(()=>{const i=$('#pinIn');if(i)i.focus()},50)}
function pinQuitar(){pinBloqueado=false;const el=$('#lock');if(el){el.hidden=true;el.innerHTML=''}document.body.classList.remove('locked')}
function pinArranque(){if(!S.session||!S.perfil?.activo||S.cambiarClave)return;if(!S.params.pedir_pin){pinQuitar();return}pinPantalla(pinGuardado()?'pedir':'nuevo')}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){ocultoDesde=Date.now();return}
  if(ocultoDesde&&S.session&&S.perfil?.activo&&S.params.pedir_pin&&!S.cambiarClave&&!pinBloqueado&&pinGuardado()&&Date.now()-ocultoDesde>PIN_MINUTOS*60000)pinPantalla('pedir');
  ocultoDesde=null;buscarVersion()});
document.addEventListener('submit',async e=>{
  if(e.target.id==='pinForm'){e.preventDefault();const el=$('#lock'),pin=$('#pinIn').value,er=$('#pinErr');er.textContent='';
    if(!/^\d{4,6}$/.test(pin)){er.textContent='El PIN debe tener de 4 a 6 números.';return}
    if(el.dataset.modo==='nuevo'){if(pin!==$('#pinIn2').value){er.textContent='Los dos PIN no coinciden.';return}
      if(/^(\d)\1+$/.test(pin)||'0123456789'.includes(pin)||'9876543210'.includes(pin)){er.textContent='Use un PIN menos obvio (no 1111 ni 1234).';return}
      const salt=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
      try{localStorage.setItem(PIN_KEY,JSON.stringify({salt,hash:await pinHash(pin,salt)}));localStorage.setItem(PIN_FALLOS,'0')}catch(x){}
      pinQuitar();toast('PIN guardado');return}
    const g=pinGuardado();if(!g){pinQuitar();return}
    if(await pinHash(pin,g.salt)===g.hash){try{localStorage.setItem(PIN_FALLOS,'0')}catch(x){}pinQuitar();return}
    let n=0;try{n=Number(localStorage.getItem(PIN_FALLOS)||0)+1;localStorage.setItem(PIN_FALLOS,String(n))}catch(x){}
    if(n>=PIN_MAX_FALLOS){pinQuitar();await cerrarSesion('Se cerró la sesión y se borraron los datos del teléfono por intentos fallidos de PIN.');return}
    er.textContent=`PIN incorrecto. Le quedan ${PIN_MAX_FALLOS-n} intento${PIN_MAX_FALLOS-n===1?'':'s'}.`;$('#pinIn').value=''}
  if(e.target.id==='claveForm'){e.preventDefault();guardarClave()}
  if(e.target.id==='uNuevoF'){e.preventDefault();crearUsuario()}
});

/* ---------- Cierre de sesiones a distancia ---------- */
async function revisarRevocacion(){
  const p=S.perfil,u=S.session?.user;if(!p||!u)return false;
  if(p.sesiones_revocadas_en&&u.last_sign_in_at&&new Date(p.sesiones_revocadas_en)>new Date(u.last_sign_in_at)){
    await cerrarSesion('El administrador cerró su sesión en este teléfono. Vuelva a entrar.');return true}
  if(!p.activo&&p.suspendido_en){try{await limpiarDispositivo()}catch(e){}}
  return false}
setInterval(async()=>{if(!S.session||!navigator.onLine||document.hidden)return;await loadPerfil();if(!(await revisarRevocacion())&&S.perfil&&!S.perfil.activo&&S.view!=='pendiente')render()},120000);

/* ---------- Registro de errores ---------- */
const ERR_KEY='cacih_errores';
function registrarError(donde,mensaje){try{
  const l=JSON.parse(localStorage.getItem(ERR_KEY)||'[]');l.push({version:VERSION,donde:String(donde).slice(0,80),mensaje:String(mensaje).slice(0,1000),dispositivo:navigator.userAgent.slice(0,300),creado_en:new Date().toISOString()});
  localStorage.setItem(ERR_KEY,JSON.stringify(l.slice(-20)));enviarErrores()}catch(e){}}
let enviandoErr=false;
async function enviarErrores(){if(enviandoErr||!S.session||!navigator.onLine)return;enviandoErr=true;
  try{const l=JSON.parse(localStorage.getItem(ERR_KEY)||'[]');if(l.length){const{error}=await sb.from('errores_app').insert(l);if(!error)localStorage.setItem(ERR_KEY,'[]')}}catch(e){}enviandoErr=false}
window.addEventListener('error',e=>{if(e.filename&&!/\/(app|credito|seguridad)\.js/.test(e.filename))return;registrarError('pantalla',`${e.message} (${(e.filename||'').split('/').pop()}:${e.lineno})`)});
window.addEventListener('unhandledrejection',e=>{const m=e.reason?.message||String(e.reason||'');if(/Failed to fetch|NetworkError|Load failed/i.test(m))return;registrarError('proceso',m)});
window.addEventListener('online',()=>setTimeout(enviarErrores,3000));
function vErrores(){if(!isAdmin())return '';
  if(S.errores===undefined){S.errores=null;sb.from('errores_app').select('version,donde,mensaje,dispositivo,creado_en,usuario').order('creado_en',{ascending:false}).limit(30).then(({data})=>{S.errores=data||[];if(S.view==='params')render()});}
  const l=S.errores;return `<div class="card" style="margin-top:16px"><h2>Errores recientes en los teléfonos</h2><p class="hint">Fallos al enviar o al usar la app. Si un promotor reporta un problema, revise aquí primero.</p>
  ${l==null?'<p class="empty"><span class="spin"></span></p>':l.length?`<ul class="log">${l.map(x=>{const u=S.usuarios?.find(v=>v.user_id===x.usuario);return `<li>${fechaHora(x.creado_en)} · ${esc(u?.nombre||'usuario')} · v${esc(x.version||'')} · <b>${esc(x.donde||'')}</b>: ${esc(x.mensaje)}</li>`}).join('')}</ul>`:'<p class="hint">Sin errores registrados.</p>'}</div>`}

/* ---------- Productos de crédito (Parámetros) ---------- */
function vProductos(){if(!isAdmin())return '';
  if(!S.prodEdit)S.prodEdit=JSON.parse(JSON.stringify(S.params.productos||[]));
  const l=S.prodEdit,inpP=(i,k,label,o={})=>`<div class="f"><label class="t" for="pr_${i}_${k}">${label}</label><input id="pr_${i}_${k}" data-prod="${i}" data-pk="${k}" type="${o.type||'number'}" inputmode="${o.type==='text'?'text':'decimal'}" value="${esc(l[i][k]??'')}" placeholder="${o.ph||''}"></div>`;
  return `<div class="card" style="margin-top:16px"><h2>Productos de crédito</h2><p class="hint">Cada producto fija su tasa, montos y plazo máximo. El promotor elige el producto y no puede cambiar la tasa. Sin productos, la tasa se escribe a mano.</p>
  ${l.map((p,i)=>`<div class="prod"><div class="grid">${inpP(i,'nombre','Nombre',{type:'text',ph:'Ej. Agropecuario'})}${inpP(i,'tasa','Tasa (%)',{ph:'2'})}<div class="f"><label class="t" for="pr_${i}_tasaTipo">La tasa es</label><select id="pr_${i}_tasaTipo" data-prod="${i}" data-pk="tasaTipo">${['Mensual','Anual'].map(o=>`<option ${p.tasaTipo===o?'selected':''}>${o}</option>`).join('')}</select></div>${inpP(i,'montoMin','Monto mínimo (L)',{ph:'Opcional'})}${inpP(i,'montoMax','Monto máximo (L)',{ph:'Opcional'})}${inpP(i,'plazoMax','Plazo máximo (meses)',{ph:'Opcional'})}</div><button class="btn-sm btn-bad" data-prodquitar="${i}" style="margin-top:8px">Quitar</button></div>`).join('')}
  <div class="rowbtns"><button id="prodAgregar">Agregar producto</button><button class="btn-primary" id="prodGuardar">Guardar productos</button></div></div>`}

/* ---------- Modo práctica ---------- */
try{S.practica=localStorage.getItem('cacih_practica')==='1'}catch(e){S.practica=false}
function practicaUI(){let b=$('#practicaBtn');if(!b){b=document.createElement('button');b.id='practicaBtn';const lo=$('#logout');lo.parentNode.insertBefore(b,lo)}
  b.textContent=S.practica?'Práctica: sí':'Práctica';b.className=S.practica?'on':'';b.title='Modo práctica: llene formularios sin enviarlos a la oficina';
  document.body.classList.toggle('practica',!!S.practica)}
practicaUI();

/* ---------- Aviso de versión nueva ---------- */
let regSW=null;
function buscarVersion(){if(regSW)regSW.update().catch(()=>{})}
if('serviceWorker' in navigator){
  navigator.serviceWorker.ready.then(r=>{regSW=r}).catch(()=>{});
  let habia=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!habia){habia=true;return}
    let b=$('#nuevaVersion');if(!b){b=document.createElement('div');b.id='nuevaVersion';b.className='updbar';b.innerHTML='<span>Hay una versión nueva de la app.</span><button class="btn-primary btn-sm" id="actualizarApp">Actualizar</button>';document.body.appendChild(b)}});
  setInterval(buscarVersion,30*60000);
}

/* ---------- eventos ---------- */
document.addEventListener('click',async e=>{const t=e.target.closest('button');if(!t)return;
  if(t.id==='actualizarApp'){t.disabled=true;location.reload();return}
  if(t.id==='pinOlvido'){if(!t.dataset.sure){t.dataset.sure='1';t.textContent='Se cerrará la sesión y se borrará lo no enviado. Toque otra vez.';return}pinQuitar();await cerrarSesion('Entre de nuevo con su correo y contraseña, y cree un PIN nuevo.');return}
  if(!S.session)return;
  if(t.id==='uNuevo'){S.nuevoU={nombre:'',email:'',cel:'',rol:'promotor',clave:claveTemporal()};S.uAction=null;S.uClave=null;render();setTimeout(()=>$('#nu_nombre')?.focus(),30)}
  if(t.id==='uCancelar'||t.id==='uListo'){S.nuevoU=null;render()}
  if(t.id==='nuOtra'){leerNuevo();S.nuevoU.clave=claveTemporal();render()}
  if(t.id==='uCopiar'){const n=S.nuevoU;copiar(textoAcceso(n.nombre,n.email,n.clave))}
  if(t.id==='uWa'){const n=S.nuevoU;window.open(waLink(n.cel,textoAcceso(n.nombre,n.email,n.clave)),'_blank','noopener')}
  if(t.dataset.uclave){S.uClave={id:t.dataset.uclave,clave:claveTemporal()};S.uAction=null;S.nuevoU=null;render()}
  if(t.dataset.uclaveok){const clave=$('#ucClave').value.trim(),er=$('#ucErr');er.textContent='';if(clave.length<10||!/[A-Za-z]/.test(clave)||!/\d/.test(clave)){er.textContent='Al menos 10 caracteres, con letras y números.';return}
    t.disabled=true;t.innerHTML='<span class="spin"></span>';try{await llamarUsuarios({accion:'clave',user_id:t.dataset.uclaveok,clave});S.uClave={id:t.dataset.uclaveok,clave,listo:true};render();loadUsuarios()}catch(x){er.textContent=errMsg(x);t.disabled=false;t.textContent='Asignar'}}
  if(t.id==='ucCopiar'||t.id==='ucWa'){const u=S.usuarios.find(v=>v.user_id===S.uClave.id)||{},txt=textoAcceso(u.nombre||'',u.email||'',S.uClave.clave);if(t.id==='ucCopiar')copiar(txt);else window.open(waLink('',txt),'_blank','noopener')}
  if(t.dataset.ucancel!==undefined){S.uClave=null;render()}
  if(t.id==='practicaBtn'){S.practica=!S.practica;try{localStorage.setItem('cacih_practica',S.practica?'1':'0')}catch(x){}practicaUI();render();toast(S.practica?'Modo práctica activado: nada se envía a la oficina':'Modo práctica desactivado',4000)}
  if(t.dataset.urev){if(!t.dataset.sure){t.dataset.sure='1';t.textContent='¿Confirmar cierre?';setTimeout(()=>{t.textContent='Cerrar sesiones';delete t.dataset.sure},4000);return}
    t.disabled=true;const{error}=await sb.rpc('revocar_sesiones',{p_id:t.dataset.urev});if(error){toast(errMsg(error),5000);t.disabled=false;return}
    toast('Listo: la app se cerrará en sus teléfonos en cuanto tengan señal (máximo 2 minutos).',6000);t.textContent='Sesiones cerradas'}
  if(t.id==='prodAgregar'){S.prodEdit.push({nombre:'',tasa:'',tasaTipo:'Mensual',montoMin:'',montoMax:'',plazoMax:''});render()}
  if(t.dataset.prodquitar!==undefined){S.prodEdit.splice(+t.dataset.prodquitar,1);render()}
  if(t.id==='prodGuardar'){const l=S.prodEdit.map(p=>({nombre:String(p.nombre||'').trim(),tasa:num(p.tasa),tasaTipo:p.tasaTipo||'Mensual',montoMin:num(p.montoMin)||null,montoMax:num(p.montoMax)||null,plazoMax:Math.round(num(p.plazoMax))||null}));
    if(l.some(p=>!p.nombre||!(p.tasa>=0))){toast('Cada producto necesita nombre y tasa.');return}
    if(new Set(l.map(p=>p.nombre.toLowerCase())).size!==l.length){toast('Hay dos productos con el mismo nombre.');return}
    if(l.some(p=>p.montoMin&&p.montoMax&&p.montoMin>p.montoMax)){toast('El monto mínimo no puede ser mayor que el máximo.');return}
    t.disabled=true;const{error}=await sb.from('parametros').update({productos:l,actualizado_en:new Date().toISOString()}).eq('id',1);t.disabled=false;
    if(error){toast(errMsg(error));return}S.params.productos=l;S.prodEdit=null;try{localStorage.setItem('cacih_params',JSON.stringify(S.params))}catch(x){}render();toast('Productos guardados')}
});
document.addEventListener('input',e=>{const el=e.target;if(el.dataset.prod!==undefined&&S.prodEdit)S.prodEdit[+el.dataset.prod][el.dataset.pk]=el.value});
document.addEventListener('change',e=>{const el=e.target;if(el.dataset.prod!==undefined&&S.prodEdit&&el.tagName==='SELECT')S.prodEdit[+el.dataset.prod][el.dataset.pk]=el.value});

function leerNuevo(){const n=S.nuevoU;if(!n||n.listo)return;for(const k of['nombre','email','cel','rol','clave']){const el=$('#nu_'+k);if(el)n[k]=el.value.trim()}}
async function crearUsuario(){leerNuevo();const n=S.nuevoU,er=$('#nuErr'),b=$('#nuGo');er.textContent='';
  if(n.nombre.length<3){er.textContent='Escriba el nombre completo.';return}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n.email)){er.textContent='Revise el correo.';return}
  if(n.clave.length<10||!/[A-Za-z]/.test(n.clave)||!/\d/.test(n.clave)){er.textContent='La contraseña temporal debe tener al menos 10 caracteres, con letras y números.';return}
  b.disabled=true;b.innerHTML='<span class="spin"></span> Creando…';
  try{await llamarUsuarios({accion:'crear',nombre:n.nombre,email:n.email.toLowerCase(),rol:n.rol,clave:n.clave});n.listo=true;render();loadUsuarios();toast('Usuario creado y activo')}
  catch(x){er.textContent=errMsg(x);b.disabled=false;b.textContent='Crear y activar'}}

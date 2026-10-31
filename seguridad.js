/* =====================================================================
   CACIH · Seguridad y operación (v1.7)
   - Verificación en dos pasos (código de 6 dígitos) para Oficina y Administrador
   - PIN para abrir la app en el teléfono
   - Cierre de sesiones a distancia
   - Registro de errores, aviso de versión nueva, modo práctica
   - Productos de crédito y errores recientes en Parámetros
   ===================================================================== */

/* ---------- Verificación en dos pasos ---------- */
async function mfaGate(){
  S.mfa=null;
  if(!S.perfil?.activo||!['oficina','admin'].includes(S.perfil.rol))return false;
  try{
    const{data,error}=await sb.auth.mfa.getAuthenticatorAssuranceLevel();if(error)throw error;
    if(data.currentLevel==='aal2')return false;
    const{data:f,error:e2}=await sb.auth.mfa.listFactors();if(e2)throw e2;
    const ver=(f?.totp||[]).find(x=>x.status==='verified');
    S.mfa=ver?{modo:'reto',factorId:ver.id}:{modo:'alta'};
  }catch(e){S.mfa={modo:'sinred',error:errMsg(e)}}
  return true}
function vMfa(){const m=S.mfa;
  if(m.modo==='sinred')return `<div class="auth card"><h2>Verificación en dos pasos</h2><p class="lead">Se necesita conexión a internet para verificar su identidad.</p><p class="hint">${esc(m.error||'')}</p><div class="rowbtns"><button class="btn-primary" id="mfaReintentar">Reintentar</button></div></div>`;
  if(m.modo==='reto')return `<div class="auth card"><h2>Verificación en dos pasos</h2><p class="lead">Abra la app de autenticación de su teléfono (Google Authenticator o Microsoft Authenticator) y escriba el código de 6 dígitos de <b>CACIH</b>.</p>
    <form id="mfaForm"><div class="f"><label class="t" for="mfaCode">Código</label><input id="mfaCode" class="mono" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" style="font-size:24px;letter-spacing:.3em;text-align:center"></div><span class="err" id="mfaErr"></span><div class="rowbtns"><button class="btn-primary" type="submit" id="mfaGo">Verificar</button></div></form>
    <p class="hint" style="margin-top:16px">¿Perdió el teléfono con la app de códigos? Pida al administrador del sistema que le quite la verificación en Supabase (Authentication → Users → su usuario → borrar el factor MFA).</p></div>`;
  return `<div class="auth card"><h2>Active la verificación en dos pasos</h2><p class="lead">Su cuenta ve los documentos de identidad de todos los clientes. Además de la contraseña, pediremos un código que cambia cada 30 segundos.</p>
    <ol class="pasos"><li>Instale en su teléfono <b>Google Authenticator</b> o <b>Microsoft Authenticator</b> (gratis, en la tienda de apps).</li><li>Toque <b>Generar código QR</b> y escanéelo con esa app.</li><li>Escriba aquí el código de 6 dígitos que le muestra.</li></ol>
    ${m.qr?`<div style="text-align:center;margin:12px 0"><img src="${esc(m.qr)}" alt="Código QR para la app de autenticación" width="200" height="200" style="background:#fff;padding:8px;border-radius:8px"><p class="hint">¿No puede escanear? Escriba esta clave en la app: <span class="mono" style="word-break:break-all">${esc(m.secret)}</span></p></div>
    <form id="mfaForm"><div class="f"><label class="t" for="mfaCode">Código de 6 dígitos</label><input id="mfaCode" class="mono" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" style="font-size:24px;letter-spacing:.3em;text-align:center"></div><span class="err" id="mfaErr"></span><div class="rowbtns"><button class="btn-primary" type="submit" id="mfaGo">Activar</button></div></form>`
    :`<div class="rowbtns"><span class="err" id="mfaErr"></span><button class="btn-primary" id="mfaQr">Generar código QR</button></div>`}</div>`}
async function mfaAlta(btn){btn.disabled=true;btn.innerHTML='<span class="spin"></span>';
  try{const{data:f}=await sb.auth.mfa.listFactors();for(const x of(f?.all||[]).filter(x=>x.status!=='verified'))await sb.auth.mfa.unenroll({factorId:x.id});
    const{data,error}=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'CACIH '+new Date().toISOString().slice(0,16)});if(error)throw error;
    S.mfa={modo:'alta',factorId:data.id,qr:data.totp.qr_code,secret:data.totp.secret};render()}
  catch(e){const er=$('#mfaErr');if(er)er.textContent=errMsg(e);btn.disabled=false;btn.textContent='Generar código QR'}}
async function mfaVerificar(){const code=($('#mfaCode').value||'').replace(/\D/g,''),er=$('#mfaErr'),b=$('#mfaGo');er.textContent='';
  if(code.length!==6){er.textContent='Escriba los 6 dígitos.';return}
  b.disabled=true;b.innerHTML='<span class="spin"></span>';
  const{error}=await sb.auth.mfa.challengeAndVerify({factorId:S.mfa.factorId,code});
  if(error){er.textContent=/invalid|expired/i.test(error.message)?'Código incorrecto o vencido. Escriba el código que aparece ahora.':errMsg(error);b.disabled=false;b.textContent='Verificar';return}
  const{data:{session}}=await sb.auth.getSession();S.mfa=null;toast('Identidad verificada');await boot(session)}

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
function pinArranque(){if(!S.session||!S.perfil?.activo||S.mfa)return;pinPantalla(pinGuardado()?'pedir':'nuevo')}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){ocultoDesde=Date.now();return}
  if(ocultoDesde&&S.session&&S.perfil?.activo&&!S.mfa&&!pinBloqueado&&pinGuardado()&&Date.now()-ocultoDesde>PIN_MINUTOS*60000)pinPantalla('pedir');
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
  if(e.target.id==='mfaForm'){e.preventDefault();mfaVerificar()}
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
  if(t.id==='mfaQr')mfaAlta(t);
  if(t.id==='mfaReintentar'){await boot(S.session)}
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

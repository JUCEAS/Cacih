/* =====================================================================
   CACIH · Módulo de Solicitud de Crédito y Fiador Solidario (v1.5)
   Sigue los formatos en papel "Solicitud de crédito 2025" y
   "Datos del fiador solidario 2023". Usa el estado y utilidades de app.js.
   ===================================================================== */

/* ---------- utilidades de ruta ---------- */
const gp=(o,p)=>p.split('.').reduce((a,k)=>a==null?a:a[k],o);
const sp=(o,p,v)=>{const ks=p.split('.');let a=o;for(let i=0;i<ks.length-1;i++)a=a[ks[i]];a[ks.at(-1)]=v};
const pid=p=>'cp_'+p.replace(/\./g,'_');

/* ---------- textos de los formatos ---------- */
const CTXT={
  buro:n=>`Declaro que la información suministrada es verdadera y refleja fidedignamente mi situación actual socioeconómica; y libre y voluntariamente autorizo a la ${n||'Caja de Ahorro y Crédito Inversiones de Honduras'} (CACIH) para que previo, durante o posterior al otorgamiento del presente crédito, de manera directa o por interpósita persona pueda confirmar la veracidad de la información suministrada, al igual que los autorizo para que pueda consultar y suministrar en cualquier momento mi información personal y financiera que se estime conveniente, ante los diferentes burós de créditos y/o centrales de riesgo e información públicas o privadas que estime conveniente para suministrar, consultar, verificar, aprobar o denegar la presente solicitud.`,
  compromiso:deudor=>`En caso de incumplimiento del pago acordado por ${deudor||'________________'}, me comprometo a pagar de manera irrevocable e indivisible el saldo que adeude el deudor principal o en su defecto me someto a los procesos administrativos y legales que sean necesarios para que CACIH recupere el préstamo.`,
  emergencia:'En caso de fallecimiento o que pierdan la comunicación directa con mi persona, autorizo que se comuniquen con la persona indicada para que puedan obtener la información que requieran de mi persona.'};

const CIVIL=['Casado/a','Unión libre','Divorciado/a','Viudo/a','Soltero/a'];
const EDUC=['Ninguno','Primaria','Secundaria','Universitaria','Postgrado'];
const METODOS=['Cuota nivelada','Capital fijo'];
const GARANTIAS=['Fiduciaria (fiador solidario)','Prendaria','Hipotecaria','Ahorro o aportaciones','Sin garantía'];
const conFiador=c=>c.cond.garantia==='Fiduciaria (fiador solidario)';
const enPareja=x=>['Casado/a','Unión libre'].includes(x.civil);

/* ---------- borrador ---------- */
function personaBase(){return{n1:'',n2:'',a1:'',a2:'',conocido:'',clienteNo:'',lugarNac:'',nac:'',dni:'',rtn:'',educ:'',civil:'',
  conyuge:{n:'',tel:'',trabajo:'',sueldo:''},trabajo:'',sueldo:'',
  direccion:'',ciudad:'',barrio:'',municipio:'',depto:'Olancho',refUbic:'',email:'',cel1:'',cel2:'',vivienda:'',tiempoRes:'',propietario:{n:'',cel:''},
  patronos:[{nombre:'',tel:'',dir:'',cargo:'',ant:''},{nombre:'',tel:'',dir:'',cargo:'',ant:''}],
  remesas:'',remMonto:'',remFrec:'',remQuien:'',remTel:'',
  cuentas:'',cuentasList:[{inst:'',tipo:'',prom:''},{inst:'',tipo:'',prom:''},{inst:'',tipo:'',prom:''}],
  vehiculo:'',vehiculos:[{marca:'',tipo:'',placa:'',nombre:''},{marca:'',tipo:'',placa:'',nombre:''}],
  terrenos:'',terrenosDonde:'',otrosBienes:'',otrosDetalle:'',
  selfie:'',dni1:'',dni2:'',firma:'',declara:false,compromiso:false,dniConfirm:false}}
function cBlank(){return{client_id:uuid(),kind:'credito',oficina:'Oficina Principal, Juticalpa',asesor:S.perfil?.nombre||'',
  cond:{monto:'',plazo:'',producto:'',tasa:'',tasaTipo:'Mensual',forma:'Mensual',metodo:'Cuota nivelada',formaOtra:'',garantia:'',clasif:'',destino:'',comision:'',seguro:'',servicios:'',pendiente:'',otros:''},
  cli:{...personaBase(),lat:null,lng:null,gpsPrec:null,ingresosDesc:'',pagoFuente:'',ingMes:'',gastosMes:'',deudasMes:'',refs:[{n:'',p:'',tel:''},{n:'',p:'',tel:''}],emergencia:{n:'',donde:'',tel:''}},
  garantiaDesc:'',nFiadores:1,fiadores:[personaBase(),personaBase()],autorizaBuro:false,consent:false}}
function cCompletar(d){const b=cBlank();const m=(x,y)=>{for(const k in y){if(x[k]===undefined)x[k]=y[k];else if(y[k]&&typeof y[k]==='object'&&!Array.isArray(y[k])&&x[k]&&typeof x[k]==='object')m(x[k],y[k])}};m(d,b);return d}
let cSaveT;function cSave(){clearTimeout(cSaveT);cSaveT=setTimeout(()=>idb.set('cdraft',S.cdraft).catch(()=>{}),300)}

/* ---------- cálculos ---------- */
const num=v=>Number(String(v??'').replace(/,/g,''))||0;
function cuotaEst(monto,plazo,tasa,tasaTipo,forma,metodo){
  const P=num(monto),n0=num(plazo),t=num(tasa);if(!P||!n0)return 0;
  const rm=tasaTipo==='Anual'?t/100/12:t/100,quin=forma==='Quincenal',n=quin?n0*2:n0,r=quin?rm/2:rm;
  if(metodo===METODOS[1])return P/n+P*r;
  return r>0?P*r/(1-Math.pow(1+r,-n)):P/n}
const deducciones=c=>['comision','seguro','servicios','pendiente','otros'].reduce((s,k)=>s+num(c[k]),0);
const nombreDe=x=>[x.n1,x.n2,x.a1,x.a2].map(v=>String(v||'').trim()).filter(Boolean).join(' ');

/* ---------- pasos ---------- */
function cSteps(){const c=S.cdraft,st=[['cond','Condiciones del crédito'],['cli','Datos del cliente'],['loc','Localización'],['act','Actividades e ingresos'],['bienes','Cuentas y bienes'],['refs','Referencias'],['gar','Garantía']];
  if(conFiador(c))st.push(['fia','Fiador solidario']);st.push(['docs','Documentos y firmas'],['aut','Autorización'],['rev','Revisar y enviar']);return st}

/* ---------- validación ---------- */
const t8=v=>/^\d{4}-?\d{4}$/.test(v||'');
function cValidPersona(x,e,pre,esFiador){
  if(!x.n1.trim()||!x.a1.trim())e[pre+'nom']='Escriba al menos el primer nombre y el primer apellido.';
  if(!/^\d{13}$/.test(x.dni))e[pre+'dni']='El número de identidad debe tener 13 dígitos.';
  else{const r=dniRevisar(x.dni,x.nac);if(r&&(r.bloquea||!x.dniConfirm))e[pre+'dni']=r.msg}
  if(!x.nac)e[pre+'nac']='Indique la fecha de nacimiento.';else{const a=edad(x.nac);if(a<18||a>100)e[pre+'nac']='La persona debe ser mayor de edad.'}
  if(!x.lugarNac.trim())e[pre+'lugarNac']='Indique el lugar de nacimiento.';
  if(!x.civil)e[pre+'civil']='Seleccione el estado civil.';
  if(enPareja(x)&&!x.conyuge.n.trim())e[pre+'conyuge']='Escriba el nombre del cónyuge.';
  if(esFiador){
    if(!x.direccion.trim()||!x.municipio.trim())e[pre+'dir']='Indique dirección y municipio.';
    if(!t8(x.cel1))e[pre+'cel1']='Celular de 8 dígitos.';
    if(!x.vivienda)e[pre+'vivienda']='Seleccione una opción.';
    if(!x.patronos[0].nombre.trim())e[pre+'pat']='Indique el negocio o patrono principal.';
    for(const k of['remesas','cuentas','terrenos','vehiculo'])if(!x[k])e[pre+k]='Responda Sí o No.';
  }}
function cValidate(key){
  const c=S.cdraft,x=c.cli,e={};
  if(key==='cond'){const k=c.cond;
    const pr=cProducto();if((S.params.productos||[]).length&&!pr)e.producto='Seleccione el producto de crédito.';
    if(!(num(k.monto)>0))e.monto='Indique el monto solicitado.';
    else if(pr&&num(pr.montoMax)>0&&num(k.monto)>num(pr.montoMax))e.monto=`El máximo para ${pr.nombre} es ${L(pr.montoMax)}.`;
    else if(pr&&num(pr.montoMin)>0&&num(k.monto)<num(pr.montoMin))e.monto=`El mínimo para ${pr.nombre} es ${L(pr.montoMin)}.`;
    if(pr&&num(pr.plazoMax)>0&&num(k.plazo)>num(pr.plazoMax))e.plazo=`El plazo máximo para ${pr.nombre} es ${pr.plazoMax} meses.`;
    if(!(num(k.plazo)>0)||num(k.plazo)>360)e.plazo='Indique el plazo en meses (1 a 360).';
    if(k.tasa!==''&&!(num(k.tasa)>=0))e.tasa='Revise la tasa.';
    if(!k.forma)e.forma='Seleccione la forma de pago.';else if(k.forma==='Otra'&&!k.formaOtra.trim())e.formaOtra='Indique cuál.';
    if(!k.garantia)e.garantia='Seleccione el tipo de garantía.';
    if(!k.destino.trim())e.destino='Indique el destino del crédito.';
    if(deducciones(k)>num(k.monto))e.deduc='Las deducciones no pueden superar el monto.';}
  if(key==='cli')cValidPersona(x,e,'',false);
  if(key==='loc'){
    if(!x.municipio.trim())e.municipio='Indique el municipio.';
    if(!x.barrio.trim())e.barrio='Indique el barrio o colonia.';
    if(!x.refUbic.trim())e.refUbic='Describa cómo llegar a la vivienda.';
    if(!t8(x.cel1))e.cel1='Celular de 8 dígitos (ej. 9876-5432).';
    if(!x.vivienda)e.vivienda='Seleccione una opción.';
    if(!String(x.tiempoRes).trim())e.tiempoRes='Indique el tiempo de residir.';
    if(x.vivienda&&x.vivienda!=='Casa propia'&&!x.propietario.n.trim())e.propietario='Indique el propietario de la vivienda.';}
  if(key==='act'){
    if(!x.patronos[0].nombre.trim())e.pat='Indique el negocio o patrono principal.';
    if(!x.remesas)e.remesas='Responda Sí o No.';else if(x.remesas==='Sí'&&(!(num(x.remMonto)>0)||!x.remFrec||!x.remQuien.trim()))e.remDet='Complete monto, frecuencia y quién envía.';
    if(!x.ingresosDesc.trim())e.ingresosDesc='Describa los ingresos y actividades.';
    if(!x.pagoFuente.trim())e.pagoFuente='Indique de dónde pagará el crédito.';
    if(!(num(x.ingMes)>0))e.ingMes='Indique el ingreso mensual del hogar.';
    if(String(x.gastosMes).trim()===''||num(x.gastosMes)<0)e.gastosMes='Indique los gastos mensuales (0 si no tiene).';
    if(num(x.deudasMes)<0)e.deudasMes='Revise el valor.';}
  if(key==='bienes'){
    for(const k of['cuentas','vehiculo','otrosBienes'])if(!x[k])e[k]='Responda Sí o No.';
    if(x.cuentas==='Sí'&&!x.cuentasList[0].inst.trim())e.cuentasList='Indique al menos una institución.';
    if(x.vehiculo==='Sí'&&(!x.vehiculos[0].marca.trim()||!x.vehiculos[0].placa.trim()))e.vehiculos='Indique marca y placa del vehículo.';
    if(x.otrosBienes==='Sí'&&!x.otrosDetalle.trim())e.otrosDetalle='Detalle los otros bienes.';}
  if(key==='refs'){
    x.refs.forEach((r,i)=>{if(!r.n.trim()||!r.p.trim()||!t8(r.tel))e['ref'+i]='Complete nombre, parentesco y teléfono de 8 dígitos.'});
    const m=x.emergencia;if(!m.n.trim()||!m.donde.trim()||!t8(m.tel))e.emergencia='Complete el contacto: nombre, dónde vive y teléfono.';}
  if(key==='gar'){
    if(c.cond.garantia!=='Sin garantía'&&!c.garantiaDesc.trim())e.garantiaDesc='Describa la garantía.';}
  if(key==='fia'){
    for(let i=0;i<c.nFiadores;i++){const f=c.fiadores[i];cValidPersona(f,e,`f${i}_`,true);if(f.dni&&f.dni===x.dni)e[`f${i}_dni`]='El fiador no puede ser el mismo solicitante.'}
    if(c.nFiadores===2&&c.fiadores[0].dni&&c.fiadores[0].dni===c.fiadores[1].dni)e.f1_dni='Los dos fiadores tienen el mismo número de identidad.';}
  if(key==='docs'){
    if(!x.selfie)e.selfie='Tome una foto del rostro del solicitante.';
    if(!x.dni1)e.dni1='Agregue la foto del frente de la identidad.';
    if(!x.firma)e.firma='Falta la firma y huella del solicitante.';
    if(conFiador(c))for(let i=0;i<c.nFiadores;i++){const f=c.fiadores[i];if(!f.dni1)e[`f${i}_dni1`]='Agregue la identidad del fiador.';if(!f.firma)e[`f${i}_firma`]='Falta la firma del fiador.'}}
  if(key==='aut'){
    if(!c.autorizaBuro)e.autorizaBuro='El solicitante debe aceptar la autorización.';
    if(!c.consent)e.consent='Sin la autorización de datos no se puede registrar la solicitud.';
    if(conFiador(c))for(let i=0;i<c.nFiadores;i++){const f=c.fiadores[i];if(!f.declara||!f.compromiso)e[`f${i}_acepta`]='El fiador debe aceptar la declaración y el compromiso de pago.'}}
  return e}
const cFirstInvalid=()=>{const st=cSteps();for(let i=0;i<st.length-1;i++)if(Object.keys(cValidate(st[i][0])).length)return i;return -1};

/* ---------- constructores de campos ---------- */
const cErr=k=>S.cerrors[k]?`<span class="err">${esc(S.cerrors[k])}</span>`:'';
function cI(p,label,o={}){const v=gp(S.cdraft,p)??'';return `<div class="f ${o.full?'full':''}"><label class="t" for="${pid(p)}">${label}${o.req?' <i>*</i>':''}</label><input id="${pid(p)}" data-cp="${p}" ${o.fmt?`data-fmt="${o.fmt}"`:''} type="${o.type||'text'}" class="${o.mono?'mono':''}" value="${esc(v)}" ${o.ph?`placeholder="${esc(o.ph)}"`:''} ${o.mode?`inputmode="${o.mode}"`:''} ${o.max?`maxlength="${o.max}"`:''} ${o.rr?'data-rr="1"':''} autocomplete="off">${o.hint?`<span class="hint">${o.hint}</span>`:''}${o.err?cErr(o.err):''}</div>`}
function cT(p,label,o={}){const v=gp(S.cdraft,p)??'';return `<div class="f full"><label class="t" for="${pid(p)}">${label}${o.req?' <i>*</i>':''}</label><textarea id="${pid(p)}" data-cp="${p}" rows="${o.rows||3}" ${o.ph?`placeholder="${esc(o.ph)}"`:''}>${esc(v)}</textarea>${o.err?cErr(o.err):''}</div>`}
function cC(p,label,opts,o={}){const v=gp(S.cdraft,p);return `<div class="f ${o.full===false?'':'full'}"><span class="t">${label}${o.req?' <i>*</i>':''}</span><div class="chips" role="radiogroup" aria-label="${esc(label)}">${opts.map((x,i)=>`<label><input type="radio" name="${pid(p)}" id="${pid(p)}_${i}" data-cp="${p}" ${o.rr?'data-rr="1"':''} value="${esc(x)}" ${v===x?'checked':''}>${esc(x)}</label>`).join('')}</div>${o.err?cErr(o.err):''}</div>`}
function cS(p,label,opts,o={}){const v=gp(S.cdraft,p);return `<div class="f ${o.full?'full':''}"><label class="t" for="${pid(p)}">${label}${o.req?' <i>*</i>':''}</label><select id="${pid(p)}" data-cp="${p}"><option value=""></option>${opts.map(x=>`<option ${v===x?'selected':''}>${esc(x)}</option>`).join('')}</select>${o.err?cErr(o.err):''}</div>`}
const cH=t=>`<div class="f full"><h3 style="margin-top:8px">${t}</h3></div>`;
const cSiNo=(p,label,o={})=>cC(p,label,['Sí','No'],{req:1,rr:1,err:o.err||p.split('.').pop()});

/* ---------- bloques reutilizables (cliente y fiador) ---------- */
function bIdent(base,pre,esFiador){const x=gp(S.cdraft,base),a=edad(x.nac);return `
  ${cI(base+'.n1','1er nombre',{req:1})}${cI(base+'.n2','2do nombre')}${cI(base+'.a1','1er apellido',{req:1})}${cI(base+'.a2','2do apellido')}<div class="f full">${cErr(pre+'nom')}</div>
  ${cI(base+'.conocido','Conocido como',{ph:'Opcional'})}${cI(base+'.clienteNo','N° de cliente',{mono:1,ph:'Si ya es socio/a'})}
  ${cI(base+'.lugarNac','Lugar de nacimiento',{req:1,err:pre+'lugarNac'})}${cI(base+'.nac','Fecha de nacimiento',{req:1,type:'date',rr:1,hint:a!=null&&a>=0?`Edad: ${a} años`:'',err:pre+'nac'})}
  ${cI(base+'.dni','N° de identidad',{req:1,mono:1,mode:'numeric',max:13,fmt:'dni',ph:'0000000000000',err:pre+'dni'})}<div class="f full" id="dck_${pid(base)}" style="margin:0">${dniCasilla(x.dni,x.nac,`data-cpk="${base}.dniConfirm"`,x.dniConfirm)}</div>${cI(base+'.rtn','RTN',{mono:1,mode:'numeric',max:14,fmt:'dig',ph:'Opcional'})}
  ${cS(base+'.educ','Nivel educativo',EDUC)}
  ${cC(base+'.civil','Estado civil',CIVIL,{req:1,rr:1,err:pre+'civil'})}
  ${enPareja(x)?`${cI(base+'.conyuge.n','Nombre del cónyuge',{req:1,err:pre+'conyuge'})}${cI(base+'.conyuge.tel','Tel/cel del cónyuge',{mono:1,mode:'tel',max:9,fmt:'tel'})}${esFiador?'':cI(base+'.conyuge.trabajo','Fuente de trabajo del cónyuge')+cI(base+'.conyuge.sueldo','Sueldo del cónyuge (L)',{type:'number',mode:'decimal'})}`:''}
  ${esFiador?cI(base+'.trabajo','Fuente de trabajo')+cI(base+'.sueldo','Sueldo (L)',{type:'number',mode:'decimal'}):''}`}
function bLoc(base,pre,esFiador){const x=gp(S.cdraft,base);return `
  ${esFiador?cI(base+'.direccion','Dirección de residencia',{req:1,full:1,err:pre+'dir'})+cI(base+'.ciudad','Ciudad'):''}
  ${cI(base+'.municipio','Municipio',{req:1,err:esFiador?'':'municipio'})}${esFiador?`<div class="f"><label class="t" for="${pid(base+'.depto')}">Departamento</label><select id="${pid(base+'.depto')}" data-cp="${base}.depto">${DEPTOS.map(d=>`<option ${x.depto===d?'selected':''}>${d}</option>`).join('')}</select></div>`:cI(base+'.barrio','Barrio o colonia',{req:1,err:'barrio'})+cI(base+'.refUbic','Referencia de ubicación',{req:1,full:1,ph:'Cómo llegar: puntos de referencia, color de casa',err:'refUbic'})}
  ${cI(base+'.email','E-mail',{type:'email',ph:'Opcional'})}${cI(base+'.cel1','Tel/cel 1',{req:1,mono:1,mode:'tel',max:9,fmt:'tel',ph:'9876-5432',err:esFiador?pre+'cel1':'cel1'})}${cI(base+'.cel2','Tel/cel 2',{mono:1,mode:'tel',max:9,fmt:'tel'})}
  ${cC(base+'.vivienda','El lugar donde vive es',['Casa propia','De familiar','Alquila'],{req:1,rr:1,err:esFiador?pre+'vivienda':'vivienda'})}${cI(base+'.tiempoRes','Tiempo de residir (meses)',{req:!esFiador,type:'number',mode:'numeric',err:esFiador?'':'tiempoRes'})}
  ${x.vivienda&&x.vivienda!=='Casa propia'?cI(base+'.propietario.n','Nombre del propietario de la vivienda',{req:!esFiador,err:esFiador?'':'propietario'})+cI(base+'.propietario.cel','Cel. del propietario',{mono:1,mode:'tel',max:9,fmt:'tel'}):''}`}
function bPatronos(base,pre,esFiador){return [0,1].map(i=>`${cH(`Negocio o patrono ${i+1}${i?' (opcional)':''}`)}${cI(`${base}.patronos.${i}.nombre`,'Nombre del negocio o patrono',{req:!i})}${cI(`${base}.patronos.${i}.tel`,'Tel',{mono:1,mode:'tel',max:9,fmt:'tel'})}${cI(`${base}.patronos.${i}.dir`,'Dirección',{full:1})}${cI(`${base}.patronos.${i}.cargo`,'Cargo')}${cI(`${base}.patronos.${i}.ant`,'Antigüedad (meses)',{type:'number',mode:'numeric'})}${i?'':`<div class="f full">${cErr(pre+'pat')}</div>`}`).join('')}
function bRemesas(base,pre){const x=gp(S.cdraft,base);return `${cSiNo(base+'.remesas','¿Recibe remesas familiares?',{err:pre+'remesas'})}${x.remesas==='Sí'?cI(base+'.remMonto','Monto promedio (L)',{req:1,type:'number',mode:'decimal'})+cS(base+'.remFrec','Frecuencia',['Mensual','Bimestral','Trimestral','Ocasional'],{req:1})+cI(base+'.remQuien','Nombre de quien le envía',{req:1})+cI(base+'.remTel','Teléfono de quien envía',{mono:1})+`<div class="f full">${cErr('remDet')}</div>`:''}`}
function bCuentas(base,pre,esFiador){const x=gp(S.cdraft,base);return `${cSiNo(base+'.cuentas',`¿${esFiador?'El fiador solidario':'El solicitante'} posee cuentas bancarias o en cooperativas?`,{err:pre+'cuentas'})}${x.cuentas==='Sí'?x.cuentasList.map((r,i)=>cI(`${base}.cuentasList.${i}.inst`,`Institución ${i+1}`,{req:!i})+cS(`${base}.cuentasList.${i}.tipo`,'Tipo de cuenta',['Ahorro','Cheques','Plazo fijo','Aportaciones'])+(esFiador?cI(`${base}.cuentasList.${i}.prom`,'Promedio de ahorro (L)',{type:'number',mode:'decimal'}):'')).join('')+`<div class="f full">${cErr('cuentasList')}</div>`:''}`}
function bVehiculos(base,pre){const x=gp(S.cdraft,base);return `${cSiNo(base+'.vehiculo','¿Posee vehículo a su nombre y/o de su cónyuge?',{err:pre+'vehiculo'})}${x.vehiculo==='Sí'?x.vehiculos.map((r,i)=>cI(`${base}.vehiculos.${i}.marca`,`Vehículo ${i+1} · marca`,{req:!i})+cI(`${base}.vehiculos.${i}.tipo`,'Tipo')+cI(`${base}.vehiculos.${i}.placa`,'N° de placa',{req:!i,mono:1})+cI(`${base}.vehiculos.${i}.nombre`,'A nombre de quién está')).join('')+`<div class="f full">${cErr('vehiculos')}</div>`:''}`}

/* ---------- vistas del formulario ---------- */
function cFoto(p,label,o={}){const v=gp(S.cdraft,p);return `<div class="f ${o.full?'full':''}"><label class="t" for="${pid(p)}">${label}${o.req?' <i>*</i>':''}</label><div class="photo"><input id="${pid(p)}" type="file" accept="image/*" capture="${o.user?'user':'environment'}" data-cphoto="${p}">${v?`<img src="${v}" alt="${esc(label)}">`:''}</div>${o.err?cErr(o.err):''}</div>`}
function cFirma(p,label,o={}){const v=gp(S.cdraft,p);return `<div class="f full"><span class="t">${label} <i>*</i></span><canvas class="sig" data-csig="${p}" aria-label="${esc(label)}"></canvas><div class="rowbtns" style="margin-top:6px"><span class="hint" data-csighint="${p}">${v?'Firma guardada.':'Firme con el dedo dentro del recuadro.'}</span><button class="btn-sm" data-cclr="${p}">Borrar firma</button></div>${o.err?cErr(o.err):''}</div>`}

function vCredito(){
  if(S.cbusy)return `<div class="card empty"><span class="spin"></span> Enviando solicitud de crédito y documentos…</div>`;
  if(S.csent){const s=S.csent;return `<div class="card" style="text-align:center;padding:32px 20px"><h1>${s.practica?'Práctica terminada':s.online?'Solicitud de crédito enviada':'Guardada para enviar'}</h1><p class="lead">${s.practica?'Modo práctica: no se envió a la oficina.':s.online?'El comité de crédito ya la recibió como pendiente.':s.error?'No se pudo enviar: '+esc(s.error)+' Quedó en la cola.':'No hay señal. Se enviará sola cuando haya conexión.'}</p>${s.folio?`<p class="mono" style="font-size:24px;color:var(--accent-2);margin:12px 0">${esc(s.folio)}</p>`:''}<p class="hint">${esc(s.nombre)} · ${L(s.monto)}</p><div class="rowbtns" style="justify-content:center"><button class="btn-primary" id="crNew">Nueva solicitud de crédito</button><button id="crGoEnvios">Ver mis envíos</button></div></div>`}
  const c=S.cdraft,st=cSteps();if(S.cstep>=st.length)S.cstep=st.length-1;
  const key=st[S.cstep][0],k=c.cond,x=c.cli;let body='';
  if(key==='cond'){const cu=cuotaEst(k.monto,k.plazo,k.tasa,k.tasaTipo,k.forma,k.metodo),neto=num(k.monto)-deducciones(k);body=`<div class="grid">
    ${cI('oficina','Oficina que gestiona el crédito')}${cI('asesor','Asesor')}
    ${(S.params.productos||[]).length?`<div class="f full"><label class="t" for="crProd">Producto de crédito <i>*</i></label><select id="crProd" data-cprod="1"><option value=""></option>${S.params.productos.map(p=>`<option ${k.producto===p.nombre?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select>${cProducto()?`<span class="hint">${esc(prodResumen(cProducto()))}</span>`:''}${cErr('producto')}</div>`:''}
    ${cI('cond.monto','Monto solicitado (L)',{req:1,type:'number',mode:'decimal',rr:1,err:'monto'})}${cI('cond.plazo','Plazo (meses)',{req:1,type:'number',mode:'numeric',rr:1,err:'plazo'})}
    ${cProducto()?`<div class="f"><span class="t">Tasa (%)</span><b style="padding:10px 0">${esc(k.tasa)} % ${esc(k.tasaTipo.toLowerCase())}</b><span class="hint">Fijada por el producto</span></div>`:cI('cond.tasa','Tasa (%)',{type:'number',mode:'decimal',rr:1,ph:'Si ya se conoce',err:'tasa'})}${cProducto()?'':cC('cond.tasaTipo','La tasa es',['Mensual','Anual'],{rr:1,full:false})}
    ${cC('cond.forma','Forma de pago',['Mensual','Quincenal','Otra'],{req:1,rr:1,err:'forma'})}${k.forma==='Otra'?cI('cond.formaOtra','¿Cuál?',{req:1,err:'formaOtra'}):''}${cC('cond.metodo','Método de cálculo',METODOS,{rr:1})}
    ${cC('cond.garantia','Garantía',GARANTIAS,{req:1,rr:1,err:'garantia'})}
    ${cS('cond.clasif','Clasificación de crédito',['Consumo','Comercial','Agropecuario','Vivienda','Microcrédito'])}${cI('cond.destino','Destino del crédito',{req:1,full:1,ph:'Ej. compra de insumos para siembra de maíz',err:'destino'})}
    ${cH('Estimación de deducciones aplicables (L)')}${cI('cond.comision','Comisión',{type:'number',mode:'decimal',rr:1})}${cI('cond.seguro','Seguro',{type:'number',mode:'decimal',rr:1})}${cI('cond.servicios','Servicios',{type:'number',mode:'decimal',rr:1})}${cI('cond.pendiente','Préstamo pendiente',{type:'number',mode:'decimal',rr:1})}${cI('cond.otros','Otros cargos',{type:'number',mode:'decimal',rr:1})}
    <div class="f full note">Cuota estimada: <b class="num">${cu?L(cu):'— (indique tasa y plazo)'}</b> ${k.forma==='Quincenal'?'quincenal':'mensual'} · Valor estimado a recibir: <b class="num">${L(neto)}</b>${k.metodo===METODOS[1]?' · <span class="hint">con capital fijo la primera cuota es la más alta y baja cada mes</span>':''}${cErr('deduc')}<div style="margin-top:8px"><button class="btn-sm" id="crVerPlan" ${cu?'':'disabled'}>Ver tabla de pagos</button></div></div></div>`}
  if(key==='cli')body=`<div class="grid">${bIdent('cli','',false)}</div>`;
  if(key==='loc')body=`<div class="grid">${bLoc('cli','',false)}<div class="f full"><span class="t">GPS de la vivienda</span><div class="rowbtns" style="margin-top:0;justify-content:flex-start"><button id="crGps" class="${x.lat==null?'btn-primary':''}">${x.lat==null?'Guardar ubicación':'Actualizar ubicación'}</button><span class="hint">${x.lat!=null?`Guardada: ${Number(x.lat).toFixed(5)}, ${Number(x.lng).toFixed(5)} · precisión ${Math.round(x.gpsPrec||0)} m`:'Tóquelo estando en la casa del solicitante.'}</span></div></div></div>`;
  if(key==='act')body=`<div class="grid">${bPatronos('cli','',false)}${cH('Remesas')}${bRemesas('cli','')}${cT('cli.ingresosDesc','Descripción general de los ingresos y actividades desarrolladas por el cliente',{req:1,rows:4,err:'ingresosDesc'})}${cT('cli.pagoFuente','¿De dónde pretende pagar el cliente?',{req:1,err:'pagoFuente'})}${cH('Capacidad de pago (mensual)')}${cI('cli.ingMes','Ingresos del hogar (L)',{req:1,type:'number',mode:'decimal',rr:1,err:'ingMes',hint:'Negocio, sueldo, remesas y otros'})}${cI('cli.gastosMes','Gastos del hogar (L)',{req:1,type:'number',mode:'decimal',rr:1,err:'gastosMes',hint:'Comida, servicios, alquiler, estudio'})}${cI('cli.deudasMes','Cuotas de otras deudas (L)',{type:'number',mode:'decimal',rr:1,err:'deudasMes',ph:'0'})}<div class="f full" id="capPago">${vCapacidad(c)}</div></div>`;
  if(key==='bienes')body=`<div class="grid">${bCuentas('cli','',false)}${bVehiculos('cli','')}${cSiNo('cli.otrosBienes','¿El cliente posee otros bienes?',{err:'otrosBienes'})}${x.otrosBienes==='Sí'?cT('cli.otrosDetalle','Detalle de los otros bienes',{req:1,err:'otrosDetalle'}):''}</div>`;
  if(key==='refs')body=`<div class="grid">${x.refs.map((r,i)=>`${cH(i?'Referencia familiar':'Referencia personal o familiar')}${cI(`cli.refs.${i}.n`,'Nombre',{req:1})}${cI(`cli.refs.${i}.p`,'Parentesco',{req:1})}${cI(`cli.refs.${i}.tel`,'Tel/cel',{req:1,mono:1,mode:'tel',max:9,fmt:'tel'})}<div class="f full">${cErr('ref'+i)}</div>`).join('')}
    ${cH('Contacto en caso de fallecimiento o pérdida de comunicación')}<p class="legal" style="grid-column:1/-1">${CTXT.emergencia}</p>${cI('cli.emergencia.n','Nombre',{req:1})}${cI('cli.emergencia.donde','Dónde vive',{req:1})}${cI('cli.emergencia.tel','Número de teléfono',{req:1,mono:1,mode:'tel',max:9,fmt:'tel'})}<div class="f full">${cErr('emergencia')}</div></div>`;
  if(key==='gar')body=`<div class="grid"><div class="f full note">Garantía elegida: <b>${esc(k.garantia||'—')}</b>. Se cambia en el paso 1.</div>${k.garantia!=='Sin garantía'?cT('garantiaDesc','Datos de la garantía',{req:1,rows:4,ph:conFiador(c)?'Ej. fiador solidario con empleo fijo':'Ej. motocicleta Honda 2021, placa…; escritura de terreno de 2 manzanas…',err:'garantiaDesc'}):''}${conFiador(c)?cC('nFiadores','Número de fiadores solidarios',['1','2'],{req:1,rr:1}).replace(/value="(\d)"([^>]*?)(checked)?>/g,(m,n,r)=>`value="${n}"${r.replace(/ checked/,'')}${String(c.nFiadores)===n?' checked':''}>`):''}</div>`;
  if(key==='fia')body=[...Array(c.nFiadores).keys()].map(i=>{const b='fiadores.'+i,pre=`f${i}_`;return `<div class="card" style="margin-bottom:14px;padding:16px"><h2 style="margin-bottom:10px">Fiador solidario ${c.nFiadores>1?i+1:''}</h2><div class="grid">${bIdent(b,pre,true)}${cH('Localización')}${bLoc(b,pre,true)}${cH('Actividades laborales y/o comerciales')}${bPatronos(b,pre,true)}${bRemesas(b,pre)}${cH('Cuentas y bienes')}${bCuentas(b,pre,true)}${cSiNo(b+'.terrenos','¿Posee terrenos?',{err:pre+'terrenos'})}${gp(c,b).terrenos==='Sí'?cI(b+'.terrenosDonde','¿Dónde?',{full:1}):''}${bVehiculos(b,pre)}</div></div>`}).join('');
  if(key==='docs')body=`<div class="grid">${cH('Solicitante')}${cFoto('cli.selfie','Foto del rostro',{req:1,user:1,full:1,err:'selfie'})}${cFoto('cli.dni1','Identidad · frente',{req:1,err:'dni1'})}${cFoto('cli.dni2','Identidad · reverso')}${cFirma('cli.firma','Firma y huella del solicitante',{err:'firma'})}
    ${conFiador(c)?[...Array(c.nFiadores).keys()].map(i=>`${cH('Fiador solidario '+(c.nFiadores>1?i+1:''))}${cFoto(`fiadores.${i}.selfie`,'Foto del rostro',{user:1})}${cFoto(`fiadores.${i}.dni1`,'Identidad · frente',{req:1,err:`f${i}_dni1`})}${cFirma(`fiadores.${i}.firma`,'Firma del fiador solidario',{err:`f${i}_firma`})}`).join(''):''}</div>`;
  if(key==='aut'){const n=S.params.nombre_legal,deudor=nombreDe(x);body=`<p class="hint" style="margin-top:0">Lea cada texto a la persona antes de marcarlo.</p><h3>Autorización del solicitante</h3><p class="legal">${CTXT.buro(n)}</p><label class="check" for="crBuro"><input type="checkbox" id="crBuro" data-cpk="autorizaBuro" ${c.autorizaBuro?'checked':''}><span><b>${esc(deudor||'El solicitante')}</b> acepta y autoriza.</span></label>${cErr('autorizaBuro')}
    ${conFiador(c)?[...Array(c.nFiadores).keys()].map(i=>{const f=c.fiadores[i];return `<h3 style="margin-top:18px">Fiador solidario ${c.nFiadores>1?i+1:''}: ${esc(nombreDe(f))}</h3><p class="legal">${CTXT.buro(n)}</p><label class="check"><input type="checkbox" data-cpk="fiadores.${i}.declara" ${f.declara?'checked':''}><span>Acepta la declaración y autoriza la consulta.</span></label><p class="legal">${CTXT.compromiso(deudor)}</p><label class="check"><input type="checkbox" data-cpk="fiadores.${i}.compromiso" ${f.compromiso?'checked':''}><span>Acepta el compromiso de pago como fiador solidario.</span></label>${cErr(`f${i}_acepta`)}`}).join(''):''}
    <h3 style="margin-top:18px">Autorización de uso de datos</h3><p class="hint">CACIH guarda estos datos solo para evaluar y administrar el crédito. No los vende ni los comparte, salvo obligación legal o ante burós de crédito según la autorización anterior.</p><label class="check"><input type="checkbox" data-cpk="consent" ${c.consent?'checked':''}><span><b>Acepto</b> el uso de los datos en estos términos.</span></label>${cErr('consent')}`}
  if(key==='rev'){const bad=cFirstInvalid(),cu=cuotaEst(k.monto,k.plazo,k.tasa,k.tasaTipo,k.forma,k.metodo);body=`${bad>=0?`<div class="warnnote">Falta completar el paso ${bad+1} · ${st[bad][1]}. <button id="crGoBad" class="btn-sm" style="margin-left:8px">Ir</button></div>`:''}<table class="plain" style="margin-top:10px">${[['Solicitante',nombreDe(x)],['Identidad',fmtDni(x.dni)],['Monto · plazo',L(k.monto)+' · '+k.plazo+' meses'],['Cuota estimada',cu?L(cu)+' '+(k.forma==='Quincenal'?'quincenal':'mensual'):'—'],['Destino',k.destino],['Garantía',k.garantia+(conFiador(c)?' · '+c.fiadores.slice(0,c.nFiadores).map(nombreDe).join(', '):'')],['Disponible para la cuota',(()=>{const c=capacidad(x,cu,k.forma);return c.disponible!=null?L(c.disponible)+(c.relacion!=null?' · la cuota es el '+c.relacion+' %':''):'—'})()],['Celular',x.cel1],['Referencias',x.refs.map(r=>r.n).filter(Boolean).join(', ')]].map(r=>`<tr><td style="color:var(--muted);width:38%">${r[0]}</td><td>${esc(r[1])}</td></tr>`).join('')}</table><p class="hint">Asesor: ${esc(c.asesor||S.perfil.nombre)}${navigator.onLine?'':' · sin señal: se guardará y enviará después'}</p>`}
  return `<h1>Solicitud de crédito</h1><p class="lead">Formato CACIH. El borrador se guarda solo en este teléfono.${S.practica?' <button class="btn-sm" id="crEjemplo">Llenar con un ejemplo</button>':''}</p>
  ${progreso(S.cstep,st.length)}
  <div class="steps">${st.map((s,i)=>`<button data-cgo="${i}" class="${i===S.cstep?'cur':''} ${i<S.cstep?'done':''}"><span class="l">${i+1}</span>${s[1]}</button>`).join('')}</div>
  <div class="card"><h2 style="margin-bottom:14px"><span class="hint" style="font-family:var(--f-body);font-weight:600">Paso ${S.cstep+1} de ${st.length} · </span>${st[S.cstep][1]}</h2>${body}
  <div class="rowbtns navfija"><button id="crPrev" ${S.cstep===0?'disabled':''}>Atrás</button>${key!=='rev'?`<button class="btn-primary" id="crNext">Siguiente</button>`:`<button class="btn-primary" id="crSend" ${cFirstInvalid()>=0?'disabled':''}>${navigator.onLine?'Enviar al comité':'Guardar para enviar'}</button>`}</div></div>
  <p style="margin-top:14px"><button id="crReset" class="btn-bad btn-sm">Descartar borrador</button></p>`}

/* ---------- envío ---------- */
function cLimpio(x){const o=JSON.parse(JSON.stringify(x));for(const k of['selfie','dni1','dni2','firma'])delete o[k];return o}
function cRow(d,paths){const k=d.cond,x=d.cli,cu=cuotaEst(k.monto,k.plazo,k.tasa,k.tasaTipo,k.forma,k.metodo),cap=capacidad(x,cu,k.forma);
  return{client_id:d.client_id,promotor_nombre:S.perfil.nombre||S.session.user.email,
    nombres:[x.n1,x.n2].map(s=>s.trim()).filter(Boolean).join(' '),apellidos:[x.a1,x.a2].map(s=>s.trim()).filter(Boolean).join(' '),dni:x.dni,cliente_no:x.clienteNo.trim()||null,
    monto_solicitado:num(k.monto),plazo_meses:num(k.plazo),
    datos:{capacidad:cap,oficina:d.oficina,asesor:d.asesor||S.perfil.nombre,cond:{...k,cuota:Math.round(cu*100)/100,deducciones:deducciones(k),valorRecibir:num(k.monto)-deducciones(k)},cli:cLimpio(x),garantiaDesc:d.garantiaDesc},
    fiadores:conFiador(d)?d.fiadores.slice(0,d.nFiadores).map((f,i)=>({...cLimpio(f),docs:paths['f'+i]||{}})):[],
    documentos:paths.cli||{},autoriza_buro:!!d.autorizaBuro,consentimiento_datos:!!d.consent}}
async function cUpload(item){
  const d=item.d,base=S.session.user.id+'/'+d.client_id+'/',paths={cli:{}};
  const sube=async(dataUrl,file)=>{const{error}=await sb.storage.from('documentos').upload(base+file,dataURLtoBlob(dataUrl),{contentType:'image/jpeg',upsert:false});if(error&&!/exists|Duplicate/i.test(error.message))throw error;return base+file};
  for(const k of['selfie','dni1','dni2','firma'])if(d.cli[k])paths.cli[k]=await sube(d.cli[k],'solicitante-'+k+'.jpg');
  if(conFiador(d))for(let i=0;i<d.nFiadores;i++){paths['f'+i]={};for(const k of['selfie','dni1','dni2','firma'])if(d.fiadores[i][k])paths['f'+i][k]=await sube(d.fiadores[i][k],`fiador${i+1}-${k}.jpg`)}
  const{data,error}=await sb.from('creditos').insert(cRow(d,paths)).select('folio').single();
  if(error){if(/client_id/.test(error.message))return{folio:'(ya enviada)'};if(/creditos_dni_pendiente|duplicate key/i.test(error.message))throw new Error('Esta persona ya tiene una solicitud de crédito pendiente en la oficina. Descarte esta o pida a la oficina que resuelva la anterior.');throw error}
  return data}
async function cEnviar(){
  if(S.practica){const d=S.cdraft;S.csent={nombre:nombreDe(d.cli),monto:num(d.cond.monto),folio:'PRÁCTICA',online:true,practica:true};S.cdraft=cBlank();await idb.set('cdraft',S.cdraft);S.cstep=0;render();return}
  const d=S.cdraft,item={kind:'credito',d:JSON.parse(JSON.stringify(d)),creado:new Date().toISOString(),error:null};
  S.queue.push(item);await saveQueue();S.cdraft=cBlank();await idb.set('cdraft',S.cdraft);S.cstep=0;
  const info={nombre:nombreDe(d.cli),monto:num(d.cond.monto)};
  if(navigator.onLine){S.cbusy=true;render();
    try{const r=await cUpload(item);S.queue=S.queue.filter(q=>q.d.client_id!==item.d.client_id);await saveQueue();S.csent={...info,folio:r.folio,online:true}}
    catch(e){item.error=errMsg(e);await saveQueue();S.csent={...info,online:false,error:item.error}}
    S.cbusy=false}
  else S.csent={...info,online:false};
  render();netbar()}

/* ---------- bandeja de créditos (oficina) ---------- */
async function loadCreditos(){
  let q=sb.from('creditos').select('id,folio,estado,nombres,apellidos,dni,monto_solicitado,plazo_meses,promotor_nombre,creado_en,analizado_en,datos->cond->>garantia').order('creado_en',{ascending:false}).limit(200);
  if(S.cfilter!=='Todas')q=q.eq('estado',S.cfilter);
  const t=S.q.trim();if(t){const s=t.replace(/[%,()]/g,'');q=q.or(`nombres.ilike.%${s}%,apellidos.ilike.%${s}%,dni.ilike.%${s.replace(/\D/g,'')||s}%,folio.ilike.%${s}%`)}
  const{data,error}=await q;if(error){toast(errMsg(error));return}S.creditos=data;render()}
async function cCountPend(){if(!isOficina())return 0;const{count}=await sb.from('creditos').select('id',{count:'exact',head:true}).eq('estado','Pendiente');return count||0}
async function loadCredDetail(id){
  S.cdetail=null;render();
  const{data:s,error}=await sb.from('creditos').select('*').eq('id',id).single();if(error){toast(errMsg(error));return}
  const paths=[...Object.values(s.documentos||{}),...(s.fiadores||[]).flatMap(f=>Object.values(f.docs||{}))].filter(Boolean),urls={};
  if(paths.length){const{data:su}=await sb.storage.from('documentos').createSignedUrls(paths,900);(su||[]).forEach(u=>urls[u.path]=u.signedUrl)}
  const[{data:log},{data:soc},{data:otros}]=await Promise.all([sb.from('bitacora').select('accion,detalle,creado_en').eq('credito_id',id).order('creado_en'),
    sb.from('solicitudes').select('folio,estado,codigo_socio,tipo_cuenta,creado_en,revisado_en').eq('dni',s.dni).order('creado_en',{ascending:false}).limit(5),
    sb.from('creditos').select('id,folio,estado,monto_solicitado,creado_en,resolucion').eq('dni',s.dni).neq('id',id).order('creado_en',{ascending:false}).limit(10)]);
  const fdni=(s.fiadores||[]).map(f=>f.dni).filter(Boolean);let comoFiador=[];if(fdni.length||s.dni){const{data:cf}=await sb.from('creditos').select('folio,estado,nombres,apellidos,fiadores').neq('id',id).limit(500);comoFiador=(cf||[]).filter(c=>(c.fiadores||[]).some(f=>f.dni===s.dni))}
  S.cdetail={s,urls,log:log||[],soc:soc||[],otros:otros||[],comoFiador};S.cana=JSON.parse(JSON.stringify(s.analisis||{lista:{},nota:''}));if(!S.cana.lista)S.cana.lista={};S.cres={decision:'',monto:s.monto_solicitado,plazo:s.plazo_meses,tasa:s.datos?.cond?.tasa||'',tasaTipo:s.datos?.cond?.tasaTipo||'Mensual',forma:s.datos?.cond?.forma||'Mensual',metodo:s.datos?.cond?.metodo||'Cuota nivelada',observaciones:''};render()}
const pillC=(e,an)=>e==='Pendiente'&&an?`<span class="pill p-an">En análisis</span>`:`<span class="pill ${e==='Pendiente'?'p-pend':e==='Aprobado'?'p-ok':'p-bad'}">${esc(e)}</span>`;
function vBandejaTipo(){return `<div class="filters" style="margin:4px 0 14px"><button data-btipo="afil" class="${S.btipo!=='creditos'?'on':''}">Afiliaciones</button><button data-btipo="creditos" class="${S.btipo==='creditos'?'on':''}">Créditos${S.cpend?` <span class="badge">${S.cpend}</span>`:''}</button></div>`}
function vBandejaCreditos(){
  if(S.copen)return vCredDetalle();
  return `${vBandejaTipo()}<h1>Solicitudes de crédito</h1><p class="lead">Revise cada solicitud, imprímala con la hoja del fiador y registre la resolución del comité.</p>
  <div class="filters">${['Pendiente','Aprobado','Denegado','Todas'].map(f=>`<button data-cf="${f}" class="${S.cfilter===f?'on':''}">${f==='Todas'?'Todas':f+'s'}</button>`).join('')}</div>
  <div class="toolbar"><span class="hint">${S.creditos.length} ${S.creditos.length===1?'solicitud':'solicitudes'} en esta vista</span>${puedeExportar()?`<div class="grp"><button class="btn-sm" id="crXls">Exportar Excel</button></div>`:''}</div>
  <form id="cSearchF" style="display:flex;gap:8px;margin-bottom:12px"><label for="cqBox" class="t" hidden>Buscar</label><input id="cqBox" placeholder="Buscar por nombre, identidad o folio" value="${esc(S.q)}"><button type="submit">Buscar</button></form>
  <div class="list">${S.creditos.length?S.creditos.map(s=>`<button class="item" data-copen="${s.id}"><b>${esc(s.nombres+' '+s.apellidos)}</b>${pillC(s.estado,s.analizado_en)}<span class="meta"><span class="mono">${esc(s.folio)}</span> · ${esc(fmtDni(s.dni))} · ${esc(s.garantia||'')} · ${esc(s.promotor_nombre)} · ${fecha(s.creado_en)}</span><span class="meta num">${L(s.monto_solicitado)} · ${s.plazo_meses} m</span></button>`).join(''):`<div class="card empty">No hay solicitudes de crédito ${S.cfilter==='Todas'?'':S.cfilter.toLowerCase()+'s'}.</div>`}</div>`}
function vCredDetalle(){
  if(!S.cdetail)return `<button id="crBack" class="btn-sm">← Volver</button><p class="empty"><span class="spin"></span> Cargando solicitud…</p>`;
  const{s,urls,log}=S.cdetail,r=S.cres,cu=cuotaEst(r.monto,r.plazo,r.tasa,r.tasaTipo,r.forma,r.metodo);
  const docs=[['selfie','Rostro'],['dni1','Identidad · frente'],['dni2','Identidad · reverso'],['firma','Firma']];
  const fig=(p,t)=>p&&urls[p]?`<figure><a href="${urls[p]}" target="_blank" rel="noopener"><img src="${urls[p]}" crossorigin="anonymous" alt="${t}"></a><figcaption>${t}</figcaption></figure>`:'';
  return `<button id="crBack" class="btn-sm">← Volver a créditos</button>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px"><h1>${esc(s.nombres+' '+s.apellidos)}</h1>${pillC(s.estado,s.analizado_en)}</div>
  <p class="lead"><span class="mono">${esc(s.folio)}</span> · ${L(s.monto_solicitado)} a ${s.plazo_meses} meses · ${esc(s.datos?.cond?.destino||'')}</p>
  ${vRelacion()}${vCapDetalle(s)}${vAnalisis()}
  ${s.estado==='Pendiente'?`<div class="card" style="margin-top:14px"><h3>Resolución del comité de crédito</h3><div class="grid" style="margin-top:10px">
    <div class="f full"><span class="t">Decisión</span><div class="chips">${['Aprobado','Denegado'].map((d,i)=>`<label><input type="radio" name="crDec" id="crDec${i}" data-cres="decision" value="${d}" ${r.decision===d?'checked':''}>${d==='Aprobado'?'Aprobar':'Denegar'}</label>`).join('')}</div></div>
    ${r.decision==='Aprobado'?`<div class="f"><label class="t" for="crMonto">Monto aprobado (L)</label><input id="crMonto" type="number" inputmode="decimal" data-cres="monto" value="${esc(r.monto)}"></div><div class="f"><label class="t" for="crPlazo">Plazo (meses)</label><input id="crPlazo" type="number" inputmode="numeric" data-cres="plazo" value="${esc(r.plazo)}"></div><div class="f"><label class="t" for="crTasa">Tasa (%)</label><input id="crTasa" type="number" inputmode="decimal" data-cres="tasa" value="${esc(r.tasa)}"></div><div class="f"><label class="t" for="crTasaT">La tasa es</label><select id="crTasaT" data-cres="tasaTipo">${['Mensual','Anual'].map(o=>`<option ${r.tasaTipo===o?'selected':''}>${o}</option>`).join('')}</select></div><div class="f"><label class="t" for="crForma">Forma de pago</label><select id="crForma" data-cres="forma">${['Mensual','Quincenal','Otra'].map(o=>`<option ${r.forma===o?'selected':''}>${o}</option>`).join('')}</select></div><div class="f"><label class="t" for="crMet">Método</label><select id="crMet" data-cres="metodo">${METODOS.map(o=>`<option ${r.metodo===o?'selected':''}>${o}</option>`).join('')}</select></div><div class="f"><span class="t">Cuota a pagar</span><b class="num" id="crCuota" style="padding:10px 0">${cu?L(cu):'—'}</b></div>`:''}
    <div class="f full"><label class="t" for="crObs">Observaciones${r.decision==='Denegado'?' <i>*</i>':''}</label><textarea id="crObs" rows="2" data-cres="observaciones">${esc(r.observaciones)}</textarea></div></div>
    <div class="rowbtns"><span class="err" id="crErr"></span><button class="btn-primary" id="crResolver" ${r.decision?'':'disabled'}>Registrar resolución</button></div></div>`:''}
  <div class="card" style="margin-top:14px"><div class="rowbtns" style="margin-top:0"><h3>Documentos</h3><div class="grp" style="display:flex;gap:8px;flex-wrap:wrap"><button id="crPlan">Plan de pagos</button><button id="crPdf">Descargar PDF</button><button class="btn-primary" id="crPrint">Imprimir</button></div></div>
  <div class="docs">${docs.map(([k,t])=>fig(s.documentos?.[k],t)).join('')}${(s.fiadores||[]).map((f,i)=>docs.map(([k,t])=>fig(f.docs?.[k],`Fiador ${i+1} · ${t}`)).join('')).join('')}</div>
  ${s.datos?.cli?.lat!=null?`<p style="margin:12px 0 0"><a href="https://www.google.com/maps?q=${Number(s.datos.cli.lat)},${Number(s.datos.cli.lng)}" target="_blank" rel="noopener noreferrer">Ver la vivienda en el mapa</a></p>`:''}
  <h3 style="margin-top:16px">Historial</h3><ul class="log">${log.map(l=>`<li>${fechaHora(l.creado_en)} · ${esc(l.accion)}${l.detalle?' · '+esc(l.detalle):''}</li>`).join('')}</ul></div>
  <div class="sheet-wrap">${creditoHTML(s,urls)}</div>${(s.fiadores||[]).map((f,i)=>`<div class="sheet-wrap">${fiadorHTML(s,f,i,urls)}</div>`).join('')}`}

/* ---------- hojas impresas (formato CACIH) ---------- */
function cHead(p,titulo,foto){return `<div class="hd2"><img class="logo" src="logo-cacih.png" alt="CACIH"><div class="ctr"><b>– CACIH –</b><div class="nl">${esc(String(p.nombre_legal||'').toUpperCase())}</div><div>Oficina principal: ${esc(p.direccion)}</div><div>Tel. ${esc(p.telefonos)} · ${esc(p.correo)}</div></div><div class="foto">${foto||'Foto'}</div></div><div class="tit"><b>${titulo}</b></div>`}
const ynC=v=>v==='Sí'?'Sí':v==='No'?'No':'';
function tPersona(x,esFiador,urls){const v=y=>esc(y??''),r2=(a,b,c,d)=>`<tr><td class="k">${a}</td><td>${v(b)}</td><td class="k">${c}</td><td>${v(d)}</td></tr>`,r1=(a,b)=>`<tr><td class="k">${a}</td><td colspan="3">${v(b)}</td></tr>`;
  const fn=x.nac?x.nac.split('-').reverse().join('/'):'',a=edad(x.nac);
  const pats=(x.patronos||[]).filter(p=>p.nombre&&p.nombre.trim());
  const tab=(cols,rows)=>`<table class="grid3"><tr>${cols.map(c=>`<td class="k">${c}</td>`).join('')}</tr>${rows.length?rows.map(r=>`<tr>${r.map(c=>`<td>${v(c)}</td>`).join('')}</tr>`).join(''):`<tr>${cols.map(()=>'<td>&nbsp;</td>').join('')}</tr>`}</table>`;
  return `<h4>${esFiador?'Datos del fiador solidario':'Datos de identificación del cliente'}</h4><table class="kv">
  ${r2('1er nombre',x.n1,'2do nombre',x.n2)}${r2('1er apellido',x.a1,'2do apellido',x.a2)}${r2('Conocido como',x.conocido,'N° de cliente',x.clienteNo)}
  ${r2('Lugar y fecha de nacimiento',[x.lugarNac,fn].filter(Boolean).join(' · '),'Edad',a!=null?a+' años':'')}${r2('N° de identidad',fmtDni(x.dni),'RTN',x.rtn)}${r2('Nivel educativo',x.educ,'Estado civil',x.civil)}
  ${enPareja(x)?r2('Nombre del cónyuge',x.conyuge?.n,'Tel/cel',x.conyuge?.tel):''}${!esFiador&&enPareja(x)?r2('Fuente de trabajo del cónyuge',x.conyuge?.trabajo,'Sueldo',x.conyuge?.sueldo?L(x.conyuge.sueldo):''):''}${esFiador?r2('Fuente de trabajo',x.trabajo,'Sueldo',x.sueldo?L(x.sueldo):''):''}</table>
  <h4>Datos de localización${esFiador?'':' del cliente'}</h4><table class="kv">
  ${esFiador?r1('Dirección de residencia',x.direccion)+r2('Ciudad',x.ciudad,'Municipio / departamento',[x.municipio,x.depto].filter(Boolean).join(', ')):r2('Municipio',x.municipio,'Barrio o colonia',x.barrio)+r1('Referencia de ubicación',x.refUbic)+r1('GPS',x.lat!=null?Number(x.lat).toFixed(6)+', '+Number(x.lng).toFixed(6):'')}
  ${r2('E-mail',x.email,'Tel/cel 1 · 2',[x.cel1,x.cel2].filter(Boolean).join(' · '))}${r2('El lugar donde vive es',x.vivienda,'Tiempo de residir',x.tiempoRes?x.tiempoRes+' meses':'')}${x.vivienda&&x.vivienda!=='Casa propia'?r2('Propietario de la vivienda',x.propietario?.n,'Cel.',x.propietario?.cel):''}</table>
  <h4>Datos de las actividades laborales y/o comerciales${esFiador?'':' del cliente'}</h4>
  ${tab(['Negocio o patrono','Tel','Dirección','Cargo','Antigüedad'],pats.map(p=>[p.nombre,p.tel,p.dir,p.cargo,p.ant?p.ant+' meses':'']))}
  <table class="kv">${r2('Recibe remesas familiares',ynC(x.remesas),'Monto promedio / frecuencia',x.remesas==='Sí'?L(x.remMonto)+' · '+(x.remFrec||''):'')}${x.remesas==='Sí'?r2('Nombre de quien le envía',x.remQuien,'Teléfono',x.remTel):''}
  ${esFiador?'':r1('Descripción general de los ingresos y actividades',x.ingresosDesc)+r1('De dónde pretende pagar el cliente',x.pagoFuente)+(x.ingMes!==undefined&&x.ingMes!==''?r2('Ingresos · gastos del hogar (mes)',L(x.ingMes)+' · '+L(x.gastosMes),'Otras deudas (mes)',L(x.deudasMes)):'')}
  ${r1(esFiador?'El fiador solidario posee cuentas bancarias/cooperativas':'El solicitante posee cuentas bancarias/cooperativas',ynC(x.cuentas))}</table>
  ${x.cuentas==='Sí'?tab(esFiador?['Institución bancaria/coop','Tipo de cuenta','Promedio de ahorro']:['Institución','Tipo de cuenta'],(x.cuentasList||[]).filter(c=>c.inst&&c.inst.trim()).map(c=>esFiador?[c.inst,c.tipo,c.prom?L(c.prom):'']:[c.inst,c.tipo])):''}
  ${esFiador?`<table class="kv">${r2('Posee terrenos',ynC(x.terrenos),'Dónde',x.terrenosDonde)}</table>`:''}
  <table class="kv">${r1('Posee vehículo a su nombre y/o de su cónyuge',ynC(x.vehiculo))}</table>${x.vehiculo==='Sí'?tab(['Marca','Tipo','N° placa','A nombre de quién'],(x.vehiculos||[]).filter(c=>c.marca&&c.marca.trim()).map(c=>[c.marca,c.tipo,c.placa,c.nombre])):''}
  ${esFiador?'':`<table class="kv">${r2('Posee otros bienes',ynC(x.otrosBienes),'Detalle',x.otrosDetalle)}</table>`}`}
function creditoHTML(s,urls){
  const p=S.params,d=s.datos||{},k=d.cond||{},x=d.cli||{},v=y=>esc(y??''),res=s.resolucion;
  const img=(path,alt)=>path&&urls[path]?`<img src="${urls[path]}" crossorigin="anonymous" alt="${alt}">`:'';
  const r2=(a,b,c,e)=>`<tr><td class="k">${a}</td><td>${v(b)}</td><td class="k">${c}</td><td>${v(e)}</td></tr>`;
  return `<div class="sheet">${cHead(p,'SOLICITUD DE CRÉDITO Nº <span class="mono">'+v(s.folio)+'</span>',img(s.documentos?.selfie,'Foto del solicitante'))}
  <table class="kv">${r2('Oficina que gestiona el crédito',d.oficina,'Fecha de presentada',fecha(s.creado_en))}${r2('Asesor',d.asesor||s.promotor_nombre,'Estado',s.estado)}</table>
  <h4>Condiciones de crédito</h4><table class="kv">
  ${r2('Monto',L(s.monto_solicitado),'Plazo',s.plazo_meses+' meses')}${r2('Tasa',k.tasa!==''&&k.tasa!=null?k.tasa+' % '+(k.tasaTipo||'').toLowerCase():'','Garantía',k.garantia)}
  ${r2('Cuota a pagar',k.cuota?L(k.cuota):'','Forma de pago',k.forma==='Otra'?'Otra: '+(k.formaOtra||''):k.forma)}${r2('Clasificación de crédito',k.clasif,'Destino del crédito',k.destino)}
  ${r2('Comisión · Seguro',L(k.comision)+' · '+L(k.seguro),'Servicios · Ptmo. pendiente',L(k.servicios)+' · '+L(k.pendiente))}${r2('Otros cargos',L(k.otros),'Valor estimado a recibir',L(k.valorRecibir??s.monto_solicitado))}</table>
  ${tPersona(x,false,urls)}
  <h4>Datos referenciales del cliente</h4><table class="grid3"><tr><td class="k">Referencia</td><td class="k">Nombre</td><td class="k">Parentesco</td><td class="k">Tel/cel</td></tr>${(x.refs||[]).map((r,i)=>`<tr><td>${i?'Familiar':'Personal/familiar'}</td><td>${v(r.n)}</td><td>${v(r.p)}</td><td>${v(r.tel)}</td></tr>`).join('')}</table>
  <p class="legal">En caso de fallecimiento o que pierdan la comunicación directa con mi persona, autorizo que se comuniquen con <b>${v(x.emergencia?.n)}</b>, que vive en <b>${v(x.emergencia?.donde)}</b> y que actualmente posee el número de teléfono <b>${v(x.emergencia?.tel)}</b>, para que puedan obtener la información que requieran de mi persona.</p>
  <h4>Datos de la garantía</h4><p class="q"><b>${v(k.garantia)}</b>${d.garantiaDesc?' · '+v(d.garantiaDesc):''}${(s.fiadores||[]).length?' · Fiador(es) solidario(s): '+s.fiadores.map(f=>v(nombreDe(f))+' ('+v(fmtDni(f.dni))+')').join('; '):''}</p>
  <h4>Autorización</h4><p class="legal">Yo, <b>${v(nombreDe(x))}</b>, con número de identidad <b>${v(fmtDni(x.dni))}</b>. ${CTXT.buro(p.nombre_legal)}</p>
  <div class="sigs"><div></div><div>${img(s.documentos?.firma,'Firma del solicitante')}<span>Firma y huella del solicitante</span></div><div></div></div>
  ${s.analisis?`<h4>Análisis de crédito</h4><p class="legal">${ANALISIS.map(([k,t])=>(s.analisis.lista?.[k]?'☒ ':'☐ ')+t).join(' &nbsp; ')}${s.datos?.capacidad?.relacion!=null?' &nbsp;·&nbsp; Cuota / disponible: <b>'+s.datos.capacidad.relacion+' %</b>':''}${s.analisis.nota?'<br>Nota: '+v(s.analisis.nota):''}</p>`:''}
  <h4>Datos de resolución de aprobación</h4><p class="legal">El suscrito comité de crédito de la CACIH, después de haber evaluado y analizado la presente solicitud de crédito, decidimos: <b>${res?(res.decision==='Aprobado'?'APROBAR':'DENEGAR'):'________________'}</b> la presente solicitud, bajo las siguientes condiciones:</p>
  <table class="kv">${r2('Monto aprobado',res?.monto?L(res.monto):'','Plazo',res?.plazo?res.plazo+' meses':'')}${r2('Tasa',res?.tasa!==undefined&&res?.tasa!==''?res.tasa+' % '+String(res.tasaTipo||'').toLowerCase():'','Cuota a pagar',res?.cuota?L(res.cuota):'')}${r2('Forma de pago',res?.forma,'Fecha de resolución',s.revisado_en?fecha(s.revisado_en):'')}<tr><td class="k">Observaciones</td><td colspan="3">${v(res?.observaciones)}</td></tr></table>
  <div class="sigs"><div><span>Firma autorizada</span></div><div><span>Firma autorizada</span></div><div><span>Firma autorizada</span></div></div>
  <div class="foot"><span>SC-01 v1.5 · Solicitud de crédito CACIH</span><span>Impreso ${fechaHora(new Date())}</span></div></div>`}
function fiadorHTML(s,f,i,urls){
  const p=S.params,v=y=>esc(y??''),img=(path,alt)=>path&&urls[path]?`<img src="${urls[path]}" crossorigin="anonymous" alt="${alt}">`:'',deudor=s.nombres+' '+s.apellidos;
  return `<div class="sheet">${cHead(p,'DATOS DEL FIADOR SOLIDARIO'+(s.fiadores.length>1?' '+(i+1):''),img(f.docs?.selfie,'Foto del fiador'))}
  <table class="kv"><tr><td class="k">Nombre del solicitante</td><td>${v(deudor)}</td><td class="k">Solicitud Nº</td><td class="mono">${v(s.folio)}</td></tr><tr><td class="k">Asesor</td><td colspan="3">${v(s.datos?.asesor||s.promotor_nombre)}</td></tr></table>
  ${tPersona(f,true,urls)}
  <h4>Declaración y compromiso</h4><p class="legal">${CTXT.buro(p.nombre_legal)} ${f.declara?'☒ Aceptado.':''}</p><p class="legal">${CTXT.compromiso('<b>'+v(deudor)+'</b>')} ${f.compromiso?'☒ Aceptado.':''}</p>
  <div class="sigs"><div></div><div>${img(f.docs?.firma,'Firma del fiador')}<span>Firma del fiador solidario · ${v(nombreDe(f))}</span></div><div></div></div>
  <div class="foot"><span>FS-01 v1.5 · Fiador solidario CACIH</span><span>Impreso ${fechaHora(new Date())}</span></div></div>`}

/* ---------- PDF de varias hojas ---------- */
async function cPdf(btn){
  btn.disabled=true;const txt=btn.textContent;btn.innerHTML='<span class="spin"></span> Generando…';
  try{await loadScript('html2canvas');await loadScript('jspdf');const{s,urls}=S.cdetail;await registrarExport('PDF ficha',s.folio,1);
    const{jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'letter'}),pw=doc.internal.pageSize.getWidth(),ph=doc.internal.pageSize.getHeight(),m=24,iw=pw-2*m,area=$('#pdfArea');let pag=0;
    for(const html of[creditoHTML(s,urls),...(s.fiadores||[]).map((f,i)=>fiadorHTML(s,f,i,urls))]){
      area.innerHTML=html;await Promise.all([...area.querySelectorAll('img')].map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r})));
      const sheet=area.firstElementChild,top0=sheet.getBoundingClientRect().top,cuts=[...sheet.querySelectorAll('h4,tr,p,.sigs,.foot')].map(e=>Math.round((e.getBoundingClientRect().top-top0)*2)).sort((a,b)=>a-b);
      const cv=await html2canvas(sheet,{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false}),pageH=Math.floor(cv.width*(ph-2*m)/iw);
      let ph2=pageH;if(cv.height>pageH&&cv.height<=pageH*1.4)ph2=cv.height;else if(cv.height>pageH*2&&cv.height<=pageH*2.35)ph2=Math.ceil(cv.height/2)+60;
      const k=Math.min(1,pageH/ph2),w=iw*k,x0=(pw-w)/2;let y=0;
      while(y<cv.height-4){let end=y+ph2;if(end<cv.height){const c=cuts.filter(v=>v>y+ph2*0.5&&v<=end).pop();if(c)end=c}end=Math.min(end,cv.height);
        const h=end-y,c=document.createElement('canvas');c.width=cv.width;c.height=h;c.getContext('2d').drawImage(cv,0,y,cv.width,h,0,0,cv.width,h);
        if(pag)doc.addPage();doc.addImage(c.toDataURL('image/jpeg',.92),'JPEG',x0,m,w,h*w/cv.width);pag++;doc.setFontSize(8);doc.setTextColor(120);doc.text('Página '+pag,pw-m,ph-10,{align:'right'});y=end}}
    area.innerHTML='';doc.save(`Credito_${s.folio}_${(s.apellidos+'_'+s.nombres).replace(/\s+/g,'_')}.pdf`);toast('Solicitud descargada en PDF')}
  catch(e){toast(errMsg(e),4000)}finally{btn.disabled=false;btn.textContent=txt}}
async function cExcel(btn){
  btn.disabled=true;const txt=btn.textContent;btn.innerHTML='<span class="spin"></span> Preparando…';
  try{await loadScript('xlsx');let q=sb.from('creditos').select('*').order('creado_en',{ascending:true}).limit(5000);if(S.cfilter!=='Todas')q=q.eq('estado',S.cfilter);
    const{data:rows,error}=await q;if(error)throw error;if(!rows.length){toast('No hay solicitudes para exportar.');return}
    await registrarExport('Excel','Créditos · '+S.cfilter,rows.length);
    const data=rows.map(s=>{const k=s.datos?.cond||{},x=s.datos?.cli||{},r=s.resolucion||{},f=s.fiadores||[];return{
      'Folio':s.folio,'Estado':s.estado,'Fecha':new Date(s.creado_en),'Asesor':s.datos?.asesor||s.promotor_nombre,'N° de cliente':s.cliente_no||'',
      'Nombre':nombreDe(x)||s.nombres+' '+s.apellidos,'Identidad':fmtDni(s.dni),'RTN':x.rtn||'','Edad':edad(x.nac),'Estado civil':x.civil||'','Municipio':x.municipio||'','Barrio o colonia':x.barrio||'','Celular':x.cel1||'',
      'Monto solicitado (L)':Number(s.monto_solicitado),'Plazo (meses)':s.plazo_meses,'Tasa':k.tasa?k.tasa+' % '+k.tasaTipo:'','Forma de pago':k.forma||'','Cuota estimada (L)':k.cuota||'','Destino':k.destino||'','Clasificación':k.clasif||'','Garantía':k.garantia||'','Datos de garantía':s.datos?.garantiaDesc||'','Valor a recibir (L)':k.valorRecibir??'',
      'Producto':k.producto||'','Ingresos mes (L)':x.ingMes?Number(x.ingMes):'','Gastos mes (L)':x.gastosMes!==undefined&&x.gastosMes!==''?Number(x.gastosMes):'','Otras deudas mes (L)':x.deudasMes?Number(x.deudasMes):'','Cuota / disponible (%)':s.datos?.capacidad?.relacion??'','En análisis':s.analizado_en?'Sí':'','Negocio o patrono':x.patronos?.[0]?.nombre||'','Recibe remesas':x.remesas||'','Fiador 1':f[0]?nombreDe(f[0])+' ('+fmtDni(f[0].dni)+')':'','Fiador 2':f[1]?nombreDe(f[1])+' ('+fmtDni(f[1].dni)+')':'',
      'Decisión':r.decision||'','Monto aprobado (L)':r.monto?Number(r.monto):'','Plazo aprobado':r.plazo||'','Tasa aprobada':r.tasa?r.tasa+' % '+(r.tasaTipo||''):'','Cuota aprobada (L)':r.cuota||'','Observaciones':r.observaciones||'','Fecha de resolución':s.revisado_en?new Date(s.revisado_en):''}});
    const ws=XLSX.utils.json_to_sheet(data,{cellDates:true,dateNF:'dd/mm/yyyy'}),keys=Object.keys(data[0]);
    ws['!cols']=keys.map(k=>({wch:Math.min(40,Math.max(k.length+2,...data.slice(0,200).map(r=>String(r[k]??'').length+1)))}));
    ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:data.length,c:keys.length-1}})};
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Créditos');XLSX.writeFile(wb,`CACIH_creditos_${S.cfilter.toLowerCase()}_${new Date().toISOString().slice(0,10)}.xlsx`);toast(rows.length+' solicitudes de crédito exportadas')}
  catch(e){toast(errMsg(e),4000)}finally{btn.disabled=false;btn.textContent=txt}}

/* ---------- firmas ---------- */
function cInitSigs(){document.querySelectorAll('canvas[data-csig]').forEach(c=>{
  const p=c.dataset.csig,r=c.getBoundingClientRect(),dpr=window.devicePixelRatio||1;c.width=r.width*dpr;c.height=r.height*dpr;
  const x=c.getContext('2d');x.scale(dpr,dpr);x.lineWidth=2.4;x.lineCap='round';x.lineJoin='round';x.strokeStyle='#14231a';
  const prev=gp(S.cdraft,p);if(prev){const im=new Image();im.onload=()=>x.drawImage(im,0,0,r.width,r.height);im.src=prev}
  let dr=false;const pos=e=>{const b=c.getBoundingClientRect();return[e.clientX-b.left,e.clientY-b.top]};
  c.addEventListener('pointerdown',e=>{dr=true;c.setPointerCapture(e.pointerId);const[a,b]=pos(e);x.beginPath();x.moveTo(a,b)});
  c.addEventListener('pointermove',e=>{if(!dr)return;const[a,b]=pos(e);x.lineTo(a,b);x.stroke()});
  const end=()=>{if(!dr)return;dr=false;const o=document.createElement('canvas');o.width=Math.min(c.width,900);o.height=Math.round(c.height*o.width/c.width);const g=o.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,o.width,o.height);g.drawImage(c,0,0,o.width,o.height);sp(S.cdraft,p,o.toDataURL('image/jpeg',.8));cSave();const h=document.querySelector(`[data-csighint="${p}"]`);if(h)h.textContent='Firma guardada.'};
  c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end)})}

/* ---------- navegación ---------- */
function cGo(i){S.cstep=i;S.cerrors={};render();window.scrollTo({top:0})}
function cAbrir(){if(!S.cdraft)S.cdraft=cBlank();if(!S.cdraft.asesor)S.cdraft.asesor=S.perfil?.nombre||''}

/* ---------- eventos ---------- */
document.addEventListener('click',async e=>{
  const t=e.target.closest('button');if(!t||!S.session)return;
  if(t.dataset.cgo!==undefined)cGo(+t.dataset.cgo);
  if(t.id==='crPrev')cGo(S.cstep-1);
  if(t.id==='crNext'){const key=cSteps()[S.cstep][0],er=cValidate(key);if(Object.keys(er).length){S.cerrors=er;render();toast('Revise los campos marcados')}else cGo(S.cstep+1)}
  if(t.id==='crGoBad')cGo(cFirstInvalid());
  if(t.id==='crSend'){t.disabled=true;await cEnviar()}
  if(t.id==='crNew'){S.csent=null;render()}
  if(t.id==='crGoEnvios')setView('envios');
  if(t.id==='crReset'){if(!t.dataset.sure){t.dataset.sure='1';t.textContent='Toque otra vez para descartar';setTimeout(()=>{t.textContent='Descartar borrador';delete t.dataset.sure},4000);return}S.cdraft=cBlank();S.cstep=0;S.cerrors={};await idb.set('cdraft',S.cdraft);render();toast('Borrador descartado')}
  if(t.dataset.cclr){sp(S.cdraft,t.dataset.cclr,'');cSave();render()}
  if(t.id==='crGps'){if(!('geolocation' in navigator)){toast('Este teléfono no permite obtener la ubicación.');return}t.disabled=true;t.innerHTML='<span class="spin"></span> Buscando señal GPS…';
    navigator.geolocation.getCurrentPosition(p=>{const x=S.cdraft.cli;x.lat=+p.coords.latitude.toFixed(6);x.lng=+p.coords.longitude.toFixed(6);x.gpsPrec=Math.round(p.coords.accuracy*10)/10;cSave();render();toast('Ubicación guardada')},er=>{render();toast(er.code===1?'Permita el acceso a la ubicación en el navegador.':'No se pudo obtener la ubicación. Intente al aire libre.',6000)},{enableHighAccuracy:true,timeout:25000,maximumAge:0})}
  if(t.dataset.btipo){S.btipo=t.dataset.btipo;S.open=null;S.detail=null;S.copen=null;S.cdetail=null;render();if(S.btipo==='creditos')loadCreditos();else loadBandeja()}
  if(t.dataset.cf){S.cfilter=t.dataset.cf;loadCreditos()}
  if(t.dataset.copen){S.copen=t.dataset.copen;loadCredDetail(S.copen);window.scrollTo({top:0})}
  if(t.id==='crBack'){S.copen=null;S.cdetail=null;render();loadCreditos()}
  if(t.id==='crXls')cExcel(t);
  if(t.id==='crPdf')cPdf(t);
  if(t.id==='crPrint'){const{s,urls}=S.cdetail;try{await registrarExport('Impresión',s.folio,1)}catch(x){}
    const pr=$('#print');pr.innerHTML=[creditoHTML(s,urls),...(s.fiadores||[]).map((f,i)=>fiadorHTML(s,f,i,urls))].join('<div style="break-after:page"></div>');
    await Promise.all([...pr.querySelectorAll('img')].map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r})));window.print()}
  if(t.id==='crResolver'){const r=S.cres,er=$('#crErr');er.textContent='';
    if(r.decision==='Aprobado'&&!(num(r.monto)>0)){er.textContent='Indique el monto aprobado.';return}
    if(r.decision==='Denegado'&&!r.observaciones.trim()){er.textContent='Escriba el motivo en observaciones.';return}
    const res=r.decision==='Aprobado'?{monto:num(r.monto),plazo:num(r.plazo),tasa:r.tasa,tasaTipo:r.tasaTipo,forma:r.forma,metodo:r.metodo,cuota:Math.round(cuotaEst(r.monto,r.plazo,r.tasa,r.tasaTipo,r.forma,r.metodo)*100)/100,observaciones:r.observaciones.trim()}:{observaciones:r.observaciones.trim()};
    t.disabled=true;const{error}=await sb.rpc('resolver_credito',{p_id:S.copen,p_decision:r.decision,p_resolucion:res});
    if(error){er.textContent=errMsg(error);t.disabled=false;return}toast(r.decision==='Aprobado'?'Crédito aprobado':'Crédito denegado');loadCredDetail(S.copen);if(typeof countPend==='function')countPend()}
});
document.addEventListener('submit',e=>{if(e.target.id==='cSearchF'){e.preventDefault();S.q=$('#cqBox').value;loadCreditos()}});
document.addEventListener('input',e=>{const el=e.target;
  if(el.dataset.cp&&S.cdraft&&el.type!=='radio'){let v=el.value;const f=el.dataset.fmt;
    if(f==='dni')v=el.value=v.replace(/\D/g,'').slice(0,13);else if(f==='dig')v=el.value=v.replace(/\D/g,'').slice(0,14);else if(f==='tel')v=el.value=v.replace(/[^\d-]/g,'').slice(0,9);
    sp(S.cdraft,el.dataset.cp,v);cSave();
    if(/^cond\./.test(el.dataset.cp)&&S.view==='credito'){const k=S.cdraft.cond,cu=cuotaEst(k.monto,k.plazo,k.tasa,k.tasaTipo,k.forma,k.metodo),n=document.querySelector('.note b');if(n){const bs=document.querySelectorAll('.note b');bs[0].textContent=cu?L(cu):'— (indique tasa y plazo)';if(bs[1])bs[1].textContent=L(num(k.monto)-deducciones(k))}}}
  if(el.dataset.cres&&S.cres){S.cres[el.dataset.cres]=el.value;const r=S.cres,b=$('#crCuota');if(b){const cu=cuotaEst(r.monto,r.plazo,r.tasa,r.tasaTipo,r.forma,r.metodo);b.textContent=cu?L(cu):'—'}}});
document.addEventListener('change',e=>{const el=e.target;
  if(el.dataset.cres&&S.cres){S.cres[el.dataset.cres]=el.value;if(el.dataset.cres==='decision'){render()}else{const r=S.cres,b=$('#crCuota');if(b){const cu=cuotaEst(r.monto,r.plazo,r.tasa,r.tasaTipo,r.forma,r.metodo);b.textContent=cu?L(cu):'—'}}return}
  if(!S.cdraft)return;
  if(el.dataset.cp&&el.type==='radio'){let v=el.value;if(el.dataset.cp==='nFiadores')v=Number(v);sp(S.cdraft,el.dataset.cp,v);cSave();if(el.dataset.rr)render();return}
  if(el.dataset.cp&&el.tagName==='SELECT'){sp(S.cdraft,el.dataset.cp,el.value);cSave()}
  if(el.dataset.cp&&el.dataset.rr&&el.type!=='radio'&&el.type!=='checkbox'&&!/^cond\./.test(el.dataset.cp))render();
  if(el.dataset.cp&&el.dataset.rr&&/^cond\.(monto|plazo)$/.test(el.dataset.cp)&&cProducto())render();
  if(el.dataset.cpk){sp(S.cdraft,el.dataset.cpk,el.checked);cSave()}
  if(el.dataset.cphoto&&el.files[0]){const p=el.dataset.cphoto,rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),k=Math.min(1,1200/Math.max(im.width,im.height));c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);sp(S.cdraft,p,c.toDataURL('image/jpeg',.72));cSave();render()};im.src=rd.result};rd.readAsDataURL(el.files[0])}});


/* =====================================================================
   SIMULADOR DE PRÉSTAMO · tabla de amortización (v1.6)
   ===================================================================== */
const hoyISO=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)};
function sumarPeriodo(iso,i,quin){const[y,m,d]=iso.split('-').map(Number);
  if(quin){const t=new Date(y,m-1,d+15*i);return t}
  const t=new Date(y,m-1+i,1),ult=new Date(t.getFullYear(),t.getMonth()+1,0).getDate();t.setDate(Math.min(d,ult));return t}
function simBlank(){const d=new Date();d.setMonth(d.getMonth()+1);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
  return{producto:'',monto:'',plazo:'12',tasa:'',tasaTipo:'Mensual',forma:'Mensual',metodo:'Cuota nivelada',inicio:d.toISOString().slice(0,10),ingreso:'',nombre:'',celular:'',comision:'',seguro:''}}
/* Genera el plan. Redondea a centavos y ajusta la última cuota para cerrar en cero. */
function planPagos(m){
  const P=num(m.monto),n0=Math.round(num(m.plazo)),t=num(m.tasa);if(!(P>0)||!(n0>0)||n0>360)return null;
  const quin=m.forma==='Quincenal',n=quin?n0*2:n0,rm=m.tasaTipo==='Anual'?t/100/12:t/100,r=quin?rm/2:rm;
  const r2=x=>Math.round(x*100)/100,fija=r>0?P*r/(1-Math.pow(1+r,-n)):P/n,cap0=P/n;
  let saldo=P,ti=0;const filas=[];
  for(let i=1;i<=n;i++){const int=r2(saldo*r);let cap=m.metodo===METODOS[1]?r2(cap0):r2(fija)-int;if(i===n||cap>saldo)cap=r2(saldo);
    saldo=r2(saldo-cap);ti+=int;filas.push({i,fecha:m.inicio?sumarPeriodo(m.inicio,i-1,quin):null,cuota:r2(int+cap),int,cap,saldo})}
  const total=filas.reduce((a,f)=>a+f.cuota,0),cargos=num(m.comision)+num(m.seguro);
  return{P,n,n0,r,rm,quin,filas,ti:r2(ti),total:r2(total),c1:filas[0].cuota,cN:filas.at(-1).cuota,anual:rm*12*100,efectiva:(Math.pow(1+r,quin?24:12)-1)*100,cargos,neto:P-cargos,costoTotal:r2(total-P+cargos),cat:cargos>0&&cargos<P?catAnual(P-cargos,filas.map(f=>f.cuota),quin?24:12):(Math.pow(1+r,quin?24:12)-1)*100}}
/* Costo anual total: tasa que iguala lo recibido con las cuotas (TIR anualizada). */
function catAnual(recibido,cuotas,porAnio){let lo=0,hi=1;const vp=t=>cuotas.reduce((a,c,i)=>a+c/Math.pow(1+t,i+1),0);if(vp(0)<recibido)return 0;for(let k=0;k<200;k++){const mid=(lo+hi)/2;if(vp(mid)>recibido)lo=mid;else hi=mid}return(Math.pow(1+lo,porAnio)-1)*100}
function simComparar(m){return[6,12,18,24,36,48,60].map(n=>{const p=planPagos({...m,plazo:n,inicio:''});return p?{n,c1:p.c1,cN:p.cN,ti:p.ti,total:p.total}:null}).filter(Boolean)}
const fCorta=d=>d?d.toLocaleDateString('es-HN',{day:'2-digit',month:'short',year:'numeric'}):'';
function simInput(k,label,o={}){const v=S.sim[k]??'';return `<div class="f ${o.full?'full':''}"><label class="t" for="sm_${k}">${label}</label><input id="sm_${k}" data-sim="${k}" type="${o.type||'number'}" ${o.mode?`inputmode="${o.mode}"`:'inputmode="decimal"'} value="${esc(v)}" ${o.ph?`placeholder="${esc(o.ph)}"`:''} autocomplete="off">${o.hint?`<span class="hint">${o.hint}</span>`:''}</div>`}
function simChips(k,label,opts){return `<div class="f"><span class="t">${label}</span><div class="chips">${opts.map((x,i)=>`<label><input type="radio" name="sm_${k}" id="sm_${k}_${i}" data-sim="${k}" value="${esc(x)}" ${S.sim[k]===x?'checked':''}>${esc(x)}</label>`).join('')}</div></div>`}
function vSimResultado(){
  const m=S.sim,p=planPagos(m);
  if(!p)return `<div class="card empty">Escriba el monto, el plazo (1 a 360 meses) y la tasa para ver el plan de pagos.</div>`;
  const per=p.quin?'quincenal':'mensual',var_=m.metodo===METODOS[1];
  const ing=num(m.ingreso),cuotaMes=p.quin?p.c1*2:p.c1,rel=ing>0?cuotaMes/ing*100:null,lim=Number(S.params.limite_cuota_ingreso)||40,pr=simProducto(),fuera=pr&&((num(pr.plazoMax)>0&&p.n0>num(pr.plazoMax))||(num(pr.montoMax)>0&&p.P>num(pr.montoMax)));
  const cmp=simComparar(m);
  return `<div class="simres">
    <div class="kpis">
      <div><span>${var_?'Primera cuota':'Cuota '+per}</span><b class="num">${L(p.c1)}</b>${var_?`<small>última ${L(p.cN)}</small>`:''}</div>
      <div><span>Total de intereses</span><b class="num">${L(p.ti)}</b><small>${(p.ti/p.P*100).toFixed(1)} % del monto</small></div>
      <div><span>Total a pagar</span><b class="num">${L(p.total)}</b><small>${p.n} cuotas ${p.quin?'quincenales':'mensuales'}</small></div>
      <div><span>Tasa</span><b class="num">${(p.rm*100).toFixed(2)} % mensual</b><small>${p.anual.toFixed(2)} % anual · efectiva ${p.efectiva.toFixed(2)} %</small></div>
      ${p.cargos>0?`<div><span>Costo anual total</span><b class="num">${p.cat.toFixed(2)} %</b><small>incluye comisión y seguro · recibe ${L(p.neto)}</small></div><div><span>Costo total del crédito</span><b class="num">${L(p.costoTotal)}</b><small>intereses ${L(p.ti)} + cargos ${L(p.cargos)}</small></div>`:''}
    </div>
    ${fuera?`<div class="warnnote" style="margin-top:12px">Fuera de las condiciones de ${esc(pr.nombre)}: ${esc(prodResumen(pr))}.</div>`:''}
    ${rel!=null?`<div class="${rel>lim?'warnnote':'note'}" style="margin-top:12px">La cuota equivale al <b>${rel.toFixed(1)} %</b> del ingreso disponible ${rel>lim?`— supera el ${lim} % recomendado; considere un plazo mayor o un monto menor.`:`— dentro del ${lim} % recomendado.`}</div>`:''}
    <div class="bar" aria-hidden="true"><i style="width:${(p.P/p.total*100).toFixed(1)}%"></i></div><p class="hint" style="margin:4px 0 0">Verde: capital ${L(p.P)} · Dorado: intereses ${L(p.ti)}</p>
    <h3 style="margin-top:18px">Mismo monto y tasa, otros plazos</h3>
    <div class="tscroll"><table class="plain amort cmp"><thead><tr><th>Plazo</th><th>${var_?'1ª cuota':'Cuota'} ${per}</th><th>Intereses</th><th>Total a pagar</th><th></th></tr></thead><tbody>${cmp.map(c=>`<tr class="${c.n===p.n0?'on':''}"><td>${c.n} meses</td><td class="num">${L(c.c1)}</td><td class="num">${L(c.ti)}</td><td class="num">${L(c.total)}</td><td><button class="btn-sm" data-simplazo="${c.n}" ${c.n===p.n0?'disabled':''}>Usar</button></td></tr>`).join('')}</tbody></table></div>
    <div class="rowbtns" style="margin-top:18px"><h3 style="margin:0">Tabla de pagos</h3><div class="grp" style="display:flex;gap:8px;flex-wrap:wrap"><button id="simPrint">Imprimir</button><button id="simPdf">Descargar PDF</button><button id="simWa" class="btn-wa">Enviar por WhatsApp</button>${S.perfil?.activo?`<button class="btn-primary" id="simUsar">Usar en solicitud de crédito</button>`:''}</div></div>
    <div class="tscroll"><table class="plain amort"><thead><tr><th>N°</th><th>Fecha</th><th>Cuota</th><th>Interés</th><th>Capital</th><th>Saldo</th></tr></thead><tbody>
    ${p.filas.map(f=>`<tr><td>${f.i}</td><td>${fCorta(f.fecha)}</td><td class="num">${L(f.cuota)}</td><td class="num">${L(f.int)}</td><td class="num">${L(f.cap)}</td><td class="num">${L(f.saldo)}</td></tr>`).join('')}
    <tr class="tot"><td colspan="2">Totales</td><td class="num">${L(p.total)}</td><td class="num">${L(p.ti)}</td><td class="num">${L(p.P)}</td><td></td></tr></tbody></table></div>
    <p class="hint">Cálculo estimado sobre saldos (interés solo sobre lo que se debe). No incluye comisión, seguro ni otros cargos. La cuota definitiva la fija el comité de crédito.</p></div>`}
function vSimulador(){if(!S.sim)S.sim=simBlank();
  return `<h1>Simulador de préstamo</h1><p class="lead">Muestre al cliente cuánto pagará cada ${S.sim.forma==='Quincenal'?'quincena':'mes'} antes de llenar la solicitud.</p>
  <div class="card"><div class="grid">
    ${simInput('nombre','Nombre del cliente',{type:'text',mode:'text',ph:'Opcional, sale en el PDF'})}${simInput('celular','Celular del cliente',{type:'tel',mode:'tel',ph:'Opcional, para WhatsApp'})}
    ${(S.params.productos||[]).length?`<div class="f full"><label class="t" for="smProd">Producto de crédito</label><select id="smProd" data-smprod="1"><option value="">Sin producto (tasa libre)</option>${S.params.productos.map(p=>`<option ${S.sim.producto===p.nombre?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select>${simProducto()?`<span class="hint">${esc(prodResumen(simProducto()))}</span>`:''}</div>`:''}
    ${simInput('monto','Monto (L)',{ph:'Ej. 30000'})}${simInput('plazo','Plazo (meses)',{mode:'numeric'})}
    ${simProducto()?`<div class="f"><span class="t">Tasa</span><b style="padding:10px 0">${esc(S.sim.tasa)} % ${esc(S.sim.tasaTipo.toLowerCase())}</b></div>`:simInput('tasa','Tasa de interés (%)',{ph:'Ej. 2'})+simChips('tasaTipo','La tasa es',['Mensual','Anual'])}
    ${simChips('forma','Forma de pago',['Mensual','Quincenal'])}${simChips('metodo','Método',METODOS)}
    ${simInput('comision','Comisión (L)',{ph:'Opcional'})}${simInput('seguro','Seguro (L)',{ph:'Opcional'})}${simInput('inicio','Fecha del primer pago',{type:'date',mode:'none'})}${simInput('ingreso','Ingreso mensual disponible (L)',{ph:'Opcional',hint:'Ingresos menos gastos del hogar. Sirve para ver si la cuota es pagable.'})}
    <div class="f full note" style="font-size:12.5px"><b>Cuota nivelada:</b> paga lo mismo cada mes; al inicio va más a intereses. <b>Capital fijo:</b> abona igual a capital; la cuota empieza más alta, baja cada mes y se pagan menos intereses.</div>
  </div></div><div id="simOut" style="margin-top:14px">${vSimResultado()}</div>`}
function simRefrescar(){const o=$('#simOut');if(o)o.innerHTML=vSimResultado()}
function simDesde(o,nombre){S.sim={...simBlank(),...o,nombre:nombre||''};setView('simulador')}
function planHTML(){const m=S.sim,p=planPagos(m),pr=S.params;if(!p)return '';
  return `<div class="sheet">${cHead(pr,'PLAN DE PAGOS ESTIMADO','')}
  <table class="kv"><tr><td class="k">Cliente</td><td>${esc(m.nombre||'')}</td><td class="k">Fecha</td><td>${fecha(new Date())}</td></tr>
  <tr><td class="k">Monto</td><td>${L(p.P)}</td><td class="k">Plazo</td><td>${p.n0} meses · ${p.n} cuotas ${p.quin?'quincenales':'mensuales'}</td></tr>
  <tr><td class="k">Tasa</td><td>${(p.rm*100).toFixed(2)} % mensual (${p.anual.toFixed(2)} % anual)</td><td class="k">Método</td><td>${esc(m.metodo)}</td></tr>
  <tr><td class="k">${m.metodo===METODOS[1]?'Primera cuota':'Cuota'}</td><td><b>${L(p.c1)}</b></td><td class="k">Total intereses · total a pagar</td><td>${L(p.ti)} · <b>${L(p.total)}</b></td></tr></table>
  <h4>Tabla de amortización</h4><table class="grid3 amort"><tr><td class="k">N°</td><td class="k">Fecha</td><td class="k">Cuota</td><td class="k">Interés</td><td class="k">Capital</td><td class="k">Saldo</td></tr>
  ${p.filas.map(f=>`<tr><td>${f.i}</td><td>${fCorta(f.fecha)}</td><td class="num">${L(f.cuota)}</td><td class="num">${L(f.int)}</td><td class="num">${L(f.cap)}</td><td class="num">${L(f.saldo)}</td></tr>`).join('')}
  <tr><td colspan="2"><b>Totales</b></td><td class="num"><b>${L(p.total)}</b></td><td class="num">${L(p.ti)}</td><td class="num">${L(p.P)}</td><td></td></tr></table>
  <p class="legal">Este plan es una estimación informativa y no constituye aprobación del crédito. No incluye comisión, seguro ni otros cargos. Las condiciones finales las establece el comité de crédito de CACIH.</p>
  <div class="foot"><span>PP-01 v1.6 · Plan de pagos CACIH</span><span>Impreso ${fechaHora(new Date())}</span></div></div>`}
async function simPdf(btn,compartir){const m=S.sim,p=planPagos(m);if(!p)return;btn.disabled=true;const txt=btn.textContent;btn.innerHTML='<span class="spin"></span>';
  try{await loadScript('jspdf');await loadScript('autotable');const{jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'letter'}),pw=doc.internal.pageSize.getWidth(),pr=S.params;
    try{const im=document.querySelector('#hdr img');if(im&&im.complete){const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);doc.addImage(c.toDataURL('image/png'),'PNG',36,30,40,40)}}catch(e){}
    doc.setFillColor(23,63,44);doc.rect(0,0,pw,8,'F');doc.setFillColor(180,138,44);doc.rect(0,8,pw,2,'F');doc.setFont('helvetica','bold');doc.setFontSize(14);doc.setTextColor(23,63,44);doc.text('CACIH · Plan de pagos estimado',86,46);doc.setTextColor(0);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(90);doc.text(String(pr.nombre_legal||''),86,60);doc.text('Tel. '+(pr.telefonos||'')+' · '+(pr.correo||''),86,72);doc.setTextColor(0);
    const kv=[['Cliente',m.nombre||'—','Fecha',fecha(new Date())],...(m.producto&&simProducto()?[['Producto',m.producto,'Condiciones',prodResumen(simProducto())]]:[]),['Monto',L(p.P),'Plazo',p.n0+' meses · '+p.n+' cuotas '+(p.quin?'quincenales':'mensuales')],['Tasa',(p.rm*100).toFixed(2)+' % mensual ('+p.anual.toFixed(2)+' % anual)','Método',m.metodo],[m.metodo===METODOS[1]?'Primera cuota':'Cuota',L(p.c1),'Total a pagar',L(p.total)+' (intereses '+L(p.ti)+')'],...(p.cargos>0?[['Cargos (comisión y seguro)',L(p.cargos),'Costo anual total',p.cat.toFixed(2)+' % · costo total '+L(p.costoTotal)]]:[])];
    doc.autoTable({startY:88,margin:{left:36,right:36},body:kv,theme:'grid',styles:{fontSize:9,cellPadding:4},columnStyles:{0:{fontStyle:'bold',fillColor:[238,243,239],cellWidth:80},2:{fontStyle:'bold',fillColor:[238,243,239],cellWidth:80}}});
    doc.autoTable({startY:doc.lastAutoTable.finalY+14,margin:{left:36,right:36},head:[['N°','Fecha','Cuota','Interés','Capital','Saldo']],body:p.filas.map(f=>[f.i,fCorta(f.fecha),L(f.cuota),L(f.int),L(f.cap),L(f.saldo)]),foot:[['','Totales',L(p.total),L(p.ti),L(p.P),'']],
      styles:{fontSize:8.5,cellPadding:3.5},headStyles:{fillColor:[23,63,44]},footStyles:{fillColor:[238,243,239],textColor:20,fontStyle:'bold'},alternateRowStyles:{fillColor:[247,249,247]},didParseCell:d=>{if(d.column.index>=2)d.cell.styles.halign='right'}});
    doc.setFontSize(8);doc.setTextColor(100);doc.text(doc.splitTextToSize('Estimación informativa; no constituye aprobación del crédito. No incluye comisión, seguro ni otros cargos. Las condiciones finales las establece el comité de crédito de CACIH.',pw-72),36,doc.lastAutoTable.finalY+18);
    const nom=`Plan_de_pagos_${(m.nombre||'cliente').replace(/\s+/g,'_')}_${p.P}_${p.n0}m.pdf`;
    if(compartir){await compartirPlan(doc,nom,p,m)}else{doc.save(nom);toast('Plan de pagos descargado')}}
  catch(e){toast(errMsg(e),4000)}finally{btn.disabled=false;btn.textContent=txt}}
document.addEventListener('input',e=>{const el=e.target;if(el.dataset.sim&&S.sim&&el.type!=='radio'){S.sim[el.dataset.sim]=el.value;simRefrescar()}});
document.addEventListener('change',e=>{const el=e.target;if(el.dataset.sim&&S.sim&&el.type==='radio'){S.sim[el.dataset.sim]=el.value;render()}});
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t||!S.session)return;
  if(t.dataset.simplazo){S.sim.plazo=t.dataset.simplazo;render()}
  if(t.id==='simPdf')simPdf(t);
  if(t.id==='simWa')simPdf(t,true);
  if(t.id==='simPrint'){const pr=$('#print');pr.innerHTML=planHTML();window.print()}
  if(t.id==='simUsar'){const m=S.sim;cAbrir();Object.assign(S.cdraft.cond,{producto:m.producto||'',monto:String(m.monto),plazo:String(m.plazo),tasa:String(m.tasa),tasaTipo:m.tasaTipo,forma:m.forma,metodo:m.metodo,comision:String(m.comision||''),seguro:String(m.seguro||'')});cSave();S.cstep=0;S.csent=null;setView('credito');toast('Condiciones copiadas a la solicitud de crédito')}
  if(t.id==='crVerPlan'){const k=S.cdraft.cond;simDesde({producto:k.producto||'',celular:S.cdraft.cli.cel1||'',comision:k.comision,seguro:k.seguro,monto:k.monto,plazo:k.plazo,tasa:k.tasa,tasaTipo:k.tasaTipo,forma:k.forma==='Quincenal'?'Quincenal':'Mensual',metodo:k.metodo||METODOS[0]},nombreDe(S.cdraft.cli))}
  if(t.id==='crPlan'&&S.cdetail){const s=S.cdetail.s,r=s.resolucion?.decision==='Aprobado'?s.resolucion:null,k=s.datos?.cond||{},b=r||{monto:s.monto_solicitado,plazo:s.plazo_meses,tasa:k.tasa,tasaTipo:k.tasaTipo,forma:k.forma,metodo:k.metodo};
    simDesde({celular:s.datos?.cli?.cel1||'',comision:k.comision,seguro:k.seguro,monto:String(b.monto),plazo:String(b.plazo),tasa:String(b.tasa??''),tasaTipo:b.tasaTipo||'Mensual',forma:b.forma==='Quincenal'?'Quincenal':'Mensual',metodo:b.metodo||METODOS[0]},s.nombres+' '+s.apellidos)}
});


/* =====================================================================
   v1.7 · productos, capacidad de pago, análisis, cruce con socios, WhatsApp
   ===================================================================== */
const ANALISIS=[['buro','Buró de crédito consultado'],['visita','Visita al negocio o vivienda'],['documentos','Documentos completos'],['referencias','Referencias verificadas'],['capacidad','Capacidad de pago revisada']];
const prodPorNombre=n=>(S.params.productos||[]).find(p=>p.nombre===n)||null;
const cProducto=()=>S.cdraft?prodPorNombre(S.cdraft.cond.producto):null;
const simProducto=()=>S.sim?prodPorNombre(S.sim.producto):null;
function prodResumen(p){return [`Tasa ${p.tasa} % ${String(p.tasaTipo||'Mensual').toLowerCase()}`,num(p.montoMin)>0?'desde '+L(p.montoMin):'',num(p.montoMax)>0?'hasta '+L(p.montoMax):'',num(p.plazoMax)>0?'plazo hasta '+p.plazoMax+' meses':''].filter(Boolean).join(' · ')}
function capacidad(x,cuota,forma){const ing=num(x.ingMes),g=num(x.gastosMes),dd=num(x.deudasMes);if(!(ing>0))return{disponible:null,relacion:null};
  const disp=ing-g-dd,cm=forma==='Quincenal'?cuota*2:cuota;return{ingresos:ing,gastos:g,deudas:dd,disponible:Math.round(disp*100)/100,cuotaMes:Math.round(cm*100)/100,relacion:cm>0&&disp>0?Math.round(cm/disp*1000)/10:cm>0?999:null}}
function vCapacidad(c){const k=c.cond,x=c.cli,cu=cuotaEst(k.monto,k.plazo,k.tasa,k.tasaTipo,k.forma,k.metodo),cap=capacidad(x,cu,k.forma),lim=Number(S.params.limite_cuota_ingreso)||40;
  if(cap.disponible==null)return '<p class="hint" style="margin:0">Con ingresos y gastos, la app calcula si la cuota es pagable.</p>';
  if(cap.disponible<=0)return `<div class="warnnote">Los gastos y deudas igualan o superan los ingresos (disponible ${L(cap.disponible)}). El comité difícilmente aprobará la cuota.</div>`;
  if(!cu)return `<div class="note">Disponible cada mes: <b>${L(cap.disponible)}</b>. Indique la tasa en el paso 1 para comparar con la cuota.</div>`;
  return `<div class="${cap.relacion>lim?'warnnote':'note'}">Disponible cada mes: <b>${L(cap.disponible)}</b> · cuota ${L(cap.cuotaMes)} = <b>${cap.relacion} %</b> del disponible. ${cap.relacion>lim?`Supera el ${lim} % recomendado: considere un plazo mayor o un monto menor.`:`Dentro del ${lim} % recomendado.`}</div>`}
function vCapDetalle(s){const c=s.datos?.capacidad,lim=Number(S.params.limite_cuota_ingreso)||40;if(!c||c.disponible==null)return '';
  return `<div class="card" style="margin-top:14px"><h3>Capacidad de pago</h3><div class="kpis mini">${[['Ingresos',L(c.ingresos)],['Gastos',L(c.gastos)],['Otras deudas',L(c.deudas)],['Disponible',L(c.disponible)],['Cuota estimada / mes',L(c.cuotaMes)],['Cuota / disponible',c.relacion!=null?c.relacion+' %':'—']].map(([a,b])=>`<div><span>${a}</span><b class="num">${b}</b></div>`).join('')}</div>${c.relacion>lim?`<div class="warnnote" style="margin-top:10px">La cuota supera el ${lim} % del ingreso disponible.</div>`:''}</div>`}
function vRelacion(){const{s,soc,otros,comoFiador}=S.cdetail,ap=soc.find(x=>x.estado==='Aprobada');
  const lin=[];
  lin.push(ap?`<li><b>Es socio/a de CACIH</b> · código <span class="mono">${esc(ap.codigo_socio||ap.folio)}</span> · ${esc(ap.tipo_cuenta||'')} desde ${fecha(ap.revisado_en||ap.creado_en)}</li>`:soc.length?`<li>Tiene solicitud de afiliación <b>${esc(soc[0].estado.toLowerCase())}</b> (<span class="mono">${esc(soc[0].folio)}</span>)</li>`:'<li><b>No es socio/a</b> de CACIH.</li>');
  otros.forEach(o=>lin.push(`<li>Otra solicitud de crédito <span class="mono">${esc(o.folio)}</span> · ${L(o.monto_solicitado)} · ${esc(o.estado)} · ${fecha(o.creado_en)}</li>`));
  comoFiador.forEach(o=>lin.push(`<li>Es <b>fiador/a</b> en <span class="mono">${esc(o.folio)}</span> de ${esc(o.nombres+' '+o.apellidos)} · ${esc(o.estado)}</li>`));
  return `<div class="card" style="margin-top:14px"><h3>Relación con CACIH</h3><ul class="log" style="margin-top:6px">${lin.join('')}</ul></div>`}
function vAnalisis(){const{s}=S.cdetail,a=S.cana;if(s.estado!=='Pendiente'&&!s.analisis)return '';const ro=s.estado!=='Pendiente';
  return `<div class="card" style="margin-top:14px"><h3>Análisis de crédito${s.analizado_en?` <span class="hint">· guardado ${fechaHora(s.analizado_en)}</span>`:''}</h3>
  <div class="grid" style="margin-top:8px">${ANALISIS.map(([k,t])=>`<label class="check" style="margin:0"><input type="checkbox" data-cana="${k}" ${a.lista[k]?'checked':''} ${ro?'disabled':''}><span>${t}</span></label>`).join('')}
  <div class="f full"><label class="t" for="crAnaNota">Notas del análisis</label><textarea id="crAnaNota" rows="2" data-cananota="1" ${ro?'disabled':''}>${esc(a.nota||'')}</textarea></div></div>
  ${ro?'':`<div class="rowbtns"><span class="hint">Marca la solicitud como "En análisis" y deja constancia en el historial.</span><button id="crAnaGuardar">Guardar análisis</button></div>`}</div>`}
function progreso(i,n){const p=Math.round((i+1)/n*100);return `<div class="prog" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100" aria-label="Avance del formulario"><i style="width:${p}%"></i></div>`}
function ejemploCredito(){const c=cBlank(),x=c.cli;Object.assign(c.cond,{monto:'25000',plazo:'18',tasa:'2',forma:'Mensual',garantia:'Fiduciaria (fiador solidario)',clasif:'Agropecuario',destino:'Compra de semilla y fertilizante para 3 manzanas de maíz',comision:'250'});
  const p=(S.params.productos||[])[0];if(p){c.cond.producto=p.nombre;c.cond.tasa=String(p.tasa);c.cond.tasaTipo=p.tasaTipo||'Mensual'}
  Object.assign(x,{n1:'Juana',n2:'María',a1:'Ejemplo',a2:'Práctica',lugarNac:'Juticalpa, Olancho',nac:'1988-05-10',dni:'1501198800123',educ:'Primaria',civil:'Soltero/a',municipio:'Juticalpa',barrio:'El Centro',refUbic:'Frente a la escuela, casa verde',cel1:'9999-0000',vivienda:'Casa propia',tiempoRes:'60',remesas:'No',ingresosDesc:'Siembra de maíz y frijol; venta de tortillas',pagoFuente:'Cosecha y ventas diarias',ingMes:'12000',gastosMes:'6000',deudasMes:'0',cuentas:'No',vehiculo:'No',otrosBienes:'No'});
  x.patronos[0]={nombre:'Parcela propia',tel:'',dir:'Aldea El Rosario',cargo:'Productora',ant:'60'};x.refs=[{n:'Rosa Díaz',p:'Vecina',tel:'3344-5566'},{n:'Luis Ejemplo',p:'Hermano',tel:'9911-0000'}];x.emergencia={n:'Luis Ejemplo',donde:'Catacamas',tel:'9911-0000'};
  c.garantiaDesc='Fiador solidario con empleo fijo';const f=c.fiadores[0];Object.assign(f,{n1:'Pedro',a1:'Fiador',lugarNac:'Catacamas',nac:'1975-02-01',dni:'1503197500456',civil:'Soltero/a',direccion:'Barrio Abajo',municipio:'Catacamas',cel1:'9888-1111',vivienda:'Casa propia',remesas:'No',cuentas:'No',terrenos:'No',vehiculo:'No'});f.patronos[0].nombre='Taller Fiador';return c}
async function compartirPlan(doc,nom,p,m){
  const per=p.quin?'quincenal':'mensual',txt=`CACIH · Plan de pagos estimado${m.nombre?' para '+m.nombre:''}: ${L(p.P)} a ${p.n0} meses, cuota ${per} ${L(p.c1)}, total a pagar ${L(p.total)}. Cálculo informativo; la cuota definitiva la fija el comité de crédito.`;
  const blob=doc.output('blob'),file=new File([blob],nom,{type:'application/pdf'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:'Plan de pagos CACIH',text:txt});return}catch(e){if(e.name==='AbortError')return}}
  doc.save(nom);const cel=String(m.celular||'').replace(/\D/g,'');window.open(`https://wa.me/${cel.length===8?'504'+cel:cel}?text=${encodeURIComponent(txt+' (Le envío el PDF a continuación.)')}`,'_blank','noopener');toast('PDF descargado: adjúntelo en el chat de WhatsApp',6000)}
document.addEventListener('change',e=>{const el=e.target;
  if(el.dataset.cprod&&S.cdraft){const p=prodPorNombre(el.value),k=S.cdraft.cond;k.producto=el.value;if(p){k.tasa=String(p.tasa);k.tasaTipo=p.tasaTipo||'Mensual';if(!k.clasif)k.clasif=p.nombre}cSave();render()}
  if(el.dataset.smprod&&S.sim){const p=prodPorNombre(el.value);S.sim.producto=el.value;if(p){S.sim.tasa=String(p.tasa);S.sim.tasaTipo=p.tasaTipo||'Mensual'}render()}
  if(el.dataset.cana&&S.cana){S.cana.lista[el.dataset.cana]=el.checked}});
document.addEventListener('input',e=>{const el=e.target;
  if(el.dataset.cananota&&S.cana)S.cana.nota=el.value;
  const md=el.dataset.cp&&el.dataset.cp.match(/^(.*)\.(dni|nac)$/);if(md&&S.cdraft){const b=document.getElementById('dck_'+pid(md[1])),x=gp(S.cdraft,md[1]);if(b)b.innerHTML=dniCasilla(x.dni,x.nac,`data-cpk="${md[1]}.dniConfirm"`,x.dniConfirm)}
  if(el.dataset.cp&&/^cli\.(ingMes|gastosMes|deudasMes)$/.test(el.dataset.cp)){const b=$('#capPago');if(b)b.innerHTML=vCapacidad(S.cdraft)}});
document.addEventListener('click',async e=>{const t=e.target.closest('button');if(!t||!S.session)return;
  if(t.id==='crEjemplo'){S.cdraft=ejemploCredito();cSave();S.cstep=0;S.cerrors={};render();toast('Ejemplo cargado: recorra los pasos')}
  if(t.id==='crAnaGuardar'){t.disabled=true;const{error}=await sb.rpc('guardar_analisis',{p_id:S.copen,p_analisis:S.cana});if(error){toast(errMsg(error),5000);t.disabled=false;return}toast('Análisis guardado');loadCredDetail(S.copen)}});

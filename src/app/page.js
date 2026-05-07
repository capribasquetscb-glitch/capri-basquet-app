'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_PIN = '2024capri'

function fmt(n) {
  return '$' + Math.round(n || 0).toLocaleString('es-AR')
}

function fmtFecha(f) {
  if (!f) return ''
  const d = new Date(f + 'T00:00:00')
  return d.toLocaleDateString('es-AR')
}

function Recibo({ pago, onClose }) {
  const imprimir = () => window.print()
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="recibo">
          <div className="recibo-header">
            <div className="recibo-title">Subcomisión de Básquet</div>
            <div style={{fontSize:'0.9rem', color:'#555'}}>Club CAPRI — Posadas, Misiones</div>
            <div className="recibo-nro">Recibo N° {String(pago.nro_recibo).padStart(5,'0')}</div>
          </div>
          <div className="recibo-row"><span>Fecha</span><span>{new Date(pago.fecha_pago).toLocaleString('es-AR')}</span></div>
          <div className="recibo-row"><span>Jugador</span><span>{pago.jugadores?.nombre}</span></div>
          <div className="recibo-row"><span>Categoría</span><span>{pago.jugadores?.categorias?.nombre}</span></div>
          <div className="recibo-row"><span>Campaña</span><span>{pago.campanas?.nombre}</span></div>
          <div className="recibo-row"><span>Medio de pago</span><span style={{textTransform:'capitalize'}}>{pago.medio_pago}</span></div>
          {pago.observaciones && <div className="recibo-row"><span>Observaciones</span><span>{pago.observaciones}</span></div>}
          <div className="recibo-total"><span>Total recibido</span><span style={{color:'#0f6e56'}}>{fmt(pago.monto)}</span></div>
          <div className="recibo-footer">
            Recibo emitido por {pago.usuarios?.nombre}<br/>
            Gracias por tu contribución al básquet de CAPRI
          </div>
        </div>
        <div className="modal-actions" style={{marginTop:'1rem'}}>
          <button className="btn btn-small" onClick={imprimir}>Imprimir / PDF</button>
          <button className="btn btn-primary" style={{margin:0}} onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [tab, setTab] = useState('panel')
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminNombre, setAdminNombre] = useState('')
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [campanas, setCampanas] = useState([])
  const [gastos, setGastos] = useState([])
  const [jugadores, setJugadores] = useState([])
  const [categorias, setCategorias] = useState([])
  const [objetivos, setObjetivos] = useState([])
  const [reciboVisible, setReciboVisible] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  // Forms nueva campaña
  const [ncNombre, setNcNombre] = useState('')
  const [ncFecha, setNcFecha] = useState('')
  const [ncMeta, setNcMeta] = useState('')
  const [ncObjetivo, setNcObjetivo] = useState('')
  const [ncJugadores, setNcJugadores] = useState([])

  // Forms nuevo gasto
  const [ngDesc, setNgDesc] = useState('')
  const [ngFecha, setNgFecha] = useState('')
  const [ngMonto, setNgMonto] = useState('')
  const [ngCat, setNgCat] = useState('transporte')
  const [ngMedio, setNgMedio] = useState('efectivo')
  const [ngObjetivo, setNgObjetivo] = useState('')
  const [ngComp, setNgComp] = useState('')

  // Forms nuevo objetivo
  const [noNombre, setNoNombre] = useState('')
  const [noDesc, setNoDesc] = useState('')
  const [noMeta, setNoMeta] = useState('')
  const [noFecha, setNoFecha] = useState('')

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    setLoading(true)
    const [c, g, j, cat, obj] = await Promise.all([
      supabase.from('campanas').select('*, objetivos(nombre), pagos(monto, estado)').order('fecha', {ascending: false}),
      supabase.from('gastos').select('*, objetivos(nombre), usuarios(nombre)').order('fecha', {ascending: false}),
      supabase.from('jugadores').select('*, categorias(nombre, genero)').eq('activo', true).order('nombre'),
      supabase.from('categorias').select('*').eq('activo', true).order('nombre'),
      supabase.from('objetivos').select('*').order('created_at', {ascending: false}),
    ])
    setCampanas(c.data || [])
    setGastos(g.data || [])
    setJugadores(j.data || [])
    setCategorias(cat.data || [])
    setObjetivos(obj.data || [])
    setLoading(false)
  }

  function loginAdmin() {
    if (pinInput === ADMIN_PIN) {
      setIsAdmin(true)
      setPinError('')
      setTab('campanas-admin')
    } else {
      setPinError('PIN incorrecto')
    }
  }

  function logoutAdmin() {
    setIsAdmin(false)
    setAdminNombre('')
    setPinInput('')
    setTab('panel')
  }

  const totalRecaudado = campanas.reduce((a, c) => {
    const pagosValidos = (c.pagos || []).filter(p => p.estado === 'emitido')
    return a + pagosValidos.reduce((s, p) => s + (p.monto || 0), 0)
  }, 0)

  const totalGastos = gastos.reduce((a, g) => a + (g.monto || 0), 0)
  const saldo = totalRecaudado - totalGastos

  async function guardarObjetivo() {
    if (!noNombre) { setMsg('Completá el nombre del objetivo'); return }
    const { error } = await supabase.from('objetivos').insert({
      nombre: noNombre, descripcion: noDesc,
      meta_monto: noMeta || null, fecha_objetivo: noFecha || null
    })
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('✓ Objetivo guardado')
    setNoNombre(''); setNoDesc(''); setNoMeta(''); setNoFecha('')
    cargarDatos()
    setTimeout(() => setMsg(''), 3000)
  }

  async function guardarCampana() {
    if (!ncNombre || !ncFecha) { setMsg('Completá nombre y fecha'); return }
    const { data: camp, error } = await supabase.from('campanas').insert({
      nombre: ncNombre, fecha: ncFecha,
      meta_monto: ncMeta || null, objetivo_id: ncObjetivo || null
    }).select().single()
    if (error) { setMsg('Error: ' + error.message); return }

    for (const j of ncJugadores) {
      if (!j.jugador_id || !j.monto) continue
      await supabase.from('pagos').insert({
        campana_id: camp.id, jugador_id: j.jugador_id,
        monto: j.monto, medio_pago: j.medio_pago || 'efectivo',
        observaciones: j.obs || null,
        usuarios: adminNombre
      })
    }
    setMsg('✓ Campaña guardada')
    setNcNombre(''); setNcFecha(''); setNcMeta(''); setNcObjetivo(''); setNcJugadores([])
    cargarDatos()
    setTimeout(() => setMsg(''), 3000)
  }

  async function guardarGasto() {
    if (!ngDesc || !ngFecha || !ngMonto) { setMsg('Completá todos los campos'); return }
    const { error } = await supabase.from('gastos').insert({
      descripcion: ngDesc, fecha: ngFecha, monto: ngMonto,
      categoria: ngCat, medio_pago: ngMedio,
      objetivo_id: ngObjetivo || null, nro_comprobante: ngComp || null
    })
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('✓ Gasto registrado')
    setNgDesc(''); setNgFecha(''); setNgMonto(''); setNgComp(''); setNgObjetivo('')
    cargarDatos()
    setTimeout(() => setMsg(''), 3000)
  }

  function addJugadorRow() {
    setNcJugadores([...ncJugadores, { jugador_id: '', monto: '', medio_pago: 'efectivo', obs: '' }])
  }

  function updateJugador(i, field, val) {
    const arr = [...ncJugadores]
    arr[i][field] = val
    setNcJugadores(arr)
  }

  function removeJugador(i) {
    setNcJugadores(ncJugadores.filter((_, idx) => idx !== i))
  }

  const totalCampana = ncJugadores.reduce((a, j) => a + (parseFloat(j.monto) || 0), 0)

  function catBadge(genero) {
    if (genero === 'F') return 'badge-pink'
    if (genero === 'Mixto') return 'badge-purple'
    return 'badge-blue'
  }

  async function verRecibo(pagoId) {
    const { data } = await supabase.from('pagos')
      .select('*, jugadores(nombre, categorias(nombre)), campanas(nombre), usuarios(nombre)')
      .eq('id', pagoId).single()
    setReciboVisible(data)
  }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#1a1a2e',color:'white',fontSize:'1.1rem'}}>
      Cargando...
    </div>
  )

  return (
    <>
      {reciboVisible && <Recibo pago={reciboVisible} onClose={() => setReciboVisible(null)} />}

      <div className="header">
        <div className="header-logo">
          <div className="logo-circle">CB</div>
          <div>
            <div className="header" style={{padding:0,background:'none',boxShadow:'none',position:'static'}}>
              <h1>Básquet CAPRI</h1>
            </div>
            <p>Subcomisión · Posadas, Misiones</p>
          </div>
        </div>
        {isAdmin ? (
          <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
            <span style={{fontSize:'0.8rem',opacity:0.8}}>Admin: {adminNombre || 'Admin'}</span>
            <button className="btn btn-small" onClick={logoutAdmin} style={{color:'white',borderColor:'rgba(255,255,255,0.3)'}}>Salir</button>
          </div>
        ) : (
          <button className="btn btn-small" onClick={() => setTab('login')} style={{color:'white',borderColor:'rgba(255,255,255,0.3)'}}>
            Admin
          </button>
        )}
      </div>

      <div className="tabs">
        <button className={`tab ${tab==='panel'?'active':''}`} onClick={() => setTab('panel')}>Panel público</button>
        <button className={`tab ${tab==='campanas'?'active':''}`} onClick={() => setTab('campanas')}>Campañas</button>
        <button className={`tab ${tab==='gastos'?'active':''}`} onClick={() => setTab('gastos')}>Gastos</button>
        {isAdmin && <>
          <button className={`tab ${tab==='campanas-admin'?'active':''}`} onClick={() => setTab('campanas-admin')}>+ Campaña</button>
          <button className={`tab ${tab==='gastos-admin'?'active':''}`} onClick={() => setTab('gastos-admin')}>+ Gasto</button>
          <button className={`tab ${tab==='objetivos-admin'?'active':''}`} onClick={() => setTab('objetivos-admin')}>Objetivos</button>
        </>}
        {!isAdmin && <button className={`tab ${tab==='login'?'active':''}`} onClick={() => setTab('login')}>🔒 Admin</button>}
      </div>

      <div className="container">
        {msg && <div className={`alert ${msg.startsWith('✓')?'alert-success':'alert-error'}`}>{msg}</div>}

        {/* PANEL PÚBLICO */}
        {tab === 'panel' && (
          <>
            <div className="metrics">
              <div className="metric-card">
                <div className="metric-label">Total recaudado</div>
                <div className="metric-value green">{fmt(totalRecaudado)}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Total gastos</div>
                <div className="metric-value red">{fmt(totalGastos)}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Saldo disponible</div>
                <div className={`metric-value ${saldo >= 0 ? 'green' : 'red'}`}>{fmt(saldo)}</div>
              </div>
            </div>

            {objetivos.filter(o => o.estado === 'activo').length > 0 && (
              <>
                <div className="group-label">Objetivos activos</div>
                {objetivos.filter(o => o.estado === 'activo').map(obj => {
                  const campObj = campanas.filter(c => c.objetivo_id === obj.id)
                  const recaudado = campObj.reduce((a, c) => {
                    return a + (c.pagos || []).filter(p => p.estado === 'emitido').reduce((s, p) => s + p.monto, 0)
                  }, 0)
                  const pct = obj.meta_monto ? Math.min(100, Math.round(recaudado / obj.meta_monto * 100)) : null
                  return (
                    <div key={obj.id} className="card">
                      <div className="card-header">
                        <div>
                          <div className="card-title">{obj.nombre}</div>
                          {obj.descripcion && <div className="card-meta">{obj.descripcion}</div>}
                          {obj.fecha_objetivo && <div className="card-meta">Fecha: {fmtFecha(obj.fecha_objetivo)}</div>}
                        </div>
                        {pct !== null && <span className={`badge ${pct>=100?'badge-green':pct>=50?'badge-amber':'badge-red'}`}>{pct}%</span>}
                      </div>
                      {obj.meta_monto && <div className="progress-bar"><div className="progress-fill" style={{width:`${pct}%`}}></div></div>}
                      <div className="row-item">
                        <span style={{color:'#888'}}>Recaudado para este objetivo</span>
                        <span style={{fontWeight:600,color:'#0f6e56'}}>{fmt(recaudado)}</span>
                      </div>
                      {obj.meta_monto && <div className="row-item">
                        <span style={{color:'#888'}}>Meta</span>
                        <span style={{fontWeight:600}}>{fmt(obj.meta_monto)}</span>
                      </div>}
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}

        {/* CAMPAÑAS PÚBLICAS */}
        {tab === 'campanas' && (
          campanas.length === 0 ? <div className="empty">No hay campañas registradas aún.</div> :
          campanas.map(c => {
            const recaudado = (c.pagos || []).filter(p => p.estado === 'emitido').reduce((a, p) => a + p.monto, 0)
            const pct = c.meta_monto ? Math.min(100, Math.round(recaudado / c.meta_monto * 100)) : null
            return (
              <div key={c.id} className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">{c.nombre}</div>
                    <div className="card-meta">{fmtFecha(c.fecha)}{c.objetivos ? ' · ' + c.objetivos.nombre : ''}</div>
                  </div>
                  <span className={`badge ${c.estado==='abierta'?'badge-green':'badge-amber'}`}>{c.estado}</span>
                </div>
                {c.meta_monto && <div className="progress-bar"><div className="progress-fill" style={{width:`${pct}%`}}></div></div>}
                <div className="row-item">
                  <span style={{color:'#888'}}>Total recaudado</span>
                  <span style={{fontWeight:700,color:'#0f6e56'}}>{fmt(recaudado)}</span>
                </div>
                {c.meta_monto && <div className="row-item">
                  <span style={{color:'#888'}}>Meta</span>
                  <span>{fmt(c.meta_monto)}</span>
                </div>}
              </div>
            )
          })
        )}

        {/* GASTOS PÚBLICOS */}
        {tab === 'gastos' && (
          gastos.length === 0 ? <div className="empty">No hay gastos registrados aún.</div> :
          <div className="card">
            {gastos.map(g => (
              <div key={g.id} className="row-item">
                <div>
                  <div style={{fontWeight:500}}>{g.descripcion}</div>
                  <div style={{fontSize:'0.8rem',color:'#888'}}>{fmtFecha(g.fecha)} · {g.categoria} · {g.medio_pago}</div>
                </div>
                <span style={{fontWeight:700,color:'#993c1d'}}>{fmt(g.monto)}</span>
              </div>
            ))}
          </div>
        )}

        {/* LOGIN */}
        {tab === 'login' && !isAdmin && (
          <div style={{maxWidth:'380px',margin:'3rem auto'}}>
            <div className="card">
              <div className="card-title" style={{marginBottom:'1.5rem'}}>🔒 Acceso administradores</div>
              <div className="form-group">
                <label className="form-label">Tu nombre</label>
                <input className="form-input" value={adminNombre} onChange={e => setAdminNombre(e.target.value)} placeholder="Ej: Daniel Herger" />
              </div>
              <div className="form-group">
                <label className="form-label">PIN de administrador</label>
                <input className="form-input" type="password" value={pinInput} onChange={e => setPinInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loginAdmin()} placeholder="••••••••" />
              </div>
              {pinError && <div className="alert alert-error">{pinError}</div>}
              <button className="btn btn-primary" onClick={loginAdmin}>Ingresar</button>
            </div>
          </div>
        )}

        {/* NUEVA CAMPAÑA */}
        {tab === 'campanas-admin' && isAdmin && (
          <div className="card">
            <div className="card-title" style={{marginBottom:'1.25rem'}}>Nueva campaña de recaudación</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Nombre de la campaña</label>
                <input className="form-input" value={ncNombre} onChange={e => setNcNombre(e.target.value)} placeholder="Ej: Venta de pizzas" />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input className="form-input" type="date" value={ncFecha} onChange={e => setNcFecha(e.target.value)} />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Meta de recaudación (opcional)</label>
                <input className="form-input" type="number" value={ncMeta} onChange={e => setNcMeta(e.target.value)} placeholder="$0" />
              </div>
              <div className="form-group">
                <label className="form-label">Objetivo / destino (opcional)</label>
                <select className="form-input" value={ncObjetivo} onChange={e => setNcObjetivo(e.target.value)}>
                  <option value="">Sin objetivo específico</option>
                  {objetivos.filter(o => o.estado === 'activo').map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Pagos por jugador</label>
              {ncJugadores.map((j, i) => (
                <div key={i} className="cp-row">
                  <select className="form-input" value={j.jugador_id} onChange={e => updateJugador(i, 'jugador_id', e.target.value)}>
                    <option value="">Seleccionar jugador...</option>
                    {categorias.map(cat => (
                      <optgroup key={cat.id} label={cat.nombre}>
                        {jugadores.filter(ju => ju.categoria_id === cat.id).map(ju => (
                          <option key={ju.id} value={ju.id}>{ju.nombre}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <input className="form-input" type="number" placeholder="$0" style={{width:'110px'}}
                    value={j.monto} onChange={e => updateJugador(i, 'monto', e.target.value)} />
                  <select className="form-input" style={{width:'130px'}} value={j.medio_pago} onChange={e => updateJugador(i, 'medio_pago', e.target.value)}>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="otro">Otro</option>
                  </select>
                  <button className="btn-danger" onClick={() => removeJugador(i)}>✕</button>
                </div>
              ))}
              <button className="btn-add" onClick={addJugadorRow}>+ Agregar jugador</button>
              <div className="running-total">Total: {fmt(totalCampana)}</div>
            </div>
            <button className="btn btn-primary" onClick={guardarCampana}>Guardar campaña</button>
          </div>
        )}

        {/* NUEVO GASTO */}
        {tab === 'gastos-admin' && isAdmin && (
          <div className="card">
            <div className="card-title" style={{marginBottom:'1.25rem'}}>Registrar gasto</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input className="form-input" value={ngDesc} onChange={e => setNgDesc(e.target.value)} placeholder="Ej: Colectivo viaje Eldorado" />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input className="form-input" type="date" value={ngFecha} onChange={e => setNgFecha(e.target.value)} />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Monto</label>
                <input className="form-input" type="number" value={ngMonto} onChange={e => setNgMonto(e.target.value)} placeholder="$0" />
              </div>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select className="form-input" value={ngCat} onChange={e => setNgCat(e.target.value)}>
                  <option value="transporte">Transporte</option>
                  <option value="indumentaria">Indumentaria</option>
                  <option value="inscripcion">Inscripción / Afiliación</option>
                  <option value="arbitros">Árbitros</option>
                  <option value="alimentos">Alimentos</option>
                  <option value="material_deportivo">Material deportivo</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Medio de pago</label>
                <select className="form-input" value={ngMedio} onChange={e => setNgMedio(e.target.value)}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">N° comprobante (opcional)</label>
                <input className="form-input" value={ngComp} onChange={e => setNgComp(e.target.value)} placeholder="Ej: 0001-00012345" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Objetivo / destino (opcional)</label>
              <select className="form-input" value={ngObjetivo} onChange={e => setNgObjetivo(e.target.value)}>
                <option value="">Sin objetivo específico</option>
                {objetivos.filter(o => o.estado === 'activo').map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={guardarGasto}>Guardar gasto</button>
          </div>
        )}

        {/* OBJETIVOS */}
        {tab === 'objetivos-admin' && isAdmin && (
          <>
            <div className="card">
              <div className="card-title" style={{marginBottom:'1.25rem'}}>Nuevo objetivo / destino de fondos</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Nombre del objetivo</label>
                  <input className="form-input" value={noNombre} onChange={e => setNoNombre(e.target.value)} placeholder="Ej: Viaje noviembre 2025" />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha objetivo (opcional)</label>
                  <input className="form-input" type="date" value={noFecha} onChange={e => setNoFecha(e.target.value)} />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Meta de dinero (opcional)</label>
                  <input className="form-input" type="number" value={noMeta} onChange={e => setNoMeta(e.target.value)} placeholder="$0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción (opcional)</label>
                  <input className="form-input" value={noDesc} onChange={e => setNoDesc(e.target.value)} placeholder="Detalle del objetivo" />
                </div>
              </div>
              <button className="btn btn-primary" onClick={guardarObjetivo}>Guardar objetivo</button>
            </div>

            <div className="group-label">Objetivos registrados</div>
            {objetivos.length === 0 ? <div className="empty">No hay objetivos aún.</div> :
              objetivos.map(o => (
                <div key={o.id} className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">{o.nombre}</div>
                      {o.descripcion && <div className="card-meta">{o.descripcion}</div>}
                    </div>
                    <span className={`badge ${o.estado==='activo'?'badge-green':'badge-amber'}`}>{o.estado}</span>
                  </div>
                  {o.meta_monto && <div className="row-item"><span style={{color:'#888'}}>Meta</span><span>{fmt(o.meta_monto)}</span></div>}
                  {o.fecha_objetivo && <div className="row-item"><span style={{color:'#888'}}>Fecha</span><span>{fmtFecha(o.fecha_objetivo)}</span></div>}
                </div>
              ))
            }
          </>
        )}
      </div>
    </>
  )
}

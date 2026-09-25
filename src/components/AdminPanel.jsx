import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function AdminPanel() {
  const { profile: myProfile } = useAuth();
  const [players, setPlayers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [emailDrafts, setEmailDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [linking, setLinking] = useState(false);
  const [msg, setMsg] = useState(null);

  async function loadAll() {
    const [{ data: pl }, { data: pr }] = await Promise.all([
      supabase
        .from('players')
        .select('id, number, name, email, auth_user_id, active')
        .order('number'),
      supabase
        .from('profiles')
        .select('id, full_name, email, role, player_id')
        .order('full_name'),
    ]);
    setPlayers(pl ?? []);
    setProfiles(pr ?? []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function guardarEmail(player) {
    const email = (emailDrafts[player.id] ?? player.email ?? '').trim();
    setBusyId(player.id);
    const { error } = await supabase
      .from('players')
      .update({ email: email || null })
      .eq('id', player.id);
    setBusyId(null);
    if (error) {
      setMsg({ type: 'error', text: 'No se pudo guardar: ' + error.message });
      return;
    }
    setMsg({ type: 'ok', text: `Email guardado para #${player.number} ${player.name}.` });
    loadAll();
  }

  async function vincularCuentas() {
    setLinking(true);
    setMsg(null);
    const { data, error } = await supabase.rpc('link_accounts_by_email');
    setLinking(false);
    if (error) {
      setMsg({ type: 'error', text: 'No se pudo vincular: ' + error.message });
      return;
    }
    setMsg({
      type: 'ok',
      text: data > 0 ? `Se vincularon ${data} cuenta(s) nueva(s).` : 'No había cuentas nuevas para vincular.',
    });
    loadAll();
  }

  async function cambiarRol(p, nuevoRol) {
    setBusyId(p.id);
    const { error } = await supabase.from('profiles').update({ role: nuevoRol }).eq('id', p.id);
    setBusyId(null);
    if (error) {
      setMsg({ type: 'error', text: 'No se pudo actualizar: ' + error.message });
      return;
    }
    setMsg({
      type: 'ok',
      text: `${p.full_name || p.email || 'La cuenta'} ahora ${nuevoRol === 'admin' ? 'es admin' : 'es jugadora (sin permisos de carga)'}.`,
    });
    loadAll();
  }

  function jugadoraVinculada(playerId) {
    const p = players.find((pl) => pl.id === playerId);
    return p ? `#${p.number} ${p.name}` : null;
  }

  return (
    <div className="admin-panel">
      <h1>Panel Admin</h1>

      {msg && <div className={`flash flash-${msg.type === 'error' ? 'error' : 'ok'}`}>{msg.text}</div>}

      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Vincular jugadoras por email</h2>
          <button className="btn-ghost" onClick={vincularCuentas} disabled={linking}>
            {linking ? 'Vinculando…' : '🔄 Vincular cuentas'}
          </button>
        </div>
        <p className="chart-subtitle">
          Cargá el email con el que cada jugadora se registró (o se va a registrar) en la app.
          Después tocá "Vincular cuentas": el sistema conecta automáticamente su cuenta con su
          ficha para que vea sus propias estadísticas en "Mi rendimiento".
        </p>

        <div className="admin-table">
          <div className="admin-row admin-row-head">
            <span>#</span>
            <span>Jugadora</span>
            <span>Email</span>
            <span></span>
            <span>Estado</span>
          </div>
          {players.map((p) => (
            <div className="admin-row" key={p.id}>
              <span className="admin-row-number">{p.number}</span>
              <span className="admin-row-name">{p.name}</span>
              <input
                type="email"
                placeholder="email@ejemplo.com"
                defaultValue={p.email ?? ''}
                onChange={(e) => setEmailDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
              />
              <button className="btn-ghost" onClick={() => guardarEmail(p)} disabled={busyId === p.id}>
                Guardar
              </button>
              <span className={`admin-status ${p.auth_user_id ? 'linked' : ''}`}>
                {p.auth_user_id ? '✓ Vinculada' : 'Sin vincular'}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <h2>Usuarias/os registrados y permisos</h2>
        <p className="chart-subtitle">
          Dale permiso de admin a quien tenga que cargar estadísticas en vivo — puede ser una
          jugadora (perfil doble, como Alma #8) o la persona encargada de la planilla.
        </p>

        <div className="admin-table">
          <div className="admin-row admin-row-head">
            <span></span>
            <span>Nombre</span>
            <span>Email</span>
            <span>Jugadora vinculada</span>
            <span>Permiso</span>
          </div>
          {profiles.map((p) => (
            <div className="admin-row" key={p.id}>
              <span className={`admin-role-badge ${p.role}`}>{p.role === 'admin' ? 'Admin' : 'Jug.'}</span>
              <span className="admin-row-name">{p.full_name || '(sin nombre)'}</span>
              <span className="admin-row-email">{p.email || '—'}</span>
              <span className="admin-row-linked">
                {p.player_id ? jugadoraVinculada(p.player_id) : '—'}
              </span>
              {p.role === 'admin' ? (
                <button
                  className="btn-ghost"
                  disabled={busyId === p.id || p.id === myProfile?.id}
                  title={p.id === myProfile?.id ? 'No podés quitarte tu propio permiso' : ''}
                  onClick={() => cambiarRol(p, 'jugadora')}
                >
                  Quitar admin
                </button>
              ) : (
                <button className="btn-ghost" disabled={busyId === p.id} onClick={() => cambiarRol(p, 'admin')}>
                  Hacer admin
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
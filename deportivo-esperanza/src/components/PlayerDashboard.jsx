import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { STAT_GROUPS, efectividadAtaque, efectividadRecepcion, efectividadSaque } from '../utils/statsConfig';
import StatDrilldown from './StatDrilldown';

export default function PlayerDashboard() {
  const { profile, isStaff } = useAuth();
  const [allPlayers, setAllPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(profile?.player_id ?? '');
  const [matchRows, setMatchRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // El cuerpo técnico puede mirar el perfil de cualquier jugadora.
  useEffect(() => {
    if (isStaff) {
      supabase
        .from('players')
        .select('id, number, name')
        .eq('active', true)
        .order('number')
        .then(({ data }) => setAllPlayers(data ?? []));
    }
  }, [isStaff]);

  useEffect(() => {
    if (!isStaff && profile?.player_id) setSelectedPlayerId(profile.player_id);
  }, [isStaff, profile]);

  useEffect(() => {
    if (!selectedPlayerId) {
      setMatchRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('match_stats')
      .select('*, match:matches(id, opponent, match_date, status)')
      .eq('player_id', selectedPlayerId)
      .then(({ data, error }) => {
        if (!error) setMatchRows(data ?? []);
        setLoading(false);
      });
  }, [selectedPlayerId]);

  const totals = useMemo(() => {
    const t = { partidos: matchRows.length };
    STAT_GROUPS.flatMap((g) => g.stats).forEach((s) => {
      t[s.column] = matchRows.reduce((acc, r) => acc + (r[s.column] || 0), 0);
    });
    return t;
  }, [matchRows]);

  if (!isStaff && !profile?.player_id) {
    return (
      <div className="empty-state">
        <h2>Tu cuenta todavía no está vinculada</h2>
        <p>
          Pedile al cuerpo técnico que vincule tu email con tu ficha de jugadora para poder ver
          tus estadísticas.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {isStaff && (
        <div className="dashboard-player-select">
          <label>Jugadora</label>
          <select value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)}>
            <option value="">Elegí una jugadora…</option>
            {allPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.number} — {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && <p className="hint">Cargando estadísticas…</p>}

      {!loading && selectedPlayerId && (
        <>
          <div className="dashboard-summary">
            <div className="summary-card">
              <span className="summary-value">{totals.partidos}</span>
              <span className="summary-label">Partidos con registro</span>
            </div>
            <div className="summary-card">
              <span className="summary-value">{efectividadSaque(totals).toFixed(0)}%</span>
              <span className="summary-label">Efectividad de saque</span>
            </div>
            <div className="summary-card">
              <span className="summary-value">{efectividadAtaque(totals).toFixed(0)}%</span>
              <span className="summary-label">% ataques exitosos</span>
            </div>
            <div className="summary-card">
              <span className="summary-value">{efectividadRecepcion(totals).toFixed(0)}%</span>
              <span className="summary-label">% recepción positiva</span>
            </div>
          </div>

          <div className="dashboard-groups">
            {STAT_GROUPS.map((group) => (
              <div key={group.key} className="dashboard-group">
                <h3>{group.label}</h3>
                {group.stats.map((s) => (
                  <StatDrilldown
                    key={s.column}
                    label={s.label}
                    short={s.short}
                    column={s.column}
                    total={totals[s.column] ?? 0}
                    polarity={s.polarity}
                    matchRows={matchRows}
                  />
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

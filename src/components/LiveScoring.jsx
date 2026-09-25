import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { STAT_GROUPS } from '../utils/statsConfig';

export default function LiveScoring() {
  const [matches, setMatches] = useState([]);
  const [matchId, setMatchId] = useState('');
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [lastActions, setLastActions] = useState([]); // pila para "Deshacer"
  const [flash, setFlash] = useState(null);
  const [newOpponent, setNewOpponent] = useState('');
  const [creatingMatch, setCreatingMatch] = useState(false);

  const loadMatches = useCallback(async () => {
    const { data } = await supabase
      .from('matches')
      .select('id, opponent, match_date, status')
      .order('match_date', { ascending: false });
    setMatches(data ?? []);
    if (!matchId && data?.length) {
      const enCurso = data.find((m) => m.status === 'en_curso');
      setMatchId((enCurso ?? data[0]).id);
    }
  }, [matchId]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  useEffect(() => {
    supabase
      .from('players')
      .select('id, number, name')
      .eq('active', true)
      .order('number')
      .then(({ data }) => setPlayers(data ?? []));
  }, []);

  async function crearPartido(e) {
    e.preventDefault();
    if (!newOpponent.trim()) return;
    setCreatingMatch(true);
    const { data, error } = await supabase
      .from('matches')
      .insert({ opponent: newOpponent.trim() })
      .select()
      .single();
    setCreatingMatch(false);
    if (!error) {
      setNewOpponent('');
      await loadMatches();
      setMatchId(data.id);
    }
  }

  async function registrarAccion(column, label) {
    if (!matchId || !selectedPlayer) return;
    const { error } = await supabase.rpc('increment_stat', {
      p_match_id: matchId,
      p_player_id: selectedPlayer.id,
      p_column: column,
      p_delta: 1,
    });
    if (error) {
      setFlash({ type: 'error', text: 'No se pudo guardar: ' + error.message });
      return;
    }
    setLastActions((prev) => [...prev, { column, player: selectedPlayer, label }]);
    setFlash({ type: 'ok', text: `+1 ${label} — #${selectedPlayer.number} ${selectedPlayer.name}` });
  }

  async function deshacer() {
    if (!lastActions.length || !matchId) return;
    const last = lastActions[lastActions.length - 1];
    const { error } = await supabase.rpc('increment_stat', {
      p_match_id: matchId,
      p_player_id: last.player.id,
      p_column: last.column,
      p_delta: -1,
    });
    if (!error) {
      setLastActions((prev) => prev.slice(0, -1));
      setFlash({ type: 'undo', text: `Deshecho: ${last.label} — #${last.player.number}` });
    }
  }

  return (
    <div className="live-screen">
      <div className="live-topbar">
        <div className="live-match-select">
          <label>Partido</label>
          <select value={matchId} onChange={(e) => setMatchId(e.target.value)}>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                vs {m.opponent} · {new Date(m.match_date).toLocaleDateString('es-AR')}
                {m.status === 'finalizado' ? ' (finalizado)' : ''}
              </option>
            ))}
          </select>
        </div>
        <form className="live-new-match" onSubmit={crearPartido}>
          <input
            placeholder="Nuevo rival (ej: Belgrano)"
            value={newOpponent}
            onChange={(e) => setNewOpponent(e.target.value)}
          />
          <button type="submit" disabled={creatingMatch}>
            + Partido
          </button>
        </form>
      </div>

      {flash && <div className={`flash flash-${flash.type}`}>{flash.text}</div>}

      <section className="player-picker">
        <h2>1. Elegí la jugadora</h2>
        <div className="player-grid">
          {players.map((p) => (
            <button
              key={p.id}
              className={`player-chip ${selectedPlayer?.id === p.id ? 'selected' : ''}`}
              onClick={() => setSelectedPlayer(p)}
            >
              <span className="player-number">{p.number}</span>
              <span className="player-name">{p.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="action-picker">
        <div className="action-picker-header">
          <h2>2. Registrá la acción</h2>
          <button className="btn-undo" onClick={deshacer} disabled={!lastActions.length}>
            ↩ Deshacer
          </button>
        </div>

        {!selectedPlayer && <p className="hint">Elegí primero una jugadora arriba.</p>}

        {selectedPlayer && (
          <div className="stat-groups">
            {STAT_GROUPS.map((group) => (
              <div key={group.key} className="stat-group">
                <h3>{group.label}</h3>
                <div className="stat-buttons">
                  {group.stats.map((s) => (
                    <button
                      key={s.column}
                      className={`stat-btn stat-${s.polarity}`}
                      onClick={() => registrarAccion(s.column, s.short)}
                    >
                      <span className="stat-btn-short">{s.short}</span>
                      <span className="stat-btn-plus">+1</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

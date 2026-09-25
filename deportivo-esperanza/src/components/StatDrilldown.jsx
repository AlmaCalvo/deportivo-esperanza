import { useState } from 'react';

/**
 * Fila de una métrica con su total. Al hacer click se despliega el detalle
 * partido por partido (solo los partidos donde esa métrica es > 0).
 *
 * matchRows: array de match_stats ya unidas con datos del partido, ej:
 *   { match: { opponent, match_date }, [column]: number }
 */
export default function StatDrilldown({ label, short, column, total, polarity, matchRows }) {
  const [open, setOpen] = useState(false);

  const detalle = matchRows
    .filter((row) => row[column] > 0)
    .sort((a, b) => new Date(b.match.match_date) - new Date(a.match.match_date));

  return (
    <div className={`drilldown drilldown-${polarity}`}>
      <button
        className="drilldown-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="drilldown-short">{short}</span>
        <span className="drilldown-label">{label}</span>
        <span className="drilldown-total">{total}</span>
        <span className={`drilldown-caret ${open ? 'open' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="drilldown-body">
          {detalle.length === 0 ? (
            <p className="drilldown-empty">Sin registros todavía.</p>
          ) : (
            <ul>
              {detalle.map((row) => (
                <li key={row.match_id ?? row.match.id}>
                  <span className="drilldown-opponent">vs {row.match.opponent}</span>
                  <span className="drilldown-date">
                    {new Date(row.match.match_date).toLocaleDateString('es-AR')}
                  </span>
                  <span className="drilldown-value">{row[column]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

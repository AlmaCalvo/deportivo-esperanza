import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { supabase } from '../supabaseClient';
import { efectividadAtaque, efectividadRecepcion, efectividadSaque } from '../utils/statsConfig';

export default function Analytics() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('match_stats')
      .select('*, match:matches(id, opponent, match_date, status)')
      .then(({ data, error }) => {
        if (!error) setRows(data ?? []);
        setLoading(false);
      });
  }, []);

  // Agrupa todas las filas de jugadoras por partido para obtener el total del EQUIPO
  const porPartido = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      if (!r.match) continue;
      const key = r.match.id;
      if (!map.has(key)) {
        map.set(key, {
          matchId: key,
          etiqueta: `vs ${r.match.opponent}`,
          fecha: r.match.match_date,
          ac: 0,
          es: 0,
          is_intentos: 0,
          rem: 0,
          ea: 0,
          rec: 0,
          erc: 0,
        });
      }
      const acc = map.get(key);
      acc.ac += r.ac;
      acc.es += r.es;
      acc.is_intentos += r.is_intentos;
      acc.rem += r.rem;
      acc.ea += r.ea;
      acc.rec += r.rec;
      acc.erc += r.erc;
    }
    return [...map.values()].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }, [rows]);

  const evolucion = porPartido.map((m) => ({
    etiqueta: m.etiqueta,
    'Efectividad de saque %': Number(efectividadSaque(m).toFixed(1)),
    '% Ataques exitosos': Number(efectividadAtaque(m).toFixed(1)),
    '% Recepción positiva': Number(efectividadRecepcion(m).toFixed(1)),
  }));

  const ataqueComparado = porPartido.map((m) => ({
    etiqueta: m.etiqueta,
    Puntos: m.rem,
    Errores: m.ea,
  }));

  if (loading) return <p className="hint">Cargando análisis…</p>;

  if (!porPartido.length) {
    return (
      <div className="empty-state">
        <h2>Todavía no hay datos para analizar</h2>
        <p>Cuando se carguen estadísticas de al menos un partido, vas a ver los gráficos acá.</p>
      </div>
    );
  }

  return (
    <div className="analytics">
      <section className="chart-card">
        <h2>Evolución del equipo, partido a partido</h2>
        <p className="chart-subtitle">
          Sirve para ver en qué fundamento mejorar de cara a los entrenamientos.
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={evolucion} margin={{ top: 8, right: 16, left: -16, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="etiqueta" stroke="var(--text-dim)" tick={{ fontSize: 12 }} />
            <YAxis stroke="var(--text-dim)" tick={{ fontSize: 12 }} unit="%" />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Line type="monotone" dataKey="Efectividad de saque %" stroke="#3FC1C9" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="% Ataques exitosos" stroke="#4CC9A7" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="% Recepción positiva" stroke="#7FB3FF" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="chart-card">
        <h2>Ataque: puntos vs. errores por partido</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ataqueComparado} margin={{ top: 8, right: 16, left: -16, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="etiqueta" stroke="var(--text-dim)" tick={{ fontSize: 12 }} />
            <YAxis stroke="var(--text-dim)" tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="Puntos" fill="#4CC9A7" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Errores" fill="#E15554" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}

const tooltipStyle = {
  background: '#122744',
  border: '1px solid #2a4468',
  borderRadius: 8,
  color: '#F5F5F3',
  fontSize: 13,
};

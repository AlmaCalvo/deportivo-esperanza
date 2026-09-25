// Definición única de todas las métricas del equipo.
// "column" debe coincidir exactamente con las columnas de public.match_stats en Supabase.
// "polarity" se usa para pintar de verde (positivo) o rojo (error) en la UI.

export const STAT_GROUPS = [
  {
    key: 'saque',
    label: 'Saque',
    stats: [
      { column: 'is_intentos', label: 'Intentos de Saque', short: 'IS', polarity: 'neutral' },
      { column: 'ac', label: 'Aces', short: 'AC', polarity: 'positive' },
      { column: 'es', label: 'Errores de Saque', short: 'ES', polarity: 'negative' },
    ],
  },
  {
    key: 'ataque',
    label: 'Ataque',
    stats: [
      { column: 'rem', label: 'Remates / Puntos', short: 'REM', polarity: 'positive' },
      { column: 'ea', label: 'Errores de Ataque', short: 'EA', polarity: 'negative' },
    ],
  },
  {
    key: 'recepcion',
    label: 'Recepción',
    stats: [
      { column: 'rec', label: 'Recepciones Positivas', short: 'REC', polarity: 'positive' },
      { column: 'erc', label: 'Errores de Recepción', short: 'ERC', polarity: 'negative' },
    ],
  },
  {
    key: 'bloqueo',
    label: 'Bloqueo',
    stats: [
      { column: 'bi', label: 'Bloqueos Individuales', short: 'BI', polarity: 'positive' },
      { column: 'bc', label: 'Bloqueos Colectivos', short: 'BC', polarity: 'positive' },
      { column: 'eb', label: 'Errores de Bloqueo', short: 'EB', polarity: 'negative' },
    ],
  },
  {
    key: 'colocacion',
    label: 'Colocación',
    stats: [
      { column: 'ic', label: 'Intentos de Colocación', short: 'IC', polarity: 'neutral' },
      { column: 'ast', label: 'Asistencias', short: 'AST', polarity: 'positive' },
      { column: 'ec', label: 'Errores de Colocación', short: 'EC', polarity: 'negative' },
    ],
  },
  {
    key: 'defensa',
    label: 'Defensa',
    stats: [
      { column: 'def', label: 'Defensas Exitosas', short: 'DEF', polarity: 'positive' },
      { column: 'edf', label: 'Errores de Defensa', short: 'EDF', polarity: 'negative' },
    ],
  },
];

// Lista plana de todas las columnas (útil para totales / gráficos)
export const ALL_STATS = STAT_GROUPS.flatMap((g) => g.stats);

// Efectividad de saque: (Aces - Errores) / Intentos
export function efectividadSaque(row) {
  if (!row || !row.is_intentos) return 0;
  return ((row.ac - row.es) / row.is_intentos) * 100;
}

// % de ataques exitosos: REM / (REM + EA)
export function efectividadAtaque(row) {
  if (!row) return 0;
  const total = row.rem + row.ea;
  if (!total) return 0;
  return (row.rem / total) * 100;
}

// % de recepción positiva: REC / (REC + ERC)
export function efectividadRecepcion(row) {
  if (!row) return 0;
  const total = row.rec + row.erc;
  if (!total) return 0;
  return (row.rec / total) * 100;
}

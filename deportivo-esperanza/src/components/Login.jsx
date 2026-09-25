import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(traducirError(error.message));
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        setError(traducirError(error.message));
      } else {
        setInfo('Cuenta creada. Revisá tu email para confirmar el registro y después iniciá sesión.');
        setMode('signin');
      }
    }
    setBusy(false);
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark">
            <img src="/logo.png" alt="Escudo Deportivo Esperanza" />
          </span>
          <div>
            <h1>Deportivo Esperanza</h1>
            <p>Estadísticas del equipo de vóley</p>
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={mode === 'signin' ? 'active' : ''}
            onClick={() => setMode('signin')}
            type="button"
          >
            Iniciar sesión
          </button>
          <button
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => setMode('signup')}
            type="button"
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <label>
              Nombre y apellido
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Como figura en la lista del equipo"
                required
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {info && <p className="auth-info">{info}</p>}

          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? 'Un momento…' : mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-footnote">
          {mode === 'signup'
            ? 'Después de crear tu cuenta, el cuerpo técnico va a vincularla con tu ficha de jugadora.'
            : '¿Sos del cuerpo técnico? Iniciá sesión con la cuenta que te dieron.'}
        </p>
      </div>
    </div>
  );
}

function traducirError(msg) {
  if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.';
  if (msg.includes('User already registered')) return 'Ese email ya tiene una cuenta creada.';
  if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  return msg;
}

# Deportivo Esperanza · App de Estadísticas de Vóley

App web para cargar y consultar las estadísticas del equipo desde la nube (Supabase),
con una pantalla de carga rápida en vivo, perfil de jugadora con detalle partido por
partido, y gráficos de rendimiento del equipo.

## 1. Crear el proyecto en Supabase (base de datos en la nube)

1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta gratis.
2. **New project** → elegí un nombre (ej: `deportivo-esperanza`), una contraseña de base
   de datos (guardala) y una región cercana (ej: `South America (São Paulo)`).
3. Esperá 1-2 minutos a que se aprovisione el proyecto.
4. Andá a **SQL Editor** → **New query**, pegá todo el contenido del archivo
   [`supabase_schema.sql`](./supabase_schema.sql) que está en este mismo proyecto, y
   apretá **Run**. Esto crea todas las tablas, la seguridad (RLS) y las funciones que
   usa la app.
5. Andá a **Authentication → Providers** y confirmá que **Email** esté habilitado
   (viene así por defecto). Si no querés que las jugadoras confirmen el email antes de
   entrar, podés desactivar "Confirm email" en **Authentication → Settings**.
6. Andá a **Project Settings → API** y copiá:
   - **Project URL**
   - **anon public key**

   Los vas a necesitar en el paso 3.

### Cargar el plantel

En **Table Editor → players**, agregá una fila por jugadora con su número y nombre
(o descomentá y editá el bloque de ejemplo al final de `supabase_schema.sql` antes de
correrlo). El campo `email` es opcional, pero si lo completás con el mismo email con el
que la jugadora se registre en la app, es más fácil vincular su cuenta después.

### Dar de alta al cuerpo técnico

Por defecto, cualquier persona que se registra queda con el rol `jugadora` (solo puede
ver estadísticas). Para que alguien pueda usar la pantalla de carga en vivo:

1. Que esa persona se registre una vez desde la app (pantalla "Crear cuenta").
2. En Supabase, andá a **Authentication → Users** y copiá su `UID`.
3. En **SQL Editor**, corré:
   ```sql
   update public.profiles set role = 'cuerpo_tecnico' where id = '<UID copiado>';
   ```

### Vincular la cuenta de una jugadora con su ficha

```sql
update public.players set auth_user_id = '<UID de la jugadora>' where number = 7;
update public.profiles set player_id = (select id from public.players where number = 7)
  where id = '<UID de la jugadora>';
```

(Se puede automatizar más adelante con un trigger que empareje por email; se deja manual
para mantener el control sobre quién ve qué.)

## 2. Probar la app en tu computadora (opcional pero recomendado)

Necesitás tener instalado [Node.js](https://nodejs.org) (versión 18 o superior).

```bash
cd deportivo-esperanza
npm install
cp .env.example .env
```

Abrí `.env` y completá con los datos que copiaste en el paso 1:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica
```

Después corré:

```bash
npm run dev
```

y abrí la URL que te muestra la terminal (normalmente `http://localhost:5173`).

## 3. Publicar la app gratis en Vercel

1. Subí esta carpeta a un repositorio de GitHub (podés arrastrar los archivos desde
   [github.com/new](https://github.com/new) si no usás git desde la terminal).
2. Entrá a [vercel.com](https://vercel.com), creá una cuenta gratis con tu GitHub.
3. **Add New → Project** → elegí el repositorio que acabás de subir.
4. Vercel detecta automáticamente que es un proyecto Vite. En **Environment
   Variables**, agregá:
   - `VITE_SUPABASE_URL` → tu Project URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` → tu anon public key
5. Apretá **Deploy**. En 1-2 minutos te da un link tipo
   `https://deportivo-esperanza.vercel.app` que podés compartir con todo el equipo.
6. Cada vez que subas cambios al repositorio, Vercel vuelve a publicar la app sola.

### Alternativa: Netlify

1. Entrá a [netlify.com](https://netlify.com) → **Add new site → Import an existing
   project** → conectá tu repositorio de GitHub.
2. Build command: `npm run build` — Publish directory: `dist`.
3. En **Site settings → Environment variables**, agregá `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY` como en el paso anterior.
4. **Deploy site**.

## Cómo se usa la app en un partido

1. El cuerpo técnico entra a `/carga` desde el celular o tablet.
2. Elige el partido (o crea uno nuevo tocando "+ Partido").
3. Toca el número de la jugadora que hizo la acción.
4. Toca el botón de la acción (ej: "AC +1" para un ace). El dato se guarda al instante
   en la nube — cualquier jugadora que entre a su perfil en ese momento ya lo ve.
5. Si se cargó algo por error, "↩ Deshacer" revierte la última acción cargada.

## Identidad visual

Los colores de la app salen del isologo del club (`public/logo.png`):

- Navy `#0A1B33` — silueta de la jugadora, color de fondo principal.
- Turquesa `#3FC1C9` — color del "39", usado como acento (botones, totales, links).
- Crema `#F5F5F3` — fondo del logo, usado detrás del escudo en la barra y el login.

Si en algún momento cambian el logo, solo hay que reemplazar `public/logo.png` por el
archivo nuevo (mismo nombre) y, si cambian los colores de marca, actualizar las
variables `--navy` y `--teal` en `src/index.css`.

## Estructura del proyecto

```
supabase_schema.sql     → script SQL para crear toda la base de datos
src/
  supabaseClient.js      → conexión con Supabase
  contexts/AuthContext.jsx → sesión y rol del usuario (jugadora / cuerpo técnico)
  utils/statsConfig.js    → catálogo único de las métricas (IS, AC, ES, REM, EA, ...)
  components/
    Login.jsx             → inicio de sesión y registro
    LiveScoring.jsx        → carga rápida en vivo (pantalla de anotador/a)
    PlayerDashboard.jsx    → perfil de jugadora con totales y drill-down
    StatDrilldown.jsx      → fila desplegable "total → detalle por partido"
    Analytics.jsx          → gráficos de efectividad y evolución del equipo
    Navbar.jsx
```

## Próximos pasos sugeridos

- Agregar un trigger para vincular automáticamente `profiles.player_id` cuando el email
  de registro coincide con `players.email`.
- Exportar reportes en PDF por jugadora o por partido.
- Agregar posición en cancha / rotación como otra dimensión de análisis.

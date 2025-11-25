# Connecta Directa

Plataforma web para acompañamiento, seguimiento y estimulación cognitiva de personas mayores, con participación de familiares/personas de apoyo y profesionales.  
Este repositorio está configurado con un municipio de ejemplo, pero la solución es **multimunicipio**: el software es el mismo y solo cambian los datos de configuración (nombre del municipio, usuarios, imágenes, etc.).

---

## 1. Visión general

Connecta Directa ofrece:

- Un **espacio para personas mayores** con una interfaz muy sencilla basada en tarjetas grandes:
  - Hablar con el asistente (conversa conmigo).
  - Ejercicios de memoria (entrena tu mente).
  - Recordatorios (citas y medicinas).
  - Mensajes familiares (mensajes y fotos).
  - Ayuda profesional (avisar al personal).

- Un **espacio para familiares / personas de apoyo**:
  - Envío de mensajes y fotos.
  - (Con permisos) creación de recordatorios y consulta de actividad básica.

- Un **espacio para profesionales / administración**:
  - Alta y gestión de personas mayores, familiares y profesionales.
  - Configuración de recordatorios y actividades de programa.
  - Gestión de PIN de acceso simplificado.
  - Panel de métricas (engagement, adherencia, ejercicios cognitivos, alertas, tiempo de respuesta de la IA).

La solución integra un **asistente conversacional con IA** que se adapta al perfil de cada persona mayor (biografía, gustos, rutinas) y siempre responde **también en voz alta**, facilitando el uso a personas con dificultades de lectura.

---

## 2. Arquitectura del proyecto

El repositorio está organizado como una mini-monorepo TypeScript:

- `client/` – Aplicación web (SPA) en React + Vite.
- `server/` – API REST en Node.js + Express.
- `shared/` – Esquema de base de datos y tipos compartidos (Drizzle ORM).
- `migrations/` – Migraciones generadas por drizzle-kit (se crean tras `db:push`).
- Configuración general:
  - `package.json`, `tsconfig.json`
  - `drizzle.config.ts`
  - `tailwind.config.ts`
  - `vite.config.ts`

### 2.1. Frontend (`client/`)

Tecnologías principales:

- React + TypeScript.
- Vite como bundler y dev server.
- TailwindCSS para estilos.
- Componentes accesibles con shadcn/ui (Radix UI).
- React Query para datos remotos (llamadas a la API).
- React Hook Form + Zod para formularios y validación.
- Recharts para los gráficos de métricas.

Flujos clave:

- Pantalla inicial con selección de rol:
  - Administración / profesional.
  - Persona usuaria mayor.
  - Familiar / persona de apoyo.
- Para profesionales y familiares:
  - Pantallas de **inicio de sesión** y **registro**.
- Para personas mayores:
  - Acceso mediante usuario + PIN (configurados por profesionales).
  - Pantalla principal con 5 tarjetas de acción.

### 2.2. Backend (`server/`)

Tecnologías principales:

- Node.js + Express + TypeScript.
- Drizzle ORM sobre PostgreSQL (Neon u otro proveedor compatible).
- SDK oficial de OpenAI para el asistente con IA.

Responsabilidades:

- API REST para:
  - Autenticación y registro.
  - Gestión de usuarios (roles: `elderly`, `family`, `professional`).
  - Recordatorios y completados.
  - Mensajes y fotos familiares.
  - Actividades de programa.
  - Métricas y analíticas.
- Integración con OpenAI:
  - Construcción de prompts con contexto de usuario.
  - Gestión de historial de conversación y memoria persistente.
  - Control básico del número de tokens.
- Seguridad básica:
  - Límite de tamaño de peticiones (`50mb`).
  - Cabeceras de seguridad (`no-cache`, `X-Content-Type-Options`, `X-Frame-Options`, etc.).
  - Configuración de puerto y entorno.

### 2.3. Capa de datos (`shared/` + `drizzle`)

La base de datos es PostgreSQL y se describe con Drizzle ORM en `shared/schema.ts`.  
Esquema principal (resumen):

- `users` – Personas mayores, familiares y profesionales (rol `elderly`, `family`, `professional`).
- `reminders` y `reminder_completions` – Recordatorios y su cumplimiento.
- `messages` – Mensajes y fotos entre familiares y personas mayores.
- `chat_sessions` – Sesiones de conversación con la IA.
- `memories` y `conversation_summaries` – Memoria persistente y resúmenes de conversación.
- `activities` – Eventos relevantes (login, cambios, alertas, etc.).
- `program_activities` – Actividades de programa definidas por profesionales.
- `metrics_events` y `metrics_aggregates` – Métricas de uso y calidad.
- `consents` – Gestión de consentimientos RGPD.
- `municipalities` – Municipios configurados (para despliegues multi-territorio).
- `family_assignments` / `professional_assignments` – Relaciones familia/persona mayor y profesional/persona mayor.

---

## 3. Requisitos previos

Para trabajar con este repositorio necesitas:

- **Node.js** 20.x (recomendado) y `npm`.
- Una base de datos **PostgreSQL** accesible (local o en la nube).
- Una clave de API de **OpenAI** (u otro proveedor compatible) para el asistente.

---

## 4. Variables de entorno

La aplicación utiliza estas variables de entorno:

- `DATABASE_URL` – Cadena de conexión a PostgreSQL.  
  Ejemplo:  
  `postgresql://user:password@host:5432/database`

- `OPENAI_API_KEY` – Clave de API de OpenAI.

- `OPENAI_MODEL` *(opcional)* – Modelo a utilizar.  
  Por defecto: `"gpt-4o"`.

- `PORT` *(opcional)* – Puerto HTTP para el servidor.  
  Por defecto: `5000`.

- `NODE_ENV` – `"development"` o `"production"` (afecta a Vite y logs).

Puedes crear un archivo `.env` en la raíz del proyecto (o usar el sistema de secretos de Replit u otro PaaS) con estos valores:

```bash
DATABASE_URL=postgresql://user:password@host:5432/connecta
OPENAI_API_KEY=tu_clave_de_openai
OPENAI_MODEL=gpt-4o
PORT=5000
NODE_ENV=development

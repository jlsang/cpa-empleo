# CPA Empleo · Análisis de Currículums

Micro-app web para una empresa de CPA (contadores públicos autorizados) que analiza
currículums con la API de **Google Gemini** y registra los datos de los candidatos.

Permite subir currículums en **PDF o Word (.docx)** —o pegar el texto directamente— y
guarda cada análisis en **almacenamiento local (JSON)** o en **Firebase Firestore**.

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior
- Una clave de API de Google Gemini ([obtenerla aquí](https://aistudio.google.com/app/apikey))
- (Opcional) Un proyecto de Firebase con Firestore, si quieres almacenamiento en la nube

## Instalación

```bash
npm install
```

## Configuración

Copia la plantilla de variables de entorno y rellena tu clave:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env
```

Edita `.env` y define al menos tu clave de Gemini:

```env
GEMINI_API_KEY=tu_clave_aqui
```

Variables disponibles:

| Variable                   | Descripción                                              | Por defecto           |
| -------------------------- | -------------------------------------------------------- | --------------------- |
| `GEMINI_API_KEY`           | Clave de la API de Google Gemini (obligatoria).          | —                     |
| `GEMINI_MODEL`             | Modelo de Gemini a usar.                                 | `gemini-1.5-flash`    |
| `PORT`                     | Puerto del servidor.                                     | `3000`                |
| `STORAGE_BACKEND`          | Almacenamiento: `local` (archivo JSON) o `firestore`.    | `local`               |
| `FIREBASE_SERVICE_ACCOUNT` | Ruta al JSON de la cuenta de servicio (solo Firestore).  | —                     |
| `FIRESTORE_COLECCION`      | Nombre de la colección de Firestore.                     | `candidatos`          |

## Arranque

```bash
npm start
```

O en modo desarrollo (recarga al guardar cambios):

```bash
npm run dev
```

Luego abre **http://localhost:3000** en el navegador.

## Uso

1. Sube un currículum en **PDF** o **Word (.docx)** (máx. 5 MB), o pega el texto.
2. La app extrae el texto, lo envía a Gemini y muestra un análisis estructurado
   (nombre, experiencia, habilidades, certificaciones, aptitud para CPA, etc.).
3. Cada candidato analizado se guarda y aparece en la lista "Candidatos guardados".

> Nota: un PDF escaneado (solo imagen, sin texto) no se puede procesar. Solo se admite
> Word moderno `.docx` (no el formato antiguo `.doc`).

## Almacenamiento

### Local (por defecto)

Los candidatos se guardan en `data/candidatos.json`. No requiere configuración.

### Firebase Firestore

1. Crea un proyecto en la [consola de Firebase](https://console.firebase.google.com) y
   habilita **Firestore Database**.
2. Descarga la clave de servicio: *Configuración del proyecto → Cuentas de servicio →
   Generar nueva clave privada*. Guárdala como `firebase-service-account.json` en la raíz
   (o ajusta la ruta en `FIREBASE_SERVICE_ACCOUNT`).
3. En `.env`, cambia `STORAGE_BACKEND=firestore`.
4. Reinicia el servidor.

Ambos backends comparten la misma interfaz, así que puedes alternar entre ellos con solo
cambiar `STORAGE_BACKEND`.

## Endpoints de la API

| Método | Ruta                       | Descripción                                                       |
| ------ | -------------------------- | ---------------------------------------------------------------- |
| `GET`  | `/api/health`              | Comprobación de estado del servicio.                             |
| `POST` | `/api/procesar-curriculum` | Analiza un currículum enviado como texto (`{ "texto": "..." }`). |
| `POST` | `/api/subir-curriculum`    | Analiza un archivo PDF/`.docx` (campo `curriculum`, multipart).  |
| `GET`  | `/api/candidatos`          | Lista los candidatos analizados y guardados.                     |

## Estructura del proyecto

```
proyecto-cpa-empleo/
├── index.js          # Servidor Express + rutas de la API
├── gemini.js         # Integración con Gemini + extracción de texto (PDF/Word)
├── storage.js        # Almacenamiento local en JSON
├── firestore.js      # Almacenamiento en Firebase Firestore
├── public/
│   └── index.html    # Interfaz web
├── data/             # Datos locales (se crea en tiempo de ejecución; ignorado por git)
├── .env              # Variables de entorno (no se versiona)
└── .env.example      # Plantilla de variables de entorno
```

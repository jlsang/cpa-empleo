// Almacenamiento de candidatos en Google Cloud Firestore (vía firebase-admin).
// Expone la misma interfaz que storage.js, por lo que index.js puede usar
// cualquiera de los dos backends sin cambios.
const { getApps, initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const crypto = require('crypto');

const COLECCION = process.env.FIRESTORE_COLECCION || 'candidatos';

let db = null;

// Inicializa (de forma perezosa) la app de firebase-admin y devuelve la instancia de Firestore.
// Credenciales admitidas, por orden de preferencia:
//   1. FIREBASE_SERVICE_ACCOUNT  -> ruta a un archivo JSON de cuenta de servicio.
//   2. GOOGLE_APPLICATION_CREDENTIALS (credenciales por defecto de la aplicación).
function obtenerDB() {
  if (db) return db;

  if (!getApps().length) {
    const rutaCuenta = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (rutaCuenta) {
      const cuenta = require(path.resolve(rutaCuenta));
      initializeApp({ credential: cert(cuenta) });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      initializeApp({ credential: applicationDefault() });
    } else {
      throw new Error(
        'Faltan credenciales de Firebase. Define FIREBASE_SERVICE_ACCOUNT (ruta al JSON de la cuenta de servicio) en el archivo .env'
      );
    }
  }

  db = getFirestore();
  return db;
}

// Guarda un candidato analizado y devuelve el registro creado (con id y fecha).
async function guardarCandidato({ archivo = null, resultado }) {
  const firestore = obtenerDB();
  const registro = {
    id: crypto.randomUUID(),
    fecha: new Date().toISOString(),
    archivo,
    resultado,
  };
  await firestore.collection(COLECCION).doc(registro.id).set(registro);
  return registro;
}

// Devuelve todos los candidatos guardados, del más reciente al más antiguo.
async function listarCandidatos() {
  const firestore = obtenerDB();
  const snapshot = await firestore.collection(COLECCION).orderBy('fecha', 'desc').get();
  return snapshot.docs.map((doc) => doc.data());
}

module.exports = { guardarCandidato, listarCandidatos };

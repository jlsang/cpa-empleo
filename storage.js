// Almacenamiento local de candidatos analizados en un archivo JSON.
// Sencillo, sin dependencias externas ni credenciales: ideal para arrancar rápido.
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const DIR_DATOS = path.join(__dirname, 'data');
const ARCHIVO = path.join(DIR_DATOS, 'candidatos.json');

// Cola de escritura para serializar los accesos y evitar condiciones de carrera
// entre peticiones concurrentes (patrón read-modify-write).
let cola = Promise.resolve();

// Lee el array de candidatos del disco. Devuelve [] si el archivo aún no existe.
async function leerTodos() {
  try {
    const contenido = await fs.readFile(ARCHIVO, 'utf8');
    const datos = JSON.parse(contenido);
    return Array.isArray(datos) ? datos : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

// Escribe el array completo de candidatos en el disco (creando la carpeta si falta).
async function escribirTodos(lista) {
  await fs.mkdir(DIR_DATOS, { recursive: true });
  await fs.writeFile(ARCHIVO, JSON.stringify(lista, null, 2), 'utf8');
}

// Guarda un candidato analizado y devuelve el registro creado (con id y fecha).
function guardarCandidato({ archivo = null, resultado }) {
  cola = cola.then(async () => {
    const lista = await leerTodos();
    const registro = {
      id: crypto.randomUUID(),
      fecha: new Date().toISOString(),
      archivo,
      resultado,
    };
    lista.push(registro);
    await escribirTodos(lista);
    return registro;
  });
  return cola;
}

// Devuelve todos los candidatos guardados, del más reciente al más antiguo.
async function listarCandidatos() {
  const lista = await leerTodos();
  return lista.slice().reverse();
}

module.exports = { guardarCandidato, listarCandidatos };

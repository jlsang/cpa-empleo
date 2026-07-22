// Servidor principal de la micro-app web de CPA de empleo.
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { procesarCurriculum, extraerTexto } = require('./gemini');

// Selección del backend de almacenamiento: 'firestore' o 'local' (por defecto).
const STORAGE_BACKEND = (process.env.STORAGE_BACKEND || 'local').toLowerCase();
const { guardarCandidato, listarCandidatos } =
  STORAGE_BACKEND === 'firestore' ? require('./firestore') : require('./storage');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de multer: almacenamiento en memoria, límite de 5 MB y filtro de tipos.
const TIPOS_PERMITIDOS = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const nombre = file.originalname.toLowerCase();
    const ok =
      TIPOS_PERMITIDOS.includes(file.mimetype) ||
      nombre.endsWith('.pdf') ||
      nombre.endsWith('.docx');
    if (ok) return cb(null, true);
    cb(new Error('Formato no soportado. Sube un archivo PDF o Word (.docx).'));
  },
});

// Middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos (interfaz web)
app.use(express.static(path.join(__dirname, 'public')));

// Comprobación de salud
app.get('/api/health', (req, res) => {
  res.json({ ok: true, servicio: 'cpa-empleo', hora: new Date().toISOString() });
});

// Redirige al reporte de análisis de currículums alojado externamente.
app.get('/obtener-reporte', (req, res) => {
  res.redirect(301, 'https://tundrafile.com/analisiscvempleo');
});

// [TEMPORAL/PRUEBA] Entrega el reporte directamente en el navegador, sin
// redirigir a CPAGrip. Sirve un PDF local si existe (REPORT_PDF_PATH o
// public/reporte-test.pdf); de lo contrario devuelve una respuesta de prueba.
// Eliminar esta ruta antes de pasar a producción.
app.get('/descargar-pdf-test', (req, res) => {
  const rutaPdf = process.env.REPORT_PDF_PATH
    ? path.resolve(process.env.REPORT_PDF_PATH)
    : path.join(__dirname, 'public', 'reporte-test.pdf');

  if (fs.existsSync(rutaPdf)) {
    res.type('application/pdf');
    return res.sendFile(rutaPdf);
  }

  res
    .status(200)
    .type('html')
    .send(
      '<h1>Reporte de prueba</h1>' +
        '<p>Esta es la respuesta directa del reporte, sin redirección a CPAGrip.</p>' +
        '<p>No se encontró un PDF local. Coloca uno en <code>public/reporte-test.pdf</code> ' +
        'o define la variable de entorno <code>REPORT_PDF_PATH</code> para servirlo aquí.</p>'
    );
});

// Endpoint principal: recibe el texto de un currículum y devuelve el análisis de Gemini.
app.post('/api/procesar-curriculum', async (req, res) => {
  try {
    const { texto } = req.body;

    if (!texto || typeof texto !== 'string' || texto.trim().length === 0) {
      return res.status(400).json({ error: 'Debes enviar el campo "texto" con el contenido del currículum.' });
    }

    const resultado = await procesarCurriculum(texto);
    const registro = await guardarCandidato({ resultado });
    res.json({ ok: true, id: registro.id, resultado });
  } catch (err) {
    console.error('Error al procesar el currículum:', err);
    res.status(500).json({ error: 'No se pudo procesar el currículum.', detalle: err.message });
  }
});

// Endpoint de carga: recibe un archivo PDF/Word, extrae el texto y lo procesa con Gemini.
app.post('/api/subir-curriculum', (req, res) => {
  subida.single('curriculum')(req, res, async (errSubida) => {
    if (errSubida) {
      const codigo = errSubida.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(codigo).json({ error: errSubida.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Debes adjuntar un archivo en el campo "curriculum".' });
      }

      const texto = await extraerTexto(req.file.buffer, req.file.mimetype, req.file.originalname);

      if (!texto || texto.trim().length === 0) {
        return res.status(422).json({ error: 'No se pudo extraer texto del archivo. ¿Es un PDF escaneado (imagen)?' });
      }

      const resultado = await procesarCurriculum(texto);
      const registro = await guardarCandidato({ archivo: req.file.originalname, resultado });
      res.json({ ok: true, id: registro.id, archivo: req.file.originalname, resultado });
    } catch (err) {
      console.error('Error al subir/procesar el currículum:', err);
      res.status(500).json({ error: 'No se pudo procesar el archivo.', detalle: err.message });
    }
  });
});

// Listado de candidatos analizados y almacenados.
app.get('/api/candidatos', async (req, res) => {
  try {
    const candidatos = await listarCandidatos();
    res.json({ ok: true, total: candidatos.length, candidatos });
  } catch (err) {
    console.error('Error al listar candidatos:', err);
    res.status(500).json({ error: 'No se pudieron leer los candidatos.', detalle: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor CPA de empleo escuchando en http://localhost:${PORT}`);
  console.log(`Almacenamiento: ${STORAGE_BACKEND}`);
});
module.exports = app;

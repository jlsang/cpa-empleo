// Integración con la API de Gemini para procesar currículums.
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mammoth = require('mammoth');

const API_KEY = process.env.GEMINI_API_KEY;
const MODELO = process.env.GEMINI_MODEL || 'gemini-flash-latest';

let clienteModelo = null;

// Inicializa (de forma perezosa) el cliente del modelo de Gemini.
function obtenerModelo() {
  if (!API_KEY) {
    throw new Error('Falta la variable de entorno GEMINI_API_KEY. Configúrala en el archivo .env');
  }
  if (!clienteModelo) {
    const genAI = new GoogleGenerativeAI(API_KEY);
    clienteModelo = genAI.getGenerativeModel({ model: MODELO });
  }
  return clienteModelo;
}

// Analiza el texto de un currículum y devuelve un resumen estructurado.
async function procesarCurriculum(textoCurriculum) {
  const modelo = obtenerModelo();

  const prompt = `Eres un asistente de reclutamiento para una empresa de CPA (contadores públicos autorizados).
Analiza el siguiente currículum y devuelve un objeto JSON con esta estructura exacta:
{
  "nombre": string,
  "correo": string,
  "telefono": string,
  "anosExperiencia": number,
  "habilidades": string[],
  "certificaciones": string[],
  "resumen": string,
  "aptoParaCPA": boolean,
  "razonamiento": string
}

Responde ÚNICAMENTE con el JSON, sin texto adicional ni bloques de código.

Currículum:
"""
${textoCurriculum}
"""`;

  const respuesta = await modelo.generateContent(prompt);
  const texto = respuesta.response.text();

  // Intenta extraer y parsear el JSON de la respuesta.
  try {
    const limpio = texto.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(limpio);
  } catch (err) {
    // Si no es JSON válido, devuelve el texto en bruto para no perder la información.
    return { textoBruto: texto };
  }
}

// Extrae el texto plano de un archivo de currículum (PDF o Word .docx) a partir de su buffer.
async function extraerTexto(buffer, mimetype, nombreArchivo = '') {
  const nombre = nombreArchivo.toLowerCase();
  const esPDF = mimetype === 'application/pdf' || nombre.endsWith('.pdf');
  const esDocx =
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    nombre.endsWith('.docx');

  if (esPDF || esDocx) {
    // Si es Word (.docx), usamos mammoth para extraer el texto limpiamente
    if (esDocx) {
      const resultado = await mammoth.extractRawText({ buffer });
      return resultado.value.trim();
    }
    
    // Si es PDF, convertimos el buffer a base64 para que Gemini lo procese directamente de forma nativa en la nube
    const base64Data = buffer.toString('base64');
    const modelo = obtenerModelo();
    const respuesta = await modelo.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: 'application/pdf'
        }
      },
      'Extrae y devuelve todo el texto plano contenido en este documento PDF de currículum, sin agregar comentarios adicionales.'
    ]);
    return respuesta.response.text().trim();
  }

  throw new Error('Formato no soportado. Sube un archivo PDF o Word (.docx).');
}

module.exports = { procesarCurriculum, obtenerModelo, extraerTexto };

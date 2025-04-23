const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');
const htmlMinifier = require('html-minifier');

// Configuración para terser
const terserOptions = {
  compress: {
    dead_code: true,
    drop_console: true,
    drop_debugger: true,
    keep_classnames: false,
    keep_fargs: false,
    passes: 3
  },
  mangle: {
    toplevel: true,
    reserved: ['require', 'module', 'exports']
  },
  output: {
    beautify: false,
    comments: false,
    preamble: '/* claudio.dcv@gmail.com */',
  }
};

// Configuración para HTML minifier (para archivos EJS)
const htmlMinifierOptions = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
  minifyJS: true,
  minifyCSS: true
};

// Configuración para CleanCSS
const cssMinifierOptions = {
  level: 2 // Nivel más agresivo de compresión
};

// Función para procesar un archivo
async function processFile(filePath, output) {
  try {
    const extension = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    
    output.filesProcessed++;

    // Leer el archivo
    const code = fs.readFileSync(filePath, 'utf8');
    let result;

    // Procesar según extensión
    switch (extension) {
      case '.map':
        // remover archivos .map
        fs.unlinkSync(filePath);
        output.deleted.push(filePath);
        output.deletedCount++;
        return;
        
      case '.js':
        // Minificar JavaScript con terser
        result = await minify(code, terserOptions);
        fs.writeFileSync(filePath, result.code);
        output.minified.push({ file: filePath, type: 'js' });
        output.minifiedCount++;
        break;

      case '.css':
        // Minificar CSS con clean-css
        result = new CleanCSS(cssMinifierOptions).minify(code);
        fs.writeFileSync(filePath, result.styles);
        output.minified.push({ file: filePath, type: 'css' });
        output.minifiedCount++;
        break;

      case '.ejss':
        // Minificar EJS con html-minifier (preservando tags EJS)
        // Usamos regex para proteger los tags de EJS antes de minificar
        const protectedEjs = code.replace(/(<%[\s\S]*?%>)/g, match => {
          return `<!-- EJS-PROTECT ${Buffer.from(match).toString('base64')} -->`;
        });

        // Minificar HTML
        result = htmlMinifier.minify(protectedEjs, htmlMinifierOptions);

        // Restaurar tags EJS
        const finalCode = result.replace(/<!-- EJS-PROTECT (.*?) -->/g, (match, p1) => {
          return Buffer.from(p1, 'base64').toString();
        });

        fs.writeFileSync(filePath, finalCode);
        output.minified.push({ file: filePath, type: 'ejs' });
        output.minifiedCount++;
        break;

      default:
        // Ignorar otros tipos de archivos
        output.skipped.push({ file: filePath, type: extension });
        output.skippedCount++;
        return;
    }
  } catch (err) {
    output.errors.push({ file: filePath, error: err.message });
    output.errorCount++;
  }
}

// Función para recorrer carpetas recursivamente
async function processDirectory(directory, output) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(fullPath, output);
    } else {
      await processFile(fullPath, output);
    }
  }
}

// Iniciar procesamiento desde la carpeta dist
(async function () {
  const output = {
    filesProcessed: 0,
    minified: [],
    minifiedCount: 0,
    deleted: [],
    deletedCount: 0,
    skipped: [],
    skippedCount: 0,
    errors: [],
    errorCount: 0,
    startTime: Date.now()
  };
  
  console.log('Iniciando minificación y ofuscación...');
  await processDirectory(path.join(__dirname, '../dist'), output);
  
  output.endTime = Date.now();
  output.totalTimeMs = output.endTime - output.startTime;
  
  // Mostrar resumen
  console.log('\n===== RESUMEN DE MINIFICACIÓN =====');
  console.log(`Archivos procesados: ${output.filesProcessed}`);
  console.log(`Archivos minificados: ${output.minifiedCount}`);
  console.log(`Archivos eliminados: ${output.deletedCount}`);
  console.log(`Archivos ignorados: ${output.skippedCount}`);
  console.log(`Errores: ${output.errorCount}`);
  console.log(`Tiempo total: ${output.totalTimeMs}ms`);
  
  // Si hay errores, mostrarlos
  if (output.errorCount > 0) {
    console.log('\n===== ERRORES =====');
    output.errors.forEach(err => {
      console.log(`- ${err.file}: ${err.error}`);
    });
  }
  
  // Opcional: guardar el informe en un archivo
  fs.writeFileSync(
    path.join(__dirname, '../minify-report.json'), 
    JSON.stringify(output, null, 2)
  );
  
  console.log('¡Proceso completado!');
})();
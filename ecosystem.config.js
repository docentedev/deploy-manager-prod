module.exports = {
    apps: [
      {
        name: 'deploy-app',    // Nombre de la aplicación
        script: './deploy-app.js', // Ruta al archivo de la aplicación
        env: {
          NODE_ENV: 'production', // Ambiente de producción
        },
        instances: 1,   // Instancia única para esta aplicación
        autorestart: true,  // Reiniciar si se cae
        watch: false,  // No observar archivos para reiniciar
        max_memory_restart: '100M', // Reiniciar si se excede los 500MB
      },
    ],
  };
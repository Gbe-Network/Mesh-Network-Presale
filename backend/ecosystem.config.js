module.exports = {
  apps: [
    {
      name: 'guaso-backend',
      script: './server.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      time: true,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};

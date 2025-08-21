module.exports = {
  apps: [{
    name: 'ars-api',
    script: 'dist/src/main.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8000,
      DATABASE_URL: "postgresql://postgres:23044943@localhost:5432/arsdb",
      JWT_SECRET: "verySecretKey",
      DB_TYPE: "postgresql"
    }
  }]
};
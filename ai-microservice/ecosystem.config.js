module.exports = {
  apps: [{
    name: 'ai-microservice',
    script: 'python',
    args: ['-m', 'uvicorn', 'ai_microservice:app', '--host', '0.0.0.0', '--port', '8002'],
    cwd: 'C:\\Users\\administrateur.AONTUNISIA\\Desktop\\deploy\\ai-microservice',
    interpreter: 'none',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
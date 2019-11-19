### Prepare

Add dependencies to package.json
```json
{
  "dependencies": {
    "backendJS": "github:ssaraikin/backend#master"
  }
}
```

Add path and include to tsconfig.json
```json
{
    "paths": {
      "backendJS/*": ["./node_modules/backendJS/build/*"]
    },
    
    "include": ["node_modules/backendJS/**/*"]
}
```

create PM2 ecosystem.config.js
```js
module.exports = {
  apps : [{
    name: 'backendJS',
    script: 'node_modules/.bin/ts-node',
    args: '-T -r tsconfig-paths/register ./app/index.ts',
    instances: 'max',
    autorestart: true,
    watch: ['app', 'node_modules'],
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
  }]
}
```

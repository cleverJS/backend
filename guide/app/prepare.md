### Prepare

Add dependencies to package.json
```json
{
  "dependencies": {
    "cleverJS": "github:cleverJS/backend#1.0.6"
  }
}
```

Add path and include to tsconfig.json
```json
{
    "paths": {
      "cleverJS/*": ["./node_modules/cleverJS/build/*"]
    },
    
    "include": ["node_modules/cleverJS/**/*"]
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

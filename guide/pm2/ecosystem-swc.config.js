module.exports = {
  apps: [
    {
      name: 'swc-config',
      interpreter: 'node',
      interpreter_args: [
        '--require=tsconfig-paths/register',
        '--require=dotenv/config',
        '--require=ts-node/register/transpile-only',
        '--require=ts-node/transpilers/swc-experimental',
      ],
      script: './app/index.ts',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      source_map_support: false,
      env: {
        NODE_ENV: 'development',
        TS_NODE_PROJECT: './tsconfig.prod.json',
      },
      env_production: {
        NODE_ENV: 'production',
        TS_NODE_PROJECT: './tsconfig.prod.json',
      },
      env_stage: {
        NODE_ENV: 'stage',
        TS_NODE_PROJECT: './tsconfig.prod.json',
      },
    },
  ],
}

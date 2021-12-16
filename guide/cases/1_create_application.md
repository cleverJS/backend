# Create application

[back](../wizard.md)

1. Recommended structure

    - app/
        - config/
        - controllers/
        - modules/
            - moduleName/
                - resource/
                    - ModuleNameResource.ts
                - ModuleName.ts    
                - ModuleNameService.ts    
        - App.ts
        - index.ts
    - runtime/     
    - migrations/     
    - .env     
    - knexfile.ts     
    - package.json   
    - [tsconfig.json](./files/tsconfig.json)  

2. Add dependencies to ```package.json```

```json
    {
      "dependencies": {
        "cleverJS": "github:cleverJS/backend#1.7.1"
      }
    }
```
   
3. Add start server script to ```package.json```

```json
    {
      "scripts": {
        "server": "ts-node -r tsconfig-paths/register -r dotenv/config  app/index.ts"
      }
    }
```

4. In [tsconfig.json](./files/tsconfig.json) pay attention that it includes the following:

```json
    {
        "paths": {
          "cleverJS/*": ["./node_modules/cleverJS/build/*"]
        },
        
        "include": ["node_modules/cleverJS/**/*"]
    }
```
   
5. Run ```npm i```

6. [index.ts](../../demo/index.ts) it is application entry point. There 3 main things to do:
    - Initialize logger
    
    - Initialize application context [App.ts](../../demo/App.ts)
    
    - Initialize process destroyer listener [destroy.ts](../../core/utils/destroy.ts) where you should pass all staff (e.g. DB connection termination, HTTP server shutdown...) which should be executed before application shutdown.

7. [App.ts](../../demo/App.ts) it is place for application context initialization (e.g HTTP server start, establish DB connection, define routes...)    

8. Start application ```npm run server```

[back](../wizard.md)

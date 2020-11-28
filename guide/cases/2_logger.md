# Logger

[back](../wizard.md)

Core has [logger](../../core/logger/logger.ts) interface which is allows to use any logger that you want or built-in realizations.

- [Console](../../core/logger/transport/TransportConsole.ts)
- [Winston](../../core/logger/transport/TransportWinston.ts)

Winston's initialization example: 

```ts
import path from 'path'
import { logger } from 'cleverJS/core/logger/logger'
import { ILoggerConfig } from 'cleverJS/core/logger/config'
import { TransportWinston } from 'cleverJS/core/logger/transport/TransportWinston'
import { TransportConsole } from 'cleverJS/core/logger/transport/TransportConsole'

const runtimeDir = path.resolve(`${__dirname}/../runtime`)

// In config we may set which levels it should log or skip 

logger.setConfig({
  debug: false,
  info: true,
  warn: true,
} as ILoggerConfig)

// Add winston logger
// runtimeDir - where to save logs

logger.addTransport(new TransportWinston(runtimeDir))

// You may add additional logger and then both will be used

logger.addTransport(new TransportConsole())
```

Use logger example:

```ts
import { logger } from 'cleverJS/core/logger/logger'

export class SomeClass {
  public someMethod() {
    logger.info('Log this')
    // 2020-11-16T06:17:56.004Z info: Log this

    const payload = {
      a: 1,
      b: 'something'
    }
  
    logger.info(payload)  
    // 2020-11-16T06:17:56.004Z info: {"a":1,"b":"something"} 

    logger.info('Log in that way', payload)
    // 2020-11-16T06:17:56.004Z info: Log in that way {"a":1,"b":"something"}    

    try {
      logger.debug('What was there?')
      // 2020-11-16T06:17:56.004Z debug: What was there?
      throw new Error('Crash')
    } catch (e) {
      logger.error('Something goes wrong', e)
      // 2020-11-16T06:17:56.004Z error: Something goes wrong  
      // Uncaught Error: Crash
      //       at <anonymous>:1:7
    }
  }
}
```

Use logger namespace which add tag to each record example:

```ts
import { loggerNamespace } from 'cleverJS/core/logger/logger'

export class SomeClass {
  protected readonly logger = loggerNamespace('SomeClass')

  public someMethod() {
    this.logger.info('Log this')
    // 2020-11-16T06:17:56.004Z info: [SomeClass] Log this
  }
}
```

[back](../wizard.md)

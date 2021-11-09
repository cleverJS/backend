import { WSServer } from 'core/ws/WSServer'

export const routes: any[] = []

export const route = (service: string, action: string) => {
  return (target: unknown, prop: string, descriptor?: TypedPropertyDescriptor<any>): any => {
    let fn: any
    let patchedFn: any

    if (descriptor) {
      fn = descriptor.value
      routes.push({
        service,
        action,
        func: fn,
      })
    }

    return {
      configurable: true,
      enumerable: false,
      get() {
        if (!patchedFn) {
          patchedFn = (...args: any) => fn.call(this, ...args)
        }
        return patchedFn
      },
      set(newFn: any) {
        patchedFn = undefined
        fn = newFn

        routes.push({
          service,
          action,
          func: fn,
        })
      },
    }
  }
}

export const initRoutes = (wsServer: WSServer) => {
  routes.forEach((route) => {
    wsServer.onRequest(route.service, route.action, route.func)
  })
}

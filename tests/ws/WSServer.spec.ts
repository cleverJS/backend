import { randomInt } from 'crypto'
import hrtime from 'pretty-hrtime'
import { WebSocket } from 'ws'

import { HttpServer } from '../../core/http/HttpServer'
import { logger } from '../../core/logger/logger'
import { Ready } from '../../core/utils/ready'
import { sleep } from '../../core/utils/sleep'
import { TRequest, TResponse, TResult, WSClient } from '../../core/ws/WSClient'
import { WSRequest } from '../../core/ws/WSRequest'
import { WSResponse } from '../../core/ws/WSResponse'
import { IConnectionInfo, WSServer } from '../../core/ws/WSServer'
import { IAppConnectionInfo } from '../../demo/types/WSConnection'

const WS_URL = 'ws://localhost:8000/ws'

function initActions(server: WSServer) {
  server.onRequest('test', 'empty', async (request: WSRequest, connectionInfo: IConnectionInfo) => {
    return {
      status: 'success',
    }
  })

  server.onRequest('test', 'broadcast', async (request: WSRequest, currentConnection: IConnectionInfo, currentClient: WebSocket) => {
    server.broadcast(async (connection: IAppConnectionInfo, client) => {
      if (currentClient !== client) {
        return WSResponse.createEventResponse('test:new', { msg: 'test' })
      }

      return null
    })

    return {
      status: 'success',
    }
  })

  server.onRequest('test', 'sleep', async (request: WSRequest, connectionInfo: IConnectionInfo) => {
    await sleep(randomInt(1, 2) * 1000)

    return {
      status: 'success',
    }
  })

  server.onRequest('test', 'auth', async (request: WSRequest, connectionInfo: IConnectionInfo) => {
    connectionInfo.state.auth = true

    return {
      status: 'success',
    }
  })

  server.onRequest('test', 'authorized', async (request: WSRequest, connectionInfo: IConnectionInfo) => {
    if (!connectionInfo.state.auth) {
      return {
        status: 'fail',
        data: {
          code: 101,
          message: 'Access denied',
        },
        message: '',
      }
    }

    return {
      status: 'success',
      data: request.payload.test,
    }
  })
}

describe('Test WSServer', () => {
  let httpServer: HttpServer
  let wsServer: WSServer
  const keepAliveTimeout = 2000

  beforeAll(async () => {
    httpServer = new HttpServer({ port: 8000, host: 'localhost' })
    wsServer = new WSServer({ port: 8000, keepalive: keepAliveTimeout, path: '/ws' }, httpServer.getServer().server)

    initActions(wsServer)

    await httpServer.start()
    logger.info('started')
  })

  afterEach(async () => {
    const promises: any[] = []
    wsServer.ws.clients.forEach((client) => {
      promises.push(WSServer.gracefulClose(client))
    })

    await Promise.all(promises)
  })

  afterAll(async () => {
    await wsServer.destroy()
    await httpServer.destroy()
  })

  test('should connect and disconnect', async () => {
    const wsClient = new WSClient(WS_URL, false)
    await wsClient.connect()
    await wsClient.call('test', 'empty', {})

    expect(wsServer.ws.clients.size).toEqual(1)

    await wsClient.disconnect()

    expect(wsServer.ws.clients.size).toEqual(0)
    expect(wsServer.connectionInfoMap.size).toEqual(0)
  })

  test('should report about wrong endpoint', async () => {
    const wsClient = new WSClient(WS_URL, false)
    await wsClient.connect()
    const response = await wsClient.call('test', '_test', {}, true)
    expect(response.error).toEqual('Handler does not exist test:_test')
    wsClient.disconnect().catch(logger.error)
  })

  test('should broadcast', async () => {
    const startCommand = process.hrtime()
    const clients = []
    let responses = 0
    const clientNumber = 20
    const promises = []
    for (let j = 0; j < clientNumber; j++) {
      const wsClient = new WSClient(WS_URL, false)
      wsClient.on('test:new', (data) => {
        expect(data.msg).toEqual('test')
        if (data.msg === 'test') {
          responses++
        }
      })

      clients.push(wsClient)
      promises.push(wsClient.connect())
    }

    await Promise.all(promises)

    const endCommand = process.hrtime(startCommand)
    const wordsCommand = hrtime(endCommand)
    logger.info(`${promises.length} clients connected Time: ${wordsCommand}`)

    expect(wsServer.ws.clients.size).toEqual(clientNumber)

    await clients[0].call('test', 'broadcast')

    const promisesDisconnect = []
    for (const client of clients) {
      promisesDisconnect.push(client.disconnect())
    }

    await Promise.all(promisesDisconnect)

    expect(responses).toEqual(clientNumber - 1)
    expect(wsServer.ws.clients.size).toEqual(0)
  })

  test('should cleanup broken connection', async () => {
    const clientsToBeBroken = []
    const promises = []
    for (let j = 0; j < 50; j++) {
      const wsClient = new WSClient(WS_URL, false)
      promises.push(wsClient.connect())
    }

    for (let j = 0; j < 50; j++) {
      const wsClient = new WSClient(WS_URL, false)

      clientsToBeBroken.push(wsClient)
      promises.push(wsClient.connect())
    }

    const startCommand = process.hrtime()
    await Promise.all(promises)
    const endCommand = process.hrtime(startCommand)
    const wordsCommand = hrtime(endCommand)
    logger.info(`${promises.length} clients connected Time: ${wordsCommand}`)

    expect(wsServer.ws.clients.size).toEqual(100)
    expect(wsServer.connectionInfoMap.size).toEqual(100)

    clientsToBeBroken.forEach((client) => client.terminate())

    await sleep(keepAliveTimeout + 1000)

    expect(wsServer.ws.clients.size).toEqual(50)
    expect(wsServer.connectionInfoMap.size).toEqual(50)
  })

  test('should throw event on connect', async () => {
    const onEventDone = new Ready()

    const onConnectClose = wsServer.onConnect(async (client: WebSocket) => {
      const connection = wsServer.connectionInfoMap.get(client)
      if (connection) {
        expect(connection).not.toBeNull()
      }

      onEventDone.resolve()
    })

    const wsClient = new WSClient(WS_URL, false)
    await wsClient.connect()
    await onEventDone.isReady()
    onConnectClose()
    expect(true).toBeTruthy()
  })

  test('should throw event on disconnect', async () => {
    const onEventDone = new Ready()

    const onDisconnectClose = wsServer.onDisconnect(async (info: IConnectionInfo) => {
      expect(info).not.toBeNull()
      onEventDone.resolve()
    })

    const wsClient = new WSClient(WS_URL, false)
    await wsClient.connect()
    await wsClient.disconnect()
    await onEventDone.isReady()
    onDisconnectClose()
    expect(true).toBeTruthy()
  })

  test('should send 1000 messages', async () => {
    const wsClient = new WSClient(WS_URL, false)
    await wsClient.connect()

    const promises = []
    for (let i = 0; i < 1000; i++) {
      promises.push(wsClient.call('test', 'sleep', {}))
    }

    const startCommand = process.hrtime()
    await Promise.all(promises)
    const endCommand = process.hrtime(startCommand)
    const wordsCommand = hrtime(endCommand)
    logger.info(`1000 messages send time: ${wordsCommand}`)

    expect(true).toBeTruthy()
  })

  test('should re-auth', async () => {
    const wsClient = new WSClient(WS_URL, false)
    await wsClient.connect()

    let isAutorizationReady: Ready | null = null
    let reAuthorization = 0
    let reAuthorizationResponse: TResult<Record<string, any>> | null = null
    const betweenAutoAttemptMs = 10000

    wsClient.modifyResponse = async (response: TResponse<Record<string, any>>, request?: TRequest) => {
      if (response?.payload?.data?.code === 101 && request) {
        if (!isAutorizationReady || (await isAutorizationReady.isReady())) {
          isAutorizationReady = new Ready()
          const now = Date.now()
          if (now - reAuthorization > betweenAutoAttemptMs) {
            reAuthorization = now
            reAuthorizationResponse = await wsClient.call('test', 'auth')
          }
          isAutorizationReady.resolve()

          if (reAuthorizationResponse && reAuthorizationResponse.status === 'success') {
            const {
              header: { service, action },
              payload,
            } = request

            const recallResult = await wsClient.call(service, action, payload)
            if (recallResult.data.code !== 101) {
              response.payload = recallResult
            }
          }
        }
      }
    }

    const [result1, result2, result3] = await Promise.all([
      wsClient.call('test', 'authorized', { test: 1 }),
      wsClient.call('test', 'authorized', { test: 2 }),
      wsClient.call('test', 'authorized', { test: 3 }),
    ])

    expect([result1.data, result2.data, result3.data]).toEqual([1, 2, 3])
  })
})

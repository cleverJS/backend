import WebSocket from 'ws'
import path from 'path'
import hrtime from 'pretty-hrtime'
import { randomInt } from 'crypto'
import { WSClient } from '../app/lib/WSClient'
import { HttpServer } from '../../core/http/HttpServer'
import { IConnectionInfo, WSServer } from '../../core/ws/WSServer'
import { WSRequest } from '../../core/ws/WSRequest'
import { logger } from '../../core/logger/logger'
import { ILoggerConfig } from '../../core/logger/config'
import { TransportWinston } from '../../core/logger/transport/TransportWinston'
import { IAppConnectionInfo } from '../../demo/types/WSConnection'
import { WSResponse } from '../../core/ws/WSResponse'
import { sleep } from '../../core/utils/sleep'
import { Ready } from '../../core/utils/ready'

const WS_URL = 'ws://localhost:8000/ws'
jest.setTimeout(10000)

function initLogger() {
  const runtimeDir = path.resolve(`${__dirname}/../../runtime/tests`)
  logger.setConfig({
    debug: true,
    info: true,
    warn: true,
  } as ILoggerConfig)
  logger.addTransport(new TransportWinston(runtimeDir))
}

describe('Test WSServer', () => {
  let httpServer: HttpServer
  let wsServer: WSServer
  const keepAliveTimeout = 2000

  beforeAll(async () => {
    initLogger()

    httpServer = new HttpServer({ port: 8000, host: 'localhost' })
    wsServer = new WSServer({ port: 8000, keepalive: keepAliveTimeout, path: '/ws' }, httpServer.getServer().server)

    wsServer.onRequest('test', 'empty', async (request: WSRequest, connectionInfo: IConnectionInfo) => {
      return {
        status: 'success',
      }
    })

    await httpServer.start()
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
    await wsClient.call('test', 'empty', {})

    expect(wsServer.ws.clients.size).toEqual(1)

    await wsClient.disconnect()

    expect(wsServer.ws.clients.size).toEqual(0)
    expect(wsServer.connectionInfoMap.size).toEqual(0)
  })

  test('should report about wrong endpoint', async () => {
    const wsClient = new WSClient(WS_URL, false)
    const response = await wsClient.call('test', '_test', {}, true)
    expect(response.error).toEqual('Handler does not exist test:_test')
    wsClient.disconnect().catch(logger.error)
  })

  test('should broadcast', async () => {
    wsServer.onRequest('test', 'broadcast', async (request: WSRequest, currentConnection: IConnectionInfo, currentClient: WebSocket) => {
      wsServer.broadcast(async (connection: IAppConnectionInfo, client) => {
        if (currentClient !== client) {
          return WSResponse.createEventResponse('test:new', { msg: 'test' })
        }

        return null
      })

      return {
        status: 'success',
      }
    })

    const startCommand = process.hrtime()
    const clients = []
    let responses = 0
    const clientNumber = 200
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
      promises.push(wsClient.isConnectionOpen.isReady())
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
    const clients = []
    const promises = []
    for (let j = 0; j < 50; j++) {
      const wsClient = new WSClient(WS_URL, false)

      clients.push(wsClient)
      promises.push(wsClient.isConnectionOpen.isReady())
    }

    for (let j = 0; j < 50; j++) {
      const wsClient = new WSClient(WS_URL, false)

      clientsToBeBroken.push(wsClient)
      promises.push(wsClient.isConnectionOpen.isReady())
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
    await wsClient.isConnectionOpen.isReady()
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
    await wsClient.isConnectionOpen.isReady()
    await wsClient.disconnect()
    await onEventDone.isReady()
    onDisconnectClose()
    expect(true).toBeTruthy()
  })

  test('should send 5000 messages', async () => {
    wsServer.onRequest('test', 'sleep', async (request: WSRequest, connectionInfo: IConnectionInfo) => {
      await sleep(randomInt(1, 2) * 1000)

      return {
        status: 'success',
      }
    })

    const wsClient = new WSClient(WS_URL, false)

    const promises = []
    for (let i = 0; i < 5000; i++) {
      promises.push(wsClient.call('test', 'sleep', {}))
    }

    const startCommand = process.hrtime()
    await Promise.all(promises)
    const endCommand = process.hrtime(startCommand)
    const wordsCommand = hrtime(endCommand)
    logger.info(`5000 messages send time: ${wordsCommand}`)

    expect(true).toBeTruthy()
  })
})

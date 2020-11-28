import path from 'path'
import { WSClient } from '../app/lib/WSClient'
import { HttpServer } from '../../core/http/HttpServer'
import { IConnection, WSServer } from '../../core/ws/WSServer'
import { WSRequest } from '../../core/ws/WSRequest'
import { sleep } from '../../core/utils/sleep'
import { logger } from '../../core/logger/logger'
import { ILoggerConfig } from '../../core/logger/config'
import { TransportWinston } from '../../core/logger/transport/TransportWinston'

jest.setTimeout(10000)

const WS_URL = 'ws://localhost:8000/ws'

describe('Test WSServer', () => {
  let httpServer: HttpServer
  let wsServer: WSServer

  beforeAll(async () => {
    function initLogger() {
      const runtimeDir = path.resolve(`${__dirname}/../../runtime/tests`)
      logger.setConfig({
        debug: true,
        info: true,
        warn: true,
      } as ILoggerConfig)
      logger.addTransport(new TransportWinston(runtimeDir))
    }

    initLogger()

    httpServer = new HttpServer({ port: 8000, host: 'localhost' })
    wsServer = new WSServer({ port: 8000, keepalive: 60 * 1000, path: '/ws' }, httpServer.getServer().server)
    wsServer.onRequest('article', 'test', async (request: WSRequest, connection: IConnection<any>) => {
      return {
        status: 'success',
      }
    })
    await httpServer.start()
  })

  afterAll(async () => {
    wsServer.destroy()
    await httpServer.destroy()
  })

  test('should connect and disconnect', async () => {
    const wsClient = new WSClient(WS_URL, false)
    await wsClient.call('article', 'test', {})

    let connections = wsServer.getConnections()
    expect(connections.length).toEqual(1)

    wsClient.disconnect()
    await sleep(1000)
    logger.info('check connections')
    connections = wsServer.getConnections()
    expect(connections.length).toEqual(0)
  })

  test('should report about wrong endpoint', async () => {
    const wsClient = new WSClient(WS_URL, false)
    const response = await wsClient.call('article', '_test', {}, true)
    expect(response.message).toEqual('Handler does not exist article:_test')
    wsClient.disconnect()
  })
  //
  // test('should keepalive', async () => {
  //   const wsClient = new WSClient(WS_URL, false)
  //   await sleep(10000)
  //   wsClient.disconnect()
  // })
})

import { Ready } from '../../core/utils/ready'

describe('Ready', () => {
  test('test', async () => {
    const ready = new Ready()

    ready.resolve()


    expect(await ready.isReady()).toBeTrue()
  })
})

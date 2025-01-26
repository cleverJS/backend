import { logger } from '../../../core/logger/logger'
import { JSONXpathTransformConfig, JSONXPathTransformerHelper } from '../../../core/utils/helpers/JSONXPathTransformerHelper'
import { cacheContainer } from '../../../demo/CacheContainer'

describe('Test JSONXPathTransformerHelper', () => {
  beforeAll(async () => {
    JSONXPathTransformerHelper.instance(cacheContainer.cacheRuntime)
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  afterAll(() => {
    cacheContainer.cacheRuntime.clear()
  })

  it('should stringify target node', async () => {
    const config: JSONXpathTransformConfig = {
      'stringify(user/address/street:street,user/address/city:city)': 'location',
    }

    try {
      const result = await JSONXPathTransformerHelper.instance().transform(input, config)

      expect({
        location: '{"street":"123 Main St","city":"Anytown"}',
      }).toEqual(result)
    } catch (e) {
      logger.error(e)
    }
  })

  it('should stringify target node with a parsed value', async () => {
    const config: JSONXpathTransformConfig = {
      'stringify(user/address/street:street,user/address/city:city,parse(preferences/settings)/country:country)': 'location',
    }

    try {
      const result = await JSONXPathTransformerHelper.instance().transform(input, config)

      expect({
        location: '{"street":"123 Main St","city":"Anytown","country":"Slovenia"}',
      }).toEqual(result)
    } catch (e) {
      logger.error(e)
    }
  })

  it('should stringify target node with a parsed values', async () => {
    const config: JSONXpathTransformConfig = {
      'stringify(user/address/street:street,user/address/city:city,parse(preferences/settings):settings)': 'location',
    }

    try {
      const result = await JSONXPathTransformerHelper.instance().transform(input, config)

      expect({
        location: `{\"street\":\"123 Main St\",\"city\":\"Anytown\",\"settings\":{\"theme\":\"dark\",\"notifications\":true,\"country\":\"Slovenia\"}}`,
      }).toEqual(result)
    } catch (e) {
      logger.error(e)
    }
  })

  it('should transform', async () => {
    const config: JSONXpathTransformConfig = {
      'user/name': 'fullName',
      'user/age': 'age',
      'user/address/street': 'location/street',
      'user/address/city': 'location/city',
      'job/title': 'occupation',
      'job/company': 'employer',
      'stringify(user/address/street,user/address/city,parse(preferences/settings)/country:user/address/country)': 'locationJson',
      'parse(preferences/settings)': 'settings',
      'parse(preferences/history)': 'visitedPages',
    }

    try {
      const result = await JSONXPathTransformerHelper.instance().transform(input, config)

      expect({
        fullName: 'John Doe',
        age: 30,
        location: {
          street: '123 Main St',
          city: 'Anytown',
        },
        occupation: 'Developer',
        employer: 'Tech Corp',
        locationJson: `{\"user\":{\"address\":{\"street\":\"123 Main St\",\"city\":\"Anytown\",\"country\":\"Slovenia\"}}}`,
        settings: {
          theme: 'dark',
          notifications: true,
          country: 'Slovenia',
        },
        visitedPages: ['page1', 'page2'],
      }).toEqual(result)
    } catch (e) {
      logger.error(e)
    }
  })

  it('should stringify only value when one parameter and no any explicit', async () => {
    const config: JSONXpathTransformConfig = {
      'stringify(parse(user/other)/skills)': 'skills',
    }

    try {
      const result = await JSONXPathTransformerHelper.instance().transform(input, config)

      expect({
        skills: '[{"name":"Communication"},{"name":"Adaptability"}]',
      }).toEqual(result)
    } catch (e) {
      logger.error(e)
    }
  })
})

const input = {
  user: {
    name: 'John Doe',
    age: 30,
    address: {
      street: '123 Main St',
      city: 'Anytown',
    },
    other: '{"skills":[{"name":"Communication"},{"name":"Adaptability"}]}',
  },
  job: {
    title: 'Developer',
    company: 'Tech Corp',
  },
  preferences: {
    settings: '{"theme":"dark","notifications":true,"country":"Slovenia"}',
    history: '["page1","page2"]',
  },
}

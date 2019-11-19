import { SecurityHelper } from './SecurityHelper'
import { EntityFactory } from '../../../core/entity/EntityFactory'
import { User } from '../user/User'
import { settings } from '../../../app/configs'

describe('SecurityHelper', () => {
  const securityHelper = new SecurityHelper(settings.security)

  it('should crypt and verify correct password', async () => {
    const cryptoPassword = await securityHelper.cryptPassword('password')
    if (cryptoPassword.hash) {
      const result = await securityHelper.verifyPassword(cryptoPassword.hash, 'password')
      expect(true).toEqual(result)
    }
  })

  it('should crypt and verify incorrect password', async () => {
    const cryptoPassword = await securityHelper.cryptPassword('password')
    if (cryptoPassword.hash) {
      const result = await securityHelper.verifyPassword(cryptoPassword.hash, 'password1')
      expect(false).toEqual(result)
    }
  })

  it('should generate token and successfully verify it', async () => {
    const user = (new EntityFactory(User, User.cast)).create({
      id: '1',
      email: 'test@test.tld',
    })
    const token = securityHelper.generateToken({ id: user.id, email: user.email })
    const result = await securityHelper.verifyToken(token)
    if (result && typeof result === 'object') {
      const actual = { data: { email: result.data.email, id: result.data.id } }
      expect(actual).toEqual({ data: { email: 'test@test.tld', id: '1' } })
    }
  })

  it('should fail verify wrong token', async () => {
    const token =
      // tslint:disable-next-line:max-line-length
      'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoiMSIsImVtYWlsIjoidGVzdEB0ZXN0LnRsZCIsInRzIjoxNTY1NDk0NzYyMjM5fSwiaWF0IjoxNTY1NDk0NzYyLCJleHAiOjE1NjU1MTYzNjJ9.R48YN-VxlY4GrSveKcML0_Kqn5WPP4PnbuMbxVBnYLEvmFvFHMlxtdvtN_x9bT-gtg1sEqlx9QMy-dxlck-YxdtceLhcKJRu6M-t3d2Yf-i_LdqyJeBxh195AiaOazmCrtvrbZXC1ji_i4NfYuS8PoYQJ70ayR-Gsodv9gFwFGJQ1CPhQ3UDAPvelcFH-I2-yj-12L5Fh7j6OPxcVuQAVRminuQszjbSE8ttZcIL5SuD_9awPvyiotuvZaHUgZi0HpdorBKYF0M9TAyel6oveBUnrGWTr1jgIahkt9sNNa8Ng60OmEyUD-26itdnGlsfiTh4QiVZwCppK5xywJxcRgWRONG'
    const result = await securityHelper.verifyToken(token)
    expect(result).toEqual(null)
  })
})

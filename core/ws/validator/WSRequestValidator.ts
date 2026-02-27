import { IWSRequest } from '../WSRequest'

export function validateWSRequest(request: IWSRequest): boolean {
  const { header, payload } = request ?? {}

  if (typeof header !== 'object' || header === null) {
    return false
  }

  const { uuid, service, action } = header

  if ((typeof uuid !== 'string' && typeof uuid !== 'number') || typeof service !== 'string' || typeof action !== 'string') {
    return false
  }

  if (payload !== undefined && (typeof payload !== 'object' || payload === null)) {
    return false
  }

  return true
}

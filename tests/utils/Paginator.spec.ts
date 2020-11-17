import { Paginator } from '../../core/utils/Paginator'

describe('Test Paginator', () => {
  test('should calculate page count', async () => {
    const paginator = new Paginator()
    paginator.setItemsPerPage(10)
    paginator.setTotal(252)

    expect(paginator.getPageCount()).toEqual(26)
  })

  test('should set next page', async () => {
    const paginator = new Paginator()

    expect(paginator.getCurrentPage()).toEqual(1)
    paginator.nextPage()
    expect(paginator.getCurrentPage()).toEqual(2)
  })

  test('should set any page', async () => {
    const paginator = new Paginator()

    expect(paginator.getCurrentPage()).toEqual(1)
    paginator.setCurrentPage(10)
    expect(paginator.getCurrentPage()).toEqual(10)
  })

  test('should getCurrentPages', async () => {
    const paginator = new Paginator()
    paginator.setItemsPerPage(10)
    paginator.setTotal(252)

    expect(paginator.getCurrentPages()).toEqual([1, 2, 3, 4, 5])

    paginator.setCurrentPage(20)
    expect(paginator.getCurrentPages()).toEqual([18, 19, 20, 21, 22])

    paginator.setCurrentPage(26)
    expect(paginator.getCurrentPages()).toEqual([22, 23, 24, 25, 26])
  })
})

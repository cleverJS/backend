export class Paginator {
  protected currentPage: number = 1
  protected itemsPerPage: number = 10
  protected total: number = 0

  public getPageCount() {
    if (!this.getItemsPerPage()) {
      return 0
    }
    return Math.ceil(this.getTotal() / this.getItemsPerPage())
  }

  public getCurrentPage() {
    return this.currentPage
  }

  public setCurrentPage(currentPage: number) {
    this.currentPage = currentPage
  }

  public getItemsPerPage() {
    return this.itemsPerPage
  }

  public setItemsPerPage(value: number) {
    this.itemsPerPage = value
  }

  public getTotal() {
    return this.total
  }

  public setTotal(total: number) {
    this.total = total
    this.validate()
  }

  public getOffset() {
    return this.itemsPerPage * (this.currentPage - 1)
  }

  public getLimit() {
    return this.itemsPerPage
  }

  public getCurrentPages() {
    const result = []
    const pageCurrent = this.getCurrentPage()
    const pageCount = this.getPageCount()

    if (pageCount) {
      if (pageCount <= 5) {
        for (let i = 1; i <= pageCount; i++) {
          result.push(i)
        }
      } else if (pageCurrent <= 3) {
        for (let i = 1; i <= 5; i++) {
          result.push(i)
        }
      } else if (pageCount - pageCurrent <= 2) {
        for (let i = pageCount - 4; i <= pageCount; i++) {
          result.push(i)
        }
      } else {
        for (let i = pageCurrent - 2; i <= pageCurrent + 2; i++) {
          result.push(i)
        }
      }
    }

    return result
  }

  protected validate() {
    if (this.currentPage < 1) {
      this.currentPage = 1
    }

    if (this.itemsPerPage < 1) {
      this.itemsPerPage = 1
    }

    if (this.total < 0) {
      this.total = 0
    }

    if (this.itemsPerPage * (this.currentPage - 1) > this.total) {
      this.currentPage = 1
    }
  }
}

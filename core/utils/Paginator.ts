export class Paginator {
  protected currentPage: number = 1
  protected itemsPerPage: number = 10
  protected total: number = 0
  protected skipTotal: boolean = false

  public getPageCount(): number {
    if (!this.getItemsPerPage()) {
      return 0
    }
    return Math.ceil(this.getTotal() / this.getItemsPerPage())
  }

  public getCurrentPage(): number {
    return this.currentPage
  }

  public nextPage(): void {
    this.setCurrentPage(++this.currentPage)
  }

  public setCurrentPage(currentPage: number): void {
    if (currentPage === 0) {
      currentPage = 1
    }
    this.currentPage = currentPage
  }

  public getItemsPerPage(): number {
    return this.itemsPerPage
  }

  public setItemsPerPage(value: number): void {
    this.itemsPerPage = value
  }

  public getTotal(): number {
    return this.total
  }

  public setTotal(total: number): void {
    this.total = total
    this.validate()
  }

  public setSkipTotal(value: boolean): void {
    this.skipTotal = value
  }

  public isSkipTotal(): boolean {
    return this.skipTotal
  }

  public getOffset(): number {
    return this.itemsPerPage * (this.currentPage - 1)
  }

  public getLimit(): number {
    return this.itemsPerPage
  }

  public getCurrentPages(): number[] {
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

  protected validate(): void {
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

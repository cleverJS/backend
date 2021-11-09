export const sleep = (ms: number): Promise<NodeJS.Timeout> => {
  return new Promise((resolve: any) => setTimeout(resolve, ms))
}

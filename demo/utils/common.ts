export function currentDateFunction() {
  const currentDate = new Date()
  currentDate.setMilliseconds(0)
  return currentDate
}

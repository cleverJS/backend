export const outerSquareBrackets = new RegExp(/\[((?:\[(?:\[.*?]|.)*?]|.)*?)]/g)
export const stringifiedObject = /^\{.*}$|^\[.*]$/
export const dateStringWithOffset = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}((\+|-)[0-1][0-9]:[0-1][0-9])?$/

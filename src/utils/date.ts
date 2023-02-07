const options: Intl.DateTimeFormatOptions = {
  timeZone: 'Europe/Istanbul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}

export const currentDate = () => {
  const date = new Date()
  const formattedDate = new Intl.DateTimeFormat('en-US', options).format(date)
  const currentDateString = formattedDate.replace(
    /(\d+)\/(\d+)\/(\d+)/,
    '$3-$1-$2'
  )

  return currentDateString
}

export const nextDate = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  const formattedDate = new Intl.DateTimeFormat('en-US', options).format(date)
  const nextDateString = formattedDate.replace(
    /(\d+)\/(\d+)\/(\d+)/,
    '$3-$1-$2'
  )

  return nextDateString
}

import 'dotenv/config'
import isArrEqual from './utils/isArrEqual'
import TelegramBot from 'node-telegram-bot-api'
import { currentDate, nextDate } from './utils/date'
import wait from './utils/wait'

interface Earthquake {
  country: string | null
  date: string
  depth: string
  district: string | null
  eventID: string
  isEventUpdate: boolean
  lastUpdateDate: string | null
  latitude: string
  location: string
  longitude: string
  magnitude: string
  neighborhood: string | null
  province: string | null
  rms: string
  type: string
}

// Bot setup
const bot = new TelegramBot(process.env.TOKEN!, { polling: true })

// Getting latest data from the API

const apiURL = (startDate: string, endDate: string) => {
  return `https://deprem.afad.gov.tr/apiv2/event/filter?start=${startDate}&end=${endDate}&orderby=time&minmag=3.5`
}

let currentEarthquakes: Earthquake[] = []

const fetchEarthquakes = async () => {
  const URL = apiURL(currentDate(), nextDate())
  console.log(URL)

  const response = await fetch(URL)
  const latestEarthquakes: Earthquake[] = await response.json()

  if (isArrEqual(currentEarthquakes, latestEarthquakes)) {
    return
  } else if (currentEarthquakes.length === 0) {
    currentEarthquakes = latestEarthquakes
    return
  } else {
    const newEarthquakes = latestEarthquakes.filter((earthquake) => {
      const isNew = currentEarthquakes.every(
        (ce) => ce.eventID !== earthquake.eventID
      )
      if (isNew && +earthquake.magnitude >= 3.5) return true // 3.5 for testing
    })

    currentEarthquakes = latestEarthquakes

    newEarthquakes.forEach((earthquake) => {
      const timestamps = earthquake.date.split('T')
      const date = timestamps[0]
      const time = timestamps[1]

      let message = ''

      message += '<b>هزة ارضية جديدة</b>'
      message += '\n\n'
      message += `التاريخ: ${date}`
      message += '\n\n'
      message += `الساعة: ${time}`
      message += '\n\n'
      message += `القوة: <b>${earthquake.magnitude}</b>`
      message += '\n\n'
      message += `الولاية: ${earthquake.province}`
      message += '\n\n🇹🇷'

      bot.sendMessage(process.env.CHANNEL_ID!, message, {
        parse_mode: 'HTML',
      })
    })
  }
}

const start = async () => {
  while (true) {
    try {
      await fetchEarthquakes()
      await wait(10000)
    } catch (err) {
      console.error(err)
    }
  }
}

start()

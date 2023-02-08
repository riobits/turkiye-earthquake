import dotenv from 'dotenv'
import TelegramBot from 'node-telegram-bot-api'
import isArrEqual from './utils/isArrEqual'
import wait from './utils/wait'
import { currentDate, fixTime, nextDate } from './utils/date'
import { Earthquake } from './types'

// enviorment variables
dotenv.config({ path: '.env' })
const botChannelId = process.env.CHANNEL_ID!
const modChannelId = process.env.MOD_CHANNEL_ID!
const token = process.env.MOD_CHANNEL_ID!

// Bot setup
const bot = new TelegramBot(token, { polling: true })

// Getting latest data from the API
const minMagnitude = 3.0
const apiURL = (startDate: string, endDate: string) => {
  return `https://deprem.afad.gov.tr/apiv2/event/filter?start=${startDate}&end=${endDate}&orderby=time&minmag=${minMagnitude}`
}

let currentEarthquakes: Earthquake[] = []

const fetchEarthquakes = async () => {
  try {
    const URL = apiURL(currentDate(), nextDate())

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
        if (isNew && +earthquake.magnitude >= minMagnitude) return true
      })

      currentEarthquakes = latestEarthquakes

      for (const earthquake of newEarthquakes) {
        const timestamps = earthquake.date.split('T')
        const date = timestamps[0]
        const time = fixTime(timestamps[1])

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

        await bot.sendMessage(botChannelId, message, {
          parse_mode: 'HTML',
        })
      }
    }
  } catch (err: any) {
    console.error('Error while fetching earthquakes:')
    console.error(err)
    await bot.sendMessage(
      modChannelId,
      'There was an error while fetching earthquakes, check the console!'
    )
    await bot.sendMessage(modChannelId, `Error:\n${err.message}`)
  }
}

bot.on('polling_error', async (err) => {
  console.log('polling error:')
  console.error(err)
  await bot.sendMessage(
    modChannelId,
    'There is an error, check the console for more info.'
  )
  await bot.sendMessage(modChannelId, err.message)
})

bot.onText(/\/suggest (.+)/, async (msg, match: any) => {
  const chatId = msg.chat.id
  const resp = match[1]
  const { username } = await bot.getChat(chatId)

  await bot.sendMessage(
    modChannelId!,
    `<pre>${chatId}</pre>\nNew Suggestion from @${username}:\n\n${resp}`,
    { parse_mode: 'HTML' }
  )

  await bot.sendMessage(
    chatId,
    `سيتم الرد على رسالتك في اقرب وقت شكرا لتعاونكم.`
  )
})

bot.onText(/\/helpus (.+)/, async (msg, match: any) => {
  const chatId = msg.chat.id
  const resp = match[1]
  const { username } = await bot.getChat(chatId)

  await bot.sendMessage(
    modChannelId!,
    `<pre>${chatId}</pre>\n@${username} wants to help us:\n\n${resp}`,
    { parse_mode: 'HTML' }
  )
  await bot.sendMessage(
    chatId,
    `سيتم الرد على رسالتك في اقرب وقت شكرا لتعاونكم.`
  )
})

bot.onText(/\/reply (.+)/, async (msg, match: any) => {
  const chatId = msg.chat.id
  console.log(chatId, modChannelId)

  if (`${chatId}` !== modChannelId) return

  const resp = match[1].split(' ')
  const code = resp[0]
  delete resp[0]

  await bot.sendMessage(code, resp.join(' '))
})

const start = async () => {
  while (true) {
    try {
      await fetchEarthquakes()
      await wait(30000)
    } catch (err) {
      console.error(err)
    }
  }
}

start()

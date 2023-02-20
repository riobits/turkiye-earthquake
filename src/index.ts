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
const token = process.env.TOKEN!

// Bot setup
const bot = new TelegramBot(token, { polling: true })

// Getting latest data from the API
const minMagnitude = 5.0
const apiURL = (startDate: string, endDate: string) => {
  return `https://deprem.afad.gov.tr/apiv2/event/filter?start=${startDate}&end=${endDate}&orderby=time&minmag=${minMagnitude}`
}

let currentEarthquakes: Earthquake[] = []
let initialFetch = true

const fetchEarthquakes = async () => {
  try {
    const URL = apiURL(currentDate(), nextDate())

    const response = await fetch(URL)
    const latestEarthquakes: Earthquake[] = await response.json()

    const isDataEqual = isArrEqual(currentEarthquakes, latestEarthquakes)

    if (isDataEqual) return

    if (initialFetch) {
      currentEarthquakes = latestEarthquakes
      initialFetch = false
      return
    }

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
      message += '\n\n🇹🇷 https://t.me/turkiye_earthquake'

      await bot.sendMessage(botChannelId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      })
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
})

bot.onText(/\/start/, async (msg, match: any) => {
  const chatId = msg.chat.id
  const resp = match[1]
  const { username } = await bot.getChat(chatId)

  await bot.sendMessage(
    chatId,
    `السلام عليكم, يرجى إرسال الرسائل المتعلقة بالإقتراحات عن طريق ` +
      `/suggest\n` +
      `وإن أردتم ان تساعدونا بأي شكل من الأشكال يرجى إرسالها عن طريق ` +
      `/helpus`,
    {
      parse_mode: 'HTML',
    }
  )
})

bot.onText(/^\/suggest$/, async (msg, match: any) => {
  const chatId = msg.chat.id
  const resp = match[1]
  const { username } = await bot.getChat(chatId)

  await bot.sendMessage(
    chatId,
    `يرجى إرسال الرسائل بهذا الشكل: \n` + `/suggest لدي اقتراح بما يخض...`,
    {
      parse_mode: 'HTML',
    }
  )
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

bot.onText(/^\/helpus$/, async (msg, match: any) => {
  const chatId = msg.chat.id
  const resp = match[1]
  const { username } = await bot.getChat(chatId)

  await bot.sendMessage(
    chatId,
    `يرجى إرسال الرسائل بهذا الشكل: \n` + `/helpus أردت أن أساعدكم ب...`,
    {
      parse_mode: 'HTML',
    }
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

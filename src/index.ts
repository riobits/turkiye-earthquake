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
  return `https://deprem.afad.gov.tr/apiv2/event/filter?start=${startDate}&end=${endDate}&orderby=time&minmag=5.0`
}

let currentEarthquakes: Earthquake[] = []

const fetchEarthquakes = async () => {
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
      if (isNew && +earthquake.magnitude >= 5.0) return true
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

bot.onText(/\/suggest (.+)/, async (msg, match: any) => {
	const chatId = msg.chat.id;
	const resp = match[1];
	const { username } = await bot.getChat(chatId);

	await bot.sendMessage(
		process.env.MOD_CHANNEL_ID!,
		`<pre>${chatId}</pre>\nNew Suggestion from @${username}:\n\n${resp}`,
		{ parse_mode: 'HTML' }
	);

	await bot.sendMessage(
		chatId,
		`سيتم الرد على رسالتك في اقرب وقت شكرا لتعاونكم.`
	);
});

bot.onText(/\/helpus (.+)/, async (msg, match: any) => {
	const chatId = msg.chat.id;
	const resp = match[1];
	const { username } = await bot.getChat(chatId);

	await bot.sendMessage(
		process.env.MOD_CHANNEL_ID!,
		`<pre>${chatId}</pre>\n@${username} wants to help us:\n\n${resp}`,
		{ parse_mode: 'HTML' }
	);
	await bot.sendMessage(
		chatId,
		`سيتم الرد على رسالتك في اقرب وقت شكرا لتعاونكم.`
	);
});

bot.onText(/\/reply (.+)/, async (msg, match: any) => {
	const chatId = msg.chat.id;
	console.log(chatId, process.env.MOD_CHANNEL_ID);

	if (`${chatId}` !== process.env.MOD_CHANNEL_ID) return;

	const resp = match[1].split(' ');
	const code = resp[0];
	delete resp[0];

	await bot.sendMessage(code, resp.join(' '));
});

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

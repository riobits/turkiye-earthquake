import 'dotenv/config'
import puppeteer from 'puppeteer'
import isArrEqual from './utils/isArrEqual'
import TelegramBot from 'node-telegram-bot-api'

// bot setup

const bot = new TelegramBot(process.env.TOKEN!, { polling: true })

// scrapper

const AFAD_WEBSITE = 'https://deprem.afad.gov.tr/last-earthquakes.html'

const tableSelector = 'tbody'

let currentPlaces: any[] = []

const scrape = async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()

  await Promise.all([
    page.goto(AFAD_WEBSITE),
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
  ])

  const latestPlaces = await page.evaluate((s) => {
    const last3Elements = [
      document.querySelector(s + ' > tr:nth-child(1)')!,
      document.querySelector(s + ' > tr:nth-child(2)')!,
      document.querySelector(s + ' > tr:nth-child(3)')!,
    ]

    return last3Elements.map((e) => {
      const timestamp = e.querySelector('td:nth-child(1)')!.innerHTML.split(' ')
      const size = e.querySelector('td:nth-child(6)')!.innerHTML
      const city = e.querySelector('td:nth-child(7)')!.innerHTML
      const id = e.querySelector('td:nth-last-child(1)')!.innerHTML

      const date = timestamp[0]
      const time = timestamp[1]

      return {
        date,
        time,
        size,
        city,
        id,
      }
    })
  }, tableSelector)

  if (isArrEqual(currentPlaces, latestPlaces)) {
    return
  } else {
    const newPlaces = latestPlaces.filter(
      (place) => !currentPlaces.includes(place.id) && +place.size >= 3 // testing
    )

    currentPlaces = latestPlaces

    newPlaces.forEach((place) => {
      let message = ''

      message += '<b>هزة ارضية جديدة</b>'
      message += '\n\n'
      message += `تاريخ: ${place.date}`
      message += '\n\n'
      message += `الساعة: ${place.time}`
      message += '\n\n'
      message += `<b>القوة: ${place.size}</b>`
      message += '\n\n'
      message += 'المدينة:'
      message += '\n'
      message += place.city
      message += '\n\n🇹🇷'

      bot.sendMessage(process.env.CHANNEL_ID!, message, {
        parse_mode: 'HTML',
      })
    })
  }

  await browser.close()
}

setInterval(async () => {
  await scrape()
}, 1000 * 60)

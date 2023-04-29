import { Client } from "whatsapp-web.js";
import * as qrcode from "qrcode"
import { ChatManager } from "./libs/index.js"



const client = new Client({
    puppeteer: {
        args: ['--no-sandbox'],
    }
})

const chatManager = new ChatManager(client)


client.on('qr', (qr) => {
    console.log("QR received:")

    qrcode.toString(qr, { type: "terminal", scale: 1, small: true}, (err, qrcode) => {
        if (err)
            console.log("Qrcode error!")
        else
            console.log(qrcode)
    })
})

client.on('ready', () => {
    console.log("client is ready")
})

client.on("message", async (message) => {
    console.log(`${message.from}: ${message.body}`)

    let reply = await chatManager.reply(message)

    if (reply)
        client.sendMessage(message.from, reply)
})

client.initialize()


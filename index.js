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

    const chat = await message.getChat()

    // send typing state
    chat.sendStateTyping();

    let reply = await chatManager.reply(message)

    // Typing state
    chat.clearState()

    if (reply)
        client.sendMessage(message.from, reply)
})

client.on('call', async (call) => {
    await call.reject()
    client.sendMessage(call.from, "🥺 Please don't call me.")
})

client.on('disconnected', reason => {
    console.log('Client was logged out', reason);
})

client.initialize()


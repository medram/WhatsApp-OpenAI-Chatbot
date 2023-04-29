import fs from "fs"
import { Readable } from "stream"

import { Configuration, OpenAIApi } from "openai"
import ffmpeg from 'fluent-ffmpeg';


const DEFAULT_AI_MODEL = "gpt-3.5-turbo"

const defaultSystemInstructions = "You're an enthusiastic chat bot called XChat, answering qestions."

const VALID_COMMANDS = [
    "/clear",
    "/help"
]


const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);


export class ChatBot
{
    constructor(systemInstructions = defaultSystemInstructions)
    {
        this._systemInstructions = systemInstructions
        this.chat = this.initializeChat()
    }

    initializeChat()
    {
        return [
            { role: "system", content: this._systemInstructions }
        ]
    }

    async getReply(message)
    {
        // register message
        this.chat[this.chat.length] = { role: "user", content: message }

        const reply = await this.generateReply()

        console.log("Assistant: ")
        console.log(reply)

        // register reply
        this.chat[this.chat.length] = { role: "assistant", content: reply }
        return reply
    }

    async generateReply()
    {
        const completion = await openai.createChatCompletion({
            model: DEFAULT_AI_MODEL,
            messages: this.chat,
        });

        return completion.data.choices[0].message.content
    }

    clear()
    {
        this.chat = this.initializeChat()
    }
}


export class ChatManager
{
    constructor(client)
    {
        this._chats = []
        this._client = client
    }

    async reply(message)
    {
        // check & execute command.
        if (this.isCommand(message))
            return this.execute(message)

        // is audio
        if (this.isAudio(message))
        {
            const media = await message.downloadMedia()
            if (media)
            {
                const buffer = Buffer.from(media.data, "base64")
                let readableAudio = Readable.from(buffer)

                const text = await this._SpeechToText(readableAudio, message)
                console.log("Text:", text)
                message.body = text || ""
            }
        }

        const chatbot = this._getChatBot(message)

        const reply = await chatbot.getReply(message.body)

        // TODO: return the reply
        // return client.sendMessage(message.from, reply)
        return reply
    }

    execute(message)
    {
        if (this.isCommand(message))
        {
            // execute command
            const chatbot = this._getChatBot(message)
            const command = message.body.trim()

            switch (command)
            {
                case "/clear":
                    this._clearChatBot(message, chatbot)
                break
                case "/help":
                    this._showHelpCommands(message)
                break
                default:
                    this._client.sendMessage(message.from, "Invalid command!")
                    this._showHelpCommands(message)
            }
        }
    }

    isAudio(message)
    {
        return message.hasMedia && message._data.mimetype.toLowerCase().includes("audio")
    }

    isCommand(message)
    {
        return message.body[0] === "/" && VALID_COMMANDS.includes(message.body.trim().toLowerCase())
    }

    _SpeechToText(readableAudio, message)
    {
        let audioPath = this._generateAudioPath(message)

        const command = ffmpeg(readableAudio)
            .format("mp3")
            .audioCodec('libmp3lame')
            .output(fs.createWriteStream(audioPath))

        return new Promise((resolve, reject) => {
            command.on('end', async () => {
                try {
                    let transcription = await openai.createTranscription(fs.createReadStream(audioPath), 'whisper-1')
                    // assign audio transcription to chat content.
                    resolve(transcription.data.text)

                } catch (error) {
                    if (error.response && error.response.status === 400) {
                        reject('OpenAI Bad request:', error.response.data)
                    } else {
                        reject('OpenAI Error:', error.message)
                    }
                }
            })
            .on('error', function (err) {
                reject('ffmpeg error occurred: ' + err.message)
            })
            .run()
        })
    }

    _generateAudioPath(message)
    {
        const folder = `tmp/${message.from}`
        if (!fs.existsSync(folder))
            fs.mkdirSync(folder)
        return `${folder}/${this._generateAudioName()}`
    }

    _generateAudioName()
    {
        return new Date().toGMTString().replaceAll(" ", "_").replaceAll(":", ".").replaceAll(",", "") + '.mp3'
    }

    _getChatBot(message)
    {
        // TODO: get the correct chat room.
        if (this._chats[message.from] === undefined)
        {
            this._chats[message.from] = new ChatBot()
        }

        return this._chats[message.from]
    }

    _clearChatBot(message, chatbot)
    {
        chatbot.clear()
        this._client.sendMessage(message.from, "Conversation successfully cleared!")
    }

    _showHelpCommands(message)
    {
        this._client.sendMessage(message.from, `Chat Bot Available Commands:
/clear\t to clear chat conversation form chat bot.
/help\t to show help.
        `)
    }
}

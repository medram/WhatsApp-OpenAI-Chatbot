import { Configuration, OpenAIApi } from "openai"

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
        this.execute(message)

        const chatbot = this._getChatBot(message)

        const reply = await chatbot.getReply(message.body)

        // TODO: return the reply
        // return client.sendMessage(message.from, reply)
        return reply
    }

    execute(message)
    {
        if (message.body[0] === "/" && VALID_COMMANDS.includes(message.body.trim()) )
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

import { MessageEmbed, MessageEmbedOptions } from 'discord.js'
import assert from 'node:assert'

type EmbedIntent = 'info' | 'success' | 'warning' | 'error'

export interface EmbedOptions {
  noColor?: boolean
  noAuthor?: boolean
  intent?: EmbedIntent
  noTimestamp?: boolean
}

const SERVER_ADDRESS = process.env.SERVER_ADDRESS

assert(SERVER_ADDRESS, '$SERVER_ADDRESS is not set')

const intentText = (message: string, desc?: string) => `${message}${desc ? `\n${desc}` : ''}`

export class Embed extends MessageEmbed {
  static error(message: string, description?: string): Embed {
    return new Embed({ intent: 'error', description: intentText(message, description) })
  }

  static warning(message: string, description?: string): Embed {
    return new Embed({ intent: 'warning', description: intentText(message, description) })
  }

  static success(message: string, description?: string): Embed {
    return new Embed({ intent: 'success', description: intentText(message, description) })
  }

  static info(message: string, description?: string): Embed {
    return new Embed({ intent: 'info', description: intentText(message, description) })
  }

  constructor(options?: (MessageEmbed | MessageEmbedOptions) & EmbedOptions) {
    super(options)

    if (!this.author && !options?.noAuthor) {
      this.setAuthor(SERVER_ADDRESS!, 'attachment://grass.png', process.env.WEBSITE)
    }

    if (!options?.noTimestamp) this.setTimestamp()

    if (!this.color && !options?.noColor) {
      switch (options?.intent) {
        case 'error':
          this.setColor(0xfb4b4e)
          break
        case 'warning':
          this.setColor(0xff8d1e)
          break
        case 'success':
          this.setColor(0x8eef43)
          break
        case 'info':
        default:
          this.setColor(0x209fd5)
      }
    }
  }

  addBlankField(): this {
    this.addField('\u200b', '\u200b')
    return this
  }
}

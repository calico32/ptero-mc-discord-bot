import axios, { AxiosRequestConfig } from 'axios'
import {
  ApplicationCommandData,
  Client,
  HTTPAttachmentData,
  MessageActionRow,
  MessageButton,
  MessagePayload,
} from 'discord.js'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Embed } from './embed.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const files: HTTPAttachmentData[] = [
  await MessagePayload.resolveFile({
    attachment: readFileSync(resolve(__dirname, '..', 'assets/grass.png')),
    name: 'grass.png',
  }),
]

const client = new Client({ intents: [] })
const httpOptions: AxiosRequestConfig = {
  headers: {
    Accept: 'application/json',
    Authorization: 'Bearer ' + process.env.PANEL_API_TOKEN,
    'Content-Type': 'application/json',
  },
}
const baseUrl = process.env.PANEL_URL
const serverId = process.env.SERVER_ID
const proxyServerId = process.env.PROXY_SERVER_ID

let lastPlayerCount: number | null = null
const setPresence = async () => {
  let playerCount = null

  try {
    const { data } = await axios.get(process.env.PLAYER_LIST_ENDPOINT!)
    if (data.players.length !== lastPlayerCount) {
      playerCount = data.players.length
    }
  } catch {
    playerCount = null
  }

  if (playerCount === lastPlayerCount) {
    return
  }

  lastPlayerCount = playerCount

  client.user?.setPresence({
    activities: [
      {
        type: 'PLAYING',
        name: `${
          playerCount != null
            ? `with ${playerCount} player${playerCount === 1 ? '' : 's'}`
            : 'Minecraft'
        } | /help`,
      },
    ],
  })
}

client.on('ready', () => {
  console.log(`${client.user?.tag} ready`)
  setPresence()
  setInterval(setPresence, 1000 * 15)

  const commands: ApplicationCommandData[] = [
    {
      name: 'help',
      description: 'Show help message',
      type: 'CHAT_INPUT',
    },
    {
      name: 'status',
      description: 'Show server status and player count',
      type: 'CHAT_INPUT',
    },
    {
      name: 'start',
      description: 'Start the server',
      type: 'CHAT_INPUT',
    },
    {
      name: 'restart',
      description: 'Restart the server',
      type: 'CHAT_INPUT',
    },
  ]

  client.application?.commands.set(commands)
})

client.on('debug', (content) => {
  if (content.includes('Remaining: '))
    console.log(`Remaining gateway sessions: ${content.split(' ').reverse()[0]}`)
})

client.on('interactionCreate', async (interaction) => {
  if (!interaction.inGuild()) return

  let cmd

  if (interaction.isCommand()) {
    cmd = interaction.commandName
  } else if (interaction.isButton()) {
    if (interaction.customId === 'start-server') {
      cmd = 'start'
    }
  } else {
    return
  }

  if (cmd === 'help') {
    interaction.reply({
      embeds: [
        new Embed({
          title: 'Server manager',
          fields: [
            { name: `\`/start\``, value: 'Start the server if it is not already running.' },
            { name: `\`/status\``, value: 'Show server status and connected players.' },
            { name: `\`/help\``, value: 'Show this help message.' },
          ],
          footer: { text: 'Created by wiisportsresorts#2444' },
        }),
      ],
      files,
    })
    return
  }

  interaction.deferReply()

  if (cmd === 'start') {
    const { data: resources } = await axios.get(
      `${baseUrl}/api/client/servers/${serverId}/resources`,
      httpOptions
    )

    if (resources.attributes.current_state === 'running') {
      interaction.editReply({
        embeds: [Embed.error('Server is already running!')],
        files,
      })
      return
    }

    try {
      await Promise.all([
        axios.post(
          `${baseUrl}/api/client/servers/${serverId}/power`,
          { signal: 'start' },
          httpOptions
        ),
        ...(proxyServerId
          ? [
              axios.post(
                `${baseUrl}/api/client/servers/${proxyServerId}/power`,
                { signal: 'start' },
                httpOptions
              ),
            ]
          : []),
      ])
    } catch (err) {}

    interaction.editReply({
      embeds: [
        Embed.success(
          'Server restarted!',
          'Please allow up to 60 seconds for the server to complete restarting.'
        ),
      ],
      files,
    })
    return
  }

  if (cmd === 'restart') {
    const { data: resources } = await axios.get(
      `${baseUrl}/api/client/servers/${serverId}/resources`,
      httpOptions
    )

    if (resources.attributes.current_state === 'running') {
      interaction.editReply({
        embeds: [Embed.error('Server is already running!')],
        files,
      })
      return
    }

    try {
      await Promise.all([
        axios.post(
          `${baseUrl}/api/client/servers/${serverId}/power`,
          { signal: 'restart' },
          httpOptions
        ),
        ...(proxyServerId
          ? [
              axios.post(
                `${baseUrl}/api/client/servers/${proxyServerId}/power`,
                { signal: 'start' },
                httpOptions
              ),
            ]
          : []),
      ])
    } catch (err) {}

    interaction.editReply({
      embeds: [
        Embed.success(
          'Server restarted!',
          'Please allow up to 60 seconds for the server to complete startup.'
        ),
      ],
      files,
    })
    return
  }

  if (cmd === 'status') {
    const { data, status } = await axios.get(
      `${baseUrl}/api/client/servers/${serverId}/resources`,
      httpOptions
    )

    if (
      data.attributes.current_state === 'offline' ||
      data.attributes.current_state === 'stopping'
    ) {
      interaction.editReply({
        embeds: [Embed.info('Server is **offline**', `Use \`/start\` to start the server.`)],
        components: [
          new MessageActionRow({
            components: [
              new MessageButton({
                customId: 'start-server',
                label: 'Start server',
                style: 'SUCCESS',
              }),
            ],
          }),
        ],
        files,
      })
      return
    }

    if (data.attributes.current_state === 'starting') {
      interaction.editReply({
        embeds: [Embed.info('Server is currently **starting**')],
        files,
      })
      return
    }

    if (data.attributes.current_state === 'running') {
      const { data } = await axios.get(process.env.PLAYER_LIST_ENDPOINT!)
      interaction.editReply({
        embeds: [
          Embed.success(
            'Server is **online**',
            data.players.length
              ? `**Players (${data.players.length}):** ${data.players
                  .join(', ')
                  .replace(/\\/g, '\\\\')
                  .replace(/_/g, '\\_')}`
              : 'No players connected'
          ),
        ],
        files,
      })
      return
    }

    interaction.editReply({
      embeds: [Embed.error(`Unhandled ${status}!`, '```' + JSON.stringify(data, null, 2) + '```')],
      files,
    })
  }
})

client.login(process.env.DISCORD_TOKEN)

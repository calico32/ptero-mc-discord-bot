import axios, { AxiosRequestConfig } from 'axios';
import { Client } from 'discord.js';
import dotenv from 'dotenv';

import { Embed } from './embed';

dotenv.config();

const client = new Client({ disableMentions: 'all' });
const httpOptions: AxiosRequestConfig = {
  headers: {
    Accept: 'application/json',
    Authorization: 'Bearer ' + process.env.PANEL_API_TOKEN,
    'Content-Type': 'application/json',
  },
};
const baseUrl = process.env.PANEL_URL;
const serverId = process.env.SERVER_ID;
const prefix = process.env.PREFIX!;

const setPresence = () => {
  client.user?.setPresence({
    activity: {
      type: 'PLAYING',
      name: `${prefix}help`,
    },
  });
};

client.on('ready', () => {
  console.log(`${client.user?.tag} ready`);
  setPresence();
  setInterval(setPresence, 1000 * 60 * 5);
});

client.on('debug', content => {
  if (content.includes('Remaining: '))
    console.log(`Remaining gateway sessions: ${content.split(' ').reverse()[0]}`);
});

client.on('message', async msg => {
  if (msg.author.bot) return;
  if (msg.author.id == client.user?.id) return;
  if (!msg.guild) return; // don't respond to DMs

  if (!msg.content.startsWith(prefix)) return;

  const [cmd] = msg.content.slice(prefix.length).replace(/ +/g, ' ').split(' ');

  if (cmd === 'start') {
    const { data: resources } = await axios.get(
      `${baseUrl}/api/client/servers/${serverId}/resources`,
      httpOptions
    );

    if (resources.attributes.current_state === 'running')
      return msg.channel.send(Embed.error('Server is already running!'));

    const { status, data } = await axios.post(
      `${baseUrl}/api/client/servers/${serverId}/power`,
      { signal: 'start' },
      httpOptions
    );

    if (status === 204)
      return msg.channel.send(
        Embed.success(
          'Server started!',
          'Please allow up to 60 seconds for the server to complete startup.'
        )
      );

    return msg.channel.send(
      Embed.error(`Unhandled ${status}!`, '```' + JSON.stringify(data, null, 2) + '```')
    );
  } else if (cmd === 'status') {
    const { data, status } = await axios.get(
      `${baseUrl}/api/client/servers/${serverId}/resources`,
      httpOptions
    );

    if (data.attributes.current_state === 'offline' || data.attributes.current_state === 'stopping')
      return msg.channel.send(
        Embed.info('Server is **offline**', `Use \`${prefix}start\` to start the server.`)
      );

    if (data.attributes.current_state === 'starting')
      return msg.channel.send(Embed.info('Server is currently **starting**'));

    if (data.attributes.current_state === 'running') {
      const { data } = await axios.get(process.env.PLAYER_LIST_ENDPOINT!);
      return msg.channel.send(
        Embed.success(
          'Server is **online**',
          data.players.length
            ? `**Players (${data.players.length}):** ${data.players
                .join(', ')
                .replace(/\\/g, '\\\\')
                .replace(/_/g, '\\_')}`
            : 'No players connected'
        )
      );
    }

    return msg.channel.send(
      Embed.error(`Unhandled ${status}!`, '```' + JSON.stringify(data, null, 2) + '```')
    );
  } else if (cmd === 'help') {
    return msg.channel.send(
      new Embed({
        title: 'Server manager',
        fields: [
          { name: `\`${prefix}start\``, value: 'Start the server if it is not already running.' },
          { name: `\`${prefix}status\``, value: 'Show server status and connected players.' },
          { name: `\`${prefix}help\``, value: 'Show this help message.' },
        ],
        footer: { text: 'Created by wiisportsresorts#3101' },
      })
    );
  }
});

client.login(process.env.DISCORD_TOKEN);

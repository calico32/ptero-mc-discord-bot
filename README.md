# Minecraft Server Bot

Connect a Pterodactyl Minecraft server to a Discord bot frontend.

Commands:

- `!!start` - Start server if stopped
- `!!status` - Show server status and currently connected players
- `!!help` - Show help message

## Running

1. Copy `.env.example` to `.env` and complete all of the variables
2. Install dependencies: `yarn`
3. Build: `yarn build`
4. Run: `yarn start`

Docker builds available: `docker-compose build` and `docker-compose up`

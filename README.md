# Questarr

A video game management application inspired by the -Arr apps (Sonarr, Radarr, Prowlarr...) and GamezServer. Track and organize your video game collection with automated discovery and download management.

## Features

- **Game Discovery**: Browse popular games, new releases, and upcoming titles via IGDB integration
- **Library Management**: Track your game collection with status indicators (Wanted, Owned, Playing, Completed)
- **Download Management**: Integrate with indexers (Prowlarr/Torznab) and torrent downloaders (qBittorrent, Transmission, rTorrent)
- **Search & Filter**: Find games by genre, platform, and search terms
- **Clean Interface**: UI optimized for browsing game covers and metadata, with light/dark mode

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **APIs**: IGDB (game metadata), Torznab (indexer search)
- **AIs**: Claude Sonnet 4.5, Gemini 3, Google Jules, GitHub Copilot

## Installation

### Prerequisites

- **Docker & Docker Compose** (recommended) OR
- **Node.js 20+** and **PostgreSQL 16+**
- **IGDB API credentials** (required for game discovery)

### Using Docker Compose (Recommended)

Docker Compose is the easiest way to deploy Questarr with all dependencies included.

1. **Clone the repository:**
```bash
git clone https://github.com/Doezer/Questarr.git
cd Questarr
```

2. **Create environment file:**
```bash
cp .env.example .env
```

3. **Configure environment variables in `.env`:**
```env
# Required: IGDB API credentials (get from https://dev.twitch.tv/console)
IGDB_CLIENT_ID=your_client_id_here
IGDB_CLIENT_SECRET=your_client_secret_here

# Required: Secure JWT secret for authentication (generate a random string)
# IMPORTANT: Set this to prevent token invalidation on restart
# If not set, a random secret will be generated and stored in the database.
# JWT_SECRET=your-secure-random-string-at-least-32-characters-long

# Optional: Server configuration
PORT=5000
HOST=0.0.0.0
NODE_ENV=production

# Optional: Session secret (auto-generated if not set)
SESSION_SECRET=your-session-secret-here

# Database (already configured for Docker)
DATABASE_URL=postgresql://postgres:password@db:5432/questarr
```

**⚠️ Security Warning:** Always set `JWT_SECRET` to a secure random string. Without it, all user sessions will be invalidated on server restart.

Generate a secure secret with:
```bash
# Linux/macOS
openssl rand -hex 32

# Windows (PowerShell)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. **Build and start the containers:**
```bash
docker-compose up -d
```

This will:
- Build the Questarr application
- Start PostgreSQL database with persistent storage
- Automatically initialize the database schema
- Start the application on port 5000 (or your configured PORT)

5. **Access the application:**
Open your browser to `http://localhost:5000`

6. **First-time setup:**
- Create your admin account on first visit
- Configure indexers (Prowlarr or Torznab-compatible)
- Add torrent clients (qBittorrent, Transmission, or rTorrent)

**Update to latest version:**
```bash
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Backup database:**
```bash
docker-compose exec db pg_dump -U postgres questarr > backup.sql
```

**Restore database:**
```bash
docker-compose exec -T db psql -U postgres questarr < backup.sql
```

### Manual Installation (npm)

For development or custom deployments without Docker.

1. **Clone and install dependencies:**
```bash
git clone https://github.com/Doezer/Questarr.git
cd Questarr
npm install
```

2. **Set up PostgreSQL:**
- Install PostgreSQL 16+ on your system
- Create a database: `createdb questarr`
- Create a `.env` file with your database connection string

3. **Configure environment variables in `.env`:**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/questarr
IGDB_CLIENT_ID=your_client_id
IGDB_CLIENT_SECRET=your_client_secret
JWT_SECRET=your-secure-random-string
PORT=5000
```

4. **Initialize the database:**
```bash
npm run db:push
```

5. **Build and start:**

**Development mode (with hot reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

6. **Access the application:**
Open your browser to `http://localhost:5000`

## Configuration

### Getting IGDB API Credentials

IGDB provides game metadata (covers, descriptions, ratings, release dates, etc.).

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Log in with your Twitch account (create one if needed)
3. Click "Register Your Application"
4. Fill in:
   - **Name**: Questarr (or any name)
   - **OAuth Redirect URLs**: `http://localhost` (not used, but required)
   - **Category**: Application Integration
5. Click "Create"
6. Copy your **Client ID** and **Client Secret**
7. Add them to your `.env` file

### Configuring Indexers

Indexers search for game torrents across configured sites.

**Option 1: Prowlarr Sync (Recommended)**
1. Install [Prowlarr](https://prowlarr.com/) separately
2. Configure your indexers in Prowlarr
3. In Questarr, go to Settings → Indexers
4. Click "Sync from Prowlarr"
5. Enter your Prowlarr URL and API key

**Option 2: Manual Torznab Configuration**
1. Go to Settings → Indexers → Add Indexer
2. Enter:
   - **Name**: Display name for the indexer
   - **URL**: Torznab endpoint (e.g., `https://indexer.com/api`)
   - **API Key**: Your indexer API key
   - **Categories**: Select game categories (usually 4000 for PC Games)
3. Click "Test Connection" to verify
4. Save

### Configuring Download Clients

Connect torrent clients to automate downloads.

**Supported Clients:**
- qBittorrent (Web UI)
- Transmission (RPC)
- rTorrent (XMLRPC)

**Setup Instructions:**

1. Go to Settings → Downloaders → Add Downloader
2. Select your client type
3. Enter connection details:
   - **Name**: Display name
   - **Host**: IP or hostname (e.g., `192.168.1.10` or `localhost`)
   - **Port**: Web UI port (default: qBittorrent=8080, Transmission=9091)
   - **Username/Password**: If authentication is enabled
   - **Category/Label**: Optional category for organization
4. Click "Test Connection"
5. Save

**qBittorrent Setup:**
- Enable Web UI in Tools → Options → Web UI
- Set username and password
- Note the port (default 8080)

**Transmission Setup:**
- Enable RPC in settings
- Set RPC port (default 9091)
- Enable authentication if desired

### Application Settings

Configure app behavior in Settings → General:

- **Auto-search**: Automatically search for wanted games
- **Notifications**: Enable desktop notifications for downloads
- **Theme**: Switch between light and dark mode

## Troubleshooting

### Common Issues

**"Invalid or expired token" after server restart**
- **Cause**: JWT_SECRET not set in `.env`
- **Solution**: Add a permanent JWT_SECRET to your `.env` file (see Installation section)

**No games showing up**
- **Cause**: Missing IGDB credentials or invalid API keys
- **Solution**: 
  1. Verify IGDB_CLIENT_ID and IGDB_CLIENT_SECRET in `.env`
  2. Check logs for IGDB API errors: `docker-compose logs -f app`
  3. Regenerate credentials at Twitch Developer Console if needed

**Download status not updating**
- **Cause**: Cron jobs not running or hash mismatch
- **Solution**:
  1. Check logs for "Checking download status" messages
  2. Verify torrent client connection in Settings
  3. Ensure torrent hash matches (should be automatic)

**Can't connect to database**
- **Cause**: PostgreSQL not running or wrong credentials
- **Solution**:
  1. Check if database container is running: `docker-compose ps`
  2. Verify DATABASE_URL in `.env` matches your setup
  3. Check database logs: `docker-compose logs -f db`

**Port already in use**
- **Cause**: Another service using port 5000
- **Solution**: Change PORT in `.env` to an available port (e.g., 5001)

**Docker build fails**
- **Cause**: Out of disk space or corrupted cache
- **Solution**: 
  ```bash
  docker system prune -a
  docker-compose build --no-cache
  ```

**Check health status:**
```bash
curl http://localhost:5000/api/health
```

**Enable debug logging:**
Add to `.env`:
```env
LOG_LEVEL=debug
```

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/Doezer/Questarr/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Doezer/Questarr/discussions)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## License

GPL3 License - see [COPYING](COPYING) file for details.

## Acknowledgments

- Inspired by [Sonarr](https://sonarr.tv/) and [GamezServer](https://github.com/05sonicblue/GamezServer)
- Game metadata powered by [IGDB API](https://www.igdb.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)

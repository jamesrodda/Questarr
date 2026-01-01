# Questarr – APM Memory Root
**Memory Strategy:** Dynamic-MD
**Project Status:** Phase 1 Completed.
**Project Overview:** Questarr is a self-hosted video game collection management application inspired by Radarr/Sonarr. It enables users to search for games via IGDB, find releases through Torznab indexers (Jackett), and download them via torrent clients (rTorrent, Transmission). The primary challenge is intelligent matching between IGDB game metadata and warez PC game release names. This MVP delivers a functional download workflow, regex/heuristic-based matching system (no AI), single-user authentication with bcrypt, backend security with rate limiting, and Docker deployment readiness.

---

## Completed Phases
- **Phase 1: Fix rTorrent Authentication**
  - Resolved 401 Unauthorized errors by implementing Latin1 encoding for Basic Auth and full Digest Authentication support for rTorrent/ruTorrent clients.
  - Enhanced error logging across all downloaders to include response bodies and authentication headers.

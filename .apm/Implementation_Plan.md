# Questarr – APM Implementation Plan
**Memory Strategy:** Dynamic-MD
**Last Modification:** Plan creation by the Setup Agent.
**Project Overview:** Questarr is a self-hosted video game collection management application inspired by Radarr/Sonarr. It enables users to search for games via IGDB, find releases through Torznab indexers (Jackett), and download them via torrent clients. The primary challenge is intelligent matching between IGDB game metadata and warez PC game release names. This plan delivers an MVP with a functional download workflow, regex-based matching (no AI), single-user authentication, and Docker deployment readiness.

---

## Phase 1: Fix rTorrent Authentication

### Task 1.1 – Investigate rTorrent Authentication Issue - Agent_Backend_Downloaders
**Objective:** Identify root cause of 401 unauthorized error with rTorrent authentication.
**Output:** Documentation of authentication mechanism and identified implementation discrepancies.
**Guidance:** Current implementation in server/downloaders.ts returns 401. Same credentials work in Sonarr. Compare implementation with rTorrent/ruTorrent documentation to identify discrepancies in auth headers, endpoint format, or credential encoding.

1. Ad-Hoc Delegation – Research rTorrent/ruTorrent authentication mechanisms
2. Review current implementation in `server/downloaders.ts` focusing on rTorrent auth logic
3. Compare Questarr's implementation with rTorrent documentation findings and Sonarr's approach
4. Identify specific discrepancies (auth headers, endpoint format, credential encoding, etc.)
5. Document findings and confirm with User that rTorrent server is accessible and credentials are correct

### Task 1.2 – Fix rTorrent Authentication Implementation - Agent_Backend_Downloaders
**Objective:** Correct rTorrent authentication implementation based on investigation findings.
**Output:** Updated server/downloaders.ts with working rTorrent authentication (Basic + Digest).
**Status:** Completed
**Guidance:** **Depends on: Task 1.1 output**. Apply identified corrections to auth mechanism. Ensure proper error handling and logging with Pino. Follow TypeScript strict mode and existing code patterns.

- Apply identified fixes to rTorrent authentication in `server/downloaders.ts` (headers, endpoint, credential format)
- Implement Digest Authentication support for rTorrent/ruTorrent
- Ensure proper error handling for auth failures with clear logging using Pino
- Follow existing code patterns and TypeScript strict mode conventions
- Write unit tests for rTorrent auth logic to prevent future regressions

### Task 1.3 – Validate Download Workflow End-to-End - Agent_Backend_Downloaders
**Objective:** Confirm complete download workflow functions with corrected rTorrent authentication.
**Output:** Documented successful test results showing working nominal scenario.
**Status:** Completed
**Guidance:** **Depends on: Task 1.2 output**. Test complete flow: search game → select torrent → download → verify in rTorrent client. User performs manual UI testing while Agent monitors logs.

1. Start development server and confirm rTorrent downloader is configured and accessible
2. Prepare logging to track authentication and download submission (Pino debug level)
3. **User Action:** Search for a game in UI, select a torrent result, click download button
4. **User Action:** Verify in rTorrent client that torrent was successfully added and begins downloading
5. Document successful test results including logs, confirming 401 error is resolved

---

## Phase 2: Backend Security & Robustness

### Task 2.1 – Implement Rate Limiting for External Services - Agent_Backend_Core
**Objective:** Protect IGDB and indexer APIs from abuse with configured rate limiting.
**Output:** Rate limiting middleware active on external API endpoints.
**Guidance:** Critical for MVP to prevent throttling from IGDB (Twitch API limits) and indexers. Use separate limiters per service type with appropriate thresholds (e.g., IGDB: stricter based on Twitch API limits, indexers: moderate based on provider). Return 429 status with clear error messages. Test by simulating rapid requests to verify limit activation and proper reset.

- Install and configure rate limiting library (e.g., express-rate-limit) with separate limiters for IGDB and indexers
- Apply stricter limits to IGDB endpoints (respect Twitch API limits) and indexer search endpoints
- Add appropriate error responses (429 Too Many Requests) with clear messages logged via Pino
- Write tests to verify rate limiting activates correctly and resets properly

### Task 2.2 – Add Service Validation Middleware - Agent_Backend_Core
**Objective:** Validate downloader and indexer accessibility before operations to prevent failed requests.
**Output:** Validation middleware integrated into download and search routes.
**Guidance:** Proactive health checks prevent user-facing failures. For downloaders: test connection endpoint with timeout (e.g., rTorrent XML-RPC ping, Transmission /session endpoint). For indexers: verify Jackett /api caps endpoint responds. Return 503 Service Unavailable with clear diagnostics including which service failed.

1. Create health check function for downloaders (test connection to configured torrent clients)
2. Create health check function for indexers (test Jackett connectivity and configured indexers)
3. Integrate validation middleware into routes that depend on these services (downloads, search)
4. Add comprehensive error messages with Pino logging and appropriate HTTP status codes (503 Service Unavailable)

### Task 2.3 – Implement Backend Error Handling and Logging - Agent_Backend_Core
**Objective:** Implement consistent backend error handling with structured logging.
**Output:** Global error middleware and enhanced Pino logging.
**Guidance:** **Depends on: Task 2.2 output**. Standardize error format: `{ error: string, details?: any }` (ref: issue #1). Use Pino for backend logging with appropriate levels (error, warn, info, debug). This provides consistent error format for frontend integration in Task 2.4.

1. Create global error handling middleware in backend to catch and format errors consistently (ref: issue #1)
2. Enhance Pino logging with appropriate log levels (error, warn, info, debug) and structured context
3. Ensure all API routes return standardized error format: `{ error: string, details?: any }`
4. Test error scenarios: service unavailable, validation failures, authentication errors, rate limiting

### Task 2.4 – Integrate Frontend Error Notifications - Agent_Frontend
**Objective:** Integrate toast notifications for user-facing error feedback.
**Output:** Toast notifications active for API errors throughout frontend.
**Guidance:** **Depends on: Task 2.3 output by Agent_Backend_Core**. Use existing use-toast.ts hook. Map standardized backend error responses to user-friendly toast messages. Cover: service unavailable, rate limited, validation failures, authentication errors.

- Integrate existing `use-toast.ts` hook into API call error handlers
- Map backend error format `{ error, details }` to user-friendly toast messages
- Test error scenarios to ensure appropriate feedback is shown for all error types from Task 2.3

### Task 2.5 – Implement Input Sanitization - Agent_Backend_Core
**Objective:** Sanitize all user inputs to prevent injection attacks and ensure data integrity.
**Output:** Sanitization middleware applied to all user-facing endpoints.
**Guidance:** Security best practice for MVP. Recommend express-validator for comprehensive validation and sanitization. Apply to search queries, game names, configuration inputs. Test with malicious inputs to verify proper sanitization.

- Install and configure express-validator for input validation and sanitization
- Apply sanitization to all user-facing endpoints (search queries, game names, downloader configs, indexer configs)
- Write tests to verify malicious inputs are properly sanitized and logged

---

## Phase 3: Matching System MVP

### Task 3.1 – Create Release Title Parser - Agent_Matching
**Objective:** Parse Torznab release titles into structured components (game name, version, group, tags).
**Output:** Parser function with regex patterns handling common release formats.
**Guidance:** Foundation for matching system. Handle patterns: "Game Name-GROUP", "Game Name Update vX-GROUP", "Game Name DLC Name-GROUP". Test extensively with IPTorrents examples. Handle edge cases: special chars, multi-word names, spaced version numbers.

1. Create parser function to extract game name from release title (remove common suffixes: Update, DLC, version numbers, release groups)
2. Add regex patterns for common release formats: "Game Name-GROUP", "Game Name Update vX.Y.Z-GROUP", "Game Name DLC Name-GROUP"
3. Handle edge cases: special characters, multi-word game names, version numbers with spaces ("v2 2 3"), date-based versions
4. Extract additional metadata: release group, version string, potential DLC/update indicators
5. Write comprehensive unit tests with real IPTorrents examples (from provided RSS feed)

### Task 3.2 – Implement IGDB Matching Algorithm - Agent_Matching
**Objective:** Match parsed release names against IGDB database to identify correct games.
**Output:** Matching function with heuristic scoring returning best candidates.
**Guidance:** **Depends on: Task 3.1 output**. Core MVP algorithm. Use existing server/igdb.ts abstraction. Implement fuzzy matching for inexact names. Score by name similarity, platform (PC), release date proximity. Respect IGDB rate limits from Phase 2. Return top N candidates ranked by confidence.

1. Use existing `server/igdb.ts` to query IGDB with parsed game name (exact match first)
2. Implement fuzzy matching for partial/inexact matches (handle abbreviations, subtitle differences)
3. Create scoring heuristic considering: name similarity, release date proximity, platform match (PC)
4. Handle multiple candidates by returning top N matches ranked by score
5. Optimize query strategy to respect IGDB rate limits (leverage existing rate limiting from Phase 2)
6. Write tests comparing matched games against expected results from IPTorrents samples

### Task 3.3 – Add Release Type Classification - Agent_Matching
**Objective:** Classify releases as base game, update, or DLC based on title patterns.
**Output:** Classification function integrated with parser output.
**Guidance:** **Depends on: Task 3.1 output**. Detect types: "Update" keyword → update, "DLC" keyword/subtitle → DLC, neither → base game. Consider version numbers as update indicators. Test with IPTorrents samples.

- Define classification rules: "Update" keyword → update, "DLC" keyword or subtitle pattern → DLC, neither → base game
- Implement classification function that analyzes parsed release metadata
- Consider version numbers as update indicators (vX.Y.Z patterns)
- Write tests to verify correct classification for IPTorrents samples (updates, DLC, base games)

### Task 3.4 – Test Matching with IPTorrents Feed - Agent_Matching
**Objective:** Validate matching accuracy using real IPTorrents RSS feed data.
**Output:** Documented test results with accuracy metrics and identified edge cases.
**Guidance:** **Depends on: Task 3.1, 3.2, and 3.3 outputs**. Comprehensive validation of complete matching pipeline. Use provided RSS feed URL. Calculate accuracy, identify failures. User reviews match quality and edge cases. Document for future improvements.

1. Fetch and parse IPTorrents RSS feed (provided URL: https://iptorrents.com/t.rss?u=1429087;tp=33086a2df36f707ad82bf0bd5ca42317;43)
2. Run parser, matcher, and classifier on all feed entries
3. Calculate matching accuracy: successful matches, failures, ambiguous cases
4. **User Action:** Review sample matches for quality and identify problematic edge cases
5. Document results including accuracy metrics, common failure patterns, and recommendations for future improvements

### Task 3.5 – Create Search API Endpoint - Agent_Backend_Core
**Objective:** Create API endpoint integrating matching components for game search.
**Output:** `/api/games/search` endpoint returning structured match results.
**Guidance:** **Depends on: Task 3.1, 3.2, and 3.3 outputs by Agent_Matching**. Orchestrate parser, matcher, classifier. Return simple list format for MVP: `{ releases: [{ title, gameMatch, type, confidence }] }`. Use Phase 2 error handling. Write integration tests.

- Create `/api/games/search` endpoint that accepts game name query parameter
- Integrate parser (Task 3.1), matcher (Task 3.2), and classifier (Task 3.3) to return list of matched releases
- Return structured JSON: `{ releases: [{ title, gameMatch, type, confidence }] }` for simple list presentation
- Write integration tests and ensure proper error handling (ref: Phase 2 error infrastructure)

---

## Phase 4: Frontend Integration

### Task 4.1 – Create Search Results Display Component - Agent_Frontend
**Objective:** Create React component displaying matching results in simple list format.
**Output:** SearchResults component showing game matches with metadata.
**Guidance:** Use TanStack Query for API integration with /api/games/search. Display: game title, match confidence, release type, release group. Follow Tailwind dark theme design guidelines. Handle loading/empty states.

- Create SearchResults component in `client/src/components/` that fetches from `/api/games/search` endpoint
- Display results as simple list showing: game title, match confidence, release type (base/update/DLC), release group
- Use Tailwind CSS following design guidelines (dark theme, card-based layout)
- Handle loading and empty states with appropriate UI feedback using existing patterns

### Task 4.2 – Integrate Download Action Buttons - Agent_Frontend
**Objective:** Add download functionality to search results with working backend integration.
**Output:** Download buttons integrated with state management and user feedback.
**Guidance:** **Depends on: Task 4.1 output**. Add download button per result. POST to backend download endpoint with torrent details. Update UI state (loading, success). Use toasts for error feedback.

1. Add download button to each search result item with appropriate styling (ref: existing UI patterns)
2. Implement click handler that POSTs torrent details to backend download endpoint
3. Update UI state to reflect download initiated (loading indicator, success confirmation)
4. Handle download errors and display appropriate feedback (use toasts from Task 4.3)

### Task 4.3 – Implement Error Feedback with Toasts - Agent_Frontend
**Objective:** Integrate toast notifications for consistent user-facing error feedback.
**Output:** Toast notifications active for API errors throughout frontend.
**Guidance:** Use existing use-toast.ts hook. Map backend error responses (from Phase 2) to user-friendly messages. Cover: service unavailable, rate limited, download failed, search errors.

- Integrate existing `use-toast.ts` hook into search and download components for error display
- Map API error responses to user-friendly toast messages (service unavailable, rate limited, download failed)
- Test error scenarios to ensure appropriate feedback is shown (ref: Phase 2 error types)

### Task 4.4 – Test Frontend User Experience - Agent_Frontend
**Objective:** Validate complete frontend UX flow from search through download.
**Output:** Documented UX test results confirming working flow and identifying improvements.
**Guidance:** **Depends on: Task 4.1, 4.2, and 4.3 outputs**. Write component tests. User performs manual testing of complete flow. Document findings for post-MVP improvements.

1. Write component tests for SearchResults and download functionality
2. Prepare test scenarios: successful search, no results, API errors, download success/failure
3. **User Action:** Perform manual testing of complete flow: search game → review results → download → verify feedback
4. Document UX findings and any usability improvements needed for post-MVP

---

## Phase 5: User Authentication

### Task 5.1 – Create User Database Schema - Agent_Backend_Core
**Objective:** Define and create users table schema for single-user authentication.
**Output:** Users table with bcrypt-compatible password storage using Drizzle ORM.
**Guidance:** Simple schema for MVP: id, username, passwordHash (60 chars for bcrypt), createdAt. Use Drizzle ORM schema definition. Run db:push to apply migration.

- Create users table schema using Drizzle ORM with fields: id, username, passwordHash, createdAt
- Ensure passwordHash field is designed for bcrypt output (60 character string)
- Run `npm run db:push` to apply schema and generate TypeScript types

### Task 5.2 – Implement Authentication Routes with Passport.js - Agent_Security
**Objective:** Create login/logout routes using Passport.js with bcrypt password hashing and initial user setup.
**Output:** Working authentication endpoints with session management and initial user creation mechanism.
**Guidance:** **Depends on: Task 5.1 output by Agent_Backend_Core**. Use existing Passport.js infrastructure (enhance as needed). Implement bcrypt for password hashing/verification. Create login/logout routes. Configure Express sessions with PostgreSQL store (connect-pg-simple). Ensure secure session options. For single-user MVP, provide initial user creation via migration script or first-run setup (check if users table empty, prompt for credentials).

1. Configure Passport.js local strategy in backend (may exist partially, enhance as needed)
2. Implement bcrypt hashing for password storage and verification (hash on user creation, verify on login)
3. Create initial user setup mechanism: migration script or first-run check (if users table empty, create admin user with secure random password logged to console or via environment variable)
4. Create `/api/auth/login` POST route accepting username/password, returning session
5. Create `/api/auth/logout` POST route destroying session
6. Configure Express sessions with PostgreSQL store (connect-pg-simple) per existing setup, ensure secure options (secure: true in production, httpOnly, sameSite)

### Task 5.3 – Add Route Protection Middleware - Agent_Security
**Objective:** Protect API routes requiring authentication with session validation middleware.
**Output:** Authentication middleware applied to protected routes returning 401 for unauthorized access.
**Guidance:** **Depends on: Task 5.2 output**. Create middleware checking Passport session (req.isAuthenticated()). Apply to: downloads, indexers, downloaders config, games management. Use Phase 2 error handling for 401 responses.

- Create authentication middleware function checking Passport session (req.isAuthenticated())
- Apply middleware to protected routes: downloads, indexers, downloaders configuration, games management
- Return 401 Unauthorized with clear error message for unauthenticated requests (ref: Phase 2 error handling)
- Write tests verifying protected routes reject unauthenticated access and allow authenticated requests

### Task 5.4 – Create Login UI Component - Agent_Frontend
**Objective:** Create login page with username/password form integrated with auth API.
**Output:** Functional login component with error handling and routing.
**Guidance:** **Depends on: Task 5.2 output by Agent_Security**. Create React form component. POST to /api/auth/login. Display errors with toasts (Phase 4). Redirect to dashboard on success using Wouter.

- Create Login component in `client/src/pages/` with username/password form fields
- Handle form submission POSTing to `/api/auth/login` with credential validation
- Display error feedback using toasts for failed login attempts (ref: Phase 4 toast integration)
- Redirect to dashboard on successful authentication using Wouter routing

### Task 5.5 – Test Authentication Flow - Agent_Security
**Objective:** Validate complete authentication system end-to-end.
**Output:** Documented test results confirming working authentication for MVP.
**Guidance:** **Depends on: Task 5.1 output by Agent_Backend_Core, Task 5.2 output, Task 5.3 output, and Task 5.4 output by Agent_Frontend**. Write integration tests for auth routes and route protection. User performs manual testing. Document results confirming single-user auth works.

1. Write integration tests for auth routes: successful login, failed login, logout, session persistence
2. Test route protection: unauthenticated access blocked, authenticated access allowed
3. **User Action:** Manually test complete flow: login → access protected features → logout → verify access denied
4. Document test results confirming authentication system works correctly for single-user MVP

---

## Phase 6: Deployment & Documentation

### Task 6.1 – Validate and Enhance Docker Configuration - Agent_DevOps
**Objective:** Ensure production-ready Docker configuration with PostgreSQL orchestration.
**Output:** Validated and enhanced Dockerfile and docker-compose.yml for self-hosted deployment.
**Guidance:** Existing Docker files need production validation. Check multi-stage builds, security, PostgreSQL volume persistence, optional external DB support. Test local build. Document environment variables.

1. Validate existing Dockerfile and docker-compose.yml, check for production best practices (multi-stage builds, security, caching)
2. Ensure PostgreSQL service properly configured in docker-compose.yml with volume persistence and optional external DB support
3. Configure environment variable handling (.env.example template, all required vars documented)
4. Test local build and startup: `docker-compose up` confirms all services start and communicate
5. Document Docker deployment process including environment setup and troubleshooting

### Task 6.2 – Write Comprehensive README - Agent_DevOps
**Objective:** Create main README with project overview, setup, and deployment instructions.
**Output:** Complete README.md covering all aspects for users and contributors.
**Guidance:** **Depends on: Task 6.1 output**. Comprehensive documentation including: project description, motivation (solving warez naming), features, installation, configuration (IGDB, Jackett, downloaders), usage, Docker deployment. Reference validated Docker config.

1. Write project overview: description, motivation (solving warez game naming problem), key features
2. Document installation instructions: prerequisites, dependencies, local development setup
3. Explain configuration: environment variables, IGDB setup, indexer (Jackett) configuration, downloader setup
4. Provide usage guide: basic workflow (search → match → download), UI navigation
5. Include Docker deployment section referencing docker-compose setup from Task 6.1

### Task 6.3 – Create User Tutorials Documentation - Agent_DevOps
**Objective:** Write user-focused tutorials for common Questarr workflows.
**Output:** Tutorial documentation with step-by-step guides for users.
**Guidance:** User-friendly tutorials covering: searching/matching games, downloading, configuration, troubleshooting. Optional: user provides screenshots or validates tutorial accuracy.

1. Write tutorial: "Searching and Matching Games" - using search, understanding match results, confidence scores
2. Write tutorial: "Downloading Games" - selecting releases, download button, monitoring progress
3. Write tutorial: "Configuration" - adding indexers, configuring downloaders, authentication setup
4. **Optional User Action:** Review tutorials for accuracy and provide screenshots if available

### Task 6.4 – Write CONTRIBUTE Guide - Agent_DevOps
**Objective:** Create contribution guide for developers.
**Output:** CONTRIBUTE.md with development setup, standards, and process.
**Guidance:** Standard contribution guide covering: dev setup, code standards (TypeScript strict, ESLint, testing), PR process, contribution areas. Document APM workflow for future contributions.

- Document development setup: clone repo, install dependencies, configure environment, run dev server
- Explain code standards: TypeScript strict mode, ESLint config, testing requirements, commit conventions
- Describe contribution process: fork, branch, implement, test, PR submission
- List contribution areas: matching improvements, downloader support, UI enhancements, bug fixes

### Task 6.5 – Add LICENSE File - Agent_DevOps
**Objective:** Add appropriate open-source license to repository.
**Output:** LICENSE file with proper copyright and terms.
**Guidance:** User decides license type (recommend MIT for permissive self-hosted). Create file with chosen license text and copyright notice.

- **User Action:** Decide on open-source license type (recommend MIT for permissive self-hosted project)
- Create LICENSE file with chosen license text and proper copyright notice

### Task 6.6 – Test Docker Deployment - Agent_DevOps
**Objective:** Validate complete Docker deployment process end-to-end.
**Output:** Documented deployment test results confirming production-ready MVP.
**Guidance:** **Depends on: Task 6.1 and 6.2 outputs**. Clean environment test following README instructions. User deploys and validates. Document results confirming MVP ready for self-hosted deployment.

1. Prepare clean test environment: fresh Docker installation or clean slate (remove existing containers/volumes)
2. **User Action:** Follow README deployment instructions: configure .env, run docker-compose up, verify services start
3. **User Action:** Test complete application functionality in deployed environment: login, search, download
4. Document deployment test results confirming production-ready status, note any issues or improvements needed


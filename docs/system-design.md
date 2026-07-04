# BPSRPortal System Design

## Design Principle

BPSRPortal is a web-first game community portal.

The service goal is to reduce the time players spend searching for parties and increase the time they spend playing.

Discord is used for communication, voice chat, and notifications. The Discord Bot is a helper that automates Discord-side work. The Web app is the main product surface.

## Product Concept

BPSRPortal replaces game-world-chat recruitment with a searchable web portal connected to Discord.

Users should be able to:

- Sign in with Discord
- Maintain a player profile
- Search for recruitments
- Create recruitments
- Apply to recruitments
- Approve applicants
- Manage party progress
- Receive Discord notifications
- Use Discord VC and party channels created by automation

## Runtime Architecture

```text
User Browser
  -> Vercel / Next.js Web App
  -> Supabase PostgreSQL

Raspberry Pi 5
  -> Discord Bot worker
  -> Supabase PostgreSQL
  -> Discord API

Discord
  -> Notifications
  -> VC
  -> Party channels
```

## Service Responsibilities

### Web App

The Web app is the main system.

Responsibilities:

- Discord OAuth login
- Discord guild membership gate
- Profile editing
- Notification settings
- Recruitment list
- Recruitment search
- Recruitment creation
- Recruitment detail
- Application flow
- Approval flow
- Party management
- Public player profiles
- Player search
- Good evaluation
- Problem reports
- Admin screens
- Master data management

### Supabase

Supabase is the source of truth.

Responsibilities:

- Profiles
- Imagine masters
- User imagines
- Content masters
- Mode masters
- Class masters
- Role masters
- Role imagine masters
- Recruitment records
- Applications
- Party records
- Good evaluations
- Problem reports
- Discord automation jobs
- Bot action logs

### Raspberry Pi Discord Bot

The Bot runs on Raspberry Pi as a long-running worker.

Responsibilities:

- Send recruitment notifications to Discord
- Mention configured Discord roles
- Create Discord party channels
- Create Discord VC channels
- Manage Discord permission overwrites
- Run content end cleanup
- Update Discord notification messages when needed
- Record automation results back to Supabase

The Bot does not own recruitment UX.

The Bot should not be the primary place where users create, search, or apply to recruitments.

## Current Implementation Status

Implemented:

- Discord OAuth
- Discord guild membership check
- Profile editing
- UID field
- Supabase connection
- Admin user list
- Admin user detail
- Imagine data
- Vercel deployment
- Raspberry Pi deployment notes
- Discord Bot scaffold

To be adjusted:

- The existing Discord Bot recruitment wizard was created for a Discord-first flow.
- The new product direction is Web-first.
- Keep `/profile` if useful.
- Replace `/recruit-create` wizard usage with Web recruitment creation.
- Bot should react to Web-created recruitment records and send Discord notifications.
- Proof channel system is no longer a v1 requirement.

## Recruitment Model

Recruitments are created on the Web.

Required fields:

- Content
- Mode
- Title
- Conditions
- VC mode
- Role slots
- Required classes

Recommended future fields:

- Recruitment template id
- Visibility status
- Cancel reason
- Started at
- Closed at
- Party page id
- Discord notification message id
- Discord party channel id
- Discord VC channel id

## Recruitment Status

```text
open
in_progress
closed
cancelled
```

### open

Users can search and apply.

### in_progress

Required members are gathered. Party page is active.

### closed

Content ended normally.

### cancelled

Recruitment was cancelled before completion.

## Discord Notification Strategy

Discord notifications should drive users back to the Web app.

Notification includes:

- Title
- Content
- Mode
- Conditions summary
- Role slots
- VC mode
- Web detail URL

Buttons in Discord are optional. The default flow should be Web-based.

## Party Flow

When enough members are approved:

1. Web sets recruitment status to `in_progress`.
2. Web creates or updates party record.
3. Bot creates Discord VC if needed.
4. Bot creates Discord party channel if needed.
5. Bot applies Discord permissions.
6. Party page becomes the main management screen.

## Evaluation

### Good

Good is available only after content completion.

Purpose:

- Signal that someone is enjoyable to play with again.
- Avoid turning profile pages into negative scoreboards.

Good appears on public profiles.

### Problem Report

Problem reports are not public.

They are visible only to admins.

Report categories:

- Profile mismatch
- AFK
- Abusive language
- Disruptive behavior
- Other

## Profile Trust Policy

Profiles are self-reported.

Proof submission is not required in v1.

Admins intervene only for malicious false information or repeated problem reports.

## Proof System

Not implemented in current product direction.

If needed later, add as a separate optional feature.

## Master Data Strategy

Game updates should be handled by changing master data, not code.

Admin-manageable master data:

- Contents
- Content modes
- Classes
- Roles
- Role imagines
- Imagines
- Icons
- Recruitment templates
- Discord notification mappings

## Admin Features

Admin screens should eventually manage:

- Users
- Recruitments
- Problem reports
- Logs
- Notices
- Contents
- Modes
- Classes
- Roles
- Role imagines
- Imagines
- Icons

## UI Direction

Priorities:

1. Easy to find recruitments
2. Easy to create recruitments
3. Easy to manage parties
4. Easy to maintain master data
5. Easy to extend after game updates

The UI should feel like a practical game community tool, not a marketing landing page.

## Recommended Implementation Phases

### Phase 1: Web Recruitment Core

- Add recruitment database tables
- Add content/mode/class/role master tables
- Add recruitment list page
- Add recruitment detail page
- Add recruitment create page
- Add application flow
- Add approval flow

### Phase 2: Discord Notification Worker

- Add bot job table
- Web writes notification jobs
- Raspberry Pi Bot polls jobs
- Bot posts Discord notification
- Bot stores Discord message id

### Phase 3: Party Automation

- Create party records
- Create VC via Bot
- Create party channel via Bot
- Manage Discord permissions
- Add content end flow

### Phase 4: Search and Discovery

- Recruitment filters
- Recommended recruitments
- Player search
- Public profiles

### Phase 5: Trust and Admin

- Good evaluation
- Problem reports
- Admin report review
- Bot action logs
- Master data management screens

## Key Decision

The old Discord-first recruitment wizard is no longer the main implementation path.

The new main path is:

```text
Web recruitment creation
  -> Supabase recruitment record
  -> Raspberry Pi Bot notification/Discord automation
  -> Web application and approval
  -> Bot party channel and VC automation
```
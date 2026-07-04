# BPSRPortal Open Decisions

This document tracks decisions that should be confirmed before implementation.

## Service Branding

Need decision:

- Logo asset path
- Main color
- Accent color
- Dark or light default theme

Recommended default:

- Dark UI
- High contrast panels
- Teal accent inherited from current profile UI
- Avoid overly decorative landing pages

## Top Page

Need decision:

- Should `/` show recruitment list immediately?
- Should logged-out users see public recruitment list?
- Should logged-out users be able to view recruitment detail?

Recommended:

- Top page is recruitment discovery, not a marketing page.
- Logged-out users can view public recruitments.
- Applying requires Discord login.

## Recruitment History

Need decision:

- Are closed recruitments publicly visible?
- How long should closed recruitments remain searchable?

Recommended:

- Closed recruitments are visible only from direct URL and user/admin history in v1.
- Main list shows `open` and `in_progress` only.

## Cancel Flow

Need decision:

- Can recruitment owner cancel anytime before party starts?
- Should approved applicants receive Discord notification when cancelled?

Recommended:

- Owner can cancel while `open`.
- Admin can cancel any non-closed recruitment.
- Discord notification is sent when cancellation affects applicants.

## Recruitment Slot Changes

Need decision:

- Can owner change recruitment slots after posting?
- Can owner reduce slots below already approved count?

Recommended:

- Owner can change slots while `open`.
- Cannot reduce below approved count.

## Application Flow

Need decision:

- Can users apply to multiple roles in the same recruitment?
- Can users cancel their own application?

Recommended:

- One active application per recruitment per user.
- User chooses one role.
- User can cancel pending application.

## Required Classes

Need decision:

- Required class is per role slot or overall recruitment filter?

Recommended:

- v1: per role group allowed classes.
- Example: DPS allows 狼弓, 鷹弓, 月影.

## Recommended Recruitment Algorithm

Need decision:

- What makes a recruitment recommended?

Recommended v1:

- Same class compatibility
- Open status
- Recently updated
- Slots still available
- Matching preferred content if notification settings exist

## Public Profile

Need decision:

- Which profile fields are public?
- Is Discord ID visible publicly?

Recommended:

Public:

- Discord display name
- Character name
- UID
- Class
- Power
- DPS
- Sea weapon
- Owned imagines
- Good count
- Self introduction

Admin only:

- Discord ID
- Problem reports
- Internal logs

## Good Display

Need decision:

- Show total count only or recent users too?

Recommended:

- v1: total Good count only.
- Later: show recent Good from party members if privacy is acceptable.

## Problem Report Flow

Need decision:

- Can reports be submitted only after party completion?
- Can admins add notes?

Recommended:

- Reports can be submitted after party completion.
- Admin notes are supported.

## Discord Bot Commands

Need decision:

- Which commands remain after Web-first pivot?

Recommended v1:

- `/profile`: keep
- `/recruit-create`: remove or make it return Web create URL
- `/proof-create`: remove from v1 unless proof system returns
- `/party-close`: optional fallback for owner/admin

## Discord Notification Layout

Need decision:

- Use embeds only or buttons too?

Recommended:

- Embed + Web detail button.
- Application happens on Web.

## Party Channel Structure

Need decision:

- Create one text channel per party?
- Create VC only when requested?

Recommended:

- Text channel optional, created when party starts.
- VC created only when requested.

## Raspberry Pi Operation

Need decision:

- Manual deploy or GitHub Actions?

Current recommendation:

- Manual deploy.
- Expected updates are low frequency.

Update command:

```bash
cd ~/bpsr
git pull
npm ci
sudo systemctl restart bpsr-bot
```
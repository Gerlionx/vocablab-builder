# Vocablab Builder

Build a complete clickable visual prototype of VOCABLAB, a web app for one UK secondary French teacher. She uses it on a laptop with a classroom projector (mouse and touch must both work).

You own ALL graphics: layout, typography, colours, buttons, icons, images, empty states, hover/press states, and every clickable link between screens. Use dummy data. Do NOT build a real backend, real authentication, SMTP, CSV parsing, or game logic. Fake the flows so every button goes to the right screen.

BRAND

- Product name: Vocablab

- Future URL: https://vocablab.unifiedops.cloud

- UI language: English. Vocabulary content is French + English.

- Home and chrome: very simple, minimal, beautiful, calm, uncluttered. Lots of whitespace. Not a dashboard, not an admin panel, not a colourful kids’ cartoon — except the Wheel of names page, which should be colourful and fun.

- Game/play screens: light background, large type, high contrast, readable from the back of a classroom on a washed projector.

- No public “Sign up” or “Create account” on the marketing sense. The only entry is Log in. Invites are inside the logged-in app.

SCREENS AND CLICK MAP

1) Log in

- Email + password + Log in button.

- Log in → Home (always succeed in this prototype).

- Optional discreet “Forgot password” can be visible but may go to a simple “Not available yet” state.

- No register link.

2) Home

- Almost empty. One strong centre button: Create.

- Top-right: text link “Vocabulary” (not an icon-only mystery control).

- Top area (opposite or beside): her name, e.g. “Marie”, opening Account.

- Small product name “Vocablab” is allowed; do not compete with Create.

- Create → Create (game list).

- Vocabulary → Vocabulary.

- Account → Account menu: Invite teacher, Log out.

- Log out → Log in.

3) Account / Invite teacher

- Email field + Send.

- List of invitations with status Pending and Accepted (dummy rows).

- Send does not send email: append a new Pending row so the UI feels finished.

- Log out → Log in.

4) Set password (invited teacher)

- Separate page, linked from a dummy “Accept invite” link on the Invite list (so it is reachable).

- Email shown read-only, New password, Confirm password, Save.

- Save → Log in (or Home). Dummy only.

5) Vocabulary

This page must look excellent and easy. It is a teacher editor, not a spreadsheet dump.

Filters (all required, easy, fast):

- Year

- Term

- Topic

- Difficulty: Low / Medium / High

Each vocabulary ITEM is ONE thing with TWO parts, shown on ONE line:

- French (styled as French)

- English (styled as English, clearly different)

Example line:  J'étudie    I study

She must be able to edit French and English separately (inline or edit panel).

Difficulty display (strict):

- Low = bold French/English (basic, everyone must know)

- Medium = regular weight

- High = a star/asterisk in front of the item

Section titles (Year, Term, Topic headings) may be bold because they are titles, NOT because they are Low.

Actions on this page (all visible, labelled in plain English):

- Add word (Year, Term, Topic, Difficulty, French, English)

- Edit word, Delete word

- Add / delete Year

- Add / delete Term

- Add / delete Topic

- Download vocabulary

- Upload vocabulary

Delete Year: show a confirmation warning first (“This will delete all words in this year”). In the prototype, confirm can dummy-remove it from the view.

Download vocabulary / Upload vocabulary: do NOT label them “CSV”. Upload in the prototype can open a file picker then a dummy dialog: if the year is new → “Year 7 will be added”; if the year exists → “Year 8 already exists — Keep mine / Replace whole year”.

Dummy content: seed a realistic slice of Year 7 French so the page looks real (greetings, numbers, colours, family, etc.). Mix Low (bold), Medium (normal), High (star). Include at least Terms 1–2 and several topics.

6) Create

- Only ONE game tile: Wheel of names.

- No empty “coming soon” tiles.

- Click tile → Wheel of names page.

- Back from this page → Home.

7) Wheel of names (design demo, not a working game)

- Back → Create.

- Right side: large paste area for student names (dummy names already filled).

- Main area: a very nice colourful prize-wheel / wheel of names, already populated with those dummy names, clearly drawn and visible.

- Big Spin button. It must not run real logic. A short decorative spin animation is OK so the design can be judged; it does not need to land on a fair winner or read the textarea.

- High contrast, big labels, projector-friendly.

Do not add: student logins, marks, homework, shop, settings jungle, extra games, dark-only UI for the wheel page if it hurts readability.

Deliver a polished multi-page app with working navigation between all screens above.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d2302d09-412b-42bb-b9e3-621c81db538b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

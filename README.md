# Autopilot Social

A social media autopilot: it writes and schedules posts across 10 platforms, writes serialized fiction and releases it a part a day, grows your audience within safe daily limits, learns a creator's style, and cuts stream clips.

## What's in this folder

| File | What it is |
|---|---|
| `public/index.html` | The whole app in one file. Works on its own. |
| `server.js` | Optional small server that turns on AI writing (Claude). No packages to install. |
| `package.json` | Lets hosts like Render or Railway start the server. |
| `.env.example` | Where your API key goes. |

## Option A — Quickest: static hosting (no AI)

The app runs fully in the browser. Without the server it writes posts from built-in templates instead of AI.

- **Netlify:** go to app.netlify.com/drop and drag the `public` folder in.
- **Vercel:** `npx vercel public`
- **GitHub Pages:** push the contents of `public/` to a repo and turn on Pages.
- **cPanel / shared hosting (e.g. Whogohost, Truehost):** upload `public/index.html` to `public_html`.

## Option B — Full version with AI writing

Needs Node.js 18 or newer and an Anthropic API key (console.anthropic.com).

1. Copy `.env.example` to `.env` and paste your key after `ANTHROPIC_API_KEY=`.
2. Run `npm start`
3. Open http://localhost:3000

**Deploy on Render or Railway:** create a new Web Service from this folder (or a GitHub repo of it), set the start command to `npm start`, and add `ANTHROPIC_API_KEY` as an environment variable. The app will use AI for posts, rewrites, style analysis, growth ideas and clip captions.

Keep your API key on the server only. Never put it in `index.html`.

## Story studio (serialized fiction)

Open **Story studio** to run story accounts on autopilot.

1. **Plan a series.** Pick a genre, or "Next in my rotation". Add a setting and, if you like, a seed idea. Choose 7–50 parts, the part length (short, long or epic), the rating and the language (Pidgin works too). The AI writes a series bible: title, characters with looks for consistent pictures, the world, and a part-by-part plan with twists at 25%, 50% and 75%.
2. **Parts are written ahead.** Each part follows the plan and a running "story so far", opens with a hook, includes an epic quotable line and ends on a cliffhanger. Autopilot keeps 1–5 parts written ahead.
3. **Each platform gets its own format.**
   - **X and Threads:** a thread of 8–15 posts.
   - **TikTok, Instagram Reels, YouTube Shorts and Snapchat:** a caption plus a vertical video. Open **Video** on a part to preview it with sound, then **Export video**. Every scene gets an AI picture, the story line types onto the screen, a genre soundtrack plays underneath and each beat gets a sound effect (impact, heartbeat, thunder, riser and more). You can change any line or sound, or drop in your own picture.
   - **Facebook, Telegram and LinkedIn:** the full text, split into follow-ups when it's too long.
4. **When a series ends,** a new one starts in the next genre of your rotation (you can turn this off).

Tips:
- Turn on each platform's **AI-generated content** label when you post. TikTok requires it for AI images.
- Add a trending sound inside TikTok on top of the exported video for extra reach. Keep its volume low so the story's effects still land.
- Video export records in real time, so a 50-second part takes 50 seconds. Use Chrome or Edge on a computer and keep the tab visible. Chrome saves H.264 MP4 files; browsers that can't do that save WebM.
- With **"Accounts running a story post only the story"** turned on, those accounts stop getting regular tips posts.

Story writing needs the server with your API key (Option B). Without it, the studio still works but writes short template parts. Long parts use larger AI replies, so each part costs a few cents of API usage.

**Pictures:** the server fetches them from the free Pollinations image service (`/api/image`). To use a different image API, set `IMAGE_API_URL` in `.env`, using `{prompt}` and `{seed}` as placeholders, plus `IMAGE_API_TOKEN` if it needs a key. If a picture can't load, that scene uses animated mood art instead, and the video still exports.

## Where data is saved

Everything (brief, queue, accounts, clips) is saved in the browser's local storage on the device you use. Clearing browser data clears it. Moving to a database is a planned upgrade.

## Demo mode and live posting

Linked accounts run in **demo mode**: posts are scheduled, "published" and logged inside the app, but not sent to the real platforms. Live posting needs each platform's official API connected through the server:

- Instagram, Facebook, Threads — Meta Graph API (one Meta developer app covers all three)
- X — X API (paid tier for posting)
- TikTok — Content Posting API (needs app review)
- LinkedIn — Share on LinkedIn / Community Management API
- YouTube Shorts — YouTube Data API
- Pinterest, Telegram — their own APIs (Telegram's bot API is the easiest)

Autopilot also only runs while the app is open in a browser tab. For posting while your computer is off, the scheduler needs to move into the server. Both are the next build step.

## Safety notes

- Growth actions are capped per day and spaced out, because platforms ban accounts that follow or comment too fast.
- Style inspiration writes original posts; it never reposts another creator's words.
- Clips from streamers who haven't given permission are blocked from posting. Always keep the credit line.

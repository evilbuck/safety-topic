# SafetyTopic

Quick, credible safety briefs for meeting openers — curated from OSHA, DOE, and NIOSH public-domain content.

**Live site:** [alivegeek.github.io/safety-topic](https://alivegeek.github.io/safety-topic/)

## What it does

Click **Get a Topic** and you get a concise, ready-to-read safety brief: a title, a short summary, a handful of key points, and a source link. Perfect for kicking off a team meeting in under a minute.

- Pick a category or pull from all of them
- Copy the text or a shareable link, or print a clean handout
- Browse the full library at [`/browse.html`](https://alivegeek.github.io/safety-topic/browse.html) with keyword search
- Remembers which topics you've already used (local only) so you don't repeat

## Categories

50 topics across 10 categories:

- Chemicals & Hazardous Materials
- Driving & Travel Safety
- Ergonomics & Body Mechanics
- Fire & Emergency Safety
- Health & Wellness
- Hygiene & Environment
- Personal Protective Equipment
- Safety Culture
- Security & Personal Safety
- Walking & General Safety

## Tech

Zero-dependency static site — just HTML, CSS, and vanilla JavaScript. Topic data is inlined in `topics-data.js` so it runs equally well on GitHub Pages, any static host, or straight from `file://`.

```
index.html        # main app
browse.html       # searchable full list
app.js            # app logic
style.css         # styles
topics-data.js    # the topic library
server.js         # lightweight dev server (optional)
```

## Development

### Quick start
Open `index.html` directly in your browser. No build step required.

### With dev server (recommended)

Full clipboard and other secure context features require HTTP:

```bash
# Option 1: Built-in lightweight server
npm run dev
# Opens at http://localhost:3000
# Watches all project files and restarts on changes

# Option 1b: Direct (without npm)
node --watch --watch-path . server.js

# Option 2: Custom port
node server.js 8080

# Option 3: Serve (more features)
npx serve .
```

> **Why a server?** Modern browsers restrict APIs like clipboard to "secure contexts" (HTTPS or localhost). Running from `file://` disables copy/paste functionality.

### Adding new topics

Edit `topics-data.js`. Each topic follows this structure:

```javascript
{
  id: 'unique-slug',
  title: 'Topic Title',
  category: 'Safety Category',
  source: 'OSHA',
  source_ref: 'Publication title or URL',
  duration: '1-2 min',
  summary: 'Brief one-sentence summary.',
  key_points: [
    'Key point one',
    'Key point two',
  ],
  stat: 'Optional: "Did you know?" statistic',
  discussion_prompt: 'Optional: discussion question',
}
```

## Sources & disclaimer

Content is curated and paraphrased from public-domain materials published by [OSHA](https://www.osha.gov), [DOE EHSS](https://www.energy.gov/ehss), and [NIOSH](https://www.cdc.gov/niosh). This tool is a convenience — **always defer to your site-specific safety procedures.**

## Author

Built by **Nathan Holbrook** — [LinkedIn](https://www.linkedin.com/in/nathan-holbrook-39a65233/) · [GitHub](https://github.com/alivegeek)

Free to use.

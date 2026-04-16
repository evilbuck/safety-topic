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
```

## Running locally

Just open `index.html` in a browser. No build step, no server required.

## Sources & disclaimer

Content is curated and paraphrased from public-domain materials published by [OSHA](https://www.osha.gov), [DOE EHSS](https://www.energy.gov/ehss), and [NIOSH](https://www.cdc.gov/niosh). This tool is a convenience — **always defer to your site-specific safety procedures.**

## Author

Built by **Nathan Holbrook** — [LinkedIn](https://www.linkedin.com/in/nathan-holbrook-39a65233/) · [GitHub](https://github.com/alivegeek)

Free to use.

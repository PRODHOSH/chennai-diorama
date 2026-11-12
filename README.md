# Namma Chennai · நம்ம சென்னை

A small piece of Chennai you can walk around in.

It's about two kilometres of the old city around Chennai Central: Park Town, George Town, Periamet and Chintadripet. It's built in 3D from real OpenStreetMap data, and you can switch it between an ordinary morning, a Margazhi dawn, Thai Pongal and a Deepavali night. You can walk into a Murugan temple and a few homes, draw a kolam and leave it on a doorstep, and add your own photos and memories through Cloudinary.

We made it for a culture-focused hackathon. The idea is simple. A city map tells you where things are. It doesn't tell you what happens on the threshold of a house at five in the morning, or what a temple gate smells like at dusk. We wanted something that does.

---

## Running it

You need Node 18 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. The first load takes a few seconds while the city is assembled in your browser.

For a production build:

```bash
npm run build      # output goes to dist/
npm run preview    # serves dist/ at http://localhost:4173
```

`dist/` is a static site, so it can go on Netlify, Vercel, GitHub Pages, Cloudflare Pages or any static host.

Some useful links once it's running:

| Link | Opens |
|---|---|
| `/#place=central` | Chennai Central and its story |
| `/#place=kandhakottam` | The temple |
| `/#place=home-pongal` | The Pongal house |
| `/#studio` | The Kolam Studio |

---

## Cloudinary setup

The app works without Cloudinary. It just falls back to Wikimedia's own image thumbnails, and the upload button explains that uploads are off. To switch everything on:

1. **Get your cloud name.** It's at the top left of the Cloudinary dashboard.
2. **Create an unsigned upload preset.** Go to Settings → Upload → Upload presets → Add upload preset, set Signing mode to **Unsigned** and save. Note the preset name. While you're there you can also turn on auto-tagging or moderation for the preset.
3. **Allow the resource list.** Settings → Security → untick "Resource list" under restricted media types. This is what lets the app show *everyone's* uploads, not just the ones made in your own browser.
4. **Allow fetched URLs.** Same Security page: under *Restricted image types*, make sure **Fetched URL** is *unticked*. New accounts often ship with it ticked, and then every archive photo comes back with `401 – Images of type fetch are restricted`. If you want to be strict, limit fetch to `commons.wikimedia.org` and `upload.wikimedia.org`.

   The app checks this when it starts. If fetch is blocked, it loads photos straight from Wikimedia so nothing breaks, and Menu → Cloudinary settings tells you what to change.
5. **Add the values to the project:**

   ```bash
   cp .env.example .env.local
   ```

   Fill in `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET`, then restart `npm run dev`.

You can also paste the two values into the app itself, under Menu → Cloudinary settings. That only saves them in your own browser, which is handy for a quick demo on someone else's laptop.

**Don't put your API key or API secret in `.env.local`.** Any variable starting with `VITE_` ends up in the JavaScript that ships to the browser. The app is built so it never needs the secret.

### What Cloudinary actually does here

- **Every photo goes through it.** Archive photos are Wikimedia Commons originals pulled in with Cloudinary's fetch delivery. Each one is resized and cropped for wherever it appears: a 96px map pin, a square thumbnail, a story header, a full-screen view, a mobile size. All of them use `f_auto` and `q_auto`, and `g_auto` crops around the interesting part of the picture. You can see the presets at the top of `src/media/cloudinary.js`.
- **Visitor memories are stored in it.** "Share a memory" uploads photos, videos or audio with the unsigned preset. Each upload is tagged (`namma-chennai`, the category, the festival, the place) and carries context metadata: caption, the story text, the place, and the name the person chose to show.
- **Everyone sees everyone's uploads.** On load the app reads `/image/list/namma-chennai.json` and `/video/list/namma-chennai.json` and drops a pin for each memory next to the place it belongs to.
- **Shared kolams travel through it too.** When you place a kolam you can share it. It uploads as a PNG with the pattern data in its metadata, so other visitors see your kolam drawn on a doorstep in their city.
- **Videos** use Cloudinary's video delivery with automatic format and quality, and a generated poster frame.

Memories only attach to public places like the station, the temple or a market, never to a house. The upload form says so, and asks people not to include addresses or faces of people who haven't agreed.

---

## What's in it

### The city
2,449 building footprints, 795 road segments, 77 railway lines, platforms, the Cooum, the Buckingham Canal and the temple tanks, all from an OpenStreetMap extract. The buildings are drawn in one pass, with a shader that adds floors, windows, rolling shop shutters and lit windows at night. Black plastic water tanks sit on the terraces, because that's what Chennai's rooftops look like.

Where OSM has building heights we use them. Where it doesn't, we estimate from plot size.

Large parts of Chintadripet and George Town aren't mapped in OSM yet. Left as they were, those blocks read as empty ground, which is wrong. So we fill plots that face a real lane with plain low-rise houses (about a thousand of them), and only where OSM has nothing. Hover over one and it tells you it's estimated.

### Landmarks
- **Chennai Central.** The red-brick facade with its clock tower on the Wall Tax Road corner, the spired towers and turrets, the long porch and the platform sheds behind.
- **Ripon Building.** All white, with its two inner courtyards taken from the OSM footprint, plus colonnades, a portico and a clock tower.
- **Victoria Public Hall** and **Southern Railway Headquarters.**
- **Kandha Kottam.** The Murugan temple on Rasappa Chetty Street, built as a complete Dravidian temple: a seven-tier gopuram with painted stucco figures and rows of tiny shrines on every tier, red-and-white striped walls, a lamp pillar, an offering stone, a gilded flagstaff, Murugan's peacock, a pillared hall and the gold tower over the sanctum. Its real tank is next to it, with a small pavilion in the middle of the water. Flower and coconut stalls stand outside the gate, along with a rack for footwear.
- **Fort St. George's** bastions at the eastern edge.

All of these are built in code from the footprints and from photographs. They're labelled as stylised reconstructions, not surveys.

### The street
- **Shop boards** in Tamil and English, matched to the neighbourhood: steel-vessel and jewellery shops in George Town, lodges and tiffin centres around Central, flowers at Pookadai.
- **About a hundred boards with real names.** The hotels, lodges, banks and complexes OSM knows about, and the tea stalls and restaurants it has as points, get their actual name on the facade.
- **Blue Chennai Corporation street boards** along the roads. They're bilingual where OSM records the Tamil name.
- **Traffic.** Autos, buses, cars and two-wheelers drive on the left, and there are people on the footpaths.
- **Trains.** Long-distance rakes and suburban EMUs pull into Central, and EMUs run along the elevated MRTS line.

### The metro
Press "Metro" to fade the ground and look underneath. The **Blue Line** (Airport ⇄ Wimco Nagar) and **Green Line** (Central ⇄ St Thomas Mount) run in tunnels and meet at Central Metro. High Court station sits at the George Town edge. The 4-car trains move through them.

The real street entrances are on the map with bilingual signs: S3, S4 and B5 near Central, A2 and A3 at High Court. The tunnel routes come from OSM, but the depths are our guess.

The Phase 2 lines, including the Red Line, are still being built in other parts of the city and don't come through here, so they're not shown.

### Festivals
- **Everyday.** A morning with a small white kolam at many doorsteps.
- **Margazhi.** Dawn, with large kolams spilling out into the lanes and a tanpura drone if sound is on.
- **Pongal.** Golden morning light. A clay pot, sugarcane and a coloured kolam at the doors, a mango-leaf and marigold thoranam on the story houses, and decorated cattle standing in the lane outside the Pongal house.
- **Deepavali.** Night, with clay lamps on the thresholds, strings of lights down the facades and paper star lanterns. Flower-pot crackers, ground spinners and sparklers go off in the lanes, and there are fireworks over the open grounds. Fireworks can be turned down or off in the menu.

### Time and weather
- **Time of day:** dawn, morning, summer noon, golden morning, evening and night. Festivals set their own default time.
- **Weather:** clear, summer haze, monsoon rain or thunderstorm.
- **Rain** darkens the sky, wets the roads so they turn glossy, rings the ground with ripples and lays a veil of streaks over the whole view.
- **Storms** add a darker cloud deck, branching lightning that tends to strike the tall things (the gopuram, Central's clock tower, the tallest blocks) and thunder that arrives late after each flash.

### Step inside
Press **Step inside** at the bottom left, or the button at the top of any story with a door badge. There are four scenes:

- **Kandha Kottam at dusk.** Walk in through the gopuram, past the lamp pillar, the flagstaff and the peacock, towards the sanctum. The deity isn't shown, on purpose.
- **Deepavali before dawn.** A puja room at 4:30 in the morning: a tall brass lamp, a framed உ and ஓம் hung with jasmine and marigold, a kolam ringed with clay lamps, sweets, new silks, the bowl of oil for the early-morning oil bath (Ganga snanam), and a flower-pot cracker going off outside the door.
- **The Pongal courtyard.** The pot boiling over on a wood fire in an open courtyard, sugarcane, a banana-leaf meal, and a cattle shed with Kangayam cattle dressed for Mattu Pongal. Buttons step through the four days, Bhogi to Kaanum Pongal.
- **A morning at the doorstep.** The raised sit-out (thinnai) and the studded teak door, where a kolam draws itself on the washed threshold.

Every scene has numbered markers that explain what you're looking at.

### Kolam Studio
Sikku (looped-line) kolams are worked out with **mirror curves**, the same model mathematicians use to study them:
- The line moves diagonally between the dots and either crosses or bounces wherever you place a "mirror" between two dots.
- A search finds mirror layouts that make the whole kolam **one unbroken line**, the kambi form.
- Press "Weave a one-line kolam" for a new pattern on whatever grid you have.

Beyond that, the Studio has:
- **Drawing:** freehand and dot-to-dot tools, mirror and rotational symmetry, undo and redo.
- **Patterns:** 13 presets labelled honestly as either "Traditional form" or "Original design".
- **Playback:** step-by-step, with play, pause, step, speed and scrubbing.
- **Export:** PNG, SVG and the raw pattern file.
- **Place on a doorstep:** puts your kolam on a doorstep in the city.

### The film
Press **Watch the film** (bottom left, or on the welcome card) for a two-minute guided showreel. It runs in letterbox with Tamil and English subtitles and covers:
- Central, Ripon Building and Victoria Hall, the metro underneath, the temple, the George Town streets and the Fort
- Margazhi, Pongal, a monsoon storm and Deepavali fireworks
- a walk into the temple and a Deepavali home
- the Kolam Studio drawing a single-line kolam

You can skip to the next shot or leave at any time, and the city goes back to how you left it.

### And the rest
- Guided journeys
- "Discover a tradition", which picks a story you haven't seen yet
- Then & Now photo comparisons, using genuine old photographs only
- An atlas of places too far away for the map (Mylapore, Kanchipuram, Thanjavur and others), plotted to scale
- Search across stories, buildings, streets and shops
- A soundscape made in the browser: city hum, train horns, temple bells, rain and thunder
- Keyboard controls, a reduced-motion setting and a mobile layout

---

## How it's built

| Piece | What we used | Why |
|---|---|---|
| 3D | **Three.js** (r169) | Full control over geometry and shaders. Nearly everything is generated in code. There are no downloaded 3D models. |
| Animation | **GSAP** | Camera moves, festival changes, lightning timing. |
| Build | **Vite** | Fast dev server and a static build. |
| Map data | **OpenStreetMap**, preprocessed by `scripts/build-geo.mjs` | Real streets and footprints, turned into a ~450 KB JSON file. |
| Media | **Cloudinary**: fetch, upload, resource list, video | Every image the app shows, plus everything visitors add. |
| Archive photos | **Wikimedia Commons** | Openly licensed, with author and licence shown next to every image. |
| Sound | **Web Audio API** | Generated in the browser, no recordings. |
| Fonts | Fraunces, Hind Madurai, Noto Serif Tamil | Hind Madurai covers Tamil and Latin in one family. Noto Serif Tamil is for Tamil headings. |

No framework, no backend. It's plain JavaScript modules and one HTML file.

A few techniques that may be worth reading:

- **`src/world/buildings.js`:** all the buildings in one mesh. One shader paints floors, windows, shutters and night lights, and a lookup table turns a clicked triangle back into the OSM building it came from.
- **`src/world/temple.js`:** the temple is built from the actual vocabulary of Tamil temple architecture: the granite base, the tiers, the projecting cornices, and the three kinds of miniature shrine along each parapet (square domed ones at the corners, barrel-roofed ones at the middle, small ones between). The miniature shrines are instanced.
- **`src/kolam/engine.js`:** the mirror-curve tracer, plus the search for single-line kolams. It opens up mirrors only where that joins two separate loops into one, while keeping the pattern symmetrical.
- **`src/world/weather.js`:** at diorama distance a real raindrop is smaller than a pixel. So rain is a screen-space pass of streaks at three depths, combined with wet materials, ripples on the ground and a cloud layer that the lightning lights up.
- **`src/world/environment.js`:** festival, time of day and weather are combined into one lighting state, and changes animate through it. Festival decorations spread outward from wherever you're looking.

Performance: about 1.9 million triangles on screen. Tree detail drops with distance, and the trees, traffic, lamps and decorations are all instanced. Quality steps down on its own for phones; you can override it in the menu.

---

## What's real and what isn't

We cared about this, so here it is plainly.

- **Real:** the street layout, the building footprints, the railway, the platforms, the river and canal, the temple tanks, the metro tunnels and entrances, and the names of buildings, shops and streets. The extract was taken from OpenStreetMap in November 2026.
- **Estimated:** building heights where OSM doesn't give them, and the infill houses in unmapped blocks (these are labelled). Windows, shutters and water tanks are procedural.
- **Stylised:** every landmark, including the temple. They follow the real thing's character, not its measurements.
- **Illustrative:** the three family homes. Their stories are composites written for this project, and every one is marked as such. No real family or address is shown.
- **Left out on purpose:** the deity inside the sanctum; the proposed high-speed rail station that appears in OSM; and metro lines that aren't built yet.
- **Generated:** the sound is synthesised. Kolams marked "Traditional form" use a traditional grid and drawing rule with a computer-found route. "Original design" means we drew it.

---

## Project layout

```
index.html              the page and all UI markup
src/
  main.js               boots everything and wires the UI
  core/                 renderer, camera, post-processing; shared state
  world/                city geometry, landmarks, temple, metro, traffic, weather, festivals, signs
  interior/             the step-inside scenes and their props
  kolam/                kolam engine, presets, studio
  content/              places, stories, tours, verses; the media registry
  media/cloudinary.js   delivery presets, uploads, resource list
  audio/                the soundscape
  ui/                   story panel, pins, search, modals
scripts/build-geo.mjs   OSM extract → public/data/city.json
data/map.osm            the raw OpenStreetMap extract
```

To rebuild the city data after changing the extract:

```bash
node scripts/build-geo.mjs
```

---

## Credits

- Map data © OpenStreetMap contributors, under the Open Database License.
- Photographs and video from Wikimedia Commons. Each one is credited where it appears, and the full list is in Menu → About and in `src/content/media.js`.
- Fonts under the SIL Open Font License.
- யாதும் ஊரே யாவரும் கேளிர் — every town is our town, everyone our kin. (Kaniyan Pungundranar, Purananuru 192)

/**
 * PLACES & STORIES
 * ---------------------------------------------------------------------------
 * kind:
 *   'real'          — a real public place; facts are drawn from widely documented history.
 *   'illustrative'  — a composite story written for this demo; the house is a stylised
 *                     stand-in on a real lane. NOT a real family. Always badged in the UI.
 *   'community'     — added by visitors (Cloudinary uploads / placed kolams).
 * Positions are local metres from OSM (see scripts/build-geo.mjs). `at: 'anchor:<key>'`
 * resolves to a computed landmark/house position at runtime.
 */

export const CATS = {
  heritage: { label: 'Heritage', ta: 'பாரம்பரியம்', color: 'var(--cat-heritage)', hex: '#b4553a', icon: 'pillar' },
  home: { label: 'Household tradition', ta: 'வீட்டு மரபு', color: 'var(--cat-home)', hex: '#c9a24a', icon: 'home' },
  festival: { label: 'Festival', ta: 'திருவிழா', color: 'var(--cat-festival)', hex: '#b8336a', icon: 'lamp' },
  food: { label: 'Food', ta: 'உணவு', color: 'var(--cat-food)', hex: '#6a8f3c', icon: 'cup' },
  craft: { label: 'Art & craft', ta: 'கலை', color: 'var(--cat-craft)', hex: '#7b4fa0', icon: 'loom' },
  music: { label: 'Music', ta: 'இசை', color: 'var(--cat-music)', hex: '#3b77a8', icon: 'music' },
  temple: { label: 'Temple', ta: 'கோயில்', color: 'var(--cat-temple)', hex: '#d07a1f', icon: 'gopuram' },
  public: { label: 'Public space', ta: 'பொது இடம்', color: 'var(--cat-public)', hex: '#3f8c7d', icon: 'tree' },
  community: { label: 'Community memory', ta: 'மக்கள் நினைவு', color: 'var(--cat-community)', hex: '#e0cfa8', icon: 'heart' },
};

export const ICONS = {
  pillar: '<svg viewBox="0 0 24 24"><path d="M4 9l8-5 8 5M5 9h14M6 9v9M10 9v9M14 9v9M18 9v9M4 20h16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  lamp: '<svg viewBox="0 0 24 24"><path d="M4 15c2 3 14 3 16 0M5 15h14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M15 13c2-3 1-6-1-8 0 3-3 4-1 8" fill="currentColor"/></svg>',
  cup: '<svg viewBox="0 0 24 24"><path d="M7 8h8l-1 11H8zM5 21h12M15 11h2a2 2 0 0 1 0 4h-2.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 3c-1 1 1 2 0 3M13 3c-1 1 1 2 0 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  loom: '<svg viewBox="0 0 24 24"><path d="M4 4v16M20 4v16M4 7h16M4 17h16M8 7v10M12 7v10M16 7v10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  music: '<svg viewBox="0 0 24 24"><path d="M9 18V6l10-2v12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="7" cy="18" r="2.4" fill="currentColor"/><circle cx="17" cy="16" r="2.4" fill="currentColor"/></svg>',
  gopuram: '<svg viewBox="0 0 24 24"><path d="M6 21V15h12v6M7 15l1-3h8l1 3M8.5 12l1-3h5l1 3M10 9l.7-3h2.6L14 9M11 6c0-1.5 2-1.5 2 0M3 21h18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  tree: '<svg viewBox="0 0 24 24"><path d="M12 21v-6M7 15a5 5 0 1 1 2-9.6A4 4 0 1 1 17 13a3.5 3.5 0 0 1-1 2z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  metro: '<svg viewBox="0 0 24 24"><path d="M4 18V7l4 6 4-6 4 6 4-6v11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  kolam: '<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 4c3 0 5 3 8 3M12 20c-3 0-5-3-8-3M4 12c0-3 3-5 3-8M20 12c0 3-3 5-3 8"/></g><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>',
};

const ILLUSTRATIVE_NOTE = 'Illustrative story — a composite written for this demonstration from widely shared Tamil household practice. It is not about a real family, and the house is a stylised stand-in on a real lane.';

export const PLACES = [
  // ======================================================================= HERITAGE
  {
    id: 'central', cat: 'heritage', kind: 'real', recon: true, major: true,
    name: 'Chennai Central', ta: 'சென்னை சென்ட்ரல்',
    sub: 'Puratchi Thalaivar Dr. M.G. Ramachandran Central Railway Station · Park Town',
    at: [10, -10], cam: { dist: 230, polar: 1.0, az: 0.35 }, labelY: 52,
    hero: 'central_facade',
    stories: [
      {
        id: 'gateway', title: 'The gateway to the south', ta: 'தெற்கின் நுழைவாயில்',
        body: [
          { lede: 'For a century and a half, arriving in Madras — and then Chennai — has meant stepping out under this red-brick clock tower.' },
          { p: 'Central opened in 1873, when the city’s main terminus shifted here from Royapuram. Its Gothic Revival building, designed by George Harding, was extended over the following decades; the slender clock tower that now defines it rises at the corner where Poonamallee High Road meets Wall Tax Road.' },
          { facts: [['Opened', '1873'], ['Station code', 'MAS (from “Madras”)'], ['Renamed', '2019, after M.G. Ramachandran'], ['Style', 'Gothic Revival, red brick']] },
          { p: 'Long-distance trains leave for Delhi, Mumbai, Kolkata, Bengaluru and Kerala; the Grand Trunk Express, one of India’s oldest named trains, still runs from here to New Delhi. Next door, the Moore Market complex handles the suburban lines towards Arakkonam and Gummidipoondi.' },
          { p: 'Look at the wall the station faces along: Wall Tax Road is named after a levy collected in the 18th century to build a defensive wall around what was then called Black Town — today’s George Town.' },
          { gallery: ['central_facade', 'central_1925', 'central_bridge', 'central_rain', 'central_dawn', 'central_interior', 'central_aerial', 'central_night', 'central_square'] },
          { recon: 'In OpenStreetMap the heritage building itself isn’t mapped as a footprint, so its masses here are placed from the mapped porch canopy, concourse paths and kerb lines, and proportioned from the photographs above. The towers, turrets and spires are a stylised reconstruction — not a measured model.' },
        ],
      },
      {
        id: 'then-now', title: 'Then & now: 1880 → today', ta: 'அன்றும் இன்றும்',
        body: [
          { p: 'A photograph by Nicholas & Co., taken around 1880, shows the station before the clock tower we know today. Drag across the comparison to see what changed.' },
          { compare: 'central' },
          { p: 'By about 1925 the tower had risen, and the building looked much as it does now.' },
          { compare: 'central1925' },
        ],
      },
      {
        id: 'platform', title: 'Sounds of the platform', ta: 'நடைமேடை ஓசைகள்',
        body: [
          { p: 'Any Chennaiite can conjure Central with eyes closed: the two-tone horn of an arriving express, the clatter of coaches on points, announcements in Tamil, English and Hindi, and — above everything — vendors calling “kaapi, kaapi” and “tea, tea” down the length of the train.' },
          { audio: 'station', label: 'Station soundscape', note: 'Synthesised in your browser for this project — not a field recording.' },
          { p: 'Turn on the soundscape (the speaker button, bottom right) and zoom in to the platforms to hear the city change around you.' },
          { note: 'Observational essay written for this project.' },
        ],
      },
    ],
  },
  {
    id: 'ripon', cat: 'heritage', kind: 'real', recon: true, major: true,
    name: 'Ripon Building', ta: 'ரிப்பன் மாளிகை', sub: 'Seat of the Greater Chennai Corporation',
    at: 'anchor:ripon', cam: { dist: 210, polar: 0.98, az: 0.15 }, labelY: 44,
    hero: 'ripon_aerial',
    stories: [
      {
        id: 'white-building', title: 'The city’s white palace', ta: 'நகரின் வெண் மாளிகை',
        body: [
          { lede: 'Brilliantly white against the red brick of its neighbours, Ripon Building is where Chennai governs itself.' },
          { p: 'Completed in 1913 to designs by G.S.T. Harris and built by the contractor Loganatha Mudaliar, it combines Ionic and Corinthian orders in a neo-classical composition, crowned by a clock tower above the entrance portico.' },
          { p: 'It is named after Lord Ripon, Viceroy of India from 1880 to 1884, remembered for the 1882 resolution that laid foundations for elected local self-government. The Corporation it houses traces its origins to 1688, making it one of the oldest municipal bodies of its kind.' },
          { facts: [['Completed', '1913'], ['Architect', 'G.S.T. Harris'], ['Builder', 'Loganatha Mudaliar'], ['Corporation since', '1688']] },
          { p: 'Old cannons displayed on the lawns — they appear in OpenStreetMap, too — are reminders of the Fort-era city a kilometre east.' },
          { gallery: ['ripon_aerial', 'ripon_gcc', 'ripon_cc0', 'ripon_cannon'] },
          { recon: 'Footprint (including its two inner courtyards) from OpenStreetMap; height, colonnades, portico and tower are a stylised reconstruction from photographs.' },
        ],
      },
    ],
  },
  {
    id: 'victoria', cat: 'heritage', kind: 'real', recon: true, major: true,
    name: 'Victoria Public Hall', ta: 'விக்டோரியா பொது மண்டபம்', sub: 'Town hall, theatre and meeting place',
    at: 'anchor:victoria', cam: { dist: 170, polar: 1.0, az: -0.3 }, labelY: 40,
    hero: 'victoria_ripon',
    stories: [
      {
        id: 'hall', title: 'A hall for the public', ta: 'மக்களுக்கான மண்டபம்',
        body: [
          { lede: 'Between Central and Ripon Building stands a red-brick hall built so the city’s people had somewhere to gather.' },
          { p: 'Victoria Public Hall was built between 1888 and 1890 to designs by Robert Fellowes Chisholm, and named for Queen Victoria’s Golden Jubilee. It hosted public meetings, lectures and performances; it is often cited as the venue of the first film screening in Madras, in 1896.' },
          { facts: [['Built', '1888–1890'], ['Architect', 'R. F. Chisholm'], ['Style', 'Romanesque, Indo-Saracenic details'], ['Material', 'Red brick (OSM: building:material=brick)']] },
          { compare: 'victoria' },
          { gallery: ['victoria_ripon', 'victoria_2009', 'central_aerial'] },
          { recon: 'Footprint from OpenStreetMap. The tiled roof and tower are stylised from photographs.' },
        ],
      },
    ],
  },
  {
    id: 'srhq', cat: 'heritage', kind: 'real', recon: true,
    name: 'Southern Railway Headquarters', ta: 'தென்னக இரயில்வே தலைமையகம்', sub: 'Park Town',
    at: 'anchor:srhq', cam: { dist: 200, polar: 1.0, az: 0.7 }, labelY: 34,
    hero: 'srhq_1',
    stories: [
      {
        id: 'hq', title: 'Red brick, railway domes', ta: 'சிவப்புச் செங்கல் மாளிகை',
        body: [
          { lede: 'Across Wall Tax Road from Central, a second red-brick landmark runs the railways of the south.' },
          { p: 'The headquarters of Southern Railway — the zone formed in 1951 — occupies an early-20th-century Indo-Saracenic building whose brick and white trim echo the station opposite. Together with Central, Victoria Public Hall and Ripon Building it forms one of the most photographed heritage ensembles in the city.' },
          { gallery: ['srhq_1', 'srhq_2'] },
          { recon: 'Footprint with courtyards from OpenStreetMap; domes and tower are stylised.' },
        ],
      },
    ],
  },
  {
    id: 'central-metro', cat: 'public', kind: 'real', major: true,
    name: 'Central Metro', ta: 'சென்ட்ரல் மெட்ரோ', sub: 'Underground interchange · Blue & Green lines',
    at: [-172, 86], cam: { dist: 240, polar: 1.05, az: -0.4 }, labelY: 14, icon: 'metro', hero: 'central_metro',
    stories: [
      {
        id: 'metro', title: 'A city beneath the city', ta: 'நகரின் கீழ் ஒரு நகரம்',
        body: [
          { lede: 'Under the forecourt of Central, two metro lines cross in one of the largest underground stations in the city.' },
          { p: 'Chennai Metro’s Blue Line (Line 1) runs from the Airport to Wimco Nagar, passing through Central and High Court on its way north through George Town. The Green Line (Line 2) begins here at Central and runs to St Thomas Mount. Both tunnels, both stations and the street entrances you see on the map — S3, S4, B5 near Central and A2, A3 at High Court — are mapped in OpenStreetMap.' },
          { facts: [['Lines here', 'Blue (1) & Green (2)'], ['Stations on this map', 'Central Metro, High Court'], ['Trains', '4-car sets'], ['Above ground', 'MRTS viaduct, suburban & long-distance trains']] },
          { p: 'Above ground, the elevated MRTS line crosses the south of the map on its viaduct, and the suburban terminal at Moore Market sends EMUs west towards Arakkonam and north towards Gummidipoondi.' },
          { note: 'Phase 2 of Chennai Metro — including the Purple, Orange and Red lines — is under construction elsewhere in the city and does not pass through this area, so it is not shown. Tunnel depths in the x-ray view are illustrative.' },
          { gallery: ['central_metro', 'central_square'] },
          { action: 'metro', label: 'See the tunnels (Metro x-ray)' },
        ],
      },
    ],
  },
  {
    id: 'moore', cat: 'public', kind: 'real',
    name: 'Moore Market (site of)', ta: 'மூர் மார்க்கெட்', sub: 'Now the Chennai Suburban Terminal',
    at: [-168, -89], cam: { dist: 190, polar: 0.95, az: -0.6 }, labelY: 30, hero: 'moore_1905',
    stories: [
      {
        id: 'moore', title: 'The market that burned', ta: 'எரிந்த சந்தை',
        body: [
          { lede: 'Ask an older Chennaiite about second-hand books and they’ll say two words: Moore Market.' },
          { p: 'Opened in 1900 beside the station and named after Sir George Moore, President of the Madras Corporation, the market sold everything — books, gramophone records, pets, tools — in an Indo-Saracenic building around a courtyard. It was destroyed by fire in 1985. The site is now the Moore Market Complex, the terminal for suburban trains.' },
          { p: 'Its frontage ran to 350 feet. In the early mornings, the 1905 caption says, practically all the city’s marketing happened here; later it became a maze of second-hand bookstalls, pet and bird sellers, gramophone records and odd hardware that generations of students remember.' },
          { compare: 'moore' },
          { gallery: ['moore_1905', 'moore_postcard', 'moore_today'] },
          { p: 'If you have a memory of buying your first book here, add it to the map.' },
          { action: 'contribute', label: 'Share a Moore Market memory' },
        ],
      },
    ],
  },
  {
    id: 'fort', cat: 'heritage', kind: 'real',
    name: 'Fort St. George', ta: 'புனித ஜார்ஜ் கோட்டை', sub: 'Where the city began · 1644',
    at: [960, 260], cam: { dist: 360, polar: 0.92, az: 0.9 }, labelY: 20, major: true,
    hero: 'fort_2014',
    stories: [
      {
        id: 'fort', title: 'Where Madras began', ta: 'சென்னை தோன்றிய இடம்',
        body: [
          { lede: 'Every one of the streets on this map grew outward from the bastions at its eastern edge.' },
          { p: 'On 22 August 1639, two officers of the English East India Company, Francis Day and Andrew Cogan, obtained a strip of sandy coast from Damarla Venkatadri Nayaka, a local chief serving the Vijayanagara rulers. They built a fort there, and finished it in 1644 — the first English fortress in India — naming it after St George, the patron saint of England.' },
          { p: 'Weavers, dyers and merchants settled around it. The fishing village of Madraspatnam to the north and the settlement of Chennapatnam — commonly said to be named after Venkatadri’s father, Chennappa Nayaka — grew together into one city. That is why it has two names, and why Chennai still celebrates its birthday as Madras Day, on 22 August.' },
          { facts: [['Land grant', '22 August 1639'], ['Fort completed', '1644'], ['Named after', 'St George'], ['Today', 'Tamil Nadu Assembly & Secretariat']] },
          { compare: 'fort' },
          { gallery: ['fort_2014', 'fort_1754', 'fort_wallajah', 'fort_cupola'] },
          { recon: 'The bastions, ravelins and gates on this map (Wallajah Gate, St George’s Gate) are OpenStreetMap footprints, extruded as earthworks. The Secretariat buildings inside the walls lie just beyond the map’s edge.' },
        ],
      },
      {
        id: 'stmary', title: 'Inside the walls', ta: 'கோட்டைக்குள்',
        body: [
          { lede: 'Behind the Fort’s walls stands a church that connects Chennai to a university on the other side of the world.' },
          { p: 'St Mary’s Church was consecrated in 1680, making it the oldest Anglican church east of Suez. Its registers record the marriage of Elihu Yale, who later served as Governor of Madras. Years after he returned to England, Yale sent books and goods to a struggling college in Connecticut — which renamed itself Yale in his honour. Robert Clive, whose campaigns began the British conquest of India, was married here too, in 1753.' },
          { p: 'Nearby, the Fort Museum keeps coins, uniforms, weapons and portraits from three centuries of the Fort’s history, along with the statue of Lord Cornwallis that once stood under the domed cupola you can see in the photographs.' },
          { gallery: ['fort_stmary', 'fort_stmary_in', 'fort_museum', 'fort_cupola'] },
          { p: 'Today the Fort is still a seat of power: the Legislative Assembly and the Secretariat of Tamil Nadu work inside it.' },
        ],
      },
    ],
  },
  {
    id: 'peoplespark', cat: 'public', kind: 'real',
    name: 'People’s Park', ta: 'மக்கள் பூங்கா', sub: 'Laid out in 1859',
    at: [-374, -719], cam: { dist: 300, polar: 0.92, az: -0.3 }, labelY: 14,
    hero: 'park_1907',
    stories: [
      {
        id: 'park', title: 'A park for the people', ta: 'மக்களுக்கான பூங்கா',
        body: [
          { lede: 'In 1859 the Governor of Madras, Sir Charles Trevelyan, set aside a large green space north of the city for the public — the first of its kind in Madras.' },
          { p: 'People’s Park had lakes, carriage drives and avenues of palms, and for well over a century it held the city’s zoo, until the animals moved to the new Arignar Anna Zoological Park at Vandalur in the 1980s. Parts of the old park ground are now occupied by the Jawaharlal Nehru Stadium and Nehru Indoor Stadium — you can see their outlines, mapped in OpenStreetMap, on this side of the city.' },
          { p: 'There is a small memorial to Trevelyan beside Ripon Building, on the same road — it is mapped in OpenStreetMap too.' },
          { gallery: ['park_1907', 'park_palms'] },
        ],
      },
    ],
  },
  {
    id: 'memorialhall', cat: 'heritage', kind: 'real',
    name: 'Memorial Hall', ta: 'நினைவு மண்டபம்', sub: 'Park Town · built after 1857',
    at: [309, -36], cam: { dist: 150, polar: 1.0, az: 0.5 }, labelY: 16,
    hero: 'memorial_hall',
    stories: [
      {
        id: 'memorial', title: 'A hall of thanksgiving', ta: 'நன்றி மண்டபம்',
        body: [
          { lede: 'Just east of Central, a columned building remembers a war that did not reach Madras.' },
          { p: 'The uprising of 1857 shook northern India. Madras was spared the fighting, and its residents raised money by public subscription for a hall of thanksgiving, completed in the years that followed. It stands on Memorial Hall Road in Park Town, a short walk from Central — and from the Bible Society building beside it, mapped in OpenStreetMap.' },
          { p: 'Look for its tall classical portico: Park Town is full of such buildings, half-hidden behind lodges, signboards and fruit stalls.' },
          { gallery: ['memorial_hall', 'parktown_station'] },
        ],
      },
    ],
  },

  // ======================================================================= TEMPLES
  {
    id: 'kandhakottam', cat: 'temple', kind: 'real', recon: true, inside: 'temple',
    name: 'Kandha Kottam', ta: 'கந்த கோட்டம்', sub: 'Murugan temple, Park Town',
    at: 'anchor:kandhakottam', cam: { dist: 150, polar: 1.02, az: 0.4 }, labelY: 30, major: true,
    stories: [
      {
        id: 'kandhakottam', title: 'A poet’s temple', ta: 'வள்ளலாரின் கோயில்',
        body: [
          { lede: 'In the lanes behind Central, a gopuram rises over Rasappa Chetty Street: Kandha Kottam, one of George Town’s best-loved temples, dedicated to Murugan.' },
          { p: 'It is closely associated with Ramalinga Swamigal — Vallalar — the 19th-century saint-poet who sang to the deity here in his youth, before preaching compassion for every living being.' },
          { h: 'How to read a Tamil temple' },
          { steps: [
            'Rajagopuram — the gateway tower. Granite base, then stucco tiers crowded with painted figures, crowned by a barrel vault and gilded kalasams.',
            'Prakaram — the enclosure wall in red-and-white kaavi stripes, walked clockwise.',
            'Deepasthambam, balipitham, kodimaram — lamp pillar, lotus offering-stone and gilded flagstaff, all on the axis to the sanctum.',
            'Mayil — Murugan’s peacock, facing the sanctum.',
            'Mandapam and vimanam — the pillared hall, and the tower over the sanctum where the deity sits in lamp-light.',
          ] },
          { gallery: ['ekambareswarar', 'georgetown_1'] },
          { note: 'The photographs show the Ekambareswarar temple and the bazaar streets nearby in George Town — we have not yet found an openly licensed photograph of Kandha Kottam itself. If you have one, share it from the menu.' },
          { p: 'Outside, as at every temple gate, stalls sell flowers, coconuts and camphor for the archana, and there’s a stand to leave your footwear. The temple’s own tank, mapped in OpenStreetMap as Kandaswami Muthukumaraswami Koil Kulam, lies just beside it, with a pavilion (neerazhi mandapam) in the water.' },
          { recon: 'OpenStreetMap maps the temple as a point and its tank as a polygon. The complex here — gopuram, walls, mandapam, vimanam — is a stylised reconstruction built to the grammar of Dravidian temple architecture and placed facing the street; it is not a survey of the real building, whose proportions differ.' },
        ],
      },
    ],
  },
  {
    id: 'kulam', cat: 'temple', kind: 'real',
    name: 'Temple tank of Ekambareswarar', ta: 'கோயில் குளம்', sub: 'George Town',
    at: 'anchor:ekambareswarar', cam: { dist: 150, polar: 0.95, az: -0.2 }, labelY: 26, hero: 'ekambareswarar',
    stories: [
      {
        id: 'kulam', title: 'Why every temple has a tank', ta: 'குளம் ஏன்?',
        body: [
          { lede: 'Steps descending on all four sides, a pavilion in the middle, water reflecting a gopuram: the temple tank is one of Tamil Nadu’s most beautiful pieces of civic engineering.' },
          { p: 'Tanks gather the monsoon rain that recharges the wells of the surrounding streets. They are used for ritual bathing, and on festival nights the deity is taken around the water on a lamp-lit float — the theppam, or float festival.' },
          { p: 'In George Town’s grid of narrow streets, OpenStreetMap records several tanks beside their temples, including this one beside Ekambareswarar temple and others named for Kandaswami and Chennamalleswarar.' },
          { recon: 'Tank outline from OpenStreetMap; the gopuram is a generic stylised form.' },
        ],
      },
    ],
  },

  // ======================================================================= MUSIC, CRAFT, FOOD
  {
    id: 'annamalai', cat: 'music', kind: 'real',
    name: 'Raja Annamalai Mandram', ta: 'ராஜா அண்ணாமலை மன்றம்', sub: 'Tamil Isai Sangam · Esplanade',
    at: [940, -367], cam: { dist: 170, polar: 0.98, az: 0.6 }, labelY: 22,
    hero: 'tamil_isai',
    stories: [
      {
        id: 'tamil-isai', title: 'Songs in Tamil', ta: 'தமிழிசை',
        body: [
          { lede: 'Every December Chennai becomes the world’s busiest classical-music city. This hall has a special place in that story.' },
          { p: 'Raja Annamalai Mandram is home to the Tamil Isai Sangam, founded in 1943 to champion concerts sung in Tamil at a time when other languages dominated the classical stage. Its annual festival is part of the city’s December Music Season, when hundreds of concerts fill sabhas across Chennai.' },
          { gallery: ['tamil_isai', 'concert_1', 'concert_2', 'nadaswaram', 'mridangam', 'bharatanatyam'] },
          { p: 'The concert photographs above were taken at other venues during the 2017 season — they show what a December kutcheri looks like.' },
          { audio: 'tanpura', label: 'Tanpura drone (Sa–Pa)', note: 'Synthesised in your browser for this project.' },
        ],
      },
    ],
  },
  {
    id: 'artscollege', cat: 'craft', kind: 'real',
    name: 'Government College of Arts and Crafts', ta: 'அரசு கவின் கலைக் கல்லூரி', sub: 'Periamet',
    at: [-990, 241], cam: { dist: 170, polar: 0.95, az: -0.8 }, labelY: 22,
    hero: 'arts_college',
    stories: [
      {
        id: 'art-school', title: 'An art school since 1850', ta: '1850 முதல்',
        body: [
          { lede: 'At the western edge of our map is one of the oldest art schools in India.' },
          { p: 'Founded in 1850 as the Madras School of Art, the college trained generations of artists and craftspeople. Under principal K.C.S. Paniker its students helped shape the Madras Art Movement, and many later founded the Cholamandal Artists’ Village on the coast in 1966.' },
          { gallery: ['arts_college', 'arts_1865'] },
          { p: 'The school taught photography from its early decades — the 1865 photograph above was made by a photographer working from it.' },
          { h: 'Crafts of Tamil Nadu' },
          { p: 'The state’s great craft traditions live mostly beyond this map: Thanjavur paintings with gilded relief, lost-wax bronzes from Swamimalai, silk from Kanchipuram. Open “Beyond the map” in the menu to visit them.' },
          { gallery: ['thanjavur', 'thanjavur_nataraja', 'bronze_1', 'bronze_2'] },
          { action: 'atlas', label: 'Visit the craft towns' },
        ],
      },
    ],
  },
  {
    id: 'chintadripet', cat: 'craft', kind: 'real',
    name: 'Chintadripet', ta: 'சிந்தாதிரிப்பேட்டை', sub: 'The little loom town',
    at: [-640, 640], cam: { dist: 260, polar: 0.9, az: 0.2 }, labelY: 18,
    hero: 'chintadripet',
    stories: [
      {
        id: 'looms', title: 'Chinna-thari-pettai', ta: 'சின்னத் தறிப் பேட்டை',
        body: [
          { lede: 'The narrow lanes south-west of Central were laid out for weavers.' },
          { p: 'Chintadripet was founded in the 1730s as a settlement for weavers supplying cloth to the East India Company. Its name is commonly explained as chinna-thari-pettai, “the town of small looms”.' },
          { p: 'Handloom weaving in Tamil Nadu reaches its height in Kanchipuram silk — heavy, lustrous saris with contrasting borders woven with zari, often joined to the body by the korvai technique so border and body are different colours.' },
          { gallery: ['chintadripet', 'silk_weaving', 'silk_loom'] },
          { p: 'The illustrative homes on this map — the kolam house and the Pongal house — stand in Chintadripet’s lanes.' },
        ],
      },
    ],
  },
  {
    id: 'kaapi', cat: 'food', kind: 'real',
    name: 'Kaapi & tiffin, Park Town', ta: 'காபி & டிபன்', sub: 'The tea stalls and tiffin centres around Central',
    at: [292, -118], cam: { dist: 140, polar: 0.95, az: 0.3 }, labelY: 18,
    hero: 'coffee_1',
    stories: [
      {
        id: 'kaapi', title: 'Filter kaapi, the Chennai way', ta: 'ஃபில்டர் காபி',
        body: [
          { lede: 'Before the trains, before the traffic, Chennai wakes up to the sound of coffee being poured from a height.' },
          { p: 'OpenStreetMap lists more than a dozen tea stalls, coffee houses and tiffin centres within a few minutes’ walk of Central. What they share is a ritual: decoction dripped slowly through a two-tiered brass filter, mixed with hot milk and sugar, then poured between tumbler and davara until it froths.' },
          { steps: ['Pack ground coffee (often blended with chicory) into the upper chamber of the filter.', 'Pour boiling water over it, close the lid and let a thick decoction drip through — fifteen minutes or more.', 'Heat milk until it just rises.', 'Add a little decoction and sugar to the tumbler, then the milk.', 'Pour between tumbler and davara, pulling the stream long, until a soft froth forms.'] },
          { gallery: ['coffee_1', 'coffee_2', 'coffee_filter'] },
          { h: 'Tiffin' },
          { p: '“Tiffin” is the Chennai word for light meals — idli, dosa, vada, pongal and upma — eaten with sambar and coconut chutney. Lunch is “meals”: rice with sambar, rasam, kootu, poriyal and curd, served on a banana leaf.' },
          { gallery: ['idli_madras', 'idli_vada', 'ven_pongal', 'meals'] },
        ],
      },
    ],
  },
  {
    id: 'pookadai', cat: 'food', kind: 'real',
    name: 'Flower Bazaar', ta: 'பூக்கடை', sub: 'George Town',
    at: [700, -640], cam: { dist: 190, polar: 0.92, az: 0.5 }, labelY: 16, hero: 'jasmine',
    stories: [
      {
        id: 'flowers', title: 'A neighbourhood named for flowers', ta: 'பூக்கடை',
        body: [
          { lede: 'The police station on this corner is still called Flower Bazaar — Pookadai in Tamil — after the flower trade that filled these streets.' },
          { p: 'Strings of jasmine (malli) for the hair, marigold garlands for doorways and temples, kanakambaram in orange: flowers are an everyday necessity in Tamil life, not a luxury. Much of the wholesale flower market moved to Koyambedu in the 1990s, but the name — and many flower sellers — remain.' },
          { gallery: ['jasmine', 'georgetown_1', 'georgetown_2'] },
          { p: 'George Town around it is the city’s great wholesale bazaar — streets of grain, spices, steel vessels, textiles and gold, packed into lanes laid out in the 18th century.' },
          { p: 'In Pongal and Deepavali modes, look for the marigold strings on doorways across the map.' },
        ],
      },
    ],
  },

  // ======================================================================= ILLUSTRATIVE HOMES
  {
    id: 'home-kolam', cat: 'home', kind: 'illustrative', major: true, inside: 'kolam',
    name: 'A morning at the vaasal', ta: 'வாசல் கோலம்', sub: 'Illustrative home · Chintadripet lane',
    at: 'anchor:house-kolam', cam: { dist: 70, polar: 0.92, az: 0.5 }, labelY: 12, house: { target: [-560, 520] },
    hero: 'kolam_chalk',
    stories: [
      {
        id: 'grandmother', title: 'The kolam my grandmother taught me', ta: 'பாட்டி கற்றுத் தந்த கோலம்',
        body: [
          { illustrative: true },
          { lede: '“Before the milk packets arrive, before the first bus, Paati is already at the door with a bucket of water and a small steel tin of rice flour.”' },
          { p: 'She sweeps the threshold, sprinkles water to settle the dust, and sets down the dots — one, three, five, three, one — pinched between thumb and forefinger. Then the line begins, and it does not stop until it has wound around every dot and come home to where it started.' },
          { kolam: 'sikku-5-diamond' },
          { p: '“Why rice flour?” I asked once. “So the ants have breakfast too,” she said.' },
          { action: 'studio:sikku-5-diamond', label: 'Learn this kolam in the Studio' },
        ],
      },
      {
        id: 'why', title: 'Why kolams are drawn at dawn', ta: 'ஏன் விடியலில்?',
        body: [
          { p: 'Across Tamil Nadu, women of the household traditionally draw a kolam at the threshold (vaasal) every morning. It welcomes guests and the goddess Lakshmi into the home, and because it is made of rice flour it is also an offering to ants, birds and small creatures.' },
          { p: 'There are many families of design. Pulli kolams join dots; sikku (or kambi) kolams weave lines around the dots without touching them; padi kolams are geometric and drawn for auspicious occasions. During the month of Margazhi kolams grow street-sized; at Pongal they burst into colour.' },
          { p: 'Mathematicians have long been fascinated: computer scientist Gift Siromoney studied kolams as “picture languages” in the 1970s, and the drawing rule used in our Studio — mirror curves — was explored by Paulus Gerdes for related traditions.' },
          { gallery: ['kolam_chalk', 'kolam_pongal', 'kolam_powder', 'kolam_2019'] },
          { video: 'kolam_light_video' },
        ],
      },
    ],
  },
  {
    id: 'home-deepavali', cat: 'festival', kind: 'illustrative', major: true, inside: 'deepavali',
    name: 'Deepavali before dawn', ta: 'தீபாவளி', sub: 'Illustrative home · George Town',
    at: 'anchor:house-deepavali', cam: { dist: 80, polar: 0.92, az: -0.4 }, labelY: 14, house: { target: [300, -560], apartment: true },
    hero: 'diwali_2008',
    stories: [
      {
        id: 'ganga-snanam', title: '“Ganga snanam aachaa?”', ta: 'கங்கா ஸ்நானம் ஆச்சா?',
        body: [
          { illustrative: true },
          { lede: 'In Tamil homes Deepavali begins in the dark, around four in the morning, with warm sesame oil.' },
          { p: 'The eldest woman of the house dabs oil on everyone’s head; the oil bath that follows is called Ganga snanam, and for the rest of the day the greeting on the street is “Ganga snanam aachaa?” — “Have you had your Ganga bath?”' },
          { p: 'New clothes are laid out with sweets and a spoonful of Deepavali legiyam, a dark herbal paste meant to help digest everything that comes next: athirasam, murukku, mysore pak and the first crackers, set off on the street before sunrise. In Tamil Nadu the festival commemorates Krishna’s victory over the demon Narakasura.' },
          { gallery: ['diwali_2008', 'diwali_crackers', 'diwali_skyline', 'diwali_2013'] },
          { action: 'mode:deepavali', label: 'See the city on Deepavali' },
        ],
      },
      {
        id: 'karthigai', title: 'Our other festival of lamps', ta: 'கார்த்திகை தீபம்',
        body: [
          { p: 'Visitors from the north are often surprised: in Tamil Nadu the great festival of lamps is not Deepavali but Karthigai Deepam, a few weeks later, when rows of clay agal vilakku line every doorstep, window ledge and wall.' },
          { p: 'Its most famous flame is lit on the hill at Tiruvannamalai.' },
          { gallery: ['karthigai', 'agal', 'karthigai_fest'] },
        ],
      },
    ],
  },
  {
    id: 'home-pongal', cat: 'festival', kind: 'illustrative', major: true, inside: 'pongal',
    name: 'Pongalo Pongal!', ta: 'பொங்கலோ பொங்கல்', sub: 'Illustrative home · Chintadripet',
    at: 'anchor:house-pongal', cam: { dist: 75, polar: 0.9, az: 1.0 }, labelY: 12, house: { target: [-700, 700] },
    hero: 'pongal_prep',
    stories: [
      {
        id: 'four-days', title: 'Four days of thanks', ta: 'நான்கு நாட்கள்',
        body: [
          { illustrative: true },
          { lede: 'Pongal is the harvest festival of the Tamils, held in mid-January as the month of Thai begins. “Thai pirandhal vazhi pirakkum,” people say — when Thai is born, a way will open.' },
          { days: [
            { ta: 'போகி', en: 'Bhogi', text: 'The last day of Margazhi. Houses are cleaned and old things discarded — traditionally in a bonfire at dawn. (Chennai now encourages smoke-free Bhogi to protect air quality.)' },
            { ta: 'தைப் பொங்கல்', en: 'Thai Pongal', text: 'In the courtyard or on the street, new rice is boiled with milk and jaggery in a new pot tied with turmeric. When it boils over, everyone shouts “Pongalo Pongal!” and the first portion is offered to the Sun.' },
            { ta: 'மாட்டுப் பொங்கல்', en: 'Mattu Pongal', text: 'A day for the cattle who work the fields: they are bathed, their horns painted, garlanded with bells and fed pongal.' },
            { ta: 'காணும் பொங்கல்', en: 'Kaanum Pongal', text: 'A day of visiting — relatives, friends, and in Chennai, the Marina beach, which fills with families.' },
          ] },
          { gallery: ['pongal_prep', 'pongal_cooking', 'pongal_chennai', 'mattu_pongal', 'kolam_pongal', 'kolam_nattarampalli'] },
          { action: 'mode:pongal', label: 'See the city on Pongal' },
          { action: 'studio:pongal-pot', label: 'Draw a Pongal kolam' },
        ],
      },
      {
        id: 'sakkarai', title: 'Sakkarai pongal at our home', ta: 'சர்க்கரைப் பொங்கல்',
        body: [
          { illustrative: true },
          { p: 'Rice and a little moong dal, boiled soft in milk; jaggery melted in, then cardamom, cashews and raisins fried in ghee. It is the same pot that boiled over in the morning — sweet, sticky, and best eaten from a banana leaf while still warm.' },
          { p: 'Its everyday cousin, ven pongal, is savoury — peppercorns, cumin, ginger and curry leaves — and a fixture of Chennai tiffin.' },
          { gallery: ['pongal_home', 'ven_pongal'] },
        ],
      },
    ],
  },
  {
    id: 'margazhi', cat: 'festival', kind: 'real',
    name: 'Margazhi mornings', ta: 'மார்கழி', sub: 'Street story · Chintadripet lanes',
    at: [-600, 600], cam: { dist: 180, polar: 0.88, az: -0.3 }, labelY: 10,
    hero: 'kolam_nattarampalli',
    stories: [
      {
        id: 'margazhi', title: 'The month of dawn', ta: 'விடியலின் மாதம்',
        body: [
          { lede: 'From mid-December to mid-January, Tamil streets wake earlier than at any other time of year.' },
          { quote: 'மார்கழித் திங்கள் மதி நிறைந்த நன்னாளால்', en: '“In the month of Margazhi, on this day of the full moon…” — the opening line of Andal’s Tiruppavai, sung at dawn throughout the month.' },
          { p: 'Groups sing bhajans through the lanes before sunrise, and the kolams at every door become larger and more elaborate — some streets hold competitions. In the evenings the December Music Season fills the sabhas.' },
          { kolam: 'margazhi-9' },
          { action: 'mode:margazhi', label: 'See a Margazhi dawn' },
        ],
      },
    ],
  },
];

/** "Beyond the map": too far to place on this diorama, so they get their own atlas */
export const ATLAS = [
  { id: 'mylapore', name: 'Mylapore', ta: 'மயிலாப்பூர்', lat: 13.0339, lon: 80.2696, cat: 'temple', media: ['mylapore_mandapa', 'mylapore_house'],
    text: 'Around the Kapaleeshwarar temple and its great tank, Mylapore keeps the feel of an old temple town inside the city. Margazhi kolams on its streets are famous, and its sabhas anchor the December Music Season.' },
  { id: 'armenian', name: 'Armenian Church, George Town', ta: 'ஆர்மீனியன் தேவாலயம்', lat: 13.0921, lon: 80.2878, cat: 'heritage', media: ['armenian'],
    text: 'Armenian merchants traded in Madras from the 1600s. Their Church of the Holy Virgin Mary on Armenian Street dates from 1772, and in 1794 Madras printed Azdarar — the first Armenian-language periodical anywhere in the world. Just north of this map.' },
  { id: 'marina', name: 'Marina Beach', ta: 'மெரினா கடற்கரை', lat: 13.05, lon: 80.2824, cat: 'public', media: [],
    text: 'Chennai’s long urban beach. On Kaanum Pongal it fills with families on outings — the city’s biggest picnic.' },
  { id: 'kanchipuram', name: 'Kanchipuram', ta: 'காஞ்சிபுரம்', lat: 12.8342, lon: 79.7036, cat: 'craft', media: ['silk_weaving', 'silk_loom'],
    text: 'The temple town of silk. Kanchipuram saris are hand-woven from mulberry silk with zari borders; the best are woven with contrasting borders interlocked with the body.' },
  { id: 'thanjavur', name: 'Thanjavur', ta: 'தஞ்சாவூர்', lat: 10.787, lon: 79.1378, cat: 'craft', media: ['thanjavur', 'thanjavur_nataraja'],
    text: 'Home of the Brihadeeswarar temple and of Thanjavur painting — devotional panels with raised gesso work, gold foil and inset stones.' },
  { id: 'swamimalai', name: 'Swamimalai', ta: 'சுவாமிமலை', lat: 10.9573, lon: 79.3256, cat: 'craft', media: ['bronze_1', 'bronze_2'],
    text: 'Families here still cast bronze icons by the lost-wax method: a wax model is coated in clay, the wax melted out, and metal poured into the space it leaves.' },
  { id: 'chettinad', name: 'Chettinad (Karaikudi)', ta: 'செட்டிநாடு', lat: 10.0731, lon: 78.7732, cat: 'food', media: ['meals'],
    text: 'A region of grand mansions and one of India’s most celebrated cuisines — rich with black pepper, star anise and freshly ground masalas.' },
  { id: 'tiruvannamalai', name: 'Tiruvannamalai', ta: 'திருவண்ணாமலை', lat: 12.2253, lon: 79.0747, cat: 'festival', media: ['karthigai', 'agal'],
    text: 'On Karthigai Deepam a great flame is lit on top of the Arunachala hill, visible for miles around.' },
];

export const VERSES = [
  { ta: 'யாதும் ஊரே யாவரும் கேளிர்', en: 'Every town is our town; everyone is our kin.', src: 'Kaniyan Pungundranar, Purananuru 192', note: 'Some two thousand years old, and the spirit of this project: a city belongs to everyone who makes a life in it.' },
  { ta: 'அகர முதல எழுத்தெல்லாம் ஆதி\nபகவன் முதற்றே உலகு', en: 'As the letter A is the first of all letters, so the Primal One is first of all the world.', src: 'Thiruvalluvar, Thirukkural 1', note: 'The opening couplet of the Kural — 1,330 couplets on virtue, wealth and love.' },
  { ta: 'மார்கழித் திங்கள் மதி நிறைந்த நன்னாளால்', en: 'In the month of Margazhi, on this day of the full moon…', src: 'Andal, Tiruppavai 1', note: 'Sung at dawn through Margazhi.' },
  { ta: 'கற்றது கைமண் அளவு, கல்லாதது உலகளவு', en: 'What we have learned is a handful of sand; what we have not, the size of the world.', src: 'Attributed to Avvaiyar', note: '' },
];

export const GLOSSARY = [
  ['கோலம்', 'kolam', 'Threshold drawing in rice flour'],
  ['புள்ளி', 'pulli', 'Dot (of a kolam grid)'],
  ['வாசல்', 'vaasal', 'Entrance, threshold'],
  ['திண்ணை', 'thinnai', 'Raised verandah platform at the front of a house'],
  ['முற்றம்', 'mutram', 'Open courtyard inside a house'],
  ['குளம்', 'kulam', 'Tank, pond (of a temple)'],
  ['கோபுரம்', 'gopuram', 'Gateway tower of a temple'],
  ['அகல் விளக்கு', 'agal vilakku', 'Clay oil lamp'],
  ['பொங்கல்', 'pongal', 'To boil over; the festival; the dish'],
  ['பாட்டி', 'paati', 'Grandmother'],
  ['நம்ம', 'namma', 'Our (inclusive, colloquial)'],
];

export const TOURS = [
  { id: 'heritage', name: 'A heritage walk', ta: 'பாரம்பரிய நடை', stops: ['central', 'central-metro', 'victoria', 'ripon', 'peoplespark', 'srhq', 'memorialhall', 'moore', 'fort'], about: 'Seven stops, from the station and the metro beneath it to the Fort.' },
  { id: 'household', name: 'Household traditions', ta: 'வீட்டு மரபுகள்', stops: ['home-kolam', 'margazhi', 'home-pongal', 'home-deepavali'], about: 'Kolam at dawn, Margazhi, Pongal and Deepavali at home.' },
  { id: 'kolam', name: 'A kolam journey', ta: 'கோலப் பயணம்', stops: ['home-kolam', 'margazhi', 'home-pongal'], about: 'Learn the kolam, then try it in the Studio.', end: 'studio' },
  { id: 'food', name: 'The food trail', ta: 'உணவுப் பாதை', stops: ['kaapi', 'pookadai', 'home-pongal'], about: 'Kaapi, flowers and sakkarai pongal.' },
  { id: 'arts', name: 'Music & making', ta: 'இசையும் கலையும்', stops: ['annamalai', 'artscollege', 'chintadripet'], about: 'Tamil Isai, an art school from 1850, and a weavers’ town.' },
];

/** Then & Now pairs — only genuine historical photographs */
export const COMPARE = {
  fort: { then: 'fort_1754', now: 'fort_2014', title: 'Fort St. George', thenLabel: '1754 engraving', nowLabel: '2014', text: 'In 1754 the Fort stood almost on the surf, with ships riding at anchor offshore. Land reclaimed for the harbour and the Marina later pushed the sea further away.' },
  moore: { then: 'moore_1905', now: 'moore_today', title: 'Moore Market', thenLabel: 'c. 1905', nowLabel: 'Today', text: 'The red-brick market of 1900 burned down in 1985. Its site is now the Moore Market Complex, the suburban railway terminal next to Central.' },
  central1925: { then: 'central_1925', now: 'central_facade', title: 'Central, 1925', thenLabel: 'c. 1925', nowLabel: '2021', text: 'A century apart, almost the same building — the clock tower, the spired towers and the long arcaded front.' },
  central: { then: 'central_1880', now: 'central_facade', title: 'Chennai Central', thenLabel: 'c. 1880', nowLabel: '2021', text: 'The 1880 photograph predates the tall clock tower; the station grew through extensions over the following decades.' },
  victoria: { then: 'victoria_old', now: 'victoria_2009', title: 'Victoria Public Hall', thenLabel: 'Early photograph', nowLabel: '2009', text: 'The KITLV photograph (date not recorded) shows the hall in its early setting.' },
};

/** the walk-in scenes, for the "Step inside" picker */
export const INTERIORS = [
  { id: 'temple', place: 'kandhakottam', title: 'Kandha Kottam at dusk', ta: 'அந்தியில் கந்த கோட்டம்', text: 'Walk through the rajagopuram into a Dravidian temple courtyard — lamp pillar, gilded flagstaff, Murugan’s peacock, the pillared mandapam and the sanctum tower.', kolam: 'margazhi-9', hue: '#d07a1f' },
  { id: 'deepavali', place: 'home-deepavali', title: 'Deepavali before dawn', ta: 'தீபாவளி அதிகாலை', text: 'A George Town puja room at 4:30 am — the brass kuthuvilakku, agal lamps, sweets, new silks and the Ganga snanam oil bath, with crackers outside.', kolam: 'deepa', hue: '#b8336a' },
  { id: 'pongal', place: 'home-pongal', title: 'The courtyard on Thai Pongal', ta: 'முற்றத்தில் பொங்கல்', text: 'A pot boiling over on a wood fire in an open courtyard, sugarcane and a banana-leaf feast — and the cattle shed, decorated for Mattu Pongal.', kolam: 'pongal-pot', hue: '#c9a24a' },
  { id: 'kolam', place: 'home-kolam', title: 'A morning at the vaasal', ta: 'வாசல் கோலம்', text: 'The thinnai verandah at sunrise. Watch a kolam being drawn, line by line, on the freshly washed threshold.', kolam: 'sikku-5-diamond', hue: '#3f8c7d' },
];

/**
 * Media registry. Every archive item is a real, openly licensed file on Wikimedia Commons,
 * verified through the Commons API (title, licence, author) while building this project.
 * They are delivered through Cloudinary fetch when a cloud is configured.
 */
const C = (file, author, license, date, extra = {}) => ({ src: { commons: file }, file, author, license, date, kind: 'image', ...extra });

export const MEDIA = {
  central_facade: C('Chennai Central Puratchi Thalaivar Dr. M.G. Ramachandran Central Railway Station.jpg', 'Thamizhpparithi Maari', 'CC BY-SA 4.0', '2021', { caption: 'The south facade on Poonamallee High Road, clock tower at the east end.' }),
  central_rain: C('Chennai Centra Railway Station in Rain.jpg', 'Sankar 1995', 'CC BY-SA 4.0', '2022', { caption: 'Central in the monsoon.' }),
  central_dawn: C('Madras Central at dawn.jpg', 'Starstuffseyyon', 'CC BY-SA 4.0', '', { caption: 'Madras Central at dawn.' }),
  central_2006: C('Chennai central.jpg', 'Peter Fristedt', 'CC BY-SA 2.0', '2006', { caption: 'Central, December 2006.' }),
  central_interior: C('Chennai Central interior.jpg', 'Planemad', 'CC BY-SA 2.5', '2007', { caption: 'Inside the concourse.' }),
  central_1880: C('Central Railway Station, Madras 1880.jpg', 'Nicholas and Company', 'Public domain', '1880', { caption: 'Central Railway Station, Madras — photographed c. 1880, before the present clock tower.' }),
  central_aerial: C('Chennai central aerial view 2.jpg', 'Saiphani02', 'CC BY-SA 4.0', '2025', { caption: 'From above: Victoria Public Hall (foreground), the platform sheds and Central behind.' }),
  central_night: C('Chennai central railway station night view.jpg', 'Sandhiya Rangasami', 'CC BY 4.0', '2025', { caption: 'Central lit up at night.' }),

  ripon_aerial: C('Ripon Building aerial view.jpg', 'Saiphani02', 'CC BY-SA 4.0', '2025', { caption: 'Ripon Building from the air: the clock tower, entrance portico and the lawns in front.' }),
  ripon_gcc: C('Greater Chennai Corporation Ripon Buildings Chennai India.jpg', 'N. Vivekananthamoorthy', 'CC BY-SA 4.0', '2023', { caption: 'Home of the Greater Chennai Corporation.' }),
  ripon_cc0: C('Ripon building chennai.jpg', 'Dreamora96x', 'CC0', '2025', { caption: 'The white facade and clock tower.' }),
  ripon_cannon: C('Cannon-1-Ripon Building-chennai-India.jpg', 'Yercaud-elango', 'CC BY 4.0', '2026', { caption: 'One of the old cannons displayed in front of Ripon Building.' }),

  victoria_ripon: C('Victoria Hall and Rippon Building.jpg', 'Sameer.udt', 'CC BY-SA 3.0', '2011', { caption: 'Victoria Public Hall with Ripon Building beside it.' }),
  victoria_2009: C('Victoria hall in Chennai.jpg', 'Sudhamshu', 'CC BY 2.0', '2009', { caption: 'Victoria Public Hall, 2009.' }),
  victoria_old: C('KITLV A1430 - Stadhuis Victoria Public Hall te Madras in India, KITLV 180115.tiff', 'Unknown photographer (KITLV collection)', 'Public domain', 'date unknown', { caption: 'Victoria Public Hall in an early photograph from the KITLV collection (date not recorded).' }),

  srhq_1: C('Southern Railway Headquarters Chennai 01.jpg', 'RealinRear', 'CC BY-SA 4.0', '2022', { caption: 'Southern Railway Headquarters, Park Town.' }),
  srhq_2: C('Southern Railway HQ.jpg', 'spnjsp (Flickr)', 'CC BY 2.0', '2009', { caption: 'The red-brick headquarters building.' }),

  kolam_pongal: C("'Pongal Kolam'.jpg", 'Thamizhpparithi Maari', 'CC BY-SA 4.0', '', { caption: 'A coloured kolam for Pongal.' }),
  kolam_2019: C('2019 kolam decoration for Pongal festival, South India.jpg', 'Jason Chung', 'CC BY 2.0', '2019', { caption: 'Kolam decoration for Pongal.' }),
  kolam_chalk: C('01Kolam (or sandpainting or chalk art).jpg', 'McKay Savage', 'CC BY 2.0', '', { caption: 'A threshold kolam.' }),
  kolam_powder: C('A brick powder for ornamental lines (Kolam) making.JPG', 'Thamizhpparithi Maari', 'CC BY-SA 3.0', '', { caption: 'Brick powder used to colour the ornamental lines of a kolam.' }),
  kolam_nattarampalli: C('2011 kolam floor decorations for pongal festival, Nattarampalli.jpg', 'B Balaji', 'CC BY-SA 2.0', '2011', { caption: 'Pongal kolams on a village street, Nattarampalli.' }),
  kolam_light_video: { src: { commons: 'Light-Kolam.webm' }, file: 'Light-Kolam.webm', author: 'Thamizhpparithi Maari', license: 'CC BY-SA 4.0', date: '', kind: 'video', caption: 'A kolam drawn in light — short video.' },

  pongal_prep: C('Preparation of Pongal.jpg', 'Kamala Lakshminarayanan', 'CC BY-SA 2.0', '', { caption: 'Pongal boiling in a decorated pot.' }),
  pongal_cooking: C('Cooking of Pongal.jpg', 'VimhanoCasavi', 'CC BY-SA 4.0', '', { caption: 'Cooking pongal over a wood fire.' }),
  pongal_chennai: C('Chennai Pongal.JPG', 'Ashok.sandhiya', 'CC BY-SA 4.0', '', { caption: 'Pongal in Chennai.' }),
  pongal_home: C('Homepongal.JPG', 'Thiagupillai', 'CC BY-SA 3.0', '', { caption: 'Pongal at home.' }),
  mattu_pongal: C('Mattu pongal celebration.jpg', 'Priyadharshini Mohanraj', 'CC BY-SA 4.0', '', { caption: 'Mattu Pongal: cattle honoured with painted horns and garlands.' }),
  ven_pongal: C('Aesthetic Ven Pongal.jpg', 'Thamizhpparithi Maari', 'CC BY-SA 4.0', '', { caption: 'Ven pongal — the savoury everyday cousin of festival sakkarai pongal.' }),

  diwali_2008: C('Diwali in Chennai, India, -27 Oct. 2008 a.jpg', 'McKay Savage', 'CC BY 2.0', '2008', { caption: 'Deepavali in Chennai, 27 October 2008.' }),
  diwali_crackers: C('Diwali firecrackers in Chennai.jpg', 'McKay Savage', 'CC BY 2.0', '', { caption: 'Crackers on a Chennai street.' }),
  diwali_skyline: C('Fireworks Chennai Diwali skyline, Tamil Nadu India November 2010.jpg', 'soumyajit pramanick', 'CC BY-SA 2.0', '2010', { caption: 'Fireworks over the Chennai skyline, Deepavali 2010.' }),
  diwali_2013: C('Fireworks Diwali Chennai India November 2013 b.jpg', 'Sriram Jagannathan', 'CC BY 2.0', '2013', { caption: 'Deepavali fireworks, Chennai, 2013.' }),

  karthigai: C('Karthigai Deepam.jpg', 'SriniG', 'Public domain', '', { caption: 'Lamps lit for Karthigai Deepam.' }),
  agal: C('Agalvilaku.jpg', 'Begil90ml', 'CC BY-SA 4.0', '', { caption: 'Agal vilakku — the clay oil lamp.' }),
  karthigai_fest: C('Karthigai Deepam Festival.jpg', 'Gomathiram', 'CC BY-SA 4.0', '', { caption: 'Karthigai Deepam at home.' }),

  coffee_1: C('South Indian Filter Kaapi aka Coffee 01.jpg', 'Nizil Shah', 'CC BY-SA 4.0', '', { caption: 'Filter kaapi in a davara and tumbler.' }),
  coffee_2: C('South Indian Filter Kaapi aka Coffee 02.jpg', 'Nizil Shah', 'CC BY-SA 4.0', '', { caption: 'The pour that makes the froth.' }),
  coffee_filter: C('Disassembled South Indian coffee filter.jpg', 'Cheeni', 'CC BY-SA 3.0', '', { caption: 'The two-chambered filter, taken apart.' }),
  idli_madras: C('Idli Sambar Chutney in Madras.JPG', 'Ask27', 'CC BY-SA 3.0', '', { caption: 'Idli, sambar and chutney in Madras.' }),
  idli_vada: C('Idli and vada with chutney and sambar.jpg', 'Ranjithsiji', 'CC BY-SA 4.0', '', { caption: 'Idli and vada with chutney and sambar.' }),
  meals: C('Veg Full Meals in Tamil Nadu.JPG', 'KARTY JazZ', 'CC BY-SA 4.0', '', { caption: 'A full vegetarian meal on a banana leaf.' }),

  silk_weaving: C('Silk Sari Weaving at Kanchipuram, Tamil Nadu.jpg', 'McKay Savage', 'CC BY 2.0', '', { caption: 'Weaving a silk sari at Kanchipuram.' }),
  silk_loom: C('Complicated hand-loom for silk weaving, Kanchipuram, Tamil Nadu.jpg', 'McKay Savage', 'CC BY 2.0', '', { caption: 'A hand-loom set up for silk, Kanchipuram.' }),
  thanjavur: C('Thanjavur Painting.jpg', 'Dr. M. Muthukrishnan', 'CC BY-SA 3.0', '', { caption: 'A Thanjavur painting with gilded relief work.' }),
  thanjavur_nataraja: C('Natarajar Tanjore painting.jpg', 'Subha murugan', 'CC BY-SA 3.0', '', { caption: 'Nataraja in the Thanjavur style.' }),
  bronze_1: C('Panchaloha-Lost-wax casting-Swamimalai-WUS-03146.jpg', 'Rainer Halama', 'CC BY-SA 4.0', '', { caption: 'Lost-wax bronze casting at Swamimalai.' }),
  bronze_2: C('Panchaloha-Lost-wax casting-Swamimalai-WUS-03159.jpg', 'Rainer Halama', 'CC BY-SA 4.0', '', { caption: 'Swamimalai: a wax model before casting.' }),

  concert_1: C('MMS17-11-Concert-Bharat Sundar-L Ramakrishnan-Sri Parthasarathy Swami Sabha.jpg', 'VasuVR', 'CC BY 4.0', '2017', { caption: 'A December-season concert at Sri Parthasarathy Swami Sabha (2017).' }),
  concert_2: C('MMS17-21-Concert-Vijay Siva-Lalgudi Vijayalakshmi-NC Bharadwaj-S Krishna-Rasika Fine Arts.jpg', 'VasuVR', 'CC BY 4.0', '2017', { caption: 'A concert at Rasika Fine Arts during the 2017 season.' }),
  nadaswaram: C('A Nadaswaram Artist.JPG', 'Thamizhpparithi Maari', 'CC BY-SA 3.0', '', { caption: 'A nadaswaram artist — the double-reed instrument of temple and wedding music.' }),
  mridangam: C('Mridanga Kalari 1.jpg', 'Fotokannan', 'CC BY-SA 4.0', '', { caption: 'Mridangam, the principal percussion of Carnatic music.' }),
  bharatanatyam: C('Bharatanatyam - Shijith Nambiar - Parvathy Menon and Group (Chennai)-003.jpg', 'Ramesh Lalwani', 'CC BY 2.0', '', { caption: 'A Bharatanatyam performance in Chennai.' }),

  mylapore_mandapa: C('Chennai, Arulmigu Kapaleeswarar, mandapa 00.jpg', 'Sailko', 'CC BY 3.0', '', { caption: 'A mandapa of the Kapaleeshwarar temple, Mylapore.' }),
  mylapore_house: C('A Old House at Kapaleeshwarar Temple East Tank Street.jpg', 'Jaisakthivel unom', 'CC BY-SA 4.0', '', { caption: 'An old house on East Tank Street, Mylapore — thinnai, pillars and a tiled roof.' }),
};

export function commonsPage(m) { return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(m.file.replace(/ /g, '_'))}`; }
export function creditLine(m) {
  return `${m.author}${m.date ? ', ' + m.date : ''} · ${m.license} · <a href="${commonsPage(m)}" target="_blank" rel="noopener">Wikimedia Commons</a>`;
}

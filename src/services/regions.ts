// Listening regions: home rails + mood lines per country.
//
// India (IN) is the default and keeps the original Indian curation.
// Other regions get localized query sets; everything still resolves
// through the same search-backed rails.

export interface RegionRail {
  title: string;
  query: string;
}

export interface RegionMood {
  text: string;
  query: string;
}

export interface RegionDef {
  code: string;
  name: string;
  rails: RegionRail[];
  moods: Record<'morning' | 'afternoon' | 'evening' | 'night', RegionMood[]>;
}

const IN_MOODS: RegionDef['moods'] = {
  morning: [
    { text: 'Morning songs?', query: 'morning hindi songs' },
    { text: 'Chai aur gaane?', query: 'fresh morning hindi songs' },
    { text: 'Fresh start vibes?', query: 'peaceful morning songs hindi' },
    { text: 'Wake up singing?', query: 'upbeat morning hindi songs' },
  ],
  afternoon: [
    { text: 'Afternoon beats?', query: 'hindi peppy songs' },
    { text: 'Lunch break tunes?', query: 'feel good hindi songs' },
    { text: 'Midday energy?', query: 'energetic hindi songs' },
    { text: 'Sunny day songs?', query: 'happy hindi songs' },
  ],
  evening: [
    { text: 'Evening melodies?', query: 'evening hindi songs' },
    { text: 'Sunset songs?', query: 'romantic sunset hindi songs' },
    { text: 'Golden hour hits?', query: 'soulful hindi songs' },
    { text: 'Unwind o’clock?', query: 'relaxing hindi songs' },
  ],
  night: [
    { text: 'Late night vibes?', query: 'late night hindi songs' },
    { text: '2 AM loops?', query: 'lofi hindi songs' },
    { text: 'Midnight melodies?', query: 'sad romantic hindi songs' },
    { text: 'Dreams in music?', query: 'soft night hindi songs' },
  ],
};

function intlMoods(flavor: string): RegionDef['moods'] {
  const m = (text: string, query: string): RegionMood => ({ text, query });
  return {
    morning: [
      m('Morning songs?', `morning ${flavor} songs`),
      m('Coffee and tunes?', `fresh morning ${flavor} songs`),
      m('Fresh start vibes?', `peaceful morning ${flavor} songs`),
      m('Wake up singing?', `upbeat morning ${flavor} songs`),
    ],
    afternoon: [
      m('Afternoon beats?', `${flavor} peppy songs`),
      m('Lunch break tunes?', `feel good ${flavor} songs`),
      m('Midday energy?', `energetic ${flavor} songs`),
      m('Sunny day songs?', `happy ${flavor} songs`),
    ],
    evening: [
      m('Evening melodies?', `evening ${flavor} songs`),
      m('Sunset songs?', `romantic sunset ${flavor} songs`),
      m('Golden hour hits?', `soulful ${flavor} songs`),
      m('Unwind o’clock?', `relaxing ${flavor} songs`),
    ],
    night: [
      m('Late night vibes?', `late night ${flavor} songs`),
      m('2 AM loops?', `lofi ${flavor} songs`),
      m('Midnight melodies?', `sad romantic ${flavor} songs`),
      m('Dreams in music?', `soft night ${flavor} songs`),
    ],
  };
}

/** Best-effort country code from a BCP-47 locale ("en-IN" -> "IN"). */
export function regionFromLocale(locale: string): string {
  const country = (locale.split(/[-_]/)[1] || '').toUpperCase();
  return REGIONS.some(r => r.code === country) ? country : 'IN';
}

export const REGIONS: RegionDef[] = [
  {
    code: 'IN',
    name: 'India',
    rails: [
      { title: 'Trending Hindi Hits', query: 'trending hindi songs 2024' },
      { title: 'Sad Songs', query: 'sad hindi songs' },
      { title: 'Happy Vibes', query: 'happy hindi songs' },
      { title: 'Punjabi Party', query: 'punjabi party songs' },
      { title: 'Romantic Hits', query: 'romantic hindi songs' },
      { title: '90s Bollywood Gold', query: '90s hindi hit songs' },
      { title: 'Tamil Hits', query: 'tamil hit songs' },
      { title: 'Telugu Hits', query: 'telugu hit songs' },
    ],
    moods: IN_MOODS,
  },
  {
    code: 'US',
    name: 'United States',
    rails: [
      { title: 'Trending Now', query: 'trending pop songs 2024' },
      { title: 'Hip-Hop Hits', query: 'top hip hop songs' },
      { title: 'Mood: Sad', query: 'sad pop songs' },
      { title: 'Feel-Good Pop', query: 'happy pop songs' },
      { title: 'R&B Slow Jams', query: 'rnb slow jams' },
      { title: 'Country Roads', query: 'top country songs' },
      { title: 'Throwbacks', query: '2000s hit songs' },
      { title: 'Party Starters', query: 'party pop songs' },
    ],
    moods: intlMoods('pop'),
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    rails: [
      { title: 'UK Chart Hits', query: 'uk top 40 songs' },
      { title: 'British Pop', query: 'british pop songs' },
      { title: 'Sad Songs', query: 'sad english songs' },
      { title: 'Happy Vibes', query: 'happy english songs' },
      { title: 'Indie Essentials', query: 'indie british songs' },
      { title: 'Grime & UK Rap', query: 'uk grime songs' },
      { title: '90s Classics', query: '90s britpop songs' },
      { title: 'Chill Evenings', query: 'chill english songs' },
    ],
    moods: intlMoods('english'),
  },
  {
    code: 'PK',
    name: 'Pakistan',
    rails: [
      { title: 'Trending Pakistani Hits', query: 'trending pakistani songs' },
      { title: 'Coke Studio Gems', query: 'coke studio pakistan songs' },
      { title: 'Sad Songs', query: 'sad urdu songs' },
      { title: 'Punjabi Party', query: 'pakistani punjabi songs' },
      { title: 'Romantic Hits', query: 'romantic urdu songs' },
      { title: 'Sufi Nights', query: 'sufi songs pakistan' },
      { title: '90s Classics', query: '90s pakistani songs' },
      { title: 'Pop Hits', query: 'pakistani pop songs' },
    ],
    moods: intlMoods('urdu'),
  },
  {
    code: 'BD',
    name: 'Bangladesh',
    rails: [
      { title: 'Trending Bangla Hits', query: 'trending bengali songs' },
      { title: 'Sad Songs', query: 'sad bengali songs' },
      { title: 'Romantic Hits', query: 'romantic bengali songs' },
      { title: 'Dhallywood Hits', query: 'dhallywood movie songs' },
      { title: 'Band Music', query: 'bangladeshi band songs' },
      { title: 'Folk & Baul', query: 'bengali folk baul songs' },
      { title: '90s Classics', query: '90s bengali songs' },
      { title: 'Happy Vibes', query: 'happy bengali songs' },
    ],
    moods: intlMoods('bengali'),
  },
  {
    code: 'NP',
    name: 'Nepal',
    rails: [
      { title: 'Trending Nepali Hits', query: 'trending nepali songs' },
      { title: 'Sad Songs', query: 'sad nepali songs' },
      { title: 'Romantic Hits', query: 'romantic nepali songs' },
      { title: 'Lok Dohori', query: 'nepali lok dohori songs' },
      { title: 'Pop Hits', query: 'nepali pop songs' },
      { title: 'Rock Anthems', query: 'nepali rock songs' },
      { title: '90s Classics', query: '90s nepali songs' },
      { title: 'Chill Vibes', query: 'chill nepali songs' },
    ],
    moods: intlMoods('nepali'),
  },
  {
    code: 'LK',
    name: 'Sri Lanka',
    rails: [
      { title: 'Trending Sinhala Hits', query: 'trending sinhala songs' },
      { title: 'Sad Songs', query: 'sad sinhala songs' },
      { title: 'Romantic Hits', query: 'romantic sinhala songs' },
      { title: 'Baila Party', query: 'sri lanka baila songs' },
      { title: 'Pop Hits', query: 'sinhala pop songs' },
      { title: 'Tamil Hits', query: 'tamil hit songs' },
      { title: 'Old Classics', query: 'old sinhala songs' },
      { title: 'Happy Vibes', query: 'happy sinhala songs' },
    ],
    moods: intlMoods('sinhala'),
  },
  {
    code: 'AE',
    name: 'UAE',
    rails: [
      { title: 'Trending Arabic Hits', query: 'trending arabic songs' },
      { title: 'Khaleeji Vibes', query: 'khaleeji songs' },
      { title: 'Bollywood in Dubai', query: 'hindi party songs' },
      { title: 'Romantic Hits', query: 'romantic arabic songs' },
      { title: 'Pop International', query: 'trending pop songs' },
      { title: 'Chill Evenings', query: 'chill arabic songs' },
      { title: 'Party Starters', query: 'arabic party songs' },
      { title: 'Sad Songs', query: 'sad arabic songs' },
    ],
    moods: intlMoods('arabic'),
  },
  {
    code: 'CA',
    name: 'Canada',
    rails: [
      { title: 'Trending Now', query: 'trending pop songs 2024' },
      { title: 'Punjabi Hits', query: 'punjabi songs canada' },
      { title: 'Hip-Hop Hits', query: 'top hip hop songs' },
      { title: 'Sad Songs', query: 'sad pop songs' },
      { title: 'Feel-Good Pop', query: 'happy pop songs' },
      { title: 'Indie Essentials', query: 'canadian indie songs' },
      { title: 'Throwbacks', query: '2000s hit songs' },
      { title: 'Chill Evenings', query: 'chill pop songs' },
    ],
    moods: intlMoods('pop'),
  },
  {
    code: 'AU',
    name: 'Australia',
    rails: [
      { title: 'Trending Now', query: 'trending pop songs australia' },
      { title: 'Aussie Hits', query: 'australian songs' },
      { title: 'Sad Songs', query: 'sad pop songs' },
      { title: 'Happy Vibes', query: 'happy pop songs' },
      { title: 'Indie Essentials', query: 'australian indie songs' },
      { title: 'Rock Classics', query: 'australian rock songs' },
      { title: 'Party Starters', query: 'party pop songs' },
      { title: 'Chill Evenings', query: 'chill pop songs' },
    ],
    moods: intlMoods('pop'),
  },
];

export const DEFAULT_REGION = 'IN';

export function regionDef(code: string | null | undefined): RegionDef {
  return REGIONS.find(r => r.code === code) || REGIONS[0];
}

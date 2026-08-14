/**
 * The eight genre options. `Auto` lets the text model choose the best fit.
 * Values must stay in sync with the server-side allowlist in handler.py.
 */
export const GENRES = [
  { value: 'Auto', label: 'Auto', hint: 'Let REELFORGE decide' },
  { value: 'Comedy', label: 'Comedy', hint: 'Warm, fast, absurd' },
  { value: 'Drama', label: 'Drama', hint: 'Quiet and heavy' },
  { value: 'Thriller', label: 'Thriller', hint: 'Tense, ticking clock' },
  { value: 'Horror', label: 'Horror', hint: 'Something is wrong' },
  { value: 'Romance', label: 'Romance', hint: 'Longing and timing' },
  { value: 'Sci-Fi', label: 'Sci-Fi', hint: 'Futures and machines' },
  { value: 'Fantasy', label: 'Fantasy', hint: 'Myth and wonder' },
];

/** Starter memories for the studio, so a blank page never stalls a visitor. */
export const EXAMPLE_MEMORIES = [
  {
    label: 'The missed train',
    text: 'Four college friends missed their train to Goa after their final semester. They had almost no money, but they decided to travel anyway, and somehow the trip became unforgettable.',
  },
  {
    label: 'The power cut',
    text: 'The power went out across our whole neighbourhood for three days one summer. Everyone ended up on the rooftops at night, and strangers who had lived next door for years finally started talking to each other.',
  },
  {
    label: 'The last shift',
    text: 'On my last night working at a 24-hour diner, one customer stayed until sunrise telling me about a life he never got around to living. I never saw him again.',
  },
];

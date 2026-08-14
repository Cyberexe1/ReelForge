/**
 * Offline fixture used while no VITE_API_URL is configured.
 * Shape must match the 200 response documented in docs/03-ARCHITECTURE.md §5.
 *
 * posterUrl is null on purpose: it exercises the degraded-poster path
 * (image generation failed, story still renders) until S3 is wired up in Phase 2.
 */
export const SAMPLE_MOVIE = {
  movieId: 'sample01',
  title: 'THE TRAIN WE MISSED',
  genre: 'Coming-of-Age / Comedy',
  tagline: 'Sometimes the wrong train takes you to the right story.',
  characters: [
    { name: 'Aarav', description: 'The planner who always has a backup plan, and never needs it.' },
    { name: 'Rohan', description: 'The impulsive one responsible for most of the disasters.' },
    { name: 'Kabir', description: 'The relaxed one who believes everything will somehow work out.' },
    { name: 'Neha', description: 'The practical friend quietly keeping everyone alive.' },
  ],
  synopsis:
    'Four friends finish their final semester with one plan: a cheap, badly organised trip to Goa that they have been promising each other for three years. They miss the train by ninety seconds.\n\nWith almost no money and no way to explain the situation to their families, they decide to go anyway. What follows is a week of borrowed rides, questionable decisions, and a series of strangers who each hand them a small piece of the trip they were never supposed to have.\n\nBy the time they reach the coast, the destination has stopped mattering. What they are really running out of is time together, and all four of them know it.',
  trailer: [
    {
      scene_title: 'THE DEPARTURE',
      description:
        'Four friends sprint through a crowded station, bags swinging, absolutely certain they will make it.',
      narration: 'They had one plan. They had been building it for three years.',
      dialogue: '"Relax. Trains never leave on time."',
    },
    {
      scene_title: 'THE MISSED TRAIN',
      description:
        'The last carriage slides away down the platform. Four faces, completely still, watching it go.',
      narration: 'It left on time.',
      dialogue: '"...So what happens now?"',
    },
    {
      scene_title: 'THE DECISION',
      description:
        'A pooled pile of cash on a station bench. Not nearly enough. Somebody starts laughing.',
      narration: 'They had eleven hundred rupees and nine hundred kilometres.',
      dialogue: '"We go anyway."',
    },
    {
      scene_title: 'THE ADVENTURE',
      description:
        'Truck beds, wrong turns, a wedding they were not invited to, and a beach at three in the morning.',
      narration: 'Nothing about the trip went according to plan.',
      dialogue: '"Whatever happens, we never tell anyone about the goat."',
    },
    {
      scene_title: 'THE RETURN',
      description:
        'The same platform, weeks later. Four friends, four different directions, one last look back.',
      narration: 'They caught every train after that one. None of them mattered.',
      dialogue: '"Same time next year?"',
    },
  ],
  posterUrl: null,
  posterPrompt:
    'Cinematic movie poster artwork: four young Indian college friends with backpacks standing on an empty railway platform at sunset, warm golden light, emotional coming-of-age atmosphere, realistic photography, dramatic wide composition.',
};

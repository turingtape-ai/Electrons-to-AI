export interface Part {
  id: string;
  numeral: string;
  title: string;
  blurb: string;
}

export const parts = [
  {
    id: 'signals',
    numeral: 'I',
    title: 'Signals',
    blurb: 'How a single yes crosses a country, and how yes-and-no becomes an alphabet.',
  },
  {
    id: 'logic',
    numeral: 'II',
    title: 'Logic',
    blurb: 'Switches that decide, switches that add, switches that remember.',
  },
  {
    id: 'shrinking',
    numeral: 'III',
    title: 'Shrinking',
    blurb: 'From glowing glass tubes to billions of switches on a chip the size of a fingernail.',
  },
  {
    id: 'software',
    numeral: 'IV',
    title: 'Software',
    blurb: 'Instructions as numbers, languages for people, and machines talking to machines.',
  },
  {
    id: 'parallel',
    numeral: 'V',
    title: 'Parallel',
    blurb: 'Why drawing pictures fast turned out to be the shape of thinking fast.',
  },
  {
    id: 'learning',
    numeral: 'VI',
    title: 'Learning',
    blurb: 'A machine that is wrong, is told how wrong, and nudges its own numbers.',
  },
  {
    id: 'language',
    numeral: 'VII',
    title: 'Language',
    blurb: 'Words as points in space, sentences as paths, and paying attention.',
  },
  {
    id: 'transformers',
    numeral: 'VIII',
    title: 'Transformers',
    blurb: 'Stacking attention, scaling it up, and teaching the result to be useful.',
  },
  {
    id: 'next',
    numeral: 'IX',
    title: "What's Next",
    blurb: 'What is plausible, what is noise, and what nobody knows yet.',
  },
] as const satisfies readonly Part[];

export type PartId = (typeof parts)[number]['id'];

export const partIds = parts.map((p) => p.id) as [PartId, ...PartId[]];

export function getPart(id: PartId): Part {
  const part = parts.find((p) => p.id === id);
  if (!part) throw new Error(`Unknown part: ${id}`);
  return part;
}

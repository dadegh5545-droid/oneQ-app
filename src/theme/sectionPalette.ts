// Section colours (BRIEF v2 §8, ENG-REVIEW v2 §5). Each key is written by hand, not derived, for accurate
// contrast in Arabic and English: `accent` on the cream background, `accentSoft` for tinted backgrounds,
// `accentInk` for text and icons on `accentSoft`. Sections store only the key (Section.colorKey), never hex.
export type SectionAccent = { accent: string; accentSoft: string; accentInk: string };

export const sectionPalette = {
  burgundy: { accent: '#5A0020', accentSoft: '#F3E6E6', accentInk: '#5A0020' },
  navy: { accent: '#1F4E79', accentSoft: '#E5EDF5', accentInk: '#173B5C' },
  teal: { accent: '#2F6B67', accentSoft: '#E3EFED', accentInk: '#22504D' },
  rose: { accent: '#A34A6B', accentSoft: '#F6E8EE', accentInk: '#7C3651' },
  // TEMP — pending designer
  olive: { accent: '#5E6B2E', accentSoft: '#EDEFE1', accentInk: '#474F22' },
  // TEMP — pending designer
  ochre: { accent: '#9C6A1C', accentSoft: '#F5ECDD', accentInk: '#6E4B14' },
  // TEMP — pending designer
  plum: { accent: '#5E3B6E', accentSoft: '#EFE7F2', accentInk: '#462C52' },
  // TEMP — pending designer
  slate: { accent: '#46586A', accentSoft: '#E7EBEF', accentInk: '#33414E' },
  // TEMP — pending designer
  terracotta: { accent: '#A4512F', accentSoft: '#F6E8E1', accentInk: '#7A3C23' },
  // TEMP — pending designer
  sage: { accent: '#56735A', accentSoft: '#E8EFE7', accentInk: '#3F5642' },
} as const satisfies Record<string, SectionAccent>;

export type SectionColorKey = keyof typeof sectionPalette;

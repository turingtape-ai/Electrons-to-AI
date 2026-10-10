import { getCollection, type CollectionEntry } from 'astro:content';
import { getPart, parts, type PartId } from '../data/parts';

export type Chapter = CollectionEntry<'chapters'>;

/** All chapters in reading order. */
export async function getChapters(): Promise<Chapter[]> {
  const entries = await getCollection('chapters');
  return entries.sort((a, b) => a.data.order - b.data.order);
}

export interface PartGroup {
  id: PartId;
  numeral: string;
  title: string;
  blurb: string;
  chapters: Chapter[];
}

/** Chapters grouped under their Parts, both in order. */
export async function getPartGroups(): Promise<PartGroup[]> {
  const chapters = await getChapters();
  return parts.map((part) => ({
    ...part,
    chapters: chapters.filter((c) => c.data.part === part.id),
  }));
}

export function chapterHref(chapter: Chapter): string {
  return withBase(`/chapters/${chapter.id}/`);
}

export function chapterLabel(chapter: Chapter): string {
  const part = getPart(chapter.data.part);
  return `Part ${part.numeral} · Chapter ${chapter.data.order}`;
}

/** Join a site-relative path onto the configured base path. */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  return `${base}/${path.replace(/^\/+/, '')}`;
}

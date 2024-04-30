import type { GetImageResult } from "astro";
import type { CollectionEntry, CollectionKey } from "astro:content";

export interface UiCollectionEntry<T extends CollectionKey> {
  collectionEntry: CollectionEntry<T>;
  rendered: Awaited<ReturnType<CollectionEntry<T>["render"]>>;
  coverImage: {
    webp: GetImageResult;
    avif: GetImageResult;
    original: NonNullable<CollectionEntry<T>["data"]["coverImage"]>;
  } | null;
}

export interface Tag {
  tag: string;
  slug: string;
  pretty: string;
}

export type MaybePromise<T> = Promise<T> | T;

export interface FrontmatterImage {
  image: string;
  file: string;
}

export type Session = import("@auth/core/types").Session;

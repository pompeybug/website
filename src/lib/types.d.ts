import type { CollectionEntry, CollectionKey } from "astro:content";

export interface UiCollectionEntry<T extends CollectionKey> {
    collectionEntry: CollectionEntry<T>,
    rendered: Awaited<ReturnType<CollectionEntry<T>['render']>>
}
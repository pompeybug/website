import { computed, map } from "nanostores";
import type { Session } from "@lib/types";

// This store only persists for the current page, it will not persist when the user loads a new page.
// Regardless, this is still useful if the webpage needs to check the session multiple times.
// This is because it means only one request in the NavMenu.astro component is needed (this component is always loaded).
// Components within the rest of the page can setup a listener to these stores and update the page accordingly (see Article.astro).

// nanostores doesn't allow null values for maps, empty object is the next best option
export const $session = map<Session | {}>();

export const $sessionIsValid = computed($session, (session) => {
  return Object.values(session).length !== 0;
});

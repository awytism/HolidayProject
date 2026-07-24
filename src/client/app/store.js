import { clone } from "../utils/html.js";

export function createStore() {
  const state = {
    document: null,
    draft: null,
    revision: 0,
    editing: false,
    activeSection: "transport",
    legacyMigration: false,
  };

  return {
    getState: () => state,
    getDocument: () => state.editing ? state.draft : state.document,
    load(document, revision, legacyMigration = false) {
      state.document = document;
      state.revision = revision;
      state.legacyMigration = legacyMigration;
    },
    setActive(section) {
      state.activeSection = section;
    },
    beginEdit() {
      state.draft = clone(state.document);
      state.editing = true;
    },
    cancelEdit() {
      state.draft = null;
      state.editing = false;
    },
    mutate(operation) {
      if (!state.editing) throw new Error("An edit session is not active");
      operation(state.draft);
      delete state.draft.meta.placeholderMode;
    },
    commit(document, revision) {
      state.document = document;
      state.revision = revision;
      state.draft = null;
      state.editing = false;
      state.legacyMigration = false;
    },
  };
}

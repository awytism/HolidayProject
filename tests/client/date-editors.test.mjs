import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { agendaConfig } from "../../src/client/sections/agenda.js";
import { stayConfig } from "../../src/client/sections/stay.js";
import { transportConfig } from "../../src/client/sections/transport.js";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";

test("uses calendar inputs for every structured trip date and derives view labels", async () => {
  const document = createDefaultDocument();
  const transport = document.sections.transport[0];
  const stay = document.sections.stay.find((block) => block.type === "stay-summary");
  const agenda = document.sections.agenda.find((block) => block.type === "day");
  const shell = await readFile("public/index.html", "utf8");

  assert.equal((shell.match(/data-meta-date=/g) ?? []).length, 2);
  assert.match(transportConfig.render(transport, true), /type="date" value="2026-10-24"/);
  assert.match(transportConfig.render(transport, false), /Saturday, Oct 24/);
  assert.equal((stayConfig.render(stay, true).match(/type="date"/g) ?? []).length, 2);
  assert.match(stayConfig.render(stay, false), /Saturday, Oct 24/);
  assert.match(stayConfig.render(stay, false), /Sunday, Nov 1/);

  const agendaEditor = agendaConfig.render(agenda, true);
  assert.equal((agendaEditor.match(/type="date"/g) ?? []).length, 1);
  assert.doesNotMatch(agendaEditor, />Month</);
  assert.doesNotMatch(agendaEditor, />Weekday</);
  assert.match(agendaConfig.render(agenda, false), /<span>Oct<\/span><strong>24<\/strong>/);
  assert.match(agendaConfig.render(agenda, false), /<small>Saturday<\/small>/);
});

test("calendar controls inherit theme color-scheme and palette tokens", async () => {
  const [tokens, layout, editor] = await Promise.all([
    readFile("src/client/styles/tokens.css", "utf8"),
    readFile("src/client/styles/layout.css", "utf8"),
    readFile("src/client/styles/editor.css", "utf8"),
  ]);
  assert.match(tokens, /\[data-theme="dark"\][^{]+\{[^}]+color-scheme:\s*dark/);
  assert.match(layout, /\.hero-date-editor input[^}]+var\(--surface-soft\)[^}]+var\(--text\)/);
  assert.match(editor, /input\[type="date"\][^}]+accent-color:\s*var\(--primary\)/);
});

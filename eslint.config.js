const browserGlobals = {
  document: "readonly",
  window: "readonly",
  localStorage: "readonly",
  location: "readonly",
  history: "readonly",
  navigator: "readonly",
  crypto: "readonly",
  CustomEvent: "readonly",
  Event: "readonly",
  URL: "readonly",
  HTMLInputElement: "readonly",
  IntersectionObserver: "readonly",
  ResizeObserver: "readonly",
  WebSocket: "readonly",
  Buffer: "readonly",
  console: "readonly",
  fetch: "readonly",
  FormData: "readonly",
  process: "readonly",
  structuredClone: "readonly",
};

export default [
  {
    ignores: ["node_modules/**", "data/**"],
  },
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: browserGlobals,
    },
    rules: {
      complexity: ["error", 10],
      "max-depth": ["error", 3],
      "max-lines": ["error", { max: 600, skipBlankLines: true, skipComments: true }],
      "max-params": ["error", 5],
      "no-constant-condition": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
      "no-undef": "error",
      "no-unreachable": "error",
    },
  },
  {
    files: ["tests/e2e/**/*.mjs"],
    rules: {
      "max-lines": ["error", { max: 700, skipBlankLines: true, skipComments: true }],
    },
  },
];

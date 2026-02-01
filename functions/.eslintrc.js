module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true,
  },

  // 👇 IMPORTANTE
  ignorePatterns: [
    ".eslintrc.js", // evita que ESLint se lintée a sí mismo
    "lib/**",       // salida compilada
  ],

  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json"],
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    "object-curly-spacing": "off",
    "require-jsdoc": "off",
    "@typescript-eslint/no-explicit-any": "off",
  },
};

import vueParser from "vue-eslint-parser";

export default [
  {
    files: ["src/**/*.{js,mjs,vue}"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "vue",
              importNames: ["reactive"],
              message: "Use ref() for Vue state.",
            },
          ],
        },
      ],
    },
  },
];
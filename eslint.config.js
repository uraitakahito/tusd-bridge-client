import tseslint from "typescript-eslint";

export default tseslint.config(
  ...tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.js", "rollup.config.js"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    files: ["eslint.config.js", "rollup.config.js"],
    ...tseslint.configs.disableTypeChecked,
  },

  {
    ignores: ["dist/", "docs/", "node_modules/", ".Trash-*/"],
  },
);

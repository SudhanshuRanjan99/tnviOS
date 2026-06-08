import nestConfig from "@tnvios/eslint-config/nest";

export default [
  ...nestConfig,
  {
    files: ["src/**/*.module.ts"],
    rules: {
      "@typescript-eslint/no-extraneous-class": "off",
    },
  },
];

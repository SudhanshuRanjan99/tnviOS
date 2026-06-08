import nodeConfig from "@tnvios/eslint-config/nest";

export default [
  ...nodeConfig,
  {
    ignores: ["Docs/**"],
  },
];

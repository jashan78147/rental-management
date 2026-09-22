import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Server components here read the current time to decide what is overdue,
    // due soon or still upcoming. Every route is `force-dynamic`, so there is no
    // cached render for that impurity to leak into, and a build-time timestamp
    // would be the actual bug.
    files: ["app/**/page.tsx", "components/shop/availability-strip.tsx"],
    rules: { "react-hooks/purity": "off" },
  },
  {
    // Reading localStorage has to happen after hydration, not during the first
    // render, or the server and client markup disagree. That is a setState in an
    // effect by construction. The same applies to re-syncing a form input when
    // the server sends down a new rental window.
    files: [
      "components/cart-provider.tsx",
      "components/site-header.tsx",
      "components/shop/window-picker.tsx",
      "app/cart/page.tsx",
    ],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
]);

export default eslintConfig;

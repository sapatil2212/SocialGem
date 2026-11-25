import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    // Routes reach data only through src/server/data.ts, which is tied to a user.
    files: ["src/app/api/**"],
    rules: {
      "no-restricted-imports": ["error", { paths: [
        { name: "@/lib/prisma", message: "Use dataFor(user.id) from @/server/data." },
        { name: "next-auth/next", message: "Use guard() from @/server/guard." },
        { name: "@prisma/client", message: "Use dataFor(user.id) from @/server/data." },
      ] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

// Frontend/react-router.config.ts
import type { Config } from "@react-router/dev/config";
import { INITIAL_PRODUCTS } from "./src/data/initialProducts";

export default {
  appDirectory: "src",
  ssr: false,
  async prerender() {
    return [
      "/",
      "/purchases",
      "/vendor",
      "/auth/verify",
      "/privacy-policy",
      "/terms-of-service",
      ...INITIAL_PRODUCTS.map((p) => `/product/${p.id}`),
    ];
  },
} satisfies Config;

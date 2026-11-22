// Frontend/src/routes.ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("product/:id", "routes/product.tsx"),
  route("purchases", "routes/purchases.tsx"),
  route("vendor", "routes/vendor.tsx"),
  route("admin", "routes/admin.tsx"),
  route("auth/verify", "routes/auth-verify.tsx"),
  route("privacy-policy", "routes/privacy-policy.tsx"),
  route("terms-of-service", "routes/terms-of-service.tsx"),
  route("s/:slug", "routes/storefront.tsx", { id: "standalone-storefront" }),
  route(":handle", "routes/storefront.tsx", { id: "embedded-storefront" }),
] satisfies RouteConfig;

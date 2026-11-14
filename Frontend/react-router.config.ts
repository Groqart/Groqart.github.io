// Frontend/react-router.config.ts
import type { Config } from "@react-router/dev/config";
import { INITIAL_PRODUCTS } from "./src/data/initialProducts";

export default {
  // Указываем директорию исходного кода
  appDirectory: "src",

  // Отключаем требование Node.js сервера на продакшене (нам нужна чистая статика для CDN)
  ssr: false,

  // Список всех страниц, которые сборщик сгенерирует в виде готового HTML
  async prerender() {
    return [
      "/",
      "/gateway",
      "/purchases",
      "/vendor",
      // Автоматически генерируем страницу под каждый товар из каталога:
      ...INITIAL_PRODUCTS.map((p) => `/product/${p.id}`),
    ];
  },
} satisfies Config;

import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/constants";

/**
 * PWA manifest, served by Next at /manifest.webmanifest.
 *
 * Deliberately no `screenshots` and no `shortcuts` pointing at authenticated
 * routes: those reveal app structure to anyone who fetches the manifest, and the
 * app is a private health tool.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — ${APP_TAGLINE}`,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#7c6bd9",
    categories: ["health", "lifestyle", "medical"],
    lang: "en",
    dir: "ltr",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}

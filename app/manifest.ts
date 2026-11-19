import type { MetadataRoute } from "next";

// Lets the phone add the app to the home screen and open it full screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ميزان",
    short_name: "ميزان",
    description: "مصروفك ودخلك والحساب المشترك، ببساطة على هاتفك.",
    start_url: "/",
    display: "standalone",
    dir: "rtl",
    lang: "ar",
    background_color: "#f3f1ec",
    theme_color: "#0d7a5f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}

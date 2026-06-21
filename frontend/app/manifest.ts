import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MediTrust AI",
    short_name: "MediTrust",
    description: "Privacy-first medical report assistant with Terminal3 Agent Auth.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
  }
}

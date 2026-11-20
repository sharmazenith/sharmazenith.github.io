// Fill from LinkedIn. Every field is optional: empty sections are not rendered.
export interface Role {
  title: string
  company: string
  period: string
  location?: string
  bullets?: string[]
}

export const resume = {
  summary: "",
  experience: [] as Role[],
  education: [] as { school: string; degree: string; period: string }[],
  skills: [] as { group: string; items: string[] }[],
  pdf: "", // e.g. "/Zenith-Sharma-Resume.pdf" once placed in public/
}

import { SPACE_NAME } from "../config"

// Placeholder content. Every TODO is to be replaced with real details.
// Do not publish employers, dates or tools that are not yours.
interface Job { when: string; title: string; bullets: string[]; company: string; city: string }
interface Project { name: string; year: string; description: string; href?: string }

export const about = `I'm a data engineer. I like pipelines that run quietly and numbers that mean what they say. Most days I'm modelling data and making sure the dashboard agrees with the database. The rest of me lives in ${SPACE_NAME}.`

export const work: Job = {
  when: "TODO — now",
  title: "TODO: current role",
  bullets: ["TODO: one line on what you own", "TODO: one line on a result"],
  company: "TODO: company",
  city: "TODO: city",
}

export const before: Job[] = [
  { when: "TODO", title: "TODO: previous role", bullets: ["TODO: one line"], company: "TODO: company", city: "TODO: city" },
  { when: "TODO", title: "TODO: earlier role", bullets: ["TODO: one line"], company: "TODO: company", city: "TODO: city" },
]

export const built: Project[] = [
  { name: "TODO: project name", year: "TODO", description: "TODO: one line on what it does" },
  { name: "TODO: project name", year: "TODO", description: "TODO: one line on what it does" },
]

export const tools: { label: string; items: string }[] = [
  { label: "Languages", items: "TODO" },
  { label: "Data", items: "TODO" },
  { label: "Cloud", items: "TODO" },
]

export const school: { when: string; title: string; where: string }[] = [
  { when: "TODO", title: "TODO: degree", where: "TODO: school" },
]

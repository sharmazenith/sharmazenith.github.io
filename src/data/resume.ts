import { SPACE_NAME } from "../config"

// Placeholder content. Every TODO is to be replaced with real details.
// Do not publish employers, dates or tools that are not yours.
interface Job { when: string; title: string; bullets: string[]; company: string; city: string }
interface Project { name: string; year: string; description: string; href?: string }

export const intro = [
  `Starting an introduction by saying I'm not entirely sure what to put here is probably an odd choice, though I suppose that's the point of a blog. It's a place for things that cross my mind, things I find interesting, things I'm trying to figure out, and the occasional thought that probably should have stayed in my head.`,
  `By day I'm a data engineer, and outside of that I spend plenty of time swimming, playing chess, listening to music, practicing harmonium, and writing the occasional shayari or song. It's a specific mix, I know. I like getting lost in things long enough to get reasonably good at them.`,
  `Along the way, I've picked up a fondness for Indian classical music and ghazals, a questionable tolerance for opening theory, and an ongoing relationship with butterfly. The stroke, not the insect, though the flailing is comparable. I'm also drawn to people who are a bit unconventional, have interesting things to say, and aren't constantly managing how they're perceived.`,
  `I don't know yet what this space will become. Probably a bit of everything: writing, observations, and things I've made or stumbled across. Hopefully there's something worth reading here, though that part is up to you.`,
  `Welcome. Let's see where it goes.`,
]

export const work: Job = {
  when: "TODO to now",
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

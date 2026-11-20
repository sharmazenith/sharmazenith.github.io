import QuietPortfolioTemplate from "./components/quiet-portfolio-template"

// Minimal launch content. Add roles, projects, essays and email here as they are approved.
export default function App() {
  return (
    <QuietPortfolioTemplate
      name="Zenith"
      fullName="Zenith Sharma"
      tagline="Data engineer. This site is a work in progress."
      location=""
      email=""
      status=""
      currentRole={null}
      previousRoles={[]}
      about="More coming soon."
      projects={[]}
      essays={[]}
      socials={[{ label: "GitHub", href: "https://github.com/sharmazenith" }]}
    />
  )
}

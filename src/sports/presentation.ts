// Presentation only: never mutate Atlas-linked source or persisted snapshots.
export function publicProject(project: any) {
  return { ...project, country: project?.country?.trim?.() === '-2' ? null : project?.country };
}

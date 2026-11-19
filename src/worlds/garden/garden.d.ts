export interface GardenOpts {
  name?: () => string
  soundOn?: () => boolean
  say?: (text: string) => void
  hush?: () => void
  startLevel?: number
  onFinish?: (r: { level: number; stars: number; next: number; stage: string; total: number }) => void
  onReady?: (r: { next: number; stage: string; total: number }) => void
}
export function mountGarden(root: HTMLElement, say: HTMLElement, opts: GardenOpts): () => void

// Минимальные типы рантайма артефактов claude.ai, которые использует приложение
interface ClaudeDocSnap { id: string; exists: boolean; data(): Record<string, unknown> | undefined; metadata: { fromCache: boolean; hasPendingWrites: boolean } }
interface ClaudeQuerySnap { docs: ClaudeDocSnap[]; empty: boolean; metadata: { fromCache: boolean; hasPendingWrites: boolean } }
interface ClaudeDocRef { set(data: Record<string, unknown>): Promise<void>; get(): Promise<ClaudeDocSnap> }
interface ClaudeCollectionRef {
  doc(id: string): ClaudeDocRef
  onSnapshot(next: (s: ClaudeQuerySnap) => void, error?: (e: { code: string; message: string }) => void): () => void
}
interface ClaudeDB { collection(path: string): ClaudeCollectionRef }
interface ClaudeUser { id(): Promise<string | null> }
interface Window {
  claude?: { use(name: 'db'): Promise<ClaudeDB | null>; use(name: 'user'): Promise<ClaudeUser | null>; use(name: string): Promise<unknown> }
}

// Biblioteca local: metadatos y archivos de audio guardados en IndexedDB.
// Todo se queda en el dispositivo; no se sube nada a ningún servidor.

export interface Track {
  id: string;
  title: string;
  artist: string;
  fileName: string;
  size: number;
  mime: string;
  addedAt: number;
}

export interface ImportResult {
  added: number;
  duplicates: number;
  ignored: number;
}

const DB_NAME = "reproductor-local";
const DB_VERSION = 1;
const TRACKS = "tracks";
const BLOBS = "blobs";

const AUDIO_EXT = /\.(mp3|m4a|aac|flac|ogg|oga|opus|wav|weba|webm)$/i;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore(TRACKS, { keyPath: "id" });
      db.createObjectStore(BLOBS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// crypto.randomUUID solo existe en contextos seguros (https / localhost);
// en desarrollo por red local (http://192.168.x.x) no, así que hay respaldo.
function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function isAudio(file: File): boolean {
  return file.type.startsWith("audio/") || AUDIO_EXT.test(file.name);
}

/** "Artista - Título.mp3" → { artist, title }. Sin guion, todo es el título. */
export function parseFileName(fileName: string): { title: string; artist: string } {
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const sep = base.indexOf(" - ");
  if (sep > 0 && sep < base.length - 3) {
    return { artist: base.slice(0, sep).trim(), title: base.slice(sep + 3).trim() };
  }
  return { artist: "Artista desconocido", title: base || fileName };
}

export async function getTracks(): Promise<Track[]> {
  const db = await openDb();
  const tracks = await request<Track[]>(db.transaction(TRACKS).objectStore(TRACKS).getAll());
  return tracks.sort(
    (a, b) =>
      a.artist.localeCompare(b.artist, "es", { sensitivity: "base" }) ||
      a.title.localeCompare(b.title, "es", { sensitivity: "base" }),
  );
}

export async function getBlob(id: string): Promise<Blob | undefined> {
  const db = await openDb();
  return request<Blob | undefined>(db.transaction(BLOBS).objectStore(BLOBS).get(id));
}

export async function importFiles(files: Iterable<File>): Promise<ImportResult> {
  const result: ImportResult = { added: 0, duplicates: 0, ignored: 0 };
  const existing = await getTracks();
  const seen = new Set(existing.map((t) => `${t.fileName}|${t.size}`));
  const db = await openDb();

  for (const file of files) {
    if (!isAudio(file)) {
      result.ignored++;
      continue;
    }
    const key = `${file.name}|${file.size}`;
    if (seen.has(key)) {
      result.duplicates++;
      continue;
    }
    seen.add(key);

    const { title, artist } = parseFileName(file.name);
    const track: Track = {
      id: newId(),
      title,
      artist,
      fileName: file.name,
      size: file.size,
      mime: file.type || "audio/mpeg",
      addedAt: Date.now(),
    };

    const tx = db.transaction([TRACKS, BLOBS], "readwrite");
    tx.objectStore(TRACKS).put(track);
    tx.objectStore(BLOBS).put(file, track.id);
    await transactionDone(tx);
    result.added++;
  }
  return result;
}

export async function removeTrack(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([TRACKS, BLOBS], "readwrite");
  tx.objectStore(TRACKS).delete(id);
  tx.objectStore(BLOBS).delete(id);
  await transactionDone(tx);
}

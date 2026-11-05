import { getBlob, type Track } from "./library";

export type RepeatMode = "off" | "all" | "one";

/**
 * Motor de reproducción. Eventos:
 *  - "track": cambió la pista actual
 *  - "state": cambió play/pausa, shuffle o repeat
 *  - "time":  avanzó el tiempo o cambió la duración
 *  - "error": no se pudo reproducir una pista (detail = mensaje)
 */
export class Player extends EventTarget {
  readonly audio = new Audio();
  queue: Track[] = [];
  index = -1;
  shuffle = false;
  repeat: RepeatMode = "off";

  private objectUrl: string | null = null;
  private loadToken = 0;

  constructor() {
    super();
    this.audio.preload = "auto";

    this.audio.addEventListener("play", () => this.emit("state"));
    this.audio.addEventListener("pause", () => this.emit("state"));
    this.audio.addEventListener("timeupdate", () => this.emit("time"));
    this.audio.addEventListener("durationchange", () => this.emit("time"));
    this.audio.addEventListener("ended", () => void this.handleEnded());

    this.setupMediaSession();
  }

  get current(): Track | null {
    return this.queue[this.index] ?? null;
  }

  get playing(): boolean {
    return !this.audio.paused && !this.audio.ended;
  }

  async playQueue(tracks: Track[], startIndex: number): Promise<void> {
    this.queue = [...tracks];
    await this.playIndex(startIndex);
  }

  async playIndex(i: number): Promise<void> {
    const track = this.queue[i];
    if (!track) return;
    const token = ++this.loadToken;
    this.index = i;
    this.emit("track");

    const blob = await getBlob(track.id);
    if (token !== this.loadToken) return; // el usuario ya eligió otra pista

    if (!blob) {
      this.emit("error", `No se encontró el archivo de «${track.title}».`);
      return;
    }

    this.releaseUrl();
    this.objectUrl = URL.createObjectURL(blob);
    this.audio.src = this.objectUrl;
    this.updateMediaSession();
    try {
      await this.audio.play();
    } catch (err) {
      if (token !== this.loadToken) return;
      const name = err instanceof DOMException ? err.name : "";
      if (name !== "AbortError") {
        this.emit("error", `No se pudo reproducir «${track.title}».`);
      }
    }
  }

  async toggle(): Promise<void> {
    if (!this.current) return;
    if (this.audio.paused) {
      try {
        await this.audio.play();
      } catch {
        this.emit("error", "No se pudo reanudar la reproducción.");
      }
    } else {
      this.audio.pause();
    }
  }

  async next(): Promise<void> {
    const n = this.queue.length;
    if (n === 0) return;
    if (this.shuffle && n > 1) {
      let i = this.index;
      while (i === this.index) i = Math.floor(Math.random() * n);
      await this.playIndex(i);
      return;
    }
    const nextIndex = this.index + 1;
    if (nextIndex < n) await this.playIndex(nextIndex);
    else if (this.repeat === "all") await this.playIndex(0);
  }

  async prev(): Promise<void> {
    if (this.queue.length === 0) return;
    if (this.audio.currentTime > 3 || this.index <= 0) {
      this.audio.currentTime = 0;
      return;
    }
    await this.playIndex(this.index - 1);
  }

  seek(seconds: number): void {
    if (Number.isFinite(seconds)) this.audio.currentTime = Math.max(0, seconds);
  }

  setVolume(v: number): void {
    this.audio.volume = Math.min(1, Math.max(0, v));
  }

  toggleShuffle(): void {
    this.shuffle = !this.shuffle;
    this.emit("state");
  }

  cycleRepeat(): void {
    this.repeat = this.repeat === "off" ? "all" : this.repeat === "all" ? "one" : "off";
    this.emit("state");
  }

  /** Quita una pista de la cola (p. ej. al borrarla de la biblioteca). */
  removeFromQueue(id: string): void {
    const pos = this.queue.findIndex((t) => t.id === id);
    if (pos === -1) return;
    const wasCurrent = pos === this.index;
    this.queue.splice(pos, 1);

    if (wasCurrent) {
      this.loadToken++;
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
      this.releaseUrl();
      this.index = -1;
      this.emit("track");
      this.emit("state");
      this.emit("time");
    } else if (pos < this.index) {
      this.index--;
    }
  }

  private async handleEnded(): Promise<void> {
    if (this.repeat === "one") {
      this.audio.currentTime = 0;
      await this.audio.play().catch(() => undefined);
      return;
    }
    const hasNext = this.shuffle ? this.queue.length > 1 : this.index + 1 < this.queue.length;
    if (hasNext || this.repeat === "all") await this.next();
    else this.emit("state");
  }

  private releaseUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  private emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  // Controles del sistema (pantalla de bloqueo, notificaciones, teclas multimedia).
  private setupMediaSession(): void {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (action: MediaSessionAction, handler: MediaSessionActionHandler) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        /* acción no soportada en este navegador */
      }
    };
    set("play", () => void this.toggle());
    set("pause", () => void this.toggle());
    set("previoustrack", () => void this.prev());
    set("nexttrack", () => void this.next());
    set("seekto", (d) => {
      if (d.seekTime !== undefined) this.seek(d.seekTime);
    });
  }

  private updateMediaSession(): void {
    if (!("mediaSession" in navigator)) return;
    const t = this.current;
    navigator.mediaSession.metadata = t
      ? new MediaMetadata({ title: t.title, artist: t.artist, album: "Reproductor Local" })
      : null;
  }
}

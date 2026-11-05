import "./style.css";
import { icons } from "./icons";
import { getTracks, importFiles, removeTrack, type Track } from "./library";
import { Player } from "./player";

function $<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Falta el elemento ${selector}`);
  return el;
}

const els = {
  file: $<HTMLInputElement>("#file"),
  add: $<HTMLButtonElement>("#btn-add"),
  search: $<HTMLInputElement>("#search"),
  list: $<HTMLUListElement>("#list"),
  empty: $<HTMLDivElement>("#empty"),
  count: $<HTMLParagraphElement>("#count"),
  cover: $<HTMLDivElement>("#cover"),
  title: $<HTMLHeadingElement>("#title"),
  artist: $<HTMLParagraphElement>("#artist"),
  seek: $<HTMLInputElement>("#seek"),
  cur: $<HTMLSpanElement>("#cur"),
  dur: $<HTMLSpanElement>("#dur"),
  play: $<HTMLButtonElement>("#btn-play"),
  prev: $<HTMLButtonElement>("#btn-prev"),
  next: $<HTMLButtonElement>("#btn-next"),
  shuffle: $<HTMLButtonElement>("#btn-shuffle"),
  repeat: $<HTMLButtonElement>("#btn-repeat"),
  volume: $<HTMLInputElement>("#volume"),
  toast: $<HTMLDivElement>("#toast"),
};

const player = new Player();
let tracks: Track[] = [];
let filter = "";
let seeking = false;
let toastTimer: number | undefined;

// ---------- utilidades ----------

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m % 60).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

function toast(message: string): void {
  els.toast.textContent = message;
  els.toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    els.toast.hidden = true;
  }, 3500);
}

function visibleTracks(): Track[] {
  const q = filter.trim().toLocaleLowerCase("es");
  if (!q) return tracks;
  return tracks.filter(
    (t) => t.title.toLocaleLowerCase("es").includes(q) || t.artist.toLocaleLowerCase("es").includes(q),
  );
}

// ---------- biblioteca ----------

async function refreshLibrary(): Promise<void> {
  tracks = await getTracks();
  renderList();
}

function renderList(): void {
  const shown = visibleTracks();
  const total = tracks.length;
  els.count.textContent =
    total === 0
      ? "0 canciones"
      : shown.length === total
        ? `${total} ${total === 1 ? "canción" : "canciones"}`
        : `${shown.length} de ${total} canciones`;
  els.empty.hidden = total > 0;

  const currentId = player.current?.id;
  const rows = shown.map((track, i) => {
    const li = document.createElement("li");

    const play = document.createElement("button");
    play.className = "row";
    play.dataset.playing = String(track.id === currentId);
    play.addEventListener("click", () => void player.playQueue(shown, i));

    const title = document.createElement("span");
    title.className = "row-title";
    title.textContent = track.title; // textContent: los nombres de archivo nunca se interpretan como HTML
    const artist = document.createElement("span");
    artist.className = "row-artist";
    artist.textContent = track.artist;
    play.append(title, artist);

    const del = document.createElement("button");
    del.className = "icon-btn";
    del.innerHTML = icons.trash;
    del.setAttribute("aria-label", `Quitar «${track.title}» de la biblioteca`);
    del.addEventListener("click", () => void handleRemove(track));

    li.append(play, del);
    return li;
  });
  els.list.replaceChildren(...rows);
}

async function handleRemove(track: Track): Promise<void> {
  if (!window.confirm(`¿Quitar «${track.title}» de la biblioteca?`)) return;
  player.removeFromQueue(track.id);
  await removeTrack(track.id);
  await refreshLibrary();
}

async function handleImport(files: Iterable<File>): Promise<void> {
  const list = [...files];
  if (list.length === 0) return;
  toast(`Importando ${list.length} ${list.length === 1 ? "archivo" : "archivos"}…`);
  try {
    const { added, duplicates, ignored } = await importFiles(list);
    const parts = [`${added} ${added === 1 ? "añadida" : "añadidas"}`];
    if (duplicates) parts.push(`${duplicates} ya estaba${duplicates === 1 ? "" : "n"}`);
    if (ignored) parts.push(`${ignored} no ${ignored === 1 ? "es" : "son"} audio`);
    toast(parts.join(" · "));
    await refreshLibrary();
  } catch {
    toast("No se pudo guardar en la biblioteca. Revisa el espacio disponible.");
  }
}

// ---------- reproductor ----------

function renderNow(): void {
  const t = player.current;
  els.title.textContent = t ? t.title : "Nada en reproducción";
  els.artist.textContent = t ? t.artist : "Elige una canción de tu biblioteca";
  document.title = t ? `${t.title} · Reproductor Local` : "Reproductor Local";
  renderList();
}

function renderState(): void {
  const playing = player.playing;
  els.play.innerHTML = playing ? icons.pause : icons.play;
  els.play.setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
  els.cover.dataset.playing = String(playing);

  els.shuffle.setAttribute("aria-pressed", String(player.shuffle));
  els.repeat.setAttribute("aria-pressed", String(player.repeat !== "off"));
  els.repeat.innerHTML = player.repeat === "one" ? icons.repeatOne : icons.repeat;
  const repeatLabel = { off: "desactivado", all: "toda la cola", one: "una canción" }[player.repeat];
  els.repeat.setAttribute("aria-label", `Repetir: ${repeatLabel}`);
}

function renderTime(): void {
  const { currentTime, duration } = player.audio;
  els.cur.textContent = formatTime(currentTime);
  els.dur.textContent = formatTime(duration);
  if (!seeking) {
    els.seek.value = Number.isFinite(duration) && duration > 0 ? String(Math.round((currentTime / duration) * 1000)) : "0";
  }
}

player.addEventListener("track", renderNow);
player.addEventListener("state", renderState);
player.addEventListener("time", renderTime);
player.addEventListener("error", (e) => toast(String((e as CustomEvent).detail)));

// ---------- controles ----------

els.play.addEventListener("click", () => void player.toggle());
els.prev.addEventListener("click", () => void player.prev());
els.next.addEventListener("click", () => void player.next());
els.shuffle.addEventListener("click", () => player.toggleShuffle());
els.repeat.addEventListener("click", () => player.cycleRepeat());

els.seek.addEventListener("pointerdown", () => {
  seeking = true;
});
els.seek.addEventListener("input", () => {
  const { duration } = player.audio;
  if (Number.isFinite(duration)) {
    els.cur.textContent = formatTime((els.seek.valueAsNumber / 1000) * duration);
  }
});
els.seek.addEventListener("change", () => {
  const { duration } = player.audio;
  if (Number.isFinite(duration)) player.seek((els.seek.valueAsNumber / 1000) * duration);
  seeking = false;
});

els.volume.addEventListener("input", () => player.setVolume(els.volume.valueAsNumber / 100));

els.search.addEventListener("input", () => {
  filter = els.search.value;
  renderList();
});

els.add.addEventListener("click", () => els.file.click());
els.file.addEventListener("change", () => {
  const files = els.file.files ? [...els.file.files] : [];
  els.file.value = ""; // permite volver a elegir los mismos archivos
  void handleImport(files);
});

// Arrastrar y soltar (escritorio / tablet con teclado y ratón)
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => {
  e.preventDefault();
  if (e.dataTransfer?.files) void handleImport(e.dataTransfer.files);
});

// Barra espaciadora = reproducir/pausar (si no se está escribiendo)
window.addEventListener("keydown", (e) => {
  const target = e.target as HTMLElement;
  if (e.code === "Space" && !["INPUT", "TEXTAREA", "BUTTON"].includes(target.tagName)) {
    e.preventDefault();
    void player.toggle();
  }
});

// ---------- arranque ----------

els.add.innerHTML = `${icons.plus}<span>Añadir música</span>`;
els.prev.innerHTML = icons.prev;
els.next.innerHTML = icons.next;
els.shuffle.innerHTML = icons.shuffle;
els.cover.innerHTML = icons.note;
renderState();
renderTime();

void refreshLibrary().catch(() => toast("No se pudo abrir la biblioteca local."));

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
  });
}

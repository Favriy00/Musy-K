# Reproductor Local

Reproductor de música para **tablet** hecho con TypeScript y Vite. Es una PWA: se instala en la pantalla de inicio, abre sin conexión y **tu música nunca sale del dispositivo** (los archivos se guardan en IndexedDB del navegador).

## Qué hace (v0.1)

- Importar archivos de audio (MP3, M4A, AAC, FLAC, OGG/Opus, WAV) desde el selector de archivos o arrastrando y soltando.
- Biblioteca persistente con búsqueda por título o artista.
- Reproducir / pausar, anterior / siguiente, barra de progreso, volumen, aleatorio y repetir (off / toda la cola / una).
- Controles del sistema (pantalla de bloqueo, teclas multimedia) mediante Media Session.
- Interfaz táctil pensada para tablet (botones grandes, dos paneles en horizontal).
- Título y artista se sacan del nombre del archivo: `Artista - Título.mp3`.

## Empezar

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev        # servidor de desarrollo (accesible desde tu red local)
npm run build      # typecheck + build de producción en dist/
npm run preview    # servir el build
```

Para probarlo en la tablet durante el desarrollo, abre la IP que muestra `npm run dev` (por ejemplo `http://192.168.1.20:5173`). Ojo: el service worker y la instalación como app solo funcionan en HTTPS o `localhost`, así que para instalarla usa la versión publicada en GitHub Pages.

## Publicar en GitHub Pages

1. Sube el repo a GitHub (rama `main`).
2. En **Settings → Pages**, elige **Source: GitHub Actions**.
3. Cada push a `main` ejecuta `.github/workflows/deploy.yml` y publica la app.
4. Abre la URL de Pages en la tablet e instálala (**Añadir a pantalla de inicio** / **Instalar app**).

## Estructura

```
src/
  main.ts      interfaz y eventos
  player.ts    motor de reproducción, cola, Media Session
  library.ts   biblioteca en IndexedDB (importar, listar, borrar)
  icons.ts     iconos SVG
  style.css    estilos
public/
  manifest.webmanifest, sw.js, iconos
```

## Ideas para las siguientes versiones

- Leer etiquetas ID3 / portadas incrustadas (título, artista, álbum, carátula).
- Playlists y vista por álbum / artista.
- Importar carpetas completas (File System Access API donde esté disponible).
- Ecualizador y reproducción sin pausas (gapless).
- Empaquetar con Capacitor si más adelante quieres una app nativa de Android/iOS.

## Notas

- El almacenamiento del navegador tiene cuota; si la tablet tiene poco espacio, la importación puede fallar y la app lo avisa.
- Si borras los datos del sitio desde los ajustes del navegador, se borra la biblioteca.

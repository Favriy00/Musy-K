// Iconos SVG constantes (no contienen datos del usuario, por eso es seguro usarlos con innerHTML).

const svg = (body: string, size = 24) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${body}</svg>`;

export const icons = {
  play: svg('<path d="M8 5v14l11-7z"/>', 32),
  pause: svg('<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>', 32),
  prev: svg('<path d="M6 6h2v12H6zM9.5 12l8.5 6V6z"/>', 28),
  next: svg('<path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/>', 28),
  shuffle: svg(
    '<path d="M10.6 9.2 5.4 4 4 5.4l5.2 5.2zM14.5 4l2.0 2-12.5 12.5L5.4 20 18 7.4l2 2V4zM14.8 13.4l-1.4 1.4 3.1 3.1-2 2H20v-5.5l-2 2z"/>',
  ),
  repeat: svg(
    '<path d="M7 7h10v3l4-4-4-4v3H5v6h2zM17 17H7v-3l-4 4 4 4v-3h12v-6h-2z"/>',
  ),
  repeatOne: svg(
    '<path d="M7 7h10v3l4-4-4-4v3H5v6h2zM17 17H7v-3l-4 4 4 4v-3h12v-6h-2zM13 15V9h-1l-2 1v1h1.5v4z"/>',
  ),
  trash: svg('<path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"/>', 22),
  plus: svg('<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/>', 22),
  note: svg(
    '<path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z"/>',
    96,
  ),
};

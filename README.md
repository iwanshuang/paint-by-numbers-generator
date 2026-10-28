const sourceCanvas = document.getElementById('sourceCanvas');
const paintCanvas = document.getElementById('paintCanvas');
const imageUpload = document.getElementById('imageUpload');
const gridSizeInput = document.getElementById('gridSize');
const paletteSizeInput = document.getElementById('paletteSize');
const gridValue = document.getElementById('gridValue');
const paletteValue = document.getElementById('paletteValue');
const generateBtn = document.getElementById('generateBtn');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');
const printBtn = document.getElementById('printBtn');
const statusBox = document.getElementById('statusBox');
const paletteLegend = document.getElementById('paletteLegend');

const sourceCtx = sourceCanvas.getContext('2d');
const paintCtx = paintCanvas.getContext('2d');

const state = {
  image: null,
  gridSize: 20,
  paletteSize: 8,
  palette: [],
  demoImage: null,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function componentToHex(value) {
  const hex = value.toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}

function rgbToHex(r, g, b) {
  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex) {
  const raw = hex.replace('#', '');
  const full = raw.length === 3
    ? raw.split('').map((char) => char + char).join('')
    : raw;

  const int = Number.parseInt(full, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function colorDistance(a, b) {
  return Math.sqrt(
    (a.r - b.r) ** 2 +
    (a.g - b.g) ** 2 +
    (a.b - b.b) ** 2
  );
}

function rgbaToCss(r, g, b, a = 255) {
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
}

function updateLabels() {
  gridValue.textContent = state.gridSize;
  paletteValue.textContent = state.paletteSize;
}

function getCanvasData(image, targetWidth = 480, targetHeight = 320) {
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');

  const ratio = Math.min(targetWidth / image.width, targetHeight / image.height);
  const drawWidth = image.width * ratio;
  const drawHeight = image.height * ratio;

  tempCanvas.width = Math.max(1, Math.round(drawWidth));
  tempCanvas.height = Math.max(1, Math.round(drawHeight));

  tempCtx.drawImage(image, 0, 0, tempCanvas.width, tempCanvas.height);
  return tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
}

function createDemoImage() {
  const demoCanvas = document.createElement('canvas');
  const demoCtx = demoCanvas.getContext('2d');
  const width = 900;
  const height = 620;

  demoCanvas.width = width;
  demoCanvas.height = height;

  const grad = demoCtx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#f6d365');
  grad.addColorStop(0.35, '#fda085');
  grad.addColorStop(0.7, '#7dd3fc');
  grad.addColorStop(1, '#c4b5fd');
  demoCtx.fillStyle = grad;
  demoCtx.fillRect(0, 0, width, height);

  demoCtx.fillStyle = '#33a1ff';
  demoCtx.beginPath();
  demoCtx.arc(width * 0.25, height * 0.6, 150, 0, Math.PI * 2);
  demoCtx.fill();

  demoCtx.fillStyle = '#7ee787';
  demoCtx.fillRect(width * 0.45, height * 0.18, 220, 200);

  demoCtx.fillStyle = '#ff6b6b';
  demoCtx.beginPath();
  demoCtx.moveTo(width * 0.72, height * 0.22);
  demoCtx.lineTo(width * 0.92, height * 0.62);
  demoCtx.lineTo(width * 0.62, height * 0.68);
  demoCtx.closePath();
  demoCtx.fill();

  demoCtx.fillStyle = '#fff7d6';
  demoCtx.font = 'bold 74px sans-serif';
  demoCtx.fillText('PAINT', width * 0.12, height * 0.75);

  demoCtx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let i = 0; i < 80; i += 1) {
    demoCtx.fillRect(Math.random() * width, Math.random() * height, 8, 8);
  }

  return demoCanvas;
}

function defaultImage() {
  const demoCanvas = createDemoImage();
  const image = new Image();
  image.src = demoCanvas.toDataURL('image/png');
  return image;
}

function sampleColors(imageData, maxSamples = 120000) {
  const { data, width, height } = imageData;
  const totals = new Map();
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / maxSamples)));

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const a = data[offset + 3];

      if (a < 64) continue;

      const key = `${Math.round(r / 32) * 32}-${Math.round(g / 32) * 32}-${Math.round(b / 32) * 32}`;
      totals.set(key, (totals.get(key) || 0) + 1);
    }
  }

  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, Math.max(3, state.paletteSize)).map(([key]) => {
    const [r, g, b] = key.split('-').map(Number);
    return { r, g, b };
  });
}

function nearestColor(target, palette) {
  if (!palette.length) return { r: 0, g: 0, b: 0 };

  let selected = palette[0];
  let shortest = Number.POSITIVE_INFINITY;

  for (const color of palette) {
    const dist = colorDistance(target, color);
    if (dist < shortest) {
      selected = color;
      shortest = dist;
    }
  }

  return selected;
}

function buildPalette(imageData) {
  const rawColors = sampleColors(imageData);
  const palette = rawColors.slice(0, state.paletteSize);

  while (palette.length < state.paletteSize) {
    palette.push({ r: 255, g: 255, b: 255 });
  }

  return palette;
}

function renderLegend() {
  paletteLegend.innerHTML = '';

  state.palette.forEach((color, index) => {
    const item = document.createElement('div');
    item.className = 'legend-item';

    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.background = rgbToHex(color.r, color.g, color.b);

    const label = document.createElement('span');
    label.className = 'legend-label';
    label.textContent = 'Color ' + (index + 1);

    const number = document.createElement('span');
    number.className = 'legend-number';
    number.textContent = index + 1;

    item.appendChild(swatch);
    item.appendChild(label);
    item.appendChild(number);
    paletteLegend.appendChild(item);
  });
}

function drawSourcePreview(image) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  sourceCtx.clearRect(0, 0, width, height);

  const ratio = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * ratio;
  const drawHeight = image.height * ratio;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;

  sourceCtx.fillStyle = '#f2f5f9';
  sourceCtx.fillRect(0, 0, width, height);
  sourceCtx.drawImage(image, x, y, drawWidth, drawHeight);
}

function drawNumberedSheet() {
  const { gridSize, palette } = state;
  const cellWidth = paintCanvas.width / gridSize;
  const cellHeight = paintCanvas.height / gridSize;

  paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
  paintCtx.fillStyle = '#ffffff';
  paintCtx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);

  const imageData = getCanvasData(state.image, paintCanvas.width, paintCanvas.height);
  const { data, width, height } = imageData;

  const rows = Math.max(1, Math.round(height / cellHeight));
  const cols = Math.max(1, Math.round(width / cellWidth));

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x0 = col * cellWidth;
      const y0 = row * cellHeight;
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      let total = 0;

      const cellW = Math.min(cellWidth, width - x0);
      const cellH = Math.min(cellHeight, height - y0);

      for (let y = Math.floor(y0); y < Math.floor(y0 + cellH); y += 1) {
        for (let x = Math.floor(x0); x < Math.floor(x0 + cellW); x += 1) {
          const pixelOffset = (y * width + x) * 4;
          const r = data[pixelOffset];
          const g = data[pixelOffset + 1];
          const b = data[pixelOffset + 2];
          totalR += r;
          totalG += g;
          totalB += b;
          total += 1;
        }
      }

      const avg = {
        r: total ? Math.round(totalR / total) : 0,
        g: total ? Math.round(totalG / total) : 0,
        b: total ? Math.round(totalB / total) : 0,
      };

      const nearest = nearestColor(avg, palette);
      const cellNumber = palette.findIndex((color) => color.r === nearest.r && color.g === nearest.g && color.b === nearest.b) + 1;

      paintCtx.fillStyle = rgbToHex(nearest.r, nearest.g, nearest.b);
      paintCtx.fillRect(x0, y0, cellWidth, cellHeight);

      paintCtx.strokeStyle = 'rgba(25, 36, 46, 0.25)';
      paintCtx.lineWidth = 1;
      paintCtx.strokeRect(x0, y0, cellWidth, cellHeight);

      const textColor = (nearest.r + nearest.g + nearest.b) / 3 > 180 ? '#1a1a1a' : '#f8fbff';
      paintCtx.fillStyle = textColor;
      paintCtx.font = `700 ${Math.max(10, cellWidth * 0.45)}px sans-serif`;
      paintCtx.textAlign = 'center';
      paintCtx.textBaseline = 'middle';
      paintCtx.fillText(String(cellNumber), x0 + cellWidth / 2, y0 + cellHeight / 2);
    }
  }
}

function generatePaintSheet() {
  if (!state.image) {
    statusBox.textContent = 'Add an image first, or use the default sample image.';
    return;
  }

  const data = getCanvasData(state.image, paintCanvas.width, paintCanvas.height);
  state.palette = buildPalette(data);
  renderLegend();
  drawNumberedSheet();
  statusBox.textContent = `Generated ${state.gridSize} x ${state.gridSize} paint sheet with ${state.palette.length} palette colors.`;
}

function loadImageFromObject(image) {
  state.image = image;
  drawSourcePreview(image);
  generatePaintSheet();
}

function handleUpload(event) {
  const [file] = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    const image = new Image();
    image.onload = () => loadImageFromObject(image);
    image.src = loadEvent.target.result;
  };
  reader.readAsDataURL(file);
}

function resetToDefault() {
  const image = defaultImage();
  image.onload = () => {
    loadImageFromObject(image);
    statusBox.textContent = 'Default sample loaded. Adjust the controls to regenerate the sheet.';
  };
}

function exportPng() {
  const link = document.createElement('a');
  link.download = 'paint-by-numbers.png';
  link.href = paintCanvas.toDataURL('image/png');
  link.click();
  statusBox.textContent = 'Downloaded the numbered sheet as a PNG.';
}

function attachEventHandlers() {
  imageUpload.addEventListener('change', handleUpload);

  gridSizeInput.addEventListener('input', (event) => {
    state.gridSize = Number(event.target.value);
    updateLabels();
  });

  paletteSizeInput.addEventListener('input', (event) => {
    state.paletteSize = Number(event.target.value);
    updateLabels();
  });

  generateBtn.addEventListener('click', generatePaintSheet);
  resetBtn.addEventListener('click', resetToDefault);
  downloadBtn.addEventListener('click', exportPng);
  printBtn.addEventListener('click', () => window.print());
}

function init() {
  updateLabels();
  attachEventHandlers();
  resetToDefault();
}

init();

const sourceCanvas = document.getElementById('sourceCanvas');
const paintCanvas = document.getElementById('paintCanvas');
const imageUpload = document.getElementById('imageUpload');
const templateSelect = document.getElementById('templateSelect');
const gridSizeInput = document.getElementById('gridSize');
const paletteSizeInput = document.getElementById('paletteSize');
const gridValue = document.getElementById('gridValue');
const paletteValue = document.getElementById('paletteValue');
const generateBtn = document.getElementById('generateBtn');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadSvgBtn = document.getElementById('downloadSvgBtn');
const printBtn = document.getElementById('printBtn');
const statusBox = document.getElementById('statusBox');
const paletteLegend = document.getElementById('paletteLegend');
const customPaletteList = document.getElementById('customPaletteList');
const addColorBtn = document.getElementById('addColorBtn');

const sourceCtx = sourceCanvas.getContext('2d');
const paintCtx = paintCanvas.getContext('2d');

const templates = [
  {
    id: 'classic',
    name: 'Classic 8',
    colors: ['#F5F1E6', '#D4D4D4', '#8A8A8A', '#2F3134', '#D96F3D', '#EBCB5D', '#72A874', '#4D7FB8', '#A978C8'],
  },
  {
    id: 'earth',
    name: 'Earth Tones',
    colors: ['#F1E6D0', '#D9B684', '#B57A4A', '#7D563B', '#4D3A35', '#899F79', '#A2C2A9', '#E7D29E'],
  },
  {
    id: 'pastel',
    name: 'Pastel Bloom',
    colors: ['#F8F3FF', '#D9C8F0', '#F8B8C4', '#F8D9A0', '#B9E6B1', '#8FD3E6', '#7DB9D6', '#F7A6A6'],
  },
  {
    id: 'neon',
    name: 'Neon Pop',
    colors: ['#F8F7FF', '#18C5FF', '#FF4C8B', '#FFD12A', '#31E981', '#8E6BFF', '#FF8C42', '#F7F9FF'],
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    colors: ['#FAFAFA', '#D9D9D9', '#B7B7B7', '#8D8D8D', '#636363', '#3B3B3B', '#1F1F1F', '#0A0A0A'],
  },
];

const state = {
  image: null,
  gridSize: 20,
  paletteSize: 8,
  selectedTemplateId: 'classic',
  customPalette: [],
  palette: [],
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function componentToHex(value) {
  const hex = value.toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
}

function rgbToHex(r, g, b) {
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized;
  const value = Number.parseInt(full, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function colorDistance(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function createRandomHex() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 70;
  const lightness = 60;
  const h = hue / 360;
  const s = saturation / 100;
  const l = lightness / 100;

  const hueToRgb = (p, q, t) => {
    let temp = t;
    if (temp < 0) temp += 1;
    if (temp > 1) temp -= 1;
    if (temp < 1 / 6) return p + (q - p) * 6 * temp;
    if (temp < 1 / 2) return q;
    if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hueToRgb(p, q, h + 1 / 3);
  const g = hueToRgb(p, q, h);
  const b = hueToRgb(p, q, h - 1 / 3);

  return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}

function getTemplateById(id) {
  return templates.find((template) => template.id === id) || templates[0];
}

function getPaletteOptions() {
  return state.customPalette.length ? state.customPalette : getTemplateById(state.selectedTemplateId).colors;
}

function updateLabels() {
  gridValue.textContent = state.gridSize;
  paletteValue.textContent = state.paletteSize;
}

function renderTemplateSelector() {
  templateSelect.innerHTML = templates
    .map((template) => `<option value="${template.id}">${template.name}</option>`)
    .join('');
  templateSelect.value = state.selectedTemplateId;
}

function renderCustomPalette() {
  customPaletteList.innerHTML = '';

  if (!state.customPalette.length) {
    state.customPalette = [...getTemplateById(state.selectedTemplateId).colors];
  }

  state.customPalette.forEach((hex, index) => {
    const item = document.createElement('div');
    item.className = 'custom-palette-item';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = hex;
    colorInput.title = `Color ${index + 1}`;
    colorInput.addEventListener('input', (event) => {
      state.customPalette[index] = event.target.value;
      renderLegend();
    });

    const colorText = document.createElement('input');
    colorText.type = 'text';
    colorText.value = hex.toUpperCase();
    colorText.className = 'hex-input';
    colorText.addEventListener('change', (event) => {
      const next = event.target.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(next)) {
        state.customPalette[index] = next;
        colorInput.value = next;
        renderLegend();
      } else {
        event.target.value = state.customPalette[index].toUpperCase();
      }
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'mini-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      if (state.customPalette.length > 1) {
        state.customPalette.splice(index, 1);
        renderCustomPalette();
        renderLegend();
      }
    });

    item.append(colorInput, colorText, removeBtn);
    customPaletteList.appendChild(item);
  });
}

function resetCustomPaletteToTemplate() {
  state.customPalette = [...getTemplateById(state.selectedTemplateId).colors];
  renderCustomPalette();
  renderLegend();
}

function addCustomPaletteColor() {
  state.customPalette.push(createRandomHex());
  renderCustomPalette();
  renderLegend();
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
  grad.addColorStop(0, '#F6D365');
  grad.addColorStop(0.35, '#FDA085');
  grad.addColorStop(0.7, '#7DD3FC');
  grad.addColorStop(1, '#C4B5FD');
  demoCtx.fillStyle = grad;
  demoCtx.fillRect(0, 0, width, height);

  demoCtx.fillStyle = '#33A1FF';
  demoCtx.beginPath();
  demoCtx.arc(width * 0.25, height * 0.6, 150, 0, Math.PI * 2);
  demoCtx.fill();

  demoCtx.fillStyle = '#7EE787';
  demoCtx.fillRect(width * 0.45, height * 0.18, 220, 200);

  demoCtx.fillStyle = '#FF6B6B';
  demoCtx.beginPath();
  demoCtx.moveTo(width * 0.72, height * 0.22);
  demoCtx.lineTo(width * 0.92, height * 0.62);
  demoCtx.lineTo(width * 0.62, height * 0.68);
  demoCtx.closePath();
  demoCtx.fill();

  demoCtx.fillStyle = '#FFF7D6';
  demoCtx.font = 'bold 74px sans-serif';
  demoCtx.fillText('PAINT', width * 0.12, height * 0.75);

  demoCtx.fillStyle = 'rgba(0,0,0,0.18)';
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

function buildPaletteFromTemplate() {
  const templateColors = getPaletteOptions();
  return templateColors.slice(0, Math.max(3, Math.min(state.paletteSize, templateColors.length))).map((hex) => {
    const { r, g, b } = hexToRgb(hex);
    return { r, g, b };
  });
}

function fillPaletteToSize(palette) {
  while (palette.length < state.paletteSize) {
    palette.push({ r: 255, g: 255, b: 255 });
  }
  return palette.slice(0, state.paletteSize);
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
    label.textContent = `Color ${index + 1}`;

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

  sourceCtx.fillStyle = '#F2F5F9';
  sourceCtx.fillRect(0, 0, width, height);
  sourceCtx.drawImage(image, x, y, drawWidth, drawHeight);
}

function buildCellAssignments() {
  if (!state.image) return [];

  const imageData = getCanvasData(state.image, paintCanvas.width, paintCanvas.height);
  const { data, width, height } = imageData;
  const cellWidth = paintCanvas.width / state.gridSize;
  const cellHeight = paintCanvas.height / state.gridSize;
  const rows = Math.max(1, Math.ceil(height / cellHeight));
  const cols = Math.max(1, Math.ceil(width / cellWidth));
  const cells = [];

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
          totalR += data[pixelOffset];
          totalG += data[pixelOffset + 1];
          totalB += data[pixelOffset + 2];
          total += 1;
        }
      }

      const avg = {
        r: total ? Math.round(totalR / total) : 0,
        g: total ? Math.round(totalG / total) : 0,
        b: total ? Math.round(totalB / total) : 0,
      };

      const nearest = nearestColor(avg, state.palette);
      const cellNumber = state.palette.findIndex((color) => color.r === nearest.r && color.g === nearest.g && color.b === nearest.b) + 1;

      cells.push({
        x: x0,
        y: y0,
        width: cellWidth,
        height: cellHeight,
        fill: rgbToHex(nearest.r, nearest.g, nearest.b),
        number: cellNumber,
      });
    }
  }

  return cells;
}

function drawNumberedSheet() {
  paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
  paintCtx.fillStyle = '#FFFFFF';
  paintCtx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);

  const cells = buildCellAssignments();

  for (const cell of cells) {
    paintCtx.fillStyle = cell.fill;
    paintCtx.fillRect(cell.x, cell.y, cell.width, cell.height);

    paintCtx.strokeStyle = 'rgba(25, 36, 46, 0.25)';
    paintCtx.lineWidth = 1;
    paintCtx.strokeRect(cell.x, cell.y, cell.width, cell.height);

    const textColor = (Number.parseInt(cell.fill.slice(1, 3), 16) + Number.parseInt(cell.fill.slice(3, 5), 16) + Number.parseInt(cell.fill.slice(5, 7), 16)) / 3 > 180 ? '#121212' : '#F8FBFF';

    paintCtx.fillStyle = textColor;
    paintCtx.font = `700 ${Math.max(10, cell.width * 0.42)}px sans-serif`;
    paintCtx.textAlign = 'center';
    paintCtx.textBaseline = 'middle';
    paintCtx.fillText(String(cell.number), cell.x + cell.width / 2, cell.y + cell.height / 2);
  }
}

function generatePaintSheet() {
  if (!state.image) {
    statusBox.textContent = 'Add an image first, or use the default sample image.';
    return;
  }

  const templateColors = getPaletteOptions();
  state.palette = fillPaletteToSize(
    templateColors.map((hex) => {
      const { r, g, b } = hexToRgb(hex);
      return { r, g, b };
    })
  );

  renderLegend();
  drawNumberedSheet();
  statusBox.textContent = `Generated ${state.gridSize} x ${state.gridSize} region sheet using the ${getTemplateById(state.selectedTemplateId).name} palette.`;
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
  state.selectedTemplateId = 'classic';
  state.customPalette = [...getTemplateById(state.selectedTemplateId).colors];
  renderTemplateSelector();
  renderCustomPalette();

  const image = defaultImage();
  image.onload = () => {
    loadImageFromObject(image);
    statusBox.textContent = 'Default sample loaded. Adjust the palette or grid to regenerate the numbered sheet.';
  };
}

function exportPng() {
  const link = document.createElement('a');
  link.download = 'paint-by-numbers.png';
  link.href = paintCanvas.toDataURL('image/png');
  link.click();
  statusBox.textContent = 'Downloaded the numbered sheet as a PNG.';
}

function exportSvg() {
  if (!state.image) {
    statusBox.textContent = 'Generate a sheet before exporting SVG.';
    return;
  }

  const cells = buildCellAssignments();
  const viewWidth = paintCanvas.width;
  const viewHeight = paintCanvas.height;

  const svgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${viewWidth}" height="${viewHeight}" viewBox="0 0 ${viewWidth} ${viewHeight}">
      <rect width="100%" height="100%" fill="#FFFFFF" />
      ${cells
        .map((cell) => {
          const fontSize = Math.max(10, cell.width * 0.42);
          return `
            <rect x="${cell.x}" y="${cell.y}" width="${cell.width}" height="${cell.height}" fill="${cell.fill}" stroke="rgba(25,36,46,0.25)" stroke-width="1" />
            <text x="${cell.x + cell.width / 2}" y="${cell.y + cell.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" font-family="Arial, sans-serif" font-weight="700" fill="${(Number.parseInt(cell.fill.slice(1, 3), 16) + Number.parseInt(cell.fill.slice(3, 5), 16) + Number.parseInt(cell.fill.slice(5, 7), 16)) / 3 > 180 ? '#121212' : '#F8FBFF'}">${cell.number}</text>
          `;
        })
        .join('')}
    </svg>
  `;

  const blob = new Blob([svgMarkup.trim()], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'paint-by-numbers.svg';
  link.click();
  URL.revokeObjectURL(url);
  statusBox.textContent = 'Downloaded the numbered sheet as an SVG.';
}

function attachEventHandlers() {
  imageUpload.addEventListener('change', handleUpload);

  templateSelect.addEventListener('change', (event) => {
    state.selectedTemplateId = event.target.value;
    state.customPalette = [...getTemplateById(state.selectedTemplateId).colors];
    renderCustomPalette();
    generatePaintSheet();
  });

  gridSizeInput.addEventListener('input', (event) => {
    state.gridSize = Number(event.target.value);
    updateLabels();
  });

  paletteSizeInput.addEventListener('input', (event) => {
    state.paletteSize = Number(event.target.value);
    updateLabels();
  });

  addColorBtn.addEventListener('click', addCustomPaletteColor);
  generateBtn.addEventListener('click', generatePaintSheet);
  resetBtn.addEventListener('click', resetToDefault);
  downloadBtn.addEventListener('click', exportPng);
  downloadSvgBtn.addEventListener('click', exportSvg);
  printBtn.addEventListener('click', () => window.print());
}

function init() {
  state.customPalette = [...getTemplateById(state.selectedTemplateId).colors];
  state.paletteSize = state.customPalette.length;
  renderTemplateSelector();
  renderCustomPalette();
  updateLabels();
  attachEventHandlers();
  resetToDefault();
}

init();

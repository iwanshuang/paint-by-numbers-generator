const sourceCanvas = document.getElementById('sourceCanvas');
const paintCanvas = document.getElementById('paintCanvas');
const imageUpload = document.getElementById('imageUpload');
const dropZone = document.getElementById('dropZone');
const templateSelect = document.getElementById('templateSelect');
const aspectRatioSelect = document.getElementById('aspectRatioSelect');
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

const aspectRatios = {
  original: null,
  '1:1': 1,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '2:3': 2 / 3,
};

const state = {
  image: null,
  gridSize: 20,
  paletteSize: 8,
  selectedTemplateId: 'classic',
  aspectRatio: '4:3',
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

function addCustomPaletteColor() {
  state.customPalette.push(createRandomHex());
  renderCustomPalette();
  renderLegend();
}

function getAspectRatio() {
  return aspectRatios[state.aspectRatio] || null;
}

function computeCropRect(image, ratio) {
  if (!ratio) {
    return { x: 0, y: 0, width: image.width, height: image.height };
  }

  const imageRatio = image.width / image.height;
  if (imageRatio > ratio) {
    const cropWidth = image.height * ratio;
    return {
      x: (image.width - cropWidth) / 2,
      y: 0,
      width: cropWidth,
      height: image.height,
    };
  }

  const cropHeight = image.width / ratio;
  return {
    x: 0,
    y: (image.height - cropHeight) / 2,
    width: image.width,
    height: cropHeight,
  };
}

function createWorkingCanvas(image, targetWidth, targetHeight) {
  const ratio = getAspectRatio();
  const crop = computeCropRect(image, ratio);

  const sourceCanvasBuffer = document.createElement('canvas');
  sourceCanvasBuffer.width = Math.max(1, Math.round(crop.width));
  sourceCanvasBuffer.height = Math.max(1, Math.round(crop.height));

  const bufferCtx = sourceCanvasBuffer.getContext('2d');
  bufferCtx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, sourceCanvasBuffer.width, sourceCanvasBuffer.height);

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = targetWidth;
  outputCanvas.height = targetHeight;

  const outputCtx = outputCanvas.getContext('2d');
  outputCtx.fillStyle = '#FFFFFF';
  outputCtx.fillRect(0, 0, targetWidth, targetHeight);

  const scale = Math.min(targetWidth / sourceCanvasBuffer.width, targetHeight / sourceCanvasBuffer.height);
  const drawWidth = sourceCanvasBuffer.width * scale;
  const drawHeight = sourceCanvasBuffer.height * scale;
  const offsetX = (targetWidth - drawWidth) / 2;
  const offsetY = (targetHeight - drawHeight) / 2;

  outputCtx.drawImage(sourceCanvasBuffer, offsetX, offsetY, drawWidth, drawHeight);
  return outputCanvas;
}

function drawSourcePreview(image) {
  const ratio = getAspectRatio();
  const crop = computeCropRect(image, ratio);
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = image.width;
  previewCanvas.height = image.height;

  const previewCtx = previewCanvas.getContext('2d');
  previewCtx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, previewCanvas.width, previewCanvas.height);

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  sourceCtx.clearRect(0, 0, width, height);
  sourceCtx.fillStyle = '#F2F5F9';
  sourceCtx.fillRect(0, 0, width, height);

  const scale = Math.min(width / previewCanvas.width, height / previewCanvas.height);
  const drawWidth = previewCanvas.width * scale;
  const drawHeight = previewCanvas.height * scale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;

  sourceCtx.drawImage(previewCanvas, x, y, drawWidth, drawHeight);
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

function buildCellAssignments() {
  if (!state.image) return [];

  const workingCanvas = createWorkingCanvas(state.image, paintCanvas.width, paintCanvas.height);
  const { data, width, height } = workingCanvas.getContext('2d').getImageData(0, 0, workingCanvas.width, workingCanvas.height);
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
  statusBox.textContent = `Generated ${state.gridSize} x ${state.gridSize} sheet for ${state.aspectRatio === 'original' ? 'original' : state.aspectRatio} output ratio using the ${getTemplateById(state.selectedTemplateId).name} palette.`;
}

function processImageFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    statusBox.textContent = 'Please choose a valid image file.';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const image = new Image();
    image.onload = () => {
      state.image = image;
      drawSourcePreview(image);
      generatePaintSheet();
    };
    image.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function handleUpload(event) {
  const [file] = event.target.files;
  if (file) processImageFile(file);
}

function handleDrop(event) {
  event.preventDefault();
  dropZone.classList.remove('dragover');
  const [file] = event.dataTransfer.files;
  if (file) processImageFile(file);
}

function resetToDefault() {
  state.selectedTemplateId = 'classic';
  state.customPalette = [...getTemplateById(state.selectedTemplateId).colors];
  state.aspectRatio = '4:3';
  aspectRatioSelect.value = state.aspectRatio;
  renderTemplateSelector();
  renderCustomPalette();

  const image = new Image();
  image.onload = () => {
    state.image = image;
    drawSourcePreview(image);
    generatePaintSheet();
    statusBox.textContent = 'Default sample loaded. Adjust the palette or crop ratio to regenerate the numbered sheet.';
  };
  image.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAYAAAAFICAYAAAAHn7J1AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJ0UkGAAAAAElFTkSuQmCC';
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
  const svgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${paintCanvas.width}" height="${paintCanvas.height}" viewBox="0 0 ${paintCanvas.width} ${paintCanvas.height}">
      <rect width="100%" height="100%" fill="#FFFFFF" />
      ${cells
        .map((cell) => {
          const fontSize = Math.max(10, cell.width * 0.42);
          const fill = cell.fill;
          const textColor = (Number.parseInt(fill.slice(1, 3), 16) + Number.parseInt(fill.slice(3, 5), 16) + Number.parseInt(fill.slice(5, 7), 16)) / 3 > 180 ? '#121212' : '#F8FBFF';
          return `
            <rect x="${cell.x}" y="${cell.y}" width="${cell.width}" height="${cell.height}" fill="${fill}" stroke="rgba(25,36,46,0.25)" stroke-width="1" />
            <text x="${cell.x + cell.width / 2}" y="${cell.y + cell.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" font-family="Arial, sans-serif" font-weight="700" fill="${textColor}">${cell.number}</text>
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

  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', handleDrop);

  templateSelect.addEventListener('change', (event) => {
    state.selectedTemplateId = event.target.value;
    state.customPalette = [...getTemplateById(state.selectedTemplateId).colors];
    renderCustomPalette();
    generatePaintSheet();
  });

  aspectRatioSelect.addEventListener('change', (event) => {
    state.aspectRatio = event.target.value;
    if (state.image) {
      drawSourcePreview(state.image);
      generatePaintSheet();
    }
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

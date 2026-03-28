/* ===== EXCALICORD - Main Application Logic ===== */
/* Author: Built with WorkBuddy */

(function () {
  'use strict';

  // ===== STATE =====
  const state = {
    tool: 'select',
    color: '#1e1e2e',
    strokeSize: 2,
    strokeStyle: 'solid',
    fill: 'none',
    fontSize: 24,
    roughStyle: true,
    canvasRatio: '16:9',
    mouseHighlight: true,
    camSize: 'sm',
    isDrawing: false,
    startX: 0, startY: 0,
    currentX: 0, currentY: 0,
    isRecording: false,
    mediaRecorder: null,
    recordedChunks: [],
    recStartTime: null,
    recTimerInterval: null,
    // ===== SLIDES =====
    slides: [{ elements: [], bgColor: '#ffffff', undoStack: [] }],
    currentSlideIdx: 0,
    // In-progress stroke (for pen/highlighter paths)
    currentPath: [],
    // Selected element
    selectedIdx: -1,
    // Webcam stream
    webcamStream: null,
    draggingPip: false,
    pipOffsetX: 0, pipOffsetY: 0,
    // Text edit
    textEditMode: false,
    textEditPos: { x: 0, y: 0 },
  };

  // ===== SLIDE ACCESSORS =====
  function currentSlide() { return state.slides[state.currentSlideIdx]; }
  function getElements() { return currentSlide().elements; }
  function setElements(els) { currentSlide().elements = els; }
  function getBgColor() { return currentSlide().bgColor; }
  function setBgColor(c) { currentSlide().bgColor = c; }

  // ===== CANVAS =====
  const canvas = document.getElementById('drawCanvas');
  const ctx = canvas.getContext('2d');
  const wrapper = document.getElementById('canvasWrapper');

  // ===== ROUGH =====
  let rc;
  function getRough() {
    if (!rc) rc = rough.canvas(canvas);
    return rc;
  }

  // ===== RESIZE CANVAS =====
  function resizeCanvas() {
    const main = document.querySelector('.main-area');
    const rect = main.getBoundingClientRect();
    const availW = rect.width;
    const availH = rect.height;

    const ratios = { '16:9': 16/9, '9:16': 9/16, '3:4': 3/4, '1:1': 1 };
    const ratio = ratios[state.canvasRatio] || 16/9;

    let w = availW;
    let h = w / ratio;
    if (h > availH) { h = availH; w = h * ratio; }

    canvas.width = Math.floor(w);
    canvas.height = Math.floor(h);
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    // 同步 wrapper 尺寸，确保 getBoundingClientRect 准确（竖屏/小红书等比例下尤为重要）
    wrapper.style.width  = canvas.width  + 'px';
    wrapper.style.height = canvas.height + 'px';
    rc = null; // reset rough instance
    redraw();

    // 比例改变后，重新夹入 PiP 到白板内（延迟等 layout 完成）
    requestAnimationFrame(() => clampPipToCanvas());
  }

  /**
   * 将 PiP 夹入白板范围。
   * 如果 PiP 当前在白板范围内，保持相对位置；超出边界才移入。
   * 与 repositionPipToCanvas 的区别：不强制移到右下角。
   */
  function clampPipToCanvas() {
    if (webcamPipWrapper.classList.contains('pip-hidden')) return;

    const cr = getCanvasRectInArea();

    // 约束尺寸
    let pipSize = webcamPipWrapper.offsetWidth;
    const maxPip = Math.floor(Math.min(cr.width, cr.height) * 0.40);
    const minPip = 80;
    pipSize = Math.max(minPip, Math.min(pipSize, maxPip));
    webcamPipWrapper.style.width  = pipSize + 'px';
    webcamPipWrapper.style.height = pipSize + 'px';
    webcamPipWrapper.classList.remove('pip-md', 'pip-lg');
    webcamPipWrapper.style.right  = 'auto';
    webcamPipWrapper.style.bottom = 'auto';

    const margin = 8;
    const minX = cr.left   + margin;
    const minY = cr.top    + margin;
    const maxX = cr.right  - pipSize - margin;
    const maxY = cr.bottom - pipSize - margin;

    // 读取当前位置并夹入
    let curLeft = webcamPipWrapper.offsetLeft;
    let curTop  = webcamPipWrapper.offsetTop;

    // 如果 left/top 未被 JS 设置（还是 CSS 默认 0），则定位到右下角
    if (curLeft === 0 && curTop === 0) {
      webcamPipWrapper.style.left = Math.max(minX, Math.min(maxX, cr.left + cr.width - pipSize - 16)) + 'px';
      webcamPipWrapper.style.top  = Math.max(minY, Math.min(maxY, cr.top + cr.height - pipSize - 16)) + 'px';
    } else {
      webcamPipWrapper.style.left = Math.max(minX, Math.min(maxX, curLeft)) + 'px';
      webcamPipWrapper.style.top  = Math.max(minY, Math.min(maxY, curTop))  + 'px';
    }

    syncHandlePos();
    updatePipLastPos();
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
    // resizeCanvas 内已通过 requestAnimationFrame 调用 clampPipToCanvas
  });

  // ===== DRAW ALL ELEMENTS =====
  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = getBgColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    getElements().forEach((el, i) => {
      drawElement(el);
      if (i === state.selectedIdx) drawSelectionHandles(el);
    });
  }

  // ===== DRAW ONE ELEMENT =====
  function drawElement(el) {
    ctx.save();

    const ro = getRough();
    const roughness = state.roughStyle ? 1.5 : 0;

    // Common rough options
    const opts = {
      stroke: el.color,
      strokeWidth: el.strokeSize,
      roughness: roughness,
      bowing: state.roughStyle ? 1.0 : 0,
      fill: el.fill !== 'none' ? el.color : undefined,
      fillStyle: el.fill === 'hatch' ? 'hatch' : 'solid',
      fillWeight: el.strokeSize / 2,
      hachureGap: 8,
      strokeLineDash: el.strokeStyle === 'dashed' ? [8, 6] : el.strokeStyle === 'dotted' ? [2, 8] : undefined,
    };

    if (el.type === 'pen' || el.type === 'highlighter') {
      if (el.points && el.points.length > 1) {
        if (el.type === 'highlighter') {
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = el.color;
          ctx.lineWidth = el.strokeSize * 8;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(el.points[0][0], el.points[0][1]);
          el.points.forEach(p => ctx.lineTo(p[0], p[1]));
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else {
          // Smooth freehand using Catmull-Rom spline
          ctx.strokeStyle = el.color;
          ctx.lineWidth = el.strokeSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(el.points[0][0], el.points[0][1]);
          for (let i = 1; i < el.points.length - 1; i++) {
            const mx = (el.points[i][0] + el.points[i + 1][0]) / 2;
            const my = (el.points[i][1] + el.points[i + 1][1]) / 2;
            ctx.quadraticCurveTo(el.points[i][0], el.points[i][1], mx, my);
          }
          const last = el.points[el.points.length - 1];
          ctx.lineTo(last[0], last[1]);
          ctx.stroke();
        }
      }
    } else if (el.type === 'line') {
      if (roughness > 0) {
        ro.line(el.x1, el.y1, el.x2, el.y2, opts);
      } else {
        ctx.strokeStyle = el.color; ctx.lineWidth = el.strokeSize;
        if (el.strokeStyle === 'dashed') ctx.setLineDash([8, 6]);
        else if (el.strokeStyle === 'dotted') ctx.setLineDash([2, 8]);
        ctx.beginPath(); ctx.moveTo(el.x1, el.y1); ctx.lineTo(el.x2, el.y2); ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (el.type === 'arrow') {
      if (roughness > 0) {
        ro.line(el.x1, el.y1, el.x2, el.y2, opts);
      } else {
        ctx.strokeStyle = el.color; ctx.lineWidth = el.strokeSize;
        ctx.beginPath(); ctx.moveTo(el.x1, el.y1); ctx.lineTo(el.x2, el.y2); ctx.stroke();
      }
      // Arrow head
      drawArrowHead(el.x1, el.y1, el.x2, el.y2, el.color, el.strokeSize);
    } else if (el.type === 'rect') {
      const x = Math.min(el.x1, el.x2), y = Math.min(el.y1, el.y2);
      const w = Math.abs(el.x2 - el.x1), h = Math.abs(el.y2 - el.y1);
      if (w < 2 || h < 2) { ctx.restore(); return; }
      if (roughness > 0) {
        ro.rectangle(x, y, w, h, opts);
      } else {
        if (el.fill !== 'none') { ctx.fillStyle = el.color; ctx.fillRect(x, y, w, h); }
        ctx.strokeStyle = el.color; ctx.lineWidth = el.strokeSize;
        ctx.strokeRect(x, y, w, h);
      }
    } else if (el.type === 'ellipse') {
      const cx = (el.x1 + el.x2) / 2, cy = (el.y1 + el.y2) / 2;
      const rx = Math.abs(el.x2 - el.x1) / 2, ry = Math.abs(el.y2 - el.y1) / 2;
      if (rx < 1 || ry < 1) { ctx.restore(); return; }
      if (roughness > 0) {
        ro.ellipse(cx, cy, rx * 2, ry * 2, opts);
      } else {
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (el.fill !== 'none') { ctx.fillStyle = el.color; ctx.fill(); }
        ctx.strokeStyle = el.color; ctx.lineWidth = el.strokeSize; ctx.stroke();
      }
    } else if (el.type === 'diamond') {
      const cx = (el.x1 + el.x2) / 2, cy = (el.y1 + el.y2) / 2;
      const hw = Math.abs(el.x2 - el.x1) / 2, hh = Math.abs(el.y2 - el.y1) / 2;
      if (hw < 2 || hh < 2) { ctx.restore(); return; }
      const pts = [[cx, cy - hh], [cx + hw, cy], [cx, cy + hh], [cx - hw, cy]];
      if (roughness > 0) {
        ro.polygon(pts, opts);
      } else {
        ctx.beginPath(); ctx.moveTo(...pts[0]);
        pts.slice(1).forEach(p => ctx.lineTo(...p));
        ctx.closePath();
        if (el.fill !== 'none') { ctx.fillStyle = el.color; ctx.fill(); }
        ctx.strokeStyle = el.color; ctx.lineWidth = el.strokeSize; ctx.stroke();
      }
    } else if (el.type === 'text') {
      ctx.fillStyle = el.color;
      ctx.font = `${el.fontSize}px 'Caveat', 'Comic Sans MS', cursive`;
      ctx.textBaseline = 'top';
      const lines = el.text.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, el.x, el.y + i * (el.fontSize * 1.35));
      });
    } else if (el.type === 'image') {
      if (el.img) {
        ctx.drawImage(el.img, el.x, el.y, el.w, el.h);
      }
    }

    ctx.restore();
  }

  function drawArrowHead(x1, y1, x2, y2, color, sw) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const len = 14 + sw * 2;
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = sw;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - len * Math.cos(angle - Math.PI / 6), y2 - len * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - len * Math.cos(angle + Math.PI / 6), y2 - len * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
    ctx.restore();
  }

  function drawSelectionHandles(el) {
    const bb = getBoundingBox(el);
    if (!bb) return;
    ctx.save();
    ctx.strokeStyle = '#6C63FF';
    ctx.setLineDash([5, 3]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bb.x - 6, bb.y - 6, bb.w + 12, bb.h + 12);
    ctx.setLineDash([]);
    ctx.fillStyle = '#6C63FF';

    if (el.type === 'image') {
      // 8-direction resize handles for images
      const { x: bx, y: by, w: bw, h: bh } = bb;
      const cx = bx + bw / 2, cy = by + bh / 2;
      [
        [bx - 6, by - 6], [cx, by - 6], [bx + bw + 6, by - 6],
        [bx + bw + 6, cy],
        [bx + bw + 6, by + bh + 6], [cx, by + bh + 6], [bx - 6, by + bh + 6],
        [bx - 6, cy],
      ].forEach(([hx, hy]) => {
        ctx.beginPath(); ctx.arc(hx, hy, HANDLE_R, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = '#6C63FF'; ctx.lineWidth = 2; ctx.stroke();
      });
    } else {
      // 4-corner dots for other elements
      [[bb.x - 6, bb.y - 6], [bb.x + bb.w + 6, bb.y - 6],
       [bb.x - 6, bb.y + bb.h + 6], [bb.x + bb.w + 6, bb.y + bb.h + 6]].forEach(([hx, hy]) => {
        ctx.beginPath(); ctx.arc(hx, hy, 5, 0, Math.PI * 2); ctx.fill();
      });
    }
    ctx.restore();
  }

  function getBoundingBox(el) {
    if (!el) return null;
    if (el.type === 'pen' || el.type === 'highlighter') {
      if (!el.points || el.points.length === 0) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      el.points.forEach(([px, py]) => {
        minX = Math.min(minX, px); minY = Math.min(minY, py);
        maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
      });
      return { x: minX, y: minY, w: maxX - minX || 1, h: maxY - minY || 1 };
    } else if (el.type === 'text') {
      ctx.font = `${el.fontSize}px 'Caveat', cursive`;
      const lines = el.text.split('\n');
      const mw = Math.max(...lines.map(l => ctx.measureText(l).width));
      return { x: el.x, y: el.y, w: mw || 60, h: lines.length * el.fontSize * 1.35 };
    } else if (el.type === 'image') {
      return { x: el.x, y: el.y, w: el.w, h: el.h };
    } else if ('x1' in el) {
      return {
        x: Math.min(el.x1, el.x2), y: Math.min(el.y1, el.y2),
        w: Math.abs(el.x2 - el.x1) || 1, h: Math.abs(el.y2 - el.y1) || 1
      };
    }
    return null;
  }

  // ===== TOOL BUTTONS =====
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.tool = btn.dataset.tool;
      document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      wrapper.dataset.tool = state.tool;
      state.selectedIdx = -1;
      redraw();
    });
  });

  // Color swatches
  document.querySelectorAll('.color-swatch[data-color]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.color = btn.dataset.color;
      document.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.getElementById('customColorBtn').addEventListener('click', () => {
    document.getElementById('colorPicker').click();
  });
  document.getElementById('colorPicker').addEventListener('input', e => {
    state.color = e.target.value;
    document.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
    document.getElementById('customColorBtn').classList.add('active');
    document.getElementById('customColorBtn').style.background = e.target.value;
  });

  // Stroke size
  document.querySelectorAll('.stroke-btn[data-size]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.strokeSize = parseInt(btn.dataset.size);
      document.querySelectorAll('.stroke-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Stroke style
  document.querySelectorAll('.style-btn[data-style]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.strokeStyle = btn.dataset.style;
      document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Fill
  document.querySelectorAll('.fill-btn[data-fill]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.fill = btn.dataset.fill;
      document.querySelectorAll('.fill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Font size
  document.querySelectorAll('.font-btn[data-fontsize]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.fontSize = parseInt(btn.dataset.fontsize);
      document.querySelectorAll('.font-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ===== CANVAS EVENTS =====
  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  // ===== IMAGE RESIZE STATE =====
  // resizeHandle: null | { dir: 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w', startX, startY, origBB }
  state.imgResizing = false;
  state.imgResizeHandle = null;
  const HANDLE_R = 6; // hit radius for resize handles

  /** Returns handle direction if (x,y) is near a resize handle of the selected image element */
  function hitImageHandle(x, y) {
    if (state.selectedIdx < 0) return null;
    const el = getElements()[state.selectedIdx];
    if (!el || el.type !== 'image') return null;
    const bb = getBoundingBox(el);
    if (!bb) return null;
    const { x: bx, y: by, w: bw, h: bh } = bb;
    const cx = bx + bw / 2, cy = by + bh / 2;
    const handles = {
      nw: [bx - 6, by - 6], n: [cx, by - 6], ne: [bx + bw + 6, by - 6],
      e: [bx + bw + 6, cy],
      se: [bx + bw + 6, by + bh + 6], s: [cx, by + bh + 6], sw: [bx - 6, by + bh + 6],
      w: [bx - 6, cy],
    };
    for (const [dir, [hx, hy]] of Object.entries(handles)) {
      if (Math.hypot(x - hx, y - hy) <= HANDLE_R + 4) return dir;
    }
    return null;
  }

  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('mouseleave', () => { if (state.isDrawing) onPointerUp(); });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); onPointerDown(e); }, { passive: false });
  canvas.addEventListener('touchmove', e => { e.preventDefault(); onPointerMove(e); }, { passive: false });
  canvas.addEventListener('touchend', e => { e.preventDefault(); onPointerUp(e); }, { passive: false });

  // Double-click to edit existing text element
  canvas.addEventListener('dblclick', e => {
    if (state.tool !== 'select') return;
    const { x, y } = getCanvasPos(e);
    for (let i = getElements().length - 1; i >= 0; i--) {
      const el = getElements()[i];
      if (el.type !== 'text') continue;
      const bb = getBoundingBox(el);
      if (bb && x >= bb.x - 6 && x <= bb.x + bb.w + 6 && y >= bb.y - 6 && y <= bb.y + bb.h + 6) {
        // Open text input pre-filled with existing text
        state.textEditMode = true;
        state.textEditPos = { x: el.x, y: el.y };
        state.textEditingIdx = i; // remember which element we're editing
        const textOverlay = document.getElementById('textInputOverlay');
        const textInput = document.getElementById('textInput');
        textOverlay.style.left = el.x + 'px';
        textOverlay.style.top = el.y + 'px';
        textOverlay.classList.remove('hidden');
        textInput.value = el.text;
        textInput.style.color = el.color;
        textInput.style.fontSize = el.fontSize + 'px';
        // Auto-size
        setTimeout(() => {
          textInput.style.height = 'auto';
          textInput.style.height = textInput.scrollHeight + 'px';
          textInput.focus();
          textInput.select();
        }, 0);
        // Hide the element while editing
        state.selectedIdx = -1;
        redraw();
        return;
      }
    }
  });

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    const { x, y } = getCanvasPos(e);
    state.startX = x; state.startY = y;
    state.currentX = x; state.currentY = y;

    if (state.tool === 'text') {
      commitTextIfAny();
      openTextInput(x, y);
      return;
    }

    if (state.tool === 'select') {
      // Check image resize handle first
      const dir = hitImageHandle(x, y);
      if (dir) {
        const el = getElements()[state.selectedIdx];
        const bb = getBoundingBox(el);
        saveUndo();
        state.imgResizing = true;
        state.imgResizeHandle = {
          dir,
          startX: x, startY: y,
          origX: el.x, origY: el.y,
          origW: el.w, origH: el.h,
        };
        state.isDrawing = true;
        return;
      }

      // Hit test
      let hit = -1;
      for (let i = getElements().length - 1; i >= 0; i--) {
        const bb = getBoundingBox(getElements()[i]);
        if (bb && x >= bb.x - 6 && x <= bb.x + bb.w + 6 && y >= bb.y - 6 && y <= bb.y + bb.h + 6) {
          hit = i; break;
        }
      }
      state.selectedIdx = hit;
      state.isDrawing = hit >= 0;
      state.lastMoveX = x;
      state.lastMoveY = y;
      redraw();
      return;
    }

    if (state.tool === 'eraser') {
      eraseAt(x, y);
      state.isDrawing = true;
      return;
    }

    state.isDrawing = true;
    saveUndo();

    if (state.tool === 'pen' || state.tool === 'highlighter') {
      state.currentPath = [[x, y]];
    }
  }

  function onPointerMove(e) {
    const { x, y } = getCanvasPos(e);
    state.currentX = x; state.currentY = y;

    // Mouse highlight
    if (state.mouseHighlight) {
      const hl = document.getElementById('mouseHighlight');
      hl.style.left = x + 'px';
      hl.style.top = y + 'px';
      hl.classList.remove('hidden');
    }

    // Update cursor when hovering over image resize handles
    if (state.tool === 'select' && !state.isDrawing) {
      const dir = hitImageHandle(x, y);
      const cursors = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };
      canvas.style.cursor = dir ? (cursors[dir] || 'default') : '';
    }

    if (!state.isDrawing) return;

    // Image resize
    if (state.imgResizing && state.imgResizeHandle) {
      const { dir, startX, startY, origX, origY, origW, origH } = state.imgResizeHandle;
      const el = getElements()[state.selectedIdx];
      if (!el) return;
      const dx = x - startX, dy = y - startY;
      const MIN = 20;
      let newX = origX, newY = origY, newW = origW, newH = origH;

      if (dir === 'se') {
        newW = Math.max(MIN, origW + dx);
        newH = Math.max(MIN, origH + dy);
      } else if (dir === 'nw') {
        newW = Math.max(MIN, origW - dx);
        newH = Math.max(MIN, origH - dy);
        newX = origX + origW - newW;
        newY = origY + origH - newH;
      } else if (dir === 'ne') {
        newW = Math.max(MIN, origW + dx);
        newH = Math.max(MIN, origH - dy);
        newY = origY + origH - newH;
      } else if (dir === 'sw') {
        newW = Math.max(MIN, origW - dx);
        newH = Math.max(MIN, origH + dy);
        newX = origX + origW - newW;
      } else if (dir === 'e') {
        newW = Math.max(MIN, origW + dx);
      } else if (dir === 'w') {
        newW = Math.max(MIN, origW - dx);
        newX = origX + origW - newW;
      } else if (dir === 's') {
        newH = Math.max(MIN, origH + dy);
      } else if (dir === 'n') {
        newH = Math.max(MIN, origH - dy);
        newY = origY + origH - newH;
      }

      el.x = newX; el.y = newY; el.w = newW; el.h = newH;
      redraw();
      return;
    }

    if (state.tool === 'select' && state.selectedIdx >= 0) {
      const ldx = x - (state.lastMoveX ?? x);
      const ldy = y - (state.lastMoveY ?? y);
      if (state.lastMoveX !== undefined) {
        moveElement(getElements()[state.selectedIdx], ldx, ldy);
        redraw();
      }
      state.lastMoveX = x; state.lastMoveY = y;
      return;
    }

    if (state.tool === 'eraser') {
      eraseAt(x, y);
      return;
    }

    if (state.tool === 'pen' || state.tool === 'highlighter') {
      state.currentPath.push([x, y]);
      // Draw incremental for performance
      redraw();
      const tmpEl = {
        type: state.tool, points: state.currentPath,
        color: state.color, strokeSize: state.strokeSize, strokeStyle: state.strokeStyle
      };
      drawElement(tmpEl);
      return;
    }

    // Shape preview
    redraw();
    const preview = buildShapeElement(state.startX, state.startY, x, y);
    if (preview) drawElement(preview);
  }

  function onPointerUp(e) {
    if (state.imgResizing) {
      state.imgResizing = false;
      state.imgResizeHandle = null;
      state.isDrawing = false;
      canvas.style.cursor = '';
      redraw();
      renderSlideThumbnail(state.currentSlideIdx);
      return;
    }

    if (!state.isDrawing) {
      state.lastMoveX = undefined; state.lastMoveY = undefined;
      return;
    }
    state.isDrawing = false;
    state.lastMoveX = undefined; state.lastMoveY = undefined;

    const x = state.currentX, y = state.currentY;

    if (state.tool === 'select') return;
    if (state.tool === 'eraser') { redraw(); return; }
    if (state.tool === 'text') return;

    if (state.tool === 'pen' || state.tool === 'highlighter') {
      if (state.currentPath.length > 1) {
        getElements().push({
          type: state.tool, points: [...state.currentPath],
          color: state.color, strokeSize: state.strokeSize, strokeStyle: state.strokeStyle
        });
      }
      state.currentPath = [];
      redraw();
      renderSlideThumbnail(state.currentSlideIdx);
      return;
    }

    const el = buildShapeElement(state.startX, state.startY, x, y);
    if (el) {
      getElements().push(el);
      redraw();
      renderSlideThumbnail(state.currentSlideIdx);
    }
  }

  function buildShapeElement(x1, y1, x2, y2) {
    const base = { color: state.color, strokeSize: state.strokeSize, strokeStyle: state.strokeStyle, fill: state.fill };
    if (state.tool === 'line') return { ...base, type: 'line', x1, y1, x2, y2 };
    if (state.tool === 'arrow') return { ...base, type: 'arrow', x1, y1, x2, y2 };
    if (state.tool === 'rect') return { ...base, type: 'rect', x1, y1, x2, y2 };
    if (state.tool === 'ellipse') return { ...base, type: 'ellipse', x1, y1, x2, y2 };
    if (state.tool === 'diamond') return { ...base, type: 'diamond', x1, y1, x2, y2 };
    return null;
  }

  function moveElement(el, dx, dy) {
    if (el.type === 'pen' || el.type === 'highlighter') {
      el.points = el.points.map(([px, py]) => [px + dx, py + dy]);
    } else if (el.type === 'text' || el.type === 'image') {
      el.x += dx; el.y += dy;
    } else if ('x1' in el) {
      el.x1 += dx; el.y1 += dy; el.x2 += dx; el.y2 += dy;
    }
  }

  function eraseAt(x, y) {
    const r = Math.max(state.strokeSize * 4, 20);
    setElements(getElements().filter(el => {
      const bb = getBoundingBox(el);
      if (!bb) return true;
      const cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2;
      return Math.hypot(x - cx, y - cy) > r;
    }));
    redraw();
  }

  // ===== UNDO =====
  function saveUndo() {
    const stack = currentSlide().undoStack;
    stack.push(JSON.parse(JSON.stringify(getElements().map(el => {
      if (el.type === 'image') return { ...el, img: null, imgSrc: el.imgSrc };
      return el;
    }))));
    if (stack.length > 50) stack.shift();
  }

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      const stack = currentSlide().undoStack;
      if (stack.length > 0) {
        const prev = stack.pop();
        setElements(prev.map(el => {
          if (el.type === 'image' && el.imgSrc) {
            const img = new Image();
            img.src = el.imgSrc;
            img.onload = () => redraw();
            return { ...el, img };
          }
          return el;
        }));
        state.selectedIdx = -1;
        redraw();
        renderSlideThumbnail(state.currentSlideIdx);
      }
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (state.selectedIdx >= 0 && !state.textEditMode) {
        saveUndo();
        getElements().splice(state.selectedIdx, 1);
        state.selectedIdx = -1;
        redraw();
        renderSlideThumbnail(state.currentSlideIdx);
      }
    }
    // Tool shortcuts
    const shortcuts = { v: 'select', p: 'pen', h: 'highlighter', e: 'eraser', l: 'line', a: 'arrow', r: 'rect', o: 'ellipse', d: 'diamond', t: 'text' };
    if (!e.ctrlKey && !e.metaKey && !state.textEditMode) {
      const tool = shortcuts[e.key.toLowerCase()];
      if (tool) {
        document.querySelector(`.tool-btn[data-tool="${tool}"]`)?.click();
      }
      // C 键 = 开关摄像头
      if (e.key.toLowerCase() === 'c') {
        toggleWebcam();
      }
    }
  });

  // ===== PASTE BUTTON =====
  document.getElementById('pasteBtn').addEventListener('click', async () => {
    try {
      // Read clipboard items via Clipboard API (requires HTTPS + permission)
      const clipItems = await navigator.clipboard.read();
      for (const item of clipItems) {
        // ── Image ──
        const imgType = item.types.find(t => t.startsWith('image/'));
        if (imgType) {
          const blob = await item.getType(imgType);
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            saveUndo();
            const maxW = canvas.width * 0.5;
            const maxH = canvas.height * 0.5;
            let w = img.width, h = img.height;
            if (w > maxW) { h = h * maxW / w; w = maxW; }
            if (h > maxH) { w = w * maxH / h; h = maxH; }
            // Convert blob URL to dataURL for serialization
            const offC = document.createElement('canvas');
            offC.width = img.width; offC.height = img.height;
            offC.getContext('2d').drawImage(img, 0, 0);
            const imgSrc = offC.toDataURL();
            getElements().push({
              type: 'image', img, imgSrc,
              x: (canvas.width - w) / 2, y: (canvas.height - h) / 2, w, h
            });
            state.selectedIdx = getElements().length - 1;
            URL.revokeObjectURL(url);
            redraw();
            renderSlideThumbnail(state.currentSlideIdx);
            showToast('🖼️ 图片已粘贴', 1800);
          };
          img.src = url;
          return;
        }
        // ── Text ──
        if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          const text = (await blob.text()).trim();
          if (!text) return;
          saveUndo();
          ctx.font = `${state.fontSize}px 'Caveat', cursive`;
          const lines = text.split('\n');
          const maxLineW = Math.max(...lines.map(l => ctx.measureText(l).width));
          const totalH = lines.length * state.fontSize * 1.35;
          getElements().push({
            type: 'text', text,
            x: Math.max(20, (canvas.width - maxLineW) / 2),
            y: Math.max(20, (canvas.height - totalH) / 2),
            color: state.color, fontSize: state.fontSize
          });
          state.selectedIdx = getElements().length - 1;
          redraw();
          renderSlideThumbnail(state.currentSlideIdx);
          showToast('📋 文字已粘贴', 1800);
          return;
        }
      }
      showToast('📋 剪贴板为空或格式不支持', 2000);
    } catch (err) {
      // Clipboard API permission denied or not supported — tell user to use Ctrl+V
      showToast('请直接用 Ctrl+V（或 ⌘+V）粘贴', 2500);
    }
  });

  // ===== PASTE (Ctrl/Cmd+V) =====
  document.addEventListener('paste', async (e) => {
    // Don't intercept when typing in a text field
    if (state.textEditMode) return;
    const activeTag = document.activeElement?.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

    e.preventDefault();
    const items = Array.from(e.clipboardData?.items || []);

    // ── 1. Image paste ──
    const imageItem = items.find(it => it.type.startsWith('image/'));
    if (imageItem) {
      const blob = imageItem.getAsFile();
      if (!blob) return;
      const reader = new FileReader();
      reader.onload = evt => {
        const img = new Image();
        img.onload = () => {
          saveUndo();
          // Scale to fit within 50% of canvas, centered
          const maxW = canvas.width * 0.5;
          const maxH = canvas.height * 0.5;
          let w = img.width, h = img.height;
          if (w > maxW) { h = h * maxW / w; w = maxW; }
          if (h > maxH) { w = w * maxH / h; h = maxH; }
          getElements().push({
            type: 'image', img, imgSrc: evt.target.result,
            x: (canvas.width - w) / 2,
            y: (canvas.height - h) / 2,
            w, h
          });
          state.selectedIdx = getElements().length - 1;
          redraw();
          renderSlideThumbnail(state.currentSlideIdx);
          showToast('🖼️ 图片已粘贴', 1800);
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(blob);
      return;
    }

    // ── 2. Text paste ──
    const textItem = items.find(it => it.type === 'text/plain');
    if (textItem) {
      textItem.getAsString(text => {
        const trimmed = text.trim();
        if (!trimmed) return;
        saveUndo();
        // Measure approximate width to center the text block
        ctx.font = `${state.fontSize}px 'Caveat', cursive`;
        const lines = trimmed.split('\n');
        const maxLineW = Math.max(...lines.map(l => ctx.measureText(l).width));
        const totalH = lines.length * state.fontSize * 1.35;
        getElements().push({
          type: 'text',
          text: trimmed,
          x: Math.max(20, (canvas.width - maxLineW) / 2),
          y: Math.max(20, (canvas.height - totalH) / 2),
          color: state.color,
          fontSize: state.fontSize
        });
        state.selectedIdx = getElements().length - 1;
        redraw();
        renderSlideThumbnail(state.currentSlideIdx);
        showToast('📋 文字已粘贴', 1800);
      });
    }
  });

  // ===== TEXT INPUT =====
  const textOverlay = document.getElementById('textInputOverlay');
  const textInput = document.getElementById('textInput');

  function openTextInput(x, y) {
    state.textEditMode = true;
    state.textEditPos = { x, y };
    state.textEditingIdx = undefined; // new text, not editing existing
    textOverlay.style.left = x + 'px';
    textOverlay.style.top = y + 'px';
    textOverlay.classList.remove('hidden');
    textInput.value = '';
    textInput.style.color = state.color;
    textInput.style.fontSize = state.fontSize + 'px';
    textInput.focus();
  }

  function commitTextIfAny() {
    if (!state.textEditMode) return;
    const text = textInput.value.trim();
    const editingIdx = state.textEditingIdx;
    state.textEditingIdx = undefined;

    if (editingIdx !== undefined && editingIdx >= 0) {
      // Editing an existing text element
      const el = getElements()[editingIdx];
      if (el && el.type === 'text') {
        saveUndo();
        if (text) {
          el.text = text;
          el.color = state.color;
          el.fontSize = state.fontSize;
        } else {
          // Empty input → delete the element
          getElements().splice(editingIdx, 1);
        }
        state.selectedIdx = -1;
        redraw();
        renderSlideThumbnail(state.currentSlideIdx);
      }
    } else if (text) {
      // New text element
      saveUndo();
      getElements().push({
        type: 'text', text, x: state.textEditPos.x, y: state.textEditPos.y,
        color: state.color, fontSize: state.fontSize
      });
      redraw();
      renderSlideThumbnail(state.currentSlideIdx);
    }
    textOverlay.classList.add('hidden');
    textInput.value = '';
    state.textEditMode = false;
  }

  textInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') { commitTextIfAny(); }
    if (e.key === 'Enter' && !e.shiftKey) { commitTextIfAny(); }
    // Auto-resize
    setTimeout(() => {
      textInput.style.height = 'auto';
      textInput.style.height = textInput.scrollHeight + 'px';
    }, 0);
  });

  canvas.addEventListener('click', e => {
    if (state.tool !== 'text' && state.textEditMode) commitTextIfAny();
  });

  // ===== MOUSE HIGHLIGHT ON/OFF =====
  canvas.addEventListener('mouseleave', () => {
    document.getElementById('mouseHighlight').classList.add('hidden');
  });

  // ===== CLEAR CANVAS =====
  document.getElementById('clearBtn').addEventListener('click', () => {
    if (getElements().length === 0) return;
    saveUndo();
    setElements([]);
    state.selectedIdx = -1;
    redraw();
    renderSlideThumbnail(state.currentSlideIdx);
  });

  // ===== IMAGE UPLOAD =====
  document.getElementById('uploadImageBtn').addEventListener('click', () => {
    document.getElementById('imageUpload').click();
  });

  document.getElementById('imageUpload').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const img = new Image();
      img.onload = () => {
        saveUndo();
        const maxW = canvas.width * 0.5;
        const maxH = canvas.height * 0.5;
        let w = img.width, h = img.height;
        if (w > maxW) { h = h * maxW / w; w = maxW; }
        if (h > maxH) { w = w * maxH / h; h = maxH; }
        getElements().push({
          type: 'image', img, imgSrc: evt.target.result,
          x: (canvas.width - w) / 2, y: (canvas.height - h) / 2,
          w, h
        });
        redraw();
        renderSlideThumbnail(state.currentSlideIdx);
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  // ===== WEBCAM =====
  const webcamPipWrapper = document.getElementById('webcamPipWrapper');
  const webcamVideo = document.getElementById('webcamVideo');
  const canvasArea = document.getElementById('canvasArea');

  // 记录 PiP 最后一次可见时的位置和尺寸（用于录制时始终合入人像）
  const pipLastPos = { left: null, top: null, size: null };

  function updatePipLastPos() {
    if (!webcamPipWrapper.classList.contains('pip-hidden')) {
      pipLastPos.left = webcamPipWrapper.offsetLeft;
      pipLastPos.top  = webcamPipWrapper.offsetTop;
      pipLastPos.size = webcamPipWrapper.offsetWidth;
    }
  }

  /**
   * 获取白板（canvasWrapper）在 canvasArea 中的矩形（相对 canvasArea 的坐标）。
   * 这是 PiP 唯一允许存在的区域。
   */
  function getCanvasRectInArea() {
    const areaRect    = canvasArea.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    return {
      left:   wrapperRect.left   - areaRect.left,
      top:    wrapperRect.top    - areaRect.top,
      right:  wrapperRect.right  - areaRect.left,
      bottom: wrapperRect.bottom - areaRect.top,
      width:  wrapperRect.width,
      height: wrapperRect.height,
    };
  }

  /**
   * 将 PiP 重新定位到白板（canvasWrapper）范围内的右下角。
   * 当画布比例切换或窗口 resize 时调用，确保 PiP 始终在白板内。
   */
  function repositionPipToCanvas() {
    if (webcamPipWrapper.classList.contains('pip-hidden')) return;

    const cr = getCanvasRectInArea();

    // PiP 当前尺寸（可能已被拖拽缩放改变）
    let pipSize = webcamPipWrapper.offsetWidth;

    // 自适应最大尺寸：不超过画布短边的 40%，最小 80px
    const maxPip = Math.floor(Math.min(cr.width, cr.height) * 0.40);
    const minPip = 80;
    pipSize = Math.max(minPip, Math.min(pipSize, maxPip));

    // 强制同步尺寸
    webcamPipWrapper.style.width  = pipSize + 'px';
    webcamPipWrapper.style.height = pipSize + 'px';

    // 清除 preset class 和 right/bottom，使用 left/top 精确定位
    webcamPipWrapper.classList.remove('pip-md', 'pip-lg');
    webcamPipWrapper.style.right  = 'auto';
    webcamPipWrapper.style.bottom = 'auto';

    const margin = 16;
    // 定位到白板右下角（相对于 canvasArea）
    const nx = Math.max(cr.left + margin, cr.left + cr.width  - pipSize - margin);
    const ny = Math.max(cr.top  + margin, cr.top  + cr.height - pipSize - margin);

    webcamPipWrapper.style.left = nx + 'px';
    webcamPipWrapper.style.top  = ny + 'px';

    syncHandlePos();
    updatePipLastPos();
  }

  async function startWebcam() {
    try {
      // 只约束 facingMode，不限制分辨率，兼容性最好
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      webcamVideo.srcObject = stream;
      state.webcamStream = stream;
      // iOS Safari 需要手动调用 play()
      try { await webcamVideo.play(); } catch (_) {}
    } catch (err) {
      console.warn('Webcam not available:', err.name, err.message);
      const msg = err.name === 'NotAllowedError'
        ? '请在浏览器设置中允许访问摄像头，然后重新点击摄像头按钮。'
        : '无法访问摄像头：' + err.message;
      alert(msg);
      webcamPipWrapper.classList.add('pip-hidden');
    }
  }

  // 同步工具栏摄像头按钮的 active 样式
  const camToggleToolBtn = document.getElementById('camToggleToolBtn');
  function syncCamBtnState() {
    const isOn = !webcamPipWrapper.classList.contains('pip-hidden');
    camToggleToolBtn.classList.toggle('active', isOn);
  }

  async function toggleWebcam() {
    if (webcamPipWrapper.classList.contains('pip-hidden')) {
      webcamPipWrapper.classList.remove('pip-hidden');
      await startWebcam();
      // 定位到当前画布比例下的右下角
      requestAnimationFrame(() => repositionPipToCanvas());
    } else {
      webcamPipWrapper.classList.add('pip-hidden');
      pipResizeHandle.classList.remove('visible');
      if (state.webcamStream) {
        state.webcamStream.getTracks().forEach(t => t.stop());
        state.webcamStream = null;
        webcamVideo.srcObject = null;
      }
    }
    syncCamBtnState();
  }

  camToggleToolBtn.addEventListener('click', toggleWebcam);
  document.getElementById('toggleCamBtn').addEventListener('click', toggleWebcam);

  // ===== RESIZE HANDLE (挂在 canvasArea，JS 控制位置) =====
  const pipResizeHandle = document.getElementById('pipResizeHandle');
  const HANDLE_SIZE = 28;

  // 把 handle 定位到 wrapper 圆形右下角（45° 方向稍微偏外）
  function syncHandlePos() {
    if (webcamPipWrapper.classList.contains('pip-hidden')) {
      pipResizeHandle.classList.remove('visible');
      return;
    }
    const w = webcamPipWrapper.offsetWidth;
    const h = webcamPipWrapper.offsetHeight;
    const left = webcamPipWrapper.offsetLeft;
    const top = webcamPipWrapper.offsetTop;
    // 圆形右下角（从圆心出发，沿 45° 方向到达圆周）
    const r = w / 2;
    const offset = r * (1 - 1 / Math.SQRT2); // 从右下角内缩到圆周
    const hx = left + w - offset - HANDLE_SIZE / 2;
    const hy = top + h - offset - HANDLE_SIZE / 2;
    pipResizeHandle.style.left = hx + 'px';
    pipResizeHandle.style.top = hy + 'px';
    // 记录最后可见位置（供录制合成使用）
    updatePipLastPos();
  }

  // 鼠标进入 wrapper 或 handle 时显示，离开时隐藏
  let pipHoverTimer = null;
  function showHandle() {
    clearTimeout(pipHoverTimer);
    if (!webcamPipWrapper.classList.contains('pip-hidden')) {
      syncHandlePos();
      pipResizeHandle.classList.add('visible');
    }
  }
  function hideHandle() {
    pipHoverTimer = setTimeout(() => {
      if (!pipResizing) pipResizeHandle.classList.remove('visible');
    }, 120);
  }

  webcamPipWrapper.addEventListener('mouseenter', showHandle);
  webcamPipWrapper.addEventListener('mouseleave', hideHandle);
  pipResizeHandle.addEventListener('mouseenter', showHandle);
  pipResizeHandle.addEventListener('mouseleave', hideHandle);
  // 手机触摸时也显示 handle
  webcamPipWrapper.addEventListener('touchstart', showHandle, { passive: true });
  pipResizeHandle.addEventListener('touchstart', showHandle, { passive: true });

  // ===== DRAGGABLE WEBCAM PiP =====
  let pipDragging = false, pipStartMouseX = 0, pipStartMouseY = 0, pipStartLeft = 0, pipStartTop = 0;

  function pipDragStart(clientX, clientY) {
    pipDragging = true;
    pipStartMouseX = clientX;
    pipStartMouseY = clientY;
    pipStartLeft = webcamPipWrapper.offsetLeft;
    pipStartTop = webcamPipWrapper.offsetTop;
    webcamPipWrapper.style.right = 'auto';
    webcamPipWrapper.style.bottom = 'auto';
    webcamPipWrapper.style.left = pipStartLeft + 'px';
    webcamPipWrapper.style.top = pipStartTop + 'px';
  }
  function pipDragMove(clientX, clientY) {
    if (!pipDragging) return;
    const pw = webcamPipWrapper.offsetWidth;
    const ph = webcamPipWrapper.offsetHeight;
    const cr = getCanvasRectInArea();
    const margin = 8;
    // 严格限制在白板（canvasWrapper）范围内
    const minX = cr.left + margin;
    const minY = cr.top  + margin;
    const maxX = cr.right  - pw - margin;
    const maxY = cr.bottom - ph - margin;
    const nx = Math.max(minX, Math.min(maxX, pipStartLeft + clientX - pipStartMouseX));
    const ny = Math.max(minY, Math.min(maxY, pipStartTop  + clientY - pipStartMouseY));
    webcamPipWrapper.style.left = nx + 'px';
    webcamPipWrapper.style.top  = ny + 'px';
    syncHandlePos();
  }
  function pipDragEnd() { pipDragging = false; updatePipLastPos(); }

  webcamPipWrapper.addEventListener('mousedown', e => { pipDragStart(e.clientX, e.clientY); e.stopPropagation(); });
  webcamPipWrapper.addEventListener('touchstart', e => {
    if (e.touches.length === 1) { pipDragStart(e.touches[0].clientX, e.touches[0].clientY); e.stopPropagation(); }
  }, { passive: true });

  document.addEventListener('mousemove', e => pipDragMove(e.clientX, e.clientY));
  document.addEventListener('touchmove', e => {
    if (pipDragging && e.touches.length === 1) { e.preventDefault(); pipDragMove(e.touches[0].clientX, e.touches[0].clientY); }
  }, { passive: false });

  document.addEventListener('mouseup', pipDragEnd);
  document.addEventListener('touchend', pipDragEnd);

  // ===== RESIZE =====
  let pipResizing = false;
  let pipResizeStartX = 0, pipResizeStartY = 0, pipResizeStartW = 0;
  const PIP_MIN = 80;
  const PIP_MAX = 420;

  function pipResizeStart(clientX, clientY) {
    pipResizing = true;
    pipDragging = false; // 防止同时触发拖动
    pipResizeStartX = clientX;
    pipResizeStartY = clientY;
    pipResizeStartW = webcamPipWrapper.offsetWidth;
    webcamPipWrapper.style.right = 'auto';
    webcamPipWrapper.style.bottom = 'auto';
    webcamPipWrapper.style.left = webcamPipWrapper.offsetLeft + 'px';
    webcamPipWrapper.style.top = webcamPipWrapper.offsetTop + 'px';
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
  }
  function pipResizeMove(clientX, clientY) {
    if (!pipResizing) return;
    const dx = clientX - pipResizeStartX;
    const dy = clientY - pipResizeStartY;
    const delta = (dx + dy) / 2;
    // 最大尺寸：画布短边的 40%（但不超过 PIP_MAX）
    const cr = getCanvasRectInArea();
    const maxFromCanvas = Math.floor(Math.min(cr.width, cr.height) * 0.40);
    const maxSize = Math.min(PIP_MAX, maxFromCanvas);
    const finalSize = Math.min(maxSize, Math.max(PIP_MIN, pipResizeStartW + delta));
    webcamPipWrapper.style.width = finalSize + 'px';
    webcamPipWrapper.style.height = finalSize + 'px';
    webcamPipWrapper.classList.remove('pip-md', 'pip-lg');

    // 缩放后确保 PiP 仍在白板范围内
    const margin = 8;
    let curLeft = webcamPipWrapper.offsetLeft;
    let curTop  = webcamPipWrapper.offsetTop;
    const clampedLeft = Math.max(cr.left + margin, Math.min(cr.right  - finalSize - margin, curLeft));
    const clampedTop  = Math.max(cr.top  + margin, Math.min(cr.bottom - finalSize - margin, curTop));
    if (clampedLeft !== curLeft) webcamPipWrapper.style.left = clampedLeft + 'px';
    if (clampedTop  !== curTop)  webcamPipWrapper.style.top  = clampedTop  + 'px';

    syncHandlePos();
  }
  function pipResizeEnd() {
    if (!pipResizing) return;
    pipResizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    syncHandlePos();
    updatePipLastPos();
    const sz = webcamPipWrapper.offsetWidth;
    if (sz <= 140) state.camSize = 'sm';
    else if (sz <= 220) state.camSize = 'md';
    else state.camSize = 'lg';
  }

  pipResizeHandle.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); pipResizeStart(e.clientX, e.clientY); });
  pipResizeHandle.addEventListener('touchstart', e => {
    e.stopPropagation(); e.preventDefault();
    if (e.touches.length === 1) pipResizeStart(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });

  document.addEventListener('mousemove', e => pipResizeMove(e.clientX, e.clientY));
  document.addEventListener('touchmove', e => {
    if (pipResizing && e.touches.length === 1) { e.preventDefault(); pipResizeMove(e.touches[0].clientX, e.touches[0].clientY); }
  }, { passive: false });

  document.addEventListener('mouseup', pipResizeEnd);
  document.addEventListener('touchend', pipResizeEnd);

  // ===== SETTINGS MODAL =====
  document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.remove('hidden');
  });
  document.getElementById('closeSettings').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.add('hidden');
  });
  document.getElementById('settingsModal').addEventListener('click', e => {
    if (e.target === document.getElementById('settingsModal'))
      document.getElementById('settingsModal').classList.add('hidden');
  });

  // Ratio
  document.querySelectorAll('.ratio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.canvasRatio = btn.dataset.ratio;
      document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      resizeCanvas();
      // resizeCanvas 内的 clampPipToCanvas 只做夹入，比例大幅变化后强制重定位到右下角
      requestAnimationFrame(() => repositionPipToCanvas());
    });
  });

  // Background
  document.querySelectorAll('.bg-btn[data-bg]').forEach(btn => {
    btn.addEventListener('click', () => {
      setBgColor(btn.dataset.bg);
      document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      redraw();
      renderSlideThumbnail(state.currentSlideIdx);
    });
  });
  document.getElementById('bgColorPicker').addEventListener('input', e => {
    setBgColor(e.target.value);
    document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('customBgBtn').classList.add('active');
    redraw();
    renderSlideThumbnail(state.currentSlideIdx);
  });

  // Camera size
  document.querySelectorAll('.cam-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.camSize = btn.dataset.camsize;
      document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (state.camSize === 'hidden') {
        webcamPipWrapper.classList.add('pip-hidden');
        pipResizeHandle.classList.remove('visible');
        syncCamBtnState();
        return;
      }

      // 先移除所有 size class 和 inline 尺寸/位置样式
      webcamPipWrapper.classList.remove('pip-hidden', 'pip-md', 'pip-lg');
      webcamPipWrapper.style.width   = '';
      webcamPipWrapper.style.height  = '';
      webcamPipWrapper.style.left    = '';
      webcamPipWrapper.style.top     = '';
      webcamPipWrapper.style.right   = '';
      webcamPipWrapper.style.bottom  = '';

      // 设置目标尺寸（通过 class 临时设置，repositionPipToCanvas 会读取并可能约束）
      if (state.camSize === 'md') webcamPipWrapper.classList.add('pip-md');
      else if (state.camSize === 'lg') webcamPipWrapper.classList.add('pip-lg');

      // 等 layout 完成后重新定位到画布内
      requestAnimationFrame(() => repositionPipToCanvas());
      syncCamBtnState();
    });
  });

  // Mouse highlight toggle
  document.getElementById('mouseHighlightToggle').addEventListener('change', e => {
    state.mouseHighlight = e.target.checked;
    if (!state.mouseHighlight) document.getElementById('mouseHighlight').classList.add('hidden');
  });

  // Rough style toggle
  document.getElementById('roughStyleToggle').addEventListener('change', e => {
    state.roughStyle = e.target.checked;
    redraw();
  });

  // ===== RECORDING =====
  let recAudioStream = null;

  document.getElementById('recordBtn').addEventListener('click', () => {
    if (!state.isRecording) startRecording();
    else stopRecording();
  });

  async function startRecording() {
    // Ask for microphone
    try {
      recAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      recAudioStream = null;
    }

    // Compose stream: canvas + optional webcam + optional audio
    const canvasStream = canvas.captureStream(30);
    const tracks = [...canvasStream.getTracks()];

    // Add webcam video track
    if (state.webcamStream) {
      const videoTrack = state.webcamStream.getVideoTracks()[0];
      if (videoTrack) tracks.push(videoTrack);
    }
    // Add audio track
    if (recAudioStream) {
      const audioTrack = recAudioStream.getAudioTracks()[0];
      if (audioTrack) tracks.push(audioTrack);
    }

    // Actually we need to mix canvas with webcam on a composite canvas
    // We'll use an offscreen compositing canvas for recording
    const compCanvas = document.createElement('canvas');
    compCanvas.width = canvas.width;
    compCanvas.height = canvas.height;
    const compCtx = compCanvas.getContext('2d');

    function drawFrame() {
      if (!state.isRecording) return;
      compCtx.clearRect(0, 0, compCanvas.width, compCanvas.height);
      // Draw main canvas (whiteboard)
      compCtx.drawImage(canvas, 0, 0);

      // Draw webcam PiP — 始终合入录制，不管 UI 上是否 pip-hidden
      if (webcamVideo.srcObject && webcamVideo.readyState >= 2) {
        // 优先取当前可见位置，隐藏时回退到最后记录的位置
        const isVisible = !webcamPipWrapper.classList.contains('pip-hidden');
        if (isVisible) updatePipLastPos();

        const pipAreaLeft = pipLastPos.left !== null ? pipLastPos.left : webcamPipWrapper.offsetLeft;
        const pipAreaTop  = pipLastPos.top  !== null ? pipLastPos.top  : webcamPipWrapper.offsetTop;
        const pipSize     = pipLastPos.size !== null ? pipLastPos.size  : webcamPipWrapper.offsetWidth;

        if (pipSize <= 0) { requestAnimationFrame(drawFrame); return; }

        // PiP 相对 canvasArea 的位置
        // canvasWrapper（即 wrapper）相对 canvasArea 的偏移（px）
        const areaRect    = canvasArea.getBoundingClientRect();
        const canvasRect  = canvas.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();

        const wrapOffX = wrapperRect.left - areaRect.left;
        const wrapOffY = wrapperRect.top  - areaRect.top;

        // PiP 相对 canvasWrapper 的位置
        const pipRelX = pipAreaLeft - wrapOffX;
        const pipRelY = pipAreaTop  - wrapOffY;

        // canvasWrapper 的显示尺寸（CSS px）
        const dispW = wrapperRect.width;
        const dispH = wrapperRect.height;

        // 把显示坐标换算到 canvas 内部坐标（canvas 可能有 DPR 缩放）
        const scaleX = canvas.width  / dispW;
        const scaleY = canvas.height / dispH;

        const cx = (pipRelX + pipSize / 2) * scaleX;  // 圆心 X（canvas 坐标）
        const cy = (pipRelY + pipSize / 2) * scaleY;  // 圆心 Y
        const r  = (pipSize / 2) * scaleX;             // 半径（取 X 缩放，保持圆形）
        const pw = pipSize * scaleX;
        const ph = pipSize * scaleY;

        // 圆形裁剪
        compCtx.save();
        compCtx.beginPath();
        compCtx.arc(cx, cy, r, 0, Math.PI * 2);
        compCtx.clip();
        // 镜像翻转绘制
        compCtx.translate(cx + r, cy - r);
        compCtx.scale(-1, 1);
        compCtx.drawImage(webcamVideo, 0, 0, pw, ph);
        compCtx.restore();

        // 白色边框
        compCtx.save();
        compCtx.beginPath();
        compCtx.arc(cx, cy, r, 0, Math.PI * 2);
        compCtx.strokeStyle = 'rgba(255,255,255,0.9)';
        compCtx.lineWidth = Math.max(2, r * 0.04);
        compCtx.stroke();
        compCtx.restore();
      }
      requestAnimationFrame(drawFrame);
    }

    const compStream = compCanvas.captureStream(30);
    const recTracks = [...compStream.getVideoTracks()];
    if (recAudioStream) recTracks.push(...recAudioStream.getAudioTracks());

    const finalStream = new MediaStream(recTracks);

    const mimeType = getSupportedMimeType();
    const options = mimeType ? { mimeType } : {};
    state.mediaRecorder = new MediaRecorder(finalStream, options);
    state.recordedChunks = [];

    state.mediaRecorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) state.recordedChunks.push(e.data);
    };

    state.mediaRecorder.onstop = async () => {
      await downloadRecording();
    };

    state.isRecording = true;
    drawFrame();
    state.mediaRecorder.start(200);
    state.recStartTime = Date.now();

    // UI
    document.getElementById('recordBtn').classList.add('recording');
    document.getElementById('recordBtn').innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>
      停止录制
    `;
    document.getElementById('recordingIndicator').classList.remove('hidden');
    state.recTimerInterval = setInterval(updateRecTimer, 1000);
  }

  function stopRecording() {
    state.isRecording = false;
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      state.mediaRecorder.stop();
    }
    clearInterval(state.recTimerInterval);

    document.getElementById('recordBtn').classList.remove('recording');
    document.getElementById('recordBtn').innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="8" fill="currentColor"/></svg>
      开始录制
    `;
    document.getElementById('recordingIndicator').classList.add('hidden');

    if (recAudioStream) { recAudioStream.getTracks().forEach(t => t.stop()); recAudioStream = null; }
  }

  function updateRecTimer() {
    const elapsed = Math.floor((Date.now() - state.recStartTime) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    document.getElementById('recTimer').textContent = `${m}:${s}`;
  }

  function getSupportedMimeType() {
    // Prefer MP4 directly — Chrome 130+, Safari, Edge all support it natively (no ffmpeg needed)
    const types = [
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    for (const t of types) { if (MediaRecorder.isTypeSupported(t)) return t; }
    return '';
  }

  // ===== TOAST HELPER =====
  function showToast(html, duration) {
    const toast = document.createElement('div');
    toast.className = 'download-toast';
    toast.innerHTML = html;
    document.body.appendChild(toast);
    if (duration) setTimeout(() => toast.remove(), duration);
    return toast;
  }

  // ===== DOWNLOAD AS MP4 =====
  async function downloadRecording() {
    const mimeType = state.mediaRecorder ? state.mediaRecorder.mimeType : '';
    const isNativeMp4 = mimeType.includes('mp4');

    // ── Case 1: Browser recorded natively as MP4 — just download directly ──
    if (isNativeMp4) {
      const mp4Blob = new Blob(state.recordedChunks, { type: 'video/mp4' });
      const url = URL.createObjectURL(mp4Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `easyrecord-${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('✅ MP4 视频已下载！', 2800);
      return;
    }

    // ── Case 2: Recorded as WebM — try ffmpeg.wasm conversion ──
    const webmBlob = new Blob(state.recordedChunks, { type: 'video/webm' });

    // If ffmpeg script not loaded, skip straight to webm download
    if (typeof FFmpeg === 'undefined' || !FFmpeg.FFmpeg) {
      const url = URL.createObjectURL(webmBlob);
      const a = document.createElement('a');
      a.href = url; a.download = `easyrecord-${Date.now()}.webm`; a.click();
      URL.revokeObjectURL(url);
      showToast('⚠️ 你的浏览器不支持直接录 MP4，已下载 WebM 格式（建议升级到 Chrome 130+ 或使用 Safari）', 5000);
      return;
    }

    // Show conversion toast
    const toast = showToast(
      `<div class="spinner"></div>
       <div>
         <div style="font-weight:600">正在转换为 MP4...</div>
         <div id="ffmpegProgress" style="font-size:11px;color:#888;margin-top:3px">加载 FFmpeg 中</div>
       </div>`,
      0
    );

    const updateProgress = (msg) => {
      const el = document.getElementById('ffmpegProgress');
      if (el) el.textContent = msg;
    };

    try {
      const { FFmpeg: FFmpegClass } = FFmpeg;
      const { fetchFile } = FFmpeg;

      const ffmpeg = new FFmpegClass();
      ffmpeg.on('log', ({ message }) => {
        const m = message.match(/time=(\d+:\d+:\d+\.\d+)/);
        if (m) updateProgress(`转码进度：${m[1]}`);
      });

      updateProgress('加载转码引擎...');
      const CDN = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL:   `${CDN}/ffmpeg-core.js`,
        wasmURL:   `${CDN}/ffmpeg-core.wasm`,
        workerURL: `${CDN}/ffmpeg-core.worker.js`,
      });

      updateProgress('读取录制数据...');
      const inputData = await fetchFile(webmBlob);
      await ffmpeg.writeFile('input.webm', inputData);

      updateProgress('转码中，请稍候...');
      await ffmpeg.exec([
        '-i', 'input.webm',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '22',
        '-c:a', 'aac',
        '-movflags', '+faststart',
        'output.mp4'
      ]);

      updateProgress('生成下载文件...');
      const data = await ffmpeg.readFile('output.mp4');
      const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(mp4Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `easyrecord-${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);

      toast.remove();
      showToast('✅ MP4 视频已下载！', 2800);
    } catch (err) {
      console.error('FFmpeg 转码失败：', err);
      toast.remove();
      const url = URL.createObjectURL(webmBlob);
      const a = document.createElement('a');
      a.href = url; a.download = `easyrecord-${Date.now()}.webm`; a.click();
      URL.revokeObjectURL(url);
      showToast('⚠️ MP4 转换失败，已下载 WebM（建议升级 Chrome 130+ 可直接录 MP4）', 5000);
    }
  }

  // ===== SLIDE MANAGEMENT =====

  const slideList = document.getElementById('slideList');
  const addSlideBtn = document.getElementById('addSlideBtn');

  /** Create a new blank slide */
  function createSlide(bgColor) {
    return { elements: [], bgColor: bgColor || '#ffffff', undoStack: [] };
  }

  /** Switch to slide at index, save current canvas state */
  function switchToSlide(idx) {
    if (idx < 0 || idx >= state.slides.length) return;
    // Commit any in-progress text
    commitTextIfAny();
    state.selectedIdx = -1;
    state.currentSlideIdx = idx;
    // Update bg color UI to match new slide
    syncBgColorUI(getBgColor());
    redraw();
    renderSlideBar();
    // Animate canvas
    wrapper.classList.remove('slide-transition');
    void wrapper.offsetWidth; // reflow
    wrapper.classList.add('slide-transition');
    setTimeout(() => wrapper.classList.remove('slide-transition'), 200);
  }

  /** Sync the bg-btn UI in settings to the current slide color */
  function syncBgColorUI(color) {
    const presets = ['#ffffff', '#f8f5f0', '#1e1e2e', '#fdf6e3', '#f0f4ff'];
    document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
    const presetIdx = presets.indexOf(color);
    if (presetIdx >= 0) {
      document.querySelectorAll('.bg-btn[data-bg]')[presetIdx]?.classList.add('active');
    } else {
      document.getElementById('customBgBtn')?.classList.add('active');
      document.getElementById('bgColorPicker').value = color;
    }
  }

  /** Render a single slide thumbnail at given index */
  function renderSlideThumbnail(idx) {
    const thumbEl = slideList.querySelectorAll('.slide-thumb')[idx];
    if (!thumbEl) return;
    const thumbCanvas = thumbEl.querySelector('canvas');
    if (!thumbCanvas) return;
    const tCtx = thumbCanvas.getContext('2d');
    const slide = state.slides[idx];
    const tw = thumbCanvas.width, th = thumbCanvas.height;

    // Draw bg
    tCtx.fillStyle = slide.bgColor;
    tCtx.fillRect(0, 0, tw, th);

    // Scale factor
    const scaleX = tw / canvas.width;
    const scaleY = th / canvas.height;
    tCtx.save();
    tCtx.scale(scaleX, scaleY);

    // Draw elements (simplified: use drawElement on a separate ctx—tricky, so we draw to an offscreen)
    // We'll do a simple scaled redraw
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const offCtx = offscreen.getContext('2d');
    offCtx.fillStyle = slide.bgColor;
    offCtx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw elements using main ctx temporarily
    const savedElements = getElements();
    const savedBg = getBgColor();
    // temporarily swap
    state.slides[idx]._isRendering = true;
    slide.elements.forEach(el => drawElementOnCtx(offCtx, el));

    tCtx.restore();
    tCtx.drawImage(offscreen, 0, 0, tw, th);

    // Update bg dot
    const bgDot = thumbEl.querySelector('.slide-bg-dot');
    if (bgDot) bgDot.style.background = slide.bgColor;
  }

  /** Draw element on an arbitrary 2d context (simplified version for thumbnails) */
  function drawElementOnCtx(c, el) {
    c.save();
    if (el.type === 'pen' || el.type === 'highlighter') {
      if (!el.points || el.points.length < 2) { c.restore(); return; }
      c.strokeStyle = el.color;
      c.lineWidth = el.strokeSize;
      c.lineCap = 'round'; c.lineJoin = 'round';
      if (el.type === 'highlighter') { c.globalAlpha = 0.35; c.lineWidth = el.strokeSize * 8; }
      c.beginPath();
      c.moveTo(el.points[0][0], el.points[0][1]);
      el.points.forEach(p => c.lineTo(p[0], p[1]));
      c.stroke();
    } else if (el.type === 'line' || el.type === 'arrow') {
      c.strokeStyle = el.color; c.lineWidth = el.strokeSize;
      c.beginPath(); c.moveTo(el.x1, el.y1); c.lineTo(el.x2, el.y2); c.stroke();
    } else if (el.type === 'rect') {
      const x = Math.min(el.x1,el.x2), y = Math.min(el.y1,el.y2);
      const w = Math.abs(el.x2-el.x1), h = Math.abs(el.y2-el.y1);
      if (el.fill !== 'none') { c.fillStyle = el.color; c.fillRect(x,y,w,h); }
      c.strokeStyle = el.color; c.lineWidth = el.strokeSize; c.strokeRect(x,y,w,h);
    } else if (el.type === 'ellipse') {
      const cx=(el.x1+el.x2)/2, cy=(el.y1+el.y2)/2, rx=Math.abs(el.x2-el.x1)/2, ry=Math.abs(el.y2-el.y1)/2;
      c.beginPath(); c.ellipse(cx,cy,Math.max(rx,1),Math.max(ry,1),0,0,Math.PI*2);
      if (el.fill !== 'none') { c.fillStyle = el.color; c.fill(); }
      c.strokeStyle = el.color; c.lineWidth = el.strokeSize; c.stroke();
    } else if (el.type === 'diamond') {
      const cx=(el.x1+el.x2)/2, cy=(el.y1+el.y2)/2, hw=Math.abs(el.x2-el.x1)/2, hh=Math.abs(el.y2-el.y1)/2;
      c.beginPath(); c.moveTo(cx,cy-hh); c.lineTo(cx+hw,cy); c.lineTo(cx,cy+hh); c.lineTo(cx-hw,cy); c.closePath();
      if (el.fill !== 'none') { c.fillStyle = el.color; c.fill(); }
      c.strokeStyle = el.color; c.lineWidth = el.strokeSize; c.stroke();
    } else if (el.type === 'text') {
      c.fillStyle = el.color;
      c.font = `${el.fontSize}px 'Caveat','Comic Sans MS',cursive`;
      c.textBaseline = 'top';
      el.text.split('\n').forEach((line, i) => c.fillText(line, el.x, el.y + i * el.fontSize * 1.35));
    } else if (el.type === 'image' && el.img) {
      c.drawImage(el.img, el.x, el.y, el.w, el.h);
    }
    c.restore();
  }

  /** Re-render the entire slide bar DOM */
  function renderSlideBar() {
    slideList.innerHTML = '';
    state.slides.forEach((slide, idx) => {
      const thumb = document.createElement('div');
      thumb.className = 'slide-thumb' + (idx === state.currentSlideIdx ? ' active' : '');
      thumb.draggable = true;
      thumb.dataset.idx = idx;

      // Thumbnail canvas
      const tc = document.createElement('canvas');
      tc.width = 256; tc.height = 160;
      thumb.appendChild(tc);

      // Slide number
      const num = document.createElement('div');
      num.className = 'slide-num';
      num.textContent = `Slide ${idx + 1}`;
      thumb.appendChild(num);

      // Bg color dot
      const dot = document.createElement('div');
      dot.className = 'slide-bg-dot';
      dot.style.background = slide.bgColor;
      thumb.appendChild(dot);

      // Delete button (only show if more than 1 slide)
      if (state.slides.length > 1) {
        const del = document.createElement('button');
        del.className = 'slide-delete-btn';
        del.innerHTML = '×';
        del.title = '删除此 Slide';
        del.addEventListener('click', e => {
          e.stopPropagation();
          deleteSlide(idx);
        });
        thumb.appendChild(del);
      }

      // Click to switch
      thumb.addEventListener('click', () => switchToSlide(idx));

      // Drag & drop reorder
      thumb.addEventListener('dragstart', e => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', idx);
        thumb.classList.add('dragging');
      });
      thumb.addEventListener('dragend', () => thumb.classList.remove('dragging'));
      thumb.addEventListener('dragover', e => { e.preventDefault(); thumb.classList.add('drag-over'); });
      thumb.addEventListener('dragleave', () => thumb.classList.remove('drag-over'));
      thumb.addEventListener('drop', e => {
        e.preventDefault();
        thumb.classList.remove('drag-over');
        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
        const toIdx = idx;
        if (fromIdx !== toIdx) reorderSlide(fromIdx, toIdx);
      });

      slideList.appendChild(thumb);
      // Render thumbnail content asynchronously
      requestAnimationFrame(() => renderSlideThumbnail(idx));
    });
  }

  /** Add a new slide */
  function addSlide() {
    const newSlide = createSlide('#ffffff');
    state.slides.push(newSlide);
    switchToSlide(state.slides.length - 1);
  }

  /** Delete slide at index */
  function deleteSlide(idx) {
    if (state.slides.length <= 1) return;
    state.slides.splice(idx, 1);
    const newIdx = Math.min(idx, state.slides.length - 1);
    state.currentSlideIdx = newIdx;
    syncBgColorUI(getBgColor());
    redraw();
    renderSlideBar();
  }

  /** Reorder slides: move fromIdx to toIdx */
  function reorderSlide(fromIdx, toIdx) {
    const moved = state.slides.splice(fromIdx, 1)[0];
    state.slides.splice(toIdx, 0, moved);
    // Adjust currentSlideIdx
    if (state.currentSlideIdx === fromIdx) {
      state.currentSlideIdx = toIdx;
    } else if (fromIdx < state.currentSlideIdx && toIdx >= state.currentSlideIdx) {
      state.currentSlideIdx--;
    } else if (fromIdx > state.currentSlideIdx && toIdx <= state.currentSlideIdx) {
      state.currentSlideIdx++;
    }
    renderSlideBar();
  }

  // Add slide button
  addSlideBtn.addEventListener('click', addSlide);

  // Keyboard: left/right arrow to switch slides (when not editing text)
  document.addEventListener('keydown', e => {
    if (state.textEditMode) return;
    if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
      if (state.currentSlideIdx < state.slides.length - 1) switchToSlide(state.currentSlideIdx + 1);
    }
    if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
      if (state.currentSlideIdx > 0) switchToSlide(state.currentSlideIdx - 1);
    }
  });

  // ===== INIT =====
  // 不在页面加载时自动请求摄像头，手机浏览器要求必须由用户交互触发
  // 默认把 PiP 置为隐藏，等用户点按钮再开启
  webcamPipWrapper.classList.add('pip-hidden');
  syncCamBtnState();
  resizeCanvas();
  renderSlideBar();

  // Set initial cursor
  wrapper.dataset.tool = state.tool;

})();

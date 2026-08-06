const ANALYSIS_COMPARE = {
  active: false,
  baseData: null,
  targetData: null,
  baseFile: null,
  targetFile: null,
  viewerA: null,
  viewerB: null,
  graph: null,
  time: 0,
  speed: 1,
  playing: false,
  animationId: null,
  lastTimestamp: 0,
  displayMode: "side",
};

function getAnalysisMemberForData(data) {
  return getCurrentAnalysisMembers().find(function (member) {
    return member.memberId === data?.memberId ||
      (member.files || []).some(function (file) {
        return file.fileId === data?.fileId;
      });
  }) || null;
}

function showAnalysisComparisonPicker() {
  if (!currentAnalysisData) return;

  const member = getAnalysisMemberForData(currentAnalysisData);
  const files = (member?.files || []).filter(function (file) {
    return file.fileId !== currentAnalysisData.fileId;
  });

  if (!files.length) {
    alert("比較できる別日の分析結果がありません");
    return;
  }

  document.getElementById("analysisComparePicker")?.remove();

  const picker = document.createElement("div");
  picker.id = "analysisComparePicker";
  picker.className = "analysis-compare-picker-backdrop";
  picker.innerHTML = `
    <section class="analysis-compare-picker" role="dialog" aria-modal="true">
      <h3>比較する測定日</h3>
      <p>同じ会員の分析結果から1件選択してください</p>
      <div class="analysis-compare-date-list">
        ${files.map(function (file) {
          return `
            <button type="button" onclick="openAnalysisComparison('${file.fileId}')">
              ${escapeHtml(file.displayDate || file.fileName)}
            </button>
          `;
        }).join("")}
      </div>
      <button class="secondary analysis-compare-cancel" type="button"
        onclick="closeAnalysisComparisonPicker()">キャンセル</button>
    </section>
  `;
  document.body.appendChild(picker);
}

function closeAnalysisComparisonPicker() {
  document.getElementById("analysisComparePicker")?.remove();
}

async function openAnalysisComparison(fileId) {
  if (!currentAnalysisData || !fileId) return;

  const context = findAnalysisContext(fileId);
  const member = getAnalysisMemberForData(currentAnalysisData);
  const sameMember = Boolean(
    context && member && context.member.memberId === member.memberId,
  );

  if (!sameMember) {
    alert("同じ会員の分析結果だけ比較できます");
    return;
  }

  if (!["S001", "S002"].includes(context.courseId)) {
    alert("比較モードは現在スプリントコースの分析に対応しています");
    return;
  }

  closeAnalysisComparisonPicker();
  lockUI("比較データを読み込み中...");

  try {
    let targetData = CACHE.analysisData[fileId];
    if (!targetData) {
      targetData = await apiGet("getAnalysisData", {
        lineUserId: CACHE.profile.userId,
        fileId: fileId,
      });
      if (!targetData.success) {
        throw new Error(targetData.message || "比較データを読み込めませんでした");
      }
      CACHE.analysisData[fileId] = targetData;
    }

    ANALYSIS_COMPARE.baseData = currentAnalysisData;
    ANALYSIS_COMPARE.targetData = targetData;
    ANALYSIS_COMPARE.baseFile = findAnalysisContext(currentAnalysisData.fileId)?.file || null;
    ANALYSIS_COMPARE.targetFile = context.file;
    renderAnalysisComparison();
  } catch (error) {
    console.error(error);
    alert(error.message || "比較データを読み込めませんでした");
  } finally {
    unlockUI();
  }
}

function getCompareDateLabel(file) {
  return String(file?.displayDate || file?.fileName || "測定日不明");
}

function compareNumber(value) {
  const number = Number(value);
  return value !== null && value !== "" && Number.isFinite(number) ? number : null;
}

function formatCompareDifference(baseValue, targetValue, unit) {
  const base = compareNumber(baseValue);
  const target = compareNumber(targetValue);
  if (base === null || target === null) return "-";
  const difference = target - base;
  return `${difference > 0 ? "+" : ""}${difference.toFixed(2)}${unit}`;
}

function createComparisonBasicRows() {
  const a = ANALYSIS_COMPARE.baseData?.basicInfo || {};
  const b = ANALYSIS_COMPARE.targetData?.basicInfo || {};
  const rows = [
    ["ピッチ", "pitch", " 歩/秒"],
    ["ストライド", "stride", " m"],
    ["疾走速度", "speedKmh", " km/h"],
    ["接地時間", "contactTime", " 秒"],
    ["滞空時間", "flightTime", " 秒"],
  ];

  return rows.map(function ([label, key, unit]) {
    return `
      <div class="analysis-compare-basic-row${key === "speedKmh" ? " is-speed" : ""}">
        <strong>${label}</strong>
        <span>${formatBasicAnalysisValue(a[key])}</span>
        <span>${formatBasicAnalysisValue(b[key])}</span>
        <span>${formatCompareDifference(a[key], b[key], unit)}</span>
      </div>
    `;
  }).join("");
}

function renderAnalysisComparison() {
  destroyAnalysisComparison(false);
  ANALYSIS_COMPARE.active = true;

  if (stickViewer) {
    stickViewer.destroy();
    stickViewer = null;
  }

  const a = ANALYSIS_COMPARE.baseData;
  const b = ANALYSIS_COMPARE.targetData;
  const labelA = getCompareDateLabel(ANALYSIS_COMPARE.baseFile);
  const labelB = getCompareDateLabel(ANALYSIS_COMPARE.targetFile);
  const status = document.getElementById("status");
  status.classList.remove("home-screen", "schedule-screen", "admin-screen");
  status.classList.add("analysis-screen");
  status.innerHTML = `
    <section class="card analysis-view-card analysis-compare-view">
      <div class="analysis-compare-header">
        <button class="secondary" type="button" onclick="exitAnalysisComparison()">比較終了</button>
        <div class="analysis-compare-legend">
          <span class="is-a">A ${escapeHtml(labelA)}</span>
          <span class="is-b">B ${escapeHtml(labelB)}</span>
        </div>
      </div>

      <div class="analysis-compare-mode" role="group" aria-label="比較表示">
        <button id="compareModeSide" class="is-active" type="button"
          onclick="changeAnalysisComparisonMode('side')">横並び</button>
        <button id="compareModeOverlay" type="button"
          onclick="changeAnalysisComparisonMode('overlay')">重ね表示</button>
      </div>

      <div id="analysisCompareCanvases" class="analysis-compare-canvases is-side">
        <div class="analysis-compare-canvas-item is-a">
          <b>A</b><canvas id="compareCanvasA" width="720" height="520"></canvas>
        </div>
        <div class="analysis-compare-canvas-item is-b">
          <b>B</b><canvas id="compareCanvasB" width="720" height="520"></canvas>
        </div>
      </div>

      <div class="stick-controls analysis-compare-controls">
        <button class="secondary" type="button" onclick="stepAnalysisComparison(-1)">◀ 戻る</button>
        <button id="comparePlayButton" class="play-button" type="button"
          onclick="toggleAnalysisComparisonPlayback()">再生</button>
        <button class="secondary" type="button" onclick="stepAnalysisComparison(1)">進む ▶</button>
        <span id="compareTimeDisplay">0.00秒</span>
      </div>

      <div class="analysis-tabs" role="tablist">
        <button id="compareTabButton-controls" class="analysis-tab-button is-active"
          type="button" onclick="switchAnalysisComparisonTab('controls')">ボタン</button>
        <button id="compareTabButton-basic" class="analysis-tab-button"
          type="button" onclick="switchAnalysisComparisonTab('basic')">分析結果</button>
        <button id="compareTabButton-graphs" class="analysis-tab-button"
          type="button" onclick="switchAnalysisComparisonTab('graphs')">グラフ</button>
      </div>

      <div id="compareTab-controls" class="analysis-tab-panel is-active">
        <div class="analysis-compare-speed-row">
          <span>再生速度</span>
          <button type="button" onclick="setAnalysisComparisonSpeed(0.5)">0.5</button>
          <button class="is-active" type="button" onclick="setAnalysisComparisonSpeed(1)">1</button>
          <button type="button" onclick="setAnalysisComparisonSpeed(2)">2</button>
        </div>
      </div>

      <div id="compareTab-basic" class="analysis-tab-panel" hidden>
        <div class="analysis-compare-basic-head">
          <strong>項目</strong><span>A</span><span>B</span><span>B－A</span>
        </div>
        ${createComparisonBasicRows()}
      </div>

      <div id="compareTab-graphs" class="analysis-tab-panel" hidden>
        <div class="graph-selector-row analysis-compare-graph-selectors">
          <select id="compareGraphSelect" class="graph-selector"
            onchange="updateAnalysisComparisonGraph()">
            <option value="centerOfMass">重心高</option>
            <option value="jointAngle">関節角度</option>
            <option value="jointAngularVelocity">関節の収縮速度</option>
          </select>
          <select id="compareGraphPartSelect" class="graph-selector graph-part-selector"
            onchange="updateAnalysisComparisonGraph()" hidden>
            <option value="rightElbow">肘関節（右）</option>
            <option value="rightShoulder">肩関節（右）</option>
            <option value="leftElbow">肘関節（左）</option>
            <option value="leftShoulder">肩関節（左）</option>
            <option value="rightHip">股関節（右）</option>
            <option value="rightKnee">膝関節（右）</option>
            <option value="rightAnkle">足関節（右）</option>
            <option value="leftHip">股関節（左）</option>
            <option value="leftKnee">膝関節（左）</option>
            <option value="leftAnkle">足関節（左）</option>
            <option value="forwardLeanAngle">前傾角度</option>
          </select>
        </div>
        <div class="analysis-compare-current-values">
          <span id="compareGraphCurrentA" class="is-a">A -</span>
          <span id="compareGraphCurrentB" class="is-b">B -</span>
        </div>
        <canvas id="compareGraphCanvas" width="720" height="330"></canvas>
      </div>
    </section>
  `;

  ANALYSIS_COMPARE.viewerA = new LightweightStickViewer(
    document.getElementById("compareCanvasA"), null, null, null, a.memberName,
  );
  ANALYSIS_COMPARE.viewerB = new LightweightStickViewer(
    document.getElementById("compareCanvasB"), null, null, null, b.memberName,
  );
  for (const viewer of [ANALYSIS_COMPARE.viewerA, ANALYSIS_COMPARE.viewerB]) {
    viewer.informationVisible = false;
    viewer.transparentBackground = true;
  }
  ANALYSIS_COMPARE.viewerA.setData(a.rows, a.fps, a.centerOfMassPoints, a.movementDirection, a.firstStepFoot);
  ANALYSIS_COMPARE.viewerB.setData(b.rows, b.fps, b.centerOfMassPoints, b.movementDirection, b.firstStepFoot);

  ANALYSIS_COMPARE.graph = new LightweightComparisonLineGraph(
    document.getElementById("compareGraphCanvas"),
    document.getElementById("compareGraphCurrentA"),
    document.getElementById("compareGraphCurrentB"),
  );
  ANALYSIS_COMPARE.time = 0;
  ANALYSIS_COMPARE.speed = 1;
  ANALYSIS_COMPARE.displayMode = "side";
  updateAnalysisComparisonGraph();
  setAnalysisComparisonTime(0);
}

function getAnalysisComparisonDuration() {
  const viewers = [ANALYSIS_COMPARE.viewerA, ANALYSIS_COMPARE.viewerB];
  return Math.max(...viewers.map(function (viewer) {
    return viewer && viewer.frames.length ? (viewer.frames.length - 1) / viewer.fps : 0;
  }));
}

function setAnalysisComparisonTime(seconds) {
  const duration = getAnalysisComparisonDuration();
  ANALYSIS_COMPARE.time = Math.max(0, Math.min(Number(seconds) || 0, duration));

  for (const viewer of [ANALYSIS_COMPARE.viewerA, ANALYSIS_COMPARE.viewerB]) {
    if (!viewer?.frames.length) continue;
    viewer.frameIndex = Math.min(
      viewer.frames.length - 1,
      Math.floor(ANALYSIS_COMPARE.time * viewer.fps),
    );
    viewer.draw();
  }

  ANALYSIS_COMPARE.graph?.setCurrentTime(ANALYSIS_COMPARE.time);
  const display = document.getElementById("compareTimeDisplay");
  if (display) display.textContent = ANALYSIS_COMPARE.time.toFixed(2) + "秒";
}

function toggleAnalysisComparisonPlayback() {
  if (ANALYSIS_COMPARE.playing) stopAnalysisComparisonPlayback();
  else playAnalysisComparison();
}

function playAnalysisComparison() {
  if (ANALYSIS_COMPARE.time >= getAnalysisComparisonDuration()) {
    setAnalysisComparisonTime(0);
  }
  ANALYSIS_COMPARE.playing = true;
  ANALYSIS_COMPARE.lastTimestamp = performance.now();
  updateAnalysisComparisonPlayButton();
  ANALYSIS_COMPARE.animationId = requestAnimationFrame(runAnalysisComparisonFrame);
}

function runAnalysisComparisonFrame(timestamp) {
  if (!ANALYSIS_COMPARE.playing) return;
  const elapsed = Math.max(0, timestamp - ANALYSIS_COMPARE.lastTimestamp) / 1000;
  ANALYSIS_COMPARE.lastTimestamp = timestamp;
  const nextTime = ANALYSIS_COMPARE.time + elapsed * ANALYSIS_COMPARE.speed;
  setAnalysisComparisonTime(nextTime);
  if (ANALYSIS_COMPARE.time >= getAnalysisComparisonDuration()) {
    stopAnalysisComparisonPlayback();
    return;
  }
  ANALYSIS_COMPARE.animationId = requestAnimationFrame(runAnalysisComparisonFrame);
}

function stopAnalysisComparisonPlayback() {
  ANALYSIS_COMPARE.playing = false;
  if (ANALYSIS_COMPARE.animationId !== null) {
    cancelAnimationFrame(ANALYSIS_COMPARE.animationId);
    ANALYSIS_COMPARE.animationId = null;
  }
  updateAnalysisComparisonPlayButton();
}

function updateAnalysisComparisonPlayButton() {
  const button = document.getElementById("comparePlayButton");
  if (button) button.textContent = ANALYSIS_COMPARE.playing ? "一時停止" : "再生";
}

function stepAnalysisComparison(direction) {
  stopAnalysisComparisonPlayback();
  const fpsA = ANALYSIS_COMPARE.viewerA?.fps || 30;
  setAnalysisComparisonTime(ANALYSIS_COMPARE.time + Number(direction) / fpsA);
}

function setAnalysisComparisonSpeed(speed) {
  ANALYSIS_COMPARE.speed = Number(speed) || 1;
  document.querySelectorAll(".analysis-compare-speed-row button").forEach(function (button) {
    button.classList.toggle("is-active", Number(button.textContent) === ANALYSIS_COMPARE.speed);
  });
}

function changeAnalysisComparisonMode(mode) {
  if (!["side", "overlay"].includes(mode)) return;
  ANALYSIS_COMPARE.displayMode = mode;
  const area = document.getElementById("analysisCompareCanvases");
  area?.classList.toggle("is-side", mode === "side");
  area?.classList.toggle("is-overlay", mode === "overlay");
  document.getElementById("compareModeSide")?.classList.toggle("is-active", mode === "side");
  document.getElementById("compareModeOverlay")?.classList.toggle("is-active", mode === "overlay");
}

function switchAnalysisComparisonTab(tabName) {
  for (const name of ["controls", "basic", "graphs"]) {
    const active = name === tabName;
    document.getElementById("compareTabButton-" + name)?.classList.toggle("is-active", active);
    const panel = document.getElementById("compareTab-" + name);
    if (panel) {
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    }
  }
  if (tabName === "graphs") requestAnimationFrame(updateAnalysisComparisonGraph);
}

function getComparisonGraphSeries(data, graphName, partName) {
  if (graphName === "centerOfMass") return data.centerOfMassHeight || [];
  if (graphName === "jointAngle") return data.jointAngles?.[partName] || [];
  return data.jointAngularVelocities?.[partName] || [];
}

function updateAnalysisComparisonGraph() {
  const graphName = document.getElementById("compareGraphSelect")?.value || "centerOfMass";
  const partSelect = document.getElementById("compareGraphPartSelect");
  if (partSelect) partSelect.hidden = graphName === "centerOfMass";
  const partName = partSelect?.value || "rightElbow";
  const settings = graphName === "centerOfMass"
    ? { unit: " m", precision: 3 }
    : graphName === "jointAngle"
      ? { unit: "°", precision: 1 }
      : { unit: "°/s", precision: 1 };
  ANALYSIS_COMPARE.graph?.setData(
    getComparisonGraphSeries(ANALYSIS_COMPARE.baseData, graphName, partName),
    ANALYSIS_COMPARE.baseData.fps,
    getComparisonGraphSeries(ANALYSIS_COMPARE.targetData, graphName, partName),
    ANALYSIS_COMPARE.targetData.fps,
    settings,
  );
  ANALYSIS_COMPARE.graph?.setCurrentTime(ANALYSIS_COMPARE.time);
}

function exitAnalysisComparison() {
  const baseData = ANALYSIS_COMPARE.baseData;
  destroyAnalysisComparison(false);
  if (baseData) renderStickViewer(baseData);
  else returnFromAnalysisResult();
}

function destroyAnalysisComparison(clearData = true) {
  stopAnalysisComparisonPlayback();
  ANALYSIS_COMPARE.viewerA?.destroy();
  ANALYSIS_COMPARE.viewerB?.destroy();
  ANALYSIS_COMPARE.viewerA = null;
  ANALYSIS_COMPARE.viewerB = null;
  ANALYSIS_COMPARE.graph = null;
  ANALYSIS_COMPARE.active = false;
  if (clearData) {
    ANALYSIS_COMPARE.baseData = null;
    ANALYSIS_COMPARE.targetData = null;
    ANALYSIS_COMPARE.baseFile = null;
    ANALYSIS_COMPARE.targetFile = null;
  }
}

class LightweightComparisonLineGraph {
  constructor(canvas, currentA, currentB) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.currentA = currentA;
    this.currentB = currentB;
    this.valuesA = [];
    this.valuesB = [];
    this.fpsA = 30;
    this.fpsB = 30;
    this.time = 0;
    this.unit = "";
    this.precision = 2;
    this.margin = { left: 48, right: 14, top: 16, bottom: 44 };
  }

  normalize(values) {
    return Array.isArray(values) ? values.map(function (value) {
      const number = Number(value);
      return value !== null && value !== "" && Number.isFinite(number) ? number : null;
    }) : [];
  }

  setData(valuesA, fpsA, valuesB, fpsB, settings) {
    this.valuesA = this.normalize(valuesA);
    this.valuesB = this.normalize(valuesB);
    this.fpsA = Number(fpsA) > 0 ? Number(fpsA) : 30;
    this.fpsB = Number(fpsB) > 0 ? Number(fpsB) : 30;
    this.unit = settings?.unit || "";
    this.precision = Number.isInteger(settings?.precision) ? settings.precision : 2;
    this.draw();
  }

  setCurrentTime(time) {
    this.time = Math.max(0, Number(time) || 0);
    this.draw();
  }

  duration() {
    return Math.max(
      this.valuesA.length > 1 ? (this.valuesA.length - 1) / this.fpsA : 0,
      this.valuesB.length > 1 ? (this.valuesB.length - 1) / this.fpsB : 0,
      0.01,
    );
  }

  valueAt(values, fps) {
    if (!values.length) return null;
    return values[Math.min(values.length - 1, Math.floor(this.time * fps))];
  }

  draw() {
    const c = this.context;
    const w = this.canvas.width;
    const h = this.canvas.height;
    c.clearRect(0, 0, w, h);
    c.fillStyle = "#fff";
    c.fillRect(0, 0, w, h);
    const valid = [...this.valuesA, ...this.valuesB].filter(Number.isFinite);
    let min = valid.length ? Math.min(...valid) : 0;
    let max = valid.length ? Math.max(...valid) : 1;
    const span = max - min || Math.max(Math.abs(max), 1) * 0.1;
    min -= span * 0.1;
    max += span * 0.1;
    const left = this.margin.left;
    const right = w - this.margin.right;
    const top = this.margin.top;
    const bottom = h - this.margin.bottom;
    const duration = this.duration();
    const mapX = (time) => left + (time / duration) * (right - left);
    const mapY = (value) => bottom - ((value - min) / (max - min || 1)) * (bottom - top);

    c.font = "11px sans-serif";
    for (let i = 0; i <= 4; i += 1) {
      const y = top + ((bottom - top) * i) / 4;
      const value = max - ((max - min) * i) / 4;
      c.strokeStyle = "#e3e9e7";
      c.beginPath(); c.moveTo(left, y); c.lineTo(right, y); c.stroke();
      c.fillStyle = "#65706c"; c.textAlign = "right"; c.textBaseline = "middle";
      c.fillText(value.toFixed(2), left - 6, y);
    }
    for (let i = 0; i <= 4; i += 1) {
      const time = (duration * i) / 4;
      const x = mapX(time);
      c.fillStyle = "#65706c"; c.textAlign = "center"; c.textBaseline = "top";
      c.fillText(time.toFixed(2), x, bottom + 7);
    }
    c.strokeStyle = "#53605c"; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(left, top); c.lineTo(left, bottom); c.lineTo(right, bottom); c.stroke();
    c.fillStyle = "#53605c"; c.textAlign = "center"; c.textBaseline = "bottom";
    c.fillText("時間（秒）", (left + right) / 2, h - 2);

    const drawSeries = (values, fps, color, dash) => {
      c.save(); c.beginPath(); c.strokeStyle = color; c.lineWidth = 3;
      c.setLineDash(dash); c.lineJoin = "round"; c.lineCap = "round";
      let started = false;
      values.forEach(function (value, index) {
        if (!Number.isFinite(value)) { started = false; return; }
        const x = mapX(index / fps); const y = mapY(value);
        if (!started) { c.moveTo(x, y); started = true; } else c.lineTo(x, y);
      });
      c.stroke(); c.restore();
    };
    drawSeries(this.valuesA, this.fpsA, "#2878b8", []);
    drawSeries(this.valuesB, this.fpsB, "#e07a24", [10, 7]);

    const currentX = mapX(Math.min(this.time, duration));
    c.strokeStyle = "rgba(70, 80, 76, 0.45)"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(currentX, top); c.lineTo(currentX, bottom); c.stroke();

    const valueA = this.valueAt(this.valuesA, this.fpsA);
    const valueB = this.valueAt(this.valuesB, this.fpsB);
    this.currentA.textContent = "A " + (Number.isFinite(valueA) ? valueA.toFixed(this.precision) : "-") + this.unit;
    this.currentB.textContent = "B " + (Number.isFinite(valueB) ? valueB.toFixed(this.precision) : "-") + this.unit;
  }
}

// =======================
// 現在使用する分析会員一覧
// =======================
function getCurrentAnalysisMembers() {
  if (CACHE.analysisViewMode === "admin") {
    return CACHE.adminAnalysisMembers || [];
  }

  return CACHE.analysisMembers || [];
}


// =======================
// 分析画面から戻る
// =======================
function returnFromAnalysisResult() {
  if (CACHE.analysisViewMode === "admin") {
    renderAdminAnalysis();
    return;
  }

  renderHome();
}


// =======================
// 分析結果を開く
// =======================
function findAnalysisContext(fileId) {
  for (const member of getCurrentAnalysisMembers()) {
    const file = (member.files || []).find(function (item) {
      return item.fileId === fileId;
    });

    if (file) {
      return {
        member: member,
        file: file,
        courseId: String(member.courseId || "")
          .trim()
          .toUpperCase(),
      };
    }
  }

  return null;
}


async function openAnalysisResult(fileId) {
  const analysisContext =
    findAnalysisContext(fileId);

  if (!analysisContext) {
    alert(
      "分析結果の会員情報を確認できませんでした",
    );

    return;
  }

  if (
    ["D001", "D002"].includes(
      analysisContext.courseId,
    )
  ) {
    await loadDAnalysisResult(
      analysisContext,
    );

    return;
  }

  if (
    !["S001", "S002"].includes(
      analysisContext.courseId,
    )
  ) {
    alert(
      "会員マスタD列のコースIDを確認してください\n\n現在の設定：" +
        (
          analysisContext.courseId ||
          "空欄"
        ),
    );

    return;
  }

  /*
   * 前のビューアが動いていた場合は停止
   */
  if (stickViewer) {
    stickViewer.destroy();
    stickViewer = null;
  }

  lockUI(
    "分析結果を読み込み中...",
  );

  try {
    let data =
      CACHE.analysisData[fileId];

    /*
     * 未取得の場合だけGASから読み込む
     */
    if (!data) {
      data = await apiGet(
        "getAnalysisData",
        {
          lineUserId:
            CACHE.profile.userId,

          fileId: fileId,
        },
      );

      if (!data.success) {
        throw new Error(
          data.message ||
            "分析結果を読み込めませんでした",
        );
      }

      /*
       * 同じ結果を再度開いた場合に
       * 通信しないようキャッシュ
       */
      CACHE.analysisData[fileId] =
        data;
    }

    renderStickViewer(data);
  } catch (error) {
    console.error(error);

    alert(
      error.message ||
        "分析結果を読み込めませんでした",
    );

    returnFromAnalysisResult();
  } finally {
    unlockUI();
  }
}


// =======================
// 基本分析値の表示
// =======================
function formatBasicAnalysisValue(
  value,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  const numberValue =
    Number(value);

  if (
    !Number.isFinite(
      numberValue,
    )
  ) {
    return "-";
  }

  return numberValue.toFixed(2);
}


// =======================
// 表示中の会員の日付タブ
// =======================
function createAnalysisDateTabsHtml(
  data,
) {
  const member =
    getCurrentAnalysisMembers().find(
      function (item) {
        if (
          data.memberId &&
          item.memberId ===
            data.memberId
        ) {
          return true;
        }

        return (
          item.files || []
        ).some(function (file) {
          return (
            file.fileId ===
            data.fileId
          );
        });
      },
    );

  if (
    !member ||
    !member.files ||
    member.files.length === 0
  ) {
    return "";
  }

  return member.files
    .map(function (file) {
      const isActive =
        file.fileId === data.fileId;

      return `
        <button
          class="analysis-date-tab${
            isActive
              ? " is-active"
              : ""
          }"
          type="button"
          role="tab"
          aria-selected="${String(
            isActive,
          )}"
          title="${escapeHtml(
            file.fileName,
          )}"
          onclick="switchAnalysisDate('${file.fileId}')"
        >
          ${escapeHtml(
            file.displayDate,
          )}
        </button>
      `;
    })
    .join("");
}


async function switchAnalysisDate(
  fileId,
) {
  if (
    !fileId ||
    fileId ===
      currentAnalysisData?.fileId
  ) {
    return;
  }

  /*
   * 日付変更時は対象スプレッドシートの
   * 最新内容を読み直す
   */
  delete CACHE.analysisData[
    fileId
  ];

  delete CACHE.dAnalysisData[
    fileId
  ];

  await openAnalysisResult(
    fileId,
  );
}


// =======================
// スティック画面表示
// =======================
function renderStickViewer(data) {
  currentAnalysisData = data;

  const status =
    document.getElementById(
      "status",
    );

  status.classList.remove(
    "home-screen",
    "schedule-screen",
    "admin-screen",
  );

  status.classList.add(
    "analysis-screen",
  );

  status.innerHTML = `
    <section
      class="
        card
        analysis-view-card
      "
    >
      <div class="stick-header">

        <button
          class="secondary"
          type="button"
          onclick="closeAnalysisResult()"
        >
          戻る
        </button>

        <div
          class="analysis-date-tabs"
          role="tablist"
          aria-label="分析年月日"
        >
          ${createAnalysisDateTabsHtml(
            data,
          )}
        </div>

      </div>

      <div class="stick-canvas-wrap">

        <canvas
          id="stickCanvas"
          width="720"
          height="520"
        ></canvas>

      </div>

      <div class="stick-controls">

        <button
          class="secondary"
          type="button"
          onclick="previousStickFrame()"
        >
          ◀ 1コマ
        </button>

        <button
          id="stickPlayButton"
          class="play-button"
          type="button"
          onclick="toggleStickPlayback()"
        >
          再生
        </button>

        <button
          class="secondary"
          type="button"
          onclick="nextStickFrame()"
        >
          1コマ ▶
        </button>

      </div>

      <div
        class="analysis-tabs"
        role="tablist"
        aria-label="分析メニュー"
      >

        <button
          id="analysisTabButton-controls"
          class="
            analysis-tab-button
            is-active
          "
          type="button"
          role="tab"
          aria-selected="true"
          aria-controls="analysisTab-controls"
          onclick="switchAnalysisTab('controls')"
        >
          ボタン
        </button>

        <button
          id="analysisTabButton-basic"
          class="analysis-tab-button"
          type="button"
          role="tab"
          aria-selected="false"
          aria-controls="analysisTab-basic"
          onclick="switchAnalysisTab('basic')"
        >
          分析結果
        </button>

        <button
          id="analysisTabButton-graphs"
          class="analysis-tab-button"
          type="button"
          role="tab"
          aria-selected="false"
          aria-controls="analysisTab-graphs"
          onclick="switchAnalysisTab('graphs')"
        >
          グラフ
        </button>

      </div>

      <div
        id="analysisTab-controls"
        class="
          analysis-tab-panel
          is-active
        "
        role="tabpanel"
        aria-labelledby="analysisTabButton-controls"
      >

        <div class="stick-settings">

          <div
            class="stick-slider-group"
          >
            <div
              class="stick-slider-head"
            >
              <span>
                表示サイズ
              </span>

              <span
                id="stickZoomValue"
              >
                100%
              </span>
            </div>

            <input
              id="stickZoomSlider"
              class="stick-slider"
              type="range"
              min="50"
              max="200"
              step="10"
              value="100"
              oninput="changeStickZoom(this.value)"
            >
          </div>

          <div
            class="stick-slider-group"
          >
            <div
              class="stick-slider-head"
            >
              <span>
                再生速度
              </span>

              <span
                id="stickSpeedValue"
              >
                1倍
              </span>
            </div>

            <input
              id="stickSpeedSlider"
              class="stick-slider"
              type="range"
              min="0"
              max="4"
              step="1"
              value="2"
              oninput="changeStickSpeed(this.value)"
            >

            <div
              class="speed-scale"
            >
              <span>0.25</span>
              <span>0.5</span>
              <span>1</span>
              <span>2</span>
              <span>4</span>
            </div>
          </div>

        </div>

        <button
          id="stickLoopButton"
          class="stick-loop-button"
          type="button"
          onclick="toggleStickLoop()"
          aria-pressed="false"
        >
          ループ再生：OFF
        </button>

        <button
          id="stickTrajectoryButton"
          class="stick-trajectory-button"
          type="button"
          onclick="toggleStickTrajectory()"
          aria-pressed="false"
        >
          足の軌道：OFF
        </button>

      </div>

      <div
        id="analysisTab-basic"
        class="analysis-tab-panel"
        role="tabpanel"
        aria-labelledby="analysisTabButton-basic"
        hidden
      >

        <div
          class="basic-info-grid"
        >

          <div
            class="basic-info-item"
          >
            <div
              class="basic-info-label"
            >
              ピッチ
            </div>

            <div
              class="basic-info-value"
            >
              ${formatBasicAnalysisValue(
                data.basicInfo?.pitch,
              )}

              <span
                class="basic-info-unit"
              >
                歩/秒
              </span>
            </div>
          </div>

          <div
            class="basic-info-item"
          >
            <div
              class="basic-info-label"
            >
              ストライド
            </div>

            <div
              class="basic-info-value"
            >
              ${formatBasicAnalysisValue(
                data.basicInfo
                  ?.stride,
              )}

              <span
                class="basic-info-unit"
              >
                m
              </span>
            </div>
          </div>

          <div
            class="basic-info-item"
          >
            <div
              class="basic-info-label"
            >
              疾走速度
            </div>

            <div
              class="basic-info-value"
            >
              ${formatBasicAnalysisValue(
                data.basicInfo
                  ?.speedKmh,
              )}

              <span
                class="basic-info-unit"
              >
                km/h
              </span>
            </div>
          </div>

          <div
            class="basic-info-item"
          >
            <div
              class="basic-info-label"
            >
              接地時間
            </div>

            <div
              class="basic-info-value"
            >
              ${formatBasicAnalysisValue(
                data.basicInfo
                  ?.contactTime,
              )}

              <span
                class="basic-info-unit"
              >
                秒
              </span>
            </div>
          </div>

          <div
            class="basic-info-item"
          >
            <div
              class="basic-info-label"
            >
              滞空時間
            </div>

            <div
              class="basic-info-value"
            >
              ${formatBasicAnalysisValue(
                data.basicInfo
                  ?.flightTime,
              )}

              <span
                class="basic-info-unit"
              >
                秒
              </span>
            </div>
          </div>

        </div>

      </div>

      <div
        id="analysisTab-graphs"
        class="analysis-tab-panel"
        role="tabpanel"
        aria-labelledby="analysisTabButton-graphs"
        hidden
      >

        <div
          class="graph-selector-row"
        >

          <select
            id="analysisGraphSelect"
            class="graph-selector"
            onchange="switchAnalysisGraph(this.value)"
          >
            <option
              value="centerOfMass"
            >
              重心高
            </option>

            <option
              value="jointAngle"
            >
              関節角度
            </option>

            <option
              value="jointAngularVelocity"
            >
              関節の収縮速度
            </option>
          </select>

          <select
            id="analysisGraphPartSelect"
            class="
              graph-selector
              graph-part-selector
            "
            onchange="switchAnalysisGraphPart(this.value)"
            hidden
          >
            <option value="rightElbow">
              肘関節（右）
            </option>

            <option value="rightShoulder">
              肩関節（右）
            </option>

            <option value="leftElbow">
              肘関節（左）
            </option>

            <option value="leftShoulder">
              肩関節（左）
            </option>

            <option value="rightHip">
              股関節（右）
            </option>

            <option value="rightKnee">
              膝関節（右）
            </option>

            <option value="rightAnkle">
              足関節（右）
            </option>

            <option value="leftHip">
              股関節（左）
            </option>

            <option value="leftKnee">
              膝関節（左）
            </option>

            <option value="leftAnkle">
              足関節（左）
            </option>

            <option value="forwardLeanAngle">
              前傾角度
            </option>
          </select>

          <button
            id="graphOverlayToggle"
            class="graph-overlay-toggle"
            type="button"
            aria-pressed="true"
            onclick="toggleGraphOverlay()"
          >
            表示 ON
          </button>

        </div>

        <div
          id="analysisGraph-centerOfMass"
          class="
            graph-content-panel
            is-active
          "
        >
          <div
            class="analysis-graph-card"
          >
            <div
              class="analysis-graph-header"
            >
              <span
                id="centerOfMassCurrent"
                class="analysis-graph-current"
              >
                - m
              </span>
            </div>

            <canvas
              id="centerOfMassGraph"
              width="720"
              height="330"
              aria-label="重心高のグラフ"
            ></canvas>
          </div>
        </div>

        <div
          id="analysisGraph-jointAngle"
          class="graph-content-panel"
          hidden
        >
          <div
            class="analysis-graph-card"
          >
            <div
              class="analysis-graph-header"
            >
              <span
                id="jointAngleCurrent"
                class="analysis-graph-current"
              >
                -°
              </span>
            </div>

            <canvas
              id="jointAngleGraph"
              width="720"
              height="330"
              aria-label="関節角度のグラフ"
            ></canvas>
          </div>
        </div>

        <div
          id="analysisGraph-jointAngularVelocity"
          class="graph-content-panel"
          hidden
        >
          <div
            class="analysis-graph-card"
          >
            <div
              class="analysis-graph-header"
            >
              <span
                id="jointContractionVelocityCurrent"
                class="analysis-graph-current"
              >
                -°/s
              </span>
            </div>

            <canvas
              id="jointContractionVelocityGraph"
              width="720"
              height="330"
              aria-label="関節の収縮速度のグラフ"
            ></canvas>
          </div>
        </div>

      </div>

    </section>
  `;

  requestAnimationFrame(
    function () {
      document
        .querySelector(
          ".analysis-date-tab.is-active",
        )
        ?.scrollIntoView({
          behavior: "auto",
          block: "nearest",
          inline: "center",
        });
    },
  );

  stickViewer =
    new LightweightStickViewer(
      document.getElementById(
        "stickCanvas",
      ),

      document.getElementById(
        "stickPlayButton",
      ),

      document.getElementById(
        "stickLoopButton",
      ),

      document.getElementById(
        "stickTrajectoryButton",
      ),

      data.memberName,
    );

  centerOfMassGraph =
    new LightweightLineGraph(
      document.getElementById(
        "centerOfMassGraph",
      ),

      document.getElementById(
        "centerOfMassCurrent",
      ),

      {
        yAxisLabel:
          "重心高（m）",

        unit: " m",

        precision: 3,
      },
    );

  centerOfMassGraph.setData(
    data.centerOfMassHeight,
    data.fps,
  );

  jointAngleGraph =
    new LightweightLineGraph(
      document.getElementById(
        "jointAngleGraph",
      ),

      document.getElementById(
        "jointAngleCurrent",
      ),

      {
        yAxisLabel:
          "関節角度（°）",

        unit: "°",

        precision: 1,
      },
    );

  const selectedPart =
    document.getElementById(
      "analysisGraphPartSelect",
    )?.value || "rightElbow";

  jointAngleGraph.setData(
    data.jointAngles?.[
      selectedPart
    ],

    data.fps,
  );

  jointContractionVelocityGraph =
    new LightweightLineGraph(
      document.getElementById(
        "jointContractionVelocityGraph",
      ),

      document.getElementById(
        "jointContractionVelocityCurrent",
      ),

      {
        yAxisLabel:
          "関節の収縮速度（°/s）",

        unit: "°/s",

        precision: 1,
      },
    );

  jointContractionVelocityGraph.setData(
    data.jointAngularVelocities?.[
      selectedPart
    ],

    data.fps,
  );

  stickViewer.onFrameChange =
    function (frameIndex) {
      centerOfMassGraph
        ?.setCurrentFrame(
          frameIndex,
        );

      jointAngleGraph
        ?.setCurrentFrame(
          frameIndex,
        );

      jointContractionVelocityGraph
        ?.setCurrentFrame(
          frameIndex,
        );
    };

  stickViewer.setData(
    data.rows,
    data.fps,
    data.centerOfMassPoints,
    data.movementDirection,
    data.firstStepFoot,
  );

  updateStickGraphOverlay();
}


// =======================
// 分析結果を閉じる
// =======================
function closeAnalysisResult() {
  if (stickViewer) {
    stickViewer.destroy();
    stickViewer = null;
  }

  centerOfMassGraph = null;
  jointAngleGraph = null;

  jointContractionVelocityGraph =
    null;

  currentAnalysisData = null;

  returnFromAnalysisResult();
}


// =======================
// 分析画面タブ切り替え
// =======================
function switchAnalysisTab(
  tabName,
) {
  const tabNames = [
    "controls",
    "basic",
    "graphs",
  ];

  if (
    !tabNames.includes(tabName)
  ) {
    return;
  }

  for (const name of tabNames) {
    const isActive =
      name === tabName;

    const button =
      document.getElementById(
        "analysisTabButton-" +
          name,
      );

    const panel =
      document.getElementById(
        "analysisTab-" + name,
      );

    if (button) {
      button.classList.toggle(
        "is-active",
        isActive,
      );

      button.setAttribute(
        "aria-selected",
        String(isActive),
      );
    }

    if (panel) {
      panel.classList.toggle(
        "is-active",
        isActive,
      );

      panel.hidden = !isActive;
    }
  }

  updateStickGraphOverlay();

  if (
    tabName === "graphs" &&
    centerOfMassGraph
  ) {
    requestAnimationFrame(
      function () {
        centerOfMassGraph.draw();
      },
    );
  }
}


// =======================
// 表示グラフ切り替え
// =======================
function switchAnalysisGraph(
  graphName,
) {
  const graphNames = [
    "centerOfMass",
    "jointAngle",
    "jointAngularVelocity",
  ];

  if (
    !graphNames.includes(
      graphName,
    )
  ) {
    return;
  }

  const partSelect =
    document.getElementById(
      "analysisGraphPartSelect",
    );

  if (partSelect) {
    partSelect.hidden =
      graphName ===
      "centerOfMass";
  }

  updateStickGraphOverlay();

  for (
    const name of graphNames
  ) {
    const panel =
      document.getElementById(
        "analysisGraph-" + name,
      );

    const isActive =
      name === graphName;

    if (panel) {
      panel.classList.toggle(
        "is-active",
        isActive,
      );

      panel.hidden = !isActive;
    }
  }

  if (
    graphName ===
      "centerOfMass" &&
    centerOfMassGraph
  ) {
    requestAnimationFrame(
      function () {
        centerOfMassGraph.draw();
      },
    );
  }

  if (
    graphName ===
      "jointAngle" &&
    jointAngleGraph
  ) {
    requestAnimationFrame(
      function () {
        jointAngleGraph.draw();
      },
    );
  }

  if (
    graphName ===
      "jointAngularVelocity" &&
    jointContractionVelocityGraph
  ) {
    requestAnimationFrame(
      function () {
        jointContractionVelocityGraph.draw();
      },
    );
  }
}


function switchAnalysisGraphPart(
  partName,
) {
  const selectedGraph =
    document.getElementById(
      "analysisGraphSelect",
    )?.value;

  if (
    selectedGraph ===
      "jointAngle" &&
    jointAngleGraph &&
    currentAnalysisData
  ) {
    jointAngleGraph.setData(
      currentAnalysisData
        .jointAngles?.[partName],

      currentAnalysisData.fps,
    );

    if (stickViewer) {
      jointAngleGraph
        .setCurrentFrame(
          stickViewer.frameIndex,
        );
    }
  }

  if (
    selectedGraph ===
      "jointAngularVelocity" &&
    jointContractionVelocityGraph &&
    currentAnalysisData
  ) {
    jointContractionVelocityGraph
      .setData(
        currentAnalysisData
          .jointAngularVelocities?.[
            partName
          ],

        currentAnalysisData.fps,
      );

    if (stickViewer) {
      jointContractionVelocityGraph
        .setCurrentFrame(
          stickViewer.frameIndex,
        );
    }
  }

  updateStickGraphOverlay();
}


// =======================
// スティック内のグラフ補助表示
// =======================
function toggleGraphOverlay() {
  graphOverlayEnabled =
    !graphOverlayEnabled;

  updateStickGraphOverlay();
}


function updateStickGraphOverlay() {
  const button =
    document.getElementById(
      "graphOverlayToggle",
    );

  const graphsTab =
    document.getElementById(
      "analysisTab-graphs",
    );

  const graphName =
    document.getElementById(
      "analysisGraphSelect",
    )?.value || "centerOfMass";

  const partName =
    document.getElementById(
      "analysisGraphPartSelect",
    )?.value || "rightElbow";

  const graphsAreVisible =
    Boolean(
      graphsTab &&
        !graphsTab.hidden,
    );

  if (button) {
    button.textContent =
      graphOverlayEnabled
        ? "表示 ON"
        : "表示 OFF";

    button.classList.toggle(
      "is-off",
      !graphOverlayEnabled,
    );

    button.setAttribute(
      "aria-pressed",
      String(
        graphOverlayEnabled,
      ),
    );
  }

  if (stickViewer) {
    stickViewer.setGraphOverlay({
      visible:
        graphOverlayEnabled &&
        graphsAreVisible,

      graphName: graphName,

      partName: partName,
    });
  }
}


// =======================
// 再生操作
// =======================
function toggleStickPlayback() {
  if (stickViewer) {
    stickViewer.togglePlay();
  }
}


function nextStickFrame() {
  if (stickViewer) {
    stickViewer.nextFrame();
  }
}


function previousStickFrame() {
  if (stickViewer) {
    stickViewer.previousFrame();
  }
}


// =======================
// ループ再生切り替え
// =======================
function toggleStickLoop() {
  if (stickViewer) {
    stickViewer.toggleLoop();
  }
}


// =======================
// つま先軌道表示切り替え
// =======================
function toggleStickTrajectory() {
  if (stickViewer) {
    stickViewer
      .toggleFootTrajectory();
  }
}


// =======================
// 表示倍率変更
// =======================
function changeStickZoom(value) {
  if (!stickViewer) {
    return;
  }

  const percent =
    Number(value);

  stickViewer.setZoom(
    percent,
  );

  const display =
    document.getElementById(
      "stickZoomValue",
    );

  if (display) {
    display.textContent =
      percent + "%";
  }
}


// =======================
// 再生速度変更
// =======================
function changeStickSpeed(index) {
  if (!stickViewer) {
    return;
  }

  const speedList = [
    0.25,
    0.5,
    1,
    2,
    4,
  ];

  const selectedSpeed =
    speedList[Number(index)] ||
    1;

  stickViewer.setPlaySpeed(
    selectedSpeed,
  );

  const display =
    document.getElementById(
      "stickSpeedValue",
    );

  if (display) {
    display.textContent =
      selectedSpeed + "倍";
  }
}

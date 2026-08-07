// =======================
// Dコース分析データ取得
// =======================
async function loadDAnalysisResult(
  analysisContext,
) {
  if (stickViewer) {
    stickViewer.destroy();
    stickViewer = null;
  }

  lockUI(
    "分析結果を読み込み中...",
  );

  try {
    let data =
      CACHE.dAnalysisData[
        analysisContext.file.fileId
      ];

    if (!data) {
      data = await apiGet(
        "getDAnalysisData",
        {
          lineUserId:
            CACHE.profile.userId,

          fileId:
            analysisContext.file.fileId,
        },
      );

      if (!data.success) {
        throw new Error(
          data.message ||
            "Dコース分析結果を読み込めませんでした",
        );
      }

      CACHE.dAnalysisData[
        analysisContext.file.fileId
      ] = data;
    }

    renderDAnalysisViewer(
      data,
    );
  } catch (error) {
    console.error(error);

    alert(
      error.message ||
        "Dコース分析結果を読み込めませんでした",
    );

    returnFromAnalysisResult();
  } finally {
    unlockUI();
  }
}


// =======================
// Dコース5局面表示
// =======================
function renderDAnalysisViewer(
  data,
) {
  centerOfMassGraph =
    null;

  jointAngleGraph =
    null;

  jointContractionVelocityGraph =
    null;

  currentAnalysisData =
    data;

  const status =
    document.getElementById(
      "status",
    );

  status.classList.remove(
    "home-screen",
    "schedule-screen",
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

      <div class="d-analysis-scroll">
        <canvas
          id="dOverviewCanvas"
          class="d-overview-canvas"
          width="1250"
          height="500"
          aria-label="1歩目から3歩目までの接地・離地スティック"
        ></canvas>
      </div>

      <div
        class="
          analysis-tabs
          d-analysis-tabs
        "
      >
        <button
          id="dAnalysisTabButton-basic"
          class="
            analysis-tab-button
            is-active
          "
          type="button"
          onclick="switchDAnalysisTab('basic')"
        >
          分析結果
        </button>

        <button
          id="dAnalysisTabButton-comments"
          class="analysis-tab-button"
          type="button"
          onclick="switchDAnalysisTab('comments')"
        >
          コメント
        </button>
      </div>

      <div
        id="dAnalysisTab-basic"
        class="
          analysis-tab-panel
          is-active
        "
      >
        <div
          class="d-analysis-result-title"
        >
          分析結果
        </div>

        <div class="basic-info-grid">
          <div class="basic-info-item">
            <div class="basic-info-label">
              ピッチ
            </div>

            <div class="basic-info-value">
              ${formatBasicAnalysisValue(
                data.basicInfo?.pitch,
              )}

              <span class="basic-info-unit">
                歩/秒
              </span>
            </div>
          </div>

          <div class="basic-info-item">
            <div class="basic-info-label">
              ストライド
            </div>

            <div class="basic-info-value">
              ${formatBasicAnalysisValue(
                data.basicInfo?.stride,
              )}

              <span class="basic-info-unit">
                m
              </span>
            </div>
          </div>

          <div class="basic-info-item">
            <div class="basic-info-label">
              疾走速度
            </div>

            <div class="basic-info-value">
              ${formatBasicAnalysisValue(
                data.basicInfo?.speedKmh,
              )}

              <span class="basic-info-unit">
                km/h
              </span>
            </div>
          </div>

          <div class="basic-info-item">
            <div class="basic-info-label">
              接地時間
            </div>

            <div class="basic-info-value">
              ${formatBasicAnalysisValue(
                data.basicInfo?.contactTime,
              )}

              <span class="basic-info-unit">
                秒
              </span>
            </div>
          </div>

          <div class="basic-info-item">
            <div class="basic-info-label">
              滞空時間
            </div>

            <div class="basic-info-value">
              ${formatBasicAnalysisValue(
                data.basicInfo?.flightTime,
              )}

              <span class="basic-info-unit">
                秒
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        id="dAnalysisTab-comments"
        class="analysis-tab-panel"
        hidden
      >
        ${createAnalysisCommentPanelHtml(
          data.fileId,
          "dAnalysisCommentPanel",
        )}
      </div>
    </section>
  `;

  const canvas =
    document.getElementById(
      "dOverviewCanvas",
    );

  if (canvas) {
    drawDStickOverview(
      canvas,
      data.poses || [],
      data.movementDirection,
    );
  }
}


// =======================
// Dコースタブ切り替え
// =======================
function switchDAnalysisTab(
  tabName,
) {
  if (
    ![
      "basic",
      "comments",
    ].includes(tabName)
  ) {
    return;
  }

  for (
    const name of [
      "basic",
      "comments",
    ]
  ) {
    const isActive =
      name === tabName;

    const button =
      document.getElementById(
        "dAnalysisTabButton-" +
          name,
      );

    const panel =
      document.getElementById(
        "dAnalysisTab-" +
          name,
      );

    if (button) {
      button.classList.toggle(
        "is-active",
        isActive,
      );
    }

    if (panel) {
      panel.classList.toggle(
        "is-active",
        isActive,
      );

      panel.hidden =
        !isActive;
    }
  }

  if (
    tabName === "comments"
  ) {
    loadAnalysisComment(
      "dAnalysisCommentPanel",
    );
  }
}


// =======================
// Dコース5局面描画
// =======================
function drawDStickOverview(
  canvas,
  poses,
  movementDirection,
) {
  const context =
    canvas.getContext("2d");

  context.fillStyle =
    "#ffffff";

  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const chronologicalDefinitions = [
    {
      stepNumber: 1,
      phase: "接地",
    },
    {
      stepNumber: 1,
      phase: "離地",
    },
    {
      stepNumber: 2,
      phase: "接地",
    },
    {
      stepNumber: 2,
      phase: "離地",
    },
    {
      stepNumber: 3,
      phase: "接地",
    },
  ];

  const movesLeft =
    String(
      movementDirection || "",
    ).includes("左");

  const orderedDefinitions =
    movesLeft
      ? chronologicalDefinitions
          .slice()
          .reverse()
      : chronologicalDefinitions;

  const slotWidth =
    canvas.width /
    orderedDefinitions.length;

  const groundY =
    canvas.height - 34;

  context.textAlign =
    "center";

  context.textBaseline =
    "middle";

  context.fillStyle =
    "#111111";

  context.font =
    "bold 30px sans-serif";

  [
    1,
    2,
    3,
  ].forEach(
    function (stepNumber) {
      const matchingSlots =
        [];

      orderedDefinitions.forEach(
        function (
          definition,
          slotIndex,
        ) {
          if (
            definition.stepNumber ===
            stepNumber
          ) {
            matchingSlots.push(
              slotIndex + 0.5,
            );
          }
        },
      );

      if (
        matchingSlots.length >
        0
      ) {
        const centerSlot =
          matchingSlots.reduce(
            function (
              sum,
              value,
            ) {
              return (
                sum +
                value
              );
            },
            0,
          ) /
          matchingSlots.length;

        context.fillText(
          stepNumber +
            "歩目",
          slotWidth *
            centerSlot,
          31,
        );
      }
    },
  );

  orderedDefinitions.forEach(
    function (
      definition,
      slotIndex,
    ) {
      const pose =
        poses.find(
          function (item) {
            return (
              Number(
                item.stepNumber,
              ) ===
                definition.stepNumber &&
              String(
                item.phase,
              ) ===
                definition.phase
            );
          },
        );

      context.fillStyle =
        "#52605c";

      context.font =
        "bold 20px sans-serif";

      context.fillText(
        definition.phase,
        slotWidth *
          (
            slotIndex +
            0.5
          ),
        64,
      );

      if (pose) {
        drawDStickPoseInSlot(
          context,
          pose.row,
          slotWidth *
            slotIndex,
          slotWidth,
          82,
          groundY,
        );
      }
    },
  );

  context.beginPath();

  context.moveTo(
    8,
    groundY + 1,
  );

  context.lineTo(
    canvas.width - 8,
    groundY + 1,
  );

  context.lineWidth =
    3;

  context.strokeStyle =
    "#111111";

  context.stroke();
}


// =======================
// Dコース1体分の描画
// =======================
function drawDStickPoseInSlot(
  context,
  row,
  slotLeft,
  slotWidth,
  topY,
  groundY,
) {
  const joints =
    [];

  for (
    let column = 0;
    column < 46;
    column += 2
  ) {
    const rawX =
      row?.[column];

    const rawY =
      row?.[
        column + 1
      ];

    const x =
      rawX === null ||
      rawX === "" ||
      rawX === undefined
        ? NaN
        : Number(rawX);

    const y =
      rawY === null ||
      rawY === "" ||
      rawY === undefined
        ? NaN
        : Number(rawY);

    joints.push(
      Number.isFinite(x) &&
        Number.isFinite(y)
        ? {
            x: x,
            y: y,
          }
        : null,
    );
  }

  const validPoints =
    joints.filter(
      Boolean,
    );

  if (
    validPoints.length ===
    0
  ) {
    return;
  }

  const xValues =
    validPoints.map(
      function (point) {
        return point.x;
      },
    );

  const yValues =
    validPoints.map(
      function (point) {
        return point.y;
      },
    );

  const minX =
    Math.min(
      ...xValues,
    );

  const maxX =
    Math.max(
      ...xValues,
    );

  const minY =
    Math.min(
      ...yValues,
    );

  const maxY =
    Math.max(
      ...yValues,
    );

  const width =
    Math.max(
      maxX - minX,
      0.01,
    );

  const height =
    Math.max(
      maxY - minY,
      0.01,
    );

  const scale =
    Math.min(
      (
        slotWidth -
        34
      ) /
        width,

      (
        groundY -
        topY
      ) /
        height,
    );

  const centerX =
    (
      minX +
      maxX
    ) /
    2;

  function toCanvas(
    point,
  ) {
    return {
      x:
        slotLeft +
        slotWidth /
          2 +
        (
          point.x -
          centerX
        ) *
          scale,

      y:
        groundY -
        (
          point.y -
          minY
        ) *
          scale,
    };
  }

  context.strokeStyle =
    "#111111";

  context.lineWidth =
    3;

  context.lineCap =
    "round";

  context.lineJoin =
    "round";

  for (
    const bone of
    STICK_BONES
  ) {
    const firstPoint =
      joints[
        bone[0]
      ];

    const secondPoint =
      joints[
        bone[1]
      ];

    if (
      !firstPoint ||
      !secondPoint
    ) {
      continue;
    }

    const start =
      toCanvas(
        firstPoint,
      );

    const end =
      toCanvas(
        secondPoint,
      );

    context.beginPath();

    context.moveTo(
      start.x,
      start.y,
    );

    context.lineTo(
      end.x,
      end.y,
    );

    context.stroke();
  }

  for (
    const point of
    validPoints
  ) {
    const position =
      toCanvas(
        point,
      );

    context.beginPath();

    context.arc(
      position.x,
      position.y,
      5,
      0,
      Math.PI * 2,
    );

    context.fillStyle =
      "#ff5252";

    context.fill();
  }
}

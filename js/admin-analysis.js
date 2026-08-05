// =======================
// 管理者用分析一覧状態
// =======================
const ADMIN_ANALYSIS_STATE = {
  selectedCourseGroup: "D",
};


// =======================
// 管理者用分析一覧を開く
// =======================
async function showAdminAnalysis() {
  if (
    !CACHE.isAdmin ||
    !CACHE.admin
  ) {
    alert(
      "管理者権限がありません",
    );

    return;
  }

  CACHE.analysisViewMode =
    "admin";

  lockUI(
    "全会員の分析結果を取得中...",
  );

  try {
    if (
      !CACHE.adminAnalysisMembers
    ) {
      const data =
        await apiGet(
          "getAdminAnalysisFileList",
          {
            lineUserId:
              CACHE.profile.userId,
          },
        );

      if (!data.success) {
        throw new Error(
          data.message ||
            "分析結果を取得できませんでした",
        );
      }

      CACHE.adminAnalysisMembers =
        data.members || [];
    }

    renderAdminAnalysis();
  } catch (error) {
    console.error(error);

    alert(
      error.message ||
        "分析結果を取得できませんでした",
    );

    leaveAdminAnalysis();
  } finally {
    unlockUI();
  }
}


// =======================
// 管理者用分析一覧描画
// =======================
function renderAdminAnalysis() {
  CACHE.analysisViewMode =
    "admin";

  const status =
    document.getElementById(
      "status",
    );

  status.classList.remove(
    "home-screen",
    "analysis-screen",
    "schedule-screen",
  );

  status.classList.add(
    "admin-screen",
  );

  const group =
    ADMIN_ANALYSIS_STATE
      .selectedCourseGroup;

  const members =
    (
      CACHE.adminAnalysisMembers ||
      []
    ).filter(
      function (member) {
        return String(
          member.courseId || "",
        )
          .trim()
          .toUpperCase()
          .startsWith(group);
      },
    );

  const membersHtml =
    members.length
      ? members.map(
          createAdminAnalysisMemberHtml,
        ).join("")
      : `
        <div class="admin-analysis-empty">
          対象会員はいません
        </div>
      `;

  status.innerHTML = `
    <div
      class="
        admin-page
        admin-analysis-page
      "
    >

      <div class="admin-analysis-toolbar">

        <button
          class="admin-analysis-back"
          type="button"
          onclick="leaveAdminAnalysis()"
        >
          戻る
        </button>

        <h2>
          全会員の分析結果
        </h2>

        <span></span>

      </div>

      <div
        class="admin-analysis-course-tabs"
        role="tablist"
        aria-label="コース選択"
      >

        <button
          class="
            admin-analysis-course-tab
            ${
              group === "D"
                ? "is-active"
                : ""
            }
          "
          type="button"
          onclick="changeAdminAnalysisGroup('D')"
        >
          ダッシュ
        </button>

        <button
          class="
            admin-analysis-course-tab
            ${
              group === "S"
                ? "is-active"
                : ""
            }
          "
          type="button"
          onclick="changeAdminAnalysisGroup('S')"
        >
          スプリント
        </button>

      </div>

      <div class="admin-analysis-member-list">
        ${membersHtml}
      </div>

    </div>
  `;
}


// =======================
// 会員別分析結果
// =======================
function createAdminAnalysisMemberHtml(
  member,
) {
  const files =
    member.files || [];

  const filesHtml =
    files.length
      ? files.map(
          function (file) {
            return `
              <button
                class="admin-analysis-file-button"
                type="button"
                title="${escapeHtml(file.fileName)}"
                onclick="openAnalysisResult('${file.fileId}')"
              >
                ${escapeHtml(file.displayDate)}
              </button>
            `;
          },
        ).join("")
      : `
        <p class="admin-analysis-no-file">
          分析結果はありません
        </p>
      `;

  const isDash =
    String(member.courseId)
      .toUpperCase()
      .startsWith("D");

  return `
    <article
      class="
        admin-analysis-member-card
        ${isDash ? "is-dash" : ""}
      "
    >

      <h3 class="admin-analysis-member-name">
        ${escapeHtml(member.memberName)}
      </h3>

      <p class="admin-analysis-member-class">
        ${escapeHtml(member.courseId)}
      </p>

      <div class="admin-analysis-file-list">
        ${filesHtml}
      </div>

    </article>
  `;
}


// =======================
// コース切り替え
// =======================
function changeAdminAnalysisGroup(
  group,
) {
  if (
    group !== "D" &&
    group !== "S"
  ) {
    return;
  }

  ADMIN_ANALYSIS_STATE
    .selectedCourseGroup =
    group;

  renderAdminAnalysis();
}


// =======================
// 一覧を再読み込み
// =======================
async function reloadAdminAnalysis() {
  CACHE.adminAnalysisMembers =
    null;

  await showAdminAnalysis();
}


// =======================
// 管理者分析を閉じる
// =======================
function leaveAdminAnalysis() {
  CACHE.analysisViewMode =
    "member";

  showAdminHome();
}

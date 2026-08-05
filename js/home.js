// =======================
      // ホーム画面の読み込み
      // =======================
      async function loadHome() {
        lockUI("会員情報を取得中...");

        try {
// =====================
// 会員情報取得
// =====================
if (!CACHE.members) {
  const memberData =
    await apiGet(
      "getMembersByLineId",
      {
        lineUserId:
          CACHE.profile.userId,
      },
    );

  if (!memberData.success) {
    throw new Error(
      memberData.message ||
        "会員情報を取得できませんでした",
    );
  }

  CACHE.members =
    memberData.members || [];

  /*
   * app.jsで管理者情報を取得できていない場合の
   * 予備処理
   */
  if (CACHE.isAdmin === null) {
    CACHE.isAdmin =
      Boolean(
        memberData.isAdmin,
      );
  }

  if (
    !CACHE.admin &&
    memberData.admin
  ) {
    CACHE.admin =
      memberData.admin;
  }
}


// =====================
// 管理者情報の予備取得
// =====================
if (
  CACHE.isAdmin === null ||
  (
    CACHE.isAdmin &&
    !CACHE.admin
  )
) {
  try {
    const adminData =
      await apiGet(
        "getAdminByLineId",
        {
          lineUserId:
            CACHE.profile.userId,
        },
      );

    CACHE.isAdmin =
      Boolean(
        adminData.success &&
        adminData.isAdmin,
      );

    CACHE.admin =
      CACHE.isAdmin
        ? adminData.admin
        : null;
  } catch (error) {
    console.error(
      "管理者判定の取得エラー",
      error,
    );

    CACHE.isAdmin = false;
    CACHE.admin = null;
  }
}

          // =====================
          // 分析ファイル一覧取得
          // =====================
          if (!CACHE.analysisMembers) {
            try {
              const analysisData = await apiGet("getAnalysisFileList", {
                lineUserId: CACHE.profile.userId,
              });

              if (analysisData.success) {
                CACHE.analysisMembers = analysisData.members || [];

                CACHE.analysisError = null;
              } else {
                CACHE.analysisMembers = [];

                CACHE.analysisError =
                  analysisData.message || "分析結果を取得できませんでした";

                alert("分析ファイル取得失敗\n\n" + CACHE.analysisError);
              }
            } catch (error) {
              console.error("分析結果一覧の取得エラー", error);

              CACHE.analysisMembers = [];

              CACHE.analysisError = "分析結果を取得できませんでした";

              alert("分析API通信エラー\n\n" + error.message);
            }
          }

          renderHome();
        } finally {
          unlockUI();
        }
      }

      // =======================
      // ホーム画面
      // =======================
      function renderHome() {
CACHE.analysisViewMode =
  "member";
            
document
  .getElementById("status")
  .classList.remove(
    "analysis-screen",
    "schedule-screen",
    "admin-screen",
  );
        document.getElementById("status").classList.add("home-screen");

        const membersHtml = CACHE.members.length
          ? CACHE.members
              .map(
                (member) => `
              <li class="home-member-chip">
                ${escapeHtml(member.name)}
              </li>
            `,
              )
              .join("")
          : `
          <li class="home-member-chip">
            登録会員はいません
          </li>
        `;

        const analysisHtml = createAnalysisListHtml();
const adminButtonHtml =
  CACHE.isAdmin &&
  CACHE.admin
    ? `
      <button
        class="admin-link-button"
        type="button"
        onclick="showAdminHome()"
      >
        管理者画面
      </button>
    `
    : "";

        document.getElementById("status").innerHTML = `

      <section class="card home-card home-greeting">

        <div class="home-greeting-head">
          <h2>
            こんにちは
            ${escapeHtml(CACHE.profile.displayName)}
            さま
          </h2>
          ${adminButtonHtml}
        </div>

        <div class="home-member-row">
          <p class="home-member-label">登録会員</p>
          <ul class="home-member-list" aria-label="登録会員">
            ${membersHtml}
          </ul>
        </div>

      </section>

      <section class="card home-card home-analysis">

        <h3 class="home-section-title">最新の動作分析結果</h3>

        ${analysisHtml}

      </section>

      <section class="card home-card home-schedule">

        <h3>
          スクールスケジュール
        </h3>

        <button
          onclick="showSchedule()"
        >
          カレンダーを見る
        </button>

      </section>
    `;
      }

      // =======================
      // 動作分析結果一覧の作成
      // =======================
      function createAnalysisListHtml() {
        if (CACHE.analysisError) {
          return `
      <div class="analysis-member-carousel">
        <div class="analysis-member-slide">
          <p class="muted">${escapeHtml(CACHE.analysisError)}</p>
          <button onclick="reloadAnalysisList()">再読み込み</button>
        </div>
      </div>
    `;
        }

        if (!CACHE.analysisMembers || CACHE.analysisMembers.length === 0) {
          return `
      <div class="analysis-member-carousel">
        <div class="analysis-member-slide">
          <p class="muted">現在、表示できる分析結果はありません</p>
        </div>
      </div>
    `;
        }

        let html = '<div class="analysis-member-carousel" aria-label="会員別の分析結果">';

        for (const member of CACHE.analysisMembers) {
          html += `
      <article class="analysis-member-slide">
        <h4>${escapeHtml(member.memberName)}</h4>
    `;

          if (!member.files || member.files.length === 0) {
            html += `
        <p class="muted">
          分析結果はありません
        </p>
      `;
          } else {
            html += `
        <div>
      `;

            for (const file of member.files.slice(0, 1)) {
              html += `
          <div class="analysis-latest-result">
            <div class="analysis-result-date">
              ${escapeHtml(file.displayDate)}
            </div>

<button
  class="analysis-result-button"
  onclick="openAnalysisResult('${file.fileId}')"
>
  結果を見る
</button>

          </div>
        `;
            }

            html += `
        </div>
      `;
          }

          html += `
      </article>
    `;
        }

        html += "</div>";

        return html;
      }

      // =======================
      // 分析結果一覧の再読み込み
      // =======================
      async function reloadAnalysisList() {
        CACHE.analysisMembers = null;
        CACHE.analysisError = null;

        await loadHome();
      }

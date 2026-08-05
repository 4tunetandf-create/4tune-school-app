// =======================
// 管理者ホーム
// =======================
function showAdminHome() {
  if (
    !CACHE.isAdmin ||
    !CACHE.admin
  ) {
    alert(
      "管理者権限を確認できません",
    );

    return;
  }

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

  const roleLabel =
    CACHE.admin.role === "owner"
      ? "OWNER"
      : "ADMIN";

  status.innerHTML = `
    <div class="admin-page">

      <header class="admin-header">

        <div class="admin-header-top">

          <h2>
            管理者画面
          </h2>

          <span class="admin-role-badge">
            ${escapeHtml(roleLabel)}
          </span>

        </div>

        <p class="admin-user-name">
          ${escapeHtml(CACHE.admin.name)}
        </p>

      </header>

      <section class="card admin-menu-card">

        <h3 class="admin-menu-title">
          管理メニュー
        </h3>

        <div class="admin-menu-grid">

<button
  class="admin-menu-button"
  type="button"
  onclick="showAdminSchedule()"
>
            <span class="admin-menu-icon">
              📅
            </span>

            <span class="admin-menu-label">
              スケジュール
            </span>

            <span class="admin-menu-description">
              予定の確認・登録・変更
            </span>
          </button>

<button
  class="admin-menu-button"
  type="button"
  onclick="showAdminAttendance()"
>
            <span class="admin-menu-icon">
              📝
            </span>

<span class="admin-menu-label">
  出欠・振替
</span>

<span class="admin-menu-description">
  出席・欠席・振替参加を管理
</span>
          </button>

<button
  class="
    admin-menu-button
    is-pending
  "
  type="button"
  disabled
  aria-disabled="true"
>
  <span class="admin-menu-icon">
    💴
  </span>

  <span class="admin-menu-label">
    月謝
  </span>

  <span class="admin-menu-description">
    会計方針を検討中
  </span>
</button>

          <button
            class="
              admin-menu-button
              admin-analysis-button
            "
            type="button"
            onclick="openAdminSection('analysis')"
          >
            <span class="admin-menu-icon">
              📊
            </span>

            <span class="admin-menu-label">
              全会員の分析結果
            </span>

            <span class="admin-menu-description">
              全会員のS・Dコース分析結果を確認
            </span>
          </button>

        </div>

      </section>

      <button
        class="
          secondary
          admin-home-button
        "
        type="button"
        onclick="renderHome()"
      >
        通常ホームへ戻る
      </button>

    </div>
  `;
}


// =======================
// 未実装の管理画面
// =======================
function openAdminSection(
  sectionName,
) {
  if (
    !CACHE.isAdmin ||
    !CACHE.admin
  ) {
    alert(
      "管理者権限がありません",
    );

    return;
  }

  const sectionLabels = {
    payment:
      "月謝管理",

    analysis:
      "全会員の分析結果",
  };

  const label =
    sectionLabels[sectionName];

  if (!label) {
    return;
  }

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

  status.innerHTML = `
    <section
      class="
        card
        admin-coming-soon
      "
    >
      <h2>
        ${escapeHtml(label)}
      </h2>

      <p class="muted">
        この機能は次の工程で追加します
      </p>

      <button
        class="admin-home-button"
        type="button"
        onclick="showAdminHome()"
      >
        管理者ホームへ戻る
      </button>
    </section>
  `;
}

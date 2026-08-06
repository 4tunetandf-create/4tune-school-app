// =======================
// 会員登録用コース一覧
// =======================
const REGISTRATION_COURSES = [
  {
    value: "S001",
    label: "S001",
  },
  {
    value: "S002",
    label: "S002",
  },
  {
    value: "D001",
    label: "D001",
  },
  {
    value: "D002",
    label: "D002",
  },
];


// =======================
// コース選択肢HTML
// =======================
function createRegistrationCourseOptionsHtml(
  selectedCourseId = "",
) {
  const placeholderHtml = `
    <option value="">
      コースを選択
    </option>
  `;

  const optionsHtml =
    REGISTRATION_COURSES
      .map(
        function (course) {
          const selected =
            course.value ===
            selectedCourseId
              ? "selected"
              : "";

          return `
            <option
              value="${escapeHtml(course.value)}"
              ${selected}
            >
              ${escapeHtml(course.label)}
            </option>
          `;
        },
      )
      .join("");

  return (
    placeholderHtml +
    optionsHtml
  );
}

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

      <section
        class="
          card
          admin-menu-card
        "
      >

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
            onclick="showAdminAnalysis()"
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

        <button
          class="admin-registration-band"
          type="button"
          onclick="showAdminRegistration()"
        >
          <span
            class="admin-registration-band-icon"
            aria-hidden="true"
          >
            👤＋
          </span>

          <span class="admin-registration-band-copy">

            <span class="admin-menu-label">
              会員登録管理
            </span>

            <span class="admin-menu-description">
              確認待ちの承認・事前登録・登録コード管理
            </span>

          </span>

          <span
            class="admin-registration-band-arrow"
            aria-hidden="true"
          >
            ›
          </span>
        </button>

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
// 会員登録管理を開く
// =======================
async function showAdminRegistration(
  forceReload = false,
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

  lockUI(
    "会員登録情報を取得中...",
  );

  try {
    if (
      forceReload ||
      !CACHE.adminRegistrationData
    ) {
      const data =
        await apiGet(
          "getAdminRegistrationData",
          {
            lineUserId:
              CACHE.profile.userId,
          },
        );

      if (!data.success) {
        throw new Error(
          data.message ||
            "会員登録情報を取得できませんでした",
        );
      }

      CACHE.adminRegistrationData =
        data;
    }

    renderAdminRegistration();
  } catch (error) {
    alert(
      error.message,
    );
  } finally {
    unlockUI();
  }
}


// =======================
// 会員登録管理画面
// =======================
function renderAdminRegistration() {
  const data =
    CACHE.adminRegistrationData ||
    {};

  const pending =
    data.pending ||
    [];

  const unlinked =
    data.unlinked ||
    [];

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
    <div
      class="
        admin-page
        admin-registration-page
      "
    >

      <header class="admin-registration-header">

        <button
          class="secondary"
          type="button"
          onclick="showAdminHome()"
        >
          ← 戻る
        </button>

        <div>
          <h2>
            会員登録管理
          </h2>

          <p>
            確認待ち ${pending.length}件・
            LINE未連携 ${unlinked.length}件
          </p>
        </div>

      </header>

      <div
        class="admin-registration-tabs"
        role="tablist"
      >

        <button
          class="is-active"
          type="button"
          data-registration-tab="pending"
          onclick="
            switchAdminRegistrationTab(
              'pending'
            )
          "
        >
          確認待ち
        </button>

        <button
          class="secondary"
          type="button"
          data-registration-tab="create"
          onclick="
            switchAdminRegistrationTab(
              'create'
            )
          "
        >
          事前登録
        </button>

        <button
          class="secondary"
          type="button"
          data-registration-tab="codes"
          onclick="
            switchAdminRegistrationTab(
              'codes'
            )
          "
        >
          コード管理
        </button>

      </div>

      <section
        id="adminRegistrationPending"
        class="admin-registration-panel"
      >
        ${
          createPendingRegistrationHtml(
            pending,
          )
        }
      </section>

      <section
        id="adminRegistrationCreate"
        class="admin-registration-panel"
        hidden
      >
        ${
          createPreRegistrationFormHtml()
        }
      </section>

      <section
        id="adminRegistrationCodes"
        class="admin-registration-panel"
        hidden
      >
        ${
          createRegistrationCodesHtml(
            unlinked,
          )
        }
      </section>

    </div>
  `;
}


// =======================
// 登録管理タブ切り替え
// =======================
function switchAdminRegistrationTab(
  tabName,
) {
  const names = [
    "pending",
    "create",
    "codes",
  ];

  for (
    const name of names
  ) {
    const panelId =
      `adminRegistration${
        name[0].toUpperCase()
      }${
        name.slice(1)
      }`;

    const panel =
      document.getElementById(
        panelId,
      );

    const button =
      document.querySelector(
        `[data-registration-tab="${name}"]`,
      );

    const active =
      name === tabName;

    if (panel) {
      panel.hidden =
        !active;
    }

    if (button) {
      button.classList.toggle(
        "is-active",
        active,
      );

      button.classList.toggle(
        "secondary",
        !active,
      );
    }
  }
}


// =======================
// 確認待ち一覧HTML
// =======================
function createPendingRegistrationHtml(
  items,
) {
  if (!items.length) {
    return `
      <div class="admin-registration-empty">
        現在、確認待ちの申請はありません
      </div>
    `;
  }

  return items
    .map(
      function (item) {
        const membersHtml =
          (
            item.members ||
            []
          )
            .map(
              function (member) {
                return `
                  <label>

                    <span>
                      ${
                        escapeHtml(
                          member.memberName,
                        )
                      }
                    </span>

                    <select
                      class="admin-approval-class"
                      data-member-id="${
                        escapeHtml(
                          member.memberId,
                        )
                      }"
                    >
                      ${
                        createRegistrationCourseOptionsHtml(
                          member.classId ||
                            "",
                        )
                      }
                    </select>

                  </label>
                `;
              },
            )
            .join("");

        return `
          <article class="admin-registration-card">

            <div class="admin-registration-card-head">

              <div>
                <h3>
                  ${
                    escapeHtml(
                      item.parentName,
                    )
                  }
                </h3>

                <p>
                  ${
                    escapeHtml(
                      item.requestedAt ||
                        "申請日時不明",
                    )
                  }
                </p>
              </div>

              <span
                class="
                  admin-registration-status
                  is-pending
                "
              >
                確認待ち
              </span>

            </div>

            <div class="admin-registration-members">
              ${membersHtml}
            </div>

            <button
              type="button"
              onclick="
                approveRegistration(
                  '${
                    escapeHtml(
                      item.parentId,
                    )
                  }',
                  this
                )
              "
            >
              詳細を登録して承認
            </button>

          </article>
        `;
      },
    )
    .join("");
}


// =======================
// 事前登録フォームHTML
// =======================
function createPreRegistrationFormHtml() {
  return `
    <article class="admin-registration-card">

      <h3>
        保護者・会員を事前登録
      </h3>

      <label>
        保護者名

        <input
          id="adminPreParentName"
          placeholder="例：山田太郎"
        >
      </label>

      <div id="adminPreChildren">
        ${
          createAdminPreChildRowHtml(
            false,
          )
        }
      </div>

      <button
        class="
          secondary
          admin-registration-add
        "
        type="button"
        onclick="addAdminPreChildRow()"
      >
        ＋ お子さまを追加
      </button>

      <button
        type="button"
        onclick="createAdminPreRegistration()"
      >
        事前登録してコードを発行
      </button>

    </article>
  `;
}


// =======================
// 事前登録の子ども入力欄
// =======================
function createAdminPreChildRowHtml(
  removable = true,
) {
  return `
    <div class="admin-pre-child-row">

      <input
        class="admin-pre-child-name"
        placeholder="子どもの氏名"
      >

      <select
        class="admin-pre-child-class"
      >
        ${
          createRegistrationCourseOptionsHtml()
        }
      </select>

      ${
        removable
          ? `
            <button
              class="secondary"
              type="button"
              onclick="
                this
                  .closest(
                    '.admin-pre-child-row'
                  )
                  .remove()
              "
            >
              ×
            </button>
          `
          : ""
      }

    </div>
  `;
}


// =======================
// 事前登録の子どもを追加
// =======================
function addAdminPreChildRow() {
  const area =
    document.getElementById(
      "adminPreChildren",
    );

  area.insertAdjacentHTML(
    "beforeend",
    createAdminPreChildRowHtml(
      true,
    ),
  );
}


// =======================
// 登録コード一覧HTML
// =======================
function createRegistrationCodesHtml(
  items,
) {
  if (!items.length) {
    return `
      <div class="admin-registration-empty">
        LINE未連携の事前登録はありません
      </div>
    `;
  }

  return items
    .map(
      function (item) {
        const names =
          (
            item.memberNames ||
            []
          ).join("、");

        return `
          <article class="admin-registration-code-row">

            <div>
              <strong>
                ${
                  escapeHtml(
                    item.parentName,
                  )
                }
              </strong>

              <span>
                ${
                  escapeHtml(
                    names,
                  )
                }
              </span>
            </div>

            <code>
              ${
                escapeHtml(
                  item.registrationCode,
                )
              }
            </code>

            <button
              class="secondary"
              type="button"
              onclick="
                copyRegistrationCode(
                  '${
                    escapeHtml(
                      item.registrationCode,
                    )
                  }'
                )
              "
            >
              コピー
            </button>

            <button
              type="button"
              onclick="
                regenerateRegistrationCode(
                  '${
                    escapeHtml(
                      item.parentId,
                    )
                  }'
                )
              "
            >
              再発行
            </button>

          </article>
        `;
      },
    )
    .join("");
}


// =======================
// 確認待ちを承認
// =======================
async function approveRegistration(
  parentId,
  button,
) {
  const card =
    button.closest(
      ".admin-registration-card",
    );

  const inputs = [
    ...card.querySelectorAll(
      ".admin-approval-class",
    ),
  ];

  const members =
    inputs.map(
      function (input) {
        return {
          memberId:
            input.dataset.memberId,

          classId:
            input.value.trim(),
        };
      },
    );

  if (
    members.some(
      function (member) {
        return !member.classId;
      },
    )
  ) {
    alert(
      "すべてのお子さまの所属コースIDを入力してください",
    );

    return;
  }

  lockUI(
    "登録を承認中...",
  );

  try {
    const result =
      await apiPost({
        action:
          "adminApproveRegistration",

        lineUserId:
          CACHE.profile.userId,

        parentId:
          parentId,

        members:
          members,
      });

    if (!result.success) {
      throw new Error(
        result.message ||
          "承認できませんでした",
      );
    }

    CACHE.adminRegistrationData =
      null;

    await showAdminRegistration(
      true,
    );
  } catch (error) {
    alert(
      error.message,
    );
  } finally {
    unlockUI();
  }
}


// =======================
// 管理者による事前登録
// =======================
async function createAdminPreRegistration() {
  const parentName =
    document
      .getElementById(
        "adminPreParentName",
      )
      .value
      .trim();

  const nameInputs = [
    ...document.querySelectorAll(
      ".admin-pre-child-name",
    ),
  ];

  const classInputs = [
    ...document.querySelectorAll(
      ".admin-pre-child-class",
    ),
  ];

  const children =
    nameInputs
      .map(
        function (
          input,
          index,
        ) {
          return {
            name:
              input.value.trim(),

            classId:
              classInputs[
                index
              ].value.trim(),
          };
        },
      )
      .filter(
        function (child) {
          return Boolean(
            child.name ||
            child.classId,
          );
        },
      );

  const hasMissingValue =
    children.some(
      function (child) {
        return (
          !child.name ||
          !child.classId
        );
      },
    );

  if (
    !parentName ||
    !children.length ||
    hasMissingValue
  ) {
    alert(
      "保護者名と、すべてのお子さまの氏名・所属コースIDを入力してください",
    );

    return;
  }

  lockUI(
    "事前登録中...",
  );

  try {
    const result =
      await apiPost({
        action:
          "adminCreatePreRegistration",

        lineUserId:
          CACHE.profile.userId,

        parentName:
          parentName,

        children:
          children,
      });

    if (!result.success) {
      throw new Error(
        result.message ||
          "事前登録できませんでした",
      );
    }

    CACHE.adminRegistrationData =
      null;

    alert(
      `事前登録が完了しました\n初回登録コード：${result.registrationCode}`,
    );

    await showAdminRegistration(
      true,
    );

    switchAdminRegistrationTab(
      "codes",
    );
  } catch (error) {
    alert(
      error.message,
    );
  } finally {
    unlockUI();
  }
}


// =======================
// 登録コード再発行
// =======================
async function regenerateRegistrationCode(
  parentId,
) {
  const confirmed =
    confirm(
      "初回登録コードを再発行しますか？\n以前のコードは使用できなくなります",
    );

  if (!confirmed) {
    return;
  }

  lockUI(
    "コードを再発行中...",
  );

  try {
    const result =
      await apiPost({
        action:
          "adminRegenerateRegistrationCode",

        lineUserId:
          CACHE.profile.userId,

        parentId:
          parentId,
      });

    if (!result.success) {
      throw new Error(
        result.message ||
          "再発行できませんでした",
      );
    }

    CACHE.adminRegistrationData =
      null;

    alert(
      `新しい初回登録コード：${result.registrationCode}`,
    );

    await showAdminRegistration(
      true,
    );

    switchAdminRegistrationTab(
      "codes",
    );
  } catch (error) {
    alert(
      error.message,
    );
  } finally {
    unlockUI();
  }
}


// =======================
// 登録コードをコピー
// =======================
async function copyRegistrationCode(
  code,
) {
  try {
    await navigator.clipboard.writeText(
      code,
    );

    alert(
      "初回登録コードをコピーしました",
    );
  } catch (error) {
    prompt(
      "初回登録コードをコピーしてください",
      code,
    );
  }
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
  };

  const label =
    sectionLabels[
      sectionName
    ];

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

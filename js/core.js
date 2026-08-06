// =======================
// API通信
// =======================
async function apiGet(action, params = {}) {
  const query = new URLSearchParams({
    action,
    ...params,
  });

  const response = await fetch(
    `${GAS_URL}?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error(
      "データの取得に失敗しました",
    );
  }

  return response.json();
}

async function apiPost(data) {
  const response = await fetch(
    GAS_URL,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    throw new Error(
      "データの登録に失敗しました",
    );
  }

  return response.json();
}


// =======================
// UIロック
// =======================
function lockUI(
  text = "処理中...",
) {
  uiLockCount++;

  document.body.style.pointerEvents =
    "none";

  const overlay =
    document.getElementById(
      "loadingOverlay",
    );

  const message =
    document.getElementById(
      "loadingMessage",
    );

  if (
    message &&
    text
  ) {
    message.textContent =
      text;
  }

  if (overlay) {
    overlay.classList.add(
      "is-visible",
    );

    overlay.setAttribute(
      "aria-hidden",
      "false",
    );
  }
}

function unlockUI() {
  uiLockCount =
    Math.max(
      0,
      uiLockCount - 1,
    );

  if (
    uiLockCount === 0
  ) {
    document.body.style.pointerEvents =
      "auto";

    const overlay =
      document.getElementById(
        "loadingOverlay",
      );

    if (overlay) {
      overlay.classList.remove(
        "is-visible",
      );

      overlay.setAttribute(
        "aria-hidden",
        "true",
      );
    }
  }
}


// =======================
// HTMLエスケープ
// =======================
function escapeHtml(value) {
  return String(
    value ?? "",
  )
    .replaceAll(
      "&",
      "&amp;",
    )
    .replaceAll(
      "<",
      "&lt;",
    )
    .replaceAll(
      ">",
      "&gt;",
    )
    .replaceAll(
      '"',
      "&quot;",
    )
    .replaceAll(
      "'",
      "&#039;",
    );
}


// =======================
// エラー画面
// =======================
function showError(error) {
  console.error(
    error,
  );

  const status =
    document.getElementById(
      "status",
    );

  status.classList.remove(
    "home-screen",
    "analysis-screen",
    "schedule-screen",
    "admin-screen",
    "registration-screen",
  );

  status.innerHTML = `
    <section class="card">

      <h2>
        読み込みに失敗しました
      </h2>

      <p class="muted">
        通信環境を確認して、
        もう一度お試しください
      </p>

      <button
        type="button"
        onclick="location.reload()"
      >
        再読み込み
      </button>

    </section>
  `;
}


// =======================
// 初回登録画面
// =======================
function showRegister(
  lineUserId,
) {
  const status =
    document.getElementById(
      "status",
    );

  status.classList.remove(
    "home-screen",
    "analysis-screen",
    "schedule-screen",
    "admin-screen",
  );

  status.classList.add(
    "registration-screen",
  );

  status.innerHTML = `
    <section
      class="
        card
        registration-card
      "
    >

      <h2>
        初回登録
      </h2>

      <p
        class="
          muted
          registration-intro
        "
      >
        登録コードの有無を
        選択してください
      </p>

      <div
        class="registration-choice"
        role="tablist"
        aria-label="登録方法"
      >

        <button
          id="registrationCodeTab"
          class="
            registration-choice-button
            is-active
          "
          type="button"
          onclick="
            switchRegistrationMode(
              'code'
            )
          "
        >
          登録コードを持っている
        </button>

        <button
          id="registrationRequestTab"
          class="
            registration-choice-button
            secondary
          "
          type="button"
          onclick="
            switchRegistrationMode(
              'request'
            )
          "
        >
          登録コードを持っていない
        </button>

      </div>

      <div
        id="registrationCodePanel"
        class="registration-panel"
      >

        <label>
          初回登録コード

          <input
            id="registrationCode"
            inputmode="text"
            maxlength="8"
            autocomplete="one-time-code"
            placeholder="例：K7M4P9"
          >
        </label>

        <label>
          お子さまの氏名

          <input
            id="linkChildName"
            autocomplete="name"
            placeholder="例：山田一郎"
          >
        </label>

        <button
          type="button"
          onclick="
            linkRegisteredFamily(
              '${lineUserId}'
            )
          "
        >
          LINEと連携する
        </button>

      </div>

      <div
        id="registrationRequestPanel"
        class="registration-panel"
        hidden
      >

        <label>
          保護者名

          <input
            id="parentName"
            autocomplete="name"
            placeholder="例：山田太郎"
          >
        </label>

        <h3>
          お子さま
        </h3>

        <div id="childrenArea">
          ${createChildInputRowHtml(
            false,
          )}
        </div>

        <button
          class="
            secondary
            registration-add-child
          "
          type="button"
          onclick="addChildRow()"
        >
          ＋ お子さまを追加
        </button>

        <button
          type="button"
          onclick="
            submitRegistrationRequest(
              '${lineUserId}'
            )
          "
        >
          登録を申請する
        </button>

      </div>

    </section>
  `;
}


// =======================
// 登録方法切り替え
// =======================
function switchRegistrationMode(
  mode,
) {
  const isCode =
    mode === "code";

  const codePanel =
    document.getElementById(
      "registrationCodePanel",
    );

  const requestPanel =
    document.getElementById(
      "registrationRequestPanel",
    );

  const codeTab =
    document.getElementById(
      "registrationCodeTab",
    );

  const requestTab =
    document.getElementById(
      "registrationRequestTab",
    );

  codePanel.hidden =
    !isCode;

  requestPanel.hidden =
    isCode;

  codeTab.classList.toggle(
    "is-active",
    isCode,
  );

  codeTab.classList.toggle(
    "secondary",
    !isCode,
  );

  requestTab.classList.toggle(
    "is-active",
    !isCode,
  );

  requestTab.classList.toggle(
    "secondary",
    isCode,
  );
}


// =======================
// 子どもの入力欄HTML
// =======================
function createChildInputRowHtml(
  removable = true,
) {
  return `
    <div class="childRow">

      <input
        class="childName"
        autocomplete="name"
        placeholder="子どもの氏名"
      >

      ${
        removable
          ? `
            <button
              class="
                child-remove-button
                secondary
              "
              type="button"
              aria-label="
                このお子さまを削除
              "
              onclick="
                removeChildRow(this)
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
// 子どもの入力欄を追加
// =======================
function addChildRow() {
  const wrapper =
    document.createElement(
      "div",
    );

  wrapper.innerHTML =
    createChildInputRowHtml(
      true,
    ).trim();

  const childrenArea =
    document.getElementById(
      "childrenArea",
    );

  childrenArea.appendChild(
    wrapper.firstElementChild,
  );
}


// =======================
// 子どもの入力欄を削除
// =======================
function removeChildRow(
  button,
) {
  const row =
    button.closest(
      ".childRow",
    );

  if (row) {
    row.remove();
  }
}


// =======================
// 保護者から登録申請
// =======================
async function submitRegistrationRequest(
  lineUserId,
) {
  const parentName =
    document
      .getElementById(
        "parentName",
      )
      .value
      .trim();

  const nameInputs = [
    ...document.querySelectorAll(
      ".childName",
    ),
  ];

  const children =
    nameInputs
      .map(
        function (input) {
          return {
            name:
              input.value.trim(),
          };
        },
      )
      .filter(
        function (child) {
          return Boolean(
            child.name,
          );
        },
      );

  if (!parentName) {
    alert(
      "保護者名を入力してください",
    );

    return;
  }

  if (
    children.length === 0
  ) {
    alert(
      "お子さまの名前を入力してください",
    );

    return;
  }

  lockUI(
    "登録申請中...",
  );

  try {
    const result =
      await apiPost({
        action:
          "submitRegistrationRequest",

        lineUserId:
          lineUserId,

        parentName:
          parentName,

        children:
          children,
      });

    if (!result.success) {
      throw new Error(
        result.message ||
          "登録申請に失敗しました",
      );
    }

    showRegistrationPending();
  } catch (error) {
    alert(
      error.message,
    );
  } finally {
    unlockUI();
  }
}


// =======================
// 事前登録情報とLINE連携
// =======================
async function linkRegisteredFamily(
  lineUserId,
) {
  const registrationCode =
    document
      .getElementById(
        "registrationCode",
      )
      .value
      .trim()
      .toUpperCase();

  const childName =
    document
      .getElementById(
        "linkChildName",
      )
      .value
      .trim();

  if (
    !registrationCode ||
    !childName
  ) {
    alert(
      "初回登録コードとお子さまの氏名を入力してください",
    );

    return;
  }

  lockUI(
    "LINEと連携中...",
  );

  try {
    const result =
      await apiPost({
        action:
          "linkPreRegisteredFamily",

        lineUserId:
          lineUserId,

        registrationCode:
          registrationCode,

        childName:
          childName,
      });

    if (!result.success) {
      throw new Error(
        result.message ||
          "LINEとの連携に失敗しました",
      );
    }

    alert(
      "LINEとの連携が完了しました",
    );

    location.reload();
  } catch (error) {
    alert(
      error.message,
    );
  } finally {
    unlockUI();
  }
}


// =======================
// 承認待機画面
// =======================
function showRegistrationPending() {
  const status =
    document.getElementById(
      "status",
    );

  status.classList.remove(
    "home-screen",
    "analysis-screen",
    "schedule-screen",
    "admin-screen",
  );

  status.classList.add(
    "registration-screen",
  );

  status.innerHTML = `
    <section
      class="
        card
        registration-card
        registration-pending-card
      "
    >

      <div
        class="registration-pending-icon"
        aria-hidden="true"
      >
        ✓
      </div>

      <h2>
        登録申請を受け付けました
      </h2>

      <p>
        現在、スクールで
        登録内容を確認しています
      </p>

      <p>
        確認が完了するまで
        お待ちください
      </p>

      <p
        class="
          registration-pending-note
        "
      >
        3日以上承認されない場合は、
        スクールまでご連絡ください
      </p>

      <button
        class="secondary"
        type="button"
        onclick="location.reload()"
      >
        状態を再確認する
      </button>

    </section>
  `;
}


// =======================
// 無効・退会画面
// =======================
function showRegistrationUnavailable(
  message,
) {
  const status =
    document.getElementById(
      "status",
    );

  status.classList.remove(
    "home-screen",
    "analysis-screen",
    "schedule-screen",
    "admin-screen",
  );

  status.classList.add(
    "registration-screen",
  );

  status.innerHTML = `
    <section
      class="
        card
        registration-card
        registration-pending-card
      "
    >

      <h2>
        現在ご利用いただけません
      </h2>

      <p>
        ${
          escapeHtml(
            message ||
              "スクールまでお問い合わせください",
          )
        }
      </p>

    </section>
  `;
}

// =======================
// 管理者スケジュール状態
// =======================
const ADMIN_SCHEDULE_STATE = {
  data: null,
  currentMonth:
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    ),
};


// =======================
// 管理者スケジュール表示
// =======================
async function showAdminSchedule() {
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
    "スケジュールを取得中...",
  );

  try {
    await loadAdminScheduleData(
      true,
    );

    renderAdminSchedule();
  } catch (error) {
    console.error(error);

    alert(
      error.message ||
        "スケジュールを取得できませんでした",
    );

    showAdminHome();
  } finally {
    unlockUI();
  }
}


// =======================
// 管理者スケジュール取得
// =======================
async function loadAdminScheduleData(
  forceReload,
) {
  if (
    ADMIN_SCHEDULE_STATE.data &&
    !forceReload
  ) {
    return;
  }

  const data =
    await apiGet(
      "getAdminScheduleData",
      {
        lineUserId:
          CACHE.profile.userId,
      },
    );

  if (!data.success) {
    throw new Error(
      data.message ||
        "スケジュールを取得できませんでした",
    );
  }

  ADMIN_SCHEDULE_STATE.data = {
    classes:
      data.classes || [],

    schedules:
      data.schedules || [],

    scheduleTypes:
      data.scheduleTypes || [],
  };
}


// =======================
// スケジュール一覧描画
// =======================
function renderAdminSchedule() {
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

  const currentMonth =
    ADMIN_SCHEDULE_STATE.currentMonth;

  const year =
    currentMonth.getFullYear();

  const month =
    currentMonth.getMonth() + 1;

  const monthPrefix =
    year +
    "-" +
    String(month).padStart(
      2,
      "0",
    );

  const schedules =
    (
      ADMIN_SCHEDULE_STATE
        .data?.schedules || []
    ).filter(
      function (schedule) {
        return schedule.date.startsWith(
          monthPrefix,
        );
      },
    );

  const listHtml =
    schedules.length
      ? schedules
          .map(
            createAdminScheduleItemHtml,
          )
          .join("")
      : `
        <div class="admin-schedule-empty">
          この月の予定はありません
        </div>
      `;

  status.innerHTML = `
    <div class="admin-page">

      <div class="admin-schedule-toolbar">

        <button
          class="admin-schedule-back"
          type="button"
          onclick="showAdminHome()"
        >
          戻る
        </button>

        <h2>
          スケジュール管理
        </h2>

        <span></span>

      </div>

      <button
        class="admin-schedule-add"
        type="button"
        onclick="showAdminScheduleForm()"
      >
        ＋ 新しい予定を登録
      </button>

      <section class="card">

        <div class="admin-schedule-month">

          <button
            type="button"
            aria-label="前の月"
            onclick="changeAdminScheduleMonth(-1)"
          >
            ◀
          </button>

          <div class="admin-schedule-month-label">
            ${year}年${month}月
          </div>

          <button
            type="button"
            aria-label="次の月"
            onclick="changeAdminScheduleMonth(1)"
          >
            ▶
          </button>

        </div>

        <div class="admin-schedule-list">
          ${listHtml}
        </div>

      </section>

    </div>
  `;
}


// =======================
// 予定1件のHTML
// =======================
function createAdminScheduleItemHtml(
  schedule,
) {
  const typeClass =
    schedule.type === "振替可"
      ? " is-transfer"
      : (
          schedule.type === "雨天" ||
          schedule.type === "休講"
        )
        ? " is-closed"
        : "";

  return `
    <article
      class="
        admin-schedule-item
        ${typeClass}
      "
    >

      <div class="admin-schedule-item-head">

        <div class="admin-schedule-date">
          ${escapeHtml(
            formatAdminScheduleDate(
              schedule.date,
            ),
          )}
        </div>

        <span class="admin-schedule-type">
          ${escapeHtml(schedule.type)}
        </span>

      </div>

      <div class="admin-schedule-class">
        ${escapeHtml(
          schedule.className ||
          schedule.classId,
        )}
      </div>

      <p class="admin-schedule-detail">
        ${escapeHtml(schedule.startTime)}
        ～
        ${escapeHtml(schedule.endTime)}
      </p>

      <p class="admin-schedule-detail">
        ${escapeHtml(schedule.place)}
      </p>

      <button
        class="admin-schedule-edit"
        type="button"
        onclick="showAdminScheduleForm('${escapeHtml(schedule.scheduleId)}')"
      >
        編集
      </button>

    </article>
  `;
}


// =======================
// 日付表示
// =======================
function formatAdminScheduleDate(
  dateText,
) {
  const parts =
    String(dateText)
      .split("-");

  if (parts.length !== 3) {
    return dateText;
  }

  const date =
    new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2]),
    );

  const weekDays = [
    "日",
    "月",
    "火",
    "水",
    "木",
    "金",
    "土",
  ];

  return (
    Number(parts[1]) +
    "月" +
    Number(parts[2]) +
    "日（" +
    weekDays[date.getDay()] +
    "）"
  );
}


// =======================
// 月切り替え
// =======================
function changeAdminScheduleMonth(
  amount,
) {
  const current =
    ADMIN_SCHEDULE_STATE.currentMonth;

  ADMIN_SCHEDULE_STATE.currentMonth =
    new Date(
      current.getFullYear(),
      current.getMonth() +
        Number(amount),
      1,
    );

  renderAdminSchedule();
}


// =======================
// 登録・編集フォーム
// =======================
function showAdminScheduleForm(
  scheduleId,
) {
  const data =
    ADMIN_SCHEDULE_STATE.data;

  if (!data) {
    return;
  }

  const schedule =
    scheduleId
      ? data.schedules.find(
          function (item) {
            return (
              item.scheduleId ===
              scheduleId
            );
          },
        )
      : null;

  if (
    scheduleId &&
    !schedule
  ) {
    alert(
      "スケジュールが見つかりません",
    );

    return;
  }

  const classes =
    data.classes || [];

  const scheduleTypes =
    data.scheduleTypes || [];

  const defaultClass =
    classes[0] || null;

  const selectedClassId =
    schedule?.classId ||
    defaultClass?.classId ||
    "";

  const date =
    schedule?.date ||
    formatDateForAdminInput(
      new Date(),
    );

  const place =
    schedule?.place || "";

  const type =
    schedule?.type ||
    scheduleTypes[0] ||
    "通常";

  const startTime =
    schedule?.startTime ||
    defaultClass?.startTime ||
    "";

  const endTime =
    schedule?.endTime ||
    defaultClass?.endTime ||
    "";

  const classOptions =
    classes
      .map(
        function (classItem) {
          const selected =
            classItem.classId ===
            selectedClassId
              ? " selected"
              : "";

          return `
            <option
              value="${escapeHtml(classItem.classId)}"
              ${selected}
            >
              ${escapeHtml(classItem.className)}
              （${escapeHtml(classItem.weekDay)}）
            </option>
          `;
        },
      )
      .join("");

  const typeOptions =
    scheduleTypes
      .map(
        function (typeName) {
          const selected =
            typeName === type
              ? " selected"
              : "";

          return `
            <option
              value="${escapeHtml(typeName)}"
              ${selected}
            >
              ${escapeHtml(typeName)}
            </option>
          `;
        },
      )
      .join("");

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
    <div class="admin-page">

      <section
        class="
          card
          admin-schedule-form-card
        "
      >

        <h2>
          ${
            schedule
              ? "予定を編集"
              : "予定を登録"
          }
        </h2>

        <input
          id="adminScheduleId"
          type="hidden"
          value="${escapeHtml(scheduleId || "")}"
        >

        <label>
          日付

          <input
            id="adminScheduleDate"
            type="date"
            value="${escapeHtml(date)}"
          >
        </label>

        <label>
          クラス

          <select
            id="adminScheduleClass"
            onchange="changeAdminScheduleClass()"
          >
            ${classOptions}
          </select>
        </label>

        <label>
          場所

          <input
            id="adminSchedulePlace"
            type="text"
            value="${escapeHtml(place)}"
            placeholder="活動場所"
          >
        </label>

        <label>
          種別

          <select
            id="adminScheduleType"
          >
            ${typeOptions}
          </select>
        </label>

        <div class="admin-schedule-time-row">

          <label>
            開始

            <input
              id="adminScheduleStart"
              type="time"
              value="${escapeHtml(startTime)}"
            >
          </label>

          <label>
            終了

            <input
              id="adminScheduleEnd"
              type="time"
              value="${escapeHtml(endTime)}"
            >
          </label>

        </div>

        <div class="admin-schedule-form-buttons">

          <button
            class="secondary"
            type="button"
            onclick="renderAdminSchedule()"
          >
            キャンセル
          </button>

          <button
            type="button"
            onclick="submitAdminSchedule()"
          >
            ${
              schedule
                ? "変更を保存"
                : "登録する"
            }
          </button>

        </div>

      </section>

    </div>
  `;
}


// =======================
// クラス変更時に標準時間を反映
// =======================
function changeAdminScheduleClass() {
  const classId =
    document
      .getElementById(
        "adminScheduleClass",
      )
      ?.value;

  const classItem =
    (
      ADMIN_SCHEDULE_STATE
        .data?.classes || []
    ).find(
      function (item) {
        return (
          item.classId ===
          classId
        );
      },
    );

  if (!classItem) {
    return;
  }

  const startInput =
    document.getElementById(
      "adminScheduleStart",
    );

  const endInput =
    document.getElementById(
      "adminScheduleEnd",
    );

  if (startInput) {
    startInput.value =
      classItem.startTime;
  }

  if (endInput) {
    endInput.value =
      classItem.endTime;
  }
}


// =======================
// 日付入力用変換
// =======================
function formatDateForAdminInput(
  date,
) {
  return (
    date.getFullYear() +
    "-" +
    String(
      date.getMonth() + 1,
    ).padStart(2, "0") +
    "-" +
    String(
      date.getDate(),
    ).padStart(2, "0")
  );
}


// =======================
// 登録・編集を送信
// =======================
async function submitAdminSchedule() {
  const scheduleId =
    document
      .getElementById(
        "adminScheduleId",
      )
      ?.value || "";

  const date =
    document
      .getElementById(
        "adminScheduleDate",
      )
      ?.value || "";

  const classId =
    document
      .getElementById(
        "adminScheduleClass",
      )
      ?.value || "";

  const place =
    document
      .getElementById(
        "adminSchedulePlace",
      )
      ?.value.trim() || "";

  const type =
    document
      .getElementById(
        "adminScheduleType",
      )
      ?.value || "";

  const startTime =
    document
      .getElementById(
        "adminScheduleStart",
      )
      ?.value || "";

  const endTime =
    document
      .getElementById(
        "adminScheduleEnd",
      )
      ?.value || "";

  if (
    !date ||
    !classId ||
    !place ||
    !type ||
    !startTime ||
    !endTime
  ) {
    alert(
      "すべての項目を入力してください",
    );

    return;
  }

  lockUI(
    scheduleId
      ? "予定を変更中..."
      : "予定を登録中...",
  );

  try {
    const result =
      await apiPost({
        action:
          "saveAdminSchedule",

        lineUserId:
          CACHE.profile.userId,

        scheduleId:
          scheduleId,

        date:
          date,

        classId:
          classId,

        place:
          place,

        type:
          type,

        startTime:
          startTime,

        endTime:
          endTime,
      });

    if (!result.success) {
      throw new Error(
        result.message ||
          "スケジュールを保存できませんでした",
      );
    }

    /*
     * 一般会員用と管理者用の
     * キャッシュを破棄する
     */
    CACHE.schedules = null;

    ADMIN_SCHEDULE_STATE.data =
      null;

    const selectedDate =
      new Date(
        date + "T00:00:00",
      );

    ADMIN_SCHEDULE_STATE.currentMonth =
      new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1,
      );

    alert(
      result.operation +
        "しました",
    );

    await loadAdminScheduleData(
      true,
    );

    renderAdminSchedule();
  } catch (error) {
    console.error(error);

    alert(
      error.message ||
        "スケジュールを保存できませんでした",
    );
  } finally {
    unlockUI();
  }
}

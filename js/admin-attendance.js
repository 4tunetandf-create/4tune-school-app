// =======================
// 出欠・振替管理状態
// =======================
const ADMIN_ATTENDANCE_STATE = {
  data: null,

  currentMonth:
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    ),

  selectedCourseGroup: "D",
  selectedScheduleId: "",
};


// =======================
// 出欠・振替管理を開く
// =======================
async function showAdminAttendance() {
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
    "出欠情報を取得中...",
  );

  try {
    await loadAdminAttendanceData(
      true,
    );

    selectDefaultAttendanceSchedule();

    renderAdminAttendance();
  } catch (error) {
    console.error(error);

    alert(
      error.message ||
        "出欠情報を取得できませんでした",
    );

    showAdminHome();
  } finally {
    unlockUI();
  }
}


// =======================
// データ取得
// =======================
async function loadAdminAttendanceData(
  forceReload,
) {
  if (
    ADMIN_ATTENDANCE_STATE.data &&
    !forceReload
  ) {
    return;
  }

  const data =
    await apiGet(
      "getAdminAttendanceData",
      {
        lineUserId:
          CACHE.profile.userId,
      },
    );

  if (!data.success) {
    throw new Error(
      data.message ||
        "出欠情報を取得できませんでした",
    );
  }

  ADMIN_ATTENDANCE_STATE.data = {
    schedules:
      data.schedules || [],

    members:
      data.members || [],

    attendance:
      data.attendance || [],
  };
}


// =======================
// 表示対象の予定
// =======================
function getFilteredAttendanceSchedules() {
  const month =
    ADMIN_ATTENDANCE_STATE
      .currentMonth;

  const monthPrefix =
    month.getFullYear() +
    "-" +
    String(
      month.getMonth() + 1,
    ).padStart(2, "0");

  const group =
    ADMIN_ATTENDANCE_STATE
      .selectedCourseGroup;

  return (
    ADMIN_ATTENDANCE_STATE
      .data?.schedules || []
  ).filter(
    function (schedule) {
      return (
        schedule.date.startsWith(
          monthPrefix,
        ) &&
        String(schedule.classId)
          .toUpperCase()
          .startsWith(group)
      );
    },
  );
}


// =======================
// 初期予定選択
// =======================
function selectDefaultAttendanceSchedule() {
  const schedules =
    getFilteredAttendanceSchedules();

  const exists =
    schedules.some(
      function (schedule) {
        return (
          schedule.scheduleId ===
          ADMIN_ATTENDANCE_STATE
            .selectedScheduleId
        );
      },
    );

  if (!exists) {
    ADMIN_ATTENDANCE_STATE
      .selectedScheduleId =
      schedules[0]?.scheduleId || "";
  }
}


// =======================
// 画面描画
// =======================
function renderAdminAttendance() {
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

  const month =
    ADMIN_ATTENDANCE_STATE
      .currentMonth;

  const year =
    month.getFullYear();

  const monthNumber =
    month.getMonth() + 1;

  const group =
    ADMIN_ATTENDANCE_STATE
      .selectedCourseGroup;

  const schedules =
    getFilteredAttendanceSchedules();

  const selectedSchedule =
    schedules.find(
      function (schedule) {
        return (
          schedule.scheduleId ===
          ADMIN_ATTENDANCE_STATE
            .selectedScheduleId
        );
      },
    ) || null;

  const dateTabsHtml =
    schedules.length
      ? schedules.map(
          createAttendanceDateTabHtml,
        ).join("")
      : `
        <span class="muted">
          予定がありません
        </span>
      `;

  const contentHtml =
    selectedSchedule
      ? createAttendanceContentHtml(
          selectedSchedule,
        )
      : `
        <div class="admin-attendance-empty">
          対象の予定がありません
        </div>
      `;

  status.innerHTML = `
    <div
      class="
        admin-page
        admin-attendance-page
      "
    >

      <div class="admin-attendance-toolbar">

        <button
          class="admin-attendance-back"
          type="button"
          onclick="showAdminHome()"
        >
          戻る
        </button>

        <h2>
          出欠・振替管理
        </h2>

        <span></span>

      </div>

      <div class="admin-attendance-month">

        <button
          type="button"
          onclick="changeAttendanceMonth(-1)"
        >
          ◀
        </button>

        <div class="admin-attendance-month-label">
          ${year}年${monthNumber}月
        </div>

        <button
          type="button"
          onclick="changeAttendanceMonth(1)"
        >
          ▶
        </button>

      </div>

      <div class="admin-attendance-course-tabs">

        <button
          class="
            admin-attendance-course-tab
            ${
              group === "D"
                ? "is-active"
                : ""
            }
          "
          type="button"
          onclick="changeAttendanceCourseGroup('D')"
        >
          ダッシュ
        </button>

        <button
          class="
            admin-attendance-course-tab
            ${
              group === "S"
                ? "is-active"
                : ""
            }
          "
          type="button"
          onclick="changeAttendanceCourseGroup('S')"
        >
          スプリント
        </button>

      </div>

      <div class="admin-attendance-date-tabs">
        ${dateTabsHtml}
      </div>

      ${contentHtml}

      <button
        class="admin-attendance-update"
        type="button"
        ${selectedSchedule ? "" : "disabled"}
        onclick="showAttendanceConfirmation()"
      >
        更新内容を確認
      </button>

    </div>

    <div
      id="adminAttendanceConfirm"
      class="admin-attendance-confirm"
    >
      <div
        id="adminAttendanceConfirmContent"
        class="admin-attendance-confirm-card"
      ></div>
    </div>
  `;
}


// =======================
// 日程タブ
// =======================
function createAttendanceDateTabHtml(
  schedule,
) {
  const isActive =
    schedule.scheduleId ===
    ADMIN_ATTENDANCE_STATE
      .selectedScheduleId;

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
    <button
      class="
        admin-attendance-date-tab
        ${isActive ? "is-active" : ""}
        ${typeClass}
      "
      type="button"
      onclick="selectAttendanceSchedule('${schedule.scheduleId}')"
    >
      ${escapeHtml(
        formatAdminScheduleDate(
          schedule.date,
        ),
      )}
      ${escapeHtml(schedule.type)}
    </button>
  `;
}


// =======================
// 名簿部分
// =======================
function createAttendanceContentHtml(
  schedule,
) {
  const members =
    getAttendanceRoster(
      schedule,
    );

  const typeClass =
    schedule.type === "振替可"
      ? " is-transfer"
      : (
          schedule.type === "雨天" ||
          schedule.type === "休講"
        )
        ? " is-closed"
        : "";

  const memberHtml =
    members.length
      ? members.map(
          function (member) {
            return createAttendanceMemberHtml(
              schedule,
              member,
            );
          },
        ).join("")
      : `
        <div class="admin-attendance-empty">
          対象会員はいません
        </div>
      `;

  return `
    <div class="admin-attendance-content">

      <section
        class="
          admin-attendance-schedule-info
          ${typeClass}
        "
      >
        <p class="admin-attendance-schedule-title">
          ${escapeHtml(schedule.className)}
          ／
          ${escapeHtml(schedule.type)}
        </p>

        <p class="admin-attendance-schedule-detail">
          ${escapeHtml(schedule.startTime)}
          ～
          ${escapeHtml(schedule.endTime)}
          ／
          ${escapeHtml(schedule.place)}
        </p>
      </section>

      <div class="admin-attendance-actions">

        <button
          class="admin-all-present"
          type="button"
          onclick="setAllAttendance(true)"
        >
          全員出席
        </button>

        <button
          class="admin-all-absent"
          type="button"
          onclick="setAllAttendance(false)"
        >
          全員欠席
        </button>

      </div>

      <div class="admin-attendance-roster">
        ${memberHtml}
      </div>

    </div>
  `;
}


// =======================
// 対象名簿取得
// =======================
function getAttendanceRoster(
  schedule,
) {
  return (
    ADMIN_ATTENDANCE_STATE
      .data?.members || []
  ).filter(
    function (member) {
      return isMemberInRosterFrontend(
        member.classId,
        schedule.classId,
      );
    },
  );
}


function isMemberInRosterFrontend(
  memberClassId,
  scheduleClassId,
) {
  const memberClass =
    String(memberClassId)
      .trim()
      .toUpperCase();

  const scheduleClass =
    String(scheduleClassId)
      .trim()
      .toUpperCase();

  if (scheduleClass === "S001") {
    return (
      memberClass === "S001" ||
      memberClass === "S002"
    );
  }

  if (scheduleClass === "D001") {
    return (
      memberClass === "D001" ||
      memberClass === "D002"
    );
  }

  return (
    memberClass ===
    scheduleClass
  );
}


// =======================
// 会員1名
// =======================
function createAttendanceMemberHtml(
  schedule,
  member,
) {
  const record =
    getAttendanceRecord(
      schedule.scheduleId,
      member.memberId,
    );

  const isTransfer =
    schedule.type === "振替可";

  const defaultAttended =
    isTransfer
      ? false
      : !(
          schedule.type === "雨天" ||
          schedule.type === "休講"
        );

  const checked =
    record
      ? Boolean(record.attended)
      : defaultAttended;

  const disabled =
    isTransfer &&
    member.remainingTransfers <= 0 &&
    !checked;

  return `
    <label
      class="
        admin-attendance-member
        ${disabled ? "is-disabled" : ""}
      "
    >

      <input
        class="admin-attendance-checkbox"
        type="checkbox"
        data-member-id="${escapeHtml(member.memberId)}"
        ${checked ? "checked" : ""}
        ${disabled ? "disabled" : ""}
      >

      <span class="admin-attendance-member-name">
        ${escapeHtml(member.memberName)}

        <span class="admin-attendance-member-class">
          ${escapeHtml(member.classId)}
        </span>
      </span>

      <span
        class="
          admin-attendance-balance
          ${
            member.remainingTransfers <= 0
              ? "is-zero"
              : ""
          }
        "
      >
        残り${member.remainingTransfers}回
      </span>

    </label>
  `;
}


// =======================
// 保存済み記録取得
// =======================
function getAttendanceRecord(
  scheduleId,
  memberId,
) {
  return (
    ADMIN_ATTENDANCE_STATE
      .data?.attendance || []
  ).find(
    function (record) {
      return (
        record.scheduleId ===
          scheduleId &&
        record.memberId ===
          memberId
      );
    },
  ) || null;
}


// =======================
// 日程選択
// =======================
function selectAttendanceSchedule(
  scheduleId,
) {
  ADMIN_ATTENDANCE_STATE
    .selectedScheduleId =
    scheduleId;

  renderAdminAttendance();
}


// =======================
// 月変更
// =======================
function changeAttendanceMonth(
  amount,
) {
  const current =
    ADMIN_ATTENDANCE_STATE
      .currentMonth;

  ADMIN_ATTENDANCE_STATE
    .currentMonth =
    new Date(
      current.getFullYear(),
      current.getMonth() +
        Number(amount),
      1,
    );

  ADMIN_ATTENDANCE_STATE
    .selectedScheduleId = "";

  selectDefaultAttendanceSchedule();
  renderAdminAttendance();
}


// =======================
// コース変更
// =======================
function changeAttendanceCourseGroup(
  group,
) {
  if (
    group !== "D" &&
    group !== "S"
  ) {
    return;
  }

  ADMIN_ATTENDANCE_STATE
    .selectedCourseGroup =
    group;

  ADMIN_ATTENDANCE_STATE
    .selectedScheduleId = "";

  selectDefaultAttendanceSchedule();
  renderAdminAttendance();
}


// =======================
// 全員出席・全員欠席
// =======================
function setAllAttendance(
  attended,
) {
  const checkboxes =
    document.querySelectorAll(
      ".admin-attendance-checkbox",
    );

  checkboxes.forEach(
    function (checkbox) {
      if (
        checkbox.disabled &&
        attended
      ) {
        return;
      }

      checkbox.checked =
        Boolean(attended);
    },
  );
}


// =======================
// 選択中の予定
// =======================
function getSelectedAttendanceSchedule() {
  return (
    ADMIN_ATTENDANCE_STATE
      .data?.schedules || []
  ).find(
    function (schedule) {
      return (
        schedule.scheduleId ===
        ADMIN_ATTENDANCE_STATE
          .selectedScheduleId
      );
    },
  ) || null;
}


// =======================
// 確認画面
// =======================
function showAttendanceConfirmation() {
  const schedule =
    getSelectedAttendanceSchedule();

  if (!schedule) {
    return;
  }

  const roster =
    getAttendanceRoster(
      schedule,
    );

  const checkedIds =
    new Set(
      Array.from(
        document.querySelectorAll(
          ".admin-attendance-checkbox:checked",
        ),
      ).map(
        function (checkbox) {
          return checkbox.dataset.memberId;
        },
      ),
    );

  const isTransfer =
    schedule.type === "振替可";

  const targetMembers =
    roster.filter(
      function (member) {
        const attended =
          checkedIds.has(
            member.memberId,
          );

        return isTransfer
          ? attended
          : !attended;
      },
    );

  const listHtml =
    targetMembers.length
      ? targetMembers.map(
          function (member) {
            const attended =
              checkedIds.has(
                member.memberId,
              );

            const record =
              getAttendanceRecord(
                schedule.scheduleId,
                member.memberId,
              );

            const oldEffect =
              record
                ? Number(
                    record.balanceEffect,
                  ) || 0
                : 0;

            const newEffect =
              isTransfer
                ? (
                    attended
                      ? -1
                      : 0
                  )
                : (
                    attended
                      ? 0
                      : 1
                  );

            const difference =
              newEffect -
              oldEffect;

            const changeText =
              difference > 0
                ? "残振替 ＋" +
                  difference
                : difference < 0
                  ? "残振替 " +
                    difference
                  : "残振替 変更なし";

            return `
              <li>
                ${escapeHtml(member.memberName)}

                <span class="admin-attendance-confirm-change">
                  ${escapeHtml(changeText)}
                </span>
              </li>
            `;
          },
        ).join("")
      : `
        <li>
          対象者はいません
        </li>
      `;

  const title =
    isTransfer
      ? "振替参加者"
      : "欠席者";

  const modal =
    document.getElementById(
      "adminAttendanceConfirm",
    );

  const content =
    document.getElementById(
      "adminAttendanceConfirmContent",
    );

  content.innerHTML = `
    <h3>
      更新内容の確認
    </h3>

    <p class="admin-attendance-confirm-summary">
      ${escapeHtml(title)}
      ${targetMembers.length}名
    </p>

    <ul class="admin-attendance-confirm-list">
      ${listHtml}
    </ul>

    <div class="admin-attendance-confirm-buttons">

      <button
        class="secondary"
        type="button"
        onclick="closeAttendanceConfirmation()"
      >
        いいえ
      </button>

      <button
        type="button"
        onclick="confirmAdminAttendance()"
      >
        はい
      </button>

    </div>
  `;

  modal.classList.add(
    "is-visible",
  );
}


// =======================
// 確認画面を閉じる
// =======================
function closeAttendanceConfirmation() {
  document
    .getElementById(
      "adminAttendanceConfirm",
    )
    ?.classList.remove(
      "is-visible",
    );
}


// =======================
// 保存確定
// =======================
async function confirmAdminAttendance() {
  const schedule =
    getSelectedAttendanceSchedule();

  if (!schedule) {
    return;
  }

  const attendingMemberIds =
    Array.from(
      document.querySelectorAll(
        ".admin-attendance-checkbox:checked",
      ),
    ).map(
      function (checkbox) {
        return checkbox.dataset.memberId;
      },
    );

  closeAttendanceConfirmation();

  lockUI(
    "出欠情報を更新中...",
  );

  try {
    const result =
      await apiPost({
        action:
          "saveAdminAttendance",

        lineUserId:
          CACHE.profile.userId,

        scheduleId:
          schedule.scheduleId,

        attendingMemberIds:
          attendingMemberIds,
      });

    if (!result.success) {
      throw new Error(
        result.message ||
          "出欠情報を更新できませんでした",
      );
    }

    ADMIN_ATTENDANCE_STATE.data =
      null;

    await loadAdminAttendanceData(
      true,
    );

    alert(
      "出欠情報を更新しました",
    );

    renderAdminAttendance();
  } catch (error) {
    console.error(error);

    alert(
      error.message ||
        "出欠情報を更新できませんでした",
    );
  } finally {
    unlockUI();
  }
}

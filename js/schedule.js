// =======================
      // スケジュール取得
      // =======================
      async function loadSchedule() {
        if (CACHE.schedules) {
          return;
        }

        const data = await apiGet("getScheduleByLineId", {
          lineUserId: CACHE.profile.userId,
        });

        CACHE.schedules = data.schedules || [];
      }

      // =======================
      // カレンダー表示
      // =======================
      async function showSchedule() {
        lockUI("スケジュールを取得中...");

        try {
          await loadSchedule();

          renderSchedule();
        } catch (error) {
          alert(error.message);
        } finally {
          unlockUI();
        }
      }

      function renderSchedule() {
        document.getElementById("status").classList.remove("home-screen", "analysis-screen");
        document.getElementById("status").classList.add("schedule-screen");

        const year = currentCalendarDate.getFullYear();

        const month = currentCalendarDate.getMonth();

        const startWeek = new Date(year, month, 1).getDay();

        const totalDays = new Date(year, month + 1, 0).getDate();

        let cells = "<tr>";
        let cellCount = 0;

        for (let i = 0; i < startWeek; i++, cellCount++) {
          cells += "<td></td>";
        }

        for (let day = 1; day <= totalDays; day++, cellCount++) {
          const date =
            `${year}/` +
            `${String(month + 1).padStart(2, "0")}/` +
            `${String(day).padStart(2, "0")}`;

          const schedules = CACHE.schedules.filter(
            (item) => item.date === date,
          );

          const mark = schedules.length ? scheduleMark(schedules[0].type) : "";

          const className = schedules.length
            ? `has-schedule ${scheduleCellClass(schedules[0].type)}`
            : "";

          const click = schedules.length
            ? `onclick="showScheduleDetail('${date}')"`
            : "";

          cells += `
      <td
        class="${className}"
        ${click}
      >
        ${day}<br>
        ${mark}
      </td>
    `;

          if ((cellCount + 1) % 7 === 0 && day !== totalDays) {
            cells += "</tr><tr>";
          }
        }

        while (cellCount % 7 !== 0) {
          cells += "<td></td>";
          cellCount++;
        }

        cells += "</tr>";

        document.getElementById("status").innerHTML = `
    <section class="card schedule-card">

      <div class="calendar-head">

        <button
          class="calendar-month-button"
          onclick="changeMonth(-1)"
          aria-label="前の月"
        >
          ◀
        </button>

        <h2>
          ${year}年${month + 1}月
        </h2>

        <button
          class="calendar-month-button"
          onclick="changeMonth(1)"
          aria-label="次の月"
        >
          ▶
        </button>

      </div>

      <table class="schedule-calendar">

        <thead>
          <tr>
            <th>日</th>
            <th>月</th>
            <th>火</th>
            <th>水</th>
            <th>木</th>
            <th>金</th>
            <th>土</th>
          </tr>
        </thead>

        <tbody>
          ${cells}
        </tbody>

      </table>

      <p class="schedule-legend">
        <span class="schedule-legend-normal">● 通常</span>
        <span class="schedule-legend-transfer">★ 振替可</span>
        <span class="schedule-legend-closed">× 雨天・休講</span>
      </p>

      <button
        class="secondary schedule-home-button"
        onclick="renderHome()"
      >
        ホームへ戻る
      </button>

    </section>
  `;
      }

      // =======================
      // スケジュール記号
      // =======================
      function scheduleMark(type) {
        return (
          {
            通常: "●",
            振替可: "★",
            雨天: "×",
            休講: "×",
          }[type] || "●"
        );
      }

      function scheduleCellClass(type) {
        if (type === "振替可") return "schedule-transfer";
        if (type === "雨天" || type === "休講") return "schedule-closed";
        return "schedule-normal";
      }

      // =======================
      // スケジュール詳細
      // =======================
      function showScheduleDetail(date) {
        const schedules = CACHE.schedules.filter((item) => item.date === date);

        if (!schedules.length) {
          return;
        }

        const details = schedules
          .map(
            (item) => `
        <hr>

        <p>
          <strong>
            ${escapeHtml(item.className)}
          </strong>
        </p>

        <p>
          ${escapeHtml(item.startTime)}
          ～
          ${escapeHtml(item.endTime)}
        </p>

        <p>
          ${escapeHtml(item.place)}
        </p>

        <p>
          ${escapeHtml(item.type)}
        </p>
      `,
          )
          .join("");

        document.getElementById("scheduleModalContent").innerHTML = `
      <h3>${escapeHtml(date)}</h3>

      ${details}

      <button
        class="secondary"
        onclick="closeScheduleModal()"
      >
        閉じる
      </button>
    `;

        document.getElementById("scheduleModal").style.display = "block";
      }

      // =======================
      // モーダルを閉じる
      // =======================
      function closeScheduleModal(event) {
        if (event && event.target.id !== "scheduleModal") {
          return;
        }

        document.getElementById("scheduleModal").style.display = "none";
      }

      // =======================
      // 前月・翌月
      // =======================
      function changeMonth(amount) {
        currentCalendarDate = new Date(
          currentCalendarDate.getFullYear(),
          currentCalendarDate.getMonth() + amount,
          1,
        );

        renderSchedule();
      }

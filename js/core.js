// =======================
      // API通信
      // =======================
      async function apiGet(action, params = {}) {
        const query = new URLSearchParams({
          action,
          ...params,
        });

        const response = await fetch(`${GAS_URL}?${query.toString()}`);

        if (!response.ok) {
          throw new Error("データの取得に失敗しました");
        }

        return response.json();
      }

      async function apiPost(data) {
        const response = await fetch(GAS_URL, {
          method: "POST",
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error("データの登録に失敗しました");
        }

        return response.json();
      }

      // =======================
      // UIロック
      // =======================
      function lockUI(text = "処理中...") {
        uiLockCount++;

        document.body.style.pointerEvents = "none";

        const overlay = document.getElementById("loadingOverlay");
        const message = document.getElementById("loadingMessage");

        if (message && text) message.textContent = text;
        if (overlay) {
          overlay.classList.add("is-visible");
          overlay.setAttribute("aria-hidden", "false");
        }
      }

      function unlockUI() {
        uiLockCount = Math.max(0, uiLockCount - 1);

        if (uiLockCount === 0) {
          document.body.style.pointerEvents = "auto";

          const overlay = document.getElementById("loadingOverlay");

          if (overlay) {
            overlay.classList.remove("is-visible");
            overlay.setAttribute("aria-hidden", "true");
          }
        }
      }

      // =======================
      // HTMLエスケープ
      // =======================
      function escapeHtml(value) {
        return String(value ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");
      }

      // =======================
      // エラー画面
      // =======================
      function showError(error) {
        console.error(error);

        document.getElementById("status").classList.remove("home-screen", "analysis-screen", "schedule-screen");

        document.getElementById("status").innerHTML = `
    <section class="card">

      <h2>読み込みに失敗しました</h2>

      <p class="muted">
        通信環境を確認して、もう一度お試しください
      </p>

      <button onclick="location.reload()">
        再読み込み
      </button>

    </section>
  `;
      }

      // =======================
      // 初回登録画面
      // =======================
      function showRegister(lineUserId) {
        document.getElementById("status").classList.remove("home-screen", "analysis-screen", "schedule-screen");

        document.getElementById("status").innerHTML = `
    <section class="card">

      <h2>初回登録</h2>

      <label>
        保護者名

        <input
          id="parentName"
          placeholder="例：山田太郎"
        >
      </label>

      <h3>お子さま</h3>

      <div id="childrenArea">

        <div class="childRow">

          <input
            class="childName"
            placeholder="子ども名"
          >

          <input
            class="childCourse"
            placeholder="クラスID・コース"
          >

        </div>

      </div>

      <button
        class="secondary"
        onclick="addChildRow()"
      >
        ＋ お子さまを追加
      </button>

      <button
        onclick="registerAll('${lineUserId}')"
      >
        登録する
      </button>

    </section>
  `;
      }

      // =======================
      // 子どもの入力欄を追加
      // =======================
      function addChildRow() {
        const row = document.createElement("div");

        row.className = "childRow";

        row.innerHTML = `
    <input
      class="childName"
      placeholder="子ども名"
    >

    <input
      class="childCourse"
      placeholder="クラスID・コース"
    >
  `;

        document.getElementById("childrenArea").appendChild(row);
      }

      // =======================
      // 保護者・子どもの登録
      // =======================
      async function registerAll(lineUserId) {
        const parentName = document.getElementById("parentName").value.trim();

        const names = [...document.querySelectorAll(".childName")];

        const courses = [...document.querySelectorAll(".childCourse")];

        const children = names
          .map((input, index) => ({
            name: input.value.trim(),
            course: courses[index].value.trim(),
          }))
          .filter((child) => child.name);

        if (!parentName) {
          alert("保護者名を入力してください");
          return;
        }

        if (children.length === 0) {
          alert("お子さまの名前を入力してください");
          return;
        }

        lockUI("登録中...");

        try {
          const parent = await apiPost({
            action: "createParent",
            lineUserId,
            name: parentName,
          });

          if (!parent.success) {
            throw new Error(parent.message || "保護者登録に失敗しました");
          }

          for (const child of children) {
            const result = await apiPost({
              action: "addMember",
              parentId: parent.parentId,
              ...child,
            });

            if (!result.success) {
              throw new Error(result.message || "会員登録に失敗しました");
            }
          }

          alert("登録が完了しました");

          location.reload();
        } catch (error) {
          alert(error.message);
        } finally {
          unlockUI();
        }
      }

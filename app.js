const GAS_URL =
"https://script.google.com/macros/s/AKfycbzjPkLxYBJeBGk9yehLHfUUMhJmQUfxNiaVHyNqjd9MeAqkWOIINjIUBXsxIEpwqa78Mw/exec";

let selectedMembers = [];

let CACHE = {
  profile: null,
  members: null
};  
  

// =======================
// 初期処理
// =======================
async function main() {

  try {

    lockUI("読み込み中...");

    await liff.init({
      liffId: "2010350476-xCTsckal"
    });

    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    CACHE.profile = await liff.getProfile();

    const checkData = await checkParent(CACHE.profile.userId);

    if (!checkData.exists) {
      showRegister(CACHE.profile.userId);
      return;
    }

    await loadHome(CACHE.profile);

  } finally {
    unlockUI();
  }
}
  
// =======================
// 処理中のプロテクト
// =======================
const UI_LOCK = {
  count: 0
};

function lockUI(text = "処理中...") {

  UI_LOCK.count++;

  document.body.style.pointerEvents = "none";
  document.body.style.opacity = "0.6";

  const status = document.getElementById("status");
  if (status) status.innerHTML = text;
}

function unlockUI() {

  UI_LOCK.count = Math.max(0, UI_LOCK.count - 1);

  if (UI_LOCK.count === 0) {
    document.body.style.pointerEvents = "auto";
    document.body.style.opacity = "1";
  }
}

// =======================
// homeに戻る
// =======================
async function returnToHome() {

  const profile = await liff.getProfile();
  await loadHome(profile);

}
  

// =======================
// 未登録UI
// =======================
function showRegister(lineUserId) {

  document.getElementById("status").innerHTML = `
    <h3>初回登録</h3>

    <p>保護者名</p>
    <input id="parentName" placeholder="例：山田太郎">

    <hr>

    <p>お子さま（複数OK）</p>

    <div id="childrenArea">

      <div class="childRow">
        <input class="childName" placeholder="子ども名">
        <input class="childCourse" placeholder="コース">
      </div>

    </div>

    <button onclick="addChildRow()">＋追加</button>

    <br><br>

    <button onclick="registerAll('${lineUserId}')">
      登録する
    </button>
  `;
}
  
function addChildRow() {

  const div = document.createElement("div");

  div.className = "childRow";

  div.innerHTML = `
    <input class="childName" placeholder="子ども名">
    <input class="childCourse" placeholder="コース">
  `;

  document.getElementById("childrenArea").appendChild(div);
}
  
async function registerAll(lineUserId) {

  const parentName = document.getElementById("parentName").value;

  if (!parentName) {
    alert("保護者名を入力してください");
    return;
  }

  // ① 保護者登録
  const parentRes = await fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "createParent",
      lineUserId: lineUserId,
      name: parentName
    })
  });

  const parentData = await parentRes.json();
  const parentId = parentData.parentId;

  // ② 子ども取得
  const names = document.querySelectorAll(".childName");
  const courses = document.querySelectorAll(".childCourse");

  let children = [];

  for (let i = 0; i < names.length; i++) {

    const name = names[i].value;

    if (!name) continue;

    children.push({
      name: name,
      course: courses[i].value
    });

  }

  // ③ 会員登録（兄弟分ループ）
  for (const c of children) {

    await fetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "addMember",
        parentId: parentId,
        name: c.name,
        course: c.course
      })
    });

  }

  alert("登録完了（保護者＋子ども）");
  CACHE.members = null;
  
  location.reload();
}

// =======================
// ホーム
// =======================
async function loadHome(profile) {

  lockUI("会員情報取得中desu...");

  try {

    // ★キャッシュ優先
    if (!CACHE.members) {

      const res = await fetch(
        GAS_URL +
        "?action=getMembersByLineId&lineUserId=" +
        encodeURIComponent(profile.userId)
      );

      const data = await res.json();
      CACHE.members = data.members;

    }

    renderHome(profile);

  } finally {
    unlockUI();
  }
}


// =======================
// 保護者登録
// =======================
async function registerParent(lineUserId) {

  lockUI("登録中...");

  try {

    const name = document.getElementById("parentName").value;

    await fetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "createParent",
        lineUserId,
        name
      })
    });

    alert("登録完了");
    CACHE.members = null;

    await returnToHome(); // ★初期画面へ

  } finally {
    unlockUI();
  }
}


// =======================
// 会員追加（※未使用なら削除OK）
// =======================
async function addMember() {

  lockUI("登録中...");

  try {

    const name = document.getElementById("memberName").value;
    const course = document.getElementById("memberCourse").value;

    const profile = await liff.getProfile();
    const parentId = await getParentId(profile.userId);

    await fetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "addMember",
        parentId,
        name,
        course
      })
    });

    alert("登録完了");
    CACHE.members = null;

    await returnToHome(); // ★ここがポイント

  } finally {
    unlockUI();
  }
}


// =======================
// 欠席申請
// =======================
async function sendAbsence() {

  lockUI("申請中...");

  try {

    const date = document.getElementById("absenceDate").value;

    for (const m of selectedMembers) {

      await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "absenceRequest",
          memberId: m.id,
          memberName: m.name,
          absenceDate: date
        })
      });

    }

    alert("申請完了");

    selectedMembers = [];

    await returnToHome(); // ★戻る

  } finally {
    unlockUI();
  }
}


// =======================
// 会員選択
// =======================
function selectMember(id, name) {

  const exists = selectedMembers.find(m => m.id === id);

  if (exists) {
    selectedMembers = selectedMembers.filter(m => m.id !== id);
  } else {
    selectedMembers.push({ id, name });
  }
}


// =======================
// API
// =======================
async function checkParent(lineUserId) {

  const res = await fetch(
    GAS_URL +
    "?action=getParentByLineId&lineUserId=" +
    encodeURIComponent(lineUserId)
  );

  return await res.json();
}

// ======================
// 描写関係
// ======================
function renderHome(profile) {

  let html = "";

  html += "こんにちは " + profile.displayName + " さん<br><br>";
  html += "<b>登録会員</b><br>";

  for (const member of CACHE.members) {

    const isSelected = selectedMembers.some(m => m.id === member.memberId);

    html += `
      <div style="margin:6px 0;">

        <button 
          onclick="selectMember('${member.memberId}', '${member.name}')"
          style="
            padding:8px 12px;
            border-radius:6px;
            border:1px solid #ccc;
            background:${isSelected ? '#4CAF50' : '#ffffff'};
            color:${isSelected ? '#ffffff' : '#000000'};
            font-weight:${isSelected ? 'bold' : 'normal'};
            transition:0.2s;
          "
        >
          ${member.name}
          ${isSelected ? ' ✔' : ''}
        </button>

      </div>
    `;
  }

  html += `
    <hr>
    <input type="date" id="absenceDate">
    <br><br>
    <button onclick="sendAbsence()">欠席申請</button>
  `;

  document.getElementById("status").innerHTML = html;
}

// =======================
// 起動
// =======================
main();

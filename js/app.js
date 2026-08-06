// =======================
// 初期処理
// =======================
async function main() {
  lockUI(
    "読み込み中...",
  );

  try {
    await liff.init({
      liffId:
        LIFF_ID,
    });

    if (
      !liff.isLoggedIn()
    ) {
      liff.login();

      return;
    }

    CACHE.profile =
      await liff.getProfile();

    /*
     * 保護者情報と管理者情報を
     * 同時に取得する
     */
    const [
      parentData,
      adminData,
    ] = await Promise.all([
      apiGet(
        "getParentByLineId",
        {
          lineUserId:
            CACHE.profile.userId,
        },
      ),

      apiGet(
        "getAdminByLineId",
        {
          lineUserId:
            CACHE.profile.userId,
        },
      ),
    ]);

    CACHE.isAdmin =
      Boolean(
        adminData.success &&
        adminData.isAdmin,
      );

    CACHE.admin =
      CACHE.isAdmin
        ? adminData.admin
        : null;

    const parentStatus =
      String(
        parentData.status ||
          "",
      );

    /*
     * 保護者が登録申請後、
     * 社員の承認待ちの場合
     */
    if (
      parentData.exists &&
      parentStatus ===
        "確認待ち"
    ) {
      showRegistrationPending();

      return;
    }

    /*
     * 無効または退会の場合
     */
    if (
      parentData.exists &&
      [
        "無効",
        "退会",
      ].includes(
        parentStatus,
      )
    ) {
      showRegistrationUnavailable(
        "登録状態を確認できません。スクールまでお問い合わせください",
      );

      return;
    }

    /*
     * 保護者でも管理者でもない場合だけ
     * 初回登録画面を表示する
     */
    if (
      !parentData.exists &&
      !CACHE.isAdmin
    ) {
      showRegister(
        CACHE.profile.userId,
      );

      return;
    }

    await loadHome();
  } catch (error) {
    showError(
      error,
    );
  } finally {
    unlockUI();
  }
}


// =======================
// 起動
// =======================
main();

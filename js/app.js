// =======================
      // 初期処理
      // =======================
async function main() {
  lockUI("読み込み中...");

  try {
    await liff.init({
      liffId: LIFF_ID,
    });

    if (!liff.isLoggedIn()) {
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
    showError(error);
  } finally {
    unlockUI();
  }
}

      // =======================
      // 起動
      // =======================
      main();

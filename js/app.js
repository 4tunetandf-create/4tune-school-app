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

          CACHE.profile = await liff.getProfile();

          const parent = await apiGet("getParentByLineId", {
            lineUserId: CACHE.profile.userId,
          });

          if (!parent.exists) {
            showRegister(CACHE.profile.userId);
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

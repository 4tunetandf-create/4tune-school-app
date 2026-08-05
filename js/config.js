const GAS_URL =
        "https://script.google.com/macros/s/AKfycbzjPkLxYBJeBGk9yehLHfUUMhJmQUfxNiaVHyNqjd9MeAqkWOIINjIUBXsxIEpwqa78Mw/exec";

      const LIFF_ID = "2010350476-xCTsckal";

      const CACHE = {
        profile: null,
        members: null,
        schedules: null,
        isAdmin: null,

        // 分析ファイル一覧
        analysisMembers: null,
        analysisError: null,

        // 読み込み済みの分析データ
        analysisData: {},

        // 読み込み済みのDコース分析データ
        dAnalysisData: {},
      };

      let stickViewer = null;
      let centerOfMassGraph = null;
      let jointAngleGraph = null;
      let jointContractionVelocityGraph = null;
      let currentAnalysisData = null;
      let graphOverlayEnabled = true;

      const JOINT_ANGLE_POINTS = {
        rightElbow: [1, 2, 3],
        rightShoulder: [2, 3, 13],
        leftElbow: [5, 6, 7],
        leftShoulder: [6, 7, 19],
        rightHip: [3, 13, 12],
        rightKnee: [13, 12, 11],
        rightAnkle: [12, 11, 9],
        leftHip: [7, 19, 18],
        leftKnee: [19, 18, 17],
        leftAnkle: [18, 17, 15],
      };

      const STICK_COLORS = {
        right: "#1565c0",
        left: "#e53935",
        center: "#263238",
        forwardLean: "#ffffff",
        forwardLeanBorder: "#78909c",
      };

      const RIGHT_JOINTS = new Set([0, 1, 2, 3, 8, 9, 10, 11, 12, 13]);

      const LEFT_JOINTS = new Set([4, 5, 6, 7, 14, 15, 16, 17, 18, 19]);

      const STICK_BONES = [
        [0, 1],
        [1, 2],
        [2, 3],
        [4, 5],
        [5, 6],
        [6, 7],

        [8, 9],
        [9, 10],
        [10, 11],
        [11, 12],
        [12, 13],

        [14, 15],
        [15, 16],
        [16, 17],
        [17, 18],
        [18, 19],

        [3, 7],
        [3, 22],
        [7, 22],

        [13, 19],
        [3, 13],
        [7, 19],

        [20, 21],
        [21, 22],
      ];

      let currentCalendarDate = new Date();
      let uiLockCount = 0;

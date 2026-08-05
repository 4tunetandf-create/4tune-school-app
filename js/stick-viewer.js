// =======================
      // 軽量スティックビューア
      // =======================
      class LightweightStickViewer {
        constructor(
          canvas,
          playButton,
          loopButton,
          trajectoryButton,
          memberName,
        ) {
          this.canvas = canvas;

          this.context = canvas.getContext("2d");

          this.playButton = playButton;

          this.loopButton = loopButton;

          this.trajectoryButton = trajectoryButton;

          this.memberName = String(memberName || "");

          this.frames = [];

          this.centerOfMassPoints = [];

          this.graphOverlayVisible = false;

          this.graphOverlayName = "centerOfMass";

          this.graphOverlayPart = "rightElbow";

          this.frameIndex = 0;

          this.fps = 30;

          this.playSpeed = 1;

          this.isPlaying = false;

          this.loopEnabled = false;

          this.footTrajectoryEnabled = false;

          this.firstStepFoot = "";

          this.trajectoryJointIndex = null;

          this.animationId = null;

          this.lastTime = 0;

          this.accumulatedTime = 0;

          /*
           * 将来のサイズ変更用
           */
          this.zoom = 1;

          this.fitScale = 100;

          this.centerX = 0;
          this.centerY = 0;
        }

        // =====================
        // データ設定
        // =====================
        setData(
          rows,
          fps,
          centerOfMassPoints,
          movementDirection,
          firstStepFoot,
        ) {
          this.stop();

          this.movementDirection = String(movementDirection || "右").trim();

          this.firstStepFoot = String(firstStepFoot || "").trim();

          if (this.firstStepFoot.includes("左")) {
            this.trajectoryJointIndex = 14;
          } else if (this.firstStepFoot.includes("右")) {
            this.trajectoryJointIndex = 8;
          } else {
            this.trajectoryJointIndex = null;
          }

          this.footTrajectoryEnabled = false;

          this.updateTrajectoryButton();

          this.fps = Number(fps) > 0 ? Number(fps) : 30;

          this.frames = this.convertRowsToFrames(rows || []);

          this.centerOfMassPoints = (centerOfMassPoints || []).map((point) => {
            if (!point) {
              return null;
            }

            const x = this.toNumber(point.x);
            const y = this.toNumber(point.y);

            return x === null || y === null ? null : { x: x, y: y };
          });

          if (this.frames.length === 0) {
            throw new Error("表示できる座標データがありません");
          }

          this.frameIndex = 0;

          this.calculateFit();

          this.draw();
        }

        setGraphOverlay(options) {
          this.graphOverlayVisible = Boolean(options?.visible);
          this.graphOverlayName = String(options?.graphName || "centerOfMass");
          this.graphOverlayPart = String(options?.partName || "rightElbow");
          this.draw();
        }

        toggleFootTrajectory() {
          if (this.trajectoryJointIndex === null) {
            return;
          }

          this.footTrajectoryEnabled = !this.footTrajectoryEnabled;

          this.updateTrajectoryButton();

          this.draw();
        }

        updateTrajectoryButton() {
          if (!this.trajectoryButton) {
            return;
          }

          const hasFootData = this.trajectoryJointIndex !== null;

          this.trajectoryButton.disabled = !hasFootData;
          this.trajectoryButton.classList.toggle(
            "is-active",
            hasFootData && this.footTrajectoryEnabled,
          );
          this.trajectoryButton.setAttribute(
            "aria-pressed",
            String(hasFootData && this.footTrajectoryEnabled),
          );
          this.trajectoryButton.textContent = hasFootData
            ? "足の軌道：" + (this.footTrajectoryEnabled ? "ON" : "OFF")
            : "足の軌道：データなし";
        }

        drawFootTrajectory() {
          if (
            !this.footTrajectoryEnabled ||
            this.trajectoryJointIndex === null
          ) {
            return;
          }

          const context = this.context;
          let pathStarted = false;

          context.save();
          context.lineWidth = 2;
          context.lineCap = "round";
          context.lineJoin = "round";
          context.strokeStyle = this.trajectoryJointIndex === 8
            ? "rgba(21, 101, 192, 0.28)"
            : "rgba(229, 57, 53, 0.28)";
          context.beginPath();

          for (const trajectoryFrame of this.frames) {
            const toePoint = trajectoryFrame[this.trajectoryJointIndex];

            if (!toePoint) {
              pathStarted = false;
              continue;
            }

            const position = this.toCanvas(toePoint);

            if (!pathStarted) {
              context.moveTo(position.x, position.y);
              pathStarted = true;
            } else {
              context.lineTo(position.x, position.y);
            }
          }

          context.stroke();
          context.restore();
        }

        // =====================
        // 46列の座標を23点へ変換
        // =====================
        convertRowsToFrames(rows) {
          const frames = [];

          for (const row of rows) {
            if (!Array.isArray(row) || row.length < 46) {
              continue;
            }

            /*
             * B:AUだけを取得しているため、
             * 元のExcelコードから列番号を
             * 1つずらしている
             *
             * 右大転子
             * x = 26
             * y = 27
             *
             * 左大転子
             * x = 38
             * y = 39
             */
            const rightHipX = this.toNumber(row[26]);

            const rightHipY = this.toNumber(row[27]);

            const leftHipX = this.toNumber(row[38]);

            const leftHipY = this.toNumber(row[39]);

            let centerX = 0;
            let centerY = 0;

            if (rightHipX !== null && leftHipX !== null) {
              centerX = (rightHipX + leftHipX) / 2;
            }

            if (rightHipY !== null && leftHipY !== null) {
              centerY = (rightHipY + leftHipY) / 2;
            }

            const joints = [];

            /*
             * 2列で1点
             * x、yを23点分読み込む
             */
            for (let column = 0; column < 46; column += 2) {
              const x = this.toNumber(row[column]);

              const y = this.toNumber(row[column + 1]);

              if (x === null || y === null) {
                joints.push(null);
              } else {
                joints.push({
                  x: x - centerX,
                  y: y - centerY,
                });
              }
            }

            if (joints.some((point) => point !== null)) {
              frames.push(joints);
            }
          }

          return frames;
        }

        // =====================
        // 数値変換
        // =====================
        toNumber(value) {
          if (value === null || value === "" || value === undefined) {
            return null;
          }

          const number = Number(value);

          return Number.isFinite(number) ? number : null;
        }

        // =====================
        // 全フレームに合う表示倍率
        // =====================
        calculateFit() {
          let minX = Infinity;
          let maxX = -Infinity;

          let minY = Infinity;
          let maxY = -Infinity;

          for (const frame of this.frames) {
            for (const point of frame) {
              if (!point) {
                continue;
              }

              minX = Math.min(minX, point.x);

              maxX = Math.max(maxX, point.x);

              minY = Math.min(minY, point.y);

              maxY = Math.max(maxY, point.y);
            }
          }

          if (
            !Number.isFinite(minX) ||
            !Number.isFinite(maxX) ||
            !Number.isFinite(minY) ||
            !Number.isFinite(maxY)
          ) {
            this.fitScale = 100;
            this.centerX = 0;
            this.centerY = 0;

            return;
          }

          const width = Math.max(maxX - minX, 0.01);

          const height = Math.max(maxY - minY, 0.01);

          const horizontalScale = (this.canvas.width - 70) / width;

          const verticalScale = (this.canvas.height - 70) / height;

          this.fitScale = Math.min(horizontalScale, verticalScale);

          this.centerX = (minX + maxX) / 2;

          this.centerY = (minY + maxY) / 2;
        }

        // =====================
        // 表示倍率変更
        // =====================
        setZoom(percent) {
          const value = Number(percent);

          if (!Number.isFinite(value)) {
            return;
          }

          this.zoom = Math.max(0.5, Math.min(value / 100, 2));

          this.draw();
        }

        // =====================
        // 再生速度変更
        // =====================
        setPlaySpeed(speed) {
          const allowedSpeeds = [0.25, 0.5, 1, 2, 4];

          const number = Number(speed);

          if (!allowedSpeeds.includes(number)) {
            return;
          }

          this.playSpeed = number;

          /*
           * 再生中に速度を変えた際の
           * 急なフレーム飛びを防止
           */
          if (this.isPlaying) {
            this.lastTime = performance.now();

            this.accumulatedTime = 0;
          }
        }

        // =====================
        // Canvas座標へ変換
        // =====================
        toCanvas(point) {
          const scale = this.fitScale * this.zoom;

          return {
            x: this.canvas.width / 2 + (point.x - this.centerX) * scale,

            y: this.canvas.height / 2 - (point.y - this.centerY) * scale,
          };
        }

        // =====================
        // 描画
        // =====================
        draw() {
          const context = this.context;

          context.fillStyle = "#ffffff";

          context.fillRect(0, 0, this.canvas.width, this.canvas.height);

          const frame = this.frames[this.frameIndex];

          if (!frame) {
            return;
          }

          /*
           * 1歩目の足のつま先軌道を
           * 全フレーム分、骨格の背面に表示
           */
          this.drawFootTrajectory();

          /*
           * 骨格線
           */
          context.lineWidth = 3;

          context.lineCap = "round";

          context.lineJoin = "round";

          for (const bone of STICK_BONES) {
            const firstPoint = frame[bone[0]];

            const secondPoint = frame[bone[1]];

            if (!firstPoint || !secondPoint) {
              continue;
            }

            const start = this.toCanvas(firstPoint);

            const end = this.toCanvas(secondPoint);

            context.strokeStyle = this.getBoneColor(bone);

            context.beginPath();

            context.moveTo(start.x, start.y);

            context.lineTo(end.x, end.y);

            context.stroke();
          }

          this.drawGraphOverlay(frame);

          /*
           * 関節点
           */
          frame.forEach((point, jointIndex) => {
            if (!point) {
              return;
            }

            const position = this.toCanvas(point);

            context.beginPath();

            context.arc(position.x, position.y, 4, 0, Math.PI * 2);

            context.fillStyle = this.getJointColor(jointIndex);
            context.fill();

            context.lineWidth = 1;
            context.strokeStyle = "rgba(255, 255, 255, 0.9)";
            context.stroke();
          });

          this.drawInformationOverlay();

          if (typeof this.onFrameChange === "function") {
            this.onFrameChange(this.frameIndex);
          }
        }

        getJointColor(jointIndex) {
          if (RIGHT_JOINTS.has(jointIndex)) {
            return STICK_COLORS.right;
          }

          if (LEFT_JOINTS.has(jointIndex)) {
            return STICK_COLORS.left;
          }

          return STICK_COLORS.center;
        }

        getBoneColor(bone) {
          const firstIndex = bone[0];
          const secondIndex = bone[1];

          if (RIGHT_JOINTS.has(firstIndex) && RIGHT_JOINTS.has(secondIndex)) {
            return STICK_COLORS.right;
          }

          if (LEFT_JOINTS.has(firstIndex) && LEFT_JOINTS.has(secondIndex)) {
            return STICK_COLORS.left;
          }

          return STICK_COLORS.center;
        }

        // =====================
        // グラフモード限定の補助表示
        // =====================
        drawGraphOverlay(frame) {
          if (!this.graphOverlayVisible) {
            return;
          }

          if (this.graphOverlayName === "centerOfMass") {
            this.drawCenterOfMassPoint();
            return;
          }

          if (
            this.graphOverlayName === "jointAngle" ||
            this.graphOverlayName === "jointAngularVelocity"
          ) {
            this.drawSelectedAngle(frame);
          }
        }

        drawCenterOfMassPoint() {
          const point = this.centerOfMassPoints[this.frameIndex];

          if (!point) {
            return;
          }

          const position = this.toCanvas(point);
          const context = this.context;

          context.save();
          context.beginPath();
          context.arc(position.x, position.y, 7, 0, Math.PI * 2);
          context.fillStyle = "#00a6d6";
          context.fill();
          context.lineWidth = 2;
          context.strokeStyle = "#ffffff";
          context.stroke();
          context.restore();
        }

        drawSelectedAngle(frame) {
          if (this.graphOverlayPart === "forwardLeanAngle") {
            this.drawForwardLeanAngle(frame);
            return;
          }

          const pointIndexes = JOINT_ANGLE_POINTS[this.graphOverlayPart];

          if (!pointIndexes) {
            return;
          }

          const first = frame[pointIndexes[0]];
          const vertex = frame[pointIndexes[1]];
          const second = frame[pointIndexes[2]];

          if (!first || !vertex || !second) {
            return;
          }

          const colors = this.getAngleColors(this.graphOverlayPart);

          this.drawAngleSector(
            this.toCanvas(first),
            this.toCanvas(vertex),
            this.toCanvas(second),
            colors,
          );
        }

        getAngleColors(partName) {
          if (String(partName).startsWith("right")) {
            return {
              fill: "rgba(21, 101, 192, 0.28)",
              stroke: STICK_COLORS.right,
            };
          }

          if (String(partName).startsWith("left")) {
            return {
              fill: "rgba(229, 57, 53, 0.28)",
              stroke: STICK_COLORS.left,
            };
          }

          return {
            fill: "rgba(255, 255, 255, 0.55)",
            stroke: STICK_COLORS.forwardLeanBorder,
          };
        }

        drawForwardLeanAngle(frame) {
          const rightHip = frame[13];
          const leftHip = frame[19];
          const headTop = frame[20];

          if (!rightHip || !leftHip || !headTop) {
            return;
          }

          const hipCenter = {
            x: (rightHip.x + leftHip.x) / 2,
            y: (rightHip.y + leftHip.y) / 2,
          };

          /*
           * 動作方向は基礎情報B9だけで決める。
           * 各フレームの座標値では切り替えないため、
           * 再生途中で基準方向が反転しない。
           */
          const movesLeft = this.movementDirection.includes("左");
          const horizontalPoint = {
            x: hipCenter.x + (movesLeft ? -1 : 1),
            y: hipCenter.y,
          };

          const canvasHipCenter = this.toCanvas(hipCenter);
          const canvasHorizontalPoint = this.toCanvas(horizontalPoint);
          const canvasHeadTop = this.toCanvas(headTop);
          const context = this.context;

          context.save();

          // 地面と平行な補助線
          context.beginPath();
          context.moveTo(canvasHipCenter.x - 120, canvasHipCenter.y);
          context.lineTo(canvasHipCenter.x + 120, canvasHipCenter.y);
          context.strokeStyle = "rgba(38, 50, 56, 0.28)";
          context.lineWidth = 1.5;
          context.setLineDash([5, 4]);
          context.stroke();

          // 左右大転子中点から頭頂までの補助線
          context.beginPath();
          context.moveTo(canvasHipCenter.x, canvasHipCenter.y);
          context.lineTo(canvasHeadTop.x, canvasHeadTop.y);
          context.strokeStyle = "rgba(38, 50, 56, 0.35)";
          context.lineWidth = 1.5;
          context.setLineDash([]);
          context.stroke();

          context.restore();

          this.drawAngleSector(
            canvasHorizontalPoint,
            canvasHipCenter,
            canvasHeadTop,
            this.getAngleColors("forwardLeanAngle"),
          );
        }

        drawAngleSector(first, vertex, second, colors) {
          const context = this.context;
          const firstAngle = Math.atan2(first.y - vertex.y, first.x - vertex.x);
          const secondAngle = Math.atan2(
            second.y - vertex.y,
            second.x - vertex.x,
          );
          let angleDifference = secondAngle - firstAngle;

          while (angleDifference > Math.PI) {
            angleDifference -= Math.PI * 2;
          }

          while (angleDifference < -Math.PI) {
            angleDifference += Math.PI * 2;
          }

          const radius = 30;
          const anticlockwise = angleDifference < 0;

          context.save();
          context.beginPath();
          context.moveTo(vertex.x, vertex.y);
          context.arc(
            vertex.x,
            vertex.y,
            radius,
            firstAngle,
            firstAngle + angleDifference,
            anticlockwise,
          );
          context.closePath();
          context.fillStyle = colors?.fill || "rgba(38, 50, 56, 0.2)";
          context.fill();
          context.lineWidth = 2;
          context.strokeStyle = colors?.stroke || STICK_COLORS.center;
          context.stroke();
          context.restore();
        }

        // =====================
        // 会員名・フレーム・時間表示
        // =====================
        drawInformationOverlay() {
          const context = this.context;
          const seconds = this.frameIndex / this.fps;
          const right = this.canvas.width - 14;
          const top = 14;
          const padding = 12;
          const lineHeight = 23;
          const lines = [
            this.memberName,
            "Frame " + (this.frameIndex + 1) + " / " + this.frames.length,
            "Time " + seconds.toFixed(2) + "秒",
          ];

          context.save();

          context.font = "bold 20px sans-serif";

          const textWidth = Math.max(
            ...lines.map((line) => context.measureText(line).width),
          );

          const boxWidth = textWidth + padding * 2;
          const boxHeight = lineHeight * lines.length + padding;
          const boxLeft = right - boxWidth + padding;

          context.fillStyle = "rgba(255, 255, 255, 0.72)";
          context.fillRect(boxLeft, top, boxWidth, boxHeight);

          context.fillStyle = "#27312e";
          context.textAlign = "right";
          context.textBaseline = "top";

          lines.forEach((line, index) => {
            context.font =
              index === 0 ? "bold 20px sans-serif" : "17px sans-serif";

            context.fillText(line, right, top + 7 + index * lineHeight);
          });

          context.restore();
        }

        // =====================
        // 再生
        // =====================
        play() {
          if (this.frames.length === 0 || this.isPlaying) {
            return;
          }

          /*
           * 最終フレームから再生した場合は
           * 最初に戻す
           */
          if (this.frameIndex >= this.frames.length - 1) {
            this.frameIndex = 0;
            this.draw();
          }

          this.isPlaying = true;

          this.lastTime = performance.now();

          this.accumulatedTime = 0;

          this.updatePlayButton();

          this.animationId = requestAnimationFrame((time) =>
            this.playLoop(time),
          );
        }

        // =====================
        // FPSに合わせた再生
        // =====================
        playLoop(currentTime) {
          if (!this.isPlaying) {
            return;
          }

          const elapsed = currentTime - this.lastTime;

          this.lastTime = currentTime;

          this.accumulatedTime += elapsed;

          const frameInterval = 1000 / (this.fps * this.playSpeed);

          /*
           * 200fpsなど、画面更新速度より
           * fpsが高い場合は必要な数だけ
           * フレームを進める
           */
          const advanceCount = Math.floor(this.accumulatedTime / frameInterval);

          if (advanceCount > 0) {
            this.accumulatedTime -= advanceCount * frameInterval;

            this.frameIndex += advanceCount;

            if (this.frameIndex >= this.frames.length) {
              if (this.loopEnabled) {
                this.frameIndex = this.frameIndex % this.frames.length;

                this.draw();
              } else {
                this.frameIndex = this.frames.length - 1;

                this.stop();
                this.draw();

                return;
              }
            } else {
              this.draw();
            }
          }

          this.animationId = requestAnimationFrame((time) =>
            this.playLoop(time),
          );
        }

        // =====================
        // 一時停止
        // =====================
        stop() {
          this.isPlaying = false;

          if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);

            this.animationId = null;
          }

          this.updatePlayButton();
        }

        // =====================
        // 再生切替
        // =====================
        togglePlay() {
          if (this.isPlaying) {
            this.stop();
          } else {
            this.play();
          }
        }

        // =====================
        // ループ再生切り替え
        // =====================
        toggleLoop() {
          this.loopEnabled = !this.loopEnabled;

          this.updateLoopButton();
        }

        // =====================
        // ループボタン表示更新
        // =====================
        updateLoopButton() {
          if (!this.loopButton) {
            return;
          }

          if (this.loopEnabled) {
            this.loopButton.textContent = "ループ再生：ON";

            this.loopButton.classList.add("is-active");

            this.loopButton.setAttribute("aria-pressed", "true");
          } else {
            this.loopButton.textContent = "ループ再生：OFF";

            this.loopButton.classList.remove("is-active");

            this.loopButton.setAttribute("aria-pressed", "false");
          }
        }

        // =====================
        // 1コマ進む
        // =====================
        nextFrame() {
          if (this.frames.length === 0) {
            return;
          }

          this.stop();

          this.frameIndex = (this.frameIndex + 1) % this.frames.length;

          this.draw();
        }

        // =====================
        // 1コマ戻る
        // =====================
        previousFrame() {
          if (this.frames.length === 0) {
            return;
          }

          this.stop();

          this.frameIndex =
            (this.frameIndex - 1 + this.frames.length) % this.frames.length;

          this.draw();
        }

        // =====================
        // ボタン表示更新
        // =====================
        updatePlayButton() {
          if (!this.playButton) {
            return;
          }

          this.playButton.textContent = this.isPlaying ? "一時停止" : "再生";
        }

        // =====================
        // ビューア終了
        // =====================
        destroy() {
          this.stop();

          this.frames = [];
        }
      }

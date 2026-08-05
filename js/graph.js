// =======================
      // 軽量グラフ
      // =======================
      class LightweightLineGraph {
        constructor(canvas, currentValueElement, options = {}) {
          this.canvas = canvas;
          this.context = canvas.getContext("2d");
          this.currentValueElement = currentValueElement;
          this.yAxisLabel = options.yAxisLabel || "";
          this.unit = options.unit || "";
          this.precision = Number.isInteger(options.precision)
            ? options.precision
            : 2;
          this.values = [];
          this.fps = 30;
          this.currentFrame = 0;
          this.margin = {
            left: 46,
            right: 18,
            top: 14,
            bottom: 56,
          };
        }

        setData(values, fps) {
          this.values = Array.isArray(values)
            ? values.map(function (value) {
                const numberValue = Number(value);

                return value !== null &&
                  value !== "" &&
                  Number.isFinite(numberValue)
                  ? numberValue
                  : null;
              })
            : [];

          this.fps = Number(fps) > 0 ? Number(fps) : 30;
          this.currentFrame = 0;
          this.draw();
        }

        setCurrentFrame(frameIndex) {
          const lastIndex = Math.max(0, this.values.length - 1);
          const numberValue = Number(frameIndex);

          this.currentFrame = Number.isFinite(numberValue)
            ? Math.max(0, Math.min(Math.floor(numberValue), lastIndex))
            : 0;

          this.draw();
        }

        getValidValues() {
          return this.values.filter(function (value) {
            return typeof value === "number" && Number.isFinite(value);
          });
        }

        getYRange() {
          const validValues = this.getValidValues();

          if (validValues.length === 0) {
            return {
              min: 0,
              max: 1,
            };
          }

          const minimum = Math.min(...validValues);
          const maximum = Math.max(...validValues);
          const span =
            maximum - minimum || Math.max(Math.abs(maximum), 1) * 0.1;

          let min = minimum - span * 0.1;
          let max = maximum + span * 0.1;

          if (minimum > 0 && min < 0) {
            min = 0;
          }

          if (maximum < 0 && max > 0) {
            max = 0;
          }

          return {
            min: min,
            max: max,
          };
        }

        mapX(frameIndex) {
          const plotWidth =
            this.canvas.width - this.margin.left - this.margin.right;
          const lastIndex = Math.max(1, this.values.length - 1);

          return this.margin.left + (frameIndex / lastIndex) * plotWidth;
        }

        mapY(value, min, max) {
          const plotHeight =
            this.canvas.height - this.margin.top - this.margin.bottom;
          const ratio = (value - min) / (max - min || 1);

          return this.canvas.height - this.margin.bottom - ratio * plotHeight;
        }

        draw() {
          const context = this.context;
          const width = this.canvas.width;
          const height = this.canvas.height;

          context.clearRect(0, 0, width, height);
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);

          const range = this.getYRange();

          this.drawGridAndAxes(range.min, range.max);
          this.drawLine(range.min, range.max);
          this.drawCurrentPoint(range.min, range.max);
          this.updateCurrentValue();
        }

        drawGridAndAxes(min, max) {
          const context = this.context;
          const plotLeft = this.margin.left;
          const plotRight = this.canvas.width - this.margin.right;
          const plotTop = this.margin.top;
          const plotBottom = this.canvas.height - this.margin.bottom;
          const yTickCount = 5;
          const xTickCount = 4;

          context.font = "11px sans-serif";
          context.lineWidth = 1;

          for (let index = 0; index <= yTickCount; index++) {
            const value = min + ((max - min) * index) / yTickCount;
            const y = this.mapY(value, min, max);

            context.strokeStyle = "#e3e9e7";
            context.beginPath();
            context.moveTo(plotLeft, y);
            context.lineTo(plotRight, y);
            context.stroke();

            context.fillStyle = "#65706c";
            context.textAlign = "right";
            context.textBaseline = "middle";
            context.fillText(value.toFixed(2), plotLeft - 7, y);
          }

          const lastIndex = Math.max(0, this.values.length - 1);

          for (let index = 0; index <= xTickCount; index++) {
            const frameIndex = (lastIndex * index) / xTickCount;
            const x = this.mapX(frameIndex);
            const seconds = frameIndex / this.fps;

            context.strokeStyle = "#eef2f0";
            context.beginPath();
            context.moveTo(x, plotTop);
            context.lineTo(x, plotBottom);
            context.stroke();

            context.fillStyle = "#65706c";
            context.textAlign = "center";
            context.textBaseline = "top";
            context.fillText(seconds.toFixed(2), x, plotBottom + 8);
          }

          context.strokeStyle = "#53605c";
          context.lineWidth = 1.5;
          context.beginPath();
          context.moveTo(plotLeft, plotTop);
          context.lineTo(plotLeft, plotBottom);
          context.lineTo(plotRight, plotBottom);
          context.stroke();

          context.fillStyle = "#53605c";
          context.font = "12px sans-serif";
          context.textAlign = "center";
          context.textBaseline = "bottom";
          context.fillText(
            "時間（秒）",
            (plotLeft + plotRight) / 2,
            this.canvas.height - 3,
          );

        }

        drawLine(min, max) {
          const context = this.context;
          let lineStarted = false;

          context.beginPath();
          context.strokeStyle = "#4f9c8a";
          context.lineWidth = 3;
          context.lineJoin = "round";
          context.lineCap = "round";

          this.values.forEach((value, index) => {
            if (typeof value !== "number" || !Number.isFinite(value)) {
              lineStarted = false;
              return;
            }

            const x = this.mapX(index);
            const y = this.mapY(value, min, max);

            if (!lineStarted) {
              context.moveTo(x, y);
              lineStarted = true;
            } else {
              context.lineTo(x, y);
            }
          });

          context.stroke();
        }

        drawCurrentPoint(min, max) {
          const value = this.values[this.currentFrame];

          if (typeof value !== "number" || !Number.isFinite(value)) {
            return;
          }

          const context = this.context;
          const x = this.mapX(this.currentFrame);
          const y = this.mapY(value, min, max);

          context.strokeStyle = "rgba(239, 83, 80, 0.35)";
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(x, this.margin.top);
          context.lineTo(x, this.canvas.height - this.margin.bottom);
          context.stroke();

          context.fillStyle = "#ef5350";
          context.beginPath();
          context.arc(x, y, 6, 0, Math.PI * 2);
          context.fill();

          context.strokeStyle = "#ffffff";
          context.lineWidth = 2;
          context.stroke();
        }

        updateCurrentValue() {
          if (!this.currentValueElement) {
            return;
          }

          const value = this.values[this.currentFrame];

          this.currentValueElement.textContent =
            typeof value === "number" && Number.isFinite(value)
              ? value.toFixed(this.precision) + this.unit
              : "-" + this.unit;
        }
      }

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import defaultImage from "./images/abe.jpg";

function getImageCanvas(url: string): Promise<{
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}> {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;

      const context = canvas.getContext("2d")!;

      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      resolve({
        canvas,
        context,
      });
    };
    image.src = url;
  });
}

function scaleCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const newCanvas = document.createElement("canvas");
  newCanvas.width = width;
  newCanvas.height = height;
  const newContext = newCanvas.getContext("2d")!;

  newContext.drawImage(canvas, 0, 0, width, height);

  return { canvas: newCanvas, context: newContext };
}

function transformData(
  imageData: ImageData,
  width: number,
  height: number
): Array<Array<number>> {
  const arr = new Array(height).fill(0).map(() => new Array(width).fill(1));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4;
      const [r, g, b, _a] = imageData.data.slice(pixelIndex, pixelIndex + 4);
      const luminance = (255 - (0.2126 * r + 0.7152 * g + 0.0722 * b)) / 255;

      arr[y][x] = luminance;
    }
  }

  return arr;
}

const MAX_WIDTH = 600;

export function App() {
  const [imageSrc, setImageSrc] = useState(() => defaultImage);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function start() {
      const { canvas } = await getImageCanvas(imageSrc);

      const drawingCanvas = canvasRef.current!;
      drawingCanvas.width = MAX_WIDTH;
      drawingCanvas.height = canvas.height * (MAX_WIDTH / canvas.width);
      drawingCanvas.style.imageRendering = "pixelated";

      const drawingContext = drawingCanvas.getContext("2d")!;
      drawingContext.imageSmoothingEnabled = false;

      const scaledCanvas = scaleCanvas(canvas, MAX_WIDTH, 50);

      drawingContext.globalAlpha = 0;
      drawingContext.drawImage(
        scaledCanvas.canvas,
        0,
        0,
        drawingCanvas.width,
        drawingCanvas.height
      );
      drawingContext.globalAlpha = 1;

      const dataPoints = transformData(
        scaledCanvas.context.getImageData(
          0,
          0,
          scaledCanvas.canvas.width,
          scaledCanvas.canvas.height
        ),
        drawingCanvas.width,
        drawingCanvas.height
      );

      const rowHeight = drawingCanvas.height / scaledCanvas.canvas.height;
      for (let row = 0; row < dataPoints.length; row++) {
        const rowData = dataPoints[row];

        let realY = row * rowHeight + rowHeight / 2;

        let lastX = 0;
        let lastY = realY;

        for (let x = 0; x < rowData.length; x++) {
          const pixel = rowData[x];
          drawingContext.beginPath();

          //const amplitude = (rowHeight / 2) * 0.8;
          //const frequency = pixel / (2 * Math.PI);
          const phaseShift = 0;

          const amplitude = ((pixel * rowHeight) / 2) * 0.9;
          const frequency = 5 / (2 * Math.PI);

          const dY =
            amplitude *
            1.8 *
            Math.sin(
              Math.sin(
                Math.sin(
                  Math.sin(
                    Math.sin(
                      Math.sin(
                        Math.sin(
                          Math.sin(
                            Math.sin(
                              Math.sin(
                                Math.sin(Math.sin(x * frequency + phaseShift))
                              )
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
            );

          //const dY = amplitude * Math.sin(x * frequency + phaseShift);

          drawingContext.moveTo(lastX, lastY);

          drawingContext.lineTo(x + 1, realY + dY);
          drawingContext.strokeStyle = "black";
          drawingContext.lineWidth = 2;
          drawingContext.stroke();

          lastX = x + 1;
          lastY = realY + dY;
        }
      }
    }

    start();
  }, [imageSrc]);

  const handleFile = useCallback((file: File) => {
    const fr = new FileReader();
    fr.onload = () => {
      setImageSrc(fr.result as string);
    };
    fr.onerror = () => {
      alert("Error loading image.");
    };
    fr.readAsDataURL(file);
  }, []);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const image = formData.get("image")! as File;
    handleFile(image);
  }, []);

  const formRef = useRef<HTMLFormElement>(null);
  return (
    <main
      className="h-screen flex flex-col md:flex-row"
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files.item(0);

        if (file) {
          handleFile(file);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
      }}
    >
      <section aria-label="Options Panel" className="bg-purple-800 px-4 py-6">
        <h1 className="text-3xl text-slate-300 text-center">Squiggly Image</h1>
        <form
          className="bg-white rounded-md shadow-md p-4 mt-4"
          onSubmit={handleSubmit}
          ref={formRef}
        >
          <label htmlFor="image" className="block">
            Drop an image or use the file picker below:
          </label>
          <input
            id="image"
            className="mt-2"
            name="image"
            type="file"
            accept=".png, .jpg"
            required
            onChange={() =>
              formRef.current?.dispatchEvent(
                new Event("submit", { cancelable: true, bubbles: true })
              )
            }
          />
        </form>
      </section>
      <section className="m-4 flex-auto relative" aria-label="canvas">
        <canvas
          className="bg-white rounded-md mx-auto max-w-full max-h-full object-contain absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          ref={canvasRef}
        >
          Canvas is not supported in your browser.
        </canvas>
      </section>
    </main>
  );
}

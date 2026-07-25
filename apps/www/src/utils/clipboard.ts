const EXPORT_WIDTH = 1_200;
const EXPORT_HEIGHT = 630;
const EXPORT_SCENE_MAX_WIDTH = 1_104;
const EXPORT_SCENE_MAX_HEIGHT = 534;

function createSceneBlob(canvas: HTMLCanvasElement) {
  const styles = window.getComputedStyle(canvas);
  const sceneCanvas = document.createElement("canvas");

  sceneCanvas.width = EXPORT_WIDTH;
  sceneCanvas.height = EXPORT_HEIGHT;

  const context = sceneCanvas.getContext("2d");

  if (!context) {
    return Promise.reject(new Error("Unable to create the scene image."));
  }

  context.fillStyle = styles.backgroundColor;
  context.fillRect(0, 0, sceneCanvas.width, sceneCanvas.height);

  const sceneScale = Math.min(
    EXPORT_SCENE_MAX_WIDTH / canvas.width,
    EXPORT_SCENE_MAX_HEIGHT / canvas.height,
  );
  const sceneWidth = canvas.width * sceneScale;
  const sceneHeight = canvas.height * sceneScale;
  const sceneLeft = (EXPORT_WIDTH - sceneWidth) / 2;
  const sceneTop = (EXPORT_HEIGHT - sceneHeight) / 2;

  context.save();
  context.shadowColor = "rgb(0 0 0 / 45%)";
  context.shadowBlur = 28;
  context.shadowOffsetY = 14;
  context.fillStyle = styles.backgroundColor;
  context.beginPath();
  context.roundRect(sceneLeft, sceneTop, sceneWidth, sceneHeight, 12);
  context.fill();
  context.restore();

  context.save();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(canvas, sceneLeft, sceneTop, sceneWidth, sceneHeight);
  context.restore();

  return new Promise<Blob>((resolve, reject) => {
    sceneCanvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Unable to create the scene image."));
      }
    }, "image/png");
  });
}

export async function copySceneToClipboard(canvas: HTMLCanvasElement) {
  if (
    !navigator.clipboard?.write ||
    typeof ClipboardItem === "undefined" ||
    (typeof ClipboardItem.supports === "function" &&
      !ClipboardItem.supports("image/png"))
  ) {
    throw new Error(
      "Image copying is not supported by this browser. Try a current browser over HTTPS.",
    );
  }

  try {
    const clipboardItem = new ClipboardItem({
      "image/png": new Promise<Blob>((resolve, reject) => {
        createSceneBlob(canvas).then(resolve).catch(reject);
      }),
    });

    await navigator.clipboard.write([clipboardItem]);
  } catch (error) {
    if (error instanceof DOMException) {
      if (
        error.name === "NotAllowedError" ||
        error.message.toLowerCase().includes("not allowed")
      ) {
        throw new Error(
          "Clipboard access was denied. Tap Copy Scene again to grant permission.",
          { cause: error },
        );
      }

      if (error.name === "SecurityError") {
        throw new Error(
          "Clipboard access was blocked. Focus this page and try again.",
          { cause: error },
        );
      }

      throw new Error(
        `Clipboard error: ${error.message || "Unable to copy the scene."}`,
        { cause: error },
      );
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Unable to copy the scene.", { cause: error });
  }
}

const TUBELENS_CANVAS_ID = "tubelens-canvas";
let mainLoop = () => {};
let isRunning = false;
let tubelensCanvas: HTMLCanvasElement | null = null;
let tubelensRect: HTMLDivElement | null = null;

function isMouseOnBottomRightCorner(
  e: MouseEvent,
  el: HTMLElement,
  threshold = 10
) {
  const rect = el.getBoundingClientRect();
  return (
    e.clientX > rect.right - threshold && e.clientY > rect.bottom - threshold
  );
}

function dragAndResizeable(el: HTMLElement, onlyDrag = false) {
  let dragging = false;
  let offset = { x: 0, y: 0 };
  let resizing = false;
  let resizeOffset = { x: 0, y: 0 };
  el.style.position = "fixed";
  el.style.top = "0";
  el.style.left = "0";
  el.style.zIndex = "10000";
  el.style.border = "1px solid black";
  el.style.width = "300px";
  el.style.height = "300px";
  el.style.cursor = "grab";
  el.style.boxShadow = "rgb(255 255 255 / 53%) 1px 1px 8px 0px";
  const resizeHandle = document.createElement("div");
  resizeHandle.style.position = "absolute";
  resizeHandle.style.bottom = "0";
  resizeHandle.style.right = "0";
  resizeHandle.style.width = "10px";
  resizeHandle.style.height = "10px";
  resizeHandle.style.backgroundColor = "black";
  resizeHandle.style.cursor = "nwse-resize";
  el.appendChild(resizeHandle);

  const mouseMove = (e: MouseEvent) => {
    if (dragging) {
      el.style.left = e.clientX + offset.x + "px";
      el.style.top = e.clientY + offset.y + "px";
    }
    if (resizing) {
      el.style.width = e.clientX + resizeOffset.x + "px";
      el.style.height = e.clientY + resizeOffset.y + "px";
    }
    if (isMouseOnBottomRightCorner(e, el)) {
      document.body.style.cursor = "nwse-resize";
      el.style.cursor = "nwse-resize";
    }
  };
  const mouseUp = () => {
    dragging = false;
    resizing = false;
    document.body.style.cursor = "default";
    el.style.cursor = "grab";
    window.removeEventListener("mousemove", mouseMove);
    window.removeEventListener("mouseup", mouseUp);
  };
  const mouseDown = (e: MouseEvent) => {
    if (isMouseOnBottomRightCorner(e, el) && !onlyDrag) {
      resizing = true;
      resizeOffset.x = el.offsetWidth - e.clientX;
      resizeOffset.y = el.offsetHeight - e.clientY;
    } else {
      dragging = true;
      offset.x = el.offsetLeft - e.clientX;
      offset.y = el.offsetTop - e.clientY;
    }
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", mouseUp);
  };
  el.addEventListener("mousedown", mouseDown);
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.enabled) {
    const video = document.querySelector(
      ".html5-main-video"
    ) as HTMLVideoElement;
    if (!video) {
      sendResponse("video not found");
      return true;
    }

    if (!tubelensCanvas) {
      tubelensCanvas = document.createElement("canvas");
      document.body.appendChild(tubelensCanvas);
      dragAndResizeable(tubelensCanvas, true);
    }

    if (!tubelensRect) {
      tubelensRect = document.createElement("div");
      document.body.appendChild(tubelensRect);
      dragAndResizeable(tubelensRect);
    }

    let canvasScale = 2;
    const ctx = tubelensCanvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) {
      sendResponse("canvas context not found");
      return true;
    }

    const zoomContoller = document.createElement("div");
    zoomContoller.style.position = "absolute";
    zoomContoller.style.top = "0";
    zoomContoller.style.right = "0";
    zoomContoller.style.zIndex = "10000";
    zoomContoller.style.backgroundColor = "white";
    zoomContoller.style.border = "1px solid black";
    zoomContoller.style.borderRadius = "0";
    zoomContoller.style.padding = "2px 4px";
    zoomContoller.style.display = "flex";
    zoomContoller.style.gap = "8px";
    zoomContoller.style.alignItems = "center";
    zoomContoller.style.alignSelf = "center";
    zoomContoller.style.textAlign = "center";

    tubelensRect.appendChild(zoomContoller);

    const zoomOutButton = document.createElement("button");
    zoomOutButton.innerText = "-";
    zoomOutButton.style.borderRadius = "0";
    zoomOutButton.style.padding = "0";
    zoomOutButton.style.width = "16px";
    zoomOutButton.style.height = "16px";
    zoomOutButton.style.cursor = "pointer";
    zoomOutButton.style.border = "1px solid black";
    zoomOutButton.style.borderRadius = "999px";

    const minScale = 0.5;
    zoomOutButton.addEventListener("click", () => {
      if (canvasScale > minScale) {
        canvasScale -= 0.5;
        zoomText.innerText = "x" + canvasScale;
        zoomInButton.disabled = false;
        if (canvasScale < minScale) {
          canvasScale = minScale;
          zoomOutButton.disabled = true;
        }
      }
    });
    zoomContoller.appendChild(zoomOutButton);

    const zoomText = document.createElement("div");
    zoomText.style.width = "32px";
    zoomText.innerText = "x" + canvasScale;
    zoomContoller.appendChild(zoomText);

    const zoomInButton = document.createElement("button");
    zoomInButton.innerText = "+";
    zoomInButton.style.borderRadius = "0";
    zoomInButton.style.padding = "0";
    zoomInButton.style.width = "16px";
    zoomInButton.style.height = "16px";
    zoomInButton.style.cursor = "pointer";
    zoomInButton.style.border = "1px solid black";
    zoomInButton.style.borderRadius = "999px";
    const maxScale = 10;
    zoomInButton.addEventListener("click", () => {
      if (canvasScale < maxScale) {
        canvasScale += 0.5;
        zoomText.innerText = "x" + canvasScale;
        zoomOutButton.disabled = false;
        if (canvasScale > maxScale) {
          canvasScale = maxScale;
          zoomInButton.disabled = true;
        }
      }
    });
    zoomContoller.appendChild(zoomInButton);

    mainLoop = () => {
      const videoRect = video.getBoundingClientRect();
      const rect = tubelensRect?.getBoundingClientRect();
      if (!rect) return;
      if (!tubelensCanvas) return;
      tubelensCanvas.style.width = rect.width * canvasScale + "px";
      tubelensCanvas.style.height = rect.height * canvasScale + "px";
      tubelensCanvas.width = rect.width * canvasScale;
      tubelensCanvas.height = rect.height * canvasScale;
      ctx.clearRect(0, 0, tubelensCanvas.width, tubelensCanvas.height);
      const scale = video.videoWidth / videoRect.width;
      ctx.drawImage(
        video,
        (rect.left - videoRect.left) * scale,
        (rect.top - videoRect.top) * scale,
        rect.width * scale,
        rect.height * scale,
        0,
        0,
        tubelensCanvas.width,
        tubelensCanvas.height
      );
    };

    if (!isRunning) {
      const update = () => {
        mainLoop();
        requestAnimationFrame(update);
      };
      update();
      isRunning = true;
    }

    sendResponse("success");
  } else {
    sendResponse("invalid message");
  }
  return true;
});

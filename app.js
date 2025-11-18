let pdfDoc = null;
let currentPage = 1;
let scale = 1;

const container = document.getElementById("container");
const pdfCanvas = document.getElementById("pdfCanvas");
const pdfCtx = pdfCanvas.getContext("2d");

const drawCanvas = document.getElementById("drawCanvas");
const drawCtx = drawCanvas.getContext("2d");

const textLayer = document.getElementById("textLayer");
const cursorDot = document.getElementById("cursorDot");

let drawingMode = false;
let typingMode = false;
let isDrawing = false;

// File picker
document.getElementById("fileInput").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument({data: typedarray}).promise.then(pdf => {
            pdfDoc = pdf;
            currentPage = 1;
            document.getElementById("controls").style.display = "none";
            renderPage(currentPage);
        }).catch(err => alert("Failed to load PDF:\n" + err.message));
    };
    reader.readAsArrayBuffer(file);
});

// Resize canvases
function resizeCanvases(width, height) {
    [pdfCanvas, drawCanvas].forEach(c => {
        c.width = width;
        c.height = height;
        c.style.width = width + "px";
        c.style.height = height + "px";
    });
    textLayer.style.width = width + "px";
    textLayer.style.height = height + "px";
}

// Render PDF page
function renderPage(num) {
    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({scale:1});
        scale = window.innerHeight / viewport.height;
        const scaledViewport = page.getViewport({scale:scale});

        resizeCanvases(scaledViewport.width, scaledViewport.height);

        const renderContext = {canvasContext: pdfCtx, viewport: scaledViewport};
        page.render(renderContext).promise.then(() => {
            drawCtx.clearRect(0,0,drawCanvas.width,drawCanvas.height);
            textLayer.innerHTML = "";
        });
    });
}

// Page navigation
function nextPage() { if (currentPage < pdfDoc.numPages) currentPage++, renderPage(currentPage); }
function prevPage() { if (currentPage > 1) currentPage--, renderPage(currentPage); }

// Fullscreen
document.getElementById("fullscreenBtn").addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.body.requestFullscreen();
});

// Update cursor
function updateCursor() {
    if (drawingMode) cursorDot.textContent = "✎";
    else if (typingMode) cursorDot.textContent = "T";
    else cursorDot.textContent = "";
}

// Arrow keys & Shift shortcuts
document.addEventListener("keydown", e => {
    if (!pdfDoc) return;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") nextPage();
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") prevPage();

    if (e.shiftKey && e.key.toLowerCase() === "d") { drawingMode = !drawingMode; typingMode = false; updateCursor(); }
    if (e.shiftKey && e.key.toLowerCase() === "t") { typingMode = !typingMode; drawingMode = false; updateCursor(); }
    if (e.shiftKey && e.key.toLowerCase() === "c") { drawCtx.clearRect(0,0,drawCanvas.width,drawCanvas.height); textLayer.innerHTML = ""; }
});

// Red cursor
document.addEventListener("mousemove", e => {
    cursorDot.style.left = e.clientX + "px";
    cursorDot.style.top = e.clientY + "px";
});

// Mouse position helper
function getMousePos(evt, canvas){
    const rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left) * (canvas.width / rect.width),
        y: (evt.clientY - rect.top) * (canvas.height / rect.height)
    };
}

// DRAWING
drawCanvas.addEventListener("mousedown", e => {
    if (!drawingMode) return;
    isDrawing = true;
    drawCtx.strokeStyle = "red";
    drawCtx.lineWidth = 3;
    const pos = getMousePos(e, drawCanvas);
    drawCtx.beginPath();
    drawCtx.moveTo(pos.x, pos.y);
});
drawCanvas.addEventListener("mousemove", e => {
    if (!isDrawing) return;
    const pos = getMousePos(e, drawCanvas);
    drawCtx.lineTo(pos.x, pos.y);
    drawCtx.stroke();
});
document.addEventListener("mouseup", () => { isDrawing = false; });

// TYPING
drawCanvas.addEventListener("click", e => {
    if (!typingMode) return;
    const text = prompt("Enter text:");
    if (!text) return;
    const pos = getMousePos(e, drawCanvas);
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.left = pos.x + "px";
    div.style.top = pos.y + "px";
    div.style.color = "red";
    div.style.fontSize = "20px";
    div.textContent = text;
    textLayer.appendChild(div);
});
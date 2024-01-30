"use strict";

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

let clientX = 0;
let clientY = 0;

let mode = "none";

const startEdge = [];

const points = [];
const edges = [];

const snap = 20; // pixels for edge snapping

initializeCanvas();

function initializeCanvas() {
    const container = document.querySelector(".canvas-container");
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    drawCalls();

    document.addEventListener("mousemove", onMouseMove, false);
    document.addEventListener("keydown", onKeyboardEntry, false);
    canvas.addEventListener("click", onClick, false);
    console.log("Initialized canvas.");
}

function drawCalls() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAxes();
    drawPoints();
    drawEdges();
}

function drawAxes() {
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.strokeStyle = "red";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.strokeStyle = "lime";
    ctx.stroke();
}

function drawPoints() {
    for (const point of points) {
        drawCursor(point.x, point.y, "yellow");
    }
}

function drawEdges() {
    for (const edge of edges) {
        ctx.beginPath();
        ctx.moveTo(edge.x1, edge.y1);
        ctx.lineTo(edge.x2, edge.y2);
        ctx.strokeStyle = "pink";
        ctx.stroke();
    }
}

function drawCursor(canvasX, canvasY, style) {
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 2, 0, Math.PI * 2);
    const line = 8;
    ctx.moveTo(canvasX - line, canvasY);
    ctx.lineTo(canvasX + line, canvasY);
    ctx.moveTo(canvasX, canvasY - line);
    ctx.lineTo(canvasX, canvasY + line);
    ctx.strokeStyle = style;
    ctx.fillStyle = style;
    ctx.stroke();
    ctx.fill();
}

function onMouseMove(event) {
    drawCalls();

    clientX = event.clientX;
    clientY = event.clientY;

    const canvasX = clientX - canvas.offsetLeft;
    const canvasY = clientY - canvas.offsetTop;

    if (canvasX < 0 || canvasX > canvas.width || canvasY < 0 || canvasY > canvas.height) {
        return;
    }

    // Draw the mouse position
    if (mode === "none") {
        drawCursor(canvasX, canvasY, "white");
    } else if (mode === "point") {
        drawCursor(canvasX, canvasY, "blue");
    } else if (mode === "edge") {
        drawCursor(canvasX, canvasY, "yellow");

        ctx.beginPath();
        ctx.arc(canvasX, canvasY, snap, 0, Math.PI * 2);
        ctx.strokeStyle = "orange";
        ctx.stroke();
    }

    if (startEdge.length > 0) {
        ctx.beginPath();
        ctx.moveTo(startEdge[0], startEdge[1]);
        ctx.lineTo(canvasX, canvasY);
        ctx.strokeStyle = "orange";
        ctx.stroke();
    }
}

function onKeyboardEntry(event) {
    if (event.key === "p") {
        mode = "point";
    } else if (event.key === "e") {
        mode = "edge";
    } else if (event.key === "c") {
        mode = "none";
    }

    onMouseMove({ clientX, clientY });
}

function onClick(event) {
    const canvasX = event.clientX - canvas.offsetLeft;
    const canvasY = event.clientY - canvas.offsetTop;

    if (mode === "point") {
        points.push({ x: canvasX, y: canvasY });
    } else if (mode === "edge") {
        if (startEdge.length === 0) {
            // find closest point
            const closestPoint = getClosestPoint(canvasX, canvasY);

            if (closestPoint !== null && closestPoint.distance < snap) {
                startEdge.push(closestPoint.point.x, closestPoint.point.y);
                return;
            }
        } else {
            const closestPoint = getClosestPoint(canvasX, canvasY);

            if (closestPoint !== null && closestPoint.distance < snap) {
                edges.push({x1: startEdge[0], y1: startEdge[1], x2: closestPoint.point.x, y2: closestPoint.point.y});
                startEdge.length = 0;
            }
        }
    }

    drawCalls();
}

function getClosestPoint(canvasX, canvasY) {
    return points.reduce((acc, point) => {
        const distance = Math.sqrt(Math.pow(point.x - canvasX, 2) + Math.pow(point.y - canvasY, 2));
        if (acc === null || distance < acc.distance) {
            return {point, distance};
        }
        return acc;
    }, null);
}
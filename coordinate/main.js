"use strict";

import {distance2Segment, makeCCW, v2} from "./vector.js";

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

let clientX = 0;
let clientY = 0;

let mode = "none";

const startEdge = [];

const points = [];
const edges = [];
let triangles = [];

const snap = 20; // pixels for edge snapping

initializeCanvas();

function hijackLogBecauseImLazy() {
    console.stdlog = console.log.bind(console);
    console.logs = [];
    console.log = function(){
        const logUI = document.querySelector("#logging");
        logUI.scrollTop = logUI.scrollHeight;
        logUI.innerHTML += Array.from(arguments).join(" ") + "\n";
        console.stdlog.apply(console, arguments);
    }
}

function save() {
    localStorage.setItem("points", JSON.stringify(points));
    localStorage.setItem("edges", JSON.stringify(edges));
}

function load() {
    const p = localStorage.getItem("points");
    if (p !== null) {
        console.log("Loaded saved points.");
        points.push(...JSON.parse(p));
    }

    const e = localStorage.getItem("edges");
    if (e !== null) {
        console.log("Loaded saved edges.");
        edges.push(...JSON.parse(e));
    }
}

function clear() {
    const ask = confirm("Are you sure you want to clear the canvas?");

    if (!ask) {
        return;
    }

    localStorage.removeItem("points");
    localStorage.removeItem("edges");
    window.location.reload();
}

function initializeCanvas() {
    hijackLogBecauseImLazy();

    load();
    triangles = getTriangles();

    const container = document.querySelector(".canvas-container");
    container.style.height = container.clientWidth + "px";
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    canvas.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); };

    populateUI();
    drawCalls();

    document.addEventListener("mousemove", onMouseMove, false);
    document.addEventListener("keydown", onKeyboardEntry, false);
    canvas.addEventListener("mousedown", onClick, false);
    canvas.addEventListener("mouseup", onRelease, false);
    console.log("Initialized canvas. Press \"h\" for help.\n");
}

function drawCalls() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAxes();
    drawPoints();
    drawEdges();
    drawTriangles();
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

function drawSnapRadius(canvasX, canvasY, style) {
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, snap, 0, Math.PI * 2);
    ctx.strokeStyle = style;
    ctx.stroke();
}

function drawTriangles() {
    for (const triangle of triangles) {
        ctx.beginPath();
        ctx.moveTo(triangle[0].x, triangle[0].y);
        ctx.lineTo(triangle[1].x, triangle[1].y);
        ctx.lineTo(triangle[2].x, triangle[2].y);
        ctx.lineTo(triangle[0].x, triangle[0].y);
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.fill();
    }
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
        drawSnapRadius(canvasX, canvasY, "white");
    } else if (mode === "point") {
        drawCursor(canvasX, canvasY, "blue");
        drawSnapRadius(canvasX, canvasY, "cyan");
    } else if (mode === "edge") {
        drawCursor(canvasX, canvasY, "yellow");
        drawSnapRadius(canvasX, canvasY, "orange");
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
        console.log("Point mode activated.");
    } else if (event.key === "e") {
        mode = "edge";
        console.log("Edge mode activated.");
    } else if (event.key === "c") {
        mode = "none";
        console.log("Cursor mode activated.");
    } else if (event.key === "h") {
        console.log("p: point mode");
        console.log("e: edge mode");
        console.log("c: cursor mode");
        console.log("right-click: delete point/edge (mode dependent)");
        console.log("esc: cancel edge creation");
        console.log("k: clear canvas");
    } else if (event.key === "Escape") {
        if (startEdge.length > 0) {
            startEdge.length = 0;
            console.log("Edge creation cancelled.");
        }
    } else if (event.key === "k") {
        clear();
    } else if (event.key === "d") {
        console.log(generateArraysWithEBO());
    }

    onMouseMove({ clientX, clientY });
}

let selectedPoint = null;

function onClick(event) {
    const canvasX = event.clientX - canvas.offsetLeft;
    const canvasY = event.clientY - canvas.offsetTop;

    // Delete point or edge
    if (event.button === 2) {
        if (mode === "point") {
            const closestPoint = getClosestPoint(canvasX, canvasY);
            if (closestPoint !== null && closestPoint.distance < snap) {
                const index = points.indexOf(closestPoint.point);
                points.splice(index, 1);

// Remove any edges that contain the point
                edges.forEach((edge, index) => {
                    if (edge.x1 === closestPoint.point.x && edge.y1 === closestPoint.point.y || edge.x2 === closestPoint.point.x && edge.y2 === closestPoint.point.y) {
                        edges.splice(index, 1);
                    }
                });

                console.log("Point deleted.");
                onDataChange();
            } else {
                console.log("No point found to delete.");
            }
        } else if (mode === "edge") {
            const closestEdge = edges
                .map((edge) => {
                    // distance between mouse and line segment
                    return {
                        edge: edge,
                        distance: distance2Segment(v2(canvasX, canvasY), v2(edge.x1, edge.y1), v2(edge.x2, edge.y2))
                    }
                })
                .filter((edge) => edge.distance < snap * snap)
                .sort((a, b) =>  a.distance - b.distance)
                .pop();

            if (closestEdge !== undefined) {
                const index = edges.indexOf(closestEdge.edge);
                edges.splice(index, 1);
                console.log("Edge deleted.");
                onDataChange();
            } else {
                console.log("No edge found to delete.");
            }
        }

        drawCalls();
        return;
    }

    if (mode === "point") {
        console.log("Point created.");
        points.push({ x: canvasX, y: canvasY });
        onDataChange();
    } else if (mode === "edge") {
        if (startEdge.length === 0) {
            // find the closest point
            const closestPoint = getClosestPoint(canvasX, canvasY);

            if (closestPoint !== null && closestPoint.distance < snap) {
                startEdge.push(closestPoint.point.x, closestPoint.point.y);
                console.log("Select second point to create edge.");
                return;
            } else {
                console.log("No point found to start edge from.");
            }
        } else {
            const closestPoint = getClosestPoint(canvasX, canvasY);

            if (closestPoint !== null && closestPoint.distance < snap) {
                const newEdge = {x1: startEdge[0], y1: startEdge[1], x2: closestPoint.point.x, y2: closestPoint.point.y};

                if (startEdge[0] === closestPoint.point.x && startEdge[1] === closestPoint.point.y) {
                    console.log("Self-edge not allowed.");
                    startEdge.length = 0;
                    return;
                }

                // find duplicate
                const duplicate = edges.find((edge) => sameEdge(edge, newEdge));

                if (duplicate !== undefined) {
                    console.log("Edge already exists.");
                    startEdge.length = 0;
                    return;
                }

                edges.push(newEdge);
                startEdge.length = 0;
                console.log("Edge created.");
                onDataChange();
            } else {
                console.log("No point found to end edge at.");
            }
        }
    } else if (mode === "none") {
        const closestPoint = getClosestPoint(canvasX, canvasY);

        if (closestPoint !== null && closestPoint.distance < snap) {
            console.log("Selected point.");
            selectedPoint = closestPoint.point;
        } else {
            console.log("No point found to select.");
        }
    }

    drawCalls();
}

function onRelease(event) {
    selectedPoint = null;
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

function onDataChange() {
    save();
    triangles = getTriangles();
    populateUI();
    drawCalls();
}

function getTriangles() {
    const triangles = [];

    function hasTriangle(triangle) {
        return triangles.some((t) => {
            return triangle.every((point) => {
                // The triangles have the same points
                // yes this is inefficient
                return t.some((p) => p.x === point.x && p.y === point.y);
            });
        });
    }

    for (const edge of edges) {
        for (const vertex of points) {
            const edge1 = {x1: edge.x1, y1: edge.y1, x2: vertex.x, y2: vertex.y};
            const edge2 = {x1: edge.x2, y1: edge.y2, x2: vertex.x, y2: vertex.y};

            if (edges.some((e) => sameEdge(e, edge1)) && edges.some((e) => sameEdge(e, edge2))) {
                const triangle = [v2(edge.x1, edge.y1), v2(edge.x2, edge.y2), v2(vertex.x, vertex.y)];

                if (!hasTriangle(triangle)) {
                    triangles.push(makeCCW(triangle));
                }
            }
        }
    }

    return triangles;
}

function sameEdge(edge, edge2) {
    return (edge.x1 === edge2.x1 && edge.y1 === edge2.y1 && edge.x2 === edge2.x2 && edge.y2 === edge2.y2) || (edge.x1 === edge2.x2 && edge.y1 === edge2.y2 && edge.x2 === edge2.x1 && edge.y2 === edge2.y1);
}

function populateUI() {
    document.querySelector("#points").textContent = "" + points.length;
    document.querySelector("#edges").textContent = "" + edges.length;
    document.querySelector("#triangles").textContent = "" + triangles.length;

    populateTable();
}

function populateTable() {
    const rows = document.querySelector("tbody");
    rows.innerHTML = "";

    for (const vertex of points) {
        const row = document.createElement("tr");
        const x = document.createElement("td");
        const y = document.createElement("td");
        const color = document.createElement("td");
        const colorInput = document.createElement("input");
        const cx = document.createElement("td");
        const cy = document.createElement("td");

        x.textContent = vertex.x;
        y.textContent = vertex.y;
        cx.textContent = (vertex.x - canvas.width / 2) / canvas.width * 2;
        cy.textContent = -(vertex.y - canvas.height / 2) / canvas.height * 2;

        colorInput.type = "color";
        colorInput.value = "#FFFF00";
        colorInput.onchange = (e) => {
            vertex.color = e.target.value;
            drawCalls();
        }
        color.appendChild(colorInput);

        row.appendChild(x);
        row.appendChild(y);
        // row.appendChild(color);
        row.appendChild(cx);
        row.appendChild(cy);

        rows.appendChild(row);
    }
}

function generateArraysWithEBO() {
    let strVertex = "";
    let strVertexColors = "";
    let strTriangleVertices = "";

    for (const vertex of points) {
        let glX = (vertex.x - canvas.width / 2) / canvas.width * 2;
        // truncate to three decimals
        glX = Math.round(glX * 1000) / 1000;

        let glY = -(vertex.y - canvas.height / 2) / canvas.height * 2;
        glY = Math.round(glY * 1000) / 1000;

        strVertex += `\t${glX}f, ${glY}f, 0.0f, 1.0f,\n`;
        strVertexColors += `\t1.0f, 1.0f, 1.0f, 1.0f,\n`; // TODO color
    }

    function getVertexIndex(vertex) {
        for (let i = 0; i < points.length; i++) {
            if (points[i].x === vertex.x && points[i].y === vertex.y) {
                return i;
            }
        }

        return -1;
    }

    for (const triangle of triangles) {
        strTriangleVertices += `\t${getVertexIndex(triangle[0])}, ${getVertexIndex(triangle[1])}, ${getVertexIndex(triangle[2])},\n`;
    }

    return `
// Generated with https://doggysazhi.github.io/CSE-170-Toolbox/coordinate

// Place this code block in your init function to generate the buffers

GLuint box_VAO;
GLuint box_VBO[2];
GLuint box_EBO;

float box_vertices[] = {
${strVertex}
};

float box_colors[] = {
${strVertexColors}
};

GLuint box_indices[] = {
${strTriangleVertices}
};

// Place this code block in your draw function to draw the triangles
glBindVertexArray(boxVAO);
glDrawElements(GL_TRIANGLES, sizeof(box_indices) / sizeof(float), GL_UNSIGNED_INT, nullptr);
`
}

function generateArraysWithoutEBO() {
    let strVertex = "";
    let strVertexColors = "";

    for (const triangle of triangles) {
        for (const vertex of triangle) {
            let glX = (vertex.x - canvas.width / 2) / canvas.width * 2;
            // truncate to three decimals
            glX = Math.round(glX * 1000) / 1000;

            let glY = -(vertex.y - canvas.height / 2) / canvas.height * 2;
            glY = Math.round(glY * 1000) / 1000;

            strVertex += `\t${glX}f, ${glY}f, 0.0f, 1.0f,\n`;
            strVertexColors += `\t1.0f, 1.0f, 1.0f, 1.0f,\n`; // TODO color
        }
    }

    return `
// Generated with https://doggysazhi.github.io/CSE-170-Toolbox/coordinate

// Place this code block in your init function to generate the buffers

GLuint box_VAO;
GLuint box_VBO[2];

float box_vertices[] = {
${strVertex}
};

float box_colors[] = {
${strVertexColors}
};

// Place this code block in your draw function to draw the triangles
glBindVertexArray(boxVAO);
glDrawArrays(GL_TRIANGLES, 0, sizeof(box_vertices) / sizeof(float));
`
}
var gl;

function initGL(canvas) {
    let exception;
    try {
        gl = canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
        gl.getExtension("OES_standard_derivatives");
    } catch (e) {
        exception = e;
    }

    if (!gl) {
        console.error("Could not initialize WebGL ", exception);
    }
}

function requestShaderSource(script) {
    return new Promise(r => {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", script.src)
        xhr.onreadystatechange = function () {
            if(xhr.readyState === xhr.DONE) {
                if (xhr.status === 200) {
                    r(xhr.responseText);
                } else {
                    r(null);
                }
            }
        };
        xhr.send();
    });
}

async function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        console.error("Could not find shader with id ", id);
        return null;
    }

    var code = await requestShaderSource(shaderScript);
    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, code);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

var shaderProgram;

async function initShaders() {
    var vertexShader = await getShader(gl, "shader-vertex");
    var fragmentShader = await getShader(gl, "shader-fragment");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error("Could not initialize shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "position");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "texcoord");
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.timeUniform = gl.getUniformLocation(shaderProgram, "time");
    shaderProgram.mouseUniform = gl.getUniformLocation(shaderProgram, "mouse");
    shaderProgram.dimsUniform = gl.getUniformLocation(shaderProgram, "dims");
}

var quadVertexPositionBuffer;
var quadVertexTextureCoordBuffer;
var quadVertexIndexBuffer;

function initBuffers() {
    quadVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexPositionBuffer);
    vertices = [
        -1.0, -1.0, 0.0,
         1.0, -1.0, 0.0,
         1.0,  1.0, 0.0,
        -1.0,  1.0, 0.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    quadVertexPositionBuffer.itemSize = 3;
    quadVertexPositionBuffer.numItems = 4;

    quadVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexTextureCoordBuffer);
    var textureCoords = [
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
    quadVertexTextureCoordBuffer.itemSize = 2;
    quadVertexTextureCoordBuffer.numItems = 4;

    quadVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadVertexIndexBuffer);
    var quadVertexIndices = [
        0, 1, 2, 0, 2, 3
    ];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(quadVertexIndices), gl.STATIC_DRAW);
    quadVertexIndexBuffer.itemSize = 1;
    quadVertexIndexBuffer.numItems = 6;
}

let mousex = 0.0;
let mousey = 0.0;
let canvas;
let canvasBounds;

function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, quadVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, quadVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadVertexIndexBuffer);
    gl.uniform1f(shaderProgram.timeUniform, runningTime * 0.001);
    gl.uniform2f(shaderProgram.mouseUniform, mousex, mousey);
    gl.uniform2f(shaderProgram.dimsUniform, canvasBounds.width, canvasBounds.height);
    gl.drawElements(gl.TRIANGLES, quadVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

var lastTime = 0;
var startTime = 0;
var runningTime = 0;

function animate() {
    frames += 1;
    var currentTime = new Date().getTime();
    runningTime = currentTime - startTime;
    var elapsedTime = currentTime - lastTime;
    if (elapsedTime >= 1000.0) {
        frames = 0;
        lastTime = currentTime;
    }
}

function resizeCanvas() {
    canvasBounds = canvas.getBoundingClientRect();
    canvas.width = canvasBounds.width;
    canvas.height = canvasBounds.height;
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
}

function tick() {
    requestAnimationFrame(tick);
    resizeCanvas();
    animate();
    drawScene();
}

async function webGLStart() {
    canvas = document.getElementById("gl-bg-canvas");
    canvasBounds = canvas.getBoundingClientRect();
    initGL(canvas);
    await initShaders();
    initBuffers();

    window.addEventListener('mousemove', evt => {
        mousex = (evt.clientX - canvasBounds.left) / canvasBounds.width;
        mousey = 1.0 - (evt.clientY - canvasBounds.top) / canvasBounds.height;
    });

    document.addEventListener('touchmove', evt => {
        mousex = (evt.changedTouches[0].clientX - canvasBounds.left) / canvasBounds.width;
        mousey = 1.0 - (evt.changedTouches[0].clientY - canvasBounds.top) / canvasBounds.height;
    });

    startTime = new Date().getTime();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    tick();
}

webGLStart();

document.getElementById('btnAnnotateImage').addEventListener('click', (e) => {
	const cfg = {
		path: null,
		pathDirty: false,
		strPath: "",
		pathOrigin: { x: 0, y: 0 },
		buffer: [], // contains the last positions of the pointer
		strokeWidth: 6,
		strokeColor: "#ff0000",
		opacityRange: null,
		counterValue: 1,
		bufferSize: 10,	// 1, 4, 8, 12, 16, 20
		svg: null,
		toolbar: null,
		srcEnvelope: null,
		srcImage: null,
		canvas: null,
		numberOfPenSizes: 6,
		penColors: ["#000000", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ffffff"],
		selectedTool: 0	// 0 = freehand, 1 = straight lines, 2 = line arrows, 3 = rectangle, 4 = circle, 5 = text, 6 = counter
	}

	ATMediaAnnotations.setupAnnotationsOfImage('imgSourceEnvelope', 'imgSource', cfg, false);

	e.target.setAttribute('disabled', true);
});

document.getElementById('btnAnnotateVideo').addEventListener('click', (e) => {
	const cfg = {
		path: null,
		pathDirty: false,
		strPath: "",
		pathOrigin: { x: 0, y: 0 },
		buffer: [], // contains the last positions of the pointer
		strokeWidth: 6,
		strokeColor: "#ff0000",
		opacityRange: null,
		counterValue: 1,
		bufferSize: 10,	// 1, 4, 8, 12, 16, 20
		svg: null,
		toolbar: null,
		srcEnvelope: null,
		srcImage: null,
		canvas: null,
		numberOfPenSizes: 6,
		penColors: ["#000000", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ffffff"],
		selectedTool: 0	// 0 = freehand, 1 = straight lines, 2 = line arrows, 3 = rectangle, 4 = circle, 5 = text, 6 = counter
	}

	ATMediaAnnotations.setupAnnotationsOfImage('videoSourceEnvelope', 'frame-559-404', cfg, true);

	e.target.setAttribute('disabled', true);
});

const ATMediaAnnotations = {
	setupAnnotationsOfImage: (envelopeId, imgId, cfg, isVideo) => {

		cfg.srcEnvelope = document.getElementById(envelopeId);
		cfg.isVideo = isVideo;

		cfg.srcImgOrVideo = document.getElementById(imgId);

		const	imgWidth = cfg.srcImgOrVideo.offsetWidth;
		const imgHeight = cfg.srcImgOrVideo.offsetHeight;

		if (isVideo) {
			if (cfg.srcImgOrVideo.hasAttribute("controls")) {
				cfg.srcImgOrVideo.removeAttribute("controls")   
			};
		}

		// svg element, positioned over the source image
		cfg.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		cfg.svg.setAttribute('width', imgWidth);
		cfg.svg.setAttribute('height', imgHeight);

		// styles
		var styles = document.createElementNS("http://www.w3.org/2000/svg", "style");
		styles.innerHTML = " .counter { font: bold 30px sans-serif; border-radius: 50%; background-color: red; -webkit-touch-callout: none; -webkit-user-select: none; user-select: none;}";
		cfg.svg.appendChild(styles);

		// defs
		var defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
		var marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
		marker.setAttributeNS(null, "id", "triangle");
		marker.setAttributeNS(null, "refX", "7");
		marker.setAttributeNS(null, "refY", "5");
		marker.setAttributeNS(null, "viewBox", "0 0 10 10");
		marker.setAttributeNS(null, "markerUnits", "strokeWidth");
		marker.setAttributeNS(null, "markerWidth", "5");
		marker.setAttributeNS(null, "markerHeight", "5");
		marker.setAttributeNS(null, "orient", "auto");

		var markerPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
		markerPath.setAttributeNS(null, "fill", "#f00");
		markerPath.setAttributeNS(null, "d", "M 0 0 L 10 5 L 0 10 z");
		marker.appendChild(markerPath);
		defs.appendChild(marker);

		cfg.svg.appendChild(defs);

		cfg.srcEnvelope.appendChild(cfg.svg);

		// toolbar
		ATMediaAnnotations.addToolbar(cfg);

		// initial svg position + update position on scroll
		cfg.rect = cfg.svg.getBoundingClientRect();
		document.addEventListener('scroll', () => {
			// update origin rect
			cfg.rect = cfg.svg.getBoundingClientRect();
		});


		cfg.svg.addEventListener("pointerdown", (e) => ATMediaAnnotations.handlePointerDown(e, cfg));
		cfg.svg.addEventListener("pointermove", (e) => ATMediaAnnotations.handlePointerMove(e, cfg));
		cfg.svg.addEventListener("pointerup", (e) => ATMediaAnnotations.handlePointerUp(e, cfg));
		//cfg.svg.addEventListener("pointerleave", (e) => ATMediaAnnotations.handlePointerUp(e, cfg));
	},

	undoLastStep: (cfg) => {
		var svg = cfg.svg;

		if (svg.children && svg.children.length > 2) {
			// keep "defs", "style"
			svg.removeChild(svg.lastChild);
		}
	},

	clearAll: (cfg) => {
		var svg = cfg.svg;
		while (svg.children && svg.children.length > 2) {
			// keep "defs", "style"
			svg.removeChild(svg.lastChild);
		};
	},

	setPenSize: (newSize, cfg) => {
		cfg.strokeWidth = 2 * newSize;
	},

	setPenColor: (newColor, cfg) => {
		cfg.strokeColor = newColor;
	},

	saveAnnotatedImage: (cfg) => {

		// target canvas
		var imgWidth = 0;
		var imgHeight = 0;

		if (cfg.isVideo) {
			imgWidth = cfg.srcImgOrVideo.videoWidth;
			imgHeight = cfg.srcImgOrVideo.videoHeight;
		}
		else {
			imgWidth = cfg.srcImgOrVideo.naturalWidth;
			imgHeight = cfg.srcImgOrVideo.naturalHeight;
		}

		var canvas;
		if (cfg.canvas) {
			canvas = cfg.canvas;
		}
		else {
			canvas = document.createElement('canvas');
			canvas.style.border = "1px dashed green";
			canvas.style.padding = "0";

			canvas.width = imgWidth;
			canvas.height = imgHeight;

			cfg.canvas = canvas;
		}

		//cfg.srcEnvelope.parentNode.insertBefore(canvas, cfg.srcEnvelope.nextSibling);
		//document.body.insertBefore(canvas, document.body.firstChild);

		const ctx = canvas.getContext('2d');

		// draw source image to canvas
		ctx.drawImage(cfg.srcImgOrVideo, 0, 0, imgWidth, imgHeight);

		// draw svg to canvas
		const xml = new XMLSerializer().serializeToString(cfg.svg);
		const svg64 = btoa(xml);
		const b64signature = 'data:image/svg+xml;base64,';
		const img64 = b64signature + svg64;
		const img = new Image();

		img.width = cfg.svg.getAttribute('width');
		img.height = cfg.svg.getAttribute('height');

		img.src = img64;
		//document.body.insertBefore(img, document.body.firstChild);

		img.onload = () => {
			ctx.drawImage(img, 0, 0, imgWidth, imgHeight);
			//ctx.drawImage(img, 0, 0);

			// copy canvas to target image
			const targetImg = new Image();
			targetImg.src = canvas.toDataURL();
			//document.body.insertBefore(targetImg, document.body.firstChild);

			var w = window.open("");
			w.document.write(targetImg.outerHTML);
		};
	},

	setTool: (newTool, cfg) => {
		cfg.selectedTool = newTool;
	},

	addToolbar: (cfg) => {
		// toolbar
		const toolbar = document.createElement('div');
		toolbar.className = "pen-toolbar";

		// tool selection
		// 0 = freehand, 1 = straight lines, 2 = line arrows, 3 = rectangle, 4 = circle, 5 = text, 6 = counter
		const btnFreehand = document.createElement('button');
		btnFreehand.type = "button";
		btnFreehand.innerHTML = "Freehand";
		btnFreehand.className = "btn btn-primary me-1 mt-1";
		btnFreehand.addEventListener('click', (e) => {
			ATMediaAnnotations.setTool(0, cfg);
		});
		toolbar.appendChild(btnFreehand);

		const btnLines = document.createElement('button');
		btnLines.type = "button";
		btnLines.innerHTML = "Straight lines";
		btnLines.className = "btn btn-primary me-1 mt-1";
		btnLines.addEventListener('click', (e) => {
			ATMediaAnnotations.setTool(1, cfg);
		});
		toolbar.appendChild(btnLines);

		const btnArrows = document.createElement('button');
		btnArrows.type = "button";
		btnArrows.innerHTML = "Arrows";
		btnArrows.className = "btn btn-primary me-1 mt-1";
		btnArrows.addEventListener('click', (e) => {
			ATMediaAnnotations.setTool(2, cfg);
		});
		toolbar.appendChild(btnArrows);

		const btnRectangles = document.createElement('button');
		btnRectangles.type = "button";
		btnRectangles.innerHTML = "Rectangles";
		btnRectangles.className = "btn btn-primary me-1 mt-1";
		btnRectangles.addEventListener('click', (e) => {
			ATMediaAnnotations.setTool(3, cfg);
		});
		toolbar.appendChild(btnRectangles);

		const btnCircles = document.createElement('button');
		btnCircles.type = "button";
		btnCircles.innerHTML = "Circles";
		btnCircles.className = "btn btn-primary me-1 mt-1";
		btnCircles.addEventListener('click', (e) => {
			ATMediaAnnotations.setTool(4, cfg);
		});
		toolbar.appendChild(btnCircles);

		const btnText = document.createElement('button');
		btnText.type = "button";
		btnText.innerHTML = "Text";
		btnText.className = "btn btn-primary me-1 mt-1";
		btnText.addEventListener('click', (e) => {
			ATMediaAnnotations.setTool(5, cfg);
		});
		toolbar.appendChild(btnText);

		const btnCounter = document.createElement('button');
		btnText.type = "button";
		btnText.innerHTML = "Counter";
		btnText.className = "btn btn-primary me-1 mt-1";
		btnText.addEventListener('click', (e) => {
			ATMediaAnnotations.setTool(6, cfg);
		});
		toolbar.appendChild(btnText);

		toolbar.appendChild(document.createElement('br'));


		// brush size
		var spacer = document.createElement('span');
		spacer.innerHTML = "Pen:";
		spacer.className = "me-1";
		toolbar.appendChild(spacer);

		for (var i = 1; i <= cfg.numberOfPenSizes; i++) {
			var btn = document.createElement('div');
			btn.className = "pen-size pen-size-" + i;
			var newSize = i;

			(function (newSize) {
				btn.addEventListener('click', (e) => {
					ATMediaAnnotations.setPenSize(newSize, cfg);
				});
			})(newSize);

			toolbar.appendChild(btn);
		};

		// brush color
		var spacer = document.createElement('span');
		spacer.innerHTML = "Color:";
		spacer.className = "ms-4 me-1";
		toolbar.appendChild(spacer);

		for (var color of cfg.penColors) {
			var btn = document.createElement('div');
			btn.className = "pen-color";
			btn.style.backgroundColor = color;

			var newColor = color;

			(function (newColor) {
				btn.addEventListener('click', (e) => {
					ATMediaAnnotations.setPenColor(newColor, cfg);
				});
			})(newColor);

			toolbar.appendChild(btn);
		};

		// opacity
		var spacer = document.createElement('span');
		spacer.innerHTML = "Opacity:";
		spacer.className = "ms-4 me-1";
		toolbar.appendChild(spacer);

		cfg.opacityRange = document.createElement('input');
		cfg.opacityRange.type = "range";
		cfg.opacityRange.value = "100";
		cfg.opacityRange.setAttribute("min", 0);
		cfg.opacityRange.setAttribute("max", 100);
		toolbar.appendChild(cfg.opacityRange);

		// counter
		var spacer = document.createElement('span');
		spacer.innerHTML = "Counter:";
		spacer.className = "ms-4 me-1";
		toolbar.appendChild(spacer);

		cfg.counterValue = document.createElement('input');
		cfg.counterValue.type = "number";
		cfg.counterValue.value = "1";
		cfg.counterValue.style = "width: 2.5rem;";
		cfg.counterValue.setAttribute("min", 1);
		toolbar.appendChild(cfg.counterValue);


		toolbar.appendChild(document.createElement('br'));

		// undo/clear buttons
		const btnUndo = document.createElement('button');
		btnUndo.type = "button";
		btnUndo.innerHTML = "Undo";
		btnUndo.className = "btn btn-primary me-1 mt-1";
		btnUndo.addEventListener('click', (e) => {
			ATMediaAnnotations.undoLastStep(cfg);
		});
		toolbar.appendChild(btnUndo);

		const btnClear = document.createElement('button');
		btnClear.type = "button";
		btnClear.innerHTML = "Clear all";
		btnClear.className = "btn btn-primary me-1 mt-1";
		btnClear.addEventListener('click', (e) => {
			ATMediaAnnotations.clearAll(cfg);
		});
		toolbar.appendChild(btnClear);

		toolbar.appendChild(document.createElement('br'));

		const btnSave = document.createElement('button');
		btnSave.type = "button";
		btnSave.innerHTML = "Save";
		btnSave.className = "btn btn-primary mt-4";
		btnSave.addEventListener('click', (e) => {
			ATMediaAnnotations.saveAnnotatedImage(cfg);
		});
		toolbar.appendChild(btnSave);


		cfg.srcEnvelope.parentNode.insertBefore(toolbar, cfg.srcEnvelope.nextSibling);
		cfg.svg.toolbar = toolbar;
	},

	handlePointerDown: (e, cfg) => {
		var pt = ATMediaAnnotations.getMousePosition(e, cfg);
		cfg.pathOrigin = { x: pt.x, y: pt.y };

		// drawing tools
		if (cfg.selectedTool <= 4) {
			cfg.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			cfg.path.setAttribute("fill", "none");

			var opacity = 1;
			if (cfg.opacityRange) {
				opacity = cfg.opacityRange.value / 100.0;
			}
			
			var opacityCalc = Math.round(Math.min(Math.max(opacity || 1, 0), 1) * 255);
			var opacityString = opacityCalc.toString(16).toUpperCase();
			var strokeWithOpacity = cfg.strokeColor + opacityString;

			cfg.path.setAttribute("stroke", strokeWithOpacity);
			
			cfg.path.setAttribute("stroke-width", cfg.strokeWidth);
			cfg.buffer = [];
			ATMediaAnnotations.appendToBuffer(pt, cfg);
			cfg.strPath = "M" + pt.x + " " + pt.y;
			cfg.path.setAttribute("d", cfg.strPath);
			
			//cfg.svg.appendChild(cfg.path);
			cfg.pathDirty = true;
		}

		// 5 = text
		if (cfg.selectedTool == 5) {
			ATMediaAnnotations.showTextEditor(cfg);
		}

		// 6 = counter
		if (cfg.selectedTool == 6) {
			ATMediaAnnotations.insertCounter(cfg);
		}
	},

	insertCounter: (cfg) => {
		var counterValue = cfg.counterValue.value;

		var svgText = document.createElementNS("http://www.w3.org/2000/svg", "text");
		svgText.setAttribute('x', cfg.pathOrigin.x);
		svgText.setAttribute('y', cfg.pathOrigin.y);
		svgText.setAttribute('text-anchor', "middle");
		svgText.setAttribute('class', 'counter');

		// svgText.setAttribute('stroke', strokeWithOpacity);
		// svgText.setAttribute('stroke-width', 1);

		svgText.setAttribute('fill', cfg.strokeColor);
		svgText.setAttribute('stroke', "#ffffff");
		svgText.setAttribute('stroke-width', 1);

		svgText.appendChild(document.createTextNode(counterValue));
		cfg.svg.appendChild(svgText);

		cfg.counterValue.value++;
	},

	showTextEditor: (cfg) => {
		alert('this does not work yet');
		return;
		console.log('show text editor');
		console.log('clicked position', cfg.pathOrigin);

		const fObj = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
		const textDiv = document.createElement("div");
		var text = "Enter some text here";
		const textNode = document.createTextNode(text);
		textDiv.appendChild(textNode);
		textDiv.setAttribute('contentEditable', true);
		textDiv.setAttribute('width', 'auto');
		textDiv.style.display = "inline-block";

		fObj.setAttributeNS(null, "transform", "translate(" + Math.round(cfg.pathOrigin.x) + " " + Math.round(cfg.pathOrigin.y) + ")");
		fObj.setAttribute('width', '100%');
		fObj.setAttribute('height', '100%');
		fObj.appendChild(textDiv);

		cfg.svg.appendChild(fObj);
	},

	handlePointerMove: (e, cfg) => {

		// 0 = freehand
		if (cfg.selectedTool == 0) {
			if (cfg.path) {
				ATMediaAnnotations.appendToBuffer(ATMediaAnnotations.getMousePosition(e, cfg), cfg);
				ATMediaAnnotations.updateSvgPathFreeHand(cfg);
			}
		}

		// 1 = line
		if (cfg.selectedTool == 1) {
			if (cfg.path) {
				ATMediaAnnotations.setBuffer(ATMediaAnnotations.getMousePosition(e, cfg), cfg);
				ATMediaAnnotations.updateSvgPathLine(cfg, false);
			}
		}

		// 2 = line arrow
		if (cfg.selectedTool == 2) {
			if (cfg.path) {
				ATMediaAnnotations.setBuffer(ATMediaAnnotations.getMousePosition(e, cfg), cfg);
				ATMediaAnnotations.updateSvgPathLine(cfg, true);
			}
		}

		// 3 = rectangle
		if (cfg.selectedTool == 3) {
			if (cfg.path) {
				ATMediaAnnotations.setBuffer(ATMediaAnnotations.getMousePosition(e, cfg), cfg);
				ATMediaAnnotations.updateSvgPathRectangle(cfg, true);
			}
		}

		// 4 = circle
		if (cfg.selectedTool == 4) {
			if (cfg.path) {
				ATMediaAnnotations.setBuffer(ATMediaAnnotations.getMousePosition(e, cfg), cfg);
				ATMediaAnnotations.updateSvgPathCircle(cfg, true);
			}
		}

		// 5 = text

		// 6 = counter
	},

	handlePointerUp: (e, cfg) => {
		if (cfg.path) {
			cfg.path = null;
			cfg.pathDirty = false;
		}
	},

	getMousePosition: (e, cfg) => {
		return {
			// x: e.pageX - cfg.rect.left,
			// y: e.pageY - cfg.rect.top
			x: e.clientX - cfg.rect.left,
			y: e.clientY - cfg.rect.top
		}
	},

	appendToBuffer: (pt, cfg) => {
		cfg.buffer.push(pt);
		while (cfg.buffer.length > cfg.bufferSize) {
			cfg.buffer.shift();
		}
	},

	setBuffer: (pt, cfg) => {
		cfg.buffer = [];
		cfg.buffer.push(pt);
	},

	// Calculate the average point, starting at offset in the buffer
	getAveragePoint: (offset, cfg) => {
		var len = cfg.buffer.length;
		if (len % 2 === 1 || len >= cfg.bufferSize) {
			var totalX = 0;
			var totalY = 0;
			var pt, i;
			var count = 0;
			for (i = offset; i < len; i++) {
				count++;
				pt = cfg.buffer[i];
				totalX += pt.x;
				totalY += pt.y;
			}
			return {
				x: totalX / count,
				y: totalY / count
			}
		}
		return null;
	},

	updateSvgPathFreeHand: (cfg) => {
		var pt = ATMediaAnnotations.getAveragePoint(0, cfg);

		if (pt) {
			// Get the smoothed part of the path that will not change
			cfg.strPath += " L" + pt.x + " " + pt.y;

			// Get the last part of the path (close to the current mouse position)
			// This part will change if the mouse moves again
			var tmpPath = "";
			for (var offset = 2; offset < cfg.buffer.length; offset += 2) {
				pt = ATMediaAnnotations.getAveragePoint(offset, cfg);
				tmpPath += " L" + pt.x + " " + pt.y;
			}

			// Set the complete current path coordinates
			cfg.path.setAttribute("d", cfg.strPath + tmpPath);

			if (cfg.pathDirty) {
				cfg.svg.appendChild(cfg.path);
				cfg.pathDirty = false;
			}
		}
	},

	updateSvgPathLine: (cfg, drawArrow) => {
		if (cfg.buffer.length > 0) {
			var pt = cfg.buffer[0];

			// path commenced on pointerdown
			var beginPath = cfg.strPath;

			// Get the last part of the path (close to the current mouse position)
			// This part will change if the mouse moves again
			var tmpPath = " L" + pt.x + " " + pt.y;

			// Set the complete current path coordinates
			cfg.path.setAttribute("d", beginPath + tmpPath);

			if (drawArrow) {
				cfg.path.setAttribute("marker-end", "url(#triangle)");
			}

			
			if (cfg.pathDirty) {
				cfg.svg.appendChild(cfg.path);
				cfg.pathDirty = false;
			}
		}
	},

	updateSvgPathRectangle: (cfg) => {
		if (cfg.buffer.length > 0) {
			var pt = cfg.buffer[0];

			// path commenced on pointerdown
			var beginPath = cfg.strPath;

			// Get the last part of the path (related to the current mouse position)
			// This part will change if the mouse moves again
			var tmpPath = " L" + pt.x + " " + cfg.pathOrigin.y
				+ " L" + pt.x + " " + pt.y
				+ " L" + cfg.pathOrigin.x + " " + pt.y
				+ " z"
				;

			// Set the complete current path coordinates
			cfg.path.setAttribute("d", beginPath + tmpPath);

			
			if (cfg.pathDirty) {
				cfg.svg.appendChild(cfg.path);
				cfg.pathDirty = false;
			}
		}
	},

	updateSvgPathCircle: (cfg) => {
		if (cfg.buffer.length > 0) {
			var pt = cfg.buffer[0];

			// path commenced on pointerdown
			var beginPath = cfg.strPath;

			var r = Math.sqrt(
				(cfg.pathOrigin.x - pt.x) * (cfg.pathOrigin.x - pt.x)
				+ (cfg.pathOrigin.y - pt.y) * (cfg.pathOrigin.y - pt.y)
			);

			r = Math.round(r);

			// Get the last part of the path (related to the current mouse position)
			// This part will change if the mouse moves again
			var tmpPath = "m -" + r + ", 0"
				+ " a " + r + ", " + r + " 0 1,1 " + (2 * r) + ",0"
				+ " a " + r + ", " + r + " 0 1,1 " + (-2 * r) + ",0"
				;

			// Set the complete current path coordinates
			cfg.path.setAttribute("d", beginPath + tmpPath);

			
			if (cfg.pathDirty) {
				cfg.svg.appendChild(cfg.path);
				cfg.pathDirty = false;
			}
		}
	},

}

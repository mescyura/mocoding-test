const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

// variables

// important! add this file to the root
const filePath = './sst.grid';
const imagePath = './empty-map.png';
const rows = 17999;
const cols = 36000;
// if the sst.grid is mirrored
const mirrorGrid = true;
// scale the grid 0.1 = 10% / 1 = 100%
const scale = 0.1;

// Read the binary grid file and mirror it if needed
function readBinaryGridFile(filePath, rows, cols, mirrorGrid) {
	const buffer = fs.readFileSync(filePath);
	// Convert the buffer to a Uint8Array
	const temperatureArray = new Uint8Array(buffer);

	// Create a 2D array
	const grid = [];
	for (let i = 0; i < rows; i++) {
		grid[i] = temperatureArray.slice(i * cols, (i + 1) * cols);
	}

	return mirrorGrid ? mirror2DArrayVertically(grid) : grid;
}

// mirror the array
function mirror2DArrayVertically(array) {
	const mirroredArray = [];

	for (let i = 0; i < array.length; i++) {
		mirroredArray[i] = array[array.length - 1 - i];
	}

	return mirroredArray;
}

// Create canvas
async function createTemperatureCanvasWithImage(
	grid,
	rows,
	cols,
	scale,
	imagePath
) {
	const scaledRows = Math.floor(rows * scale);
	const scaledCols = Math.floor(cols * scale);

	// Create a canvas with the scaled dimensions
	const canvas = createCanvas(scaledCols, scaledRows);
	const ctx = canvas.getContext('2d');

	// Load and draw the background image over canvas
	const img = await loadImage(imagePath);
	ctx.drawImage(img, 0, 0, scaledCols, scaledRows);

	const imageData = ctx.createImageData(scaledCols, scaledRows);
	const data = imageData.data;

	// Value of the original background img
	const backgroundImageData = ctx.getImageData(0, 0, scaledCols, scaledRows);

	// Populate the canvas with the temperature data
	for (let i = 0; i < scaledRows; i++) {
		for (let j = 0; j < scaledCols; j++) {
			// Find the corresponding position in the original grid
			const origI = Math.floor(i / scale);
			const origJ = Math.floor(j / scale);
			const temp = grid[origI][origJ];

			// Set the pixel color based on the temperature
			const index = (i * scaledCols + j) * 4;
			if (temp > 200) {
				// Draw the background
				data[index] = backgroundImageData.data[index]; // Red channel
				data[index + 1] = backgroundImageData.data[index + 1]; // Green channel
				data[index + 2] = backgroundImageData.data[index + 2]; // Blue channel
				data[index + 3] = backgroundImageData.data[index + 3]; // Alpha channel
			} else {
				// Draw the sea temperature
				data[index] = temp; // Red channel
				data[index + 1] = 0; // Green channel
				data[index + 2] = 255 - temp; // Blue channel
				data[index + 3] = 255; // Alpha channel
			}
		}
	}
	// Put the image data back into the canvas
	ctx.putImageData(imageData, 0, 0);

	return canvas;
}

const grid = readBinaryGridFile(filePath, rows, cols, mirrorGrid);

createTemperatureCanvasWithImage(grid, rows, cols, scale, imagePath).then(
	canvas => {
		const out = fs.createWriteStream('temperature_map_with_background.png');
		const stream = canvas.createPNGStream();
		stream.pipe(out);
		out.on('finish', () =>
			console.log('The PNG file with background was created.')
		);
	}
);

const {screen, Point} = require("@nut-tree/nut-js");
const isSameColourDot = require("./isSameColourDot");

const checkIfNextPixelSame = async (currentPixelCoords, currentPixelColour, shift) => {
    let nextPixelCoords = {y: currentPixelCoords.y + shift.y, x: currentPixelCoords.x + shift.x};
    let newDotColour = await screen.colorAt(new Point(nextPixelCoords.x, nextPixelCoords.y));
    return isSameColourDot(currentPixelColour, newDotColour)
}

module.exports = checkIfNextPixelSame
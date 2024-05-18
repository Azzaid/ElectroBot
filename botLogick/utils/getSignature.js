const {screen, Region} = require("@nut-tree/nut-js");
const coordHelper = require("./relativeCoordsHelper");

const getSignature = async (topLeftCorner, bottomRightCorner, dotSpan= 100) => {
    const signature = [];
    for (let dotx = dotSpan; topLeftCorner.x + dotx < bottomRightCorner.x; dotx = dotx + dotSpan) {
        for (let doty = dotSpan; topLeftCorner.y + doty < bottomRightCorner.y - 10; doty = doty + dotSpan) {
            const realDotCoords = coordHelper.relativeToAbsolute({x: dotx, y: doty}, topLeftCorner);
            const dot = await screen.colorAt(realDotCoords);
            signature.push({position: {x: dotx, y: doty}, color: {R:dot.R, G:dot.G, B:dot.B}});
        }
    }

    return signature
}

module.exports = getSignature
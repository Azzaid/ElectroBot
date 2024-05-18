//used to identify exact corner location by pixel colour change, by default search for top right corner
const {screen, Point} = require("@nut-tree/nut-js");
const checkIfNextPixelSame = require("./checkIfNextPixelSame");

const getExactCornerCoords = async (startPoint, corner="topLeft", marginColor) => {
    const reverseSearch = !marginColor;
    let targetColor = reverseSearch ? await screen.colorAt(new Point(startPoint.x, startPoint.y)) : marginColor;
    const currentCoords = {...startPoint};
    let topMarginReached = corner.toLowerCase().includes("bottom");
    let leftMarginReached = corner.toLowerCase().includes("right");
    let bottomMarginReached = corner.toLowerCase().includes("top");
    let rightMarginReached = corner.toLowerCase().includes("left");
    console.log("search for", corner, "topMarginReached", topMarginReached, "leftMarginReached", leftMarginReached, "bottomMarginReached", bottomMarginReached, "rightMarginReached", rightMarginReached)

    while (!topMarginReached || !bottomMarginReached) {
        if (!topMarginReached) {
            const nextPixelMatchesTargetColor = await checkIfNextPixelSame(currentCoords, targetColor, {x: 0, y: -1});
            if (nextPixelMatchesTargetColor || (reverseSearch && !nextPixelMatchesTargetColor)) {
                topMarginReached = true;
            } else {
                currentCoords.y = currentCoords.y - 1;
            }
        }

        if (!bottomMarginReached) {
            const nextPixelMatchesTargetColor = await checkIfNextPixelSame(currentCoords, targetColor, {x: 0, y: 1});
            if (nextPixelMatchesTargetColor || (reverseSearch && !nextPixelMatchesTargetColor)) {
                bottomMarginReached = true;
            } else {
                currentCoords.y = currentCoords.y + 1;
            }
        }
    }


    while (!leftMarginReached || !rightMarginReached) {
        if (!rightMarginReached) {
            const nextPixelMatchesTargetColor = await checkIfNextPixelSame(currentCoords, targetColor, {x: 1, y: 0});
            if (nextPixelMatchesTargetColor || (reverseSearch && !nextPixelMatchesTargetColor)) {
                rightMarginReached = true;
            } else {
                currentCoords.x = currentCoords.x + 1;
            }
        }

        if (!leftMarginReached) {
            const nextPixelMatchesTargetColor = await checkIfNextPixelSame(currentCoords, targetColor, {x: -1, y: 0});
            if (nextPixelMatchesTargetColor || (reverseSearch && !nextPixelMatchesTargetColor)) {
                leftMarginReached = true;
            } else {
                currentCoords.x = currentCoords.x - 1;
            }
        }
    }
    return currentCoords
}

module.exports = getExactCornerCoords
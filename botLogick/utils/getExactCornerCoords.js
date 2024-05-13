//used to identify exact corner location by pixel colour change, by default search for top right corner
const {screen, Point} = require("@nut-tree/nut-js");
const checkIfNextPixelSame = require("./checkIfNextPixelSame");

const getExactCornerCoords = async (startPoint, corner="topLeft") => {
    const initialColor = await screen.colorAt(new Point(startPoint.x, startPoint.y));
    const currentCoords = {...startPoint};
    let topMarginReached = corner.includes("bottom");
    let leftMarginReached = corner.includes("Right");
    let bottomMarginReached = corner.includes("top");
    let rightMarginReached = corner.includes("Left");
    console.log("search for", corner, "topMarginReached", topMarginReached, "leftMarginReached", leftMarginReached, "bottomMarginReached", bottomMarginReached, "rightMarginReached", rightMarginReached)

    while (!topMarginReached || !bottomMarginReached) {
        if (!topMarginReached) {
            if (!(await checkIfNextPixelSame(currentCoords, initialColor, {x: 0, y: -1}))) {
                topMarginReached = true;
            } else {
                currentCoords.y = currentCoords.y - 1;
            }
        }

        if (!bottomMarginReached) {
            if (!(await checkIfNextPixelSame(currentCoords, initialColor, {x: 0, y: 1}))) {
                bottomMarginReached = true;
            } else {
                currentCoords.y = currentCoords.y + 1;
            }
        }
    }


    while (!leftMarginReached || !rightMarginReached) {
        if (!rightMarginReached) {
            if (!(await checkIfNextPixelSame(currentCoords, initialColor, {x: 1, y: 0}))) {
                rightMarginReached = true;
            } else {
                currentCoords.x = currentCoords.x + 1;
            }
        }

        if (!leftMarginReached) {
            if (!(await checkIfNextPixelSame(currentCoords, initialColor, {x: -1, y: 0}))) {
                leftMarginReached = true;
            } else {
                currentCoords.x = currentCoords.x - 1;
            }
        }
    }
    return currentCoords
}

module.exports = getExactCornerCoords
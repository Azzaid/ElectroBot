const {screen, Region} = require("@nut-tree/nut-js");
const coordHelper = require("./relativeCoordsHelper");
const isSameColourDot = require("./isSameColourDot");

const searchForWork = async (list, topLeftCorner) => {
    if (list.length) {
        const dotsArray = [...list[0].signature];
        let passList = [...list];
        let dotIndex = 0;

        while (passList.length > 0 && dotIndex < dotsArray.length) {
            const realDotCoords = coordHelper.relativeToAbsolute({x: dotsArray[dotIndex].position.x, y: dotsArray[dotIndex].position.y}, topLeftCorner)
            const dot = await screen.colorAt({x: realDotCoords.x, y: realDotCoords.y});
            passList = passList.filter(work => isSameColourDot(dot, work.signature[dotIndex].color));
            dotIndex++
        }

        return passList
    } else {
        return []
    }
}

module.exports = searchForWork
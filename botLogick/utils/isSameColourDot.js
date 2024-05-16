const isCloseTo = require("./isCloseTo");

const isSameColourDot = (dotA, dotB) => {
    return (isCloseTo(dotA.R, dotB.R) && isCloseTo(dotA.G, dotB.G) && isCloseTo(dotA.B, dotB.B))
}

module.exports = isSameColourDot
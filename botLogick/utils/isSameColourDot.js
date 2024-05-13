const isCloseTo = require("./isCloseTo");

const isSameColourDot = (dotA, dotB) => {
    console.log(`Is same colour dot: A: (R:${dotA.R}, G:${dotA.G}, B:${dotA.B}) and B: (R:${dotB.R}, G:${dotB.G}, B:${dotB.B})`)
    return (isCloseTo(dotA.R, dotB.R) && isCloseTo(dotA.G, dotB.G) && isCloseTo(dotA.B, dotB.B))
}

module.exports = isSameColourDot
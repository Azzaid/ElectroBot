const absoluteToRelative = (dot, zeroCoords) => {
    return {x: dot.x - zeroCoords.x, y: dot.y - zeroCoords.y}
}

const relativeToAbsolute = (dot, zeroCoords) => {
    //return {x: Math.round(dot.x)/2 + zeroCoords.x, y: Math.round(dot.y)/2 + zeroCoords.y}\
    return {x: dot.x + zeroCoords.x, y: dot.y + zeroCoords.y}
}

module.exports = {absoluteToRelative, relativeToAbsolute};
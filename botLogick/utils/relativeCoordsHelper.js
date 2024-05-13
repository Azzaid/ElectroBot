const absoluteToRelative = (dot, zeroCoords) => {
    return {x: dot.x - zeroCoords.x, y: dot.y - zeroCoords.y}
}

const relativeToAbsolute = (dot, zeroCoords) => {
    return {x: dot.x + zeroCoords.x, y: dot.y + zeroCoords.y}
}

module.exports = {absoluteToRelative, relativeToAbsolute};
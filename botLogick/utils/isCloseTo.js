//checks if two numbers are pretty close to each other

const isCloseTo = (a, b, interval= 5) => {
    return Math.abs(a-b) < interval
}

module.exports = isCloseTo
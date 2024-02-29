/**
 * example
 * https://graphql.org/graphql-js/object-types/

 * Returns GraphQL data
 * @returns {object} data
 */
class RandomDie {
  constructor(numSides) {
    this.numSides = numSides;
  }

  rollOnce() {
    return 1 + Math.floor(Math.random() * this.numSides);
  }

  roll({ numRolls }) {
    var output = [];
    for (var i = 0; i < numRolls; i++) {
      output.push(this.rollOnce());
    }
    return output;
  }
}

module.exports = {
  getDie: ({ numSides }) => {
    return new RandomDie(numSides || 7);
  }
};

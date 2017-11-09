(function () {
  const plan = [
    '############################',
    '#      #    #      o      ##',
    '#                          #',
    '#          #####           #',
    '##         #   #    ##     #',
    '###           ##     #     #',
    '#           ###      #     #',
    '#   ####                   #',
    '#   ##       o             #',
    '# o  #         o       ### #',
    '#    #                     #',
    '############################'];

  function vector(spec) {
    const { x, y } = spec;
    const plus = function (other) {
      return vector(x + other.x, y + other.y);
    };

    return Object.freeze({
      x,
      y,
      plus,
    });
  }
}());

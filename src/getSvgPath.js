function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;

  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

export default function describeArc(radius, P, Pa, startAngle, endAngle){
    console.log('>>> describeArc', radius, Pa, startAngle, endAngle);

    var arcSweep = endAngle - startAngle <= 180 ? "0" : "1";

    var d = [
        "M", P.x, P.y,
        "A", radius, radius, 0, arcSweep, 0, Pa.x, Pa.y
    ].join(" ");

    return d;
}

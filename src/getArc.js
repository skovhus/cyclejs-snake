const rad2deg = r => r * (180/Math.PI);

/**
    const P = { x: 50, y: 50};
    const d = 5;
    const r = 10;
    const V = { x: 1, y: 0};

    const arc = getArc(r, step, direction, V, P);
    console.log(arc);
 */
export default function(r, step, direction, V, P) {
    const unit = v => ({
        x: v.x / Math.sqrt(v.x*v.x + v.y*v.y),
        y: v.y / Math.sqrt(v.x*v.x + v.y*v.y),
    });

    const X = unit({
        x: V.y * direction,
        y: - V.x * direction,
    });

    const Xo = unit({
        x: -X.x,
        y: -X.y,
    });

    const Pc = {
        x: P.x + X.x*r,
        y: P.y + X.y*r,
    };

    // const startAngle = Math.acos(Xo.y);
    const startAngle = Xo.x < 0 ? 2*Math.PI - Math.acos(Xo.y) : Math.acos(Xo.y);

    const beta = -direction * step/r;
    const endAngle = -beta + startAngle;

    const Pa = {
        x: Pc.x + (P.x - Pc.x)*Math.cos(beta) - (P.y - Pc.y)*Math.sin(beta),
        y: Pc.y + (P.x - Pc.x)*Math.sin(beta) + (P.y - Pc.y)*Math.cos(beta),
    };

    const CA = unit({
        x: Pa.x - Pc.x,
        y: Pa.y - Pc.y,
    });

    const Va = {
        x: CA.y * direction,
        y: - CA.x * direction,
    };

    return {
        startAngle: rad2deg(startAngle),
        endAngle: rad2deg(endAngle),
        Pc,
        Pa,
        Va,
    };
};

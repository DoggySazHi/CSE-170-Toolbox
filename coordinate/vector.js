export function v2(x, y) {
    return { x, y };
}

export function v3(x, y, z) {
    return { x, y, z };
}

export function v2to3(v) {
    return v3(v.x, v.y, 0);
}

export function v2sub(u, v) {
    return v2(u.x - v.x, u.y - v.y);
}

export function square(x) {
    return x * x;
}

export function dotProduct(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
}

export function dot3Product(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

export function crossProduct(v1, v2) {
    // vectors are 3D
    return v3(v1.y * v2.z - v1.z * v2.y, v1.z * v2.x - v1.x * v2.z, v1.x * v2.y - v1.y * v2.x);
}

export function magnitude2(u, v) {
    return square(u.x - v.x) + square(u.y - v.y);
}

export function makeCCW(arrV) {
    // arrV is exactly 3 2D vectors
    const v1 = v2sub(arrV[1], arrV[0]);
    const v2 = v2sub(arrV[2], arrV[0])
    const rotation = v1.x * v2.y - v1.y * v2.x; // <0, 0, 1> * ((v2 - v1) x (v3 - v1))

    if (rotation < 0) { // yay opengl right-handed coordinate system
        return arrV;
    }

    return [arrV[0], arrV[2], arrV[1]];
}

export function distance2Segment(p, u, w) {
    const mag2vec = magnitude2(u, w);
    if (mag2vec === 0) return magnitude2(p, u);
    const t = dotProduct(v2(u.x - p.x, u.y - p.y), v2(u.x - w.x, u.y - w.y)) / mag2vec;
    if (t < 0) return magnitude2(p, u);
    if (t > 1) return magnitude2(p, w);
    return magnitude2(p, v2(u.x + t * (w.x - u.x), u.y + t * (w.y - u.y) ));
}
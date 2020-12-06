
raw.math.vec2 = raw.create_float32(2);
raw.math.vec3 = raw.create_float32(3);
raw.math.vec4 = raw.create_float32(4);

raw.math.quat = raw.create_float32(4, function (out) {
  out[3] = 1;
  return out;
});

raw.math.dquat = raw.create_float32(8, function (out) {
  out[3] = 1;
  return out;
});

raw.math.mat3 = raw.create_float32(9, function (out) {
  out[0] = 1;
  out[4] = 1;
  out[8] = 1;
  return out;
});
raw.math.mat4 = raw.create_float32(16, function (out) {

  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
});

raw.math.aabb2 = raw.create_float32(6);
raw.math.aabb = raw.create_float32(6);

Math.clamp = Math.clamp || function (v, l, h) {
  return Math.max(Math.min(v, h), l);
};

(function () {
  var x, y, z, w, ax, ay, az, aw, bx, by, bz, bw;
  var ax0, ay0, az0, aw0, bx0, by0, bz0, bw0;
  var ax1, ay1, az1, aw1, bx1, by1, bz1, bw1;
  var ax2, ay2, az2, aw2, bx2, by2, bz2, bw2;
  var a00, a10, a20, a30, a01, a11, a21, a31, a02, a12, a22, a32, a03, a13, a23, a33;
  var b00, b10, b20, b30, b01, b11, b21, b31, b02, b12, b22, b32, b03, b13, b23, b33;
  var b0, b1, b2, b3, det;
  var _x, _y, _z, _w, _x2, _y2, _z2, _xx, _xy, _xz, _yx, _yy, _yz, _wx, _wy, _wz;
  var i, j, ii;

  var m11, m12, m13, m21, m22, m23, m31, m32, m33;
  var is1, is2, is3, sm11, sm12, sm13, sm21, sm22, sm23, sm31, sm32, sm33, trace, S;
  var qx, qy, qz, qw;

  var uvx, uvy, uvz, uuvx, uuvy, uuvz, A, B, C;

  var v3_1 = raw.math.vec3();
  var v3_2 = raw.math.vec3();
  var v3_3 = raw.math.vec3();

  var QT_1 = raw.math.quat();
  var QT_2 = raw.math.quat();

  var V3_Y = raw.math.vec3(0, 1, 0);
  
  var V3_X = raw.math.vec3(1, 0, 0);

  var V3_Z = raw.math.vec3(0, 0, 1);
  raw.math.V3_X = V3_X;
  raw.math.V3_Y = V3_Y;
  raw.math.V3_Z = V3_Z;




  raw.math.get_bias = function (time, bias) {
    return (time / ((((1.0 / bias) - 2.0) * (1.0 - time)) + 1.0));
  };

  raw.math.get_gain = function (time, gain) {
    if (time < 0.5)
      return raw.math.get_bias(time * 2.0, gain) / 2.0;
    else
      return raw.math.get_bias(time * 2.0 - 1.0, 1.0 - gain) / 2.0 + 0.5;
  }

  raw.assign(raw.math.vec3, {
    up: V3_Y, left: V3_X,
    zero: raw.math.vec3(),
    one: raw.math.vec3(1, 1, 1),
    set: function (out, x, y, z) {
      out[0] = x;
      out[1] = y;
      out[2] = z;
      return out;
    },
    copy: function (out, a) {
      out[0] = a[0];
      out[1] = a[1];
      out[2] = a[2];
      return out;
    },
    add: function (out, a, b) {
      out[0] = a[0] + b[0];
      out[1] = a[1] + b[1];
      out[2] = a[2] + b[2];
      return out;
    },

    random: function (out, mul) {
      mul = mul || 1;
      out[0] = Math.random() * mul;
      out[1] = Math.random() * mul;
      out[2] = Math.random() * mul;

      return out;
    },
    subtract: function (out, a, b) {
      out[0] = a[0] - b[0];
      out[1] = a[1] - b[1];
      out[2] = a[2] - b[2];
      return out;
    },
    multiply: function (out, a, b) {
      out[0] = a[0] * b[0];
      out[1] = a[1] * b[1];
      out[2] = a[2] * b[2];
      return out;
    },
    scale: function (out, a, b) {
      out[0] = a[0] * b;
      out[1] = a[1] * b;
      out[2] = a[2] * b;
      return out;
    },
    scale_add: function (out, a, v, b) {
      out[0] = a[0] + v[0] * b;
      out[1] = a[1] + v[1] * b;
      out[2] = a[2] + v[2] * b;
      return out;
    },
    min: function (out, a, b) {
      out[0] = Math.min(a[0], b[0]);
      out[1] = Math.min(a[1], b[1]);
      out[2] = Math.min(a[2], b[2]);
      return out;
    },
    max: function (out, a, b) {
      out[0] = Math.max(a[0], b[0]);
      out[1] = Math.max(a[1], b[1]);
      out[2] = Math.max(a[2], b[2]);
      return out;
    },
    dot: function (a, b) {
      return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    },
    normalize: function (out, a) {
      x = a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
      if (x > 0) {
        x = 1 / Math.sqrt(x);
      }
      out[0] = a[0] * x;
      out[1] = a[1] * x;
      out[2] = a[2] * x;
      return out;
    },
    cross: function (out, a, b) {
      ax = a[0]; ay = a[1]; az = a[2];
      bx = b[0]; by = b[1]; bz = b[2];

      out[0] = ay * bz - az * by;
      out[1] = az * bx - ax * bz;
      out[2] = ax * by - ay * bx;
      return out;
    },

    to_polar: function (out, v) {
      out[0] = Math.atan2(v[0], -v[2]);
      out[2] = Math.sqrt(v[0] * v[0] + v[2] * v[2]);
      out[1] = Math.atan2(v[1], out[2]);
      return out;
    },
    from_polar: function (out, lon, lat, rad) {
      A = (1.57079632 - lat);
      B = (lon + 3.14159263);
      out[0] = -(rad * Math.sin(A) * Math.sin(B));
      out[1] = rad * Math.cos(A);
      out[2] = rad * Math.sin(A) * Math.cos(B);
    },
    length_sq: function (a) {
      return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
    },
    get_length: function (a) {
      return Math.abs(Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]));
    },

    get_length2: function (a, b) {
      ax = a[0] - b[0];
      ay = a[1] - b[1];
      az = a[2] - b[2];

      return Math.hypot(ax,ay,az);
      return Math.sqrt(ax * ax + ay * ay + az * az);
    },
    distance2: function (x0, y0, z0, x1, y1, z1) {
      return Math.abs(Math.sqrt(
        (x1 - x0) * (x1 - x0) +
        (y1 - y0) * (y1 - y0) +
        (z1 - z0) * (z1 - z0)));
    },

    distance_sq: function (x0, y0, z0, x1, y1, z1) {
      x = x1 - x0;
      y = y1 - y0;
      z = z1 - z0;
      return x * x + y * y + z * z;
    },

    distance: function (a, b) {
      return Math.abs(Math.sqrt(this.length_sq(this.subtract(v3_1, b, a))));


      return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    },
    transform_mat4: function (out, a, m) {
      x = a[0]; y = a[1]; z = a[2];
      w = 1 / (m[3] * x + m[7] * y + m[11] * z + m[15]);

      out[0] = ((m[0] * x + m[4] * y + m[8] * z) + m[12]) * w;
      out[1] = ((m[1] * x + m[5] * y + m[9] * z) + m[13]) * w;
      out[2] = ((m[2] * x + m[6] * y + m[10] * z) + m[14]) * w;

      return out;
    },

    transform_quat: function (out, a, q) {
      x = a[0]; y = a[1]; z = a[2];
      qx = q[0]; qy = q[1]; qz = q[2]; qw = q[3];


      uvx = qy * z - qz * y;
      uvy = qz * x - qx * z;
      uvz = qx * y - qy * x;

      
      uuvx = qy * uvz - qz * uvy;
      uuvy = qz * uvx - qx * uvz;
      uuvz = qx * uvy - qy * uvx;


      A = qw * 2;
      uvx *= A;
      uvy *= A;
      uvz *= A;
      
      uuvx *= 2;
      uuvy *= 2;
      uuvz *= 2;

      out[0] = x + uvx + uuvx;
      out[1] = y + uvy + uuvy;
      out[2] = z + uvz + uuvz;

      return out;
    },

    transform_quatx: function (out, x,y,z, q) {
      qx = q[0]; qy = q[1]; qz = q[2]; qw = q[3];
      uvx = qy * z - qz * y;
      uvy = qz * x - qx * z;
      uvz = qx * y - qy * x;


      uuvx = qy * uvz - qz * uvy;
      uuvy = qz * uvx - qx * uvz;
      uuvz = qx * uvy - qy * uvx;


      A = qw * 2;
      uvx *= A;
      uvy *= A;
      uvz *= A;

      uuvx *= 2;
      uuvy *= 2;
      uuvz *= 2;

      out[0] = x + uvx + uuvx;
      out[1] = y + uvy + uuvy;
      out[2] = z + uvz + uuvz;

      return out;
    },

    transform_mat4x: function (out, x, y, z, m) {
      w = 1 / (m[3] * x + m[7] * y + m[11] * z + m[15]);

      out[0] = ((m[0] * x + m[4] * y + m[8] * z) + m[12]) * w;
      out[1] = ((m[1] * x + m[5] * y + m[9] * z) + m[13]) * w;
      out[2] = ((m[2] * x + m[6] * y + m[10] * z) + m[14]) * w;

      return out;
    },


  });


  raw.assign(raw.math.vec4, {
    set: function (out, x, y, z, w) {
      out[0] = x;
      out[1] = y;
      out[2] = z;
      out[3] = w;
      return out;
    },
    copy: function (out, a) {
      out[0] = a[0];
      out[1] = a[1];
      out[2] = a[2];
      out[3] = a[3];
      return out;
    },
    length_sq: function (a) {
      return a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3];
    },
    normalize: function (out, a) {
      x = a[0];
      y = a[1];
      z = a[2];
      w = a[3];
      len = x * x + y * y + z * z + w * w;
      if (len > 0) {
        len = 1 / Math.sqrt(len);
      }
      out[0] = x * len;
      out[1] = y * len;
      out[2] = z * len;
      out[3] = w * len;
      return out;
    },
    scale: function (out, a, b) {
      out[0] = a[0] * b;
      out[1] = a[1] * b;
      out[2] = a[2] * b;
      out[3] = a[3] * b;
      return out;
    },
    dot: function (a, b) {
      return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    },
    transform_mat4: function (out, v, m) {
      x = v[0]; y = v[1]; z = v[2]; w = v[3];
      out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
      out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
      out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
      out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
      return out;
    },

  });

  raw.assign(raw.math.aabb2, {
    set: function (out, x, y, z, w, h, d) {
      out[0] = x;
      out[1] = y;
      out[2] = z;
      out[3] = w;
      out[4] = h;
      out[5] = d;
      return (out);
    },
    transform_mat4: (function () {
      return function (out, size, mat) {
        for (i = 0; i < 3; i++) {
          out[i] = mat[12 + i];
          out[3 + i] = 0;
          for (j = 0; j < 3; j++) {
            ii = i * 4 + j;
            out[3 + i] += Math.abs(mat[ii]) * size[j];
          }
        }
        return out;
      }
    })(),
    transform_mat3: (function () {
      return function (out, a, mat) {
        for (i = 0; i < 3; i++) {
          out[3 + i] = 0;
          for (j = 0; j < 3; j++) {
            ii = i * 3 + j;
            out[3 + i] += Math.abs(mat[ii]) * a[j + 3];
          }
        }
        return out;
      }
    })()
  });


  raw.assign(raw.math.aabb, {
    set: function (out, minx, miny, minz, maxx, maxy, maxz) {
      out[0] = minx;
      out[1] = miny;
      out[2] = minz;
      out[3] = maxx;
      out[4] = maxy;
      out[5] = maxz;
      return (out);
    },
    transform_mat4: (function () {

      /*
       0  1  2  3
       4  5  6  7
       8  9  10 11
       12 13 14 15

       0 1 2
       3 4 5
       6 7 8

       */

      return function (out, a, m) {
        for (i = 0; i < 3; i++) {
          out[i] = m[12 + i];
          out[i + 3] = m[12 + i];
          for (j = 0; j < 3; j++) {
            _z = m[(j * 3 + i) + j];
            _x = _z * a[j];
            _y = _z * a[j + 3];
            if (_x < _y) {
              out[i] += _x;
              out[i + 3] += _y;
            }
            else {
              out[i] += _y;
              out[i + 3] += _x;
            }
          }
        }
        return out;
      }


    })(),

  });


  raw.assign(raw.math.mat3, {
    translate_rotate_scale: function (out, x, y, sx, sy, rad) {

      bx = Math.sin(rad);
      by = Math.cos(rad);

      out[0] = (by * 1 + bx * 0) * sx;
      out[1] = (by * 0 + bx * 1) * sx;
      out[2] = (by * 0 + bx * 0) * sx;

      out[3] = (by * 0 - bx * 1) * sy;
      out[4] = (by * 1 - bx * 0) * sy;
      out[5] = (by * 0 - bx * 0) * sy;

      out[6] = x * out[0] + y * out[3];
      out[7] = x * out[1] + y * out[4];
      out[8] = x * out[2] + y * out[5];
      return out;
    },
    from_mat4: function (out, a) {
      out[0] = a[0];
      out[1] = a[1];
      out[2] = a[2];
      out[3] = a[4];
      out[4] = a[5];
      out[5] = a[6];
      out[6] = a[8];
      out[7] = a[9];
      out[8] = a[10];
      return out;
    }

  });

  raw.assign(raw.math.mat4, {
    identity: function (out) {
      out.fill(0);
      out[0] = 1;
      out[5] = 1;
      out[10] = 1;
      out[15] = 1;
      return out;
    },
    copy: function (out, a) {
      out[0] = a[0];
      out[1] = a[1];
      out[2] = a[2];
      out[3] = a[3];
      out[4] = a[4];
      out[5] = a[5];
      out[6] = a[6];
      out[7] = a[7];
      out[8] = a[8];
      out[9] = a[9];
      out[10] = a[10];
      out[11] = a[11];
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
      return out;
    },
    multiply: function (out, a, b) {
      a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
      a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
      a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];
      a30 = a[12]; a31 = a[13]; a32 = a[14]; a33 = a[15];


      b0 = b[0]; b1 = b[1]; b2 = b[2]; b3 = b[3];
      out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

      b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
      out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

      b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
      out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

      b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
      out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      return out;
    },
    perspective: function (out, fovy, aspect, near, far) {
      x = 1.0 / Math.tan(fovy / 2);
      out[0] = x / aspect;
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
      out[4] = 0;
      out[5] = x;
      out[6] = 0;
      out[7] = 0;
      out[8] = 0;
      out[9] = 0;
      out[11] = -1;
      out[12] = 0;
      out[13] = 0;
      out[15] = 0;
      if (far != null && far !== Infinity) {
        x = 1 / (near - far);
        out[10] = (far + near) * x;
        out[14] = (2 * far * near) * x;
      } else {
        out[10] = -1;
        out[14] = -2 * near;
      }
      return out;
    },
    ortho: function (out, left, right, bottom, top, near, far) {
      x = 1 / (left - right);
      y = 1 / (bottom - top);
      z = 1 / (near - far);
      out[0] = -2 * x;
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
      out[4] = 0;
      out[5] = -2 * y;
      out[6] = 0;
      out[7] = 0;
      out[8] = 0;
      out[9] = 0;
      out[10] = 2 * z;
      out[11] = 0;
      out[12] = (left + right) * x;
      out[13] = (top + bottom) * y;
      out[14] = (far + near) * z;
      out[15] = 1;
      return out;
    },
    inverse: function (out, a) {
      a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
      a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
      a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];
      a30 = a[12]; a31 = a[13]; a32 = a[14]; a33 = a[15];

      b00 = a00 * a11 - a01 * a10;
      b01 = a00 * a12 - a02 * a10;
      b02 = a00 * a13 - a03 * a10;
      b03 = a01 * a12 - a02 * a11;
      b04 = a01 * a13 - a03 * a11;
      b05 = a02 * a13 - a03 * a12;
      b06 = a20 * a31 - a21 * a30;
      b07 = a20 * a32 - a22 * a30;
      b08 = a20 * a33 - a23 * a30;
      b09 = a21 * a32 - a22 * a31;
      b10 = a21 * a33 - a23 * a31;
      b11 = a22 * a33 - a23 * a32;


      det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

      if (!det) {
        return null;
      }
      det = 1.0 / det;

      out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
      out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
      out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
      out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
      out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
      out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
      out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
      out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
      out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

      return out;
    },
    from_sacaling_position: function (out, x, y, z, sx, sy, sz) {

      out[0] = sx;
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
      out[4] = 0;
      out[5] = sy;
      out[6] = 0;
      out[7] = 0;
      out[8] = 0;
      out[9] = 0;
      out[10] = sz;
      out[12] = x;
      out[13] = y;
      out[14] = z;
      out[15] = 1;


      return (out);

    },
    transpose: function (out, a) {
      a01 = a[1]; a02 = a[2]; a03 = a[3];
      a12 = a[6]; a13 = a[7]; a23 = a[11];

      out[1] = a[4];
      out[2] = a[8];
      out[3] = a[12];
      out[4] = a01;
      out[6] = a[9];
      out[7] = a[13];
      out[8] = a02;
      out[9] = a12;
      out[11] = a[14];
      out[12] = a03;
      out[13] = a13;
      out[14] = a23;

      return out;
    },
    inverse_rotation: function (out, m, v) {
      /*
       0  1  2  3 
       4  5  6  7
       8  9  10 11
       12 13 14 15
       */
      out[0] = m[0] * v[0] + m[1] * v[1] + m[2] * v[2];
      out[1] = m[4] * v[0] + m[5] * v[1] + m[6] * v[2];
      out[2] = m[8] * v[0] + m[9] * v[1] + m[10] * v[2];

      return out;

    },
    get_rotation: function (out, mat) {
      
      this.get_scaling(v3_1, mat);

      is1 = 1 / v3_1[0];
      is2 = 1 / v3_1[1];
      is3 = 1 / v3_1[2];

      sm11 = mat[0] * is1;
      sm12 = mat[1] * is2;
      sm13 = mat[2] * is3;
      sm21 = mat[4] * is1;
      sm22 = mat[5] * is2;
      sm23 = mat[6] * is3;
      sm31 = mat[8] * is1;
      sm32 = mat[9] * is2;
      sm33 = mat[10] * is3;

      trace = sm11 + sm22 + sm33;
      S = 0;

      if (trace > 0) {
        S = Math.sqrt(trace + 1.0) * 2;
        out[3] = 0.25 * S;
        out[0] = (sm23 - sm32) / S;
        out[1] = (sm31 - sm13) / S;
        out[2] = (sm12 - sm21) / S;
      } else if (sm11 > sm22 && sm11 > sm33) {
        S = Math.sqrt(1.0 + sm11 - sm22 - sm33) * 2;
        out[3] = (sm23 - sm32) / S;
        out[0] = 0.25 * S;
        out[1] = (sm12 + sm21) / S;
        out[2] = (sm31 + sm13) / S;
      } else if (sm22 > sm33) {
        S = Math.sqrt(1.0 + sm22 - sm11 - sm33) * 2;
        out[3] = (sm31 - sm13) / S;
        out[0] = (sm12 + sm21) / S;
        out[1] = 0.25 * S;
        out[2] = (sm23 + sm32) / S;
      } else {
        S = Math.sqrt(1.0 + sm33 - sm11 - sm22) * 2;
        out[3] = (sm12 - sm21) / S;
        out[0] = (sm31 + sm13) / S;
        out[1] = (sm23 + sm32) / S;
        out[2] = 0.25 * S;
      }

      return out;
    },
    get_scaling: function (out, mat) {
      m11 = mat[0];
      m12 = mat[1];
      m13 = mat[2];
      m21 = mat[4];
      m22 = mat[5];
      m23 = mat[6];
      m31 = mat[8];
      m32 = mat[9];
      m33 = mat[10];

      out[0] = Math.hypot(m11, m12, m13);
      out[1] = Math.hypot(m21, m22, m23);
      out[2] = Math.hypot(m31, m32, m33);

      return out;
    },
    get_translation: function (out, mat) {
     
      out[0] = mat[12];
      out[1] = mat[13];
      out[2] = mat[14];

      return out;
    },
    decompose: (function () {
      
      
      return function (out_r, out_t, out_s, mat) {
        out_t[0] = mat[12];
        out_t[1] = mat[13];
        out_t[2] = mat[14];
        
        m11 = mat[0];
        m12 = mat[1];
        m13 = mat[2];
        m21 = mat[4];
        m22 = mat[5];
        m23 = mat[6];
        m31 = mat[8];
        m32 = mat[9];
        m33 = mat[10];

        out_s[0] = Math.hypot(m11, m12, m13);
        out_s[1] = Math.hypot(m21, m22, m23);
        out_s[2] = Math.hypot(m31, m32, m33);

        
        is1 = 1 / out_s[0];
        is2 = 1 / out_s[1];
        is3 = 1 / out_s[2];

        sm11 = m11 * is1;
        sm12 = m12 * is2;
        sm13 = m13 * is3;
        sm21 = m21 * is1;
        sm22 = m22 * is2;
        sm23 = m23 * is3;
        sm31 = m31 * is1;
        sm32 = m32 * is2;
        sm33 = m33 * is3;

        trace = sm11 + sm22 + sm33;
        S = 0;

        if (trace > 0) {
          S = Math.sqrt(trace + 1.0) * 2;
          out_r[3] = 0.25 * S;
          out_r[0] = (sm23 - sm32) / S;
          out_r[1] = (sm31 - sm13) / S;
          out_r[2] = (sm12 - sm21) / S;
        } else if (sm11 > sm22 && sm11 > sm33) {
          S = Math.sqrt(1.0 + sm11 - sm22 - sm33) * 2;
          out_r[3] = (sm23 - sm32) / S;
          out_r[0] = 0.25 * S;
          out_r[1] = (sm12 + sm21) / S;
          out_r[2] = (sm31 + sm13) / S;
        } else if (sm22 > sm33) {
          S = Math.sqrt(1.0 + sm22 - sm11 - sm33) * 2;
          out_r[3] = (sm31 - sm13) / S;
          out_r[0] = (sm12 + sm21) / S;
          out_r[1] = 0.25 * S;
          out_r[2] = (sm23 + sm32) / S;
        } else {
          S = Math.sqrt(1.0 + sm33 - sm11 - sm22) * 2;
          out_r[3] = (sm12 - sm21) / S;
          out_r[0] = (sm31 + sm13) / S;
          out_r[1] = (sm23 + sm32) / S;
          out_r[2] = 0.25 * S;
        }

        return out_r;
      }
    })(),
    scale: function (mat, scale) {
      mat[0] *= scale[0];
      mat[1] *= scale[0];
      mat[2] *= scale[0];
      mat[3] *= scale[0];

      mat[4] *= scale[1];
      mat[5] *= scale[1];
      mat[6] *= scale[1];
      mat[7] *= scale[1];


      mat[8] *= scale[2];
      mat[9] *= scale[2];
      mat[10] *= scale[2];
      mat[11] *= scale[2];
      return mat;
    },
    from_eular: function (m, x, y, z) {      
      return raw.math.quat.to_mat4(m, raw.math.quat.rotate_eular(QT_1, x, y, z));
    }
  });

  var pitch, yaw, roll;
  var  omega, cosom, sinom, scale0, scale1;
  raw.assign(raw.math.quat, {
    zero: raw.math.quat(0, 0, 0, 1),
    invert: function (out, a) {
      a0 = a[0]; a1 = a[1]; a2 = a[2]; a3 = a[3];
      det = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
      det = det > 0 ? 1.0 / det : 0;
      out[0] = -a0 * det;
      out[1] = -a1 * det;
      out[2] = -a2 * det;
      out[3] = a3 * det;
      return out;
    },
    set: raw.math.vec4.set,
    copy: raw.math.vec4.copy,
    dot: raw.math.vec4.dot,
    normalize: raw.math.vec4.normalize,
    identity: function (q) {
      q[0] = 0;
      q[1] = 0;
      q[2] = 0;
      q[3] = 1;
      return q;
    },
    negate: function (q) {
      q[0] = -q[0];
      q[1] = -q[1];
      q[2] = -q[2];
      q[3] = -q[3];
      return q;
    },
    slerp: function (out, a, b, t) {
      ax = a[0]; ay = a[1]; az = a[2]; aw = a[3];
      bx = b[0]; by = b[1]; bz = b[2]; bw = b[3];



      // calc cosine
      cosom = ax * bx + ay * by + az * bz + aw * bw;
      // adjust signs (if necessary)
      if (cosom < 0.0) {
        cosom = -cosom;
        bx = -bx;
        by = -by;
        bz = -bz;
        bw = -bw;
      }
      // calculate coefficients
      if (1.0 - cosom > 0.000001) {
        // standard case (slerp)
        omega = Math.acos(cosom);
        sinom = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
      } else {
        // "from" and "to" quaternions are very close
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
      }
      // calculate final values
      out[0] = scale0 * ax + scale1 * bx;
      out[1] = scale0 * ay + scale1 * by;
      out[2] = scale0 * az + scale1 * bz;
      out[3] = scale0 * aw + scale1 * bw;

      return out;
    },
    slerp_flat: function (out, ax, ay, az, aw, bx, by, bz, bw, t) {

      // calc cosine
      cosom = ax * bx + ay * by + az * bz + aw * bw;
      // adjust signs (if necessary)
      if (cosom < 0.0) {
        cosom = -cosom;
        bx = -bx;
        by = -by;
        bz = -bz;
        bw = -bw;
      }
      // calculate coefficients
      if (1.0 - cosom > 0.000001) {
        // standard case (slerp)
        omega = Math.acos(cosom);
        sinom = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
      } else {
        // "from" and "to" quaternions are very close
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
      }
      // calculate final values
      out[0] = scale0 * ax + scale1 * bx;
      out[1] = scale0 * ay + scale1 * by;
      out[2] = scale0 * az + scale1 * bz;
      out[3] = scale0 * aw + scale1 * bw;

      return out;
    },

    get_angle: function (q) {
      return 2 * Math.acos(q[3]);
    },
    to_eular: function (out, q) {
      x = q[0]; y = [1]; z = q[2]; w = q[3];
      
     a00 = x * y + z * w;
      if (a00 > 0.499) { //console.log("North");
        pitch = 2 * Math.atan2(x, w);
        yaw = Math.PI / 2;
        roll = 0;
      }
      else if (a00 < -0.499) { //console.log("South");
        pitch = -2 * Math.atan2(x, w);
        yaw = - Math.PI / 2;
        roll = 0;
      }

      //..............................
      if (isNaN(pitch)) { //console.log("isNan");
        b00 = z * z;
        roll = Math.atan2(2 * x * w - 2 * y * z, 1 - 2 * x * x - 2 *b00); // bank
        pitch = Math.atan2(2 * y * w - 2 * x * z, 1 - 2 * y * y - 2 * b00); // Heading
        yaw = Math.asin(2 * a00); // attitude
      }

      out[0] = roll;
      out[1] = pitch;
      out[2] = yaw;


      return out;
    },
    rotate_eular: function (q, x, y, z) {
      x = x * 0.5;
      y = y * 0.5;
      z = z * 0.5;

      ax = Math.sin(x);
      bx = Math.cos(x);
      ay = Math.sin(y);
      by = Math.cos(y);
      az = Math.sin(z);
      bz = Math.cos(z);

      q[0] = ax * by * bz - bx * ay * az;
      q[1] = bx * ay * bz + ax * by * az;
      q[2] = bx * by * az - ax * ay * bz;
      q[3] = bx * by * bz + ax * ay * az;

      this.normalize(q, q);
      return q;
    },    
    append_eular: function (out, x, y, z) {
      this.rotate_eular(QT_1, x, y, z);
      return this.multiply(out, out, QT_1);
    },
    multiply: function (out, a, b) {
      ax = a[0]; ay = a[1]; az = a[2]; aw = a[3];
      bx = b[0]; by = b[1]; bz = b[2]; bw = b[3];

      out[0] = ax * bw + aw * bx + ay * bz - az * by;
      out[1] = ay * bw + aw * by + az * bx - ax * bz;
      out[2] = az * bw + aw * bz + ax * by - ay * bx;
      out[3] = aw * bw - ax * bx - ay * by - az * bz;
      return out;
    },

    multiply2: function (out, a, bx,by,bz,bw) {
      ax = a[0]; ay = a[1]; az = a[2]; aw = a[3];
      out[0] = ax * bw + aw * bx + ay * bz - az * by;
      out[1] = ay * bw + aw * by + az * bx - ax * bz;
      out[2] = az * bw + aw * bz + ax * by - ay * bx;
      out[3] = aw * bw - ax * bx - ay * by - az * bz;
      return out;
    },

    to_mat4: function (mat, q) {
      _x = q[0]; _y = q[1]; _z = q[2]; _w = q[3];
      _x2 = _x + _x; _y2 = _y + _y; _z2 = _z + _z;

      _xx = _x * _x2;
      _xy = _x * _y2;
      _xz = _x * _z2;
      _yy = _y * _y2;
      _yz = _y * _z2;
      _zz = _z * _z2;
      _wx = _w * _x2;
      _wy = _w * _y2;
      _wz = _w * _z2;


      mat[0] = (1 - (_yy + _zz));
      mat[1] = (_xy + _wz);
      mat[2] = (_xz - _wy);
      mat[3] = 0;
      mat[4] = (_xy - _wz);
      mat[5] = (1 - (_xx + _zz));
      mat[6] = (_yz + _wx);
      mat[7] = 0;
      mat[8] = (_xz + _wy);
      mat[9] = (_yz - _wx);
      mat[10] = (1 - (_xx + _yy));
      mat[11] = 0;
      return mat;
    },
    set_axis_angle: function (out, axis, rad) {
      rad = rad * 0.5;
      A = Math.sin(rad);
      out[0] = A * axis[0];
      out[1] = A * axis[1];
      out[2] = A * axis[2];
      out[3] = Math.cos(rad);
      return out;
    },
    set_axis_anglex: function (out,x,y,z, rad) {
      rad = rad * 0.5;
      A = Math.sin(rad);
      out[0] = A * x;
      out[1] = A * y;
      out[2] = A * z;
      out[3] = Math.cos(rad);
      return out;
    },
    look_at: function (out,a,b) {
      raw.math.vec3.cross(v3_1, a, b);
      A = raw.math.vec3.dot(a, b);      
      if (dot < -1.0 + DOT_EPSILON) return Quaternion(0, 1, 0, 0);


    },
    rotation_to: function (out, a,b) {    
      A = raw.math.vec3.dot(a, b);      
      if (A < -0.999999) {
        raw.math.vec3.cross(v3_1, V3_X, a);
        if (raw.math.vec3.get_length(v3_1) < 0.000001) raw.math.vec3.cross(v3_1, V3_Y, a);
        raw.math.vec3.normalize(v3_1, v3_1);
        this.set_axis_angle(out, v3_1, Math.PI);
        return out;
      } else if (A > 0.999999) {
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
        out[3] = 1;
        return out;
      }else {
        raw.math.vec3.cross(v3_1, a, b);
        out[0] = v3_1[0];
        out[1] = v3_1[1];
        out[2] = v3_1[2];
        out[3] = 1 + A;
        return this.normalize(out, out);
      }

    },

    rotation_to2: function (out, a, b) {
      A = raw.math.vec3.dot(a, b);
      raw.math.vec3.cross(v3_1, a, b);
      out[0] = v3_1[0];
      out[1] = v3_1[1];
      out[2] = v3_1[2];
      out[3] = 1 + A;
      return this.normalize(out, out);

    },

    aim: function (out, a, b) {
    //float d = xfrom * xto + yfrom * yto + zfrom * zto; //dot(from, to);
      A = raw.math.vec3.dot(a, b);
      raw.math.vec3.cross(out, a, b);

      //float wq = (float)sqrt((xfrom*xfrom + yfrom*yfrom + zfrom*zfrom)*(xto*xto + yto*yto + zto*zto)) +d;
      out[3] = Math.sqrt((raw.math.vec3.length_sq(a)) * (raw.math.vec3.length_sq(a))) + A;
      
      /*
      if (out[3] < 0.0001) {
        out[0] = -a[2]; // Cross.set( -UnitFrom.z, 0, UnitFrom.x );
        out[1] =a[1];
        out[2] =a[0];
        out[3] = 0;
      }
      */
      return this.normalize(out, out);




    },


  });
  

  raw.assign(raw.math.dquat, {
    rotate_eular: raw.math.quat.rotate_eular,
    get_translation: function (out, a) {
      ax = a[4];
      ay = a[5];
      az = a[6];
      aw = a[7];
      bx = -a[0];
      by = -a[1];
      bz = -a[2];
      bw = a[3];
      out[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
      out[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
      out[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
      return out;
    },
    from_rotation_translation: function (q, rx, ry, rz, tx, ty, tz) {
      this.rotate_eular(q, rx, ry, rz);
      

      /*
       * raw.math.quat.normalize(q, q);

      raw.math.quat.set(QT_1, tx, ty, tz, 0);
      raw.math.vec4.scale(QT_2, q, 0.5);
      raw.math.quat.multiply(QT_1, QT_1, QT_2);

      q[4] = QT_1[0];
      q[5] = QT_1[1];
      q[6] = QT_1[2];
      q[7] = QT_1[3];

      */

      ax = tx * 0.5;
      ay = ty * 0.5;
      az = tz * 0.5;
      bx = q[0];
      by = q[1];
      bz = q[2];
      bw = q[3];

      q[4] = ax * bw + ay * bz - az * by;
      q[5] = ay * bw + az * bx - ax * bz;
      q[6] = az * bw + ax * by - ay * bx;
      q[7] = -ax * bx - ay * by - az * bz;
      return q;



    },
    from_quat_pos: function (q, qt, pos) {
      
      q[0] = qt[0];
      q[1] = qt[1];
      q[2] = qt[2];
      q[3] = qt[3];

      ax = pos[0] * 0.5;
      ay = pos[1] * 0.5;
      az = pos[2] * 0.5;
      bx = q[0];
      by = q[1];
      bz = q[2];
      bw = q[3];

      q[4] = ax * bw + ay * bz - az * by;
      q[5] = ay * bw + az * bx - ax * bz;
      q[6] = az * bw + ax * by - ay * bx;
      q[7] = -ax * bx - ay * by - az * bz;

      return q;


    },
    translate: function (out, a, x, y, z) {
      ax1 = a[0];
      ay1 = a[1];
      az1 = a[2];
      aw1 = a[3];
      bx1 = x * 0.5;
      by1 = y * 0.5;
      bz1 = z * 0.5;
      ax2 = a[4];
      ay2 = a[5];
      az2 = a[6];
      aw2 = a[7];
      out[0] = ax1;
      out[1] = ay1;
      out[2] = az1;
      out[3] = aw1;
      out[4] = aw1 * bx1 + ay1 * bz1 - az1 * by1 + ax2;
      out[5] = aw1 * by1 + az1 * bx1 - ax1 * bz1 + ay2;
      out[6] = aw1 * bz1 + ax1 * by1 - ay1 * bx1 + az2;
      out[7] = -ax1 * bx1 - ay1 * by1 - az1 * bz1 + aw2;
      return out;
    },
    length_sq: raw.math.vec4.length_sq,
    normalize: function (out, a) {
      A = this.length_sq(a);
      if (A > 0) {
        A = Math.sqrt(A);

        a0 = a[0] / A;
        a1 = a[1] / A;
        a2 = a[2] / A;
        a3 = a[3] / A;

        b0 = a[4];
        b1 = a[5];
        b2 = a[6];
        b3 = a[7];

        B = (a0 * b0) + (a1 * b1) + (a2 * b2) + (a3 * b3);

        out[0] = a0;
        out[1] = a1;
        out[2] = a2;
        out[3] = a3;

        out[4] = (b0 - (a0 * B)) / A;
        out[5] = (b1 - (a1 * B)) / A;
        out[6] = (b2 - (a2 * B)) / A;
        out[7] = (b3 - (a3 * B)) / A;
      }
      return out;
    },  
    multiply: function (out, a, b) {

      ax0 = a[0]; ay0 = a[1]; az0 = a[2]; aw0 = a[3];
      ax1 = a[4]; ay1 = a[5]; az1 = a[6]; aw1 = a[7];

      bx0 = b[0]; by0 = b[1]; bz0 = b[2]; bw0 = b[3];
      bx1 = b[4]; by1 = b[5]; bz1 = b[6]; bw1 = b[7];

      out[0] = ax0 * bw0 + aw0 * bx0 + ay0 * bz0 - az0 * by0;
      out[1] = ay0 * bw0 + aw0 * by0 + az0 * bx0 - ax0 * bz0;
      out[2] = az0 * bw0 + aw0 * bz0 + ax0 * by0 - ay0 * bx0;
      out[3] = aw0 * bw0 - ax0 * bx0 - ay0 * by0 - az0 * bz0;

      out[4] = ax0 * bw1 + aw0 * bx1 + ay0 * bz1 - az0 * by1 + ax1 * bw0 + aw1 * bx0 + ay1 * bz0 - az1 * by0;
      out[5] = ay0 * bw1 + aw0 * by1 + az0 * bx1 - ax0 * bz1 + ay1 * bw0 + aw1 * by0 + az1 * bx0 - ax1 * bz0;
      out[6] = az0 * bw1 + aw0 * bz1 + ax0 * by1 - ay0 * bx1 + az1 * bw0 + aw1 * bz0 + ax1 * by0 - ay1 * bx0;
      out[7] = aw0 * bw1 - ax0 * bx1 - ay0 * by1 - az0 * bz1 + aw1 * bw0 - ax1 * bx0 - ay1 * by0 - az1 * bz0;

      return out;

    },
    invert: function (out, a) {

      A = this.length_sq(a);
      out[0] = -a[0] / A;
      out[1] = -a[1] / A;
      out[2] = -a[2] / A;
      out[3] = a[3] / A;
      out[4] = -a[4] / A;
      out[5] = -a[5] / A;
      out[6] = -a[6] / A;
      out[7] = a[7] / A;
      return out;
    },
    conjugate: function (out, a) {
      out[0] = -a[0];
      out[1] = -a[1];
      out[2] = -a[2];
      out[3] = a[3];
      out[4] = -a[4];
      out[5] = -a[5];
      out[6] = -a[6];
      out[7] = a[7];
      return out;
    },
    lerp: function (out, a, b, t) {

      A = 1 - t;
      if (vec4.dot(a, b) < 0) t = -t;

      out[0] = a[0] * A + b[0] * t;
      out[1] = a[1] * A + b[1] * t;
      out[2] = a[2] * A + b[2] * t;
      out[3] = a[3] * A + b[3] * t;
      out[4] = a[4] * A + b[4] * t;
      out[5] = a[5] * A + b[5] * t;
      out[6] = a[6] * A + b[6] * t;
      out[7] = a[7] * A + b[7] * t;
      return out;
    },
    to_mat4: function (mat,q) {
      _x = q[0]; _y = q[1]; _z = q[2]; _w = q[3];

      _x2 = _x + _x; _y2 = _y + _y; _z2 = _z + _z;

      _xx = _x * _x2;
      _xy = _x * _y2;
      _xz = _x * _z2;
      _yy = _y * _y2;
      _yz = _y * _z2;
      _zz = _z * _z2;
      _wx = _w * _x2;
      _wy = _w * _y2;
      _wz = _w * _z2;


      mat[0] = (1 - (_yy + _zz));
      mat[1] = (_xy + _wz);
      mat[2] = (_xz - _wy);
      mat[3] = 0;
      mat[4] = (_xy - _wz);
      mat[5] = (1 - (_xx + _zz));
      mat[6] = (_yz + _wx);
      mat[7] = 0;
      mat[8] = (_xz + _wy);
      mat[9] = (_yz - _wx);
      mat[10] = (1 - (_xx + _yy));
      mat[11] = 0;

      ax = q[4];
      ay = q[5];
      az = q[6];
      aw = q[7];
      bx = -q[0];
      by = -q[1];
      bz = -q[2];
      bw = q[3];
      mat[12] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
      mat[13] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
      mat[14] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
    },
    copy: function (out, a) {
      out[0] = a[0];
      out[1] = a[1];
      out[2] = a[2];
      out[3] = a[3];
      out[4] = a[4];
      out[5] = a[5];
      out[6] = a[6];
      out[7] = a[7];
      return out;
    },
    from_mat4: function (out, mat) {      
      raw.math.mat4.get_rotation(QT_1, mat)
      raw.math.mat4.get_translation(v3_1, mat);
   //   raw.math.quat.normalize(QT_1, QT_1);
      this.from_quat_pos(out, QT_1, v3_1);
      return out;
    }    

  });


})();



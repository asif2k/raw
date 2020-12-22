
raw.geometry = raw.define(function (proto) {
  function geometry() {
    this.compiled = false;
    this.uuid = raw.guidi();
    this.attributes = {};
    this.version = 0;
    this.bounds_sphere = 0;
    this.aabb = raw.math.aabb();
    this.index_buffer = null;
    this.index_data = null;

    return (this);
  }

  proto.set_indices = function (indices) {
    if (Object.prototype.toString.call(indices) === "[object Uint16Array]"
      || Object.prototype.toString.call(indices) === "[object Uint32Array]"
    ) {
      this.index_data = indices;
    }
    else this.index_data = raw.geometry.create_index_data(indices);
    this.index_needs_update = true;
    this.num_items = this.index_data.length;
  };

  proto.add_attribute = function (name, attribute) {
    attribute.buffer = null;
    attribute.item_size = attribute.item_size || 3;
    attribute.data = attribute.data || null;
    attribute.needs_update = attribute.needs_update || false;
    attribute.divisor = attribute.divisor || 0;
    attribute.array = attribute.array || null;
    attribute.data_offset = attribute.data_offset || 0;
    attribute.data_length = attribute.data_length || 0;
    attribute.buffer_type = attribute.buffer_type || raw.GL_STATIC_DRAW;
    attribute.name = name;
    attribute.geo_id = this.uuid;
    if (attribute.data !== null) {
      attribute.data_length = attribute.data.length;
    }
    this.attributes[name] = attribute;
    return (attribute);
  };

  proto.create_instance_id_attribute = function (max_instances) {
    var att = this.add_attribute("a_instance_id_rw", {
      data: new Float32Array(max_instances),
      item_size: 1,
      divisor: 1
    });
    for (var i = 0; i < att.data.length; i++)
      att.data[i] = i;

  }


  proto.scale_position_rotation = (function () {
    var mat = raw.math.mat4(), quat = raw.math.quat();
    return function (sx, sy, sz, x, y, z, rx, ry, rz, vert_att) {
      vert_att = vert_att || this.attributes["a_position_rw"];
      raw.math.quat.to_mat4(mat, raw.math.quat.rotate_eular(quat, rx, ry, rz));
      mat[0] *= sx;
      mat[1] *= sy;
      mat[2] *= sz;

      mat[4] *= sx;
      mat[5] *= sy;
      mat[6] *= sz;

      mat[8] *= sx;
      mat[9] *= sy;
      mat[10] *= sz;

      mat[12] = x;
      mat[13] = y;
      mat[14] = z;

      raw.geometry.transform(this, vert_att.data, vert_att.item_size, mat);

      if (this.attributes["a_normal_rw"]) {
        raw.geometry.transform(this, this.attributes["a_normal_rw"].data, this.attributes["a_normal_rw"].item_size, mat);
      }
      
      raw.geometry.calc_bounds(this, vert_att.data, vert_att.item_size);
      return this;

    }
  })();

  geometry.index_data_type = Uint32Array;
  geometry.create_index_data = function (size) {
    return new this.index_data_type(size);
  };

  geometry.calc_bounds = (function () {
    var p_min = raw.math.vec3(), p_max = raw.math.vec3();
    geometry.transform = function (g, vertices, item_size, mat) {
      for (i = 0; i < vertices.length; i += item_size) {
        raw.math.vec3.transform_mat4x(p_min, vertices[i], vertices[i + 1], vertices[i + 2], mat);
        vertices[i] = p_min[0];
        vertices[i + 1] = p_min[1];
        vertices[i + 2] = p_min[2];


      }
    };
    return function (g, vertices, item_size) {
      g.bounds_sphere = 0;
      raw.math.vec3.set(p_min, 99999, 99999, 99999);
      raw.math.vec3.set(p_max, -99999, -99999, -99999);
      for (i = 0; i < vertices.length; i += item_size) {
        g.bounds_sphere = Math.max(g.bounds_sphere, Math.abs(Math.hypot(vertices[i], vertices[i + 1], vertices[i + 2])));
        p_min[0] = Math.min(p_min[0], vertices[i]);
        p_min[1] = Math.min(p_min[1], vertices[i + 1]);
        p_min[2] = Math.min(p_min[2], vertices[i + 2]);

        p_max[0] = Math.max(p_max[0], vertices[i]);
        p_max[1] = Math.max(p_max[1], vertices[i + 1]);
        p_max[2] = Math.max(p_max[2], vertices[i + 2]);
      }
      raw.math.aabb.set(g.aabb, p_min[0], p_min[1], p_min[2], p_max[0], p_max[1], p_max[2]);
      return g.bounds_sphere;

    }
  })();

  geometry.calc_normals = (function () {
    var v1 = raw.math.vec3(), v2 = raw.math.vec3(), v3 = raw.math.vec3();
    var v1v2 = raw.math.vec3(), v1v3 = raw.math.vec3(), normal = raw.math.vec3();
    var v2v3Alias = raw.math.vec3(), v2v3Alias = raw.math.vec3();
    var i1, i2, i3;
    var normals;
    geometry.invert_normals = function (geo) {
      normals = geo.attributes.a_normal_rw.data;
      for (i1 = 0; i1 < normals.length; i1 += 3) {
        normals[i1] = -normals[i1];
        normals[i1+1] = -normals[i1+1];
        normals[i1+2] = -normals[i1+2];
      }
      geo.attributes.needs_update = true;
    };

    return function (geo, flateFaces) {

      var vertices = geo.attributes.a_position_rw.data;
      
      if (!geo.attributes.tge_a_normal) {
        geo.addAttribute('a_normal_rw', {
          data: new Float32Array(vertices.length)
        });
      }

      normals = geo.attributes.a_normal_rw.data;
      var indices = geo.index_data;

      normals.fill(0);


     
      var weight1, weight2;
      var total = vertices.length;
      var step = 9;
      if (indices !== null) {
        total = indices.length;
        step = 3;
      }
      for (var j = 0; j < total; j += step) {
        if (indices !== null) {
          i1 = indices[j];
          i2 = indices[j + 1];
          i3 = indices[j + 2];
          raw.math.vec3.set(v1, vertices[i1 * 3], vertices[i1 * 3 + 1], vertices[i1 * 3 + 2]);
          raw.math.vec3.set(v2, vertices[i2 * 3], vertices[i2 * 3 + 1], vertices[i2 * 3 + 2]);
          raw.math.vec3.set(v3, vertices[i3 * 3], vertices[i3 * 3 + 1], vertices[i3 * 3 + 2]);
        }
        else {
          raw.math.vec3.set(v1, vertices[j + 0], vertices[j + 1], vertices[j + 2]);
          raw.math.vec3.set(v2, vertices[j + 3], vertices[j + 4], vertices[j + 5]);
          raw.math.vec3.set(v3, vertices[j + 6], vertices[j + 7], vertices[j + 8]);
        }




        raw.math.vec3.subtract(v1v2, v3, v2);
        raw.math.vec3.subtract(v1v3, v1, v2);





        if (indices !== null) {
          i1 = i1 * 3;
          i2 = i2 * 3;
          i3 = i3 * 3;
        }
        else {
          i1 = j;
          i2 = j + 3;
          i3 = j + 6;
        }

        if (flateFaces) {
          raw.math.vec3.cross(normal, v1v2, v1v3);
          raw.math.vec3.normalize(v1v2, normal);
          normals[i1 + 0] += v1v2[0];
          normals[i1 + 1] += v1v2[1];
          normals[i1 + 2] += v1v2[2];

          normals[i2 + 0] += v1v2[0];
          normals[i2 + 1] += v1v2[1];
          normals[i2 + 2] += v1v2[2];

          normals[i3 + 0] += v1v2[0];
          normals[i3 + 1] += v1v2[1];
          normals[i3 + 2] += v1v2[2];
        }
        else {

          //raw.math.vec3.normalize(v1v2, v1v2);
          //raw.math.vec3.normalize(v1v3, v1v3);
          raw.math.vec3.cross(normal, v1v2, v1v3);
          //raw.math.vec3.normalize(normal, normal);
          raw.math.vec3.copy(v1v2, normal);


          //raw.math.vec3.subtract(v2v3Alias, v3, v2);
          //raw.math.vec3.normalize(v2v3Alias, v2v3Alias);

          //weight1 = Math.acos(Math.max(-1, Math.min(1, raw.math.vec3.dot(v1v2, v1v3))));
          // weight2 = Math.PI - Math.acos(Math.max(-1, Math.min(1, raw.math.vec3.dot(v1v2, v2v3Alias))));
          // raw.math.vec3.scale(v1v2, normal, weight1);
          normals[i1 + 0] += v1v2[0];
          normals[i1 + 1] += v1v2[1];
          normals[i1 + 2] += v1v2[2];
          // raw.math.vec3.scale(v1v2, normal, weight2);
          normals[i2 + 0] += v1v2[0];
          normals[i2 + 1] += v1v2[1];
          normals[i2 + 2] += v1v2[2];
          //  raw.math.vec3.scale(v1v2, normal, Math.PI - weight1 - weight2);
          normals[i3 + 0] += v1v2[0];
          normals[i3 + 1] += v1v2[1];
          normals[i3 + 2] += v1v2[2];
        }




      }

      if (!flateFaces) {

      }
      for (a = 0; a < normals.length; a += 3) {
        raw.math.vec3.set(v1v2, normals[a], normals[a + 1], normals[a + 2]);
        raw.math.vec3.normalize(normal, v1v2);
        normals[a] = normal[0];
        normals[a + 1] = normal[1];
        normals[a + 2] = normal[2];
      }


    }
  })();

  geometry.calc_tangents = (function () {
    var n = raw.math.vec3();
    var t = raw.math.vec3();
    var tangent = raw.math.vec4();
    var tn1 = raw.math.vec3();
    var tn2 = raw.math.vec3();
    var sn = raw.math.vec3();
    var sdir = raw.math.vec3();
    var tdir = raw.math.vec3();
    return function (geo) {

      var vertices = geo.attributes.a_position_rw.data;
      var normals = geo.attributes.a_normal_rw.data;
      var tangents = geo.attributes.a_tangent_rw.data;
      var uvs = geo.attributes.a_uv_rw.data;
      var indices = geo.index_data;

      var tan1 = new Float32Array(vertices.length);
      tan1.fill(0);
      var tan2 = new Float32Array(vertices.length);
      tan2.fill(0);


      var i1, i2, i3;
      var v1, v2, v3;

      var x1, x2, y1, y2, z1, z2, w1, w2, w3, s1, s2, t1, t2, r;

      for (var j = 0; j < indices.length; j = j + 3) {
        i1 = indices[j];
        i2 = indices[j + 1];
        i3 = indices[j + 2];

        v1 = i1 * 3;
        v2 = i2 * 3;
        v3 = i3 * 3;

        x1 = vertices[v2] - vertices[v1];
        x2 = vertices[v3] - vertices[v1];
        y1 = vertices[v2 + 1] - vertices[v1 + 1];
        y2 = vertices[v3 + 1] - vertices[v1 + 1];
        z1 = vertices[v2 + 2] - vertices[v1 + 2];
        z2 = vertices[v3 + 2] - vertices[v1 + 2];

        w1 = i1 * 2; w2 = i2 * 2; w3 = i3 * 2;

        s1 = uvs[w2] - uvs[w1];
        s2 = uvs[w3] - uvs[w1];
        t1 = uvs[w2 + 1] - uvs[w1 + 1];
        t2 = uvs[w3 + 1] - uvs[w1 + 1];


        r = 1.0 / (s1 * t2 - s2 * t1);

        raw.math.vec3.set(sdir,
          (t2 * x1 - t1 * x2) * r,
          (t2 * y1 - t1 * y2) * r,
          (t2 * z1 - t1 * z2) * r);
        raw.math.vec3.set(tdir,
          (s1 * x2 - s2 * x1) * r,
          (s1 * y2 - s2 * y1) * r,
          (s1 * z2 - s2 * z1) * r);


        tan1[v1] += sdir[0]; tan1[v1 + 1] += sdir[1]; tan1[v1 + 2] += sdir[2];

        tan1[v2] += sdir[0]; tan1[v2 + 1] += sdir[1]; tan1[v2 + 2] += sdir[2];

        tan1[v3] += sdir[0]; tan1[v3 + 1] += sdir[1]; tan1[v3 + 2] += sdir[2];

        tan2[v1] += tdir[0]; tan2[v1 + 1] += tdir[1]; tan2[v1 + 2] += tdir[2];
        tan2[v2] += tdir[0]; tan2[v2 + 1] += tdir[1]; tan2[v2 + 2] += tdir[2];
        tan2[v3] += tdir[0]; tan2[v3 + 1] += tdir[1]; tan2[v3 + 2] += tdir[2];

      }


      var vi;
      for (var a = 0; a < vertices.length; a = a + 3) {

        vi = a / 3;
        raw.math.vec3.set(n, normals[a], normals[a + 1], normals[a + 2]);
        raw.math.vec3.set(t, tan1[a], tan1[a + 1], tan1[a + 2]);



        // Gram-Schmidt orthogonalize
        //tangent[a] = (t - n * Dot(n, t)).Normalize();

        raw.math.vec3.scale(sn, n, raw.math.vec3.dot(n, t));

        raw.math.vec3.subtract(tn2, t, sn);

        raw.math.vec3.normalize(tangent, tn2);

        raw.math.vec3.cross(tn1, n, t);
        raw.math.vec3.set(tn2, tan2[a], tan2[a + 1], tan2[a + 2]);

        tangent[3] = raw.math.vec3.dot(tn1, tn2) < 0 ? -1 : 1;

        tangents[vi * 4] = tangent[0];
        tangents[vi * 4 + 1] = tangent[1];
        tangents[vi * 4 + 2] = tangent[2];
        tangents[vi * 4 + 3] = tangent[3];

        //tangent[a] = (t - n * Dot(n, t)).Normalize();
        // Calculate handedness
        //tangent[a].w = (Dot(Cross(n, t), tan2[a]) < 0.0F) ? -1.0F : 1.0F;
      }


    }
  })();


  geometry.lines_builder = new function () {

    this.vertices = new raw.array();


    var xx, yy, zz;
    var xs, ys, zs;

    this.clear = function () {
      this.vertices.clear();
      return this;
    };

    this.add = function (x, y, z) {
      xx = x; yy = y; zz = z;
      this.vertices.push(x);
      this.vertices.push(y);
      this.vertices.push(z);
      return (this);
    };
    this.add2 = function (x1, y1, z1, x2, y2, z2) {
      this.add(x1, y1, z1);
      this.add(x2, y2, z2);
      return (this);
    };
    this.add_to = function (x, y, z) {
      this.add(xx, yy, zz);
      this.add(x, y, z);
      return (this);
    };

    this.move_to = function (x, y, z) {
      xx = x; yy = y; zz = z;
      xs = x; ys = y; zs = z;
      return (this);
    };

    this.close_path = function () {
      this.add(xx, yy, zz);
      this.vertices.push(xs);
      this.vertices.push(ys);
      this.vertices.push(zs);

      return (this);
    };

    this.update_geo = function (g) {
      var a = g.attributes.a_position_rw;
      for (xx = 0; xx < a.data.length; xx++) {
        a.data[xx] = this.vertices.data[xx];
      }
      a.needs_update = true;
    };
    this.build = function () {
      var g = new raw.geometry();

      g.add_attribute("a_position_rw", {
        data: new Float32Array(this.vertices.length),
        item_size: 3
      });


      for (xx = 0; xx < this.vertices.length; xx++) {
        g.attributes.a_position_rw.data[xx] = this.vertices.data[xx];
      }



      g.num_items = this.vertices.length / 3;
      geometry.calc_bounds(g, g.attributes.a_position_rw.data, 3);
      this.clear();
      return (g);
    };

    return (this);
  }
    
  geometry.create = (function () {
    var vertex_size = 0,a=null;
    return function (def) {


      vertex_size = def.vertex_size || 3;
      var g = new raw.geometry();

      if (def.vertices) {
        g.add_attribute("a_position_rw", {
          data: def.vertices,
          item_size: vertex_size
        });
        g.num_items = def.vertices.length / vertex_size;
      }

      if (def.normals) {
        g.add_attribute("a_normal_rw", { data: def.normals });
      }

      if (def.uvs) {
        g.add_attribute("a_uvs_rw", { data: def.uvs, item_size: 2 });
      }

      if (def.colors) {
        g.add_attribute("a_color_rw", { data: def.colors, item_size: 4 });
      }

      if (def.attr) {
        for (a in def.attr) {
          g.add_attribute(a,def.attr[a]);
        }
      }

      raw.geometry.calc_bounds(g, g.attributes.a_position_rw.data, 3);
      return g;
    }
  })();

  geometry.cube = function (options) {
    options = options || {};


    options.size = options.size || 1;
    var width = options.width || options.size;
    var height = options.height || options.size;
    var depth = options.depth;

    if (depth === undefined) depth = options.size;
    var divs = options.divs || 1;

    var divs_x = Math.floor(options.divs_x) || divs;
    var divs_y = Math.floor(options.divs_y) || divs;
    var divs_z = Math.floor(options.divs_z) || divs;

    var vector = raw.math.vec3();
    var segmentWidth, segmentHeight, widthHalf, heightHalf, depthHalf;
    var gridX1, gridY1, vertexCounter, ix, iy, x, y;
    var indices = [];
    var vertices = [];
    var normals = [];
    var uvs = [];
    var numberOfVertices = 0;
    function buildPlane(u, v, w, udir, vdir, width, height, depth, gridX, gridY) {

      segmentWidth = width / gridX;
      segmentHeight = height / gridY;

      widthHalf = width / 2;
      heightHalf = height / 2;
      depthHalf = depth / 2;

      gridX1 = gridX + 1;
      gridY1 = gridY + 1;

      vertexCounter = 0;

      // generate vertices, normals and uvs

      for (iy = 0; iy < gridY1; iy++) {

        y = iy * segmentHeight - heightHalf;

        for (ix = 0; ix < gridX1; ix++) {

          x = ix * segmentWidth - widthHalf;

          vector[u] = x * udir;
          vector[v] = y * vdir;
          vector[w] = depthHalf;

          vertices.push(vector[0], vector[1], vector[2]);

          vector[u] = 0;
          vector[v] = 0;
          vector[w] = depth > 0 ? 1 : - 1;

          normals.push(vector[0], vector[1], vector[2]);

          // uvs

          uvs.push(ix / gridX);
          uvs.push((iy / gridY));

          // counters

          vertexCounter += 1;

        }

      }

      // indices

      // 1. you need three indices to draw a single face
      // 2. a single segment consists of two faces
      // 3. so we need to generate six (2*3) indices per segment

      for (iy = 0; iy < gridY; iy++) {

        for (ix = 0; ix < gridX; ix++) {

          var a = numberOfVertices + ix + gridX1 * iy;
          var b = numberOfVertices + ix + gridX1 * (iy + 1);
          var c = numberOfVertices + (ix + 1) + gridX1 * (iy + 1);
          var d = numberOfVertices + (ix + 1) + gridX1 * iy;

          // faces

          indices.push(a, b, d);
          indices.push(b, c, d);


        }

      }

      numberOfVertices += vertexCounter;

    }


    buildPlane(2, 1, 0, - 1, - 1, depth, height, width, divs_z, divs_y, 0); // px
    buildPlane(2, 1, 0, 1, - 1, depth, height, - width, divs_z, divs_y, 1); // nx
    buildPlane(0, 2, 1, 1, 1, width, depth, height, divs_x, divs_z, 2); // py
    buildPlane(0, 2, 1, 1, - 1, width, depth, - height, divs_x, divs_z, 3); // ny
    buildPlane(0, 1, 2, 1, - 1, width, height, depth, divs_x, divs_y, 4); // pz
    buildPlane(0, 1, 2, - 1, - 1, width, height, - depth, divs_x, divs_y, 5); // nz




    var g = new raw.geometry();

    g.add_attribute("a_position_rw", { data: new Float32Array(vertices) });
    g.add_attribute("a_normal_rw", { data: new Float32Array(normals) });
    g.add_attribute("a_uv_rw", { data: new Float32Array(uvs), item_size: 2 });
    g.add_attribute("a_tangent_rw", { data: new Float32Array(((vertices.length / 3) * 4)), item_size: 4 });
    g.set_indices(indices);
    g.shape_type = "cube";


    raw.geometry.calc_tangents(g);
    raw.geometry.calc_bounds(g, g.attributes.a_position_rw.data, 3);

    return (g);
  };

  geometry.plane = function (options) {
    options = options || {};
    options.size = options.size || 1;

    width = options.width || options.size;
    height = options.height || options.size;
    options.divs = options.divs || 1;
    options.divsX = options.divsX || options.divs;
    options.divsY = options.divsY || options.divs;
    divs_x = options.divsX;
    divs_y = options.divsY;

    var width_half = width / 2;
    var height_half = height / 2;

    var gridX = Math.floor(divs_x);
    var gridY = Math.floor(divs_y);

    var gridX1 = gridX + 1;
    var gridY1 = gridY + 1;

    var segment_width = width / gridX;
    var segment_height = height / gridY;

    var ix, iy;
    var vCount = (divs_x + 1) * (divs_y + 1);
    var g = new raw.geometry();



    g.add_attribute("a_position_rw", { data: new Float32Array(vCount * 3), item_size: 3 });
    var normals = null, uvs = null;
    g.add_attribute("a_normal_rw", { data: new Float32Array(vCount * 3), item_size: 3 });
    normals = g.attributes.a_normal_rw.data;
    g.add_attribute("a_uv_rw", { data: new Float32Array(vCount * 2), item_size: 2 });
    uvs = g.attributes.a_uv_rw.data;
    g.add_attribute("a_tangent_rw", { data: new Float32Array(vCount * 4), item_size: 4 });




    g.index_data = raw.geometry.create_index_data((gridX * gridY) * 6);
    g.index_needs_update = true;
    g.num_items = g.index_data.length;
    g.shape_type = "plane";

    var positions = g.attributes.a_position_rw.data;


    var indices = g.index_data;
    var ii = 0, vi = 0;


    for (iy = 0; iy < gridY1; iy++) {
      var y = iy * segment_height - height_half;
      for (ix = 0; ix < gridX1; ix++) {
        var x = ix * segment_width - width_half;

        positions[(vi * 3) + 0] = x;
        positions[(vi * 3) + 1] = -y;
        positions[(vi * 3) + 2] = 0;

        if (normals !== null) {

          normals[(vi * 3) + 0] = 0;
          normals[(vi * 3) + 1] = 0;
          normals[(vi * 3) + 2] = 1;
        }

        if (uvs !== null) {
          uvs[(vi * 2) + 0] = ix / gridX;
          uvs[(vi * 2) + 1] = 1 - (iy / gridY);
        }


        vi++;
      }

    }
    ii = 0;
    var a, b, c, d;

    for (iy = 0; iy < gridY; iy++) {
      for (ix = 0; ix < gridX; ix++) {
        a = ix + gridX1 * iy;
        b = ix + gridX1 * (iy + 1);
        c = (ix + 1) + gridX1 * (iy + 1);
        d = (ix + 1) + gridX1 * iy;
        // faces
        indices[ii++] = a; indices[ii++] = b; indices[ii++] = d;
        indices[ii++] = b; indices[ii++] = c; indices[ii++] = d;
      }

    }

    raw.geometry.calc_tangents(g);

    raw.geometry.calc_bounds(g, g.attributes.a_position_rw.data, 3);



    return (g);
  };

  geometry.sphere = (function () {
    var norm = raw.math.vec3();
    var vert = raw.math.vec3();
    return function (options) {
      options = options || {};
      options.rad = options.rad || 1;
      options.divs = options.divs || 8;
      options.divsX = options.divsX || options.divs;
      options.divsY = options.divsY || options.divs;


      var radX = options.radX || options.rad;
      var radY = options.radY || options.rad;
      var radZ = options.radZ || options.rad;

      var widthSegments = Math.max(3, Math.floor(options.divsX));
      var heightSegments = Math.max(2, Math.floor(options.divsY));

      var phiStart = options.phiStart !== undefined ? options.phiStart : 0;
      var phiLength = options.phiLength !== undefined ? options.phiLength : Math.PI * 2;

      var thetaStart = options.thetaStart !== undefined ? options.thetaStart : 0;
      var thetaLength = options.thetaLength !== undefined ? options.thetaLength : Math.PI;

      var thetaEnd = thetaStart + thetaLength;

      var ix, iy;

      var index = 0;
      var grid = [];


      var vCount = (widthSegments + 1) * (heightSegments + 1);
      var g = new raw.geometry();


      g.add_attribute("a_position_rw", { data: new Float32Array(vCount * 3), item_size: 3 });
      var normals = null, uvs = null;
      g.add_attribute("a_normal_rw", { data: new Float32Array(vCount * 3), item_size: 3 });
      normals = g.attributes.a_normal_rw.data;

      g.add_attribute("a_uv_rw", { data: new Float32Array(vCount * 2), item_size: 2 });
      uvs = g.attributes.a_uv_rw.data;


      g.add_attribute("a_tangent_rw", { data: new Float32Array(vCount * 4), item_size: 4 });




      g.index_data = raw.geometry.create_index_data(vCount * 6);
      g.num_items = g.index_data.length;
      g.index_needs_update = true;

      g.shape_type = "sphere";
      var positions = g.attributes.a_position_rw.data;


      var indices = g.index_data;
      var ii = 0, vi = 0;



      for (iy = 0; iy <= heightSegments; iy++) {

        var verticesRow = [];

        var v = iy / heightSegments;
        //
        // special case for the poles

        var uOffset = (iy == 0) ? 0.5 / widthSegments : ((iy == heightSegments) ? - 0.5 / widthSegments : 0);

        for (ix = 0; ix <= widthSegments; ix++) {

          var u = ix / widthSegments;

          vert[0] = - radX * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
          vert[1] = radY * Math.cos(thetaStart + v * thetaLength);
          vert[2] = radZ * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);


          positions[(vi * 3) + 0] = vert[0];
          positions[(vi * 3) + 1] = vert[1];
          positions[(vi * 3) + 2] = vert[2];

          if (normals !== null) {
            raw.math.vec3.normalize(norm, vert);
            normals[(vi * 3) + 0] = norm[0];
            normals[(vi * 3) + 1] = norm[1];
            normals[(vi * 3) + 2] = norm[2];
          }

          if (uvs !== null) {
            uvs[(vi * 2) + 0] = u + uOffset;
            uvs[(vi * 2) + 1] = 1 - v;
          }



          vi++;

          verticesRow.push(index++);

        }

        grid.push(verticesRow);

      }
      ii = 0;
      for (iy = 0; iy < heightSegments; iy++) {
        for (ix = 0; ix < widthSegments; ix++) {
          var a = grid[iy][ix + 1];
          var b = grid[iy][ix];
          var c = grid[iy + 1][ix];
          var d = grid[iy + 1][ix + 1];

          if (iy !== 0 || thetaStart > 0) {
            indices[ii++] = a; indices[ii++] = b; indices[ii++] = d;
          }
          if (iy !== heightSegments - 1 || thetaEnd < Math.PI) {
            indices[ii++] = b; indices[ii++] = c; indices[ii++] = d;
          }

        }

      }
      raw.geometry.calc_tangents(g);
      raw.geometry.calc_bounds(g, g.attributes.a_position_rw.data, 3);
      return (g);

    }
  })();


  

  return geometry;

});

raw.geometry.flat_quad = new raw.geometry();

raw.geometry.flat_quad.add_attribute('a_position_rw', {
  item_size: 3, data: new Float32Array([
    -1, -1,0,
    1, -1,0,
    1, 1,0,
    -1, -1,0,
    1, 1,0,
    -1, 1,0
  ])
});
raw.geometry.flat_quad.num_items = 12;
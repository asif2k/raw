raw.rendering = raw.rendering || {};


(function () {

  var glsl = raw.webgl.shader.create_chunks_lib(import('shaders/rendering.glsl'));

  raw.rendering.mesh = raw.define(function (proto, _super) {

    function mesh(def) {
      def = def || {};
      _super.apply(this, [def]);

      this.geometry = def.geometry || null;
      this.material = def.material || null;
      this.draw_offset = 0;
      if (this.geometry !== null) this.draw_count = this.geometry.num_items;
      this.item_type = raw.ITEM_TYPES.MESH;
      this.flags = def.flags || 0;

    }
    proto.update_bounds = function (mat, trans) {
      raw.math.aabb.transform_mat4(this.bounds, this.geometry.aabb, mat);
      this.bounds_sphere = this.geometry.bounds_sphere * trans.scale_world[0];
    };

    return mesh;
  }, raw.rendering.renderable);





  raw.rendering.debug_points = raw.define(function (proto, _super) {
    var mat = new raw.shading.material();

    mat.shader = raw.webgl.shader.parse(glsl["debug-points"] );

    mat.render_mesh = function (renderer, shader, mesh) {
      if (mesh.points_count < 1) return;

      renderer.gl.drawArrays(raw.GL_POINTS, 0, mesh.points_count);
    };


    proto.clear = function () {
      this.points_position.i = 0;
      this.points_count = 0;
    };


    proto.add = (function () {
      var i = 0, _r = 1, _g = 1, _b = 1, _s = 10;
      proto.add_vec3 = function (v, r, g, b, s) {
        _r = r; _g = g; _b = b; _s = s;
        this.add(v[0], v[1], v[2], _r, _g, _b, _s);
      };

      return function (x, y, z, r, g, b, s) {
        _r = r; _g = g; _b = b; _s = s;
        i = this.points_position.i;
        this.points_position.data[i] = x;
        this.points_position.data[i + 1] = y;
        this.points_position.data[i + 2] = z;

        this.points_position.data[i + 3] = r;
        this.points_position.data[i + 4] = g;
        this.points_position.data[i + 5] = b;
        this.points_position.data[i + 6] = s;

        this.points_position.i += 7;

        this.points_position.data_length = this.points_position.i;
        this.points_position.needs_update = true;

        this.points_count = (this.points_position.i / 7);
        this.draw_count = this.points_count;
      }
    })();


    proto.update_bounds = function (mat) { };

    function debug_points(def) {
      def = def || {};
      _super.apply(this, [def]);


      def.max_points = def.max_points || 1000;

      this.geometry = new raw.geometry();

      this.points_position = this.geometry.add_attribute("a_point_position_rw", {
        item_size: 3, data: new Float32Array(def.max_points * 3), stride: 7 * 4
      });
      this.points_color = this.geometry.add_attribute("a_point_color_rw", {
        item_size: 4, stride: 7 * 4, offset: 3 * 4,
      });
      this.points_position.i = 0;
      this.points_count = 0;
      this.material = mat;
      this.draw_offset = 0;
      this.draw_count = this.geometry.num_items;

      this.flags = raw.SHADING.NO_DEPTH_TEST + raw.DISPLAY_ALWAYS;

    }

    return debug_points;
  }, raw.rendering.mesh);





  raw.rendering.debug_lines = raw.define(function (proto, _super) {
    var mat = new raw.shading.material();

    mat.shader = raw.webgl.shader.parse(glsl["debug-lines"] );

    mat.render_mesh = function (renderer, shader, mesh) {
      if (mesh.line_count < 1) return;
      renderer.gl.drawArrays(raw.GL_LINES, 0, mesh.line_count);
    };


    proto.clear = function () {
      this.line_position.i = 0;
      this.line_count = 0;
    };


    proto._add = (function () {
      var i = 0;

      proto.set_color = function (r, g, b) {
        this.color[0] = r;
        this.color[1] = g;
        this.color[2] = b;
        return this;
      }

      proto.add_vec3 = function (v0, v1) {
        this._add(
          v0[0], v0[1], v0[2], this.color[0], this.color[1], this.color[2],
          v1[0], v1[1], v1[2], this.color[0], this.color[1], this.color[2]
        );
        return this;
      };

      proto.add2 = function (x0, y0, z0, x1, y1, z1) {
        this._add(
          x0, y0, z0, this.color[0], this.color[1], this.color[2],
          x1, y1, z1, this.color[0], this.color[1], this.color[2]
        )
      };

      return function (x0, y0, z0, r0, g0, b0, x1, y1, z1, r1, g1, b1) {
        i = this.line_position.i;
        this.line_position.data[i] = x0;
        this.line_position.data[i + 1] = y0;
        this.line_position.data[i + 2] = z0;

        this.line_position.data[i + 3] = r0;
        this.line_position.data[i + 4] = g0;
        this.line_position.data[i + 5] = b0;

        this.line_position.data[i + 6] = x1;
        this.line_position.data[i + 7] = y1;
        this.line_position.data[i + 8] = z1;

        this.line_position.data[i + 9] = r1;
        this.line_position.data[i + 10] = g1;
        this.line_position.data[i + 11] = b1;

        this.line_position.i += 12;

        this.line_position.data_length = this.line_position.i;
        this.line_position.needs_update = true;

        this.line_count = (this.line_position.i / 6);
        this.draw_count = this.line_count;
      }
    })();


    proto.update_bounds = function (mat) { };

    function debug_lines(def) {
      def = def || {};
      _super.apply(this, [def]);


      def.max_lines = def.max_lines || 1000;

      this.geometry = new raw.geometry();

      this.line_position = this.geometry.add_attribute("a_line_position_rw", {
        item_size: 3, data: new Float32Array(def.max_lines * 3 * 2), stride: 6 * 4
      });
      this.line_color = this.geometry.add_attribute("a_line_color_rw", {
        item_size: 3, stride: 6 * 4, offset: 3 * 4,
      });
      this.line_position.i = 0;
      this.line_count = 0;
      this.material = mat;
      this.draw_offset = 0;
      this.draw_count = this.geometry.num_items;
      this.color = [1, 1, 1];
      this.flags = raw.DISPLAY_ALWAYS;

    }

    return debug_lines;
  }, raw.rendering.mesh);





  raw.rendering.debug_aabbs = raw.define(function (proto, _super) {
    var mat = new raw.shading.material();

    mat.shader = raw.webgl.shader.parse(glsl["debug-aabbs"]);

    mat.render_mesh = function (renderer, shader, mesh) {
      if (mesh.boxes_count < 1) return;
      renderer.gl.disable(raw.GL_DEPTH_TEST);
      renderer.gl.ANGLE_instanced_arrays.drawArraysInstancedANGLE(raw.GL_LINES, 0, mesh.geometry.num_items, mesh.boxes_count);

    };


    proto.update_bounds = function (mat) { };

    proto.clear = function () {
      this.di = 0;
      this.boxes_count = 0;
    };


    proto.add_aabb = (function () {
      var x, y, z, sx, sy, sz
      return function (b) {
        sx = b[3] - b[0];
        sy = b[4] - b[1];
        sz = b[5] - b[2];
        x = b[0] + sx * 0.5;
        y = b[1] + sy * 0.5;
        z = b[2] + sz * 0.5;

        this.add(x, y, z, sx, sy, sz);
      }
    })();
    proto.add = (function () {
      var i = 0;
      return function (x, y, z, sx, sy, sz) {
        i = this.di;
        this.boxes_position.data[i] = x;
        this.boxes_position.data[i + 1] = y;
        this.boxes_position.data[i + 2] = z;

        this.boxes_size.data[i] = sx;
        this.boxes_size.data[i + 1] = sy;
        this.boxes_size.data[i + 2] = sz;

        this.boxes_color.data[i] = 1;
        this.boxes_color.data[i + 1] = 0;
        this.boxes_color.data[i + 2] = 0;

        this.di += 3;

        this.boxes_position.data_length = this.di;
        this.boxes_position.needs_update = true;

        this.boxes_size.data_length = this.di;
        this.boxes_size.needs_update = true;

        this.boxes_color.data_length = this.di;
        this.boxes_color.needs_update = true;
        this.boxes_count = this.di / 3;
      }
    })();

    function debug_aabbs(def) {
      def = def || {};
      _super.apply(this, [def]);
      def.max_boxes = def.max_boxes || 1000;
      var geo = raw.rendering.debug_aabbs.get_lines_geometry();

      this.boxes_position = geo.add_attribute("a_box_position_rw", {
        item_size: 3, data: new Float32Array(def.max_boxes * 3), divisor: 1,
      });
      this.boxes_size = geo.add_attribute("a_box_size_rw", {
        item_size: 3, data: new Float32Array(def.max_boxes * 3), divisor: 1,
      });

      this.boxes_color = geo.add_attribute("a_box_color_rw", {
        item_size: 3, data: new Float32Array(def.max_boxes * 3), divisor: 1,
      });

      this.geometry = geo;
      this.material = mat;

      this.max_boxes = 0;
      this.di = 0;
      this.box_color = [0.5, 0.5, 0.5];

      this.flags = raw.SHADING.NO_DEPTH_TEST + raw.DISPLAY_ALWAYS;
      return (this);


    }
    debug_aabbs.get_lines_geometry = function () {
      var b = raw.geometry.lines_builder;
      b.clear();
      b.move_to(-0.5, -0.5, -0.5)
        .add_to(0.5, -0.5, -0.5)
        .add_to(0.5, 0.5, -0.5)
        .add_to(-0.5, 0.5, -0.5)
        .add_to(-0.5, -0.5, -0.5);

      b.move_to(-0.5, -0.5, -0.5).add_to(-0.5, -0.5, 0.5);
      b.move_to(0.5, -0.5, -0.5).add_to(0.5, -0.5, 0.5);

      b.move_to(-0.5, 0.5, -0.5).add_to(-0.5, 0.5, 0.5);
      b.move_to(0.5, 0.5, -0.5).add_to(0.5, 0.5, 0.5);

      b.move_to(-0.5, -0.5, 0.5)
        .add_to(0.5, -0.5, 0.5)
        .add_to(0.5, 0.5, 0.5)
        .add_to(-0.5, 0.5, 0.5)
        .add_to(-0.5, -0.5, 0.5);

      return b.build();
    }


    return debug_aabbs;
  }, raw.rendering.mesh);





  raw.rendering.transforms_manipulator = raw.define(function (proto, _super) {
    var mat = new raw.shading.material();

    mat.set_flag(raw.SHADING.PICKABLE + raw.SHADING.TRANSPARENT);
    // + raw.SHADING.TRANSPARENT

    mat.shader = raw.webgl.shader.parse(glsl["transforms-manipulator"]);

    // mat.shader.pickable = mat.shader;

    var geo = raw.geometry.sphere({ rad: 1 });
    var i = 0, trans = null;
    var u_marker_color = raw.math.vec4(1, 0, 0, 0.45);
    mat.render_mesh = function (renderer, shader, mesh) {

      if (renderer.pickables_pass) {

      }
      // renderer.gl.enable(raw.GL_CULL_FACE);
      renderer.gl.disable(raw.GL_DEPTH_TEST);
      renderer.activate_geometry_index_buffer(mesh.geometry, false);
      for (i = 0; i < mesh.transforms.length; i++) {
        trans = mesh.transforms[i];
        if (trans[2] === -1) {
          trans[2] = renderer.create_picking_color_id();
        }
        if (!renderer.pickables_pass && !trans[3]) {
          continue;
        }


        renderer.set_picking_color_id(trans[2]);
        if (mesh.active_picking_color_id === trans[2]) {
          u_marker_color[1] = 0.5;
        }
        else {
          u_marker_color[1] = 0;
        }

        shader.set_uniform("u_marker_color", u_marker_color);

        shader.set_uniform("u_trans_position", trans[0].position_world);
        shader.set_uniform("u_trans_size", trans[1]);
        renderer.gl.drawElements(4, geo.num_items, raw.GL_UNSIGNED_INT, 0);
      }

      renderer.gl.enable(raw.GL_DEPTH_TEST);
      //mesh.active_picking_color_id = 0;

    };

    proto.update_bounds = function (mat) { };
    proto.add = function (trans, size, show_tracker) {
      show_tracker = show_tracker || false
      if (trans.position_world) {
        this.transforms.push([trans, size, -1, show_tracker]);
      }
      else {
        this.transforms.push([{ position_world: trans }, size, -1, show_tracker]);
      }

    }


    var pos = [0, 0, 0], inv_rot = [0, 0, 0, 0];
    proto.drag_item = function (picking_color_id, drag_dir, drag_mag) {
      this.active_picking_color_id = 0;
      this.active_item = null;
      for (i = 0; i < this.transforms.length; i++) {
        trans = this.transforms[i];
        if (trans[2] === picking_color_id) {
          this.active_picking_color_id = picking_color_id;
          raw.math.vec3.scale(pos, drag_dir, drag_mag);
          if (trans[0].rotation_world) {
            raw.math.quat.invert(inv_rot, trans[0].rotation_world);
            raw.math.vec3.transform_quat(pos, pos, inv_rot);
            raw.math.vec3.add(trans[0].position, trans[0].position, pos);
            trans[0].require_update = 1;
          }
          else {
            raw.math.vec3.add(trans[0].position_world, trans[0].position_world, pos);
          }

          this.active_item = trans[0];
          return true;
        }
      }
      return false;
    }

    function transforms_manipulator(def) {
      def = def || {};
      _super.apply(this, [def]);
      this.flags = raw.DISPLAY_ALWAYS;
      this.geometry = geo;
      this.material = mat;
      this.transforms = [];
      this.active_item = null;
    }

    return transforms_manipulator;
  }, raw.rendering.mesh);
})();

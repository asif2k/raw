(function () {

  var glsl = raw.webgl.shader.create_chunks_lib(import('shaders/shading.glsl'));

  raw.shading.material = raw.define(function (proto, _super) {
    function material(parameters) {
      _super.apply(this, arguments);
      parameters = parameters || {};
      this.uuid = raw.guidi();

      this.object_material = new Float32Array(16);
      this.ambient = new Float32Array(this.object_material.buffer, 0, 4);
      this.diffuse = new Float32Array(this.object_material.buffer, 4 * 4, 4);
      this.specular = new Float32Array(this.object_material.buffer, 8 * 4, 4);

      this.texture = parameters.texture || null;

      raw.math.vec3.copy(this.ambient, parameters.ambient || [0.5, 0.5, 0.5]);
      raw.math.vec3.copy(this.diffuse, parameters.diffuse || [0.5, 0.5, 0.5]);
      raw.math.vec3.copy(this.specular, parameters.specular || [0.863, 0.863, 0.863]);

      this.ambient[3] = 1;

      this.texture_matrix = raw.math.mat3();

      this.instances_count = -1;
      this.wireframe = parameters.wireframe || false;
      this.set_flag(raw.SHADING.FLAT);
      if (parameters.flags) this.set_flag(parameters.flags);
      this.shader = raw.shading.material.shader;
      this.draw_type = raw.GL_TRIANGLES;
      if (parameters.draw_type !== undefined) {
        this.draw_type = parameters.draw_type;
      }

      this.on_before_render = new raw.event(this);
      this.on_after_render = new raw.event(this);
      this.draw_elements = false;

      if (parameters.transparent !== undefined) {
        this.set_tansparency(parameters.transparent);
      }

    }

    material.shader = raw.webgl.shader.parse(glsl["flat-material"]);


    proto.set_tansparency = function (v) {
      this.ambient[3] = Math.min(v, 1);
      if (v < 1) this.set_flag(raw.SHADING.TRANSPARENT);
      else this.unset_flag(raw.SHADING.TRANSPARENT);
      return (this);
    };
    proto.set_shinness = function (shin) {
      this.specular[3] = shin;
      return (this);
    };

    proto.depth_and_cull = function (renderer) {
      if (this.flags & raw.SHADING.NO_DEPTH_TEST) {
        renderer.gl.disable(raw.GL_DEPTH_TEST);
      }
      else {
        renderer.gl.enable(raw.GL_DEPTH_TEST);
      }


      if ((this.flags & raw.SHADING.DOUBLE_SIDES) !== 0) {
        renderer.gl.disable(raw.GL_CULL_FACE);
      }
      else {
        renderer.gl.enable(raw.GL_CULL_FACE);
      }
    };

    proto.render_mesh = (function () {
      var eparams = [null, null, null]

      proto.complete_render_mesh = function (renderer, shader, mesh) {
        if (this.instances_count > -1) {
          if (this.instances_count > 0) {
            if (this.draw_elements) {
              renderer.gl.ANGLE_instanced_arrays.drawElementsInstancedANGLE(this.final_draw_type, this.final_draw_count, raw.GL_UNSIGNED_INT, mesh.draw_offset, this.instances_count);
            }
            else {
              renderer.gl.ANGLE_instanced_arrays.drawArraysInstancedANGLE(this.final_draw_type, mesh.draw_offset, this.final_draw_count, this.instances_count);
            }
          }
        }
        else {
          if (this.draw_elements) {
            renderer.gl.drawElements(this.final_draw_type, this.final_draw_count, raw.GL_UNSIGNED_INT, mesh.draw_offset);
          }
          else {

            renderer.gl.drawArrays(this.final_draw_type, mesh.draw_offset, this.final_draw_count);
          }
        }
      };
      return function (renderer, shader, mesh) {

        eparams[0] = renderer;
        eparams[1] = shader;
        eparams[2] = mesh;

        if (renderer.on_error) {
          return;
        }
        if (this.flags & raw.SHADING.NO_DEPTH_TEST) {
          renderer.gl.disable(raw.GL_DEPTH_TEST);
        }
        else {
          renderer.gl.enable(raw.GL_DEPTH_TEST);
        }


        if ((this.flags & raw.SHADING.DOUBLE_SIDES) !== 0) {
          renderer.gl.disable(raw.GL_CULL_FACE);
        }
        else {
          renderer.gl.enable(raw.GL_CULL_FACE);
        }


        shader.set_uniform("u_object_material_rw", this.object_material);
        shader.set_uniform("u_texture_matrix_rw", this.texture_matrix);
        shader.set_uniform("u_texture_rw", 0);
        renderer.use_texture(this.texture, 0);



        this.final_draw_type = this.wireframe ? raw.GL_LINES : this.draw_type;
        this.final_draw_count = mesh.draw_count;


        this.draw_elements = renderer.activate_geometry_index_buffer(mesh.geometry, this.wireframe);

        if (this.wireframe) this.final_draw_count *= 2;

        this.on_before_render.trigger(eparams);

        this.complete_render_mesh(renderer, shader, mesh);

        this.on_after_render.trigger(eparams);




      }
    })();

    return material;
  }, raw.flags_setting);


  raw.shading.shaded_material = raw.define(function (proto, _super) {

    function shaded_material(def) {
      def = def || {};
      _super.apply(this, [def]);
      this.shader = raw.shading.shaded_material.shader;
      this.flags = raw.SHADING.SHADED;
      this.light_pass_limit = 1000;
      this.lights_count = -1;
      this.set_shinness(def.shinness || 100);
      if (def.transparent !== undefined) {
        this.set_tansparency(def.transparent);
      }
      if (def.cast_shadows) {
        this.flags += raw.SHADING.CAST_SHADOW
      };

      if (def.receive_shadows) {
        this.flags += raw.SHADING.RECEIVE_SHADOW
      };

      return (this);

    }

    shaded_material.shader = raw.webgl.shader.parse(glsl["shaded-material"]);


    return shaded_material;
  }, raw.shading.material);

})();


(function () {
  raw.shading.light = raw.define(function (proto, _super) {

    proto.update_bounds = function (mat, trans) {
      if (this.light_type > -1) {
        r = this.range * 0.25;
        p = this.world_position;

        this.bounds[0] = p[0];
        this.bounds[1] = p[1];
        this.bounds[2] = p[2];
        this.bounds[3] = p[0];
        this.bounds[4] = p[1];
        this.bounds[5] = p[2];

        minx = p[0] - r;
        miny = p[1] - r;
        minz = p[2] - r;

        maxx = p[0] + r;
        maxy = p[1] + r;
        maxz = p[2] + r;


        this.expand_bounds(minx, miny, minz);
        this.expand_bounds(minx, miny, maxz);
        this.expand_bounds(minx, maxy, minz);
        this.expand_bounds(minx, maxy, maxz);

        this.expand_bounds(maxx, miny, minz);
        this.expand_bounds(maxx, miny, maxz);
        this.expand_bounds(maxx, maxy, minz);
        this.expand_bounds(maxx, maxy, maxz);

      }
    };
    proto.set_intensity = function (v) {
      this.ambient[3] = v;
      return (this);
    };

    function light(def) {
      def = def || {};
      _super.apply(this, [def]);
      this.light_material = new Float32Array(16);
      this.ambient = new Float32Array(this.light_material.buffer, 0, 4);
      this.diffuse = new Float32Array(this.light_material.buffer, 4 * 4, 4);
      this.specular = new Float32Array(this.light_material.buffer, 8 * 4, 4);
      this.attenuation = new Float32Array(this.light_material.buffer, 12 * 4, 4);

      this.diffuse[3] = -1;
      this.specular[3] = -1;
      this.range = 20000;
      this.light_type = 0;
      this.item_type = raw.ITEM_TYPES.LIGHT;


      raw.math.vec4.copy(this.ambient, def.ambient || [0.89, 0.89, 0.89, 1.0]);
      raw.math.vec4.copy(this.diffuse, def.diffuse || [0.87, 0.87, 0.87, -1]);
      raw.math.vec4.copy(this.specular, def.specular || [0.85, 0.85, 0.85, -1]);
      raw.math.vec4.copy(this.attenuation, def.attenuation || [0, 0, 0, 0]);

      this.cast_shadows = def.cast_shadows || false;
      this.shadow_bias = def.shadow_bias || 0.00000001;
      this.shadow_opacity = def.shadow_opacity || 0.5;
      this.shadow_map_size = def.shadow_map_size || 1024;
      this.shadow_camera_distance = def.shadow_camera_distance || 30;


    }

    return light;
  }, raw.rendering.renderable);

})();



(function () {

  var glsl = raw.webgl.shader.create_chunks_lib(import('shaders/post_process.glsl'));

  raw.shading.post_process = raw.define(function (proto) {

    function post_process(shader) {
      this.guid = raw.guidi();
      this.shader = shader || raw.shading.post_process.shader;
      if (!this.on_apply) {
        this.on_apply = null;
      }
      this.enabled = true;
    }

    post_process.shader = raw.webgl.shader.parse(glsl["default"]);
    proto.resize = function (width, height) { }
    proto.bind_output = function (renderer, output) {
      if (output === null) {
        renderer.gl.bindFramebuffer(raw.GL_FRAMEBUFFER, null);
        renderer.gl.viewport(0, 0, renderer.gl.canvas.width, renderer.gl.canvas.height);
      }
      else {
        output.bind();
      }
    }

    var on_apply_params = [null, null, null];
    proto.apply = function (renderer, input, output) {
      renderer.use_shader(this.shader);
      this.bind_output(renderer, output);
      if (this.on_apply !== null) {
        on_apply_params[0] = renderer;
        on_apply_params[1] = input;
        on_apply_params[2] = output;
        input = this.on_apply.apply(this, on_apply_params);

      }
      if (this.shader.set_uniform("u_texture_input_rw", 0)) {
        renderer.use_direct_texture(input, 0);
      }

      renderer.draw_full_quad();
    }

    proto.on_apply = function (renderer, input, output) {
      return input;
    };

    return post_process;
  });

  raw.shading.post_process.picture_adjustment = raw.define(function (proto, _super) {

    function picture_adjustment(params) {
      params = params || {};
      _super.apply(this);
      this.shader = raw.post_process.picture_adjustment.shader;
      this.gamma = 1;
      this.contrast = 1;
      this.saturation = 1;
      this.brightness = 3;
      this.red = 1;
      this.green = 1;
      this.blue = 1;
      this.alpha = 1;
      raw.merge_object(params, this);

    }


    picture_adjustment.shader = raw.shading.post_process.shader.extend(glsl["picture-adjustment"]);

    var u_pa_params = raw.math.mat3();
    proto.on_apply = function (renderer, input, output) {
      u_pa_params[0] = this.gamma;
      u_pa_params[1] = this.contrast;
      u_pa_params[2] = this.saturation;
      u_pa_params[3] = this.brightness;
      u_pa_params[4] = this.red;
      u_pa_params[5] = this.green;
      u_pa_params[6] = this.blue;
      u_pa_params[7] = this.alpha;


      this.shader.set_uniform("u_pa_params", u_pa_params);
      return input;
    };

    return picture_adjustment;

  }, raw.shading.post_process);


  raw.shading.post_process.fxaa = raw.define(function (proto, _super) {


    function fxaa(params) {
      params = params || {};
      _super.apply(this);
      this.shader = raw.shading.post_process.fxaa.shader;
      this.span_max = 16;
      this.reduce_min = (1 / 256);
      this.reduce_mul = (1 / 8);
      this.enabled = false;
      raw.merge_object(params, this);

    }



    fxaa.shader = raw.shading.post_process.shader.extend(glsl["fxaa"]);


    var u_inverse_filter_texture_size = raw.math.vec3();
    var u_fxaa_params = raw.math.vec3();

    proto.on_apply = function (renderer, input, output) {
      u_inverse_filter_texture_size[0] = 1 / input.width;
      u_inverse_filter_texture_size[1] = 1 / input.height;
      this.shader.set_uniform("u_inverse_filter_texture_size", u_inverse_filter_texture_size);

      u_fxaa_params[0] = this.span_max;
      u_fxaa_params[1] = this.reduce_min;
      u_fxaa_params[2] = this.reduce_mul;

      this.shader.set_uniform("u_fxaa_params", u_fxaa_params);

      return input;
    };

    return fxaa;


  }, raw.shading.post_process);
})();


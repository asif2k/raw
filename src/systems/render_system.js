
raw.ecs.register_system("render_system", raw.define(function (proto, _super) {

  var glsl = raw.webgl.shader.create_chunks_lib(import('systems/render_system.glsl'));

  function setup_gl_state(gl) {
    gl.states = {
      depthMask: false, blendFunc0: -1, blendFunc1: -1, framebuffer: undefined,      
    };
    gl.states_flags = new Uint8Array(1024 * 64);


    var pm1 = [null];
    var pm2 = [null, null];

    gl.enable = (function (_super, gl) {
      return function (state) {
        if (gl.states_flags[state] === 1) return (false);
        gl.states_flags[state] = 1;
        pm1[0] = state;
        _super.apply(gl, pm1);
        return (true);
      }
    })(gl.enable, gl);

    gl.disable = (function (_super, gl) {
      return function (state) {
        if (gl.states_flags[state] === 0) return (false);
        gl.states_flags[state] = 0;
        pm1[0] = state;
        _super.apply(gl, pm1);
        return (true);
      }
    })(gl.disable, gl);

    gl.blendFunc = (function (_super, gl) {
      return function (func0, func1) {
        if (gl.states.blendFunc0 !== func0 || gl.states.blendFunc1 !== func1) {
          gl.states.blendFunc0 = func0;
          gl.states.blendFunc1 = func1;
          pm2[0] = func0;
          pm2[1] = func1;
          _super.apply(gl, pm2);
          return (true);
        }
        return (false);
      }
    })(gl.blendFunc, gl);

    gl.blendEquation = (function (_super, gl) {
      return function (param) {
        if (gl.states.blendEQuation !== param) {
          gl.states.blendEQuation = param;
          pm1[0] = param;
          _super.apply(gl, pm1);
        }
      }
    })(gl.blendEquation, gl);

    gl.depthMask = (function (_super, gl) {
      return function (mask) {
        if (mask !== gl.states.depthMask) {
          gl.states.depthMask = mask;
          pm1[0] = mask;
          _super.apply(gl, pm1);
        }
      }
    })(gl.depthMask, gl);

    gl.depthFunc = (function (_super, gl) {
      return function (func) {
        if (func !== gl.states.depthFunc) {
          gl.states.depthFunc = func;
          pm1[0] = func;
          _super.apply(gl, pm1);
        }
      }
    })(gl.depthFunc, gl);

    gl.cullFace = (function (_super, gl) {
      return function (param) {
        if (param !== gl.states.cullFace) {
          gl.states.cullFace = param;
          pm1[0] = param;
          _super.apply(gl, pm1);
        }
      }
    })(gl.cullFace, gl);

    gl.bindFramebuffer = (function (_super, gl) {
      return function (param0, param1) {
        if (param1 !== gl.states.framebuffer) {
          gl.states.framebuffer = param1;
          pm2[0] = param0;
          pm2[1] = param1;
          _super.apply(gl, pm2);
          return true;
        }
        return false;
      }
    })(gl.bindFramebuffer, gl);

  }

  function render_system(parameters) {
    _super.apply(this, [parameters]);

    parameters = parameters || {};
    var _canvas = parameters.canvas
    if (!_canvas) {
      _canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
      _canvas.setAttribute("style", "position:absolute;width:100%;height:100%;left:0;top:0;box-sizing: border-box;");
    }

    this.priority = 5000;

    parameters = raw.merge_object(parameters, {
      alpha: false, depth: true, stencil: false,
      antialias: false, premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    var gl = parameters.context || _canvas.getContext('webgl', parameters
    );

    this.shader_parameters = {
      fws_num_lights: parameters.lights_count_per_pass || 4
    };

    if (gl === null) {
      if (_canvas.getContext('webgl') !== null) {
        throw new Error('Error creating WebGL context with your selected attributes.');
      } else {
        throw new Error('Error creating WebGL context.');
      }
    }

    gl.pixel_ratio = parameters.pixel_ratio || window.devicePixelRatio;

    _canvas.addEventListener('webglcontextlost', function () {
      console.log('webglcontextlost', this);
    }, false);

    _canvas.addEventListener('webglcontextrestored', function () {
      console.log('webglcontextrestored', this);
    }, false);


    gl.OES_vertex_array_object = gl.getExtension("OES_vertex_array_object");
    gl.OES_standard_derivatives = gl.getExtension("OES_standard_derivatives");
    gl.WEBGL_depth_texture = gl.getExtension('WEBGL_depth_texture');
    gl.ANGLE_instanced_arrays = gl.getExtension('ANGLE_instanced_arrays');
    gl.OES_element_index_uint = gl.getExtension('OES_element_index_uint');
    setup_gl_state(gl);

    this.render_target1 = new raw.webgl.render_target(gl, 10, 10);
    this.render_target1.attach_color(true).attach_depth_buffer();
    this.render_target1.clear_buffer = false;



    this.default_render_target = this.render_target1;

    this.render_target2 = new raw.webgl.render_target(gl, 10, 10);
    this.render_target2.attach_color().attach_depth_buffer();
    this.render_target2.clear_buffer = false;

    this.render_target1.swap = this.render_target2;
    this.render_target2.swap = this.render_target1;



    // this.default_render_target = null;

    console.log("parameters", parameters);
    if (parameters.show_debug_canvas) {
      this.debug_canvas = new
        raw.webgl.canvas_texture(parameters.debug_canvas_width || 512, parameters.debug_canvas_height || 512);
      this.show_debug_canvas = true;

    }

    this.post_processes = [new raw.shading.post_process.fxaa()];
    this.render_targets = [];
    // this.post_processes.length = 0;

    this.texture_slots = [-1, -1, -1, -1, -1, -1 - 1, -1, -1, -1];
    this.texture_updates = new raw.array();
    this.default_texture = new raw.webgl.texture();
    this.default_texture.needs_update = true;
    raw.webgl.texture.update(gl, this.default_texture);
    console.log('this.default_texture', this.default_texture.gl_texture);

    this.u_timer_rw = raw.math.vec3();
    gl.enable(raw.GL_DEPTH_TEST);
    gl.cullFace(raw.GL_BACK);
    gl.enable(raw.GL_CULL_FACE);
    gl.clearColor(0, 0, 0, 1);

    this.gl = gl;

    this.active_shader = null;

    this.last_shader_id = -1;

    this.full_quad = raw.webgl.buffers.get(gl);
    gl.bindBuffer(raw.GL_ARRAY_BUFFER, this.full_quad);
    gl.bufferData(raw.GL_ARRAY_BUFFER, new Float32Array([
      -1, -1,
      1, -1,
      1, 1,
      -1, -1,
      1, 1,
      -1, 1,
    ]), raw.GL_STATIC_DRAW, 0, 12);


    this.fws_num_lights = this.shader_parameters.fws_num_lights;
    this.shading_lights = [];
    for (var i = 0; i < this.shader_parameters.fws_num_lights; i++) {
      this.shading_lights[i] = null;
    }


    this.light_pass_count = 0;
    this.lights_batch_size = 0;

    this.render_version = 0;
    this.enable_pickables = false;
    this.pickables_pass = false;
    this.picking_color_id = 980;
    this.active_camera = null;

    this.default_color_attribute = {
      name: "a_color_rw",
      item_size: 4,
      data: new Float32Array(100000 * 4)
    };



    this.default_color_attribute.data.fill(1);
    this.is_renderer = true;
    this.active_camera = null;

    this.fog_params = raw.math.vec3(0, 0, 0);
    this.fog_color =raw.math.vec4(0.165, 0.165, 0.165, 0.001);

  }
  proto.update_debug_canvas = function () {
    this.debug_canvas.needs_update = true;
  }

  proto.set_canvas_size = (function () {
    var i = 0;
    return function (width, height) {
      this.gl.canvas.width = width * this.gl.pixel_ratio;
      this.gl.canvas.height = height * this.gl.pixel_ratio;
      this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

      this.render_target1.resize(this.gl.canvas.width, this.gl.canvas.height);
      this.render_target2.resize(this.gl.canvas.width, this.gl.canvas.height);

      for (i = 0; i < this.post_processes.length; i++) {
        this.post_processes[i].resize(this.gl.canvas.width, this.gl.canvas.height);
      }

      for (i = 0; i < this.render_targets.length; i++) {
        this.render_targets[i].resize(this.gl.canvas.width, this.gl.canvas.height);
      }
    }
  })();


  proto.clear_screen = function () {
    this.gl.clear(raw.GL_COLOR_BUFFER_BIT | raw.GL_DEPTH_BUFFER_BIT);
    return (this);
  };

  proto.set_default_viewport = function () {
    if (this.default_render_target === null) {
      if (this.gl.bindFramebuffer(raw.GL_FRAMEBUFFER, null)) {
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
      }

    }
    else {
      this.default_render_target.bind();
    }
    return (this)
  };


  proto.use_geometry = (function () {
    var return_value = 0, shader = null, i = 0, att = null, gl = null;

    proto.activate_geometry_index_buffer = (function () {
      var i, ii, a, b, c;
      function update_wireframe_indices(g) {
        if (g.index_buffer !== null) {
          if (!g.w_index_data) {
            g.w_index_data = raw.geometry.create_index_data(g.index_data.length * 2);
          } else if (g.w_index_data.length < g.index_data.length * 2) {
            g.w_index_data = raw.geometry.create_index_data(g.index_data.length * 2);
          }
          ii = 0;
          for (i = 0; i < g.index_data.length; i += 3) {
            a = g.index_data[i + 0];
            b = g.index_data[i + 1];
            c = g.index_data[i + 2];
            g.w_index_data[ii] = a;
            g.w_index_data[ii + 1] = b;
            g.w_index_data[ii + 2] = b;
            g.w_index_data[ii + 3] = c;
            g.w_index_data[ii + 4] = c;
            g.w_index_data[ii + 5] = a;
            ii += 6;
          }
        }
      }


      proto.reset_wireframe_index_buffer = function (gl, vert_count) {
        var indices = [];
        indices.length = 0;
        for (i = 0; i < (vert_count) - 1; i += 3) {
          a = i + 0;
          b = i + 1;
          c = i + 2;

          ii = indices.length;
          indices[ii] = a;
          indices[ii + 1] = b;
          indices[ii + 2] = b;
          indices[ii + 3] = c;
          indices[ii + 4] = c;
          indices[ii + 5] = a;



        }
        if (!this.wireframe_index_buffer) {
          this.wireframe_index_buffer = raw.webgl.buffers.get(gl);
        }

        gl.bindBuffer(raw.GL_ELEMENT_ARRAY_BUFFER, this.wireframe_index_buffer);
        gl.bufferData(raw.GL_ELEMENT_ARRAY_BUFFER, raw.geometry.create_index_data(indices), raw.GL_DYNAMIC_DRAW);
        indices.length = 0;
      };

      proto.bind_default_wireframe_indices = function () {
        if (!this.wireframe_index_buffer) {
          this.reset_wireframe_index_buffer(gl, 100000 * 10);
          this.compile_attribute(this.default_color_attribute);
        }
        this.gl.bindBuffer(raw.GL_ELEMENT_ARRAY_BUFFER, this.wireframe_index_buffer);
      };

      return function (geo, is_wireframe) {
        gl = this.gl;
        if (geo.index_data) {

          if (geo.index_needs_update) {
            if (geo.index_buffer === null) geo.index_buffer = raw.webgl.buffers.get(gl);
            gl.bindBuffer(raw.GL_ELEMENT_ARRAY_BUFFER, geo.index_buffer);
            gl.bufferData(raw.GL_ELEMENT_ARRAY_BUFFER, geo.index_data, raw.GL_DYNAMIC_DRAW);
          }


          if (is_wireframe) {
            if (geo.index_needs_update || !geo.w_index_data) {
              update_wireframe_indices(geo);
              if (!geo.w_index_buffer) geo.w_index_buffer = raw.webgl.buffers.get(gl);
              gl.bindBuffer(raw.GL_ELEMENT_ARRAY_BUFFER, geo.w_index_buffer);
              gl.bufferData(raw.GL_ELEMENT_ARRAY_BUFFER, geo.w_index_data, raw.GL_DYNAMIC_DRAW);
            }
            else
              gl.bindBuffer(raw.GL_ELEMENT_ARRAY_BUFFER, geo.w_index_buffer);
          }
          else {
            gl.bindBuffer(raw.GL_ELEMENT_ARRAY_BUFFER, geo.index_buffer);
          }
          geo.index_needs_update = false;
          return true;
        }
        else if (is_wireframe) {
          gl.bindBuffer(raw.GL_ELEMENT_ARRAY_BUFFER, this.wireframe_index_buffer);
          return true;
        }

        return false;

      }

    })();


    proto.update_geomerty_attribute = function (location, att) {
      return_value = 0;
      if (att === null) {
        this.gl.disableVertexAttribArray(location);
        return_value = -1;
      }
      else {
        this.gl.enableVertexAttribArray(location);

        if (att.needs_update === true) {
          if (att.buffer === null) {
            att.buffer = raw.gl_buffers.get(this.gl);
          }
          this.gl.bindBuffer(raw.GL_ARRAY_BUFFER, att.buffer);
          this.gl.bufferData(raw.GL_ARRAY_BUFFER, att.data, att.buffer_type, att.data_offset, att.data_length);
          return_value = 1;
          att.version+=0.00001;
          att.needs_update = false;
        }
        else if (att.buffer !== null) {
          this.gl.bindBuffer(raw.GL_ARRAY_BUFFER, att.buffer);
        }
        this.gl.vertexAttribPointer(location, att.item_size, att.data_type, false, att.stride, att.offset);
        this.gl.ANGLE_instanced_arrays.vertexAttribDivisorANGLE(location, att.divisor);




      }

      return return_value
    }

    proto.compile_geometry = (function () {
      proto.compile_attribute = function (att) {
        if (att.compiled) return;
        att.stride = att.stride || 0;
        att.offset = att.offset || 0;
        att.needs_update = att.needs_update || false;
        att.array = att.array || null;
        att.data_type = att.data_type || raw.GL_FLOAT;
        att.buffer_type = att.buffer_type || raw.GL_STATIC_DRAW;
        att.version = att.version || 1;

        att.divisor = att.divisor || 0;
        att.array = att.array || null;
        att.data_offset = att.data_offset || 0;
        att.data_length = att.data_length || 0;

        if (att.data) {
          att.data_length = att.data.length;
          if (att.buffer === null || att.buffer === undefined) att.buffer = raw.webgl.buffers.get(this.gl);

          this.gl.bindBuffer(raw.GL_ARRAY_BUFFER, att.buffer);
          this.gl.bufferData(raw.GL_ARRAY_BUFFER, att.data, att.buffer_type, att.data_offset, att.data_length);
        }
        att.compiled = true;
        return (att);
      }

      proto.use_geometry_attribute = function (location, att) {
        this.compile_attribute(att);

        this.update_geomerty_attribute(location, att);
      };


      return function (gl, geo) {
        if (geo.compiled) return;

        if (!this.wireframe_index_buffer) {
          this.reset_wireframe_index_buffer(gl, 100000 * 10);
          this.compile_attribute(this.default_color_attribute);
        }



        for (aid in geo.attributes) {
          this.compile_attribute(geo.attributes[aid]);
        }

        geo.attributes.a_color_rw = geo.attributes.a_color_rw || this.default_color_attribute;

        if (geo.index_data) {

          if (geo.index_buffer === null) geo.index_buffer = raw.webgl.buffers.get(gl);
          gl.bindBuffer(raw.GL_ELEMENT_ARRAY_BUFFER, geo.index_buffer);
          gl.bufferData(raw.GL_ELEMENT_ARRAY_BUFFER, geo.index_data, raw.GL_DYNAMIC_DRAW);
        }
        geo.compiled = true;
      }
    })();


    return function (geo) {
      if (!geo.compiled) this.compile_geometry(this.gl, geo);

      shader = this.active_shader;

      if (shader.used_geo_id === geo.uuid) return;
      shader.used_geo_id = geo.uuid;


      for (i = 0; i < shader.all_attributes.length; i++) {
        att = shader.all_attributes[i];

        if (geo.attributes[att.name]) {

          this.update_geomerty_attribute(att.location, geo.attributes[att.name]);
        }
        else {
          this.update_geomerty_attribute(att.location, null);
        }
      }


    }
  })();

  proto.use_shader = function (shader) {
    if (this.last_shader_id != shader.uuid) {
      if (!shader.compiled) {
        raw.webgl.shader.compile(this.gl, shader, this.shader_parameters);
      }
      this.gl.useProgram(shader.program);

      shader.set_uniform("u_fog_params_rw", this.fog_params);
      shader.set_uniform("u_fog_color_rw", this.fog_color);      
      shader.set_uniform('u_timer_rw', this.u_timer_rw);
      this.active_shader = shader;
      this.active_shader.camera_version = -1;
      this.last_shader_id = shader.uuid;
      this.active_shader.used_geo_id = -100;

      return (true);
    }
    return (false);
  };

  proto.update_model_uniforms = function (model) {
    this.active_shader.set_uniform("u_model_rw", model.matrix_world);
  };

  proto.update_camera_uniforms = function (camera) {
    if (this.active_shader.camera_version === camera.version) return false;
    this.active_shader.camera_version = camera.version;
    this.active_shader.set_uniform("u_view_projection_rw", camera.view_projection);
    return (true);
  };


  proto.use_direct_texture = function (texture, slot) {
    this.gl.activeTexture(raw.GL_TEXTURE0 + slot);
    this.gl.bindTexture(texture.target, texture.gl_texture);
  };

  proto.use_texture = function (texture, slot) {
    if (texture === null) {
      this.use_texture(this.default_texture, slot);
      return;
    }
    else {
      if (texture.needs_update) {
        texture.needs_update = false;
        this.texture_updates.push(texture);
      }
      if (texture.gl_texture === null) {
        this.use_texture(this.default_texture, slot);
        return;
      }

    }
    if (this.texture_slots[slot] !== texture.uuid) {
      this.texture_slots[slot] = texture.uuid;
      this.gl.activeTexture(raw.GL_TEXTURE0 + slot);
      this.gl.bindTexture(texture.target, texture.gl_texture);
    }

  };

  proto.update_textures = (function () {
    var texture, i = 0;
    return function () {
      for (i = 0; i < this.texture_updates.length; i++) {
        texture = this.texture_updates.data[i];
        texture.update(this.gl);

      }
      this.texture_updates.clear();
    }
  })();


  proto.draw_textured_quad = (function () {
    var att = {
      item_size: 2, data: new Float32Array([
        -1, -1,
        1, -1,
        1, 1,

        -1, -1,
        1, 1,
        -1, 1
      ])
    }
    var shdr = raw.webgl.shader.parse(glsl["textured-quad"]);
    var u_pos_size = raw.math.vec4();
    return function (texture, left, top, width, height) {
      u_pos_size[0] = left;
      u_pos_size[1] = top;
      u_pos_size[2] = width;
      u_pos_size[3] = height;
      this.use_geometry_attribute(0, att);
      this.use_shader(shdr);
      shdr.set_uniform("u_pos_size", u_pos_size);
      //this.gl.disable(raw.GL_DEPTH_TEST);
      this.gl.disable(raw.GL_CULL_FACE);
      this.use_texture(texture, 0);
      this.gl.drawArrays(4, 0, 6);

    }
  })();

  proto.apply_post_processes = (function () {

    proto.draw_full_quad = function () {
      this.gl.bindBuffer(raw.GL_ARRAY_BUFFER, this.full_quad);
      this.gl.enableVertexAttribArray(0);
      this.gl.vertexAttribPointer(0, 2, raw.GL_FLOAT, false, 0, 0);
      this.gl.drawArrays(raw.GL_TRIANGLES, 0, 6);

    };

    var i0 = 0, i1 = 0, post_target = null, post_process_input = null;
    return function () {
      i1 = 0;

      post_process_input = this.default_render_target.color_texture;
      post_target = this.render_target2;



      this.gl.disable(raw.GL_DEPTH_TEST);
      for (i0 = 0; i0 < this.post_processes.length; i0++) {
        post_process = this.post_processes[i0];
        if (post_process.enabled) {
          if (i1 % 2 === 0) {
            post_process.apply(this, post_process_input, post_target);
            post_process_input = post_target.color_texture;
            post_target = post_target.swap;
          }
          else {
            post_process.apply(this, post_process_input, post_target);
            post_process_input = post_target.color_texture;
            post_target = post_target.swap;
          }
          i1++;
        }
      }


      this.gl.bindFramebuffer(raw.GL_FRAMEBUFFER, null);
      this.use_shader(raw.shading.post_process.shader);
      this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
      this.use_direct_texture(post_process_input, 0);
      // raw.shading.post_process.shader.set_uniform("u_texture_input_rw", 0);
      this.draw_full_quad();

      this.gl.enable(raw.GL_DEPTH_TEST);
    }
  })();


  proto.render_list = (function () {
    proto.begin_render = function () {
      this.last_shader_id = -1;
      this.on_error = false;
      this.set_default_viewport();
      this.clear_screen();





      this.timer = performance.now();
      this.u_timer_rw[0] = this.timer;
      this.render_version++;
    };
    proto.enable_fw_rendering = function () {
      this.gl.blendFunc(raw.GL_ONE, raw.GL_ONE);
      if (this.fw_rendering_mode) return;
      this.gl.enable(raw.GL_BLEND);
      this.gl.depthMask(false);
      this.gl.depthFunc(raw.GL_EQUAL);
      this.fw_rendering_mode = true;
    };

    proto.disable_fw_rendering = function () {
      if (!this.fw_rendering_mode) return;
      this.gl.disable(raw.GL_BLEND);
      this.gl.depthFunc(raw.GL_LESS);
      this.gl.depthMask(true);
      this.fw_rendering_mode = false;
    };

    proto.end_render = function () {
      this.texture_slots[0] = -1;
      this.update_textures();
      if (this.default_render_target !== null) this.apply_post_processes();
      if (this.show_debug_canvas) {
          this.gl.enable(raw.GL_BLEND);
        this.gl.blendFunc(raw.GL_SRC_ALPHA, raw.GL_ONE_MINUS_SRC_ALPHA);
        this.draw_textured_quad(this.debug_canvas, 0, 0, 1, 1);
        this.gl.disable(raw.GL_BLEND);
      }

      if (this.render_version > 999999) {
        this.render_version = 0;
      }
    };

    proto.render_mesh = function (mesh) {
      this.use_geometry(mesh.geometry);
      mesh.material.render_mesh(this, this.active_shader, mesh);
      this.worked_items++;
    };

    var i0 = 0, i1 = 0, i2 = 0, mesh = undefined, light = undefined;

    var update_shading_lights = false;

    proto.update_shading_lights = (function () {
      var lights_eye_position = raw.math.vec4();

      var dummy_light_m4 = raw.math.mat4();
      dummy_light_m4.fill(0);
      dummy_light_m4[3] = 0;
      dummy_light_m4[15] = 0.5;

      var dummy_m4 = raw.math.mat4();



      return function (camera, loop_count) {
        total_lights = 0;

        if (loop_count === -1) loop_count = this.lights_batch_size;
        for (i2 = 0; i2 < loop_count; i2++) {
          light = this.shading_lights[i2];

          if (light != null) {
            if (light.light_type === 0) {
              raw.math.vec3.copy(lights_eye_position, light.world_position);
              raw.math.vec3.set(light.world_position,
                light.matrix_world[8] * 99999,
                light.matrix_world[9] * 99999,
                light.matrix_world[10] * 99999);

              light.attenuation[3] = 1;
            }
            else {
              light.attenuation[3] = 0;
            }
            this.active_shader.set_uniform("u_light_material_rw" + i2, light.light_material);
            this.active_shader.set_uniform("u_light_matrix_rw" + i2, light.matrix_world);


            if (light.light_type === 0) raw.math.vec3.copy(light.world_position, lights_eye_position);



          }



        }


        for (i2 = loop_count; i2 < this.fws_num_lights; i2++) {
          this.active_shader.set_uniform("u_light_material_rw" + i2, dummy_light_m4);
          this.active_shader.set_uniform("u_light_matrix_rw" + i2, dummy_m4);

        }

        lights_eye_position[0] = camera.world_position[0];
        lights_eye_position[1] = camera.world_position[1];
        lights_eye_position[2] = camera.world_position[2];



        lights_eye_position[3] = this.lights_batch_size;
        this.active_shader.set_uniform("u_eye_position_rw", lights_eye_position);
      }
    })();

    proto.render_lighting = function (camera, lights, calback) {
      this.light_pass_count = 0;
      this.lights_batch_size = 0;
      for (i1 = 0; i1 < lights.length; i1++) {
        light = lights.data[i1];

        this.shading_lights[this.lights_batch_size++] = light;
        update_shading_lights = this.lights_batch_size === this.fws_num_lights || i1 === lights.length - 1;
        if (update_shading_lights) {
          calback(update_shading_lights);
          this.lights_batch_size = 0;
          this.light_pass_count++;
          if (lights.length > this.fws_num_lights) {
            this.enable_fw_rendering();
          }
        }
      }
    };


    var transparent_meshes = new raw.array(), opuque_meshes = new raw.array()
      , flat_meshes = new raw.array(),
      pickable_meshes = new raw.array(),
      _this = null, light_mesh_distance = 0, camera = null;


    function transparent_meshes_sort(a, b) {
      return a.view_position[2] - b.view_position[2];
    }


    proto.render_light_shadows = (function () {
      var shadow_maps = {}, shadow_map = null, m = 0, cast_count = 0,
        update_light_camera_matrices = false, total_shadow_casters = 0;

      var u_shadow_params_rw = raw.math.vec4(), u_light_pos_rw = raw.math.vec3(),
        u_light_dir_rw = raw.math.vec3(), u_shadow_attenuation_rw = raw.math.vec4();

      console.log("shadow_maps", shadow_maps);
      function get_shadow_map(gl, size) {
        shadow_map = shadow_maps[size];
        if (!shadow_map) {
          shadow_map = new raw.webgl.render_target(gl, size, size);
          shadow_map.attach_color();
          shadow_map.attach_depth();
          shadow_maps[size] = shadow_map;
        }
        return shadow_map;
      }

      
      function get_shadow_map_shader(light_type, shader) {
        if (light_type >-1) {
          if (!shader.default_shadow_map) {
            shader.default_shadow_map = shader.extend(glsl['render-shadow-map'], { fragment: false });
            shader.default_shadow_map.shadow_shader = true;
          }
          return shader.default_shadow_map;
        }
      };

      function get_shadow_receiver_shader(light_type, shader) {
        if (light_type >-1) {
          if (!shader.default_shadow_receiver) {
            shader.default_shadow_receiver = shader.extend(glsl['receive-shadow'], { fragment: false });
            shader.default_shadow_receiver.shadow_shader = true;
          }
          return shader.default_shadow_receiver;
        }
      }



      function render_shadow_casters(renderer, light, light_camera, meshes) {
        cast_count = 0;
        for (m = 0; m < meshes.length; m++) {
          mesh = meshes.data[m];
          if ((mesh.material.flags & raw.SHADING.CAST_SHADOW) !== 0) {
            //if (!light.valid_shadow_caster(light_camera, mesh)) continue;


            if (light.light_type > 0) {
              if (raw.math.vec3.distance2(
                light_camera.view[12],
                light_camera.view[13],
                light_camera.view[14],
                mesh.world_position[0],
                mesh.world_position[1],
                mesh.world_position[2]
              ) - mesh.bounds_sphere > light.range * 3) {
                continue
              }
            }


            cast_count++;
            if (renderer.use_shader(get_shadow_map_shader(light.light_type, mesh.material.shader))) {              
            }
            renderer.update_camera_uniforms(light_camera);
            renderer.update_model_uniforms(mesh);
            renderer.render_mesh(mesh);
          }
        }
        return cast_count;
      }
      function render_shadow_receivers(renderer, light, light_camera, camera, meshes) {        
        for (m = 0; m < meshes.length; m++) {
          mesh = meshes.data[m];

          if ((mesh.material.flags & raw.SHADING.RECEIVE_SHADOW) !== 0) {


            if (light.light_type > 0) {
              if (raw.math.vec3.distance2(
                light_camera.view[12],
                light_camera.view[13],
                light_camera.view[14],
                mesh.world_position[0],
                mesh.world_position[1],
                mesh.world_position[2]
              ) - mesh.bounds_sphere > light.range*2) {
                continue
              }
            }
            renderer.receive_shadow_count++;

            if (renderer.use_shader(get_shadow_receiver_shader(light.light_type, mesh.material.shader))) {
              renderer.active_shader.set_uniform("u_shadow_map_rw", 4);

              renderer.active_shader.set_uniform("u_light_material_rw", light.light_material);
              renderer.active_shader.set_uniform("u_light_camera_matrix_rw", light_camera.view_projection);
              renderer.active_shader.set_uniform("u_light_pos_rw", u_light_pos_rw);
              renderer.active_shader.set_uniform("u_light_dir_rw", u_light_dir_rw);

              renderer.active_shader.set_uniform("u_shadow_params_rw", u_shadow_params_rw);
              renderer.active_shader.set_uniform("u_shadow_attenuation_rw", u_shadow_attenuation_rw);
              


            };
            renderer.update_camera_uniforms(camera);;
            renderer.active_shader.set_uniform("u_model_rw", mesh.matrix_world);            
            renderer.render_mesh(mesh);
          }


        }

      }



      var d = 0, light_camera = null,s1=null;
      return function (light) {
        s1 = get_shadow_map(this.gl, 1024);
        shadow_map = get_shadow_map(this.gl, light.shadow_map_size);
        

        if (!light.camera) {
          light.camera = {
            view: raw.math.mat4(),
            view_inverse: raw.math.mat4(),
            projection: raw.math.mat4(),
            view_projection: raw.math.mat4(),
            light_version: -1,
            camera_version: -1,
            version: 0
          };
          if (light.light_type === 0) {
            d = light.shadow_camera_distance * 2;
            raw.math.mat4.ortho(light.camera.projection, -d, d, -d, d, -d * 0.75, d * 5);
          }
          else if (light.light_type === 1) {
            raw.math.mat4.perspective(light.camera.projection,150 * raw.math.DEGTORAD, 1, 0.5, light.range * 8);            
            raw.math.mat4.from_eular(light.camera.view, -90 * raw.math.DEGTORAD, 0, 0);
          }
          else if (light.light_type === 2) {
            raw.math.mat4.perspective(light.camera.projection, light.view_angle , 1, 0.1, light.range * 4);
          }
          light.camera.world_position = new Float32Array(light.camera.view.buffer, (12 * 4), 3);


        }

        light_camera = light.camera;

        if (light_camera.light_version !== light.version || update_light_camera_matrices) {

          if (light.light_type === 1) { // point light only set position
            light_camera.view[12] = light.world_position[0];
            light_camera.view[13] = light.world_position[1];
            light_camera.view[14] = light.world_position[2];
            //raw.math.vec3.copy(light_camera.world_position, light.world_position);
          }
          else {
            raw.math.mat4.copy(light_camera.view, light.matrix_world);
          }
          update_light_camera_matrices = true;
        }


        if (light_camera.camera_version !== camera.version || update_light_camera_matrices) {
          if (light.light_type === 0) {
            d = light.shadow_camera_distance;
            light_camera.world_position[0] = (camera.fw_vector[0] * (-d)) + camera.world_position[0];
            light_camera.world_position[1] = (camera.fw_vector[1] * (-d)) + camera.world_position[1];
            light_camera.world_position[2] = (camera.fw_vector[2] * (-d)) + camera.world_position[2];
          }
        
          update_light_camera_matrices = true;
        }


        if (update_light_camera_matrices) {
          raw.math.mat4.inverse(light_camera.view_inverse, light_camera.view);
          raw.math.mat4.multiply(light_camera.view_projection, light_camera.projection, light_camera.view_inverse);
        }


        light_camera.camera_version = camera.version;
        light_camera.light_version = light.version;
        light_camera.version = camera.version + light.version;


        shadow_map.bind();

        this.gl.cullFace(raw.GL_FRONT);
        total_shadow_casters = render_shadow_casters(this, light, light_camera, opuque_meshes);
        if (transparent_meshes.length > 0) {
          this.gl.enable(raw.GL_BLEND);
          this.gl.blendFunc(raw.GL_SRC_ALPHA, raw.GL_ONE_MINUS_SRC_ALPHA);
          total_shadow_casters += render_shadow_casters(this, light, light_camera, transparent_meshes);
        }

        
        u_shadow_params_rw[0] = light.shadow_intensity;
        u_shadow_params_rw[1] = 1 / light.shadow_map_size;
        u_shadow_params_rw[2] = light.shadow_bias;

        u_light_dir_rw[0] = light.matrix_world[8];
        u_light_dir_rw[1] = light.matrix_world[9];
        u_light_dir_rw[2] = light.matrix_world[10];


        // light camera view angle  to clamp shadow
        u_shadow_params_rw[3] = Math.cos(light.view_angle * 0.5);
        

        if (light.light_type === 0) {
          u_light_pos_rw[0] = u_light_dir_rw[0] * light.range;
          u_light_pos_rw[1] = u_light_dir_rw[1] * light.range;
          u_light_pos_rw[2] = u_light_dir_rw[2] * light.range;
        }
        else {         

          raw.math.vec3.copy(u_light_pos_rw, light.world_position);
        }


        this.gl.cullFace(raw.GL_BACK);


        
        //s1.bind();        
        //this.use_direct_texture(shadow_map.depth_texture, 4);
        //render_shadow_receivers(this, light, light_camera, camera, opuque_meshes);

        this.set_default_viewport();

        if (total_shadow_casters > 0) {
          this.receive_shadow_count = 0;

          if (light.light_type === 1) {
            u_shadow_attenuation_rw[0] = 0;
            u_shadow_attenuation_rw[1] = (
              light.attenuation[0]
              + light.attenuation[1] 

            )*2;
            u_shadow_attenuation_rw[2] = light.attenuation[2]*2;
            u_shadow_attenuation_rw[3] = light.range * 0.95;
          }
          else if (light.light_type === 2) {
            u_shadow_attenuation_rw[0] = 0;
            u_shadow_attenuation_rw[1] = (
             light.attenuation[1]

            ) * 0.75;
            u_shadow_attenuation_rw[2] = light.attenuation[2]*0.5;
            u_shadow_attenuation_rw[3] = light.range;

            u_shadow_attenuation_rw[0] = 1;
            u_shadow_attenuation_rw[1] = 0;
            u_shadow_attenuation_rw[2] = 0;
            u_shadow_attenuation_rw[3] = light.range;

          }
          else {

           // u_shadow_params_rw[0] = light.shadow_intensity * (light.range * 0.5);
            u_shadow_attenuation_rw[0] = 1;
            u_shadow_attenuation_rw[1] = 0;
            u_shadow_attenuation_rw[2] = 0;
            u_shadow_attenuation_rw[3] = light.range;
            
          }
          



          
          this.enable_fw_rendering();
          this.gl.blendEquation(raw.GL_FUNC_REVERSE_SUBTRACT);
          this.use_direct_texture(shadow_map.color_texture, 0);
          this.use_direct_texture(shadow_map.depth_texture, 4);          
          render_shadow_receivers(this, light, light_camera, camera, opuque_meshes);
          if (transparent_meshes.length > 0) {
            this.gl.depthFunc(raw.GL_LESS);
            render_shadow_receivers(this, light, light_camera, camera, transparent_meshes);
          }
          this.gl.blendEquation(raw.GL_FUNC_ADD);
          this.disable_fw_rendering();
        }


        



      //  this.draw_textured_quad(shadow_map.color_texture,0.65,0.5,0.25,0.35);



      }
    })();

    proto.render_pickables = (function () {



      var uint32_color_id = new Uint32Array(1);
      var byte_id = new Uint8Array(uint32_color_id.buffer);
      var u_color_id_rw = new Float32Array(4);


      proto.read_picking_color_id = function (mx, my) {
        mx = mx * this.gl.pixel_ratio;
        my = my * this.gl.pixel_ratio;
        my = this.gl.canvas.height - my;
        this.gl.readPixels(mx, my, 1, 1, raw.GL_RGBA, raw.GL_UNSIGNED_BYTE, byte_id);
        return uint32_color_id[0];
      };

      proto.create_picking_color_id = function () {
        uint32_color_id[0] = this.picking_color_id;
        byte_id[3] = 255;
        this.picking_color_id += 8;
        return uint32_color_id[0];
      };




      proto.set_picking_color_id = function (id) {
        uint32_color_id[0] = id;
        byte_id[3] = 255;
        u_color_id_rw[0] = byte_id[0];
        u_color_id_rw[1] = byte_id[1];
        u_color_id_rw[2] = byte_id[2];
        u_color_id_rw[3] = byte_id[3];
        this.active_shader.set_uniform('u_color_id_rw', u_color_id_rw);
        return uint32_color_id[0];
      };

      return function () {
        this.pickables_pass = true;
        this.render_target1.bind();
        this.disable_fw_rendering();
        this.gl.clear(raw.GL_COLOR_BUFFER_BIT | raw.GL_DEPTH_BUFFER_BIT);

        for (i0 = 0; i0 < pickable_meshes.length; i0++) {
          mesh = pickable_meshes.data[i0];

          if (!mesh.material.shader.pickable) {
            mesh.material.shader.pickable = mesh.material.shader.extend(glsl['pickable-mesh'], { fragment: false });
          }

          if (this.use_shader(mesh.material.shader.pickable)) {
            this.update_camera_uniforms(camera);
          }


          this.update_model_uniforms(mesh);
          if (!mesh.picking_color_id) {
            mesh.picking_color_id = this.set_picking_color_id(this.picking_color_id);
            this.picking_color_id += 8;
          }
          else {
            this.set_picking_color_id(mesh.picking_color_id);
          }


          this.render_mesh(mesh);
        }


        this.pickables_pass = false;
      }

    })();

    var list = null, time_start=0;
    proto.step = function () {

     // time_start = Date.now();
      this.worked_items = 0;

      
      this.begin_render();
      pickable_meshes.clear();
      while ((list = this.ecs.iterate_entities("render_list")) !== null) {
        this.render_list(list.render_list);
      }
      this.end_render();
      if (this.enable_pickables && pickable_meshes.length > 0) {
        this.render_pickables();
      }

     // this.frame_time = (Date.now() - time_start);
      
      
    };
    return function (list) {
      camera = list.camera.camera;
      this.active_camera = camera;

      transparent_meshes.clear();
      opuque_meshes.clear();
      flat_meshes.clear();

      
      for (i0 = 0; i0 < list.meshes.length; i0++) {
        mesh = list.meshes.data[i0];

        if ((mesh.material.flags & raw.SHADING.TRANSPARENT)) {
          transparent_meshes.push(mesh);
        }
        else {
          if (mesh.material.flags & raw.SHADING.FLAT) {
            flat_meshes.push(mesh);
          }
          else {
            opuque_meshes.push(mesh);
          }
        }

        if (mesh.material.flags & raw.SHADING.PICKABLE) {
          pickable_meshes.push(mesh);
        }


      }

      if (transparent_meshes.length > 0) {
        raw.merge_sort(transparent_meshes.data, transparent_meshes.length, transparent_meshes_sort);
      }
      _this = this;

      this.disable_fw_rendering();

      _this.lights_meshes_rendered = 0;
      if (opuque_meshes.length > 0) {
        _this.render_lighting(camera, list.lights, function (update_shading_lights) {
          for (i0 = 0; i0 < opuque_meshes.length; i0++) {
            mesh = opuque_meshes.data[i0];

            if (_this.light_pass_count >= mesh.material.light_pass_limit) continue;
            if (_this.use_shader(mesh.material.shader) || update_shading_lights) {
              update_shading_lights = false;
              _this.update_camera_uniforms(camera);
              _this.update_shading_lights(camera, mesh.material.lights_count);

            }
            _this.update_model_uniforms(mesh);
            _this.render_mesh(mesh);

          }

        });
      }

      this.disable_fw_rendering();

      for (i0 = 0; i0 < flat_meshes.length; i0++) {
        mesh = flat_meshes.data[i0];
        if (this.use_shader(mesh.material.shader)) {
          this.update_camera_uniforms(camera);
        }
        this.update_model_uniforms(mesh);
        this.render_mesh(mesh);
      }


      this.texture_slots[0] = -1;
      for (i0 = 0; i0 < list.lights.length; i0++) {
        light = list.lights.data[i0];
        if (light.cast_shadows) this.render_light_shadows(light);

      }

      this.disable_fw_rendering();

      //return;

      for (i0 = 0; i0 < transparent_meshes.length; i0++) {
        mesh = transparent_meshes.data[i0];

        if (mesh.material.flags & raw.SHADING.SHADED) {
          if (_this.light_pass_count >= mesh.material.light_pass_limit) continue;
          _this.render_lighting(camera, list.lights, function (update_shading_lights) {
            if (_this.use_shader(mesh.material.shader) || update_shading_lights) {
              update_shading_lights = false;
              _this.update_camera_uniforms(camera);
              _this.update_model_uniforms(mesh);
              _this.update_shading_lights(camera, mesh.material.lights_count);

              if (_this.light_pass_count === 0) {
                _this.gl.enable(raw.GL_BLEND);
                _this.gl.blendFunc(raw.GL_SRC_ALPHA, raw.GL_ONE_MINUS_SRC_ALPHA);
                _this.gl.cullFace(raw.GL_FRONT);
                _this.render_mesh(mesh);
                _this.gl.cullFace(raw.GL_BACK);
                _this.render_mesh(mesh);
              }
              else {
                _this.gl.blendFunc(raw.GL_SRC_ALPHA, raw.GL_ONE);
                _this.render_mesh(mesh);
              }
            }


          });
          _this.disable_fw_rendering();
        }
        else {
          if (_this.use_shader(mesh.material.shader)) {
            this.update_camera_uniforms(camera);
          }
          this.update_model_uniforms(mesh);
          this.gl.enable(raw.GL_BLEND);
          this.gl.blendFunc(raw.GL_SRC_ALPHA, raw.GL_ONE_MINUS_SRC_ALPHA);
          this.render_mesh(mesh);
        }
      }
      this.disable_fw_rendering();





    }


  })();

  proto.validate = function (ecs) {
    ecs.use_component('render_list');
  };

  proto.get_element = function () {
    return this.gl.canvas;
  };




  return render_system;

}, raw.ecs.system));
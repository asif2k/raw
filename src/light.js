
raw.light = raw.define(function (proto, _super) {

  function light(parameters) {
    parameters = parameters || {};
    raw.flags_setting.apply(this, arguments);
    _super.apply(this, arguments);

    this.light_material = new Float32Array(16);
    this.ambient = new Float32Array(this.light_material.buffer, 0, 4);
    this.diffuse = new Float32Array(this.light_material.buffer, 4 * 4, 4);
    this.specular = new Float32Array(this.light_material.buffer, 8 * 4, 4);
    this.attenuation = new Float32Array(this.light_material.buffer, 12 * 4, 4);

    raw.vec4.copy(this.ambient, parameters.ambient || [0.49, 0.49, 0.49, 1.0]);
    raw.vec4.copy(this.diffuse, parameters.diffuse || [0.87, 0.87, 0.87, -1]);
    raw.vec4.copy(this.specular, parameters.specular || [0.85, 0.85, 0.85, -1]);
    raw.vec4.copy(this.attenuation, parameters.attenuation || [0, 0, 0, 0]);


    this.diffuse[3] = -1;
    this.specular[3] = -1;
    this.range = 2000;
    this.light_type = 0;

    this.cast_shadows = false;
    this.shadow_bias = 0.000001;
    this.shadow_opacity = 0.5;
    this.shadow_map_size = 512;
    this.shadow_camera_distance = 40;
    this.aabb = raw.aabb();

    this.node_type = raw.NODE_TYPES.LIGHT;

  }

  raw.assign(proto, raw.flags_setting.prototype);


  proto.update_bounds = (function () {
    var r = 0, p = null;

    var minx, miny, minz, maxx, maxy, maxz;
    proto.update_aabb = function (x, y, z) {
      this.aabb[0] = Math.min(this.aabb[0], x);
      this.aabb[1] = Math.min(this.aabb[1], y);
      this.aabb[2] = Math.min(this.aabb[2], z);

      this.aabb[3] = Math.max(this.aabb[3], x);
      this.aabb[4] = Math.max(this.aabb[4], y);
      this.aabb[5] = Math.max(this.aabb[5], z);

    }
    return function () {
      r = this.range * 0.25;

      p = this.world_position;

      this.aabb[0] = p[0];
      this.aabb[1] = p[1];
      this.aabb[2] = p[2];
      this.aabb[3] = p[0];
      this.aabb[4] = p[1];
      this.aabb[5] = p[2];

      minx = p[0] - r;
      miny = p[1] - r;
      minz = p[2] - r;

      maxx = p[0] + r;
      maxy = p[1] + r;
      maxz = p[2] + r;


      this.update_aabb(minx, miny, minz);
      this.update_aabb(minx, miny, maxz);
      this.update_aabb(minx, maxy, minz);
      this.update_aabb(minx, maxy, maxz);

      this.update_aabb(maxx, miny, minz);
      this.update_aabb(maxx, miny, maxz);
      this.update_aabb(maxx, maxy, minz);
      this.update_aabb(maxx, maxy, maxz);

    }
  })();

  proto.get_display = function () {
    var b = raw.geometry.lines_builder;
    b.clear();
    b.add(0, 0, 0.1).add(0, 0, -3.5)
      .add(-0.3, 0, 0).add(0.3, 0, 0)
      .add(0, -0.2, 0).add(0, 0.2, 0)
      .add(0.3, 0, 0.1).add(0.3, 0, -0.5)
      .add(-0.3, 0, 0.1).add(-0.3, 0, -0.5)
      .add(0, 0.2, 0.1).add(0, 0.2, -0.5)
      .add(0, -0.2, 0.1).add(0, -0.2, -0.5)

    this.update();
    var m = new raw.mesh(b.build());
    m.geometry.shape_type = "light display";
    m.material.draw_type = raw.GL_LINES;
    m.parent = this;
    m.update();
    console.log('lm', m);
    return (m);

  };

  proto.update = (function (super_update) {
    return (function () {
      if (super_update.apply(this)) {
        this.update_bounds();

        return (true);
      }
      return (false);
    });
  })(proto.update);

  proto.set_intensity = function (v) {
    this.ambient[3] = v;
    return (this);
  };

  proto.get_light_camera = function () {
    if (!this.camera) {
      var d = this.shadow_camera_distance * 2;
      this.camera = new raw.ortho_camera(-d, d, -d, d, -d * 0.75, d * 5);
    }
    return this.camera;
  };
  proto.update_light_camera = function (light_camera, camera) {
    light_camera.world_position[0] = (camera.fw_vector[0] * (-this.shadow_camera_distance)) + camera.world_position[0];
    light_camera.world_position[1] = (camera.fw_vector[1] * (-this.shadow_camera_distance)) + camera.world_position[1];
    light_camera.world_position[2] = (camera.fw_vector[2] * (-this.shadow_camera_distance)) + camera.world_position[2];
  };

  proto.valid_shadow_caster = function (camera, node) {
    return true;
  };

  proto.get_shadow_light_pos = function (light_pos) {
    raw.vec3.set(light_pos, this.fw_vector[0] * 99999, this.fw_vector[1] * 99999, this.fw_vector[2] * 99999);
  };

  light.default_shadows = raw.shader.create_chunks_lib(import('shaders/default_shadows.glsl'));


  proto.get_shadow_map_shader = function (shader) {
    if (!shader.default_shadow_map) {
      shader.default_shadow_map = shader.extend(raw.light.default_shadows['map'], { fragment: false });      
      shader.default_shadow_map.shadow_shader = true;
    }
    return shader.default_shadow_map;
  };

  proto.get_shadow_receiver_shader = function (shader) {
    if (!shader.default_shadow_receiver) {
      shader.default_shadow_receiver = shader.extend(raw.light.default_shadows['receiver'], { fragment: false });
      shader.default_shadow_receiver.shadow_shader = true;
    }
    return shader.default_shadow_receiver;
  };

  proto.render_shadows = (function () {

    var shadow_maps = {}, shadow_map = null, light = null, m = 0, cast_count = 0,
      update_light_camera_matrices = false, total_shadow_casters = 0;


    var u_shadow_params_rw = raw.vec3(), u_light_pos_rw = raw.vec3();

    function render_shadow_casters(engine, light, light_camera, meshes) {
      cast_count = 0;

      for (m = 0; m < meshes.length; m++) {
        mesh = meshes.data[m];
        if ((mesh.material.flags & raw.SHADING.CAST_SHADOW) !== 0) {
          if (!light.valid_shadow_caster(light_camera, mesh)) continue;
          cast_count++;
          if (engine.use_shader(light.get_shadow_map_shader(mesh.material.shader))) {

          }
          engine.update_camera_uniforms(light_camera);
          engine.update_model_view(light_camera, mesh);
          engine.update_model_uniforms(mesh);
          engine.render_mesh(mesh);
        }

      }

      return cast_count;
    }


    function render_shadow_receivers(engine, light, light_camera, camera, meshes) {

      for (m = 0; m < meshes.length; m++) {
        mesh = meshes.data[m];

        if ((mesh.material.flags & raw.SHADING.RECEIVE_SHADOW) !== 0) {

          if (engine.use_shader(light.get_shadow_receiver_shader(mesh.material.shader))) {
            engine.active_shader.set_uniform("u_shadow_map_rw", 4);
            engine.active_shader.set_uniform("u_light_camera_matrix_rw", light_camera.matrix_world_projection);
            engine.active_shader.set_uniform("u_light_pos_rw", u_light_pos_rw);
            engine.active_shader.set_uniform("u_shadow_params_rw", u_shadow_params_rw);
          };
          engine.update_camera_uniforms(camera);
          engine.update_model_view(camera, mesh);
          engine.update_model_uniforms(mesh);
          engine.render_mesh(mesh);


        }


      }

    }


    console.log("shadow_maps", shadow_maps);
    function get_shadow_map(gl, size) {
      shadow_map = shadow_maps[size];
      if (!shadow_map) {
        shadow_map = new raw.render_target(gl, size, size);
        shadow_map.attach_color();
        shadow_map.attach_depth();
        shadow_maps[size] = shadow_map;
        shadow_map.display = shadow_map.get_display(1);


      }
      return shadow_map;
    }



    return function (engine, camera, opuque_meshes, transparent_meshes) {
      light = this;
      shadow_map = get_shadow_map(engine.gl, light.shadow_map_size);
      light_camera = light.get_light_camera();

      update_light_camera_matrices = false;


      if (light_camera.shadow_light_version !== light.version || update_light_camera_matrices) {

        if (light.light_type === 1) { // point light only set position
          raw.vec3.copy(light_camera.world_position, light.world_position);
        }
        else {
          raw.mat4.copy(light_camera.matrix_world, light.matrix_world);
        }
        update_light_camera_matrices = true;
      }

      if (light_camera.shadow_camera_version !== camera.version || update_light_camera_matrices) {
        light.update_light_camera(light_camera, camera);
        update_light_camera_matrices = true;
      }


      if (update_light_camera_matrices) {
        light_camera.update_matrix_world_inverse().update_matrix_world_projection(true);
      }

      light_camera.shadow_camera_version = camera.version;
      light_camera.shadow_light_version = light.version;
      light_camera.version = camera.version + light.version;


      shadow_map.bind();

      engine.gl.cullFace(raw.GL_FRONT);
      total_shadow_casters = render_shadow_casters(engine, light, light_camera, opuque_meshes);
      if (transparent_meshes.length > 0) {
        engine.gl.enable(raw.GL_BLEND);
        engine.gl.blendFunc(raw.GL_SRC_ALPHA, raw.GL_ONE_MINUS_SRC_ALPHA);
        total_shadow_casters += render_shadow_casters(engine, light, light_camera, transparent_meshes);
      }
      //console.log("total_shadow_casters", total_shadow_casters);

      engine.gl.cullFace(raw.GL_BACK);


      engine.set_default_viewport();


      u_shadow_params_rw[0] = light.shadow_opacity * 0.5;
      u_shadow_params_rw[1] = 1 / light.shadow_map_size;
      u_shadow_params_rw[2] = light.shadow_bias;


      light.get_shadow_light_pos(u_light_pos_rw);

      if (total_shadow_casters > 0) {

        engine.enable_fw_rendering();
        engine.gl.blendEquation(raw.GL_FUNC_REVERSE_SUBTRACT);
        engine.use_direct_texture(shadow_map.depth_texture, 4);
        render_shadow_receivers(engine, light, light_camera, camera, opuque_meshes);
        if (transparent_meshes.length > 0) {
          engine.gl.depthFunc(raw.GL_LESS);
          render_shadow_receivers(engine, light, light_camera, camera, transparent_meshes);
        }
        engine.gl.blendEquation(raw.GL_FUNC_ADD);
        engine.disable_fw_rendering();
      }



      shadow_map.display.set_position(0, 0, -3);
      shadow_map.display.parent = camera;
      shadow_map.display.update();
      //engine.render_single_mesh(camera, shadow_map.display);


    };

  })();



  return light;

}, raw.transform);

raw.point_light = raw.define(function (proto, _super) {

  function point_light(parameters) {
    parameters = parameters || {};
    _super.apply(this, arguments);

    this.range = parameters.range || 20;

    if (parameters.attenuation) {
      this.set_attenuation(this.attenuation[0], this.attenuation[1], this.attenuation[2]);
    }
    else {
      this.set_attenuation_by_distance(this.range * 2);
    }



    this.specular[3] = 0;
    this.diffuse[3] = 0;
    this.light_type = 1;

  }


  proto.set_attenuation_by_distance = (function () {
    var values = [[7, 1.0, 0.7, 1.8],
    [13, 1.0, 0.35, 0.44],
    [20, 1.0, 0.22, 0.20],
    [32, 1.0, 0.14, 0.07],
    [50, 1.0, 0.09, 0.032],
    [65, 1.0, 0.07, 0.017],
    [100, 1.0, 0.045, 0.0075],
    [160, 1.0, 0.027, 0.0028],
    [200, 1.0, 0.022, 0.0019],
    [325, 1.0, 0.014, 0.0007],
    [600, 1.0, 0.007, 0.0002],
    [3250, 1.0, 0.0014, 0.000007]];
    var v1, v2, i, f;
    return function (d) {
      for (i = 0; i < values.length; i++) {
        if (d < values[i][0]) {
          v2 = i;
          break;
        }
      }
      if (v2 === 0) {
        return this.set_attenuation.apply(this, values[0]);
      }
      v1 = v2 - 1;
      f = values[v2][0] - values[v1][0];
      f = (d - values[v1][0]) / f;
      this.attenuation[0] = values[v1][1] + (values[v2][1] - values[v1][1]) * f;
      this.attenuation[1] = values[v1][2] + (values[v2][2] - values[v1][2]) * f;
      this.attenuation[2] = values[v1][3] + (values[v2][3] - values[v1][3]) * f;
      return (this);
    }
  })();


  proto.set_attenuation = function (a, b, c) {
    raw.vec3.set(this.attenuation, a, b, c);
    return (this);
  };


  proto.get_shadow_light_pos = function (light_pos) {
    raw.vec3.copy(light_pos, this.world_position);
  };


  proto.update_light_camera = function (light_camera, camera) {

  };
  proto.get_light_camera = function () {
    if (!this.camera) {
      this.camera = new raw.perspective_camera(160, 1, 0.1, 200);
      this.camera.set_rotation(-90 * raw.DEGTORAD, 0, 0);
      this.camera.update();
    }
    return this.camera;
  }

  proto.valid_shadow_caster = function (mesj) {

    if (raw.vec3.distance(this.world_position, mesh.world_position) > this.range)
      return false;


    return true;


  };



  return point_light;

}, raw.light);


raw.spot_light = raw.define(function (proto, _super) {
  function spot_light(parameters) {
    _super.apply(this, arguments);
    parameters = parameters || {};
    this.view_angle = 0
    this.range = parameters.range || 20;
    if (parameters.attenuation) {
      this.set_attenuation(this.attenuation[0], this.attenuation[1], this.attenuation[2]);
    }
    else {
      this.set_attenuation_by_distance(this.range * 2);
    }
    this.set_outer_angle(parameters.outer || raw.DEGTORAD * 50).set_inner_angle(parameters.inner || raw.DEGTORAD * 50);

    this.light_type = 2;

    return (this);

  }
  

  proto.set_outer_angle = function (angle) {
    this.view_angle = angle;
    this.diffuse[3] = Math.cos(angle / 2);
    return (this);
  };

  proto.set_inner_angle = function (angle) {
    this.specular[3] = Math.cos(angle) / 2;
    return (this);
  };

  proto.get_light_camera = function () {
    if (!this.camera) {
      this.camera = new raw.perspective_camera(this.view_angle * raw.RADTODEG, 1, 0.1, this.range * 4);
    }
    return this.camera;
  }



  return spot_light;

}, raw.point_light);
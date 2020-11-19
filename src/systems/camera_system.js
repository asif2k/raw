

raw.ecs.register_component("camera", raw.define(function (proto, _super) {

  proto.create = (function (_super_call) {
    return function (def, entity) {
      _super_call.apply(this, [def, entity]);

      this.entity = entity;
      this.update_view_projection = true;
      this.type = def.type || "perspective";
      if (this.type === "perspective") {
        this.fov = (def.fov !== undefined ? def.fov : 60) * raw.math.DEGTORAD;
        this.near = def.near !== undefined ? near : 0.1;
        this.far = def.far !== undefined ? def.far : 2000;
        this.aspect = def.aspect !== undefined ? def.aspect : 1;
      }
      else {
        this.left = def.left || -0.5;
        this.right = def.right || 0.5;
        this.bottom = def.bottom || -0.5;
        this.top = def.top || 0.5;
        this.near = def.near || 0.1;
        this.far = def.far || 20;

        this.aspect = Math.abs((this.right - this.left) / (this.top - this.bottom));
      }
      this.drag_direction = raw.math.vec3();
      this.last_drag_direction = raw.math.vec3();
      this.version = 0;

    }
  })(proto.create);

  proto.update_aspect = function (asp) {
    this.aspect = asp;
    this.update_view_projection = 1;
  };


  
  var len = 0;
  proto.update_frustum_plane = function (p, x, y, z, w) {
    len = x * x + y * y + z * z + w * w;
    len = 1 / Math.sqrt(len);
    this.frustum_plans[p][0] = x * len;
    this.frustum_plans[p][1] = y * len;
    this.frustum_plans[p][2] = z * len;
    this.frustum_plans[p][3] = w * len;
  };
  proto.calc_bounds = (function () {
    var minx, miny, minz, maxx, maxy, maxz;
    function update_bounds(x, y, z) {
      minx = Math.min(minx, x);
      miny = Math.min(miny, y);
      minz = Math.min(minz, z);

      maxx = Math.max(maxx, x);
      maxy = Math.max(maxy, y);
      maxz = Math.max(maxz, z);


    }
    return function () {

      var half_height = Math.tan((this.fov / 2.0));
      var half_width = half_height * this.aspect;
      var xn = half_width * this.near;
      var xf = half_width * this.far;
      var yn = half_width * this.near;
      var yf = half_width * this.far;


      minx = 99999;
      miny = 99999;
      minz = 99999;

      maxx = -99999;
      maxy = -99999;
      maxz = -99999;



      update_bounds(-xn, -yn, this.near);
      update_bounds(xn, -yn, this.near);
      update_bounds(xn, yn, this.near);
      update_bounds(-xn, yn, this.near);


      update_bounds(-xf, -yf, -this.far);
      update_bounds(xf, -yf, -this.far);
      update_bounds(xf, yf, -this.far);
      update_bounds(-xf, yf, -this.far);



      this._bounds[0] = minx;
      this._bounds[1] = miny;
      this._bounds[2] = minz;


      this._bounds[3] = maxx;
      this._bounds[4] = maxy;
      this._bounds[5] = maxz;



    }
  })();
  proto.update_frustum = function (me) {
    raw.math.aabb.transform_mat4(this.bounds, this._bounds, this.view);
    //RIGHT
    this.update_frustum_plane(0, me[3] - me[0], me[7] - me[4], me[11] - me[8], me[15] - me[12]);
    //LEFT
    this.update_frustum_plane(1, me[3] + me[0], me[7] + me[4], me[11] + me[8], me[15] + me[12]);
    //BOTTOM
    this.update_frustum_plane(2, me[3] + me[1], me[7] + me[5], me[11] + me[9], me[15] + me[13]);
    //TOP
    this.update_frustum_plane(3, me[3] - me[1], me[7] - me[5], me[11] - me[9], me[15] - me[13]);
    //FAR
    this.update_frustum_plane(4, me[3] - me[2], me[7] - me[6], me[11] - me[10], me[15] - me[14]);
    //NEAR
    this.update_frustum_plane(5, me[3] + me[2], me[7] + me[6], me[11] + me[10], me[15] + me[14]);


  };

  proto.frustum_aabb = (function () {
    var p = 0, dd = 0, plane;

    proto._frustum_aabb = function (minx, miny, minz, maxx, maxy, maxz) {
      for (p = 0; p < 6; p++) {
        plane = this.frustum_plans[p];
        dd = Math.max(minx * plane[0], maxx * plane[0])
          + Math.max(miny * plane[1], maxy * plane[1])
          + Math.max(minz * plane[2], maxz * plane[2])
          + plane[3];

        if (dd < 0) return false;
      }
      return true;
    };

    return function (aabb) {
      return this._frustum_aabb(aabb[0], aabb[1], aabb[2], aabb[3], aabb[4], aabb[5]);
    }

  })();

  proto.aabb_aabb = (function () {
    var a;
    return function (b) {
      a = this.bounds;
      return (a[0] <= b[3] && a[3] >= b[0]) &&
        (a[1] <= b[4] && a[4] >= b[1]) &&
        (a[2] <= b[5] && a[5] >= b[2]);
    }

  })();


  proto.get_mouse_ray = (function () {
    var v = raw.math.vec4(), start = raw.math.vec3(), end = raw.math.vec3();

    proto.set_drag_direction = function (mouse_x, mouse_y, width, height) {
      v[0] = (mouse_x / width) * 2 - 1;
      v[1] = -(mouse_y / height) * 2 + 1;
      v[2] = -1;
      raw.math.vec3.transform_mat4(start, v, this.view_projection_inverse);
      v[2] = 1;
      raw.math.vec3.transform_mat4(v, v, this.view_projection_inverse);

      raw.math.vec3.subtract(this.drag_direction, v, this.last_drag_direction);
      raw.math.vec3.normalize(this.drag_direction, this.drag_direction);
      raw.math.vec3.copy(this.last_drag_direction, v);
      return this.drag_direction;

    };

    return function (mouse_ray, mouse_x, mouse_y, width, height) {
      v[0] = (mouse_x / width) * 2 - 1;
      v[1] = -(mouse_y / height) * 2 + 1;
      v[2] = -1;

      raw.math.vec3.transform_mat4(start, v, this.view_projection_inverse);
      v[2] = 1;
      raw.math.vec3.transform_mat4(mouse_ray, v, this.view_projection_inverse);
      return mouse_ray;


    }

  })();



  function camera(component) {
    _super.apply(this, [component]);

    this.view = raw.math.mat4();
    this.view_inverse = raw.math.mat4();
    this.projection = raw.math.mat4();
    this.projection_inverse = raw.math.mat4();
    this.view_projection = raw.math.mat4();
    this.view_projection_inverse = raw.math.mat4();

    this.version = 0;

    this.up_vector = new Float32Array(this.view.buffer, (4 * 4), 3);
    this.fw_vector = new Float32Array(this.view.buffer, (8 * 4), 3);
    this.sd_vector = new Float32Array(this.view.buffer, 0, 3);

    this.frustum_plans = [raw.math.vec4(), raw.math.vec4(), raw.math.vec4(), raw.math.vec4(), raw.math.vec4(), raw.math.vec4()];
    this.world_position = new Float32Array(this.view.buffer, (12 * 4), 3);

    this.bounds = raw.math.aabb();
    this._bounds = raw.math.aabb();

  }

  camera.validate = function (component) {
    component.ecs.use_system('camera_system');
  };

  return camera;

}, raw.ecs.component));



raw.ecs.register_system("camera_system", raw.define(function (proto, _super) {
  var quat = raw.math.quat, mat4 = raw.math.mat4;

  var trans = null, cam = null, entity = null;
  proto.step = function () {

    while ((entity = this.ecs.iterate_entities("camera")) !== null) {
      cam = entity.camera;
      trans = entity.transform;
      if (cam.update_view_projection === 1) {        
        if (cam.type === "perspective") {
          mat4.perspective(cam.projection, cam.fov, cam.aspect, cam.near, cam.far);
        }
        else {
          mat4.ortho(cam.projection, cam.left, cam.right, cam.bottom, cam.top, cam.near, cam.far);
        }     
        mat4.inverse(cam.projection_inverse, cam.projection);
      }

      if (trans.require_update !== 0) {
        cam.version+=0.000001;
        quat.to_mat4(cam.view, trans.rotation_world);
        mat4.scale(cam.view, trans.scale_world);
        cam.view[12] = trans.position_world[0];
        cam.view[13] = trans.position_world[1];
        cam.view[14] = trans.position_world[2];


        cam.update_view_projection = 1;
      }

      if (cam.update_view_projection === 1) {
        cam.version += 0.000001;
        cam.update_view_projection = 0;
        mat4.inverse(cam.view_inverse, cam.view);
        mat4.multiply(cam.view_projection, cam.projection, cam.view_inverse);

        mat4.inverse(cam.view_projection_inverse, cam.view_projection);
        cam.update_frustum(cam.view_projection);
        if (cam.type === "perspective") {
          cam.calc_bounds();
        }
      }
    }


  };
  proto.validate = function (ecs) {
    this.priority = ecs.use_system('transform_system').priority + 50;
  };
  return function camera_system(def, ecs) {
    _super.apply(this, [def, ecs]);

  }

}, raw.ecs.system));


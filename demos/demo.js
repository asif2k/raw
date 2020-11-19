
var vec3 = raw.math.vec3, quat = raw.math.quat;
function RD(a) {
  return a * raw.math.DEGTORAD;
}
function demo(params, cb) {

  var app = new raw.ecs({
    components: [
      'transform',
      'camera',
      'transform_controller',      
      'render_item',
      'terrain',
      'render_list',
      'skeleton'
    ]
  });

  params = raw.merge_object(params || {}, {
    
    show_debug_canvas: true
  }, true);

  var renderer = app.use_system('render_system', params);

  var camera = app.create_entity({
    components: {
      'transform': { position: [-4.483522891998291, 4.10715389251709, 15.562684059143066] },
      'camera': {
        far: params.camera_far || 5000
      },
      'transform_controller': { }
    }
  });

  app.default_entity = app.create_entity({
    components: {
      'render_item': {
        items: []
      },
      'transform': []
    }

  });

  app.render_items = app.default_entity.render_item.items;

  raw.mouse_input.disable_right_click();
  app.mouse_input = new raw.mouse_input(renderer.gl.canvas);

  app.fps_timer = new raw.fps_timer();

  app.mouse_input.mouse_wheel = function (sp, e) {
    if (e.shiftKey) {
      camera.transform_controller.move_front_back(-0.005 * sp);
    }
    else camera.transform_controller.move_front_back(-0.01 * sp);
    app.fps_timer.invalidate_loop();
  };

  app.update_mouse_camera_direction = function () {
    return camera.camera.set_drag_direction(this.mouse_input.mouse_x, this.mouse_input.mouse_y,
      this.mouse_input.elm_width, this.mouse_input.elm_height);
  }



  console.log(app);
  window.onresize = function () {
    renderer.set_canvas_size(window.innerWidth, window.innerHeight);
    camera.camera.update_aspect(window.innerWidth / window.innerHeight);
  };

  window.onresize();
  document.body.appendChild(renderer.gl.canvas);

  app.default_light = app.create_entity({
    components: {
      'transform': { position: [220, 220, 220] },
      'render_item': {
        items: [new raw.shading.light({
          cast_shadows: true,
          shadow_map_size: 2048,
          shadow_camera_distance: 20
        })]
      },
      'transform_controller': { rotate: [RD(-125), RD(160), 0] }
    }
  });

  app.mouse_input.mouse_drage = function (dx, dy, e) {
    camera.transform_controller.move_left_right(-dx * 0.1);
    camera.transform_controller.move_up_down(dy * 0.1);
    app.fps_timer.invalidate_loop();

  };

  app.mouse_input.mouse_drage2 = function (dx, dy, e) {
    if (e.ctrlKey) {
      app.default_light.transform_controller.yaw_pitch(-dy * 0.005, -dx * 0.005);
    }
    else {
      camera.transform_controller.yaw_pitch(-dy * 0.005, -dx * 0.005);
      app.fps_timer.invalidate_loop();
    }

  };


  app.add_mesh = function (geo, mat, trans, cb) {
    var m = app.create_entity({
      components: {
        'transform': trans || {},
        'render_item': {
          items: [new raw.rendering.mesh({
            geometry: geo,
            material: mat || (new raw.shading.shaded_material())
          })]
        }
      }
    });
    if (cb) cb(m);
    return m;
  };

  app.create_entity({
    components: {
      'render_list': {
        camera: camera,
        layer: 1
      },
    }
  });

  app.add_random_grid = function (range, step, on_add, material) {
    var geos = [];
    geos.push(raw.geometry.cube({ size: 2, divs: 4 }));
    geos.push(raw.geometry.sphere({ divs: 16 }));
    material = material || raw.shading.shaded_material;
    var cc = 0;
    for (var x = -range; x <= range; x += step) {
      for (var z = -range; z <= range; z += step) {
        this.add_mesh(geos[Math.floor(Math.random() * geos.length)], new material(), {}, function (m) {
          m.transform.position[0] = x;
          m.transform.position[1] = 1;
          m.transform.position[2] = z;
          raw.math.vec3.random(m.render_item.items[0].material.ambient, 0.76);
          raw.math.vec3.random(m.render_item.items[0].material.diffuse, 0.75);
          raw.math.vec3.random(m.render_item.items[0].material.specular, 0.75);
          if (on_add) on_add(m, cc);
          cc++;
        });
      }
    }

    return cc;
  };
  
  app.mouse_input.mouse_up = function (x, y, e) {
    app.picking_color_id = 0;
    app.selected_mesh = null;
  };


  app.mouse_input.mouse_down = function (x, y, e) {
    app.picking_color_id = 0;
    if (e.buttons === 1) renderer.enable_pickables = true;
  };

  app.load_raw_skeleton = function (url, done, options) {
    options = options || {};
    raw.load_working_url(url, 'text', function (data) {
      var s = JSON.parse(data);
      console.log(s);
      var pre_scale = options.pre_scale || [0.2, 0.2, 0.2];
      var sk1 = app.create_entity({
        components: {
          'skeleton': {
            display: true,
            joints: s.joints,
            pre_scale: pre_scale,
            ik: options.ik
          },
          'transform': { position: options.position || [0, -0.1, 0] },
        }
      });
      if (options.mesh) {
        var g = raw.geometry.create(new Float32Array(s.vertices), new Float32Array(s.normals));
        g.scale_position_rotation(pre_scale[0], pre_scale[1], pre_scale[2], 0, 0, 0, 0, 0, 0);
        g.add_attribute("a_joints_indices", { data: new Float32Array(s.skin_indices), item_size: 4 });
        g.add_attribute("a_joints_weights", { data: new Float32Array(s.skin_weights), item_size: 4 });
        app.attach_component(sk1, 'render_item', {
          items: [new raw.skeleton_system.mesh({
            skeleton: sk1.skeleton,
            geometry: g, material: new raw.shading.shaded_material(options.mat || {
              cast_shadows: true, receive_shadows: true,
              wireframe: true, ambient: [1, 0, 0],
              transparent1: 0.9, specular: [0, 0, 0]

            })
          })]
        });
      }


      done(sk1);

    });

  };

  app.update_debug_canvas = function (ctx) {

  };
  app.picking_color_id = 0;
  var ctx = renderer.debug_canvas ? renderer.debug_canvas.ctx : undefined;
  app.begin_loop = function (cb, delay) {
    var last_fps_display_time = 0;
    app.fps_timer.loop(function (delta) {

      app.timer = app.fps_timer.current_timer;
      cb(delta);

      if (renderer.enable_pickables) {
        app.picking_color_id = renderer.read_picking_color_id(app.mouse_input.mouse_x, app.mouse_input.mouse_y);        
        renderer.enable_pickables = false;
      }

      if (app.fps_timer.current_timer - last_fps_display_time > 0.25) {
        last_fps_display_time = app.fps_timer.current_timer;
        if (ctx) {
          ctx.fillStyle = "rgba(0, 0, 0, 0)";
          ctx.clearRect(0, 0, renderer.debug_canvas.width, renderer.debug_canvas.height);
          ///ctx.beginPath();
          ctx.fillStyle = "#fff";
          ctx.font = "12px arial";
          ctx.fillText(app.fps_timer.fps + ' fps', 1, 10);
          for (i = 0; i < app._systems.length; i++) {
            sys = app._systems[i];
            ctx.fillText(
              sys.name_id + ' ' + sys.frame_time + ' ms /' + sys.worked_items
              , 1, (i * 20) + 30);
          }

          app.update_debug_canvas(ctx);
          renderer.update_debug_canvas();
        }
      }




    }, delay);
  };
  setTimeout(function () {
    camera.transform.require_update = 1;

  }, 100);


  cb(app, renderer, camera);




}
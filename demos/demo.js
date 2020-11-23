
var vec3 = raw.math.vec3, quat = raw.math.quat;
function RD(a) {
  return a * raw.math.DEGTORAD;
}
function RND(n) {
  return Math.random() * (n || 1);
}
function demo_app(def, cb) {  
  var my_app = new raw.application['3d'](
    raw.merge_object(def, {
      renderer: {},
      camera: {
        far: 8000
      }
    }, true)
  );

  console.log(my_app);
  window.onresize = function () {
    my_app.renderer.set_canvas_size(window.innerWidth, window.innerHeight);
    my_app.camera.camera.update_aspect(window.innerWidth / window.innerHeight);
  };

  window.onresize();
  document.body.appendChild(my_app.renderer.get_element());

  raw.mouse_input.disable_right_click();

  my_app.mouse_input = new raw.mouse_input(my_app.renderer.get_element());


  my_app.mouse_input.mouse_wheel = function (sp, e) {
    if (e.shiftKey) {
      my_app.camera.transform_controller.move_front_back(-0.005 * sp);
    }
    else my_app.camera.transform_controller.move_front_back(-0.01 * sp);
    my_app.fps_timer.invalidate_loop();
  };

  my_app.mouse_input.mouse_drage = function (dx, dy, e) {
    my_app.camera.transform_controller.yaw_pitch(-dy * 0.005, -dx * 0.005);
    my_app.fps_timer.invalidate_loop();  

  };

  my_app.mouse_input.mouse_drage2 = function (dx, dy, e) {
    my_app.camera.transform_controller.move_left_right(-dx * 0.1);
    my_app.camera.transform_controller.move_up_down(dy * 0.1);
    my_app.fps_timer.invalidate_loop();
  };

  my_app.update_mouse_camera_direction = function () {
    return my_app.camera.camera.set_drag_direction(
      my_app.mouse_input.mouse_x, app.mouse_input.mouse_y,
      my_app.mouse_input.elm_width, app.mouse_input.elm_height);
  };


  my_app.add_random_grid = function (range, step, on_add, material) {
    var geos = [];
    geos.push(raw.geometry.cube({ size: 2, divs: 4 }));
    geos.push(raw.geometry.sphere({ divs: 16 }));
    material = material || raw.shading.shaded_material;
    var cc = 0;
    for (var x = -range; x <= range; x += step) {
      for (var z = -range; z <= range; z += step) {
        my_app.create_render_item(new raw.rendering.mesh({
          geometry: geos[Math.floor(Math.random() * geos.length)],
          material: new material()
        }), function (e, m) {
            e.transform.position[0] = x;
            e.transform.position[1] = 1;
            e.transform.position[2] = z;
            raw.math.vec3.random(m.material.ambient, 0.76);
            raw.math.vec3.random(m.material.diffuse, 0.75);
            raw.math.vec3.random(m.material.specular, 0.75);
            if (on_add) on_add(e, cc);
            cc++;
        });
      }
    }
    return cc;
  };



  cb(my_app);



}
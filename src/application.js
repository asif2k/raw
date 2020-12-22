raw.application = {};
raw.application['3d'] = raw.define(function (proto, _super) {

  proto.after_render = function (renderer) {

  };
  proto.run_debug = function (cb,step_size) {
    var last_fps_display_time = 0, app = this, i = 0;
    setTimeout(function () {
      app.camera.transform.require_update = 1;
    }, 100);
    var ctx = app.renderer.debug_canvas ? app.renderer.debug_canvas.ctx : undefined;
    app.fps_timer.loop(function (delta) {

      app.timer = app.fps_timer.current_timer;
      cb(delta);
      app.tick_debug(delta);
      
      if (app.fps_timer.current_timer - last_fps_display_time > 0.25) {
        last_fps_display_time = app.fps_timer.current_timer;
        if (ctx) {
          ctx.fillStyle = "rgba(0, 0, 0, 0)";
          ctx.clearRect(0, 0, app.renderer.debug_canvas.width, app.renderer.debug_canvas.height);          
          ctx.fillStyle = "#fff";
          ctx.font = "12px arial";
          
          for (i = 0; i < app._systems.length; i++) {
            sys = app._systems[i];
            ctx.fillText(
              sys.name_id + ' ' + sys.frame_time + ' ms /' + sys.worked_items
              , 1, (i * 20) + 10);
          }
          ctx.fillText(app.fps_timer.fps + ' fps', 1, i*20+10);
          app.update_debug_canvas(ctx);
          app.renderer.update_debug_canvas();
        }
      }
      app.after_render(app.renderer);



    }, step_size);
  }

  proto.create_render_item = function (item, cb) {
    var m = this.create_entity({
      components: {
        'transform':  {},
        'render_item': {
          items: [item]
        }
      }
    });
    if (cb) cb(m, item);
    return m;
  };

  
  proto.update_debug_canvas = function () {

  };

  function _3d(def) {
    def = def || {};
    _super.apply(this, [def]);
    def.renderer = def.renderer || {};
    this.renderer = this.use_system('render_system',
      raw.merge_object(def.renderer, {
        show_debug_canvas: true,
        pixel_ratio: 1
      }, true));

    def.camera = def.camera || {};

    this.camera = this.create_entity({
      components: {
        'transform': def.camera.transform || {},
        'camera': raw.merge_object(def.camera, {
          type: 'perspective',
          far: 5000,
          near:0.1
        }, true) ,
        'transform_controller': def.camera.transform_controller || {}
      }
    });
   

    this.fps_timer = new raw.fps_timer();
    this.render_list = this.create_entity({
      components: {
        'render_list': {
          camera: this.camera,
          layer: 1
        },
      }
    });

  }

  return _3d;
}, raw.ecs);

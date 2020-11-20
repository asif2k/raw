


raw.ecs.register_component("render_item", raw.define(function (proto, _super) {

  proto.create = (function (_super) {
    return function (def, entity) {
      _super.apply(this, [def, entity]);
      this.items = def.items || [];
      this.version = 0;
      this.layers = 0;
      this.entity = entity;
      this.set_layer(def.layer || 1);
    }
  })(proto.create);

  proto.set_layer = function (layer) {
    layer = Math.pow(2, layer);
    if (!(this.layers & layer)) {
      this.layers |= layer;
    }
    return (this);
  };

  proto.unset_layer = function (layer) {
    layer = Math.pow(2, layer);
    if ((this.layers & layer) !== 0) {
      this.layers &= ~layer;
    }
    return (this);
  };

  proto.update_bounds = function (mat) { }
  function render_item(def) {
    _super.apply(this);
  }

  render_item.validate = function (component) {
    component.ecs.use_system('render_item_system');
  };

  return render_item;

}, raw.ecs.component));

raw.ecs.register_component("render_list", raw.define(function (proto, _super) {

  proto.create = (function (_super) {
    return function (def, entity) {
      _super.apply(this, [def, entity]);
      this.camera_version = -100;
      this.entity = entity;
      this.camera = def.camera || null;
      this.layer = (Math.pow(2, def.layer)) || 2;
      this.item_types = raw.ITEM_TYPES.LIGHT + raw.ITEM_TYPES.MESH;
      if (def.item_types) this.item_types = def.item_types;

      this.step_size = def.step_size || (1 / 15);
      this.last_step_time = 0;
      this.worked_items = 0;
    }
  })(proto.create);


  function render_list(def) {
    _super.apply(this);
    this.meshes = new raw.array();
    this.lights = new raw.array();
    this.failed_meshes = new raw.array();

  }

  render_list.validate = function (component) {
    component.ecs.use_system('render_list_system');
  };


  return render_list;

}, raw.ecs.component));


raw.ecs.register_system("render_list_system", raw.define(function (proto, _super) {
  proto.validate = function (ecs) {
    this.priority = ecs.use_system('render_system').priority - 1000;
    this.render_items = ecs.use_component("render_item").entities

    if (!this.debug_aabbs) {
      this.debug_aabbs = new raw.rendering.debug_aabbs();
      ecs.create_entity({
        components: {
          'transform': {},
          'render_item': {
            items: [this.debug_aabbs]
          }
        }
      });
    }

  };


  var list = null, camera = null, i = 0, render_item = null, item = null, ti = 0; items = null;
  proto.step = function () {

    if (this.display_aabb) this.debug_aabbs.clear();
    this.worked_items = 0;
    while ((entity = this.ecs.iterate_entities("render_list")) !== null) {
      list = entity.render_list;
      this.worked_items += list.worked_items;
      if (this.ecs.timer - list.last_step_time < list.step_size) {
        continue;
      }
      list.last_step_time = this.ecs.timer - ((this.ecs.timer - list.last_step_time) % list.step_size);
      list.worked_items = 0;
      camera = list.camera.camera;
      // if (list.camera_version === camera.version) continue;
      list.camera_version = camera.version;
      list.meshes.clear();
      list.lights.clear();
      list.failed_meshes.clear();


      for (i = 0; i < this.render_items.length; i++) {
        render_item = this.ecs.entities[this.render_items[i]].render_item;


        if (!(render_item.layers & list.layer)) continue;

        items = render_item.items;


        for (ti = 0; ti < items.length; ti++) {
          item = items[ti];

          if (item.item_type === raw.ITEM_TYPES.MESH && (item.flags & raw.DISPLAY_ALWAYS)) {
            list.worked_items++;
            list.meshes.push(item);
          }
          else if (item.bounds) {


            if (camera.aabb_aabb(item.bounds)) {
              if (this.display_aabb) this.debug_aabbs.add_aabb(item.bounds);
              if (camera.frustum_aabb(item.bounds)) {
                raw.math.vec3.transform_mat4(item.view_position, item.world_position, camera.view_inverse);
                if (item.item_type === raw.ITEM_TYPES.MESH) {
                  list.worked_items++;
                  list.meshes.push(item);
                }
                else if (item.item_type === raw.ITEM_TYPES.LIGHT) {
                  if (item.enabled) list.lights.push(item);
                }
              }
            }


          }
        }





      }





    }
  };

  return function render_list_system(def) {
    _super.apply(this, [def]);
    this.display_aabb = false;
    this.step_size *= 4;
  }

}, raw.ecs.system));

raw.ecs.register_system("render_item_system", raw.define(function (proto, _super) {

  var trans = null, entity = null, item = null, i = 0;
  proto.step = function () {
    this.worked_items = 0;
    while ((entity = this.ecs.iterate_entities("render_item")) !== null) {
      trans = entity.transform;
      if (trans.require_update !== 0) {
        for (i = 0; i < entity.render_item.items.length; i++) {
          item = entity.render_item.items[i]
          raw.math.quat.to_mat4(item.matrix_world, trans.rotation_world);
          raw.math.mat4.scale(item.matrix_world, trans.scale_world);
          item.matrix_world[12] = trans.position_world[0];
          item.matrix_world[13] = trans.position_world[1];
          item.matrix_world[14] = trans.position_world[2];
          item.update_bounds(item.matrix_world, trans);
          this.worked_items++;
          if (item.item_type === raw.ITEM_TYPES.OTHER) {
            item.initialize_item();
          }
        }
        entity.render_item.version += 0.000001;
      }
    }
  };
  proto.validate = function (ecs) {
    this.priority = ecs.use_system('render_list_system').priority - 100;
  };


  return function render_item_system(def) {
    _super.apply(this, [def]);
  }

}, raw.ecs.system));
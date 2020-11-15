
raw.ecs.register_component("transform", raw.define(function (proto, _super) {

  proto.create = (function (_super_call) {
    return function (def, entity) {
      _super_call.apply(this, [def, entity]);
      if (def.position) {
        raw.math.vec3.set(this.position, def.position[0], def.position[1], def.position[2]);
      }
      else {
        raw.math.vec3.set(this.position, 0, 0, 0);
      }
      if (def.scale) {
        raw.math.vec3.set(this.scale, def.scale[0], def.scale[1], def.scale[2]);
      }
      else {
        raw.math.vec3.set(this.scale, 1, 1, 1);
      }
      if (def.rotation) {
        raw.math.quat.set(this.rotation, def.rotation[0], def.rotation[1], def.rotation[2], def.rotation[3]);
      }
      else {
        raw.math.quat.set(this.rotation, 0, 0, 0, 1);
      }
      this.require_update = 1;
      this.parent = null;
      this.flags = 0;
      this.version = 0;

    }
  })(proto.create);

  proto.set_update = function (v) {
    this.require_update = Math.max(this.require_update, v);
  };

  proto.rotate_eular = function (x, y, z) {
    raw.math.quat.rotate_eular(this.rotation, x, y, z);
    this.require_update = 1;
  };


  var trans_id = 0;

  function transform(component) {
    _super.apply(this, [component]);
    raw.assign(this, {
      position: component.mem.vec3(),
      scale: component.mem.vec3(),
      rotation: component.mem.quat(),
      position_world: component.mem.vec3(),
      scale_world: component.mem.vec3(),
      rotation_world: component.mem.quat(),
    });

    this.trans_id = trans_id++;
  }

  transform.validate = function (component) {
    component.ecs.use_system('transform_system');
    component.ecs.use_system('animation_system');
    if (!component.instances) {
      component.instances = [];
      component.set_instance = function (ins) {
        this.instances[this.instances.length] = ins;
      }
      var inx = 0;
      component.set_anim_target = function (trans, anim_target) {
        if (!anim_target) return;
        inx = anim_target.props[0];
        if (inx > -1) {
          trans.position_animated = trans.position_animated || this.mem.vec3();
          trans.flags = raw.set_flag(trans.flags, raw.TRANS.ANIMATED_POSITION);
        }

        inx = anim_target.props[1];
        if (inx > -1) {
          trans.scale_animated = trans.scale_animated || this.mem.vec3();
        }

        inx = anim_target.props[2];
        if (inx > -1) {
          trans.rotation_animated = trans.rotation_animated || this.mem.quat();
          trans.flags = raw.set_flag(trans.flags, raw.TRANS.ANIMATED_ROTATION);
        }

        trans.flags = raw.set_flag(trans.flags, raw.TRANS.ANIMATED);
        trans.anim_target = anim_target;

      }


      var max_transforms = component.ecs.globals['MAX_TRANSFORMS'] || 1024;

      component.mem = component.ecs.create_memory_block('transform', (
        (component.ecs.globals['MAX_TRANSFORMS'] || 1024) * 4) * 30);
    }

  };


  return transform;

}, raw.ecs.component));

raw.ecs.register_component("transform_controller", raw.define(function (proto, _super) {

  proto.create = (function (_super_call) {
    return function (def, entity) {
      _super_call.apply(this, [def, entity]);
      if (def.rotate) {
        raw.math.vec3.copy(this.rotate, def.rotate);
      }
      this.transform = entity.transform;
      this.rotate_eular(this.rotate[0], this.rotate[1], this.rotate[2]);

    }
  })(proto.create);


  proto.rotate_eular = function (x, y, z) {
    raw.math.quat.rotate_eular(this.transform.rotation, x, y, z);
    this.transform.require_update = 1;
  };
  proto.yaw_pitch = function (dx, dy) {
    this.rotate[0] += dx;
    this.rotate[1] += dy;
    this.rotate_eular(this.rotate[0], this.rotate[1], this.rotate[2]);
  };


  function transform_controller(component) {
    _super.apply(this, [component]);
    this.rotate = raw.math.vec3(0, 0, 0);
  }

  return transform_controller;

}, raw.ecs.component));


raw.ecs.register_system("transform_system", raw.define(function (proto, _super) {


  proto.validate = function (ecs) {
    this.comp = ecs.use_component('transform');
    this.transforms = this.comp.instances;
  }
  var i = 0, trans = null, temp_pos = raw.math.vec3(),anim_target=null;
  var local_scale = null, local_rotation = null, local_position = null;  


  proto.step = function () {
    this.worked_items = 0;
    for (i = 0; i < this.transforms.length; i++) {
      trans = this.transforms[i];

      if (trans.flags & raw.TRANS.ANIMATED) {
        anim_target = trans.anim_target;
        if (anim_target.status === 1) {
          inx = anim_target.props[0];
          if (inx > -1) {
            trans.position_animated[0] = trans.position[0] + anim_target.output[inx];
            trans.position_animated[1] = trans.position[1] + anim_target.output[inx + 1];
            trans.position_animated[2] = trans.position[2] + anim_target.output[inx + 2];
            trans.require_update = 1;
          }

          inx = anim_target.props[1];
          if (inx > -1) {
            trans.scale_animated[0] = trans.scale[0] * anim_target.output[inx];
            trans.scale_animated[1] = trans.scale[1] * anim_target.output[inx + 1];
            trans.scale_animated[2] = trans.scale[2] * anim_target.output[inx + 2];
            trans.require_update = 1;
          }

          inx = anim_target.props[2];
          if (inx > -1) {
            raw.math.quat.multiply2(trans.rotation_animated, trans.rotation,
              anim_target.output[inx], anim_target.output[inx + 1], anim_target.output[inx + 2], anim_target.output[inx + 3]
            );
            trans.require_update = 1;
          }
        }

      }



    }


    this.process(this.transforms, 1);
   
   
  };

  proto.process_transforms = function (transforms, update_flag) {
    for (i = 0; i < transforms.length; i++) {
      trans = transforms[i];

      local_scale = trans.scale;
      local_position = trans.position;
      local_rotation = trans.rotation;

      if (trans.parent !== null) {

        if (trans.parent.require_update === update_flag) trans.require_update = trans.parent.require_update;

        if (trans.require_update === update_flag) {


          raw.math.quat.multiply(trans.rotation_world, trans.parent.rotation_world, local_rotation);
          trans.scale_world[0] = trans.parent.scale_world[0] * local_scale[0];
          trans.scale_world[1] = trans.parent.scale_world[1] * local_scale[1];
          trans.scale_world[2] = trans.parent.scale_world[2] * local_scale[2];
          if (trans.flags & raw.TRANS.SCABLABLE) {
            temp_pos[0] = local_position[0] * trans.parent.scale_world[0];
            temp_pos[1] = local_position[1] * trans.parent.scale_world[1];
            temp_pos[2] = local_position[2] * trans.parent.scale_world[2];
            raw.math.vec3.transform_quat(temp_pos, temp_pos, trans.parent.rotation_world);
          }
          else {
            raw.math.vec3.transform_quat(temp_pos, local_position, trans.parent.rotation_world);
          }
          trans.position_world[0] = temp_pos[0] + trans.parent.position_world[0];
          trans.position_world[1] = temp_pos[1] + trans.parent.position_world[1];
          trans.position_world[2] = temp_pos[2] + trans.parent.position_world[2];

          this.worked_items++;
        }
      }
      else if (trans.require_update === update_flag) {
        trans.scale_world[0] = local_scale[0];
        trans.scale_world[1] = local_scale[1];
        trans.scale_world[2] = local_scale[2];

        trans.position_world[0] = local_position[0];
        trans.position_world[1] = local_position[1];
        trans.position_world[2] = local_position[2];

        trans.rotation_world[0] = local_rotation[0];
        trans.rotation_world[1] = local_rotation[1];
        trans.rotation_world[2] = local_rotation[2];
        trans.rotation_world[3] = local_rotation[3];
        this.worked_items++;
      }


   





    }

  };


  proto.process = function (transforms,update_flag) {
    for (i = 0; i < transforms.length; i++) {
      trans = transforms[i];

      local_scale = trans.scale;
      local_position = trans.position;
      local_rotation = trans.rotation;


      if (trans.flags & raw.TRANS.ANIMATED_ROTATION || trans.flags & raw.TRANS.IK_ANIMATED) {
        local_rotation = trans.rotation_animated;
      }

      if (trans.parent !== null) {

        if (trans.parent.require_update === update_flag || trans.parent.require_update === 100) trans.require_update = update_flag;

        if (trans.require_update === update_flag) {
          raw.math.quat.multiply(trans.rotation_world, trans.parent.rotation_world, local_rotation);
          trans.scale_world[0] = trans.parent.scale_world[0] * local_scale[0];
          trans.scale_world[1] = trans.parent.scale_world[1] * local_scale[1];
          trans.scale_world[2] = trans.parent.scale_world[2] * local_scale[2];
          if (trans.flags & raw.TRANS.SCABLABLE) {
            temp_pos[0] = local_position[0] * trans.parent.scale_world[0];
            temp_pos[1] = local_position[1] * trans.parent.scale_world[1];
            temp_pos[2] = local_position[2] * trans.parent.scale_world[2];
            raw.math.vec3.transform_quat(temp_pos, temp_pos, trans.parent.rotation_world);
            
          }
          else {
            raw.math.vec3.transform_quat(temp_pos, local_position, trans.parent.rotation_world);
          }
          trans.position_world[0] = temp_pos[0] + trans.parent.position_world[0];
          trans.position_world[1] = temp_pos[1] + trans.parent.position_world[1];
          trans.position_world[2] = temp_pos[2] + trans.parent.position_world[2];

          this.worked_items++;
        }
      }
      else if (trans.require_update === update_flag) {
        trans.scale_world[0] = local_scale[0];
        trans.scale_world[1] = local_scale[1];
        trans.scale_world[2] = local_scale[2];

        trans.position_world[0] = local_position[0];
        trans.position_world[1] = local_position[1];
        trans.position_world[2] = local_position[2];

        trans.rotation_world[0] = local_rotation[0];
        trans.rotation_world[1] = local_rotation[1];
        trans.rotation_world[2] = local_rotation[2];
        trans.rotation_world[3] = local_rotation[3];
        this.worked_items++;
      }






    }

  };

  proto.step_end = function () {
    for (i = 0; i < this.transforms.length; i++) {
      trans = this.transforms[i];
      if (trans.require_update < 0) trans.require_update = Math.abs(trans.require_update);
      else trans.require_update = 0;
    }
  };

  proto.create_transform = function (def) {
    var ins = new this.comp.creator(this.comp);
    ins.create(def, null, this.ecs);
    this.comp.set_instance(ins, this.ecs);
    return ins;
  };

  return function transform_system(def, ecs) {
    _super.apply(this, [def, ecs]);
    this.priority = 100;    
  }

}, raw.ecs.system));
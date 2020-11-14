raw.transform = {};

raw.ecs.register_component("transform", raw.define(function (proto, _super) {

  proto.create = (function (_super_call) {
    return function (def,entity) {
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




      component.mem = component.ecs.create_memory_block('transform', (1024 * 4) * 30);
    }
    
  };
  

  return transform;

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






raw.ecs.register_system("animation_system", raw.define(function (proto, _super) {
  
  var mixer = null, item = null;
  
  proto.validate = function (ecs) {
    this.priority = ecs.use_system('transform_system').priority - 50;
  };


  function animation_system(def, ecs) {
    _super.apply(this, [def, ecs]);
    this.mixers = new raw.linked_list();
    //this.step_size *= 2;
  }

  proto.step = function () {    
    item = this.mixers.head;
    while (item !== null) {
      mixer = item.data;
      
      mixer.update(this.time_delta);
      item = item.next;
    }

  };
  proto.create_mixer = function () {
    mixer = new animation_system.mixer();
    this.mixers.add_data(mixer);
    return mixer;
  }


  animation_system.vector_props = {
    'position': { index: 0, size: 3 },
    'scale': { index: 1, size: 3 },
    'rotation': { index: 2, size: 4 },
    'eular': { index: 3, size: 3 },
    'axis': { index: 4, size: 3 }
  };
  animation_system.vector_props_get_size = (function () {
    var k = "", cc = 0;
    return function () {
      cc = 0;
      for (k in animation_system.vector_props) {
        cc++
      }
      return cc++;
    }
  })();
  animation_system.compile_animation = (function () {
     
    var oi = 0, vprop = null, tr = null, tar = null;
    return function (anim) {
      anim.targets = {};
      oi = 0;


      anim.blocks.forEach(function (b, bi) {

        if (b.repeat === undefined) b.repeat = 0;
        b.repeat_delay = b.repeat_delay || 0;
        b.start = b.start || 0;
        b.length = b.length || 1;
        b.ilength = 1 / b.length;
        b.block_type = 0;
        if (b.enabled === undefined) b.enabled = true;
        if (b.data_type === "vec2") {
          b.fr_type = 1;
          b.fr_size = 2;
        }
        else if (b.data_type === "vec3") {
          b.fr_type = 2;
          b.fr_size = 3;
        }
        else if (b.data_type === "vec4") {
          b.fr_type = 3;
          b.fr_size = 4;
        }
        else if (b.data_type === "quat") {
          b.fr_type = 4;
          b.fr_size = 4;
        }
        else {
          b.fr_type = 0;
          b.fr_size = 1;
        }
        if (b.type === "flat") {
          b.block_type = 1;
          b.total_frames = Math.floor(b.frames.length / b.fr_size) - 1;
          b.time_per_frame = 1 / (b.total_frames);
        }
        tr = b.target.split(".");

        vprop = animation_system.vector_props[tr[1]];
        if (vprop) {
          tar = anim.targets[tr[0]];
          if (!tar) {
            tar = new Int16Array(animation_system.vector_props_get_size());
            tar.fill(-1);
            anim.targets[tr[0]] = tar;
          }


          if (tar[vprop.index] === -1) {
            tar[vprop.index] = oi;
          }
          b.oi = tar[vprop.index];
          if (tr.length === 3) {
            b.oi += ('xyzw'.indexOf(tr[2]));
          }
          oi += vprop.size;
        }


      });
      anim.oi = oi;
      vprop = null; tr = null; tar = null;
      anim.compiled = true;


    }
  })();


  animation_system.run = (function () {    
    var bi=0, fi = 0, f1 = 0, f2 = 0, j = 0, fr_size = 0, pi = 0, oi = 0;
    var temp_quat1 = raw.math.quat(), temp_quat2 = raw.math.quat();
    var frames = null, output = null, btime = 0, time1 = 0, v1 = 0, v2 = 0, v3 = 0, v4 = 0;

    return function (anim, output, time) {

      for (bi = 0; bi < anim.blocks.length; bi++) {
        block = anim.blocks[bi];
        if (block.enabled === false) continue;
        if (time > block.start) {
          if (block.repeat === 0) {
            btime = ((time - block.start) % block.length) * block.ilength;
          }
          else if (time - block.start < block.repeat * block.length) {
            btime = ((time - block.start) % block.length) * block.ilength;
          }
          else { continue; }


          if (block.process) {
            block.process(output, btime, block.oi);
            continue;
          }

          oi = block.oi;
          frames = block.frames;
          v1 = 0; v2 = 0; v3 = 0; v4 = 0;
          if (block.block_type === 1) {
            f1 = Math.floor(block.total_frames * btime);
            f2 = ((f1 + 1) * block.fr_size);
            time1 = block.time_per_frame * f1;
            f1 *= block.fr_size;
            j = (btime - time1) / ((time1 + block.time_per_frame) - time1);

            if (block.fr_type === 0) {
              v1 = frames[f1] + (frames[f2] - frames[f1]) * j;
            }
            else if (block.fr_type === 1) {
              v1 = frames[f1] + (frames[f2] - frames[f1]) * j;
              v2 = frames[f1 + 1] + (frames[f2 + 1] - frames[f1 + 1]) * j;
            }
            else if (block.fr_type === 2) {
              v1 = frames[f1] + (frames[f2] - frames[f1]) * j;
              v2 = frames[f1 + 1] + (frames[f2 + 1] - frames[f1 + 1]) * j;
              v3 = frames[f1 + 2] + (frames[f2 + 2] - frames[f1 + 2]) * j;
            }
            else if (block.fr_type === 3) {
              v1 = frames[f1] + (frames[f2] - frames[f1]) * j;
              v2 = frames[f1 + 1] + (frames[f2 + 1] - frames[f1 + 1]) * j;
              v3 = frames[f1 + 2] + (frames[f2 + 2] - frames[f1 + 2]) * j;
              v4 = frames[f1 + 3] + (frames[f2 + 3] - frames[f1 + 3]) * j;
            }
            else if (block.fr_type === 4) {
              raw.math.quat.slerp_flat(temp_quat1,
                frames[f1], frames[f1 + 1], frames[f1 + 2], frames[f1 + 3],
                frames[f2], frames[f2 + 1], frames[f2 + 2], frames[f2 + 3],
                j
              );
              v1 = temp_quat1[0];
              v2 = temp_quat1[1];
              v3 = temp_quat1[2];
              v4 = temp_quat1[3];
            }

            output[oi] += v1;
            output[oi + 1] += v2;
            output[oi + 2] += v3;
            output[oi + 3] += v4;
          }
          else {
            fr_size = block.fr_size + 1;

            j = 0; pi = 0;

            if (frames.length > 2) {
              for (fi = 0; fi < frames.length; fi += fr_size) {
                if (fi > 0) {
                  if (btime >= j && btime <= frames[fi] + 0.000001) {
                    pi = fi;
                    break;
                  }
                }
                j = frames[fi];
              }

            }
            else {
              pi = fr_size;
            }

            if (pi > 0) {
              f1 = pi - fr_size;
              f2 = pi;
              j = (btime - frames[f1]) / (frames[f2] - frames[f1]);

              if (block.fr_type === 0) {
                v1 = frames[f1 + 1] + (frames[f2 + 1] - frames[f1 + 1]) * j;
              }
              else if (block.fr_type === 1) {
                v1 = frames[f1 + 1] + (frames[f2 + 1] - frames[f1 + 1]) * j;
                v2 = frames[f1 + 2] + (frames[f2 + 2] - frames[f1 + 2]) * j;
              }
              else if (block.fr_type === 2) {
                v1 = frames[f1 + 1] + (frames[f2 + 1] - frames[f1 + 1]) * j;
                v2 = frames[f1 + 2] + (frames[f2 + 2] - frames[f1 + 2]) * j;
                v3 = frames[f1 + 3] + (frames[f2 + 3] - frames[f1 + 3]) * j;
              }
              else if (block.fr_type === 3) {
                v1 = frames[f1 + 1] + (frames[f2 + 1] - frames[f1 + 1]) * j;
                v2 = frames[f1 + 2] + (frames[f2 + 2] - frames[f1 + 2]) * j;
                v3 = frames[f1 + 3] + (frames[f2 + 3] - frames[f1 + 3]) * j;
                v4 = frames[f1 + 4] + (frames[f2 + 4] - frames[f1 + 4]) * j;
              }
              else if (block.fr_type === 4) {
                raw.math.quat.slerp_flat(temp_quat1,
                  frames[f1 + 1], frames[f1 + 2], frames[f1 + 3], frames[f1 + 4],
                  frames[f2 + 1], frames[f2 + 2], frames[f2 + 3], frames[f2 + 4],
                  j
                );
                v1 = temp_quat1[0];
                v2 = temp_quat1[1];
                v3 = temp_quat1[2];
                v4 = temp_quat1[3];

              }

              output[oi] += v1;
              output[oi + 1] += v2;
              output[oi + 2] += v3;
              output[oi + 3] += v4;


            }
          }

        }
      }

    }

  })();

  animation_system.mixer = raw.define(function (proto) {
    var i = 0, t = "", tar = null, tar_ref = null, inx = 0, anim_rec = null, weight = 0;
    proto.add_animation = function (anim, length, weight) {
      if (!anim.compiled) {
        animation_system.compile_animation(anim);
      }
      anim_rec = [anim, length, weight, new Float32Array(anim.oi)];
      this.animations.push(anim_rec);
      for (t in anim.targets) {
        tar = anim.targets[t];
        tar_ref = this.targets[t];
        if (!tar_ref) {
          tar_ref = { name: t, status: 1, props: new Int16Array(3), output: new Float32Array(10) };
          tar_ref.props.fill(-1);
          this.targets[t] = tar_ref;
          this._targets.push(tar_ref);
        }
        this.anim_targets.push([tar_ref, tar, anim_rec[3], weight]);

        if (tar[0] > -1) {
          tar_ref.props[0] = 0;
        }
        if (tar[1] > -1) {
          tar_ref.props[1] = 3;
        }
        if (tar[2] > -1) {
          tar_ref.props[2] = 6;
        }
        if (tar[3] > -1) {
          tar_ref.props[2] = 6;
        }
      }
    }
    var tar = null, input = null, output = null, anim_rotation = raw.math.quat();
    proto.update = function (time_delta) {
      for (i = 0; i < this.animations.length; i++) {
        anim_rec = this.animations[i];

        anim_rec[3].fill(0);
        animation_system.run(anim_rec[0], anim_rec[3],
          ((this.clock % anim_rec[1]) / anim_rec[1])
          + Math.floor(this.clock / anim_rec[1])
        );
      }
      for (i = 0; i < this._targets.length; i++) {
        this._targets[i].output.fill(0);


      }
      for (i = 0; i < this.anim_targets.length; i++) {
        anim_rec = this.anim_targets[i];
        tar = anim_rec[1];
        input = anim_rec[2];
        output = anim_rec[0].output;
        weight = anim_rec[3];


        inx = tar[0];
        if (inx > -1) {
          output[0] += input[inx] * weight;
          output[1] += input[inx + 1] * weight;
          output[2] += input[inx + 2] * weight;
        }

        inx = tar[1];
        if (inx > -1) {
          output[3] += input[inx] * weight;
          output[4] += input[inx + 1] * weight;
          output[5] += input[inx + 2] * weight;
        }

        inx = tar[2];
        if (inx > -1) {
          output[6] += input[inx] * weight;
          output[7] += input[inx + 1] * weight;
          output[8] += input[inx + 2] * weight;
          output[9] += input[inx + 3] * weight;
        }

        inx = tar[3];
        if (inx > -1) {
          raw.math.quat.rotate_eular(anim_rotation,
            input[inx],
            input[inx + 1],
            input[inx + 2]);

          output[6] += anim_rotation[0] * weight;
          output[7] += anim_rotation[1] * weight;
          output[8] += anim_rotation[2] * weight;
          output[9] += anim_rotation[3] * weight;
        }




      }
      this.clock += time_delta;
    }
    function mixer() {
      this.clock = 0;
      this.animations = [];
      this.targets = {};
      this._targets = [];
      this.anim_targets = [];
    }
   
    return mixer;
  });


  var inx = 0;
  proto.set_anim_targets = function (trans, anim_target) {
    if (!anim_target) return;  
    trans.flags = raw.set_flag(trans.flags, raw.TRANS.ANIMATED);
    trans.anim_target = anim_target;

  }



  return animation_system;
}, raw.ecs.system));











raw.ecs.register_component("camera", raw.define(function (proto, _super) {
 
  proto.create = (function (_super_call) {
    return function (def, entity) {
      _super_call.apply(this, [def, entity]);

      this.entity = entity;
      this.update_view_projection = true;
      this.type = def.type || "perspective";
      if (this.type === "perspective") {
        this.fov = (def.fov !== undefined ? def.fov : 50) * raw.math.DEGTORAD;
        this.near = def.near !== undefined ? near : 0.1;
        this.far = def.far !== undefined ? def.far : 1000;
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


  proto.yaw_pitch = function (dx, dy) {
    this.rotate[0] += dx;
    this.rotate[1] += dy;
    raw.math.quat.rotate_eular(this.entity.transform.rotation, this.rotate[0], this.rotate[1], this.rotate[2]);
    this.entity.transform.require_update = 1;
  };

  proto.set_rotate = function (x, y, z) {
    this.rotate[0] = x;
    this.rotate[1] = y;
    this.rotate[2] = z;
    raw.math.quat.rotate_eular(this.entity.transform.rotation, this.rotate[0], this.rotate[1], this.rotate[2]);
    this.entity.transform.require_update = 1;
  };

  proto.set_position = function (x, y, z) {
    this.entity.transform.position[0] = x;
    this.entity.transform.position[1] = y;
    this.entity.transform.position[2] = z;
    this.entity.transform.require_update = 1;
  };

  proto.move_front_back = function (sp) {

    this.entity.transform.position[0] += this.fw_vector[0] * sp;
    this.entity.transform.position[1] += this.fw_vector[1] * sp;
    this.entity.transform.position[2] += this.fw_vector[2] * sp;
    this.entity.transform.require_update = 1;
  };

  proto.move_left_right = function (sp) {
    this.entity.transform.position[0] += this.sd_vector[0] * sp;
    this.entity.transform.position[1] += this.sd_vector[1] * sp;
    this.entity.transform.position[2] += this.sd_vector[2] * sp;
    this.entity.transform.require_update = 1;
  };

  proto.move_up_down = function (sp) {
    this.entity.transform.position[0] += this.up_vector[0] * sp;
    this.entity.transform.position[1] += this.up_vector[1] * sp;
    this.entity.transform.position[2] += this.up_vector[2] * sp;
    this.entity.transform.require_update = 1;
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
    return function (mouse_ray, mouse_x, mouse_y, width, height) {
      const invMat = m4.inverse(viewProjection);
      const start = m4.transformPoint(invMat, [clipX, clipY, -1]);
      const end = m4.transformPoint(invMat, [clipX, clipY, 1]);
      v[0] = (mouse_x / width) * 2 - 1;
      v[1] = -(mouse_y / height) * 2 + 1;
      v[2] = -1;
      v[3] = 1;
      raw.math.vec3.transform_mat4(v, v, this.view_projection_inverse);
      v[2] = 1;
      v[3] = 0;
      raw.math.vec3.transform_mat4(mouse_ray, v, this.view_inverse);            
      raw.math.vec3.normalize(mouse_ray, mouse_ray);
    //  mouse_ray[0] = this.world_position[0] + mouse_ray[0];
    //  mouse_ray[1] = this.world_position[1] + mouse_ray[1];
    //  mouse_ray[2] = this.world_position[2] + mouse_ray[2];

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

    this.rotate = raw.math.vec3(0, 0, 0);

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


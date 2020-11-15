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
    var bi = 0, fi = 0, f1 = 0, f2 = 0, j = 0, fr_size = 0, pi = 0, oi = 0;
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
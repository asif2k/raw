(function () {
  raw.skeleton_system = {};
  var glsl = raw.webgl.shader.create_chunks_lib(import('systems/skeleton_system.glsl'));


  raw.ecs.register_component("skeleton", raw.define(function (proto, _super) {

    proto.create = (function (_super) {
      var self, t, bind_pos = [], ik_chain = null;
      return function (def, entity, ecs) {
        _super.apply(this, [def, entity, ecs]);

        this.skinned_joints.length = 0;
        this.joints.length = 0;
        this.display = def.display || false;

        this.ecs = ecs;
        def.joints.for_each(function (j, i, self) {
          joint = ecs.create_entity({
            components: {
              'transform': {
                position: j.position || j.pos,
                rotation: j.rotation || j.rot,
                scale: j.scale,
                scaleable: false,
              },
            }
          });
          if (j.eular) {
            raw.math.quat.rotate_eular(joint.transform.rotation, j.eular[0], j.eular[1], j.eular[2]);
          }

          if (def.pre_scale) {
            raw.math.vec3.multiply(joint.transform.position, joint.transform.position, def.pre_scale);



          }

          raw.assign(joint, {
            name: j.name || ('j' + i), length: 0, parent: null,
            skin_index: (def.all_skin_joints ? i : j.skin_index),
            cone: j.cone
          });

          if (j.skin_index !== undefined) joint.skin_index = j.skin_index;
          if (joint.skin_index === undefined) joint.skin_index = -1;

          if (joint.skin_index > -1) {

            joint.bind_transform = joint.bind_transform || raw.math.dquat();
            joint.joint_transform = joint.joint_transform || raw.math.dquat();


            if (j.bind_pos && j.bind_pos.length === 16) {
              joint.set_bind_pos = false;
              raw.math.mat4.copy(bind_pos, j.bind_pos);
              if (def.pre_scale) {
                bind_pos[12] *= def.pre_scale[0];
                bind_pos[13] *= def.pre_scale[1];
                bind_pos[14] *= def.pre_scale[2];
              }
              raw.math.dquat.from_mat4(joint.bind_transform, bind_pos);
            }
            else {
              joint.set_bind_pos = true;
            }



          }


          if (j.pn !== undefined) {
            j.pr = self[j.pn].index;
          }


          if (j.pr === undefined && i > 0) {
            joint.transform.parent = self.joints[i - 1].transform;
            joint.parent = self.joints[i - 1];
          }
          else if (j.pr > -1) {
            joint.transform.parent = self.joints[j.pr].transform;
            joint.parent = self.joints[j.pr];

          }

          joint.index = self.joints.length;
          self[joint.name] = joint;
          self.joints[self.joints.length] = joint;

          if (joint.skin_index > -1) {
            self.skinned_joints[joint.skin_index] = joint;
          }

        }, this);

        if (def.ik) {
          self = this;
          if (def.ik.effectors) {
            for (t in def.ik.effectors) {
              this.ik_effectors[t] = def.ik.effectors[t];
            }
          }
          if (def.ik.chains) {
            def.ik.chains.forEach(function (ch) {
              self.create_ik_chain(ch);
            });
          }
        }

        this.joints[0].transform.parent = entity.transform;

        this.version = 0;
        this.needs_update = 0;
        this.entity = entity;
        this.initialized = false;

      }
    })(proto.create);

    proto.add_joint = function (j) {
      joint = this.ecs.create_entity({
        components: {
          'transform': {
            position: j.position || j.pos,
            rotation: j.rotation || j.rot,
            scale: j.scale,
            scaleable: false,
          },
        }
      });

      if (j.eular) {
        raw.math.quat.rotate_eular(joint.transform.rotation, j.eular[0], j.eular[1], j.eular[2]);
      }

      raw.assign(joint, {
        name: j.name || ('joint' + i), length: 0, parent: null
      });

      if (j.skin_index !== undefined) joint.skin_index = j.skin_index;
      if (joint.skin_index === undefined) joint.skin_index = -1;

      if (joint.skin_index > -1) {
        joint.bind_transform = joint.bind_transform || raw.math.dquat();
        joint.joint_transform = joint.joint_transform || raw.math.dquat();
        joint.set_bind_pos = true;
      }
      joint.transform.bind_pos = raw.math.vec3();
      joint.transform.bind_rot = raw.math.quat();
      if (j.pn !== undefined) {
        j.pr = this[j.pn].index;
      }

      if (j.pr === undefined && i > 0) {
        joint.transform.parent = this.joints[i - 1].transform;
        joint.parent = this.joints[i - 1];
      }
      else if (j.pr > -1) {
        joint.transform.parent = this.joints[j.pr].transform;
        joint.parent = this.joints[j.pr];

      }

      joint.index = this.joints.length;
      this[joint.name] = joint;
      this.joints[this.joints.length] = joint;

      if (joint.skin_index > -1) {
        this.skinned_joints[joint.skin_index] = joint;
      }

      return joint;
    };
    proto.create_ik_chain = function (ch) {
      self = this;
      ik_chain = {
        pole: null, needs_update: true, pole_force: 0,
        root_pos: [0, 0, 0],
        effector: null, joints: [], iterations: ch.iterations || 10
      };

      if (ch.pole) {
        if (raw.is_string(ch.pole)) {
          ik_chain.pole = self.ik_effectors[ch.pole];
        }
        else {
          ik_chain.pole = ch.pole;
        }
        ik_chain.pole_force = ch.pole_force || 0.1;
      }

      if (ch.effector) {
        if (raw.is_string(ch.effector)) {
          ik_chain.effector = self.ik_effectors[ch.effector];
        }
        else {
          ik_chain.effector = ch.effector;
        }
      }


      ik_chain.enabled = ch.enabled === undefined ? true : ch.enabled;
      ik_chain.continuous = ch.continuous;
      if (!ch.joints) {
        this.joints.forEach(function (joint) {
          if (joint.skin_index > -1) {
            joint.ik_rotate = joint.ik_rotate || raw.math.quat();
            ik_chain.joints.push(joint);
          }

        });
      }
      else {
        ch.joints.forEach(function (j, i) {
          joint = self[j];
          if (i === 0) {
            if (!joint.ik_rotate) {
              joint.ik_rotate = [0, 0, 0, 0];
              joint.ik_pos = [0, 0, 0];
              joint.ik_count = 0;
              joint.ik_chain_updated = false;
              self.ik_roots[joint.index] = joint;
            }
            else {
              joint.ik_count++;
            }

          }

          ik_chain.joints.push(joint);
        });
      }
      this.ik_chains[this.ik_chains.length] = ik_chain;

      ik_chain.root = ik_chain.joints[0];

      return ik_chain;
    }


    function skeleton(def) {
      _super.apply(this);
      this.skinned_joints = [];
      this.joints = [];
      this.ik_chains = [];
      this.ik_effectors = {};
      this.ik_joints = [];
      this.ik_roots = [];
      this.transforms = [];
      this.ik_trackers = [];

    }


    skeleton.validate = function (component) {
      component.ecs.use_system('skeleton_system');
    };


    return skeleton;

  }, raw.ecs.component));


  raw.ecs.register_system("skeleton_system", raw.define(function (proto, _super) {

    proto.resolve_ik_chain = (function () {
      var vec3 = raw.math.vec3, quat = raw.math.quat;
      var i = 0, ln = 0, j = null, p = null, posi = [], polars = [], roti = [], lp = null,
        v1 = [0, 0, 0], v2 = [0, 0, 0], v3 = [0, 0, 0];
      for (i = 0; i < 10; i++) {
        posi[i] = [0, 0, 0];
        polars[i] = [0, 0, 0];
        roti[i] = [0, 0, 0, 1];
      }

      var q1 = raw.math.quat(), q2 = raw.math.quat(), q3 = raw.math.quat();
      var thr = 0.01, ln2 = 0, ter = 0, tg = null;
      var clen = 0, k = 0, thg = thr * thr;
      var cv = raw.math.vec3(), cvs = [0, 0, 0], cvl = 0, k = 0, cvn = 0;

      var limit_joint = function (j, limit) {
        if (limit !== undefined) {

          if (i > 1) {
            raw.math.vec3.subtract(v2, posi[i - 1], posi[i - 2]);
            raw.math.vec3.normalize(v2, v2);
            raw.math.vec3.scale(v2, v2, j.length);
            raw.math.vec3.add(v2, v2, posi[i - 1]);
          }
          else {

            raw.math.vec3.subtract(v2, posi[i - 1], j.parent.transform.parent.position_world);
            raw.math.vec3.normalize(v2, v2);
            raw.math.vec3.scale(v2, v2, j.length);
            raw.math.vec3.add(v2, v2, posi[i - 1]);
          }


          raw.math.vec3.subtract(cv, posi[i], v2);
          ln = Math.sqrt(cv[0] * cv[0] + cv[2] * cv[2]);
          raw.math.vec3.subtract(cv, posi[i], v2);
          cvl = Math.atan2(cv[0], cv[2]);
          cvn = Math.sign(cvl);
          if (j.limit[0] === j.limit[1]) {
            v3[0] = (Math.cos(j.limit[0]) * ln) * cvn;
            v3[2] = (Math.sin(j.limit[0]) * ln) * cvn;
          }
          else {
            cvl = Math.max(Math.min(cvl, j.limit[0]), j.limit[0]);
            v3[0] = (Math.cos(cvl) * ln);
            v3[2] = (Math.sin(cvl) * ln);
          }
          v3[1] = posi[i][1];

          posi[i][0] = v2[0] + v3[0];
          //posi[i][1] = posi[i - 1][1] + v3[1];
          posi[i][2] = v2[2] + v3[2];
          //raw.math.vec3.add(posi[i],v2, v3);

          /*
          
          raw.math.vec3.subtract(v3, posi[i], v2);
          raw.math.vec3.to_polar(v1, v3);
          
          v1[1] = Math.max(Math.min(v1[1], limit[3]), limit[2]);
          
  
          raw.math.vec3.from_polar(v3, v1[0], v1[1], v1[2]);
          raw.math.vec3.add(posi[i], v2, v3);
          */
          raw.math.vec3.subtract(cv, posi[i], v1);
          ln = Math.sqrt(cv[0] * cv[0] + cv[1] * cv[1] + cv[2] * cv[2]);
          if (ln > j.limit[2]) {
            cvl = j.limit[2] - ln;
            raw.math.vec3.subtract(cv, posi[i], v1);
            raw.math.vec3.normalize(cv, cv);
            raw.math.vec3.scale(v3, cv, cvl);
            raw.math.vec3.add(posi[i], posi[i], v3);
            if (i > 1) {
              // raw.math.vec3.subtract(posi[i - 1], posi[i - 1], v3);
            }
          }

        }
        if (j.limit2 !== undefined) {

          raw.math.vec3.subtract(v3, posi[i], posi[i - 1]);
          raw.math.vec3.copy(v2, v3);
          raw.math.vec3.to_polar(v1, v3);
          v1[0] = Math.max(Math.min(v1[1], limit[1]), limit[0]);
          //v1[1] =0- polars[i - 1][1];
          v1[1] = Math.max(Math.min(v1[1], limit[3]), limit[2]);
          //v1[1] -= polars[i - 1][1];
          // v1[0] -= polars[i - 1][0];


          raw.math.vec3.from_polar(v3, v1[0], v1[1], v1[2]);
          raw.math.vec3.subtract(v1, v3, v2);
          // raw.math.vec3.add(posi[i], posi[i - 1], v3);

          raw.math.vec3.add(posi[i], posi[i], v1);
          if (i > 1) {
            // raw.math.vec3.subtract(posi[i - 1], posi[i - 1], v1);
          }

        }
        if (j.limit2 !== undefined) {
          if (i > 1) {
            raw.math.vec3.subtract(v2, posi[i - 1], posi[i - 2]);
            raw.math.vec3.normalize(v2, v2);
            raw.math.vec3.scale(v2, v2, j.length);
            raw.math.vec3.add(v2, v2, posi[i - 1]);
          }
          else {

            raw.math.vec3.subtract(v2, posi[i - 1], j.parent.transform.parent.position_world);
            raw.math.vec3.normalize(v2, v2);
            raw.math.vec3.scale(v2, v2, j.length);
            raw.math.vec3.add(v2, v2, posi[i - 1]);

            //raw.math.vec3.normalize(v2, raw.math.V3_Y);
            //raw.math.vec3.scale(v2, v2, j.length);
            //raw.math.vec3.add(v2, v2, posi[i - 1]);
          }

          raw.math.vec3.copy(v1, v2);



          if (j.limit[2] !== -999) {
            raw.math.vec3.subtract(cv, posi[i], v2);
            ln = Math.sqrt(cv[0] * cv[0] + cv[2] * cv[2]);
            raw.math.vec3.subtract(cv, posi[i], v2);
            cvl = Math.atan2(cv[0], cv[2]);
            // console.log('cv' + i, cvl);
            cvn = Math.sign(cvl);
            if (j.limit[2] === j.limit[3]) {
              v3[0] = (Math.cos(j.limit[2]) * ln) * cvn;
              v3[2] = (Math.sin(j.limit[2]) * ln) * cvn;
            }
            else {
              cvl = Math.max(Math.min(cvl, j.limit[3]), j.limit[2]);
              v3[0] = (Math.cos(cvl) * ln);
              v3[2] = (Math.sin(cvl) * ln);
            }
            v3[1] = posi[i][1];

            cvl = Math.atan2(v3[0], v3[1]);
            cvl = Math.max(Math.min(cvl, j.limit[5]), j.limit[4]);

            //   v3[0] = (Math.cos(cvl) * ln);
            //  v3[1] = (Math.sin(cvl) * ln);
            //console.log('cvl', cvl*raw.math.RADTODEG);





            posi[i][0] = v2[0] + v3[0];
            //posi[i][1] = posi[i - 1][1] + v3[1];
            posi[i][2] = v2[2] + v3[2];

            raw.math.vec3.subtract(v3, posi[i], posi[i - 1]);
            raw.math.vec3.normalize(v3, v3);
            raw.math.quat.rotation_to(q1, raw.math.V3_Y, v3);
            cvl = raw.math.quat.get_angle(q1);

            cvl = Math.max(Math.min(cvl, j.limit[5]), j.limit[4]);

            raw.math.quat.set_axis_angle(q1, q1, cvl);

            raw.math.vec3.transform_quat(v3, raw.math.V3_Y, q1);
            raw.math.vec3.normalize(v3, v3);
            raw.math.vec3.scale_add(posi[i], posi[i - 1], v3, j.length);


          }




          console.log('cvl', cvl * raw.math.RADTODEG);
          //console.log(q1.join());


          if (j.limit[0] > 0) {

            v1[0] += j.limit[1];
            raw.math.vec3.subtract(cv, posi[i], v1);
            ln = Math.sqrt(cv[0] * cv[0] + cv[1] * cv[1] + cv[2] * cv[2]);
            if (ln > j.limit[0]) {
              cvl = j.limit[0] - ln;
              raw.math.vec3.subtract(cv, posi[i], v1);
              raw.math.vec3.normalize(cv, cv);
              raw.math.vec3.scale(v3, cv, cvl);
              raw.math.vec3.add(posi[i], posi[i], v3);
              if (i > 1) {
                // raw.math.vec3.subtract(posi[i - 1], posi[i - 1], v3);
              }
            }
          }


        }
      }


      var vn = [];
      limit_joint = function (j, limit) {
        if (limit !== undefined) {
          if (i > 1) {
            raw.math.vec3.subtract(v2, posi[i - 1], posi[i - 2]);
            raw.math.vec3.normalize(vn, v2);
            raw.math.vec3.scale(v2, vn, j.length);
            raw.math.vec3.add(v2, posi[i - 1], v2);


          }
          else {
            raw.math.vec3.subtract(v2, posi[i - 1], j.parent.transform.parent.position_world);
            ln = raw.math.vec3.get_length(v2);
            if (ln === 0) {
              raw.math.vec3.normalize(vn, raw.math.V3_Y);
            }
            else {
              raw.math.vec3.normalize(vn, v2);
            }

            raw.math.vec3.scale(v2, vn, j.length);
            raw.math.vec3.add(v2, v2, posi[i - 1]);
          }
          raw.math.vec3.copy(j.v2, v2);
          raw.math.vec3.copy(j.posi1, posi[i - 1]);


          //raw.math.quat.rotation_to(q1, raw.math.V3_Y, vn);
          //raw.math.vec3.transform_quat(j.v3, raw.math.V3_X, q1);

          raw.math.vec3.normalize(j.v3, j.v3);

          raw.math.vec3.scale_add(j.v3, posi[i - 1], j.v3, j.length);


          raw.math.vec3.subtract(j.an, posi[i], v2);

          raw.math.vec3.normalize(j.an, j.an);

          //raw.math.vec3.scale_add(j.an, j.v2, j.an, j.length);

          if (j.limit[0] > 0) {
            raw.math.vec3.subtract(cv, posi[i], v2);

            ln = Math.sqrt(cv[0] * cv[0] + cv[1] * cv[1] + cv[2] * cv[2]);
            if (ln > j.limit[0]) {
              raw.math.vec3.subtract(cv, posi[i], v2);
              raw.math.vec3.normalize(cv, cv);
              raw.math.vec3.scale_add(cv, v2, cv, j.limit[0]);
              raw.math.vec3.subtract(cv, cv, posi[i - 1]);
              raw.math.vec3.normalize(cv, cv);
              raw.math.vec3.scale_add(posi[i], posi[i - 1], cv, j.length);
            }
          }

          if (j.limit[1] !== -999) {
            raw.math.vec3.subtract(v3, posi[i], posi[i - 1]);
            //raw.math.vec3.normalize(cv, j.parent.an);
            raw.math.vec3.scale(cv, j.parent.an, j.length);
            raw.math.vec3.cross(j.an, cv, v2);
            raw.math.vec3.normalize(j.an, j.an);
            //raw.math.vec3.scale_add(j.an, posi[i - 1], j.an, j.length);
            cvs = raw.math.vec3.dot(j.an, v3);

            raw.math.vec3.scale_add(posi[i], posi[i], j.an, -cvs)
            //raw.math.vec3.scale_add(posi[i - 1], posi[i - 1], j.an, -cvs);

            // cv[1] = v3[1];
            raw.math.vec3.normalize(cv, cv);
            //raw.math.vec3.scale_add(posi[i], posi[i - 1], cv, j.length);

            /*
              raw.math.vec3.subtract(cv, posi[i], posi[i - 1]);
              raw.math.vec3.to_polar(v3, cv);
              raw.math.vec3.from_polar(cv,
                Math.max(Math.min(v3[0], j.limit[2]), j.limit[1]),    v3[1], v3[2]);
              //raw.math.vec3.add(posi[i], posi[i - 1], cv);
              raw.math.vec3.normalize(cv, cv);
              raw.math.vec3.scale_add(posi[i], posi[i - 1], cv, j.length);
              */
          }


        }
        return
        if (limit !== undefined) {
          raw.math.vec3.subtract(v2, posi[i], posi[i - 1]);
          ln = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1] + v2[2] * v2[2]);
          raw.math.vec3.set(v3, 0, ln, 0);
          raw.math.vec3.subtract(cv, v2, v3);
          ln = Math.sqrt(cv[0] * cv[0] + cv[1] * cv[1] + cv[2] * cv[2]);

          if (ln > j.limit[0]) {
            cvl = j.limit[0] - ln;
            raw.math.vec3.normalize(cv, cv);
            raw.math.vec3.scale(v3, cv, cvl);
            raw.math.vec3.add(posi[i], posi[i], v3);
            if (i > 0) {
              raw.math.vec3.subtract(posi[i - 1], posi[i - 1], v3);
            }
          }

        }

        return;


      }

      function get_eular(e, vc1, vc2) {
        vec3.cross(v1, vc1, vc2);
        ln = vec3.dot(vc1, vc2);


      }

      return function (chain) {
        tg = chain.effector.position_world;
        ch = chain.joints;
        clen = ch.length - 1;




        if (!chain.needs_update) {
          raw.math.vec3.subtract(v1, ch[clen].transform.position_world, tg);
          ln = (v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]);

          chain._ln = ln;
          chain._thg = thg;
          if (ln < thg) {
            return false;
          }
        }
        chain.needs_update = false;

        posi[clen][0] = tg[0];
        posi[clen][1] = tg[1];
        posi[clen][2] = tg[2];
        raw.math.vec3.subtract(v1, posi[clen], ch[0].transform.position_world);

        ln = 0;
        for (i = 0; i <= clen; i++)
          ln += ch[i].length;

        ln2 = Math.abs(v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]);
        ln2 = raw.math.vec3.get_length(v1);


        if (ln2 > ln && false) {
          j = ch[0];
          raw.math.vec3.normalize(v1, v1);

          if (j.transform.parent !== null) {
            raw.math.quat.rotation_to(q1, raw.math.V3_Y, v1);
            raw.math.quat.invert(q2, j.transform.parent.rotation_world);
            raw.math.quat.multiply(j.ik_rotate, q2, q1);
          }
          else raw.math.quat.rotation_to(ch[0].ik_rotate, raw.math.V3_Y, v1);
          for (i = 1; i <= clen; i++) {
            raw.math.quat.identity(ch[i].ik_rotate);
          }

          return true;
        }


        for (i = 1; i < clen; i++) {
          j = ch[i];
          posi[i][0] = j.transform.position_world[0];
          posi[i][1] = j.transform.position_world[1];
          posi[i][2] = j.transform.position_world[2];


        }

        ter = 0;

        while (ter < 10) {




          posi[clen][0] = tg[0];
          posi[clen][1] = tg[1];
          posi[clen][2] = tg[2];

          if (ter > 0) {

          }


          i = clen - 1;
          cvl = -1000;
          while (i > 0) {
            j = ch[i];
            raw.math.vec3.subtract(v1, posi[i], posi[i + 1]);
            raw.math.vec3.normalize(v1, v1);
            raw.math.vec3.scale(v2, v1, ch[i + 1].length);
            raw.math.vec3.to_polar(polars[i], v2);
            raw.math.vec3.add(posi[i], posi[i + 1], v2);



            i--;
          }


          for (i = clen - 1; i > 0; i--) {
            // limit_joint(ch[i], ch[i].limit);
          }

          for (i = 1; i < clen + 1; i++) {
            //limit_joint(ch[i], ch[i].limit);
          }

          lp = ch[0].transform.position_world;
          i = 1;
          posi[0][0] = lp[0];
          posi[0][1] = lp[1];
          posi[0][2] = lp[2];

          while (i <= clen) {
            j = ch[i];
            raw.math.vec3.subtract(v1, posi[i], posi[i - 1]);
            raw.math.vec3.normalize(v1, v1);
            raw.math.vec3.scale(v2, v1, ch[i].length);
            raw.math.vec3.to_polar(polars[i], v2);
            raw.math.vec3.add(posi[i], lp, v2);

            //limit_joint(ch[i], ch[i].limit);

            lp = posi[i];
            i++;
          }



          for (i = clen - 1; i > 0; i--) {
            //limit_joint(ch[i], ch[i].limit);
          }

          v1[0] = posi[clen][0] - tg[0];
          v1[1] = posi[clen][1] - tg[1];
          v1[2] = posi[clen][2] - tg[2];

          ln = (v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]);
          chain._ln = ln;
          chain._thg = thg;
          if (ter > 0 && ln < thg) {
            break;
          }




          ter++;
        }

        i = 0;
        if (ch[0].transform.parent !== null) {
          raw.math.quat.copy(roti[0], ch[0].transform.parent.rotation_world);
        }
        else {
          raw.math.quat.identity(roti[0]);
        }
        while (i < clen) {
          j = ch[i];
          vec3.subtract(v1, posi[i + 1], posi[i]);




          /*
          vec3.to_polar(v2, v1);
          quat.set_axis_angle(q1, raw.math.V3_X, v2[0]);        
          quat.set_axis_angle(q2, raw.math.V3_Z, -v2[1]);        
          quat.multiply(q1, q2, q1);
          quat.normalize(q1, q1);
          */
          //        
          //quat.set_axis_angle(q1, v2, (vec3.dot(posi[i], posi[i + 1])));        
          //quat.rotation_to(q1, raw.math.V3_Y, v1);
          //quat.aim(q1, posi[i], posi[i + 1]);

          //vec3.cross(v3, posi[i + 1], posi[i]);
          //raw.math.vec3.normalize(v3, v3);        

          //vec3.normalize(v1, posi[i]);        
          //vec3.normalize(v2, posi[i + 1]);        

          // quat.aim(q1, posi[i], posi[i + 1]);
          //
          vec3.subtract(v1, posi[i + 1], posi[i]);
          vec3.normalize(v1, v1);
          vec3.cross(v2, v1, raw.math.V3_Y);
          vec3.normalize(v2, v2);
          //quat.aim(q1, v2, v1);
          quat.rotation_to(q1, v2, v1);
          //quat.aim(q1,  v2,v1);
          //quat.set_axis_angle(q1, v3, Math.acos(vec3.dot(v1, v2)));


          //Vector v = (this->cross(vector)).normalize();
          //return Quaternion(v, acos(a.dot(b)));

          // quat.aim(q1, raw.math.V3_Y, v1);

          //  raw.math.quat.normalize(q1, q1);
          raw.math.quat.invert(q2, roti[0]);
          raw.math.quat.multiply(q1, q2, q1);

          raw.math.quat.copy(j.transform.rotation, q1);



          raw.math.quat.multiply(roti[0], roti[0], j.transform.rotation);

          j.transform.require_update = 1;
          i++;
        }

        return true;
        /*
        quaternion q;
        vector3 c = cross(v1, v2);
        q.v = c;
        if (vectors are known to be unit length ) {
          q.w = 1 + dot(v1, v2);
    } else {
        q.w = sqrt(v1.length_squared() * v2.length_squared()) + dot(v1, v2);
    } q.normalize(); return q;
    */


        i = 0;
        while (i < clen) {
          j = ch[i];
          raw.math.vec3.subtract(v1, posi[i + 1], posi[i]);
          raw.math.vec3.normalize(v1, v1);
          if (i > 0) {
            raw.math.quat.rotation_to(q1, raw.math.V3_Y, v1);
            raw.math.quat.invert(q2, roti[i - 1]);
            raw.math.quat.multiply(j.ik_rotate, q2, q1);
            raw.math.quat.multiply(roti[i], roti[i - 1], j.ik_rotate);
          }
          else {
            if (j.transform.parent !== null) {
              raw.math.quat.rotation_to(q1, raw.math.V3_Y, v1);
              raw.math.quat.invert(q2, j.transform.parent.rotation_world);
              raw.math.quat.multiply(j.ik_rotate, q2, q1);
              raw.math.quat.multiply(roti[i], j.transform.parent.rotation_world, j.ik_rotate);
            }
            else {
              raw.math.quat.rotation_to(j.ik_rotate, raw.math.V3_Y, v1);
              raw.math.quat.copy(roti[i], j.ik_rotate);
            }

          }
          i++;
        }

        return true;

      }

      return function (chain) {
        tg = chain.effector.position_world;
        ch = chain.joints;
        clen = ch.length - 1;




        if (!chain.needs_update) {
          raw.math.vec3.subtract(v1, ch[clen].transform.position_world, tg);
          ln = (v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]);

          chain._ln = ln;
          chain._thg = thg;
          if (ln < thg) {
            return false;
          }
        }
        chain.needs_update = false;

        posi[clen][0] = tg[0];
        posi[clen][1] = tg[1];
        posi[clen][2] = tg[2];
        raw.math.vec3.subtract(v1, posi[clen], ch[0].transform.position_world);

        ln = 0;
        for (i = 0; i <= clen; i++)
          ln += ch[i].length;

        ln2 = Math.abs(v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]);
        ln2 = raw.math.vec3.get_length(v1);


        if (ln2 > ln && false) {
          j = ch[0];
          raw.math.vec3.normalize(v1, v1);

          if (j.transform.parent !== null) {
            raw.math.quat.rotation_to(q1, raw.math.V3_Y, v1);
            raw.math.quat.invert(q2, j.transform.parent.rotation_world);
            raw.math.quat.multiply(j.ik_rotate, q2, q1);
          }
          else raw.math.quat.rotation_to(ch[0].ik_rotate, raw.math.V3_Y, v1);
          for (i = 1; i <= clen; i++) {
            raw.math.quat.identity(ch[i].ik_rotate);
          }

          return true;
        }


        for (i = 1; i < clen; i++) {
          j = ch[i];
          posi[i][0] = j.transform.position_world[0];
          posi[i][1] = j.transform.position_world[1];
          posi[i][2] = j.transform.position_world[2];


        }

        ter = 0;

        while (ter < 3) {




          posi[clen][0] = tg[0];
          posi[clen][1] = tg[1];
          posi[clen][2] = tg[2];

          i = clen - 1;
          cvl = -1000;
          while (i > 0) {
            j = ch[i];
            raw.math.vec3.subtract(v1, posi[i], posi[i + 1]);
            raw.math.vec3.normalize(v1, v1);
            raw.math.vec3.scale(v2, v1, ch[i + 1].length);
            raw.math.vec3.to_polar(polars[i], v2);
            raw.math.vec3.add(posi[i], posi[i + 1], v2);
            i--;
          }





          lp = ch[0].transform.position_world;
          i = 1;
          posi[0][0] = lp[0];
          posi[0][1] = lp[1];
          posi[0][2] = lp[2];

          while (i <= clen) {
            j = ch[i];
            raw.math.vec3.subtract(v1, posi[i], posi[i - 1]);
            raw.math.vec3.normalize(v1, v1);
            raw.math.vec3.scale(v2, v1, ch[i].length);
            raw.math.vec3.to_polar(polars[i], v2);
            raw.math.vec3.add(posi[i], lp, v2);

            //limit_joint(ch[i], ch[i].limit);

            lp = posi[i];
            i++;
          }

          for (i = clen - 1; i > 0; i--) {
            //limit_joint(ch[i], ch[i].limit);
          }

          i = 0;
          while (i < clen) {
            j = ch[i];
            raw.math.vec3.subtract(v1, posi[i + 1], posi[i]);
            raw.math.vec3.normalize(v1, v1);
            raw.math.quat.rotation_to(q1, raw.math.V3_Y, v1);

            if (j.limit2 !== undefined) {
              q1[2] = 0;
              //q1[3] = Math.max(Math.min(q1[3], 0.2), -0.2);
              raw.math.quat.normalize(q1, q1);
              // raw.math.quat.identity(q1);
            }

            if (j.limit) {
              raw.math.vec3.set(v3, 0.5, 1, 0);
              //raw.math.vec3.transform_quat(v3, raw.math.V3_X, q1);

              raw.math.vec3.transform_quat(v2, raw.math.V3_Y, q1);
              cvn = raw.math.vec3.distance(v3, raw.math.V3_Y);
              raw.math.vec3.subtract(v2, v2, raw.math.V3_Y);
              ln = raw.math.vec3.get_length(v2);

              if (ln > cvn) {
                raw.math.vec3.normalize(v2, v2);
                raw.math.vec3.scale(v2, v2, cvn);
                raw.math.vec3.normalize(v3, v3);
                raw.math.quat.rotation_to(q1, raw.math.V3_Y, v2);
                /*
                if (i > 0) {
                  raw.math.quat.invert(q2, roti[i - 1]);
                  raw.math.quat.multiply(j.ik_rotate, q2, q1);
                  raw.math.quat.multiply(roti[i], roti[i - 1], j.ik_rotate);
                }
                else {
                  raw.math.quat.copy(roti[i], q1);
                  raw.math.quat.copy(j.ik_rotate, q1);
                }
                */
              }
            }

            if (i > 0) {
              raw.math.quat.invert(q2, roti[i - 1]);
              raw.math.quat.multiply(j.ik_rotate, q2, q1);
              raw.math.quat.multiply(roti[i], roti[i - 1], j.ik_rotate);
            }
            else {
              if (j.transform.parent !== null) {
                raw.math.quat.invert(q2, j.transform.parent.rotation_world);
                raw.math.quat.multiply(j.ik_rotate, q2, q1);
                raw.math.quat.multiply(roti[i], j.transform.parent.rotation_world, j.ik_rotate);
              }
              else {
                raw.math.quat.copy(roti[i], q1);
                raw.math.quat.copy(j.ik_rotate, q1);
              }
            }



            if (j.limit2) {

              raw.math.vec3.transform_quatx(v2, 0, 1, 0, roti[i]);
              raw.math.vec3.transform_quatx(v3, 0, 1, 0, roti[i - 1]);
              raw.math.quat.rotation_to(q2, v2, v3);
              raw.math.quat.multiply(j.ik_rotate, j.ik_rotate, q2);
              raw.math.quat.multiply(roti[i], roti[i - 1], j.ik_rotate);
              //vec3 currentHinge = joint.rotation * axis;
              //vec3 desiredHinge = parent.rotation * axis;
              //mChain[i].rotation = mChain[i].rotation *fromToRotation(currentHinge,desiredHinge);
            }

            i++;
          }

          for (i = clen; i > 0; i--) {
            raw.math.vec3.subtract(posi[i], posi[i], posi[i - 1]);
          }

          for (i = 1; i < clen + 1; i++) {
            j = ch[i];
            //raw.math.vec3.subtract(v1, posi[i], posi[i - 1]);
            raw.math.vec3.transform_quat(v3, j.transform.position, roti[i - 1]);
            raw.math.vec3.add(posi[i], posi[i - 1], v3);
          }



          v1[0] = posi[clen][0] - tg[0];
          v1[1] = posi[clen][1] - tg[1];
          v1[2] = posi[clen][2] - tg[2];


          ln = (v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]);
          chain._ln = ln;
          chain._thg = thg;
          if (ter > 0 && ln < thg) {
            break;
          }




          ter++;
        }

        return true;
        for (i = clen - 1; i > 0; i--) {
          // limit_joint(ch[i], ch[i].limit);
        }


        i = 0;
        while (i < clen) {
          j = ch[i];
          raw.math.vec3.subtract(v1, posi[i + 1], posi[i]);

          raw.math.vec3.to_polar(v3, v1);

          raw.math.vec3.normalize(v1, v1);
          raw.math.quat.rotation_to(q1, raw.math.V3_Y, v1);

          /*
          raw.math.quat.set_axis_anglex(q2, 0, 1, 0, v3[0]);
          raw.math.quat.set_axis_anglex(q3, 1, 0, 0, v3[1]);
  
          raw.math.quat.multiply(q1, q2, q3);
  
          raw.math.quat.normalize(q1, q1);
          */




          if (i > 0) {

            raw.math.quat.invert(q2, roti[i - 1]);
            raw.math.quat.multiply(j.ik_rotate, q2, q1);
            raw.math.quat.multiply(roti[i], roti[i - 1], j.ik_rotate);
          }
          else {
            if (j.transform.parent !== null) {
              raw.math.quat.invert(q2, j.transform.parent.rotation_world);
              raw.math.quat.multiply(j.ik_rotate, q2, q1);
              raw.math.quat.multiply(roti[i], j.transform.parent.rotation_world, j.ik_rotate);
            }
            else {
              raw.math.quat.copy(roti[i], j.ik_rotate);
              raw.math.quat.copy(j.ik_rotate, q1);
            }

          }
          i++;
        }

        return true;

        i = 0;
        while (i < clen) {
          j = ch[i];
          raw.math.vec3.subtract(v1, posi[i + 1], posi[i]);
          raw.math.vec3.normalize(v1, v1);
          if (i > 0) {
            raw.math.quat.rotation_to(q1, raw.math.V3_Y, v1);
            raw.math.quat.invert(q2, roti[i - 1]);
            raw.math.quat.multiply(j.ik_rotate, q2, q1);
            raw.math.quat.multiply(roti[i], roti[i - 1], j.ik_rotate);
          }
          else {
            if (j.transform.parent !== null) {
              raw.math.quat.rotation_to(q1, raw.math.V3_Y, v1);
              raw.math.quat.invert(q2, j.transform.parent.rotation_world);
              raw.math.quat.multiply(j.ik_rotate, q2, q1);
              raw.math.quat.multiply(roti[i], j.transform.parent.rotation_world, j.ik_rotate);
            }
            else {
              raw.math.quat.rotation_to(j.ik_rotate, raw.math.V3_Y, v1);
              raw.math.quat.copy(roti[i], j.ik_rotate);
            }

          }
          i++;
        }

        return true;

      }


    })();
    var skeleton = null, joints_changed = false, temp_dquat = [0, 0, 0, 1];
    var ik = 0, k = 0, v1 = [0, 0, 0], v2 = [0, 0, 0];


    proto.resolve_ik = function (skeleton) {
      for (ik = 0; ik < skeleton.ik_chains.length; ik++) {
        ik_chain = skeleton.ik_chains[ik];
        if (!ik_chain.enabled) continue;
        if (this.resolve_ik_chain(ik_chain, 10)) {
          ik_chain.root.ik_chain_updated = true;

          this.ecs.systems['transform_system'].process(skeleton.transforms, 1);
        }

      }

    }

    proto.step = function () {
      this.skeleton_display_mesh.DP.clear();
      this.display_skeletons.length = 0;
      while ((skeleton = this.ecs.iterate_entities("skeleton")) !== null) {
        if (skeleton.skeleton.display) {
          this.display_skeletons[this.display_skeletons.length] = skeleton;
        }
        trans = skeleton.transform;
        skeleton = skeleton.skeleton;
        if (!skeleton.initialized) {
          this.initialize_skeleton(skeleton);
        }


        this.resolve_ik(skeleton);





      }

      while ((skeleton = this.ecs.iterate_entities("skeleton")) !== null) {

        trans = skeleton.transform;
        skeleton = skeleton.skeleton;
        joints_changed = false;
        for (i = 0; i < skeleton.skinned_joints.length; i++) {
          joint = skeleton.skinned_joints[i];
          if (joint && joint.transform.require_update !== 0) {
            raw.math.dquat.from_quat_pos(temp_dquat, joint.transform.rotation_world, joint.transform.position_world);
            raw.math.dquat.multiply(joint.joint_transform, temp_dquat, joint.bind_transform);
            joints_changed = true;
          }
        }
        if (joints_changed) skeleton.version += 0.000001;
      }


    };
    var i = 0, v1 = raw.math.vec3();

    proto.initialize_skeleton = function (skeleton) {
      if (skeleton.initialized) return;
      //this.set_zero_pos(skeleton);

      this.set_bind_pos(skeleton);


      skeleton.initialized = true;
    }

    proto.set_bind_pos = function (skeleton) {
      for (i = 0; i < skeleton.joints.length; i++) {
        joint = skeleton.joints[i];

        skeleton.transforms[skeleton.transforms.length] = joint.transform;

        if (joint.skin_index > -1 && joint.set_bind_pos) {
          raw.math.dquat.from_quat_pos(joint.bind_transform,
            joint.transform.rotation_world, joint.transform.position_world);
          raw.math.dquat.invert(joint.bind_transform, joint.bind_transform);
        }


        if (joint.bind_transform) {
          //   raw.math.vec3.copy(joint.transform.bind_pos, joint.transform.position_world);
          // raw.math.quat.copy(joint.transform.bind_rot, joint.transform.rotation);
        }


        if (joint.transform.parent !== null) {
          raw.math.vec3.subtract(v1, joint.transform.position_world, joint.transform.parent.position_world);
          joint.length = raw.math.vec3.get_length(v1);
        }
        else {
          joint.length = raw.math.vec3.get_length(joint.transform.position_world);
        }

      }
    };

    proto.set_zero_pos = function (skeleton) {
      for (i = 0; i < skeleton.joints.length; i++) {
        joint = skeleton.joints[i];
        joint.set_bind_pos = true;
        if (joint.transform.parent !== null) {
          raw.math.vec3.subtract(joint.transform.position,
            joint.transform.position_world, joint.transform.parent.position_world);
          raw.math.quat.identity(joint.transform.rotation);
        }
      }
    };

    proto.validate = function (ecs) {
      ecs.use_component("render_item");
      this.priority = ecs.use_system('transform_system').priority + 100;
      this.setup_skeleton_display(ecs);
    };

    proto.setup_skeleton_display = (function () {
      var i = 0, k = 0, joint = null;
      var geo = raw.geometry.cube({ width: 2, depth: 2 });
      for (i = 0; i < geo.attributes.a_position_rw.data.length; i += 3) {
        if (geo.attributes.a_position_rw.data[i + 1] > 0.3) {
          geo.attributes.a_position_rw.data[i] *= 0.35;
          geo.attributes.a_position_rw.data[i + 2] *= 0.35;
        }
        else {
          if (geo.attributes.a_position_rw.data[i] > 0) {
            // geo.attributes.a_position_rw.data[i] *= 4;
          }
        }
      }
      geo.scale_position_rotation(0.1, 1, 0.1, 0, 0.5, 0, 0, 0, 0);
      var mat = new raw.shading.shaded_material({ ambient: [0.5, 0.5, 0.5] });
      mat.flags += raw.SHADING.CAST_SHADOW;
       var axis_geo = raw.geometry.create({
        vertices: new Float32Array([
          0, 0, 0, 0.5, 0, 0,
          0, 0, 0, 0, 1, 0,
          0, 0, 0, 0, 0, 0.5
        ]),
        colors: new Float32Array([
          1, 0, 0, 1, 1, 0, 0, 1,
          0, 1, 0, 1, 0, 1, 0, 1,
          0, 0, 1, 1, 0, 0, 1, 1,
        ])
      });

      mat.shader = mat.shader.extend(glsl["bone-render"]);

      mat.shader_axis = raw.webgl.shader.parse(glsl["axis-render"]);

      mat.render_mesh = function (renderer, shader, mesh) {
        renderer.gl.enable(raw.GL_CULL_FACE);
        renderer.gl.enable(raw.GL_DEPTH_TEST);
        shader.set_uniform("u_object_material_rw", this.object_material);
        shader.set_uniform("u_texture_matrix_rw", this.texture_matrix);
        renderer.use_texture(this.texture, 0);

        renderer.activate_geometry_index_buffer(mesh.geometry, false);

        for (k = 0; k < mesh.sys.display_skeletons.length; k++) {
          skeleton = mesh.sys.display_skeletons[k];
          shader.set_uniform("u_skeleton_pos", skeleton.transform.position_world);
          for (i = 0; i < skeleton.skeleton.skinned_joints.length; i++) {
            joint = skeleton.skeleton.skinned_joints[i];
            if (joint && joint.parent !== null) {

              shader.set_uniform("u_bone_end", joint.transform.position_world);
              shader.set_uniform("u_bone_start", joint.transform.parent.position_world);
              shader.set_uniform("u_joint_qr", joint.transform.parent.rotation_world);


              renderer.gl.drawElements(4, mesh.draw_count, raw.GL_UNSIGNED_INT, 0);
            }
          }
        }

        if (shader.shadow_shader) return;
        renderer.use_shader(this.shader_axis);

        this.shader_axis.set_uniform("u_view_projection_rw", renderer.active_camera.view_projection);
        renderer.use_geometry(axis_geo);

        //renderer.gl.disable(raw.GL_DEPTH_TEST);

        for (k = 0; k < mesh.sys.display_skeletons.length; k++) {
          skeleton = mesh.sys.display_skeletons[k];
          this.shader_axis.set_uniform("u_skeleton_pos", skeleton.transform.position_world);
          for (i = 0; i < skeleton.skeleton.joints.length; i++) {
            joint = skeleton.skeleton.joints[i];
            if (joint.parent !== null) {
              if (joint.skin_index > -1) {
                this.shader_axis.set_uniform("u_bone_start", joint.transform.parent.position_world);
                this.shader_axis.set_uniform("u_joint_qr", joint.transform.parent.rotation_world);
                this.shader_axis.set_uniform("u_bone_end", joint.transform.position_world);
              }
              else {
                this.shader_axis.set_uniform("u_bone_start", joint.transform.position_world);
                this.shader_axis.set_uniform("u_joint_qr", joint.transform.rotation_world);
                this.shader_axis.set_uniform("u_bone_end", joint.transform.position_world);
              }

              renderer.gl.drawArrays(raw.GL_LINES, 0, axis_geo.num_items);
            }
          }
        }

        //renderer.gl.enable(raw.GL_DEPTH_TEST);

      };


      return function (ecs) {
        if (this.skeleton_display_mesh) return;
        this.skeleton_display_mesh = new raw.rendering.mesh({
          geometry: geo, material: mat
        });
        this.skeleton_display_mesh.DP = new raw.rendering.debug_points();
        this.skeleton_display_mesh.DL = new raw.rendering.debug_lines();

        this.skeleton_display_mesh.flags += raw.DISPLAY_ALWAYS;
        this.skeleton_display_mesh.sys = this;
        this.skeleton_display = ecs.create_entity({
          components: {
            'transform': {},
            'render_item': {
              items: [
                this.skeleton_display_mesh
                , this.skeleton_display_mesh.DP
                , this.skeleton_display_mesh.DL
              ]
            }
          }
        });

      }

    })();



    proto.bind_animation_targets = (function () {
      var tar = null, joint = null;
      return function (skeleton, targets) {
        for (i = 0; i < targets.length; i++) {
          tar = targets[i];
          joint = skeleton[tar.name];
          if (joint) {

            this.ecs.components['transform'].set_anim_target(joint.transform, tar);
            ///joint.transform.flags = raw.set_flag(joint.transform.flags, raw.TRANS.ANIMATED);
            //joint.transform.anim_target =tar
          }
        }
      }
    })();

    return function skeleton_system(def) {
      _super.apply(this, [def]);
      this.display_skeletons = [];
    }

  }, raw.ecs.system));




  raw.skeleton_system.mesh = raw.define(function (proto, _super) {


    var skin_material_on_before_render = (function () {
      var qr = raw.math.quat(), qd = raw.math.quat(), qq = null, ske = null, j = null, i = 0;
      return function (renderer, shader, mesh) {
        ske = mesh.skeleton;
        for (i = 0; i < ske.skinned_joints.length; i++) {
          j = ske.skinned_joints[i];
          qq = j.joint_transform;
          qr[0] = qq[0];
          qr[1] = qq[1];
          qr[2] = qq[2];
          qr[3] = qq[3];

          qd[0] = qq[4];
          qd[1] = qq[5];
          qd[2] = qq[6];
          qd[3] = qq[7];


          shader.set_uniform("joint_qr[" + i + "]", qr);
          shader.set_uniform("joint_qd[" + i + "]", qd);
        }
      }

    })();
    function skin_shader(mat) {
      if (!mat.shader.skin_shader) {
        mat.shader = mat.shader.extend(glsl["skinned-mesh"]);
        mat.on_before_render.add(skin_material_on_before_render);
        mat.shader.skin_shader = true;
      }
    }

    proto.normalize_skin_weights = function (geo) {
      var skin_weights = geo.attributes.a_joints_weights;
      var scale = 0;
      for (var i = 0; i < skin_weights.data.length; i += 4) {
        scale = 1.0 / (Math.abs(skin_weights.data[i]) + Math.abs(skin_weights.data[i + 1]) + Math.abs(skin_weights.data[i + 2]) + Math.abs(skin_weights.data[i + 3]))
        if (scale !== Infinity) {
          skin_weights.data[i] *= scale;
          skin_weights.data[i + 1] *= scale;
          skin_weights.data[i + 2] *= scale;
          skin_weights.data[i + 3] *= scale;
        } else {
          skin_weights.data[i] = 1;
          skin_weights.data[i + 1] = 0;
          skin_weights.data[i + 2] = 0;
          skin_weights.data[i + 3] = 0;
        }

      }
    };

    proto.skin_geometry = function (geo, ske) {
      var i = 0, k = 0, j = null, ds = 0;
      var d = [];
      var v = geo.attributes["a_position_rw"].data;
      var js = geo.add_attribute("a_joints_indices", { data: new Float32Array((v.length / 3) * 4), item_size: 4 });
      var jw = geo.add_attribute("a_joints_weights", { data: new Float32Array((v.length / 3) * 4), item_size: 4 });

      var jpos = [], jlen = [], v1 = [], v2 = [], bpos = null;
      for (i = 0; i < ske.skinned_joints.length; i++) {
        j = ske.skinned_joints[i];
        bpos = j.transform.bind_pos;
        if (j.transform.parent !== null) {
          raw.math.vec3.subtract(v1, bpos, j.transform.parent.bind_pos);
          raw.math.vec3.normalize(v1, v1);
          raw.math.vec3.scale(v2, v1, j.length * 0.5);
          jpos.push(raw.math.vec3.add([], bpos, v2));

        }
        else {
          jpos.push(bpos);
        }

        jlen.push(j.length || 0);
      }
      var si = 0;
      for (i = 0; i < v.length; i += 3) {
        for (k = 0; k < jpos.length; k++) {
          ds = Math.abs(raw.math.vec3.distance2(jpos[k][0], jpos[k][1], jpos[k][2], v[i], v[i + 1], v[i + 2]));
          d[k] = [k, ds];

        }

        d.sort(function (a, b) {
          return a[1] - b[1];
        });


        for (k = 0; k < Math.min(jpos.length, 4); k++) {
          js.data[si + k] = d[k][0];
          jw.data[si + k] = (d[k][1] / (jlen[js.data[si + k]]));

          if (d[k][1] > jlen[js.data[si + k]] * 0.5) {
            // if (k>0 && jw.data[si + k] > 1) {
            jw.data[si + k] = 0;
          }
        }
        si += 4;
      }
      this.normalize_skin_weights(geo);
      return geo;
    };
    proto.initialize_item = function () {
      this.item_type = raw.ITEM_TYPES.MESH;

      if (!this.geometry.attributes['a_joints_indices']) {
        this.skin_geometry(this.geometry, this.skeleton);
        console.log(skin_geometry);

      }
      this.flags += raw.DISPLAY_ALWAYS;

      skin_shader(this.material);

    };
    function mesh(def) {
      _super.apply(this, [def]);
      this.skeleton = def.skeleton;
      this.item_type = raw.ITEM_TYPES.OTHER;
    }


    return mesh;
  }, raw.rendering.mesh);

})();



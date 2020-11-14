
raw.skeleton_system = {};

raw.ecs.register_component("skeleton", raw.define(function (proto, _super) {

  proto.create = (function (_super) {
    var self, t, bind_pos = [], ik_chain = null;
    return function (def, entity,ecs) {
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
          cone:j.cone
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
      ch.joints.forEach(function (j,i) {
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
        vec3.normalize(v2,v2);        
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

  proto.resolve_ik_chain2 = (function () {

    var i = 0, ln = 0, j = null, lp, p, tg, ch, clen = 0,
      posi = [], roti = [0, 0, 0, 0], q1 = [0, 0, 0, 0], q2 = [0, 0, 0, 0];

    var v1x, v1y, v1z, v2x, v2y, v2z;

    var thr = 0.01, thg = thr * thr, ter = 0;
    var v1 = [], v2 = [], cv = [],vn=[];

    var a0, a1, a2, a3, det;
    for (i = 0; i < 10; i++) {
      posi[i] = [0, 0, 0];
    }
    window.posi = posi;


    proto.resolve_ik_chain_backword = function (chain) {
      ch = chain.joints;
      tg = chain.effector.position_world;
      clen = ch.length - 1;
      lp = tg;
      i = clen - 1;

      ch[clen].transform.position_world[0] = tg[0];
      ch[clen].transform.position_world[1] = tg[1];
      ch[clen].transform.position_world[2] = tg[2];

      while (i > -1) {
        p = ch[i].transform.position_world;
        v1x = p[0] - lp[0];
        v1y = p[1] - lp[1];
        v1z = p[2] - lp[2];
        ln = v1x * v1x + v1y * v1y + v1z * v1z;
        ln = ln > 0 ? 1 / Math.sqrt(ln) : ln;
        v1x *= ln; v1y *= ln; v1z *= ln;
        ln = ch[i + 1].length;
        p[0] = lp[0] + v1x * ln;
        p[1] = lp[1] + v1y * ln;
        p[2] = lp[2] + v1z * ln;
        lp = p;
        i--;
      }
    };

    proto.resolve_ik_chain_forward = function (chain) {
      ch = chain.joints;
      tg = chain.effector.position_world;
      clen = ch.length - 1;      
      lp = chain.root_pos;
      i = 1;
      raw.math.vec3.copy(chain.root.transform.position_world,chain.root_pos);
      while (i <= clen) {
        p = ch[i].transform.position_world;
        v1x = p[0] - lp[0]; v1y = p[1] - lp[1]; v1z = p[2] - lp[2];
        ln = v1x * v1x + v1y * v1y + v1z * v1z;
        ln = ln > 0 ? 1 / Math.sqrt(ln) : ln;
        v1x *= ln; v1y *= ln; v1z *= ln;
        ln = ch[i].length;
        p[0] = lp[0] + v1x * ln;
        p[1] = lp[1] + v1y * ln;
        p[2] = lp[2] + v1z * ln;
        lp = p;
        i++;
      }
    };

    proto.resolve_ik_chain_rotations = function (chain) {
      ch = chain.joints;
      tg = chain.effector.position_world;
      clen = ch.length - 1;

      i = 0;
      if (ch[0].transform.parent !== null) {
        lp = ch[0].transform.parent.rotation_world;
        roti[0] = lp[0]; roti[1] = lp[1]; roti[2] = lp[2]; roti[3] = lp[3];
      }
      else {
        roti[0] = 0; roti[1] = 0; roti[2] = 0; roti[3] = 1;
      }
      while (i < clen) {
        j = ch[i];
        p = ch[i].transform.position_world;
        lp = ch[i + 1].transform.position_world;
        v1x = lp[0] - p[0]; v1y = lp[1] - p[1]; v1z = lp[2] - p[2];

        ln = v1x * v1x + v1y * v1y + v1z * v1z;
        ln = ln > 0 ? 1 / Math.sqrt(ln) : ln;
        v1x *= ln; v1y *= ln; v1z *= ln;


        //raw.math.quat.rotation_to2(q1, raw.math.V3_Y, v1);
        // ln = 0 * v1x + 1 * v1y + 0 * v1z;
        q1[0] = v1z;// 1 * v1z - 0 * v1y;
        q1[1] = 0; // 0 * v1x - 0 * v1z;
        q1[2] = -v1x; // 0 * v1y - 1 * v1x;
        q1[3] = 1 + v1y;// 1 + ln;


        //raw.math.quat.normalize(q1, q1);
        ln = q1[0] * q1[0] + q1[1] * q1[1] + q1[2] * q1[2] + q1[3] * q1[3];
        ln = ln > 0 ? 1 / Math.sqrt(ln) : ln;
        q1[0] *= ln;
        q1[1] *= ln;
        q1[2] *= ln;
        q1[3] *= ln;



        // raw.math.quat.invert(q2, roti);
        a0 = roti[0]; a1 = roti[1]; a2 = roti[2]; a3 = roti[3];
        det = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
        det = det > 0 ? 1.0 / det : 0;
        q2[0] = -a0 * det;
        q2[1] = -a1 * det;
        q2[2] = -a2 * det;
        q2[3] = a3 * det;

        raw.math.quat.multiply(j.transform.rotation, q2, q1);
        raw.math.quat.multiply(roti, roti, j.transform.rotation);

        //raw.math.quat.normalize(j.transform.rotation, j.transform.rotation);

        p = j.transform.rotation_world;
        p[0] = roti[0];
        p[1] = roti[1];
        p[2] = roti[2];
        p[3] = roti[3];

        //raw.math.quat.normalize(p, p);


        j.transform.require_update = 100;


        i++;
      }
    
    };


    return function (chain, iter) {
      ch = chain.joints;
      tg = chain.effector.position_world;
      clen = ch.length - 1;

      p = ch[clen].transform.position_world;
      lp = tg;
      v1x = p[0] - lp[0]; v1y = p[1] - lp[1]; v1z = p[2] - lp[2];
      ln = v1x * v1x + v1y * v1y + v1z * v1z;
      if (ln < thg) {
        return false;
      }

      for (i = 0; i < clen; i++) {
        j = ch[i];
        posi[i][0] = j.transform.position_world[0];
        posi[i][1] = j.transform.position_world[1];
        posi[i][2] = j.transform.position_world[2];
      }

      ter = 0;



      while (ter < iter) {
        lp = tg;


        posi[clen][0] = tg[0];
        posi[clen][1] = tg[1];
        posi[clen][2] = tg[2];


        i = clen - 1;

        while (i > -1) {
          p = posi[i];
          v1x = p[0] - lp[0];
          v1y = p[1] - lp[1];
          v1z = p[2] - lp[2];
          ln = v1x * v1x + v1y * v1y + v1z * v1z;
          ln = ln > 0 ? 1 / Math.sqrt(ln) : ln;
          v1x *= ln; v1y *= ln; v1z *= ln;
          ln = ch[i + 1].length;
          p[0] = lp[0] + v1x * ln;
          p[1] = lp[1] + v1y * ln;
          p[2] = lp[2] + v1z * ln;
          lp = p;
          i--;
        }


     

        chain.root_pos[0] = posi[0][0];
        chain.root_pos[1] = posi[0][1];
        chain.root_pos[2] = posi[0][2];


        lp = chain.root.transform.position_world;
        i = 1;

        while (i <= clen) {
          p = posi[i]; 
          v1x = p[0] - lp[0]; v1y = p[1] - lp[1]; v1z = p[2] - lp[2];
          ln = v1x * v1x + v1y * v1y + v1z * v1z;
          ln = ln > 0 ? 1 / Math.sqrt(ln) : ln;
          v1x *= ln; v1y *= ln; v1z *= ln;
          ln = ch[i].length;
          p[0] = lp[0] + v1x * ln;
          p[1] = lp[1] + v1y * ln;
          p[2] = lp[2] + v1z * ln;
          lp = p;
          i++;
        }

      


        p = posi[clen];
        lp = tg;
        v1x = p[0] - lp[0]; v1y = p[1] - lp[1]; v1z = p[2] - lp[2];

        ln = v1x * v1x + v1y * v1y + v1z * v1z;
        if (ln < thg) {
          break;
        }

        ter++;
      }

      for (i = 1; i <= clen; i++) {
        j = ch[i];
        if (j.limit_movement !== undefined) {
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


          raw.math.vec3.subtract(cv, posi[i], v2);

          ln = Math.sqrt(cv[0] * cv[0] + cv[1] * cv[1] + cv[2] * cv[2]);

          if (ln > j.limit_movement) {
            // raw.math.vec3.subtract(cv, posi[i], v2);
            raw.math.vec3.normalize(cv, cv);
            //raw.math.vec3.scale_add(posi[i], posi[i], cv,j.limit_movement - ln);
            /*
            raw.math.vec3.subtract(cv, posi[i], v2);
            raw.math.vec3.normalize(cv, cv);
            raw.math.vec3.scale_add(cv, v2, cv, j.limit_movement);
            raw.math.vec3.subtract(cv, cv, posi[i - 1]);
            raw.math.vec3.normalize(cv, cv);
            raw.math.vec3.scale_add(posi[i], posi[i - 1], cv, j.length);
            */
          }

        }

      }



      posi[0][0] = chain.root.transform.position_world[0];
      posi[0][1] = chain.root.transform.position_world[1];
      posi[0][2] = chain.root.transform.position_world[2];

      i = 0;
      if (ch[0].transform.parent !== null) {
        lp = ch[0].transform.parent.rotation_world;
        roti[0] = lp[0]; roti[1] = lp[1]; roti[2] = lp[2]; roti[3] = lp[3];
      }
      else {
        roti[0] = 0; roti[1] = 0; roti[2] = 0; roti[3] = 1;
      }
      while (i < clen) {
        j = ch[i];
        p = posi[i];
        lp = posi[i + 1];
        v1x = lp[0] - p[0]; v1y = lp[1] - p[1]; v1z = lp[2] - p[2];

        ln = v1x * v1x + v1y * v1y + v1z * v1z;
        ln = ln > 0 ? 1 / Math.sqrt(ln) : ln;
        v1x *= ln; v1y *= ln; v1z *= ln;


        //raw.math.quat.rotation_to2(q1, raw.math.V3_Y, v1);
        // ln = 0 * v1x + 1 * v1y + 0 * v1z;
        q1[0] = v1z;// 1 * v1z - 0 * v1y;
        q1[1] = 0; // 0 * v1x - 0 * v1z;
        q1[2] = -v1x; // 0 * v1y - 1 * v1x;
        q1[3] = 1 + v1y;// 1 + ln;


        //raw.math.quat.normalize(q1, q1);
        ln = q1[0] * q1[0] + q1[1] * q1[1] + q1[2] * q1[2] + q1[3] * q1[3];
        ln = ln > 0 ? 1 / Math.sqrt(ln) : ln;
        q1[0] *= ln;
        q1[1] *= ln;
        q1[2] *= ln;
        q1[3] *= ln;



        // raw.math.quat.invert(q2, roti);
        a0 = roti[0]; a1 = roti[1]; a2 = roti[2]; a3 = roti[3];
        det = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
        det = det > 0 ? 1.0 / det : 0;
        q2[0] = -a0 * det;
        q2[1] = -a1 * det;
        q2[2] = -a2 * det;
        q2[3] = a3 * det;

        raw.math.quat.multiply(j.transform.rotation, q2, q1);
        raw.math.quat.multiply(roti, roti, j.transform.rotation);


        
        if (i > 0) {
          p = posi[i];
          lp = j.transform.position_world;
          lp[0] = p[0];
          lp[1] = p[1];
          lp[2] = p[2];




        }

        p = j.transform.rotation_world;
        p[0] = roti[0];
        p[1] = roti[1];
        p[2] = roti[2];
        p[3] = roti[3];

        
        /*
        else {

          j.ik_count++;

          p = j.ik_rotate;
          p[0] += roti[0];
          p[1] += roti[1];
          p[2] += roti[2];
          p[3] += roti[3];

          
          p = posi[i];
          lp = j.ik_pos;
          lp[0] += p[0];
          lp[1] += p[1];
          lp[2] += p[2];
          

        }
        */

        j.transform.require_update = 100;


        i++;
      }
      
      p = posi[clen];
      lp = ch[clen].transform.position_world
      lp[0] = p[0];
      lp[1] = p[1];
      lp[2] = p[2];
      ch[clen].transform.require_update = 100;
      

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

  proto.resolve_ik3 = function (skeleton) {
    for (ik = 0; ik < skeleton.ik_chains.length; ik++) {
      ik_chain = skeleton.ik_chains[ik];
      if (!ik_chain.enabled) continue;
      vec3.copy(ik_chain.root_pos, ik_chain.root.transform.position_world);
      if (this.resolve_ik_chain(ik_chain, 1)) {
        ik_chain.root.ik_chain_updated = true;
        this.ecs.systems['transform_system'].process(skeleton.transforms, 1);
      }
    }

    for (ik = 0; ik < skeleton.ik_trackers.length; ik++) {
      ik_chain = skeleton.ik_trackers[ik];
      raw.math.vec3.set(v1, 0, 0, 0);
      for (k = 0; k < ik_chain.positions.length; k++) {
        raw.math.vec3.add(v1, v1, ik_chain.positions[k]);
      }
      raw.math.vec3.scale(ik_chain.tracker, v1, 1 / ik_chain.positions.length);

    };





  }

  proto.resolve_ik2 = function (skeleton) {


    for (ik = 0; ik < skeleton.ik_chains.length; ik++) {

      ik_chain = skeleton.ik_chains[ik];
      if (!ik_chain.enabled) continue;
      raw.math.vec3.copy(ik_chain.root_pos, ik_chain.root.transform.position_world);
      this.resolve_ik_chain_backword(ik_chain);
    };

    for (ik = 0; ik < skeleton.ik_trackers.length; ik++) {
      ik_chain = skeleton.ik_trackers[ik];
      raw.math.vec3.set(v1, 0, 0, 0);
      for (k = 0; k < ik_chain.transforms.length; k++) {
        raw.math.vec3.add(v1, v1, ik_chain.transforms[k].position_world);
      }
      raw.math.vec3.scale(ik_chain.tracker.position_world,
        v1, 1 / ik_chain.transforms.length);

    };

    for (ik = 0; ik < skeleton.ik_chains.length; ik++) {
      ik_chain = skeleton.ik_chains[ik];
      if (!ik_chain.enabled) continue;
      this.resolve_ik_chain_forward(ik_chain);
    };

    for (ik = 0; ik < skeleton.ik_chains.length; ik++) {
      ik_chain = skeleton.ik_chains[ik];
      if (!ik_chain.enabled) continue;
      this.resolve_ik_chain_rotations(ik_chain);
    };

    this.ecs.systems['transform_system'].process(skeleton.transforms, 1);
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
      if (geo.attributes.a_position_rw.data[i + 1] > 0.3 ) {
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
    mat.shader2 = mat.shader.extend(`
uniform vec3 u_bone_start;
uniform vec3 u_bone_end;
uniform vec3 u_skeleton_pos;


mat3 rotate_bone( vec3 u2)
{
    vec3 u1=vec3(0.0,1.0,0.0);
    vec3 axis = cross( u1, u2 );
    float cosA = dot( u1, u2 );
    float k = 1.0 / (1.0 + cosA);  

    return mat3 ( (axis.x * axis.x * k) + cosA,(axis.y * axis.x * k) - axis.z, 
                 (axis.z * axis.x * k) + axis.y,(axis.x * axis.y * k) + axis.z,  
                 (axis.y * axis.y * k) + cosA, (axis.z * axis.y * k) - axis.x,
                 (axis.x * axis.z * k) - axis.y,  (axis.y * axis.z * k) + axis.x,  (axis.z * axis.z * k) + cosA 
                 );

}

void vertex(){
    super_vertex();
    v_position_rw=vec4(a_position_rw,1.0);    
    vec3 dir=(u_bone_end-u_bone_start);
    float len=length(dir);   
    v_position_rw.y*=len;
    v_position_rw.xz*=min(len,1.0);
    v_position_rw.xyz*=rotate_bone(normalize(dir));
    v_position_rw.xyz+=u_bone_start;
    v_position_rw.xyz+=u_skeleton_pos;
    gl_Position=u_view_projection_rw*u_model_rw*v_position_rw;
}
`);


    var axis_geo = raw.geometry.create({
      vertices: new Float32Array([
        0, 0, 0, 0.5, 0, 0,
        0, 0, 0, 0, 1, 0,
        0, 0, 0, 0, 0,0.5
      ]),
      colors: new Float32Array([
        1, 0, 0, 1, 1, 0, 0, 1,
        0, 1, 0, 1, 0, 1, 0, 1,
        0, 0, 1, 1, 0, 0, 1, 1,
      ])
    });

    mat.shader = mat.shader.extend(`
uniform vec4 u_joint_qr;
uniform vec3 u_bone_start;
uniform vec3 u_bone_end;
uniform vec3 u_skeleton_pos;
<?=chunk('quat-dquat')?>

void vertex(){
  super_vertex();
  v_position_rw=vec4(a_position_rw,1.0);          
  float len=length((u_bone_end-u_bone_start));
  v_position_rw.xz*=min(len,1.0);
  v_position_rw.y*=len;  
  v_position_rw.xyz=quat_transform(u_joint_qr,v_position_rw.xyz);  
  v_position_rw.xyz+=u_bone_start; //+u_skeleton_pos;
  gl_Position=u_view_projection_rw*v_position_rw;
}
`);

    mat.shader_axis = raw.webgl.shader.parse(`
attribute vec3 a_position_rw;
attribute vec4 a_color_rw;
uniform mat4 u_view_projection_rw;
uniform vec4 u_joint_qr;
uniform vec3 u_bone_start;
uniform vec3 u_bone_end;
uniform vec3 u_skeleton_pos;

varying vec4 v_color_rw;
<?=chunk('quat-dquat')?>
void vertex(){  
float len=max(length(u_bone_end-u_bone_start),0.5);
 vec4 v_position_rw=vec4(a_position_rw,1.0);   
v_position_rw.y*=len;
//v_position_rw.xz*=len*0.25;
  v_position_rw.xyz=quat_transform(u_joint_qr,v_position_rw.xyz);  
  v_position_rw.xyz+=u_bone_start; //+u_skeleton_pos;
 v_color_rw=a_color_rw;
  gl_Position=u_view_projection_rw*v_position_rw;
 
}
<?=chunk('precision')?>

varying vec4 v_color_rw;
void fragment(void) {	
    gl_FragColor =v_color_rw;
}
`);


    var obj_material = raw.math.mat4(), pos = null;

    mat.complete_render_mesh2 = function (renderer, shader, mesh) {

      for (k = 0; k < mesh.sys.display_skeletons.length; k++) {
        skeleton = mesh.sys.display_skeletons[k];

        for (i = 0; i < skeleton.skeleton._ik_targets.length; i++) {
          pos = skeleton.skeleton._ik_targets[i].position_world;
          mesh.DP.add(
            pos[0],
            pos[1],
            pos[2],
            1, 0, 0, 20);
        }


        for (i = 0; i < skeleton.skeleton.joints.length; i++) {
          joint = skeleton.skeleton.joints[i];
          if (joint.transform.parent !== null) {
            shader.set_uniform("u_bone_start", joint.transform.parent.position_world);
            shader.set_uniform("u_bone_end", joint.transform.position_world);
            shader.set_uniform("u_bone_scale", joint.transform.parent.scale);
            shader.set_uniform("u_skeleton_pos", skeleton.transform.position_world);

            renderer.gl.drawElements(this.final_draw_type, this.final_draw_count, raw.GL_UNSIGNED_INT, 0);
          }
        }
      }
    };

    var qr = raw.math.quat(), qd = raw.math.quat(), vv = raw.math.vec3(), qq = null;
    
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
      mat.shader = mat.shader.extend(`
attribute vec4 a_joints_indices;
attribute vec4 a_joints_weights;

uniform vec4 joint_qr[60];
uniform vec4 joint_qd[60];

vec3 dquat_transform(vec4 qr, vec4 qd, vec3 v)
{
   return (v + cross(2.0 * qr.xyz, cross(qr.xyz, v) + qr.w * v))+
	  (2.0 * (qr.w * qd.xyz - qd.w * qr.xyz + cross(qr.xyz, qd.xyz)));    
}
vec3 dquat_transform2(vec4 qr, vec4 qd, vec3 v)
{
   return (v + cross(2.0 * qr.xyz, cross(qr.xyz, v) + qr.w * v));
}

vec4 _qr;
vec4 _qd;
vec4 att_position(void){
    vec4 pos=super_att_position();
vec4 w=a_joints_weights;
int i0=int(a_joints_indices.x);
int i1=int(a_joints_indices.y);
int i2=int(a_joints_indices.z);
int i3=int(a_joints_indices.w);


vec4 dqr0 = joint_qr[i0];
vec4 dqr1 = joint_qr[i1];
vec4 dqr2 = joint_qr[i2];
vec4 dqr3 = joint_qr[i3];
if (dot(dqr0, dqr1) < 0.0) w.y *= -1.0;
if (dot(dqr0, dqr2) < 0.0) w.z *= -1.0;
if (dot(dqr0, dqr3) < 0.0) w.w *= -1.0;

_qr=w.x*dqr0+w.y*dqr1+w.z*dqr2+w.w*dqr3;
_qd=w.x*joint_qd[i0]+w.y*joint_qd[i1]+w.z*joint_qd[i2]+w.w*joint_qd[i3];
float len =1.0/ length(_qr);
_qr *= len;
_qd *= len;

pos.xyz=dquat_transform(_qr,_qd,pos.xyz);


return pos;

}
vec4 att_normal(void){
    return vec4(dquat_transform2(_qr,_qd,a_normal_rw),0.0);
}

void vertex(){
super_vertex();
}

        `);      
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

  var bind_pos = raw.math.vec3(), bind_transform_inv = raw.math.dquat();


  proto.skin_geometry = function (geo, ske) {
    var ab = raw.math.vec3(), av = raw.math.vec3();
    var i = 0, k = 0, j = null, ds = 0;
    var d = [];
    var v = geo.attributes["a_position_rw"].data;
    var js = geo.add_attribute("a_joints_indices", { data: new Float32Array((v.length / 3) * 4), item_size: 4 });
    var jw = geo.add_attribute("a_joints_weights", { data: new Float32Array((v.length / 3) * 4), item_size: 4 });
    var pa, pb;
    
    var si = 0, vt = 0;
    var v1 = [], v2 = [], bc = 0, jlen = 0;
    //js.data.fill(-1);jw.data.fill(-1);

    for (i = 0; i < v.length; i += 3) {
      d.length = 0;
      bc = 0;
      for (k = 0; k < ske.skinned_joints.length; k++) {
        j = ske.skinned_joints[k];
        pa = j.transform.bind_pos;
        pb = pa;
        if (j.transform.parent !== null) {
          pb = j.transform.parent.bind_pos;
        }
        raw.math.vec3.subtract(ab, pa, pb);

        av[0] = v[i] - pa[0];
        av[1] = v[i + 1] - pa[1];
        av[2] = v[i + 2] - pa[2];

        vt = raw.math.vec3.dot(ab, av) / (Math.abs(raw.math.vec3.get_length(ab)) || 1);


        
        if (vt >= 0 && vt <= 1) {          
          d.push([Math.abs(vt), k, i / 3, av.join(), pa.join(),]);
         // bc++;
        }    


       // raw.math.vec3.scale(v1, ab, vt);
       // raw.math.vec3.add(v1, pa, v1);

      }


      if (bc < 1) {
        console.log(v[0], v[1])
        for (k = 0; k < ske.skinned_joints.length; k++) {
          j = ske.skinned_joints[k];
          pa = j.transform.bind_pos;

          av[0] = v[i] - pa[0];
          av[1] = v[i + 1] - pa[1];
          av[2] = v[i + 2] - pa[2];

          //d.push([(Math.abs(Math.abs(raw.math.vec3.get_length(av)) - j.length) / (j.length || 1)), k, i / 3]);
          jlen = j.length || 1;
          d.push([1-(raw.math.vec3.get_length(av) / jlen), k, i / 3]);


        }

      }
     
      d.sort(function (a, b) {
        return a[0] - b[0];
      });
      si = (i / 3) * 4;
      //console.log('-----------');
      for (k = 0; k < Math.min(ske.skinned_joints.length, 4); k++) {
        if (k < d.length) {
          //  console.log(k+' '+ d[k].join("/"));
          js.data[si + k] = d[k][1];
          jw.data[si + k] = d[k][0];

          if (k > 0 && jw.data[si + k] > 1) {
            jw.data[si + k] = 0;
          }
          //  else jw.data[si + k] =1-Math.min(jw.data[si + k], 1);

        }
      }
      

    }/*
    for (i = 0; i < v.length; i += 3) {
      d.length = 0;
      bc = 0;
      si = (i / 3) * 4;
      if (jw.data[si] !== -1) continue

      for (k = 0; k < ske.skinned_joints.length; k++) {
        j = ske.skinned_joints[k];
        pa = j.transform.bind_pos;
        vt = Math.abs(raw.math.vec3.distance2(
          pa[0], pa[1], pa[2],
          v[i], v[i + 1], v[i + 2])
        );
        d.push([ vt, k, i / 3, av.join(), pa.join(),]);
      }
      d.sort(function (a, b) {
        return a[1] - b[1];
      });      

      if (d.length > 0) {
        for (k = 0; k < Math.min(ske.skinned_joints.length, 4); k++) {
          if (k < d.length) {
            js.data[si + k] = d[k][1];
            jw.data[si + k] = d[k][0];
          }
        }
      }

    }
    for (i = 0; i < jw.data.length; i++) {
      if (js.data[i] === -1) js.data[i] = 0;
      if (jw.data[i] === -1) jw.data[i] = 0;
    }
    */
    console.log(geo.attributes);
    this.normalize_skin_weights(geo);
    return;
    var jpos = [], jlen = [];
    


    for (i = 0; i < ske.skinned_joints.length; i++) {
      j = ske.skinned_joints[i];
      raw.math.dquat.invert(bind_transform_inv, j.bind_transform);
      raw.math.dquat.get_translation(bind_pos, bind_transform_inv);
      if (j.transform.parent !== null) {
        raw.math.vec3.subtract(v1, j.transform.position_world, j.transform.parent.position_world);
        raw.math.vec3.normalize(v1, v1);
        raw.math.vec3.scale(v2, v1, j.length * 0.5);
       // jpos.push(raw.math.vec3.subtract([], j.transform.position_world, v2));
        jpos.push([bind_pos[0], bind_pos[1], bind_pos[2]]);

      }
      else {
        jpos.push([bind_pos[0], bind_pos[1], bind_pos[2]]);
      }

      jlen.push(j.length || 1);
    }
   

    for (i = 0; i < v.length; i += 3) {
      for (k = 0; k < jpos.length; k++) {
        ds = Math.abs(raw.math.vec3.distance2(
          jpos[k][0], jpos[k][1], jpos[k][2],
          v[i], v[i + 1], v[i + 2])
        );
        d[k] = [k, ds];

      }

      d.sort(function (a, b) {
        return a[1] - b[1];
      });


      for (k = 0; k < Math.min(jpos.length, 4); k++) {
        js.data[si + k] = d[k][0];
        jw.data[si + k] = (jlen[js.data[si + k]]) / d[k][1];        
      }
      si += 4;
    }
    console.log(jlen);
    console.log(jpos);
   // this.normalize_skin_weights(geo);
    return geo;
  };


  proto.skin_geometry = function (geo, ske) {
    var i = 0, k = 0, j = null, ds = 0;
    var d = [];
    var v = geo.attributes["a_position_rw"].data;
    var js = geo.add_attribute("a_joints_indices", { data: new Float32Array((v.length / 3) * 4), item_size: 4 });
    var jw = geo.add_attribute("a_joints_weights", { data: new Float32Array((v.length / 3) * 4), item_size: 4 });

    var jpos = [], jlen = [], v1 = [], v2 = [];
    for (i = 0; i < ske.skinned_joints.length; i++) {
      j = ske.skinned_joints[i];

      jpos.push(j.transform.bind_pos);
      jlen.push(j.length || 1);
    }
    var si = 0;
    for (i = 0; i < v.length; i += 3) {
      for (k = 0; k < jpos.length; k++) {
        ds = Math.abs(raw.math.vec3.distance2(jpos[k][0], jpos[k][1], jpos[k][2], v[i], v[i + 1], v[i + 2]));
        d[k] = [k, ds ];

      }

      d.sort(function (a, b) {
        return a[1] - b[1];
      });

      si = (i / 3) * 4;
      for (k = 0; k < Math.min(jpos.length, 4); k++) {
        js.data[si + k] =d[k][0];
        jw.data[si + k] = (jlen[js.data[si + k]])/d[k][1]  ;

        if (k > 0 && d[k][1] > jlen[js.data[si + k]]) {
          jw.data[si + k] = 0;
        }
      }
    }

    this.normalize_skin_weights(geo);
    for (i = 0; i < v.length; i += 3) {
      si = (i / 3) * 4;
      console.log((i / 3) +
        ' ' + v[0] + "," + v[1] + "," + v[2]
        + '/' + js.data[si] + "," + js.data[si + 1] + "," + js.data[si + 2] + "," + js.data[si + 3]
        + '/' + (jw.data[si].toFixed(2)) + "," + (jw.data[si + 1].toFixed(2)) + "," + (jw.data[si + 2].toFixed(2)) + "," + (jw.data[si + 3].toFixed(2))
      );
    }
    console.log(geo.attributes);
    
    return geo;
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
        jw.data[si + k] =( d[k][1] / (jlen[js.data[si + k]]));

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


/*
 
  dqs.cg

  Dual quaternion skinning vertex shaders (no shading computations)

  Version 1.0.3, November 1st, 2007

  Copyright (C) 2006-2007 University of Dublin, Trinity College, All Rights
  Reserved

  This software is provided 'as-is', without any express or implied
  warranty.  In no event will the author(s) be held liable for any damages
  arising from the use of this software.

  Permission is granted to anyone to use this software for any purpose,
  including commercial applications, and to alter it and redistribute it
  freely, subject to the following restrictions:

  1. The origin of this software must not be misrepresented; you must not
     claim that you wrote the original software. If you use this software
     in a product, an acknowledgment in the product documentation would be
     appreciated but is not required.
  2. Altered source versions must be plainly marked as such, and must not be
     misrepresented as being the original software.
  3. This notice may not be removed or altered from any source distribution.

  Author: Ladislav Kavan, ladislav.kavan@gmail.com



struct inputs
{
  float4 position: POSITION;
  float4 normal: NORMAL;
  float4 weights: TEXCOORD1;
  float4 matrixIndices: TEXCOORD2;
};

struct outputs
{
  float4 hPosition: POSITION;
  float4 hNormal: TEXCOORD1;
};

float3x4 DQToMatrix(float4 Qn, float4 Qd)
{
  float3x4 M;
  float len2 = dot(Qn, Qn);
  float w = Qn.x, x = Qn.y, y = Qn.z, z = Qn.w;
  float t0 = Qd.x, t1 = Qd.y, t2 = Qd.z, t3 = Qd.w;

  M[0][0] = w * w + x * x - y * y - z * z; M[0][1] = 2 * x * y - 2 * w * z; M[0][2] = 2 * x * z + 2 * w * y;
  M[1][0] = 2 * x * y + 2 * w * z; M[1][1] = w * w + y * y - x * x - z * z; M[1][2] = 2 * y * z - 2 * w * x;
  M[2][0] = 2 * x * z - 2 * w * y; M[2][1] = 2 * y * z + 2 * w * x; M[2][2] = w * w + z * z - x * x - y * y;

  M[0][3] = -2 * t0 * x + 2 * w * t1 - 2 * t2 * z + 2 * y * t3;
  M[1][3] = -2 * t0 * y + 2 * t1 * z - 2 * x * t3 + 2 * w * t2;
  M[2][3] = -2 * t0 * z + 2 * x * t2 + 2 * w * t3 - 2 * t1 * y;

  M /= len2;

  return M;
}

// basic dual quaternion skinning:
outputs dqs(inputs IN,
  uniform float4x4 modelViewProj,
  uniform float4x4 modelViewIT,
  uniform float2x4 boneDQ[100])
{
  outputs OUT;

  float2x4 blendDQ = IN.weights.x * boneDQ[IN.matrixIndices.x];
  blendDQ += IN.weights.y * boneDQ[IN.matrixIndices.y];
  blendDQ += IN.weights.z * boneDQ[IN.matrixIndices.z];
  blendDQ += IN.weights.w * boneDQ[IN.matrixIndices.w];

  float3x4 M = DQToMatrix(blendDQ[0], blendDQ[1]);
  float3 position = mul(M, IN.position);
  float3 normal = mul(M, IN.normal);

  OUT.hPosition = mul(modelViewProj, float4(position, 1.0));
  OUT.hNormal = mul(modelViewIT, float4(normal, 0.0));

  return OUT;
}

// per-vertex antipodality handling (this is the most robust, but not the most efficient way):
outputs dqsAntipod(inputs IN,
  uniform float4x4 modelViewProj,
  uniform float4x4 modelViewIT,
  uniform float2x4 boneDQ[100])
{
  outputs OUT;

  float2x4 dq0 = boneDQ[IN.matrixIndices.x];
  float2x4 dq1 = boneDQ[IN.matrixIndices.y];
  float2x4 dq2 = boneDQ[IN.matrixIndices.z];
  float2x4 dq3 = boneDQ[IN.matrixIndices.w];

  if (dot(dq0[0], dq1[0]) < 0.0) dq1 *= -1.0;
  if (dot(dq0[0], dq2[0]) < 0.0) dq2 *= -1.0;
  if (dot(dq0[0], dq3[0]) < 0.0) dq3 *= -1.0;

  float2x4 blendDQ = IN.weights.x * dq0;
  blendDQ += IN.weights.y * dq1;
  blendDQ += IN.weights.z * dq2;
  blendDQ += IN.weights.w * dq3;

  float3x4 M = DQToMatrix(blendDQ[0], blendDQ[1]);
  float3 position = mul(M, IN.position);
  float3 normal = mul(M, IN.normal);

  OUT.hPosition = mul(modelViewProj, float4(position, 1.0));
  OUT.hNormal = mul(modelViewIT, float4(normal, 0.0));

  return OUT;
}

// optimized version (avoids dual quaternion - matrix conversion):
outputs dqsFast(inputs IN,
  uniform float4x4 modelViewProj,
  uniform float4x4 modelViewIT,
  uniform float2x4 boneDQ[100])
{
  outputs OUT;

  float2x4 blendDQ = IN.weights.x * boneDQ[IN.matrixIndices.x];
  blendDQ += IN.weights.y * boneDQ[IN.matrixIndices.y];
  blendDQ += IN.weights.z * boneDQ[IN.matrixIndices.z];
  blendDQ += IN.weights.w * boneDQ[IN.matrixIndices.w];

  float len = length(blendDQ[0]);
  blendDQ /= len;

  float3 position = IN.position.xyz + 2.0 * cross(blendDQ[0].yzw, cross(blendDQ[0].yzw, IN.position.xyz) + blendDQ[0].x * IN.position.xyz);
  float3 trans = 2.0 * (blendDQ[0].x * blendDQ[1].yzw - blendDQ[1].x * blendDQ[0].yzw + cross(blendDQ[0].yzw, blendDQ[1].yzw));
  position += trans;

  float3 inpNormal = IN.normal.xyz;
  float3 normal = inpNormal + 2.0 * cross(blendDQ[0].yzw, cross(blendDQ[0].yzw, inpNormal) + blendDQ[0].x * inpNormal);

  OUT.hPosition = mul(modelViewProj, float4(position, 1.0));
  OUT.hNormal = mul(modelViewIT, float4(normal, 0.0));

  return OUT;
}

float3x3 adjointTransposeMatrix(float3x3 M)
{
  float3x3 atM;
  atM._m00 = M._m22 * M._m11 - M._m12 * M._m21;
  atM._m01 = M._m12 * M._m20 - M._m10 * M._m22;
  atM._m02 = M._m10 * M._m21 - M._m20 * M._m11;

  atM._m10 = M._m02 * M._m21 - M._m22 * M._m01;
  atM._m11 = M._m22 * M._m00 - M._m02 * M._m20;
  atM._m12 = M._m20 * M._m01 - M._m00 * M._m21;

  atM._m20 = M._m12 * M._m01 - M._m02 * M._m11;
  atM._m21 = M._m10 * M._m02 - M._m12 * M._m00;
  atM._m22 = M._m00 * M._m11 - M._m10 * M._m01;

  return atM;
}

// two-phase skinning: dqsFast combined with scale/shear transformations:
outputs dqsScale(inputs IN,
  uniform float4x4 modelViewProj,
  uniform float4x4 modelViewIT,
  uniform float2x4 boneDQ[100],
  uniform float3x4 scaleM[100])
{
  outputs OUT;

  // first pass:
  float3x4 blendS = IN.weights.x * scaleM[IN.matrixIndices.x];
  blendS += IN.weights.y * scaleM[IN.matrixIndices.y];
  blendS += IN.weights.z * scaleM[IN.matrixIndices.z];
  blendS += IN.weights.w * scaleM[IN.matrixIndices.w];

  float3 pass1_position = mul(blendS, IN.position);
  float3x3 blendSrotAT = adjointTransposeMatrix(float3x3(blendS));
  float3 pass1_normal = normalize(mul(blendSrotAT, IN.normal.xyz));

  // second pass:
  float2x4 blendDQ = IN.weights.x * boneDQ[IN.matrixIndices.x];
  blendDQ += IN.weights.y * boneDQ[IN.matrixIndices.y];
  blendDQ += IN.weights.z * boneDQ[IN.matrixIndices.z];
  blendDQ += IN.weights.w * boneDQ[IN.matrixIndices.w];

  float len = length(blendDQ[0]);
  blendDQ /= len;

  float3 position = pass1_position + 2.0 * cross(blendDQ[0].yzw, cross(blendDQ[0].yzw, pass1_position) + blendDQ[0].x * pass1_position);
  float3 trans = 2.0 * (blendDQ[0].x * blendDQ[1].yzw - blendDQ[1].x * blendDQ[0].yzw + cross(blendDQ[0].yzw, blendDQ[1].yzw));
  position += trans;

  float3 normal = pass1_normal + 2.0 * cross(blendDQ[0].yzw, cross(blendDQ[0].yzw, pass1_normal) + blendDQ[0].x * pass1_normal);

  OUT.hPosition = mul(modelViewProj, float4(position, 1.0));
  OUT.hNormal = mul(modelViewIT, float4(normal, 0.0));

  return OUT;
}
 * 
 */ 
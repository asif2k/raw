raw.ecs.register_system("particle_system", raw.define(function (proto, _super) {

  var glsl = raw.webgl.shader.create_chunks_lib(import('systems/particle_system.glsl'));


  proto.validate = function (ecs) {
    this.priority = ecs.use_system('camera_system').priority + 50;

    ecs._systems.for_each(function (sys, i, self) {
      if (sys.is_renderer) {
        self.renderer = sys;
      }

    }, this);
    this.setup_rendering(ecs);

  };

  proto.add_sub_system = (function () {


    return function (name,sys) {
      this.sub_systems[name] = sys;
      this._sub_systems.push(sys);
      sys.compile_worker();
      sys.attach(this);

    }

  })();

  proto.setup_rendering = (function () {
  
    


    return function (ecs) {
      if (this.sub_systems_meshes) return;
      this.sub_systems_meshes = [];
      ecs.create_entity({
        components: {
          'transform': {},
          'render_item': { items: this.sub_systems_meshes}
        }
      });

      this.add_sub_system("default",new raw.ecs.systems.particle_system.sub_system());

    }

  })();



  var emit;
  proto.step = (function () {
    var si = 0, sys = null,  i = 0;
    return function () {


      for (i = 0; i < this.emitters.length; i++) {
        emit = this.emitters.data[i];
        if (!emit.active) continue;
        if (this.ecs.timer - emit.start_time > emit.life) {
          emit.active = false;
          this.emitters_slots.push(i);
          continue;
        }

        if (emit.sys.state === 1) {
          if (this.ecs.timer - emit.last_emit_time > emit.rate) {
            emit.cb(emit);
            emit.e_count++;
            emit.last_emit_time = this.ecs.timer;
          }
        }
      }

      this.worked_items = 0;

      for (si = 0; si < this._sub_systems.length; si++) {
        sys = this._sub_systems[si];
        if (sys.state === 1) {
          sys.process_data[sys.process_data.length - 1] = this.time_delta / (1 / 60);

          sys.process_data[sys.process_data.length - 2] = sys.emit_i;
          sys.worker.postMessage([sys.process_data.buffer], [sys.process_data.buffer]);
          sys.state = 2;
          sys.emit_i = 0;         
        }

        this.worked_items += (sys.b_count/4);


      }
    }
  })();

 
  proto.spwan_emitter = function (sys_name, life, rate, cb) {

    if (this.emitters_slots.length > 0) {
      emit = this.emitters[this.emitters_slots.pop()];
    }
    else {
      emit = { active: false };
      this.emitters.push(emit);
    }

    emit.active = true;
    emit.sys = this.sub_systems[sys_name];
    emit.life = life;
    emit.start_time = this.ecs.timer;
    emit.cb = cb;
    emit.rate = rate;
    emit.e_count = 0;
    emit.last_emit_time = 0;
    return emit;

  }
  function particle_system(def, ecs) {
    _super.apply(this, [def, ecs]);
    this.sub_systems = {}; 
    this._sub_systems = [];
    this.emitters = new raw.array();
    this.emitters_slots = new raw.array();
    this.emitters_pool = new raw.object_pooler(function (system) {
      return {};
    });
    
  }

  particle_system.sub_system = raw.define(function (proto,_super) {

    proto.process = function (worker) {
      var i = 0, oi = 0, ei = 0, ecount = 0, time_delta = 0;
      worker.process = function (buffer) {

        process_data = new Float32Array(buffer);
        time_delta = process_data[process_data.length - 1];
        ecount = process_data[process_data.length - 2];
        oi = 0; i = 0;
        while (i < max_particles) {
          if (particles[i] > 0) {
            particles[i] -= (particles[i + 1] * time_delta);
            particles[i + 2] += particles[i + 5] * time_delta;
            particles[i + 3] += particles[i + 6] * time_delta;
            particles[i + 4] += particles[i + 7] * time_delta;
            output[oi++] = i;
          }
          else if (ecount > 0) {
            ei = ecount - 8;
            particles[i] = process_data[ei];
            particles[i + 1] = process_data[ei + 1];
            particles[i + 2] = process_data[ei + 2];
            particles[i + 3] = process_data[ei + 3];
            particles[i + 4] = process_data[ei + 4];
            particles[i + 5] = process_data[ei + 5];
            particles[i + 6] = process_data[ei + 6];
            particles[i + 7] = process_data[ei + 7];
            ecount -= 8;

          }
          i += 8;
        }

        ei = 0;
        while (oi > -1) {
          i = output[oi--];
          process_data[ei++] = particles[i + 2];
          process_data[ei++] = particles[i + 3];
          process_data[ei++] = particles[i + 4];
          process_data[ei++] = particles[i];
        }

        process_data[process_data.length - 1] = ei;
        this.postMessage([process_data.buffer], [process_data.buffer]);

      }
      worker.set_max_particles(5000);

    };

    proto.apply_process_data = function (buffer) {
      this.process_data = new Float32Array(buffer);
      this.b_count = this.process_data[this.process_data.length - 1];
      this.renderer.gl.bindBuffer(raw.GL_ARRAY_BUFFER, this.webgl_buffer);
      this.renderer.gl.bufferData(raw.GL_ARRAY_BUFFER, this.process_data, raw.GL_DYNAMIC_DRAW, 0, this.b_count);
      this.state = 1;

    };

    proto.compile_worker = function () {
      if (this.worker) return;

      if (!this.process_data) this.alloc_process_buffer(10000 * 4);

      this.worker = new Worker(window.URL.createObjectURL(new Blob([
        '(' + (function () {
          

          
          self.set_max_particles = function (num) {
            max_particles = num;
            particles = new Float32Array(num * 8);
            output = new Uint32Array(num);
          };

          self.onmessage = function (m) { this.process.apply(this, m.data); }

        }).toString() + ')();var p_count = 0,process_data = null, max_particles = 0,particles = null, output = null;self.main=' + this.process.toString() + ';self.main(self);'])));

      this.worker.system = this;
      this.worker.onmessage = function (m) {
        this.system.apply_process_data(m.data[0]);
      };
    };

    var mesh;
    proto.attach = function (system) {
      this.renderer = system.renderer;
      this.webgl_buffer = raw.webgl.buffers.get(this.renderer.gl);
      
      mesh = this.create_mesh();
      mesh.flags += raw.DISPLAY_ALWAYS;
      system.sub_systems_meshes.push(mesh);

    };

    proto.render_mesh = function (renderer, shader, mesh) {
      renderer.gl.enable(raw.GL_BLEND);      
      renderer.gl.blendFunc(raw.GL_SRC_ALPHA, raw.GL_ONE_MINUS_SRC_ALPHA);
      renderer.gl.depthMask(false);
      renderer.use_texture(this.texture, 0);
      renderer.gl.bindBuffer(raw.GL_ARRAY_BUFFER, this.webgl_buffer);
      renderer.gl.vertexAttribPointer(0, 4, raw.GL_FLOAT, false, 16, 0);
      renderer.gl.drawArrays(raw.GL_POINTS, 0, this.b_count/4);     

      renderer.gl.disable(raw.GL_BLEND);
      renderer.gl.depthMask(true);

    };

    proto.create_mesh = function (system) {
      return new raw.rendering.mesh({
        geometry: raw.geometry.create({
          vertex_size: 4,
          vertices: new Float32Array(0)
        }),
        material: this
      });


    };

    var ei = 0;
    proto.emit_particle = function (x, y, z, vx, vy, vz, life, life_decay) {
      ei = this.emit_i;
      this.process_data[ei++] = life;
      this.process_data[ei++] = life_decay;
      this.process_data[ei++] =x;
      this.process_data[ei++] =y;
      this.process_data[ei++] =z;
      this.process_data[ei++] = vx;
      this.process_data[ei++] = vy;
      this.process_data[ei++] = vz;
      this.emit_i = ei;
    }

    proto.alloc_process_buffer = function (size) {
      this.process_data = new Float32Array(size);
    };
    return function sub_system(def) {
      def = def || {};      
      _super.apply(this, [def]);
      this.shader = raw.webgl.shader.parse(glsl["default-system"]);
      this.b_count = 0;
      this.state = 1;
      this.emit_i = 0;
      this.texture = raw.webgl.texture.from_url("res/smoke-particle.png", true);
    }

  }, raw.shading.material);









  return particle_system;

}, raw.ecs.system));


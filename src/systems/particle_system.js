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
    return function (sys) {

      this._sub_systems.push(sys);   
      sys.compile_worker();
      sys.attach(this);
      return sys;
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

    }

  })();



  var emit;
  proto.step = (function () {
    var si = 0, sys = null,  i = 0;
    return function () {


      for (i = 0; i < this.emitters.length; i++) {
        emit = this.emitters.data[i];
        if (!emit.active) continue;
        if (emit.life > 0) {
          if (this.ecs.timer - emit.start_time > emit.life) {
            emit.active = false;
            this.emitters_slots.push(i);
            continue;
          }
        }


        if (emit.sys.state === 1) {
          if (this.ecs.timer - emit.last_emit_time > emit.rate) {
            emit.cb(emit);
            emit.e_count++;
            emit.last_emit_time = this.ecs.timer;

            emit.last_emit_time = this.ecs.timer - ((this.ecs.timer - emit.last_emit_time) % emit.rate);


          }
        }
      }

      this.worked_items = 0;

      for (si = 0; si < this._sub_systems.length; si++) {
        sys = this._sub_systems[si];
        if (sys.state === 1) {
          sys.step(this.ecs.timer);
          sys.process_data[sys.process_data.length - 1] = this.time_delta / (1 / 60);

          sys.process_data[sys.process_data.length - 2] = sys.emit_i;
          sys.worker.postMessage([sys.process_data.buffer], [sys.process_data.buffer]);
          sys.state = 2;
          sys.emit_i = 0;         
        }

        this.worked_items += (sys.b_count / 4);


      }
    }
  })();

 
  proto.spwan_emitter = function (sys_name, life, rate, cb, param1, param2, param3, param4) {
    return this._spwan_emitter(this.sub_systems[sys_name], life, rate, cb, param1, param2, param3, param4);
  };

  proto._spwan_emitter = function (sys, life, rate, cb, param1, param2, param3, param4) {

    if (this.emitters_slots.length > 0) {
      emit = this.emitters[this.emitters_slots.pop()];
    }
    else {
      emit = { active: false, params: [undefined, undefined, undefined, undefined] };
      this.emitters.push(emit);
    }

    emit.active = true;
    emit.sys = sys;
    emit.life = life;
    emit.start_time = this.ecs.timer;
    emit.cb = cb;
    emit.rate = rate;
    emit.e_count = 0;
    emit.last_emit_time = 0;
    emit.params[0] = param1;
    emit.params[1] = param2;
    emit.params[2] = param3;
    emit.params[3] = param4;
    return emit;

  }

  function particle_system(def, ecs) {
    _super.apply(this, [def, ecs]);
    this.sub_systems = {}; 
    this._sub_systems = [];
    this.emitters = new raw.array();
    this.emitters_slots = new raw.array();
  
    
  }

  particle_system.sub_system = raw.define(function (proto, _super) {

    proto.process = function (worker) {
      var i = 0, ii = 0, oi = 0, ei = 0, ecount = 0, time_delta = 0;
      worker.process = function (buffer) {

        process_data = new Float32Array(buffer);
        time_delta = process_data[process_data.length - 1];
        ecount = process_data[process_data.length - 2];
        time_delta = 2;
        oi = 0; i = 0;
        while (i < max_particles * PARTICLE_PACKET_SIZE) {
          if (particles[i] > 0) {
            particles[i] -= (particles[i + 1] * time_delta);
            particles[i] = Math.max(particles[i], 0);

            if (particles[i] > 0) {
              particles[i + 2] += particles[i + 5] * time_delta;
              particles[i + 3] += particles[i + 6] * time_delta;
              particles[i + 4] += particles[i + 7] * time_delta;
              output[oi++] = i;
            }

          }
          else if (ecount > 0) {
            ei = ecount - PARTICLE_PACKET_SIZE;
            ii = PARTICLE_PACKET_SIZE;
            while (ii > 0) {
              particles[i + (--ii)] = process_data[ei + ii];
            }
            ecount -= PARTICLE_PACKET_SIZE;
          }
          i += PARTICLE_PACKET_SIZE;
        }

        ei = 0;
        while (oi > 0) {
          i = output[--oi];
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

      if (!this.process_data) this.alloc_process_buffer();

      this.worker = new Worker(window.URL.createObjectURL(new Blob([
        'var p_count = 0,process_data = null, max_particles = 0, particles = null, output = null,params=' + JSON.stringify(this.params) +';(' + (function () {
          self.set_max_particles = function (num) {
            max_particles = num;
            particles = new Float32Array(num * params.PARTICLE_PACKET_SIZE);
            output = new Uint32Array(num);
          };

          self.onmessage = function (m) { this.process.apply(this, m.data); }

          self.set_max_particles(params.MAX_PARTICLES);

        }).toString() + ')(); self.main = ' + this.process.toString() + '; self.main(self); '])));

      this.worker.system = this;
      this.worker.onmessage = function (m) {
        this.system.apply_process_data(m.data[0]);
      };
    };

    proto.attach = function (system) {
      this.renderer = system.renderer;
      this.webgl_buffer = raw.webgl.buffers.get(this.renderer.gl);
      this.system = system;
      system.sub_systems_meshes.push(this.create_mesh());

    };

    var s = 0;
    proto.render_mesh = function (renderer, shader, mesh) {

      if (this.b_count < 4) return;
      renderer.gl.enable(raw.GL_BLEND);
      renderer.gl.blendFunc(raw.GL_SRC_ALPHA, raw.GL_ONE);
      renderer.gl.depthMask(false);
      renderer.use_texture(this.texture, 0);
      renderer.gl.bindBuffer(raw.GL_ARRAY_BUFFER, this.webgl_buffer);
      renderer.gl.vertexAttribPointer(0, 4, raw.GL_FLOAT, false, 16, 0);
                  

      renderer.gl.drawArrays(raw.GL_POINTS, 0, this.b_count / 4);

      renderer.gl.disable(raw.GL_BLEND);
      renderer.gl.depthMask(true);

    };

    proto.create_mesh = function (system) {
      return new raw.rendering.mesh({
        geometry: raw.geometry.create({
          vertex_size: 4,
          flags: raw.DISPLAY_ALWAYS,
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
      this.process_data[ei++] = x;
      this.process_data[ei++] = y;
      this.process_data[ei++] = z;
      this.process_data[ei++] = vx;
      this.process_data[ei++] = vy;
      this.process_data[ei++] = vz;
      this.emit_i = ei;
    }

    proto.alloc_process_buffer = function () {
      this.process_data = new Float32Array(this.params.MAX_PARTICLES * 4);
      this.emit_queue = new Uint32Array(this.params.EMIT_QUEUE_SIZE);
      this.emit_queue_buffer = new Float32Array(this.params.EMIT_QUEUE_SIZE * (this.params.PARTICLE_PACKET_SIZE + 1));
      ei = 0;
      while (ei < this.emit_queue.length) {
        this.emit_queue[ei] = (this.params.PARTICLE_PACKET_SIZE + 1) * (ei++);
      }
      this.emit_qi = ei-1;
    };

    proto.spwan_emitter = function (life, rate, cb, param1, param2, param3, param4) {
      this.system._spwan_emitter(this, life, rate, cb, param1, param2, param3, param4)
    }

    proto.step = function (timer) {

    }

    var shader = raw.webgl.shader.parse(glsl["base-system"]);
    return function sub_system(def) {
      def = def || {};      
      _super.apply(this, [def]);
      this.shader = shader
      this.name = 'sub_system';

      this.params = raw.merge_object({
        MAX_PARTICLES: 2000,
        EMIT_QUEUE_SIZE:300,
        PARTICLE_PACKET_SIZE: 8
      }, def.params || {}, true);

      this.b_count = 0;
      this.state = 1;
      this.emit_qi = 0;
      this.emit_i = 0;
    }

  }, raw.shading.material);



  particle_system.point_sprites = raw.define(function (proto, _super) {

    proto.process = function (worker) {
      var i = 0, ii = 0, oi = 0, ei = 0, ecount = 0, time_delta = 0,par_length=0;
      var uint32 = new Uint32Array(1), uint8 = new Uint8Array(4);

      worker.process = function (buffer) {

        process_data = new Float32Array(buffer);
        time_delta = process_data[process_data.length - 1];
        ecount = process_data[process_data.length - 2];
        time_delta = 2;
        oi = 0; i = 0;
        par_length = params.MAX_PARTICLES * params.PARTICLE_PACKET_SIZE;
        while (i < par_length) {
          if (particles[i] > 0) {
            if (particles[i + 1] < 0) {
              particles[i] += (particles[i + 1] * time_delta);
              particles[i] = (1 + particles[i]) % 1;
            }
            else {
              particles[i] -= (particles[i + 1] * time_delta);
              particles[i] = Math.max(particles[i], 0);
            }
            
            if (particles[i] > 0) {
              particles[i + 2] += particles[i + 5] * time_delta;
              particles[i + 3] += (particles[i + 6]) * time_delta;
              particles[i + 4] += particles[i + 7] * time_delta;

             // particles[i + 3] += params.GRAVITY * time_delta;

             // particles[i + 3] += params.GRAVITY;
              output[oi++] = i;
            }

          }
          else if (ecount > 0) {
            ei = ecount - params.PARTICLE_PACKET_SIZE;
            ii = params.PARTICLE_PACKET_SIZE;
            while (ii > 0) {
              particles[i + (--ii)] = process_data[ei + ii];
            }
            ecount -= params.PARTICLE_PACKET_SIZE;
          }
          i += params.PARTICLE_PACKET_SIZE;
        }

        ei = 0;
        while (oi > 0) {
          i = output[--oi];
          process_data[ei++] = particles[i + 2];
          process_data[ei++] = particles[i + 3];
          process_data[ei++] = particles[i + 4];
          uint8[0] = particles[i] * 255; // life
          uint8[1] = particles[i + 8]; //texture_set;
          uint8[2] = particles[i + 9]; //size;

          // pack life, texture set and size in one float                    
          uint32[0] = (uint8[0] << 16) | (uint8[1] << 8) | uint8[2];
          process_data[ei++] = uint32[0] / (1 << 24);

        }
        process_data[process_data.length - 1] = ei;
        this.postMessage([process_data.buffer], [process_data.buffer]);

      }


    };
        
    var s = 0;
    proto.render_mesh = function (renderer, shader, mesh) {

      if (this.b_count < 4) return;
      renderer.gl.enable(raw.GL_BLEND);
      renderer.gl.blendFunc(raw.GL_SRC_ALPHA, raw.GL_ONE_MINUS_SRC_ALPHA);
      renderer.gl.depthMask(false);
      renderer.use_texture(this.texture, 0);
      renderer.gl.bindBuffer(raw.GL_ARRAY_BUFFER, this.webgl_buffer);
      renderer.gl.vertexAttribPointer(0, 4, raw.GL_FLOAT, false, 16, 0);



      for (s = 0; s < this.texture_sets.length; s++) {
        shader.set_uniform('u_texture_sets_rw[' + s + ']', this.texture_sets[s]);
      }


      renderer.gl.drawArrays(raw.GL_POINTS, 0, this.b_count / 4);

      renderer.gl.disable(raw.GL_BLEND);
      renderer.gl.depthMask(true);

    };

    proto.create_mesh = function (system) {
      return new raw.rendering.mesh({
        geometry: raw.geometry.create({
          vertex_size: 4,
          flags: raw.DISPLAY_ALWAYS,
          vertices: new Float32Array(0)
        }),
        material: this
      });


    };

    var ei = 0;

    proto.queue_particle = function (time, x, y, z, vx, vy, vz, life, life_decay, texture_set, size) {
      ei = this.emit_queue[this.emit_qi--];
      this.emit_queue_buffer[ei++] = this.timer + time;
      this.emit_queue_buffer[ei++] = life;
      this.emit_queue_buffer[ei++] = life_decay;
      this.emit_queue_buffer[ei++] = x;
      this.emit_queue_buffer[ei++] = y;
      this.emit_queue_buffer[ei++] = z;
      this.emit_queue_buffer[ei++] = vx;
      this.emit_queue_buffer[ei++] = vy;
      this.emit_queue_buffer[ei++] = vz;
      this.emit_queue_buffer[ei++] = texture_set;
      this.emit_queue_buffer[ei++] = size;
    };
    proto.step = (function () {
      var i = 0;
      return function (timer) {
        i = 0;
        this.timer = timer;
        while (i < this.emit_queue_buffer.length) {
          if (this.emit_queue_buffer[i] > 0) {

            if (timer>=this.emit_queue_buffer[i] ) {
              ei = 0;
            //  console.log("i", i + "/" + this.emit_queue_buffer[i]);
              while (ei < this.params.PARTICLE_PACKET_SIZE) {
                this.process_data[this.emit_i++] = this.emit_queue_buffer[i + ei + 1];
                ei++;
              }
              this.emit_queue_buffer[i] = 0;
              this.emit_queue[++this.emit_qi] = i;
            }
           

          }

          i += (this.params.PARTICLE_PACKET_SIZE + 1);
        }
      }
    })();


    proto.emit_particle = function (x, y, z, vx, vy, vz, life, life_decay, texture_set, size) {
      ei = this.emit_i;
      this.process_data[ei++] = life;
      this.process_data[ei++] = life_decay;
      this.process_data[ei++] = x;
      this.process_data[ei++] = y;
      this.process_data[ei++] = z;
      this.process_data[ei++] = vx;
      this.process_data[ei++] = vy;
      this.process_data[ei++] = vz;
      this.process_data[ei++] = texture_set;
      this.process_data[ei++] = size;
      this.emit_i = ei;
    }   

    proto.spwan_emitter = function (life, rate, cb, param1, param2, param3, param4) {
      this.system._spwan_emitter(this, life, rate, cb, param1, param2, param3, param4)
    }
   

    var shader = raw.webgl.shader.parse(glsl["point-sprite-system"]);
    return function point_sprite_sub_system(def) {
      def = def || {};
      _super.apply(this, [def]);
      this.shader = shader

      this.texture_sets = [];
      this.params.PARTICLE_PACKET_SIZE = 10;

      this.params.GRAVITY = this.params.GRAVITY || (-0.0025);


      if (def.texture) {
        this.texture = def.texture;
        if (def.texture_sets) {

          var ww = def.texture.width;
          var hh = def.texture.height;

          var ratio = 1;
          if (ww > hh) {
            ratio = (ww / hh);
          }
          console.log(ratio);
          def.texture_sets.for_each(function (tx, i, self) {
            tx = new Float32Array(tx);
            tx[0] /= ww;
            tx[1] /= hh;
            tx[2] /= ww;
            tx[3] /= hh;
           
            self.texture_sets.push(tx);
          }, this);
        }


      }
      this.set_tansparency(0.99);


    }

  }, particle_system.sub_system);



  return particle_system;

}, raw.ecs.system));


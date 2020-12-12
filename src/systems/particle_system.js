/*
raw.ecs.register_system("particle_system", raw.define(function (proto, _super) {


  
  proto.validate = function (ecs) {
    this.priority = ecs.use_system('camera_system').priority + 50;

    ecs._systems.for_each(function (sys, i, self) {
      if (sys.is_renderer) {
        self.renderer = sys;
      }

    }, this);
    this.setup_rendering(ecs);

  };
  var emit_ins = null, emit = null;
  proto.setup_rendering = (function () {   

    var i = 0, k = "";
    proto.render_particles = function (renderer, shader, mesh) {

      this.worked_items = 0;
      for (k in this.emitters) {
        emit = this.emitters[k];
        shader = emit.shader;
        renderer.use_shader(shader);


        for (i = 0; i < emit.instances.length; i++) {
          emit_ins = this.all_instances[emit.instances[i]];


          if (emit_ins.p_count > 0) {
            shader.set_uniform("u_model_rw", emit_ins.mat);

            renderer.gl.bindBuffer(raw.GL_ARRAY_BUFFER, emit_ins.buffer);
            renderer.gl.vertexAttribPointer(0, 3, raw.GL_FLOAT, false, 12, 0);

            renderer.gl.drawArrays(raw.GL_POINTS, 0, emit_ins.p_count);
            this.worked_items++;
          }
          
        }


      }    



    };



  

    return function (ecs) {
      if (this.rendering_mesh) return;

      this.rendering_mesh = new raw.rendering.mesh({
        geometry: raw.geometry.create({ vertices: new Float32Array(0) }),
        material:new raw.shading.material({
          ambient: [0.5, 0.5, 0.5]
        })
      });

      this.rendering_mesh.material.shader = raw.webgl.shader.parse(glsl["default-emitter"]);
      this.rendering_mesh.material.system = this;
      this.rendering_mesh.material.render_mesh = function (renderer, shader, mesh) {
        this.system.render_particles(renderer, shader, mesh);
      };


      ecs.create_entity({
        components: {
          'transform': {},
          'render_item': {items: [ this.rendering_mesh ]}
        }
      });


      this.create_default_emitter();
    }

  })();

 
  proto.create_emitter = (function () {


    var def_matrix = raw.math.mat4();
    proto.spawn_emitter = function (name, model_matrix, life_time) {
      model_matrix = model_matrix || def_matrix;
      name = name || 'default';
    
      emit = this.emitters[name];
      emit_ins = this.emitters_instance_pool.get(this);
      emit_ins.mat = model_matrix;
      emit_ins.life = life_time || 1;
      emit_ins.state = 1;
      emit_ins.emit = emit;
      emit.instances[emit.instances.length] = emit_ins.id;
    };


    proto.create_default_emitter = function () {
      this.create_emitter('default', function (worker) {

        worker.buffer_size = 512;
        var i = 0;
       
        var DEGTORAD = 0.017453292519943295;
        var RADTODEG = 57.295779513082323;

        worker.process = function (time) {
          time = time * (360 * DEGTORAD);
          for (i = 0; i < 50; i++) {

            process_data[i * 3] = Math.sin(time+i) * 2;
            process_data[i * 3 + 1] = Math.cos(time) * Math.sin(time)+3;
            process_data[i * 3 + 2] = Math.cos(time+i) * 2;


            this.p_count++;
          }


        };




      });

    }
   

    return function (name, processor, shader) {
      emit = {
        shader: this.rendering_mesh.material.shader,
        instances: [],
        system: this
      };

      if (processor) {
        emit.processor = new Worker(window.URL.createObjectURL(new Blob([
          '(' + (function () {
            self.process_data = null;
            
            self.p_count = 0;            
            var max_particles = 0;
            self.set_max_particles = function (num) {
              max_particles = num;
              this.particles = new Float32Array(num * 7);
              this.free_particles = new Uint32Array(num);
              this.active_particles = new Uint32Array(num);
              this.free_particle_index = -1;
              this.active_particles_count =0;
            };
            self.free_particle = function (index) {
              this.free_particles[++this.free_particle_index] = index;
            };
            self.get_particle = function () {

            }

            var i = 0;
            self.process = function (ins_id, bindex, buffer) {

              while (i < max_particles) {



                i += 7;
              }




              if (buffer.byteLength < (this.buffer_size * 3) + 40) {
                process_data = new Float32Array(this.buffer_size + 10);
              }
              else {
                process_data = new Float32Array(buffer);
              }
              buffer = process_data.buffer;
              this.p_count = 0;
              this.process(process_data[process_data.length - 1]);
              this.postMessage([ins_id, this.p_count, bindex, buffer], [buffer]);

            }

            self.onmessage = function (m) { this._process.apply(this, m.data); }

           }).toString() + ')();self.main=' + processor.toString() +';self.main(self);'])));


        emit.processor.system = this;

        emit.processor.onmessage = function (m) {
          this.system.process_instance.apply(this.system, m.data);
        };
        


      }
      else {
        emit.processor = this.emitters['default'].processor;
      }

      this.emitters[name] = emit;



    }




  })();

  proto.step = (function () {
    var process_buffers = [
      new Float32Array(10),
      new Float32Array(10),

    ];
    console.log('process_buffers', process_buffers);

    function get_buffer_index() {
      i = 0;
      while (i < process_buffers.length) {
        if (process_buffers[i].buffer.byteLength > 0) return i;
        i++;
      }
      return -1;
    }

    var process_data;
    proto.process_instance = function (ins_id, p_count, bindex, buffer) {

      emit_ins = this.all_instances[ins_id];
      if (emit_ins) {
        emit_ins.p_count = p_count;
        process_data = new Float32Array(buffer);
        this.renderer.gl.bindBuffer(raw.GL_ARRAY_BUFFER, emit_ins.buffer);
        this.renderer.gl.bufferData(raw.GL_ARRAY_BUFFER, process_data, raw.GL_DYNAMIC_DRAW, 0, p_count);
        emit_ins.state = 3;
        process_buffers[bindex] = process_data;
      }



    }

    var bindex = 0,buffer=null, i = 0;

    



    return function () {

      for (i = 1; i < this.instances_count; i++) {
        emit_ins = this.all_instances[i];
        if (emit_ins.state === 1) {
          bindex = get_buffer_index();
          if (bindex > -1) {
            buffer = process_buffers[bindex];
            buffer[buffer.length - 1] = emit_ins.time;
            emit_ins.emit.processor.postMessage([emit_ins.id, bindex, buffer.buffer], [buffer.buffer]);
            emit_ins.state = 2;
          }

          emit_ins.time += 0.1;
          emit_ins.time = emit_ins.time % 1;
        }
        else if (emit_ins.state === 3) {
          emit_ins.state = 1;
        }
      }

    }
  })();

  function particle_system(def, ecs) {
    _super.apply(this, [def, ecs]);

    this.emitters = {};
    this.all_instances = {};
    this.instances_count = 1;

    this.emitters_instance_pool = new raw.object_pooler(function (system) {
      emit_ins = {
        mat: null, life: 0, id: system.instances_count,
        buffer: raw.webgl.buffers.get(system.renderer.gl),
        state: -1,time:0,
      };
      system.all_instances[emit_ins.id] = emit_ins;
      system.instances_count++;
      return emit_ins;

    });

   

   
  }

  









  

  return particle_system;

}, raw.ecs.system));
*/

raw.ecs.register_system("particle_system", raw.define(function (proto, _super) {



  proto.validate = function (ecs) {
    this.priority = ecs.use_system('camera_system').priority + 50;

    ecs._systems.for_each(function (sys, i, self) {
      if (sys.is_renderer) {
        self.renderer = sys;
      }

    }, this);
    this.setup_rendering(ecs);

  };
  var emit_ins = null, emit = null;
  proto.setup_rendering = (function () {

    var i = 0, k = "";
    proto.render_particles = function (renderer, shader, mesh) {

      renderer.gl.enable(raw.GL_BLEND);
      renderer.gl.blendFunc(raw.GL_SRC_ALPHA, raw.GL_ONE_MINUS_SRC_ALPHA);
      
     // renderer.gl.disable(raw.GL_DEPTH_TEST);
     // renderer.gl.depthFunc(raw.GL_GREATER);
      renderer.gl.depthMask(false);
      this.worked_items = 0;
      for (i = 0; i < this._emitters.length;i++) {
        emit = this._emitters[i];
        if (emit.p_count > 0) {
          renderer.use_texture(emit.texture,0);
          shader = emit.shader;
          renderer.use_shader(shader);
          renderer.gl.bindBuffer(raw.GL_ARRAY_BUFFER, emit.buffer);
          renderer.gl.vertexAttribPointer(0, 4, raw.GL_FLOAT, false, 16, 0);
          renderer.gl.drawArrays(raw.GL_POINTS, 0, emit.p_count);
          this.worked_items += emit.p_count;
        }        
      } 
      renderer.gl.disable(raw.GL_BLEND);
      renderer.gl.depthMask(true);
      //renderer.gl.depthFunc(raw.GL_LESS);
     // renderer.gl.enable(raw.GL_DEPTH_TEST);
    };



    var glsl = raw.webgl.shader.create_chunks_lib(import('systems/particle_system.glsl'));


    return function (ecs) {
      if (this.rendering_mesh) return;

      this.rendering_mesh = new raw.rendering.mesh({
        geometry: raw.geometry.create({
          vertex_size:4,
          vertices: new Float32Array(0)
        }),
        material: new raw.shading.material({
          ambient: [0.5, 0.5, 0.5],
          transparent:0.9,
        })
      });

      this.rendering_mesh.material.shader = raw.webgl.shader.parse(glsl["default-emitter"]);
      this.rendering_mesh.material.system = this;
      this.rendering_mesh.material.render_mesh = function (renderer, shader, mesh) {
        this.system.render_particles(renderer, shader, mesh);
      };


      ecs.create_entity({
        components: {
          'transform': {},
          'render_item': { items: [this.rendering_mesh] }
        }
      });

      this.create_default_emitter();
    }

  })();


  proto.create_emitter = (function () {
     


    proto.create_default_emitter = function () {
      this.create_emitter('default', function (worker) {
        var DEGTORAD = 0.017453292519943295;
        var RADTODEG = 57.295779513082323;
        worker.set_max_particles(5000);
      });
    }


    return function (name, processor, shader) {
      emit = {
        shader: this.rendering_mesh.material.shader,
        buffer: raw.webgl.buffers.get(this.renderer.gl),
        p_count: 0, state: 1, system: this,
        process_data: new Float32Array(10000),
        emit_requests: new Float32Array(1000),
        ei:0,
        emit: function (x, y, z, vx, vy, vz, l, d) {
          this.emit_requests[this.ei++] = l;
          this.emit_requests[this.ei++] = d;
          this.emit_requests[this.ei++] = x;
          this.emit_requests[this.ei++] = y;
          this.emit_requests[this.ei++] = z;
          this.emit_requests[this.ei++] = vx;
          this.emit_requests[this.ei++] = vy;
          this.emit_requests[this.ei++] = vz;

        },
        apply: function (buffer) {
          this.system.apply_buffer(this, buffer);
        },
        texture: raw.webgl.texture.from_url("res/smoke-particle.png", true)
      };

      if (processor) {
        emit.processor = new Worker(window.URL.createObjectURL(new Blob([
          '(' + (function () {
            self.process_data = null;

            self.p_count = 0;
            var max_particles = 0;
            var particles = null, output = null;
            self.set_max_particles = function (num) {
              max_particles = num;
              particles = new Float32Array(num * 8);
              output = new Uint32Array(num);
            };

            var i = 0, oi = 0, ei = 0, ecount = 0,sp=0.015;
            self.process = function (buffer) {

              process_data = new Float32Array(buffer);

              ecount = process_data[process_data.length - 1];

              process_data[0] = 2;
              process_data[1] = 0.025;
              process_data[5] = (Math.random() - 0.5) * sp;
              process_data[6] = (Math.random() - 0.5) * sp;
              process_data[7] = (Math.random() - 0.5) * sp;
              process_data[2] = 0;
              process_data[3] = 4;
              process_data[4] = 0;
              ecount = 8;


              oi = 0; i = 0;
              while (i < max_particles) {
                if (particles[i] > 0) {
                  particles[i] -= particles[i + 1];
                  particles[i + 2] += particles[i + 5];
                  particles[i + 3] += particles[i + 6];
                  particles[i + 4] += particles[i + 7];
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
              while (oi>-1) {
                i = output[oi--];
                process_data[ei++] = particles[i + 2];
                process_data[ei++] = particles[i + 3];
                process_data[ei++] = particles[i + 4];
                process_data[ei++] = particles[i];
              }

              process_data[process_data.length - 1] = ei;
              this.postMessage([process_data.buffer], [process_data.buffer]);

            }

            self.onmessage = function (m) { this.process.apply(this, m.data); }

          }).toString() + ')();self.main=' + processor.toString() + ';self.main(self);'])));

        emit.processor.emit = emit;
        emit.processor.onmessage = function (m) {
          this.emit.apply(m.data[0]);
        };
      }
      else {
        emit.processor = this.emitters['default'].processor;
      }

      this.emitters[name] = emit;
      this._emitters[this._emitters.length] = emit;


    }




  })();

  proto.step = (function () {
    proto.apply_buffer = function (emit, buffer) {
      emit.process_data = new Float32Array(buffer);
      emit.p_count = emit.process_data[emit.process_data.length - 1];
      this.renderer.gl.bindBuffer(raw.GL_ARRAY_BUFFER, emit.buffer);
      this.renderer.gl.bufferData(raw.GL_ARRAY_BUFFER, emit.process_data, raw.GL_DYNAMIC_DRAW, 0, emit.p_count); 
      emit.state = 1;
    };





    return function () {
      for (i = 0; i < this._emitters.length; i++) {
        emit = this._emitters[i];
        if (emit.state === 1) {
          emit.process_data[emit.process_data.length - 1] = emit.ei;
          while (emit.ei < 0) {
            emit.process_data[emit.ei] = emit.emit_requests[emit.ei--];            
          }
          emit.processor.postMessage([emit.process_data.buffer], [emit.process_data.buffer]);
          emit.state = 2;
        }
      }
    }
  })();

  function particle_system(def, ecs) {
    _super.apply(this, [def, ecs]);
    this.emitters = {}; 
    this._emitters = [];

  }













  return particle_system;

}, raw.ecs.system));


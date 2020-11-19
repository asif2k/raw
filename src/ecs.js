raw.ecs = raw.define(function (proto) {

  function ecs(def) {
    def = def || {};
    this.systems = {};
    this.components = {};
    this._systems = [];
    this.entities = {};
    this.globals = {};
    this.memory_blocks = {};
    this.def_components = def.components || [];
    this.def_components.for_each(function (name_id, i, ecs) {
     // ecs.use_component(name_id);
    },this);
  }

  proto.create_memory_block = function (name_id, initial_size) {
    if (!this.memory_blocks[name_id]) {
      this.memory_blocks[name_id] = new raw.memory_block(initial_size);
    }
    return this.memory_blocks[name_id];
  };

  var name_id, i = 0;
  proto.create_entity = function (def) {
    def = def || {};
    var entity = { uuid: def.uuid || raw.guidi() };
    this.entities[entity.uuid] = entity;
    if (def.components) {
      this.def_components.for_each(function (name_id, i, ecs) {
        if (def.components[name_id]) {
          
          ecs.attach_component(entity, name_id, def.components[name_id]);
        }
      },this);
    }
    return entity;
  };

  proto.map_component_entity = function (e, comp, ins) {
    comp.entities[comp.entities.length] = e.uuid;
    e[comp.name_id] = ins;
    if (comp.parent) this.map_component_entity(e, comp.parent, ins);
  };

  proto.attach_component = function (e, name_id, def) {
    comp = this.use_component(name_id);
    var ins = new comp.creator(comp);
    ins.create(def, e, this);
    if (this.components[name_id].set_instance !== null) {
      this.components[name_id].set_instance(ins, ecs);
    }
    this.map_component_entity(e, this.components[name_id], ins);
  };

  var comp, sys;
  proto.use_component = function (name_id) {
    if (!this.components[name_id]) {
      comp = ecs.components[name_id];
      this.components[name_id] = {
        name_id: name_id, set_instance: null,
        creator: comp, ecs: this, entities: [], ei: 0
      };
      if (comp.super_class.name_id !== undefined) {
        this.components[name_id].parent = this.use_component(comp.super_class.name_id)
      }
      if (comp.validate) comp.validate(this.components[name_id]);
      this.required_validation = true;
    }
    return this.components[name_id];
  };
  proto.sort_systems = function () {
    this._systems = raw.merge_sort(this._systems, this._systems.length, function (a, b) {
      return a.priority - b.priority;
    });
  }

  proto.use_system = function (name_id, def) {
    var sys = this.systems[name_id];
    if (!sys) {
      sys = new ecs.systems[name_id](def, this);
      sys.ecs = this;
      sys.name_id = name_id;
      this.systems[name_id] = sys;
      this._systems[this._systems.length] = sys;
      sys.validate(this);
      this.sort_systems();
      this.required_validation = true;
    }
    return sys;
  };

  proto.validate = function () {
    if (this.required_validation === true) {
      this.required_validation = false;     
      for (i = 0; i < this._systems.length; i++) {
        this._systems[i].validate(this);
      }
      this.sort_systems();
    }

  };


  proto.iterate_entities = (function () {
    var comp = null;
    return function (name_id) {
      comp = this.components[name_id];
      if (comp.ei === -1) comp.ei = 0;
      if (comp.ei < comp.entities.length) {
        return this.entities[comp.entities[comp.ei++]];
      }
      comp.ei = -1;
      return null;
    }
  })();

  proto.tick_debug = (function () {
    var time_start = 0;
    return function (time_delta) {
      this.timer = performance.now()*0.001;
      this.time_delta = time_delta;
      this.validate();

      for (i = 0; i < this._systems.length; i++) {
        sys = this._systems[i];
        if (sys.enabled === true) {
          sys.time_delta = this.timer - sys.last_step_time;
          if (sys.time_delta > sys.step_size) {
            sys.step_start();
          }
          
        }
      }

      for (i = 0; i < this._systems.length; i++) {
        sys = this._systems[i];
        if (sys.enabled === true) {
          if (sys.time_delta > sys.step_size) {
            time_start = Date.now();
            sys.step();
            sys.frame_time = (Date.now() - time_start);
            
          }
        
        }
      }

      for (i = 0; i < this._systems.length; i++) {
        sys = this._systems[i];
        if (sys.enabled === true) {          
          if (sys.time_delta > sys.step_size) {
            sys.step_end();
            sys.last_step_time = this.timer - (sys.time_delta % sys.step_size);
          }
        }
      }



    }
  })();



  proto.tick_debug = (function () {
    var time_start = 0;
    return function (time_delta) {
      this.timer = performance.now() * 0.001;
      this.time_delta = time_delta;
      this.validate();

      for (i = 0; i < this._systems.length; i++) {
        sys = this._systems[i];
        if (sys.enabled === true) {
          sys.time_delta = this.time_delta;
          sys.step_start();
        }
      }

      for (i = 0; i < this._systems.length; i++) {
        sys = this._systems[i];
        if (sys.enabled === true) {
          time_start = Date.now();
          sys.step();
          sys.frame_time = (Date.now() - time_start);

        }
      }

      for (i = 0; i < this._systems.length; i++) {
        sys = this._systems[i];
        if (sys.enabled === true) {
          sys.step_end();
        }
      }



    }
  })();






  ecs.components = {};
  ecs.systems = {};
  console.log('ecs.systems', ecs.systems);
  console.log('ecs.components', ecs.components);


  ecs.register_component = function (name_id, comp) {
    comp.name_id = name_id;
    this.components[comp.name_id] = comp;
  };

  ecs.register_system = function (name_id, sys) {
    sys.name_id = name_id;
    this.systems[sys.name_id] = sys;
  };


  ecs.component = raw.define(function (proto) {
    proto.create = function () { };
    function component() {}
    return component;
  });

  ecs.system = raw.define(function (proto) {
    proto.validate = function (ecs) { };
    proto.step_start = function () { };
    proto.step = function () { };
    proto.step_end = function () { };

    function system(def, ecs) {
      def = def || {};
      this.uuid = def.uuid || raw.guidi();
      this.state = 1;
      this.step_size = 1 / 60;
      this.last_step_time = 0;
      this.worked_items = 0;
      this.enabled = true;
      this.time_delta = 0;
    }
    return system;
  });
  return ecs;
});



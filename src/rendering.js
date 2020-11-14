raw.rendering.mesh = raw.define(function (proto, _super) {

  function mesh(def) {
    def = def || {};
    _super.apply(this, [def]);

    this.geometry = def.geometry || null;
    this.material = def.material || null;
    this.draw_offset = 0;
    if (this.geometry !== null) this.draw_count = this.geometry.num_items;
    this.item_type = raw.ITEM_TYPES.MESH;

  }
  proto.update_bounds = function (mat,trans) {
    raw.math.aabb.transform_mat4(this.bounds, this.geometry.aabb, mat);
    this.bounds_sphere = this.geometry.bounds_sphere * trans.scale_world[0];
  };

  return mesh;
}, raw.rendering.renderable);





raw.rendering.debug_points = raw.define(function (proto, _super) {
  var mat = new raw.shading.material();

  mat.shader = raw.webgl.shader.parse(`
<?=chunk('precision')?>
attribute vec3 a_point_position_rw;
attribute vec4 a_point_color_rw;

uniform mat4 u_view_projection_rw;
uniform mat4 u_model_rw;

varying vec3 point_color_v;

void vertex(){	    
    gl_Position = u_view_projection_rw*u_model_rw* vec4(a_point_position_rw,1.0);	
    point_color_v=a_point_color_rw.xyz;  
    gl_PointSize =a_point_color_rw.w;
}
<?=chunk('precision')?>

varying vec3 point_color_v;
void fragment(void) {	        
gl_FragColor.xyz=point_color_v;
gl_FragColor.w=1.0;
}


`);

  mat.render_mesh = function (renderer, shader, mesh) {
    if (mesh.points_count < 1) return;    
    
    renderer.gl.drawArrays(raw.GL_POINTS, 0, mesh.points_count);
  };


  proto.clear = function () {
    this.points_position.i = 0;
    this.points_count = 0;
  };


  proto.add = (function () {
    var i = 0, _r=1, _g=1, _b=1, _s=10;
    proto.add_vec3 = function (v, r, g, b, s) {
      _r = r; _g = g; _b = b; _s = s;
      this.add(v[0], v[1], v[2], _r, _g, _b, _s);
    };

    return function (x, y, z, r, g, b, s) {
      _r = r; _g = g; _b = b; _s = s;
      i = this.points_position.i;
      this.points_position.data[i] = x;
      this.points_position.data[i + 1] = y;
      this.points_position.data[i + 2] = z;

      this.points_position.data[i + 3] = r;
      this.points_position.data[i + 4] = g;
      this.points_position.data[i + 5] = b;
      this.points_position.data[i + 6] = s;

      this.points_position.i += 7;

      this.points_position.data_length = this.points_position.i;
      this.points_position.needs_update = true;

      this.points_count = (this.points_position.i / 7);
      this.draw_count = this.points_count;
    }
  })();


  proto.update_bounds = function (mat) { };

  function debug_points(def) {
    def = def || {};
    _super.apply(this,[def]);
    

    def.max_points = def.max_points || 1000;

    this.geometry = new raw.geometry();

    this.points_position = this.geometry.add_attribute("a_point_position_rw", {
      item_size: 3, data: new Float32Array(def.max_points * 3), stride: 7 * 4
    });
    this.points_color = this.geometry.add_attribute("a_point_color_rw", {
      item_size: 4, stride: 7 * 4, offset: 3 * 4,
    });
    this.points_position.i = 0;
    this.points_count = 0;
    this.material = mat;
    this.draw_offset = 0;
    this.draw_count = this.geometry.num_items;

    this.flags = raw.SHADING.NO_DEPTH_TEST + raw.DISPLAY_ALWAYS;

  }

  return debug_points;
}, raw.rendering.mesh);





raw.rendering.debug_lines = raw.define(function (proto, _super) {
  var mat = new raw.shading.material();

  mat.shader = raw.webgl.shader.parse(`
<?=chunk('precision')?>
attribute vec3 a_line_position_rw;
attribute vec3 a_line_color_rw;

uniform mat4 u_view_projection_rw;
uniform mat4 u_model_rw;

varying vec3 line_color_v;

void vertex(){	    
    gl_Position = u_view_projection_rw*u_model_rw* vec4(a_line_position_rw,1.0);	
    line_color_v=a_line_color_rw.xyz;  
}
<?=chunk('precision')?>

varying vec3 line_color_v;
void fragment(void) {	        
gl_FragColor.xyz=line_color_v;
gl_FragColor.w=1.0;
}


`);

  mat.render_mesh = function (renderer, shader, mesh) {
    if (mesh.line_count < 1) return;
    

    renderer.gl.drawArrays(raw.GL_LINES, 0, mesh.line_count);
  };


  proto.clear = function () {
    this.line_position.i = 0;
    this.line_count = 0;
  };


  proto._add = (function () {
    var i = 0;

    proto.set_color = function (r, g, b) {
      this.color[0] = r;
      this.color[1] = g;
      this.color[2] = b;
      return this;
    }

    proto.add_vec3 = function (v0, v1) {
      this._add(
        v0[0], v0[1], v0[2], this.color[0], this.color[1], this.color[2],
        v1[0], v1[1], v1[2], this.color[0], this.color[1], this.color[2]
      );
      return this;
    };

    proto.add2 = function (x0, y0, z0, x1, y1, z1) {
      this._add(
        x0, y0, z0, this.color[0], this.color[1], this.color[2],
        x1, y1, z1, this.color[0], this.color[1], this.color[2]
      )
    };

    return function (x0, y0, z0,r0,g0,b0, x1, y1, z1,r1,g1,b1) {
      i = this.line_position.i;
      this.line_position.data[i] = x0;
      this.line_position.data[i + 1] = y0;
      this.line_position.data[i + 2] = z0;

      this.line_position.data[i + 3] = r0;
      this.line_position.data[i + 4] = g0;
      this.line_position.data[i + 5] = b0;

      this.line_position.data[i + 6] = x1;
      this.line_position.data[i + 7] = y1;
      this.line_position.data[i + 8] = z1;

      this.line_position.data[i + 9] = r1;
      this.line_position.data[i + 10] = g1;
      this.line_position.data[i + 11] = b1;

      this.line_position.i += 12;

      this.line_position.data_length = this.line_position.i;
      this.line_position.needs_update = true;

      this.line_count = (this.line_position.i / 6);
      this.draw_count = this.line_count;
    }
  })();


  proto.update_bounds = function (mat) { };

  function debug_lines(def) {
    def = def || {};
    _super.apply(this, [def]);


    def.max_lines = def.max_lines || 1000;

    this.geometry = new raw.geometry();

    this.line_position = this.geometry.add_attribute("a_line_position_rw", {
      item_size: 3, data: new Float32Array(def.max_lines * 3*2), stride: 6 * 4
    });
    this.line_color = this.geometry.add_attribute("a_line_color_rw", {
      item_size: 3, stride: 6 * 4, offset: 3 * 4,
    });
    this.line_position.i = 0;
    this.line_count = 0;
    this.material = mat;
    this.draw_offset = 0;
    this.draw_count = this.geometry.num_items;
    this.color = [1, 1, 1];
    this.flags =  raw.DISPLAY_ALWAYS;

  }

  return debug_lines;
}, raw.rendering.mesh);


raw.rendering.debug_shapes = raw.define(function (proto, _super) {
  var mat = new raw.shading.material();

  mat.shader = raw.webgl.shader.parse(`
<?=chunk('precision')?>
attribute vec3 a_position_rw;
attribute vec3 a_shape_position_rw;
attribute vec3 a_shape_size_rw;
attribute vec4 a_shape_rotation_rw;
attribute vec3 a_shape_color_rw;

varying vec3 v_shape_color_rw;

uniform mat4 u_view_projection_rw;
uniform mat4 u_model_rw;
<?=chunk('quat-dquat')?>

void vertex(){	    
    vec4 v_position_rw=vec4(a_position_rw*a_shape_size_rw,1.0);   
    v_position_rw.xyz=quat_transform(a_shape_rotation_rw,v_position_rw.xyz);  
    v_position_rw.xyz+=a_shape_position_rw;
    gl_Position = u_view_projection_rw*u_model_rw* v_position_rw;	
  v_shape_color_rw=a_shape_color_rw;
}
<?=chunk('precision')?>

varying vec3 v_shape_color_rw;
void fragment(void) {	        
gl_FragColor=vec4(v_shape_color_rw,1.0);
}


`);

  var i = 0, shp = null;
  var u_rotation = raw.math.quat(), u_scale = raw.math.vec3(), u_position = raw.math.vec3(), u_color = raw.math.vec3();

  mat.render_mesh = function (renderer, shader, mesh) {
    if (mesh.shapes_count < 1) return;
    renderer.gl.disable(raw.GL_DEPTH_TEST);
    renderer.gl.ANGLE_instanced_arrays.drawArraysInstancedANGLE(raw.GL_LINES, 0,
      geo.num_items, mesh.shapes_count);


    return;
    for (i = 0; i < mesh.shapes.length; i++) {
      shp = mesh.shapes[i];

      u_position[0] = shp[0][0];
      u_position[1] = shp[0][1];
      u_position[2] = shp[0][2];

      u_rotation[0] = shp[1][0];
      u_rotation[1] = shp[1][1];
      u_rotation[2] = shp[1][2];
      u_rotation[3] = shp[1][3];

      u_color[0] = shp[2][0];
      u_color[1] = shp[2][1];
      u_color[2] = shp[2][2];

      shader.set_uniform("u_position", u_position);
      shader.set_uniform("u_rotation", u_rotation);
      shader.set_uniform("u_trans_size", u_color);

      renderer.gl.drawArrays(raw.GL_LINES, 0, geo.num_items);
    }

  
  };

  var b = raw.geometry.lines_builder;
  b.clear();
  
  for (var a = 0; a < 361; a += 12) {
    if (a === 0) {
      b.move_to(
        Math.sin(a * raw.math.DEGTORAD) * 0.5,
        Math.cos(a * raw.math.DEGTORAD) * 0.5,
        0
      );
    }
    else {
      b.add_to(
        Math.sin(a * raw.math.DEGTORAD) * 0.5,
        Math.cos(a * raw.math.DEGTORAD) * 0.5,
        0
      );

    }
  }

  var geo = b.build();

  console.log('geo', geo);

  proto.update_bounds = function (mat) { };


  proto.clear = function () {
    this.di = 0;
    this.shapes_count = 0;
    this.shapes_rotation.data_length = 0;
  };

  proto.add = (function () {
    var i = 0;

    var _color = [1, 1, 1], _size = [1, 1, 1], _rotation=[0,0,0,1];
    proto.add_shape = function (pos, size, rotation, color) {
      color = color || _color;
      size = size || _size;
      rotation = rotation || _rotation;
      this.add(pos[0], pos[1], pos[2],
        size[0], size[1], size[2],
        rotation[0], rotation[1], rotation[2], rotation[3],
        color[0], color[1], color[2]);
    }
    return function (x, y, z, sx, sy, sz, rx, ry, rz, rw, cx, cy, cz) {
      i = this.di;

      
      this.shapes_position.data[i] = x;
      this.shapes_position.data[i + 1] = y;
      this.shapes_position.data[i + 2] = z;

      this.shapes_size.data[i] = sx;
      this.shapes_size.data[i + 1] = sy;
      this.shapes_size.data[i + 2] = sz;

      this.shapes_color.data[i] = cx;
      this.shapes_color.data[i + 1] = cy;
      this.shapes_color.data[i + 2] = cz;

      this.di += 3;
      
      this.shapes_position.data_length = this.di;
      this.shapes_position.needs_update = true;


      this.shapes_size.data_length = this.di;
      this.shapes_size.needs_update = true;

      this.shapes_color.data_length = this.di;
      this.shapes_color.needs_update = true;
      this.shapes_count = this.di / 3;

      i = this.shapes_rotation.data_length;
      this.shapes_rotation.data[i] = rx;
      this.shapes_rotation.data[i + 1] = ry;
      this.shapes_rotation.data[i + 2] = rz;
      this.shapes_rotation.data[i + 3] = rw;
      this.shapes_rotation.data_length += 4;
      this.shapes_rotation.needs_update = true;


    }


  })();


  function debug_shapes(def) {
    def = def || {};
    _super.apply(this, [def]);


    def.max_shapes = def.max_shapes || 10000;

    this.shapes = [];
    this.geometry = new raw.geometry();
    this.geometry.attributes.a_position_rw = geo.attributes.a_position_rw;

    this.shapes_position = this.geometry.add_attribute("a_shape_position_rw", {
      item_size: 3, data: new Float32Array(def.max_shapes * 3), divisor: 1,
    });
    this.shapes_size = this.geometry.add_attribute("a_shape_size_rw", {
      item_size: 3, data: new Float32Array(def.max_shapes * 3), divisor: 1,
    });

    

    this.shapes_color = this.geometry.add_attribute("a_shape_color_rw", {
      item_size: 3, data: new Float32Array(def.max_shapes * 3), divisor: 1,
    });
    this.shapes_rotation = this.geometry.add_attribute("a_shape_rotation_rw", {
      item_size: 4, data: new Float32Array(def.max_shapes * 4), divisor: 1,
    });


    this.shapes_rotation.data_length = 0;
    this.di = 0;
    this.material = mat;
    this.flags = raw.DISPLAY_ALWAYS;

  }

  return debug_shapes;
}, raw.rendering.mesh);






raw.rendering.debug_aabbs = raw.define(function (proto, _super) {
  var mat = new raw.shading.material();

  mat.shader = raw.webgl.shader.parse(`
<?=chunk('precision')?>
attribute vec3 a_position_rw;
attribute vec3 a_box_position_rw;
attribute vec3 a_box_size_rw;
attribute vec3 a_box_color_rw;

uniform mat4 u_view_projection_rw;
uniform mat4 u_model_rw;
varying vec3 v_box_color_rw;
void vertex(){
    vec4 pos;
    pos.xyz=a_position_rw*a_box_size_rw;    
    pos.xyz+=a_box_position_rw;
    pos.w=1.0;    
    v_box_color_rw=a_box_color_rw;
    gl_Position = u_view_projection_rw*u_model_rw*pos;	
    gl_PointSize =5.0;

}
<?=chunk('precision')?>
varying vec3 v_box_color_rw;
void fragment(void) {	
gl_FragColor=vec4(v_box_color_rw,1.0);
}`);



  mat.render_mesh = function (renderer, shader, mesh) {
    if (mesh.boxes_count < 1) return;
    renderer.gl.disable(raw.GL_DEPTH_TEST);
    renderer.gl.ANGLE_instanced_arrays.drawArraysInstancedANGLE(raw.GL_LINES, 0, mesh.geometry.num_items, mesh.boxes_count);

  };


  proto.update_bounds = function (mat) { };

  proto.clear = function () {
    this.di = 0;
    this.boxes_count = 0;
  };


  proto.add_aabb = (function () {
    var x, y, z, sx, sy, sz
    return function (b) {
      sx = b[3] - b[0];
      sy = b[4] - b[1];
      sz = b[5] - b[2];
      x = b[0] + sx * 0.5;
      y = b[1] + sy * 0.5;
      z = b[2] + sz * 0.5;

      this.add(x, y, z, sx, sy, sz);
    }
  })();
  proto.add = (function () {
    var i = 0;
    return function (x, y, z, sx, sy, sz) {
      i = this.di;
      this.boxes_position.data[i] = x;
      this.boxes_position.data[i + 1] = y;
      this.boxes_position.data[i + 2] = z;

      this.boxes_size.data[i] = sx;
      this.boxes_size.data[i + 1] = sy;
      this.boxes_size.data[i + 2] = sz;

      this.boxes_color.data[i] = 1;
      this.boxes_color.data[i + 1] = 0;
      this.boxes_color.data[i + 2] = 0;

      this.di += 3;

      this.boxes_position.data_length = this.di;
      this.boxes_position.needs_update = true;

      this.boxes_size.data_length = this.di;
      this.boxes_size.needs_update = true;

      this.boxes_color.data_length = this.di;
      this.boxes_color.needs_update = true;
      this.boxes_count = this.di / 3;
    }
  })();

  function debug_aabbs(def) {
    def = def || {};
    _super.apply(this, [def]);
    def.max_boxes = def.max_boxes || 1000;
    var geo = raw.rendering.debug_aabbs.get_lines_geometry();

    this.boxes_position = geo.add_attribute("a_box_position_rw", {
      item_size: 3, data: new Float32Array(def.max_boxes * 3), divisor: 1,
    });
    this.boxes_size = geo.add_attribute("a_box_size_rw", {
      item_size: 3, data: new Float32Array(def.max_boxes * 3), divisor: 1,
    });

    this.boxes_color = geo.add_attribute("a_box_color_rw", {
      item_size: 3, data: new Float32Array(def.max_boxes * 3), divisor: 1,
    });

    this.geometry = geo;
    this.material = mat;

    this.max_boxes = 0;
    this.di = 0;
    this.box_color = [0.5, 0.5, 0.5];    

    this.flags = raw.SHADING.NO_DEPTH_TEST + raw.DISPLAY_ALWAYS;
    return (this);


  }
  debug_aabbs.get_lines_geometry = function () {
    var b = raw.geometry.lines_builder;
    b.clear();
    b.move_to(-0.5, -0.5, -0.5)
      .add_to(0.5, -0.5, -0.5)
      .add_to(0.5, 0.5, -0.5)
      .add_to(-0.5, 0.5, -0.5)
      .add_to(-0.5, -0.5, -0.5);

    b.move_to(-0.5, -0.5, -0.5).add_to(-0.5, -0.5, 0.5);
    b.move_to(0.5, -0.5, -0.5).add_to(0.5, -0.5, 0.5);

    b.move_to(-0.5, 0.5, -0.5).add_to(-0.5, 0.5, 0.5);
    b.move_to(0.5, 0.5, -0.5).add_to(0.5, 0.5, 0.5);

    b.move_to(-0.5, -0.5, 0.5)
      .add_to(0.5, -0.5, 0.5)
      .add_to(0.5, 0.5, 0.5)
      .add_to(-0.5, 0.5, 0.5)
      .add_to(-0.5, -0.5, 0.5);

    return b.build();
  }


  return debug_aabbs;
}, raw.rendering.mesh);





raw.rendering.transforms_manipulator = raw.define(function (proto, _super) {
  var mat = new raw.shading.material();

  mat.set_flag(raw.SHADING.PICKABLE + raw.SHADING.TRANSPARENT);
  // + raw.SHADING.TRANSPARENT
  
  mat.shader = raw.webgl.shader.parse(`
<?=chunk('precision')?>
attribute vec3 a_position_rw;
uniform mat4 u_view_projection_rw;
uniform vec3 u_trans_position;
uniform float u_trans_size;
void vertex(){	    
    gl_Position = u_view_projection_rw* 
vec4(u_trans_position+(a_position_rw*u_trans_size),1.0);	
}
<?=chunk('precision')?>
uniform vec4 u_marker_color;
void fragment(void) {	        
gl_FragColor=u_marker_color;
}
`);

 // mat.shader.pickable = mat.shader;

  var geo = raw.geometry.sphere({ rad: 1 });
  var i = 0, trans = null;
  var u_marker_color = raw.math.vec4(1, 0, 0, 0.45);
  mat.render_mesh = function (renderer, shader, mesh) {

    if (renderer.pickables_pass) {
     
    } 
    // renderer.gl.enable(raw.GL_CULL_FACE);
    renderer.gl.disable(raw.GL_DEPTH_TEST);
    renderer.activate_geometry_index_buffer(mesh.geometry, false);
    for (i = 0; i < mesh.transforms.length; i++) {
      trans = mesh.transforms[i];
      if (trans[2] === -1) {
        trans[2] = renderer.create_picking_color_id();
      }
      if (!renderer.pickables_pass && !trans[3]) {
        continue;
      } 


      renderer.set_picking_color_id(trans[2]);
      if (mesh.active_picking_color_id === trans[2]) {
        u_marker_color[1] = 0.5;
      }
      else {
        u_marker_color[1] = 0;
      }
      
      shader.set_uniform("u_marker_color", u_marker_color);
      
      shader.set_uniform("u_trans_position", trans[0].position_world);
      shader.set_uniform("u_trans_size", trans[1]);
      renderer.gl.drawElements(4, geo.num_items, raw.GL_UNSIGNED_INT, 0);
    }  

    renderer.gl.enable(raw.GL_DEPTH_TEST);
    //mesh.active_picking_color_id = 0;
   
  };

  proto.update_bounds = function (mat) { };
  proto.add = function (trans, size, show_tracker) {
    show_tracker = show_tracker || false
    if (trans.position_world) {
      this.transforms.push([trans, size, -1, show_tracker]);
    }
    else {
      this.transforms.push([{ position_world: trans }, size, -1, show_tracker]);
    }

  }


  var pos = [0, 0, 0],inv_rot=[0,0,0,0];
  proto.drag_item = function (picking_color_id, drag_dir, drag_mag) {    
    this.active_picking_color_id = 0;
    this.active_item = null;
    for (i = 0; i < this.transforms.length; i++) {
      trans = this.transforms[i];
      if (trans[2] === picking_color_id) {
        this.active_picking_color_id = picking_color_id;
        raw.math.vec3.scale(pos, drag_dir, drag_mag);
        if (trans[0].rotation_world) {
          raw.math.quat.invert(inv_rot, trans[0].rotation_world);
          raw.math.vec3.transform_quat(pos, pos, inv_rot);
          raw.math.vec3.add(trans[0].position, trans[0].position, pos);
          trans[0].require_update = 1;
        }
        else {
          raw.math.vec3.add(trans[0].position_world, trans[0].position_world, pos);
        }
        
        this.active_item = trans[0];
        return true;
      }
    }
    return false;
  }

  function transforms_manipulator(def) {
    def = def || {};
    _super.apply(this, [def]);
    this.flags = raw.DISPLAY_ALWAYS;
    this.geometry = geo;
    this.material = mat;
    this.transforms = [];
    this.active_item = null;
  }

  return transforms_manipulator;
}, raw.rendering.mesh);





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

  proto.update_bounds = function (mat) {}
  function render_item(def) {
    _super.apply(this);
  }

  render_item.validate = function (component) {
    component.ecs.use_system('render_item_system');
  };

  return render_item;

}, raw.ecs.component));









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


  var list = null, camera = null, i = 0,render_item=null, item = null, ti = 0; items = null;
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
                  list.lights.push(item);
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
    this.step_size *=4;
  }

}, raw.ecs.system));



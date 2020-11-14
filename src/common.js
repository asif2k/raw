
raw.shading = {};
raw.rendering = {};


raw.rendering.renderable = raw.define(function (proto, _super) {

  proto.expand_bounds = function (x, y, z) {
    this.bounds[0] = Math.min(this.bounds[0], x);
    this.bounds[1] = Math.min(this.bounds[1], y);
    this.bounds[2] = Math.min(this.bounds[2], z);

    this.bounds[3] = Math.max(this.bounds[3], x);
    this.bounds[4] = Math.max(this.bounds[4], y);
    this.bounds[5] = Math.max(this.bounds[5], z);
  };
  proto.initialize_item = function () {

  };
  proto.update_bounds = function (mat) { };
  function renderable(def) {
    this.matrix_world = raw.math.mat4();
    this.world_position = new Float32Array(this.matrix_world.buffer, (12 * 4), 3);
    this.view_position = raw.math.vec3();
    this.bounds = raw.math.aabb();
    this.item_type = raw.ITEM_TYPES.OTHER;
    this.flags = 0;
    
  }

  return renderable;
});
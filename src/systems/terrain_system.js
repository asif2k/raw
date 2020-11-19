
(function () {
  var glsl = raw.webgl.shader.create_chunks_lib(import('systems/terrain_system.glsl'));


  var terrain_material = raw.define(function (proto, _super) {

    proto.render_mesh = function (renderer, shader, mesh) {

      this.depth_and_cull(renderer);

      shader.set_uniform("u_object_material_rw", this.object_material);

      shader.set_uniform("u_tile_size_rw", this.tile_size);
      shader.set_uniform("u_texture_repeat_rw", this.texture_repeat);
      shader.set_uniform("u_normalmap_repeat_rw", this.normalmap_repeat);

      renderer.use_texture(this.texture_tiles, 0);
      renderer.use_texture(this.normalmap_tiles, 1);


      shader.set_uniform("u_normalmap_tiles_rw", 1);
      
     


      this.terrain.render_terrain(renderer, shader);
    };

    function terrain_material(def) {
      def = def || {};
      _super.apply(this, [def]);
      this.terrain = def.terrain;
      raw.math.vec3.set(this.ambient, 0.5, 0.5, 0.5);
      raw.math.vec3.set(this.specular, 0, 0, 0);

      this.texture_tiles = null;
      this.normalmap_tiles = null;

      this.tile_size = raw.math.vec2(512, 0);
      this.texture_repeat = raw.math.vec4(4, 4,4, 4);
      this.normalmap_repeat = raw.math.vec4(8, 8, 8,8);



      this.shader = terrain_material.shader;
      if (def.material) {

        if (def.material.normalmap_tiles) {
          this.normalmap_tiles = raw.webgl.texture.create_tiled_texture(def.material.normalmap_tiles,
            def.material.tile_size || 512,
            def.material.texture_size || 1024,
            def.material.texture_size || 1024
          );

          this.tile_size[0] = this.normalmap_tiles.tile_sizef;
          this.tile_size[1] = this.normalmap_tiles.tile_offsetf;

        }

        if (def.material.texture_tiles) {
          this.texture_tiles = raw.webgl.texture.create_tiled_texture(def.material.texture_tiles,
            def.material.tile_size || 512,
            def.material.texture_size || 1024,
            def.material.texture_size || 1024
          );

          this.tile_size[0] = this.texture_tiles.tile_sizef;
          this.tile_size[1] = this.texture_tiles.tile_offsetf;

        }

       

        if (def.material.shader) {
          this.shader = this.shader.extend(def.material.shader);
        }
      }


      
    }
    terrain_material.shader = raw.webgl.shader.parse(glsl["flat-material"]);


    return terrain_material;


  }, raw.shading.shaded_material);


  var create_skybox = (function () {
    var skybox_material = raw.define(function (proto, _super) {

      var view_direction_projection_matrix =raw.math.mat4();
      var view_direction_projection_inverse_matrix = raw.math.mat4();

      var sun_params = raw.math.vec4();
      var tmat = raw.math.mat4();
      proto.render_mesh = function (renderer, shader, mesh) {

        this.depth_and_cull(renderer);

        raw.math.mat4.copy(tmat, renderer.active_camera.view_inverse);
        if (mesh.skybox_camera_version !== renderer.active_camera.version) {
          tmat[12] = 0; tmat[13] = 0; tmat[14] = 0;

          raw.math.mat4.multiply(view_direction_projection_matrix,
            renderer.active_camera.projection,
            tmat
          );

          raw.math.mat4.inverse(view_direction_projection_inverse_matrix, view_direction_projection_matrix);

         
          mesh.skybox_camera_version = renderer.active_camera.version;
        }


        


        sun_params[0] = this.sun_direction[0];
        sun_params[1] = this.sun_direction[1];
        sun_params[2] = this.sun_direction[2];
        sun_params[3] = this.sun_angular_diameter_cos;

        shader.set_uniform("u_view_projection_matrix_rw", view_direction_projection_inverse_matrix);
        shader.set_uniform("u_sun_params_rw", sun_params);
        renderer.gl.depthFunc(raw.GL_LEQUAL);        
        renderer.gl.drawArrays(4, 0, mesh.geometry.num_items);
        renderer.gl.depthFunc(raw.GL_LESS);



      };

      function skybox_material(def) {
        def = def || {};
        _super.apply(this, [def]);   
        this.shader = skybox_material.shader;

        this.sun_direction = def.sun_direction || [0.0, 1.0, 0.0];
        this.sun_angular_diameter_cos = 0.99991;

      }
      skybox_material.shader = raw.webgl.shader.parse(glsl["skybox"]);


      return skybox_material;


    }, raw.shading.material);


    return function (def) {
      return new raw.rendering.mesh({
        flags: raw.DISPLAY_ALWAYS,
        geometry: raw.geometry.create({
          vertices: new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            -1, 1,
            1, -1,
            1, 1,
          ]), vertex_size: 2
        }),
        material: new skybox_material(def)
      })

    }

  })();

  raw.ecs.register_component("terrain", raw.define(function (proto, _super) {

    var time_start = 0, reg, reg_x, reg_z, reg_key, i = 0;
    proto.create = (function (_super_call) {
      return function (def, entity) {        
        _super_call.apply(this, [def, entity]);
        this.camera_version =986732;
        this.region_size = def.region_size || 512;
        this.world_size = def.world_size || (4096 * 2);
        this.region_size_width = this.region_size + 1;
        this.region_size_half = this.region_size * 0.5;


        
        
        this.items.push(new raw.rendering.mesh({
          flags: raw.DISPLAY_ALWAYS,
          geometry: raw.geometry.create({vertices: new Float32Array(0) }),
          material: new terrain_material({
            terrain: this,
            material: def.material
          })
        }));
        

        if (def.skybox) {
          this.items.push(create_skybox(def.skybox));
        }


        this.regions = {};
        this.objects = {};
        this.regions_to_render = [];

        this.world_size_half = this.world_size * 0.5;


        this.timer = 0;

        this.last_validate_time = 0;
        this.last_updated_time = 0;
        this.terrain_quality = def.terrain_quality || 4;
        this.fixed_detail = def.fixed_detail || - 1;

        this.wireframe = def.wireframe || false;
        this.shaded = true;
        if (def.shaded !== undefined) this.shaded = def.shaded;
        this.region_distance = def.region_distance || 4;
        this.draw_distance = def.draw_distance || 2000;
        this.quality_distance = def.quality_distance || 1500;
        this.max_scale = 0;
        this.detail_levels = def.detail_levels || [1, 2, 6, 12, 20];
        this.parking_length = 0;
        this.height_on_camera = 0;
        this.camera_collision = def.camera_collision || false;
        this.setup_mesh_processor();

        this.sun_direction = def.sun_direction || [0.5, 0.5, 0.3];
        
        this.empty_regions = [];
        this.er = 0;


        this.last_cam_reg_key = -1.1;

        this.tri_count = 0;

        this.def_regions_from_image_url = def.regions_from_image_url;
        

        this.initialized = false;
      }
    })(proto.create);

    proto.setup_mesh_processor = (function () {

      proto.regions_from_image_url = (function () {
        var data = [], i = 0, minh, maxh, ht, size;
        return function (url, xs, zs, divisor, ww, hh, scale) {
          self = this;
          divisor = divisor || 1;
          raw.load_working_image_data(url, function (image_data, width, height) {
            minh = 999999;
            maxh = -999999;
            for (i = 0; i < image_data.length / 4; i++) {
              ht = image_data[i * 4] / divisor;
              if (ht < minh) minh = ht;
              if (ht > maxh) maxh = ht;

              data[i] = ht;
            }
            size = maxh - minh;


            self.worker.postMessage([200, xs, zs, width, data, scale || 1]);
          }, ww, hh);
        }
      })();

      proto.regions_from_data = (function () {
        var i = 0;
        return function (data, xs, zs, width, scale, divisor) {
          if (divisor) {
            for (i = 0; i < data.length; i++) {
              data[i] *= divisor;
            }
          }
          this.worker.postMessage([200, xs, zs, width, data, scale]);
        }
      })();
      proto.update_terrain_parameters = function () {
        this.worker.postMessage([100, this.world_size, this.region_size, this.terrain_quality]);
        this.worker.postMessage([400,
          this.sun_direction[0] * this.world_size * this.region_size,
          this.sun_direction[1] * this.world_size * this.region_size,
          this.sun_direction[2] * this.world_size * this.region_size
        ]);
      };

      proto.generate_regions = function (xs, zs, size, scale) {
        this.worker.postMessage([3000, xs, zs, size, scale]);
      };

      var worker;
      return function () {
        worker =raw.worker(function (thread) {
          var noise = (function () {
            var noise = {};
            function Grad(x, y, z) { this.x = x; this.y = y; this.z = z; }
            Grad.prototype.dot2 = function (x, y) { return this.x * x + this.y * y; };
            Grad.prototype.dot3 = function (x, y, z) { return this.x * x + this.y * y + this.z * z; };

            var grad3 = [new Grad(1, 1, 0), new Grad(-1, 1, 0), new Grad(1, -1, 0), new Grad(-1, -1, 0), new Grad(1, 0, 1), new Grad(-1, 0, 1), new Grad(1, 0, -1), new Grad(-1, 0, -1), new Grad(0, 1, 1), new Grad(0, -1, 1), new Grad(0, 1, -1), new Grad(0, -1, -1)];

            var p = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103,
              30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94,
              252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171,
              168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
              60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161,
              1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159,
              86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147,
              118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183,
              170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129,
              22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
              251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239,
              107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4,
              150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215,
              61, 156, 180];

            var perm = new Array(512), gradP = new Array(512);

            var i, v;
            noise.seed = function (seed) {
              if (seed > 0 && seed < 1) {
                seed *= 65536;
              }

              seed = Math.floor(seed);
              if (seed < 256) {
                seed |= seed << 8;
              }

              for (i = 0; i < 256; i++) {
                if (i & 1) {
                  v = p[i] ^ (seed & 255);
                }
                else {
                  v = p[i] ^ ((seed >> 8) & 255);
                }

                perm[i] = perm[i + 256] = v;
                gradP[i] = gradP[i + 256] = grad3[v % 12];
              }
            };
            function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
            function lerp(a, b, t) { return (1 - t) * a + t * b; }
            // 2D Perlin Noise
            var X, Y, n00, n01, n10, n11, u;
            noise.perlin = function (x, y) {
              // Find unit grid cell containing point
              X = Math.floor(x);
              Y = Math.floor(y);
              // Get relative xy coordinates of point within that cell
              x = x - X;
              y = y - Y;
              // Wrap the integer cells at 255 (smaller integer period can be introduced here)
              X = X & 255;
              Y = Y & 255;

              // Calculate noise contributions from each of the four corners
              n00 = gradP[X + perm[Y]].dot2(x, y);
              n01 = gradP[X + perm[Y + 1]].dot2(x, y - 1);
              n10 = gradP[X + 1 + perm[Y]].dot2(x - 1, y);
              n11 = gradP[X + 1 + perm[Y + 1]].dot2(x - 1, y - 1);

              // Compute the fade curve value for x
              u = fade(x);

              // Interpolate the four results
              return lerp(
                lerp(n00, n10, u),
                lerp(n01, n11, u),
                fade(y)
              );
            };


            return noise;
          })();



          var regions = {}, world_size, region_size, region_size1;
          var region_size2, terrain_quality = 1, region_size_scale, region_size_scale1;
          var reg_x, reg_z, reg, reg_key;

          console.log("regions", regions);

          regions.pool = [];
          regions.pool.free = function (reg) { this.push(reg); }
          regions.pool.get = function () { return this.length > 0 ? this.pop() : {}; }



          var PATCH_SIZE = 16, MIN_PATCH_SIZE = 2, CQT_DETAIL = 16, MIN_FAN_DETAIL = 2;

          var WORKING_PATCH_SIZE = PATCH_SIZE, WORKING_MIN_PATCH_SIZE = MIN_PATCH_SIZE;

          var vkey, vindex_width = 1200;

          var vmap = new Uint8Array(0),
            vdata = new Float32Array(0);

          var vindex_width2 = vindex_width / 2;
          var check_vlevel_value = 0;
          function check_vlevel(x, z) {
            vkey = (z + vindex_width2) * vindex_width + (x + vindex_width2);
            check_vlevel_value = vmap[vkey];
            return check_vlevel_value;
          };
          function set_vlevel(x, z, l) {
            vkey = (z + vindex_width2) * vindex_width + (x + vindex_width2);
            if (l < vmap[vkey]) vmap[vkey] = l;
          }
          var time_start, rast_time;

          var output = new Float32Array(200000 * 6), oi = 0;

          var render_strips = (function () {
            var st = 0;
            return function (size) {
              for (st = 0; st < region_size; st += size * 2) {
                set_vlevel(st, 0, size);
                set_vlevel(st, region_size, size);
                set_vlevel(0, st, size);
                set_vlevel(region_size, st, size);
              }
            }
          })();

          var patches = {};

          var sun_x = 15000, sun_y = 5500, sun_z = 15000;
          thread[400] = function (op, _sun_x, _sun_y, _sun_z) {
            sun_x = _sun_x;
            sun_y = _sun_y;
            sun_z = _sun_z;
          };
          thread[100] = function (op, _world_size, _region_size, _terrain_quality) {
            world_size = _world_size;
            region_size = _region_size;
            region_size1 = region_size + 1;
            region_size2 = region_size * 0.5;
            terrain_quality = _terrain_quality;
            if (terrain_quality === 0) {
              PATCH_SIZE = 4;
              MIN_PATCH_SIZE = 1;
              MIN_DETAIL = 1;
              CQT_DETAIL = 4;
              MIN_FAN_DETAIL = 2;
            }
            else if (terrain_quality === 1) {
              PATCH_SIZE = 8;
              MIN_PATCH_SIZE = 2;
              CQT_DETAIL = 8;
              MIN_FAN_DETAIL = 2;
            }
            if (terrain_quality === 2) {
              PATCH_SIZE = 16;
              MIN_PATCH_SIZE = 4;
              CQT_DETAIL = 12;
              MIN_FAN_DETAIL = 2;
            }
            else if (terrain_quality === 3) {
              PATCH_SIZE = 32;
              MIN_PATCH_SIZE = 4;
              CQT_DETAIL = 9;
              MIN_FAN_DETAIL = 2;
            }
            else if (terrain_quality === 4) {
              PATCH_SIZE = 32;
              MIN_PATCH_SIZE = 8;
              CQT_DETAIL = 24;
              MIN_FAN_DETAIL = 4;
            }
            else if (terrain_quality === 5) {
              PATCH_SIZE = 32;
              MIN_PATCH_SIZE = 16;
              CQT_DETAIL = 32;
              MIN_FAN_DETAIL = 4;
            }

            var s = 1;
            while (s <= region_size) {
              patches[s] = { i: 0, list: [] };
              s = s * 2;
            }

            vindex_width = (region_size * 2) + 8;
            vindex_width2 = vindex_width / 2;

            vkey = vindex_width * vindex_width;
            if (vmap.length < vkey) {
              vmap = new Uint8Array(vkey)
              vdata = new Float32Array(vkey * 4);
              this.prepare_empty_region();
            }



          };



          thread[200] = (function () {
            var tx, tz, i0, i1, i3, size;
            function adjust_data(data, data_size) {
              var new_data = new Float32Array((data_size + 1) * (data_size + 1));
              for (reg_z = 0; reg_z < data_size; reg_z++) {
                for (reg_x = 0; reg_x < data_size; reg_x++) {
                  new_data[reg_z * (data_size + 1) + reg_x] = data[reg_z * data_size + reg_x];
                }
              }
              for (reg_z = 0; reg_z < data_size; reg_z++) {
                new_data[reg_z * (data_size + 1) + data_size] = data[reg_z * data_size + (data_size - 1)];
              }
              for (reg_x = 0; reg_x < data_size; reg_x++) {
                new_data[data_size * (data_size + 1) + reg_x] = data[(data_size - 1) * data_size + reg_x];
              }

              new_data[data_size * (data_size + 1) + data_size] =
                (data[(data_size - 1) * data_size + (data_size - 1)] +
                  data[(data_size - 1) * data_size + (data_size - 1)]) / 2;

              return new_data;
            }


            var build_region = (function () {
              return function (op, xs, zs, data_size, data, scale) {
                data = adjust_data(data, data_size);
                region_size_scale = region_size / scale;
                region_size_scale1 = region_size_scale + 1;
                size = Math.floor(data_size / region_size_scale);
                data_size += 1;

                for (reg_z = 0; reg_z < size; reg_z++) {
                  for (reg_x = 0; reg_x < size; reg_x++) {

                    reg_key = (reg_z + zs) * world_size + (reg_x + xs);
                    reg = regions[reg_key] || regions.pool.get();
                    reg.data = reg.data || new Float32Array(region_size_scale1 * region_size_scale1);
                    if (reg.size !== undefined) {
                      if (reg.size !== region_size_scale1) {
                        reg.data = new Float32Array(region_size_scale1 * region_size_scale1);
                      }

                    }


                    reg.minh = 999999;
                    reg.maxh = -999999;
                    reg.rx = (reg_x + xs);
                    reg.rz = (reg_z + zs);

                    reg.x = reg.rx * region_size;
                    reg.z = reg.rz * region_size;
                    reg.scale = scale;
                    reg.size = region_size_scale1;

                    i0 = (reg_x * region_size_scale);
                    for (tz = 0; tz < region_size_scale1; tz++) {
                      i1 = (((reg_z * region_size_scale) + tz) * (data_size)) + i0;
                      i3 = (tz * region_size_scale1);
                      for (tx = 0; tx < region_size_scale1; tx++) {
                        ht = data[i1 + tx] || 0;

                        if (ht < reg.minh) reg.minh = ht;
                        if (ht > reg.maxh) reg.maxh = ht;

                        reg.data[(i3 + tx)] = ht;
                      }
                    }
                    regions[reg_key] = reg;
                    reg.key = reg_key;
                    thread.postMessage([op, reg_key, reg.rx, reg.rz, reg.minh, reg.maxh]);



                  }
                }
                console.log((size * size) + ' regions loaded');
              }
            })();
            return build_region;
          })();



          thread[2000] = (function () {


            var H = (function () {
              var z, x, ix1, iz1, ix2, iz2;
              var c1, c2, size, h1, h2, h3, h4, hs;
              return function (xp, zp) {
                if (reg.scale === 1) {
                  return reg.data[zp * region_size1 + xp];
                }

                size = reg.size;
                x = xp / reg.scale;
                z = zp / reg.scale;


                ix1 = (x < 0 ? 0 : x >= size ? size - 1 : x) | 0;
                iz1 = (z < 0 ? 0 : z >= size ? size - 1 : z) | 0;

                ix2 = ix1 === size - 1 ? ix1 : ix1 + 1;
                iz2 = iz1 === size - 1 ? iz1 : iz1 + 1;

                xp = x % 1;
                zp = z % 1;


                h1 = reg.data[(ix1 + iz1 * size)];
                h2 = reg.data[(ix2 + iz1 * size)];
                h3 = reg.data[(ix1 + iz2 * size)];
                h4 = reg.data[(ix2 + iz2 * size)];

                h1 = h1 * h1;
                h2 = h2 * h2;
                c1 = (h2 - h1) * xp + h1;
                c2 = (h4 * h4 - h4 * h3) * xp + h3 * h3;

                return (Math.sqrt((c2 - c1) * zp + c1));
              }
            })();
            var HH = (function () {
              var _rx, _rz, v, temp_reg;



              return function (x, z) {
                if (x > -1 && x < region_size1) {
                  if (z > -1 && z < region_size1) {
                    return H(x, z);
                  }
                }
                _rx = 0; _rz = 0;
                if (x < 0) {
                  _rx = -1;
                  x = region_size + x;
                }
                else if (x > region_size) {
                  _rx = 1;
                  x = x % region_size;
                }

                if (z < 0) {
                  _rz = -1;
                  z = region_size + z;
                }
                else if (z > region_size) {
                  _rz = 1;
                  z = z % region_size;
                }

                reg_key = (reg.rz + _rz) * world_size + (reg.rx + _rx);
                temp_reg = reg;
                reg = regions[reg_key];
                if (reg) {
                  v = H(x, z);
                  reg = temp_reg;
                  return v;

                }
                reg = temp_reg;
                return 0;


              }
            })();

            thread[1500] = (function () {
              var h0, h1, h2, h3, x, z;
              return function (op, reg_key, px, pz) {
                reg = regions[reg_key];
                if (reg) {
                  px -= reg.x;
                  pz -= reg.z;
                  px += region_size2;
                  pz += region_size2;

                  x = Math.floor(px);
                  z = Math.floor(pz);

                  h0 = H(x, z);
                  thread.postMessage([op, reg_key, h0]);

                }
              }
            })();

            thread[1550] = (function () {
              var h0, h1, h2, h3, x, z;
              return function (op, reg_key, id, px, pz) {
                reg = regions[reg_key];
                if (reg) {
                  px -= reg.x;
                  pz -= reg.z;
                  px += region_size2;
                  pz += region_size2;

                  x = Math.floor(px);
                  z = Math.floor(pz);

                  h0 = H(x, z);
                  thread.postMessage([op, id, h0]);

                }
              }
            })();





            var reg_data;
            var _fp, nx, ny, nz;


            var p, i = 0, x, z, j = 0, s = 1;

            function draw_triangle(x0, z0, x1, z1, x2, z2, s) {
              set_vlevel(x0, z0, s);
              output[oi] = x0;
              output[oi + 2] = z0;
              oi += 6;

              set_vlevel(x1, z1, s);
              output[oi] = x1;
              output[oi + 2] = z1;
              oi += 6;

              set_vlevel(x2, z2, s);
              output[oi] = x2;
              output[oi + 2] = z2;
              oi += 6;
            }




            var draw_fan = (function () {

              var fi = 0, lfx, lfz, fx, fz;

              var fan = [
                -1, 1, -0.75, 1, -0.5, 1, -0.25, 1, 0, 1, 0.25, 1, 0.5, 1, 0.75, 1, 1, 1,
                1, 0.75, 1, 0.5, 1, 0.25, 1, 0, 1, -0.25, 1, -0.5, 1, -0.75, 1, -1,
                0.75, -1, 0.5, -1, 0.25, -1, 0, -1, -0.25, -1, -0.5, -1, -0.75, -1, -1, -1,
                -1, -0.75, -1, -0.5, -1, -0.25, -1, 0, -1, 0.25, -1, 0.5, -1, 0.75, -1, 1
              ];

              var skip_edge_check = [];
              skip_edge_check[16] = true; skip_edge_check[32] = true; skip_edge_check[48] = true; skip_edge_check[64] = true;

              var fan_len = fan.length;
              return function (x, z, s, fd) {
                lfx = fan[0];
                lfz = fan[1];
                fi = fd;
                while (fi < fan_len) {
                  fx = fan[fi];
                  fz = fan[fi + 1];
                  if (skip_edge_check[fi] ||
                    check_vlevel(x + fx * s, z + fz * s) < s) {
                    draw_triangle(x, z,
                      x + lfx * s, z + lfz * s,
                      x + fx * s, z + fz * s,
                      s
                    );
                    lfx = fx;
                    lfz = fz;
                  }
                  fi += fd;
                }
              }
            })();

            var process_region = (function () {
              var qii = 0;
              function eval_area_height(x, z, s, pndx, slot) {
                var h0 = H(x, z);
                var h1 = (H(x - s, z - s) + H(x + s, z - s)) / 2;
                var h2 = (H(x - s, z + s) + H(x + s, z + s)) / 2;
                var h3 = (H(x - s, z - s) + H(x - s, z + s)) / 2;
                var h4 = (H(x + s, z - s) + H(x + s, z + s)) / 2;
                h0 = Math.max(Math.abs(h1 - h0), Math.abs(h2 - h0), Math.abs(h3 - h0), Math.abs(h4 - h0));
                var indx = qii;
                if (pndx > -1) {
                  output[pndx + slot] = indx;
                }
                if (s > MIN_PATCH_SIZE) {
                  qii += 5;
                  s *= 0.5;
                  h1 = eval_area_height(x - s, z - s, s, indx, 1);
                  h2 = eval_area_height(x + s, z - s, s, indx, 2);
                  h3 = eval_area_height(x - s, z + s, s, indx, 3);
                  h4 = eval_area_height(x + s, z + s, s, indx, 4);
                  h0 = Math.max(h0, h1, h2, h3, h4);
                }
                output[indx] = h0;
                return h0;
              }

              function rasterize_region(x, z, s, qi, detail) {
                if (s > WORKING_PATCH_SIZE || (s > WORKING_MIN_PATCH_SIZE && reg.QT[qi] > detail)) {
                  s *= 0.5;
                  rasterize_region(x - s, z - s, s, reg.QT[qi + 1], detail);
                  rasterize_region(x + s, z - s, s, reg.QT[qi + 2], detail);
                  rasterize_region(x - s, z + s, s, reg.QT[qi + 3], detail);
                  rasterize_region(x + s, z + s, s, reg.QT[qi + 4], detail);
                  return;
                }
                p = patches[s];
                p.list[p.i++] = x;
                p.list[p.i++] = z;

              }



              var check_edge_cases;

              function render_patches() {
                s = WORKING_MIN_PATCH_SIZE;
                while (s <= WORKING_PATCH_SIZE) {
                  p = patches[s];

                  i = 0;
                  while (i < p.i) {
                    x = p.list[i++];
                    z = p.list[i++];
                    fd = 16;
                    if (s > WORKING_MIN_PATCH_SIZE || WORKING_MIN_PATCH_SIZE > MIN_PATCH_SIZE) {
                      check_edge_cases = false;

                      if (check_vlevel(x - s, z) < s) {
                        check_edge_cases = true;
                      }
                      else if (check_vlevel(x + s, z) < s) {
                        check_edge_cases = true;
                      }
                      else if (check_vlevel(x, z - s) < s) {
                        check_edge_cases = true;
                      }
                      else if (check_vlevel(x, z + s) < s) {
                        check_edge_cases = true;
                      }
                      if (check_edge_cases) {

                        fd = (s / check_vlevel_value);
                        if (fd < 16) {
                          fd = Math.max(2, 8 / fd);
                        }
                        else fd = 2;

                        fd = Math.min(MIN_FAN_DETAIL, fd);
                        if (WORKING_MIN_PATCH_SIZE > MIN_PATCH_SIZE) fd = 2;
                      }
                      else {

                      }
                    }


                    draw_fan(x, z, s, fd);




                  }





                  s = s * 2;
                }

              }

              var nsize, xn, yn, zn, ss, ni;


              var calc_shadow_map = (function () {
                var ldx, ldy, ldz, cpx, cpy, cpz;

                return function () {
                  ss = MIN_PATCH_SIZE;

                  nsize = (region_size / ss);
                  var nmap = new Uint8Array(nsize * nsize * 4);
                  nmap.fill(255);
                  for (zn = 0; zn < region_size; zn += ss) {
                    for (xn = 0; xn < region_size; xn += ss) {


                      cpx = xn;
                      cpy = H(xn, zn);
                      cpz = zn;

                      ldx = (sun_x - reg.x) - cpx;
                      ldy = sun_y - cpy;
                      ldz = (sun_z - reg.z) - cpz;

                      _fp = ldx * ldx + ldy * ldy + ldz * ldz;
                      if (_fp > 0) _fp = 1 / Math.sqrt(_fp);
                      ldx *= _fp;
                      ldy *= _fp;
                      ldz *= _fp;



                      ldx = Math.sign(ldx);
                      ldy = Math.sign(ldy);
                      ldz = Math.sign(ldz);
                      while (cpx > -region_size && cpx < region_size * 2 &&
                        cpz > -region_size && cpz < region_size * 2) {
                        cpx += ldx * (ss / 1);
                        cpy += ldy * (ss / 1);
                        cpz += ldz * (ss / 1);



                        if (cpy <= HH(Math.round(cpx), Math.round(cpz))) {
                          ni = (((zn / ss)) * nsize + ((xn / ss))) * 4;
                          nmap[ni] = 150;
                          /*
                          for (ldz = 0; ldz < ss; ldz++) {
                              for (ldx = 0; ldx < ss; ldx++) {
                                  ni = (((zn / ss) + ldz) * nsize + ((xn / ss) + ldx)) * 4;
                                 // nmap[ni] = 100;
                              }
                          }
                          */
                          break;
                        }
                      }


                    }
                  }
                  reg.smap = true;
                  thread.postMessage([2300, reg.key, nsize, nmap.buffer], [nmap.buffer]);
                  //console.log(reg.key,nmap);
                }
                return function () {
                  ss = 1;
                  nsize = reg.size - 1;
                  var nmap = new Uint8Array(nsize * nsize * 4);
                  nmap.fill(255);
                  for (zn = 0; zn < nsize; zn += ss) {
                    for (xn = 0; xn < nsize; xn += ss) {


                      cpx = xn;
                      cpy = reg.data[zn * reg.size + xn];
                      cpz = zn;

                      ldx = (sun_x - reg.x) - cpx;
                      ldy = sun_y - cpy;
                      ldz = (sun_z - reg.z) - cpz;

                      _fp = ldx * ldx + ldy * ldy + ldz * ldz;
                      if (_fp > 0) _fp = 1 / Math.sqrt(_fp);
                      ldx *= _fp;
                      ldy *= _fp;
                      ldz *= _fp;


                      ni = ((zn / ss) * nsize + (xn / ss)) * 4;

                      while (cpx >= 0 && cpx < region_size - ss && cpz >= 0 && cpz < region_size - ss) {
                        cpx += ldx; cpy += ldy; cpz += ldz;
                        if (cpy <= reg.data[Math.round(cpz) * reg.size + Math.round(cpx)]) {
                          nmap[ni] = 100;
                          break;
                        }
                      }


                    }
                  }

                  thread.postMessage([2300, reg.key, nsize, nmap.buffer], [nmap.buffer]);
                  //console.log(reg.key,nmap);
                }
              })();

              return function (reg, detail) {
                if (!reg.QT) {
                  qii = 0;
                  eval_area_height(region_size2, region_size2, region_size2, -1, 0);
                  reg.QT = new Float32Array(qii);
                  i = 0; while (i < qii) { reg.QT[i] = output[i++]; }
                  // calc_normals();

                }
                if (!reg.smap && detail < 14) {
                  // calc_shadow_map();
                }
                for (s = WORKING_MIN_PATCH_SIZE; s <= WORKING_PATCH_SIZE; s *= 2) patches[s].i = 0;

                rasterize_region(region_size2, region_size2, region_size2, 0, detail);
                render_patches();




              }
            })();


            thread[2500] = (function () {

              function draw_tri(x0, z0, x1, z1, x2, z2) {
                output[oi] = x0;
                output[oi + 2] = z0;
                oi += 6;
                output[oi] = x1;
                output[oi + 2] = z1;
                oi += 6;
                output[oi] = x2;
                output[oi + 2] = z2;
                oi += 6;
              }
              var xx, zz, rx, rz, ww, hh;
              var dc_data;
              return function (op, reg_key, id, px, pz, sx, sz, bindex, data_buffer) {
                reg = regions[reg_key];
                if (reg) {

                  oi = 0;


                  s = MIN_PATCH_SIZE * 1;
                  for (z = 0; z < sz; z += s * 2) {
                    for (x = 0; x < sx; x += s * 2) {
                      //draw_tri(x, z,x, z + s,x + s, z + s);
                      //draw_tri(x, z,x + s, z + s,x + s, z);
                      xx = x + s;
                      zz = z + s;
                      draw_tri(xx, zz, xx - s, zz + s, xx + s, zz + s);
                      draw_tri(xx, zz, xx + s, zz + s, xx + s, zz - s);
                      draw_tri(xx, zz, xx + s, zz - s, xx - s, zz - s);
                      draw_tri(xx, zz, xx - s, zz - s, xx - s, zz + s);
                    }
                  }


                  j = (oi / 6) * 3;

                  if (data_buffer.byteLength < j * 4) {
                    dc_data = new Float32Array(j);
                  }
                  else {
                    dc_data = new Float32Array(data_buffer);
                  }
                  data_buffer = dc_data.buffer;






                  xx = (px - reg.x);
                  zz = (pz - reg.z);

                  xx = Math.floor(xx / s) * s;
                  zz = Math.floor(zz / s) * s;




                  i = 0; j = 0;
                  while (i < oi) {
                    x = output[i] + xx;
                    z = output[i + 2] + zz;
                    dc_data[j] = x + reg.x;
                    dc_data[j + 1] = 0;// HH(x + region_size2, z + region_size2);
                    // dc_data[j + 1] += 0.2;
                    dc_data[j + 2] = z + reg.z;
                    i += 6; j += 3;
                  }
                  this.postMessage([op, reg_key, id, j, bindex, data_buffer], [data_buffer]);
                }

              }
            })();



            function calculate_output_data(is, ie) {
              i = is;
              s = PATCH_SIZE;
              while (i < ie) {
                x = output[i]
                z = output[i + 2];
                vkey = (z + vindex_width2) * vindex_width + (x + vindex_width2);
                if (vmap[vkey] !== 222) {
                  vmap[vkey] = 222;
                  vkey *= 4;
                  vdata[vkey] = H(x, z);

                  nx = (HH(x - s, z) - HH(x + s, z));
                  ny = s * 2;
                  nz = (HH(x, z - s) - HH(x, z + s));

                  _fp = nx * nx + ny * ny + nz * nz;
                  if (_fp > 0) _fp = 1 / Math.sqrt(_fp);

                  nx = (((nx * _fp) + 1) * 0.5) * 255;
                  ny = (((ny * _fp) + 1) * 0.5) * 255;
                  nz = (((nz * _fp) + 1) * 0.5) * 255;

                  vdata[vkey + 1] = nx;
                  vdata[vkey + 2] = ny;
                  vdata[vkey + 3] = nz;

                  reg.minh = Math.min(reg.minh, vdata[vkey]);
                  reg.maxh = Math.max(reg.maxh, vdata[vkey]);


                }
                else {
                  vkey *= 4;
                }
                output[i + 1] = vdata[vkey];
                output[i + 3] = vdata[vkey + 1];
                output[i + 4] = vdata[vkey + 2];
                output[i + 5] = vdata[vkey + 3];
                i += 6;
              }

            }


            thread.prepare_empty_region = function () {
              oi = 0;
              draw_fan(region_size2, region_size2, region_size2, 16);
              j = (oi / 6) * 3;
              reg_data = new Float32Array(j);
              i = 0; j = 0;
              nx = (((0) + 1) * 0.5) * 255;
              ny = (((1) + 1) * 0.5) * 255;
              nz = (((0) + 1) * 0.5) * 255;
              _fp = (nx << 16) | (ny << 8) | nz;
              _fp = _fp / (1 << 24);
              while (i < oi) {
                reg_data[j] = output[i + 2] * region_size1 + output[i];
                reg_data[j + 1] = 0;
                reg_data[j + 2] = _fp;
                i += 6; j += 3;
              }
              
              this.postMessage([100, reg_data.buffer], [reg_data.buffer]);
            };

            return function (op, reg_key, detail, bindex, reg_data_buffer) {

              reg = regions[reg_key];
              if (reg) {


                WORKING_PATCH_SIZE = PATCH_SIZE;
                WORKING_MIN_PATCH_SIZE = MIN_PATCH_SIZE;


                if (detail > 10) {
                  WORKING_PATCH_SIZE *= 2;
                  WORKING_MIN_PATCH_SIZE *= 2;
                }

                time_start = Date.now();

                vmap.fill(255);
                render_strips(MIN_PATCH_SIZE);

                oi = 0;
                process_region(reg, detail);
                calculate_output_data(0, oi);


                j = (oi / 6) * 3;

                if (reg_data_buffer.byteLength < j * 4) {
                  reg_data = new Float32Array(j);
                }
                else {
                  reg_data = new Float32Array(reg_data_buffer);
                }
                reg_data_buffer = reg_data.buffer;


                i = 0; j = 0;
                while (i < oi) {
                  reg_data[j] = output[i + 2] * region_size1 + output[i];
                  reg_data[j + 1] =  output[i + 1];

                  _fp = (output[i + 3] << 16) | (output[i + 4] << 8) | output[i + 5];
                  reg_data[j + 2] = _fp / (1 << 24);

                  reg.minh = Math.min(reg.minh, reg_data[j + 1]);
                  reg.maxh = Math.max(reg.maxh, reg_data[j + 1]);
                  i += 6; j += 3;
                }


                rast_time = Date.now() - time_start;

                
                this.postMessage([op, reg_key, detail, reg.minh, reg.maxh, j,
                  bindex, reg_data_buffer],
                  [reg_data_buffer]);

                return;
                console.log('render reg',
                  rast_time + ' ms /' +
                  reg_key + '/' + detail + '/' + (j / 3)
                );

              };

            }


          })();


          thread[3000] = (function () {
            var div = 0, l = 0, layer, px, pz, elv, ns, o;
            var frequency, amplitude;

            var layers = [
              {
                baseRoughness: 1, roughness: 1.15,
                persistence: 0.4, strength: 0.35, octaves: 5,
              }
              ,
              {
                baseRoughness: 1, roughness: 2.1,
                persistence: 0.8, strength: 0.23515, octaves: 4,
              }

            ];
            var e, maxe, mine, size_scale;
            return function (op, xs, zs, size, scale) {
              noise.seed(Math.random());


              maxe = Number.MIN_VALUE;
              mine = Number.MAX_VALUE;
              size_scale = 128;
              for (reg_z = 0; reg_z < size; reg_z++) {
                for (reg_x = 0; reg_x < size; reg_x++) {

                  px = reg_x - size * 0.5;
                  pz = reg_z - size * 0.5;

                  e = 0;
                  for (l = 0; l < layers.length; l++) {
                    layer = layers[l];

                    frequency = layer.baseRoughness;
                    amplitude = 1;
                    ns = 0;
                    for (o = 0; o < layer.octaves; o++) {
                      ns += (noise.perlin(px / size_scale * frequency, pz / size_scale * frequency) * 2 - 1)
                        * amplitude;


                      frequency *= layer.roughness;
                      amplitude *= layer.persistence;

                    }

                    e += ns * layer.strength;
                  }
                  maxe = Math.max(maxe, e);
                  mine = Math.min(mine, e);
                  output[reg_z * size + reg_x] = e;



                }
              }

              for (reg_z = 0; reg_z < size; reg_z++) {
                for (reg_x = 0; reg_x < size; reg_x++) {
                  e = output[reg_z * size + reg_x];
                  e = (e - mine) / (maxe - mine);

                  output[reg_z * size + reg_x] = e * 500;
                }
              }
              //op, xs, zs, data_size, data, scale
              //console.log(output);
              this[200](200, xs, zs, size, output, scale);
              this.postMessage([3100]);

            }

          })();


          thread.onmessage = function (m) {
            this[m.data[0]].apply(this, m.data);
          }


        });
        this.worker = worker;
        this.worker.terrain = this;

        this.update_reg_bounds = function (reg) {
          reg.rad = ((reg.maxh - reg.minh) / 2) * 1;
          reg.y = reg.minh + reg.rad;
          reg.a_minx = Math.min(reg.x - this.region_size_half, reg.x + this.region_size_half);
          reg.a_miny = Math.min(reg.y - reg.rad, reg.y + reg.rad);
          reg.a_minz = Math.min(reg.z - this.region_size_half, reg.z + this.region_size_half);

          reg.a_maxx = Math.max(reg.x - this.region_size_half, reg.x + this.region_size_half);
          reg.a_maxy = Math.max(reg.y - reg.rad, reg.y + reg.rad);
          reg.a_maxz = Math.max(reg.z - this.region_size_half, reg.z + this.region_size_half);

        };

        this.worker[100] = function (op, data_buffer) {
          this.terrain.empty_regions_buffer = raw.webgl.buffers.get(this.terrain.renderer.gl);
          this.terrain.renderer.gl.bindBuffer(raw.GL_ARRAY_BUFFER, this.terrain.empty_regions_buffer);
          this.terrain.er_di = data_buffer.byteLength / 4;
          this.terrain.renderer.gl.bufferData(raw.GL_ARRAY_BUFFER, new Float32Array(data_buffer), raw.GL_DYNAMIC_DRAW, 0, this.terrain.er_di);
          this.terrain.er_di /= 3;
        };

        this.worker[200] = function (op, reg_key, rx, rz, minh, maxh) {
          var reg = {
            key: reg_key, last_time: 0, detail: -1,
            reg_x: rx, reg_z: rz, state: 0, req_detail: -1,
            x: rx * this.terrain.region_size * 1.0,
            z: rz * this.terrain.region_size * 1.0,
            minh: minh, maxh: maxh, type: 1
          };

          this.terrain.update_reg_bounds(reg);
          this.terrain.regions[reg_key] = reg;
          this.terrain.camera_version = -1;

        };

        this.worker[300] = function (op, reg_key, cqt_data_buffer) {
          reg = this.terrain.regions[reg_key];
          if (reg) {
            reg.CQT = new Int16Array(cqt_data_buffer);
          }
        };
        this.worker[1500] = function (op, reg_key, height) {
          this.terrain.height_on_camera = height;
        };

        this.query_heights = {};
        this.worker[1550] = function (op, id, height) {
          this.terrain.query_heights[id] = height;
        };



        this.worker[2200] = function (op, reg_key, size, nmap) {
          reg = this.terrain.regions[reg_key];
          if (reg) {
            //reg.nmap = new Uint8Array(nmap);
            reg.nmap = new tge.texture(new Uint8Array(nmap), undefined, undefined, true,
              this.terrain.region_size / size, this.terrain.region_size / size);



          }
        };

        this.worker[2300] = function (op, reg_key, size, smap) {
          reg = this.terrain.regions[reg_key];
          if (reg) {
            reg.smap = new raw.webgl.texture(new Uint8Array(smap), undefined, undefined, true,
              size, size);

            reg.smap.P("TEXTURE_WRAP_S", raw.GL_CLAMP_TO_EDGE);
            reg.smap.P("TEXTURE_WRAP_T", raw.GL_CLAMP_TO_EDGE);

          }
        };



        worker.request_region = (function () {
          var parking = new raw.queue();


          var reg_data_buffers = [
            new ArrayBuffer(1),
            new ArrayBuffer(1),

          ];

          console.log('reg_data_buffers', reg_data_buffers);
          
          var i = 0;
          function get_buffer_index() {
            i = 0;
            while (i < reg_data_buffers.length) {
              if (reg_data_buffers[i].byteLength > 0) return i;
              i++;
            }
            return -1;
          }

          var bindex = 0;
          worker[2000] = (function () {
            var reg_data;
            return function (op, reg_key, detail, minh, maxh, ri, bindex, reg_data_buffer) {


              reg = this.terrain.regions[reg_key];
              reg.last_time = this.terrain.timer;
              reg.minh = minh;
              reg.maxh = maxh;
              this.terrain.update_reg_bounds(reg);
              reg.ds = 0;
              reg.di = ri / 3;

              reg_data = new Float32Array(reg_data_buffer);


              reg.buffer = reg.buffer || raw.webgl.buffers.get(this.terrain.renderer.gl);

              this.terrain.renderer.gl.bindBuffer(raw.GL_ARRAY_BUFFER, reg.buffer);
              this.terrain.renderer.gl.bufferData(raw.GL_ARRAY_BUFFER, reg_data, raw.GL_DYNAMIC_DRAW, 0, ri);
              reg.detail = detail;
              reg.state = 1;

              this.terrain.regions_to_render[this.terrain.ri++] = reg;


              reg_data_buffers[bindex] = reg_data_buffer;

              if (parking.size() > 0) {
                this.request_region(parking.dequeue());
              }

            }
          })();

          worker[2500] = (function () {
            var obj_data, obj;
            return function (op, reg_key, id, ri, bindex, data_buffer) {

              reg = this.terrain.regions[reg_key];
              obj = this.terrain.objects[id];
              if (obj) {
                obj_data = new Float32Array(data_buffer);
                obj.buffer = obj.buffer || vertex_buffers.get(this.terrain.renderer.gl);
                this.terrain.renderer.gl.bindBuffer(GL_ARRAY_BUFFER, obj.buffer);
                this.terrain.renderer.gl.bufferData(GL_ARRAY_BUFFER, obj_data, GL_DYNAMIC_DRAW, 0, ri);
                obj.ds = 0;
                obj.di = ri / 3;
                obj.state = 1;

                // console.log("obj", obj);
              }


              reg_data_buffers[bindex] = data_buffer;

              if (parking.size() > 0) {
                this.request_region(parking.dequeue());
              }

            }
          })();

          return function (obj) {
            if (obj.state !== 2) {
              return;
            }
            obj.last_time = this.terrain.timer;
            bindex = get_buffer_index();
            if (bindex > -1) {
              if (obj.type === 1) {
                this.postMessage([2000, obj.key, obj.req_detail, bindex, reg_data_buffers[bindex]], [reg_data_buffers[bindex]]);
              }
              else if (obj.type === 2) {
                this.postMessage([2500, obj.reg_key, obj.id, obj.px, obj.pz, obj.sx, obj.sz, bindex,
                  reg_data_buffers[bindex]], [reg_data_buffers[bindex]]);
              }

            }
            else if (obj) {
              parking.enqueue(obj);
            }

            this.terrain.parking_length = parking.size();


          }
        })();


        this.worker.onmessage = function (m) {
          this[m.data[0]].apply(this, m.data);
        };


        this.worker[3100] = function () {
          if (this.terrain.camera) {
            this.terrain.camera_version = -1;
          }
        };



        
      }
    })();


    proto.initialize = function (renderer) {
      this.renderer = renderer;      
      this.update_terrain_parameters();

      if (this.def_regions_from_image_url) {
        for (i = 0; i < this.def_regions_from_image_url.length; i++) {
          this.regions_from_image_url.apply(this, this.def_regions_from_image_url[i]);
        }
      }
      this.initialized = true;

    };

    proto.update_terrain = (function () {


      proto.validate_regions = (function () {
        var rk;
        return function () {
          if (this.timer - this.last_validate_time < 5) return;
          this.last_validate_time = this.timer;
          for (rk in this.regions) {
            reg = this.regions[rk];
            if (reg.state > 0 && this.timer - reg.last_time > 2) {
              reg.last_time = this.timer;
              if (reg.buffer) {
                raw.webgl.buffers.free(reg.buffer);
                reg.buffer = undefined;
                reg.detail = -1;
              }
            }
          }
        }
      })();

      var reg_detail = 4, reg_dist = 0, requested_regions = [], ri = 0;
      proto.request_region = function (reg, detail) {
        if (reg.detail !== detail && reg.state !== 2) {

          reg.req_detail = detail;
          reg.state = 2;
          requested_regions[ri++] = reg;
        }
        if (reg.buffer) {
          this.regions_to_render[this.ri++] = reg;
        }
        reg.last_time = this.timer;
      };

      proto.update_terrain_frustum = (function () {
        var fminx, fminy, fminz, fminx, fminy, fminz, fss;
        return function (x, z, s) {

          reg_x = (this.cam_reg_x + (x + 0.5)) * this.region_size;
          reg_z = (this.cam_reg_z + (z + 0.5)) * this.region_size;


          if (s > 0.5) {
            fss = s * this.region_size;
            fminx = Math.min(reg_x - fss, reg_x + fss);
            fminy = -100;
            fminz = Math.min(reg_z - fss, reg_z + fss);

            fmaxx = Math.max(reg_x - fss, reg_x + fss);
            fmaxy = this.draw_distance;
            fmaxz = Math.max(reg_z - fss, reg_z + fss);

            if (this.camera._frustum_aabb(fminx, fminy, fminz, fmaxx, fmaxy, fmaxz)) {
              s *= 0.5;
              this.update_terrain_frustum(x - s, z - s, s);
              this.update_terrain_frustum(x + s, z - s, s);
              this.update_terrain_frustum(x - s, z + s, s);
              this.update_terrain_frustum(x + s, z + s, s);
              return;
            }
          }
          else {
            reg_x = this.cam_reg_x + (x + 0.5);
            reg_z = this.cam_reg_z + (z + 0.5);
            reg_key = reg_z * this.world_size + reg_x;
            reg = this.regions[reg_key];
            if (reg) {
              if (this.camera._frustum_aabb(reg.a_minx, reg.a_miny, reg.a_minz, reg.a_maxx, reg.a_maxy, reg.a_maxz)) {
                reg_dist = (
                  Math.abs((this.camera.world_position[0] - reg.x)) +
                  Math.abs(this.camera.world_position[1] - reg.y) +
                  Math.abs((this.camera.world_position[2] - reg.z)));
                reg.distance = reg_dist;

                if (reg_dist - this.region_size_half > this.draw_distance) {
                  if (Math.abs(reg.reg_x % 4) === 0 && Math.abs(reg.reg_z % 4) === 0) {
                    // this.request_region(reg, this.fixed_detail);
                  }

                  return;

                }

                if (this.fixed_detail !== -1) {

                  this.request_region(reg, this.fixed_detail);
                }
                else {
                  reg_dist = Math.min(reg_dist / this.quality_distance, 1);

                  reg_detail = this.detail_levels[Math.floor((this.detail_levels.length - 1) * reg_dist)];


                  this.request_region(reg, reg_detail);
                }

              }
              else if (reg.state == 2) {
                //console.log("rejected", reg);
                //  reg.state = 1;

              }
            }
            else {
              x = (reg_x * this.region_size) - this.region_size_half;
              z = (reg_z * this.region_size) - this.region_size_half;
              reg_dist = (
                Math.abs((this.camera.world_position[0] - x)) +
                Math.abs(this.camera.world_position[1] - 0) +
                Math.abs((this.camera.world_position[2] - z)));

              if (reg_dist < this.draw_distance) {
                this.empty_regions[this.er++] = x;
                this.empty_regions[this.er++] = z;
              }



            }
          }

        }
      })();

 
     
      proto.height_in_region = (function () {
        var working = false;
        var QT, qi = 0, xa, za, xt, zt, st;
        var u0v0, u1v0, u0v1, u1v1, ht;
        function is_in_quad(x, z, s, px, pz) {

          if (px > x - s && px < x + s) {
            if (pz > z - s && pz < z + s) {
              return true;
            }
          }
          return false;

        };
        return function (reg, px, pz) {
          QT = reg.QT;
          if (!QT) return;
          qi = 0;
          working = true;
          xa = reg.x - this.region_size_half;
          za = reg.z - this.region_size_half;
          px -= xa;
          pz -= za;

          while (qi < QT.length) {
            if (QT[qi] === -1) {
              xt = QT[qi + 1]; zt = QT[qi + 2]; st = QT[qi + 3];
              if (px > xt - st && px < xt + st) {
                if (pz > zt - st && pz < zt + st) {
                  if (pz < zt) {
                    qi = px < xt ? QT[qi + 5] : QT[qi + 6];
                  }
                  else {
                    qi = px < xt ? QT[qi + 7] : QT[qi + 8];
                  }
                  continue;
                }
              }
              qi += 9;
            }
            else {
              break;
            }
          }

          px -= QT[qi + 1];
          pz -= QT[qi + 2];
          px /= QT[qi + 3];
          pz /= QT[qi + 3];
          px += 0.5;
          pz += 0.5;

          u0v0 = QT[qi + 5] * (Math.ceil(px) - px) * (Math.ceil(pz) - pz); // interpolated (x0, z0)
          u1v0 = QT[qi + 6] * (px - Math.floor(px)) * (Math.ceil(pz) - pz); // interpolated (x1, z0)
          u0v1 = QT[qi + 7] * (Math.ceil(px) - px) * (pz - Math.floor(pz)); // interpolated (x0, z1)
          u1v1 = QT[qi + 8] * (px - Math.floor(px)) * (pz - Math.floor(pz)); // interpolated (x1, z1)

          ht = u0v0 + u1v0 + u0v1 + u1v1; // estimate

          this.aabbs.add(xa + QT[qi + 1], reg.y, za + QT[qi + 2],
            QT[qi + 3],
            QT[qi + 4] / 2,
            QT[qi + 3]
          );
          return ht;
        }
      })();
      var sort_regions_func = function (a, b) {
        return a.distance - b.distance;
      };
      var cam_reg_key = 0, obj = undefined;

      this.query_height = function (id, px, pz) {
        reg_x = Math.floor((px / this.region_size) + 0.5);
        reg_z = Math.floor((pz / this.region_size) + 0.5);
        reg_key = reg_z * this.world_size + reg_x;
        reg = this.regions[reg_key];
        if (reg) {
          this.worker.postMessage([1550, reg.key, id, px, pz]);
        }
      }

      return function () {
        

        this.cam_reg_x = Math.floor((this.camera.world_position[0] / this.region_size) + 0.5);
        this.cam_reg_z = Math.floor((this.camera.world_position[2] / this.region_size) + 0.5);



        
        cam_reg_key = this.cam_reg_z * this.world_size + this.cam_reg_x;
        this.cam_reg = this.regions[cam_reg_key];
        if (this.cam_reg) {
          this.worker.postMessage([1500, this.cam_reg.key, this.camera.world_position[0], this.camera.world_position[2]]);
        }

        if (this.timer - this.last_updated_time < 0.1) {
          this.update_requested = true;
          // return;

        }
        this.update_requested = false;
        this.last_updated_time = this.timer;
        time_start = Date.now();

        ri = 0;
        this.ri = 0;
        this.er = 0;


        this.update_terrain_frustum(0, 0, this.region_distance);

        if (ri > 0) {
          requested_regions =raw.merge_sort(requested_regions, ri, sort_regions_func);
          i = 0;
          while (i < ri) this.worker.request_region(requested_regions[i++]);

        }
        i = 0;

        this.validate_regions();


        this.debug_text = ((Date.now() - time_start) + ' ms /regions ' + this.ri + '/' + (this.er / 2) +
          '/ vertex buffers ' + raw.webgl.buffers.data.length + '/' + raw.webgl.buffers.allocated +
          ' parking ' + this.parking_length +
          ' / tri count ' + this.tri_count
        );
      }



    })();


    var land_color =raw.math.vec3(1, 1, 1);
    var reg_pos = raw.math.vec3(0, 0, 0);
    var cam_reg_pos = raw.math.vec3();
    proto.render_terrain = (function () {
      var _di, _ds,_ri=0, i = 0;        

      return function (renderer, shader) {

        if (!this.initialized) return;
        

        cam_reg_pos[0] = this.cam_reg_x * this.region_size;
        cam_reg_pos[1] = this.cam_reg_z * this.region_size;

        shader.set_uniform('cam_reg_pos', cam_reg_pos);
        cam_reg_pos[2] = this.region_size + 1;
        renderer.use_direct_texture(renderer.default_texture, 2);
        shader.set_uniform("u_shadow_map", 2);



        renderer.bind_default_wireframe_indices();

        this.tri_count = 0;
        i = 0;
        _ri = this.ri;
        while (i < _ri) {
          reg = this.regions_to_render[i++];
          reg.last_time = this.timer;
          if (reg.buffer) {
            _ds = reg.ds;
            _di = reg.di;
            this.tri_count += _di;

            reg_pos[0] = reg.x - this.region_size_half;
            reg_pos[2] = reg.z - this.region_size_half;

            reg_pos[1] = 1;

            renderer.gl.bindBuffer(raw.GL_ARRAY_BUFFER, reg.buffer);
            renderer.gl.vertexAttribPointer(0, 3, raw.GL_FLOAT, false, 12, 0);

            shader.set_uniform('reg_pos', reg_pos);

            if (reg.smap) {
            //  shader.set_uniform("u_shadow_map", 2);
            //  renderer.use_texture(reg.smap, 2);
              console.log('reg.smap', reg.smap);
            }
            else {
              //shader.set_uniform("u_shadow_map", 3);              
            }

            if (this.wireframe) {
              shader.set_uniform('land_color', raw.math.vec3.set(land_color, 2.0, 2.0, 2.0));
              renderer.gl.drawElements(raw.GL_LINES, _di * 2, raw.GL_UNSIGNED_INT, (_ds * 2) * 4);
            }


            if (this.shaded) {            
            //renderer.use_texture(this.shadow_map, 1);
             
              raw.math.vec3.set(land_color, 1, 1, 1);
              shader.set_uniform('land_color', land_color);
              renderer.gl.drawArrays(raw.GL_TRIANGLES, _ds, _di);
            }

          }

        }
        this.render_time = Date.now() - time_start;

        return;

        if (this.empty_regions_buffer) {
          renderer.gl.bindBuffer(raw.GL_ARRAY_BUFFER, this.empty_regions_buffer);
          renderer.gl.vertexAttribPointer(0, 3, raw.GL_FLOAT, false, 12, 0);

          i = 0;
          reg_pos[1] = 1;
          _ds = 0;
          _di = this.er_di;
          while (i < this.er) {
            reg_pos[0] = this.empty_regions[i++];
            reg_pos[2] = this.empty_regions[i++];

            shader.set_uniform('reg_pos', reg_pos);
            this.tri_count += _di;
            if (this.wireframe) {
              shader.set_uniform('land_color',raw.math.vec3.set(land_color, 0.5, 0.5, 0.5));
              renderer.gl.drawElements(raw.GL_LINES, _di * 2, raw.GL_UNSIGNED_INT, (_ds * 2) * 4);
            }


            if (this.shaded) {
              shader.set_uniform('land_color',raw.math.vec3.set(land_color, 0, 0, 0));
              renderer.gl.drawArrays(raw.GL_TRIANGLES, _ds, _di);
            }

          }






        }


        




      }
    })();

    function terrain(component) {
      _super.apply(this, [component]);


    }

    terrain.validate = function (component) {
      component.ecs.use_system('terrain_system');
    };

    return terrain;

  }, raw.ecs.components["render_item"]));



  raw.ecs.register_system("terrain_system", raw.define(function (proto, _super) {    

    var terrain = null;
    proto.step = function () {
      this.worked_items = 0;
      while ((entity = this.ecs.iterate_entities("terrain")) !== null) {
        terrain = entity.terrain;
        terrain.timer = this.ecs.timer;
        if (!terrain.initialized) {
          terrain.initialize(this.renderer);
        }
        else {
          if (this.renderer.active_camera !== null) {
            terrain.camera = this.renderer.active_camera;
            if (terrain.camera.version !== terrain.camera_version) {
              terrain.update_terrain();
              terrain.camera_version = terrain.camera.version;
              this.worked_items++;
            }
          }
          
        }

        
      }
    };

    proto.validate = function (ecs) {
      this.priority = ecs.use_system('camera_system').priority + 50;

      ecs._systems.for_each(function (sys, i, self) {
        if (sys.is_renderer) {
          self.renderer = sys;            
        }

      }, this);
    };
    return function terrain_system(def, ecs) {
      _super.apply(this, [def, ecs]);

    }

  }, raw.ecs.system));

})();


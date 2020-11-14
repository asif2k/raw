
raw.webgl = {};
raw.webgl.buffers = new raw.object_pooler(function (gl) {
  return gl.createBuffer();
});
raw.webgl.textures = new raw.object_pooler(function (gl) {
  return gl.createTexture();
});

raw.webgl.texture = raw.define(function (proto) {
  proto.update = function (gl) {
    raw.webgl.texture.update(gl, this);
  };
  function texture(target, format, format_type, source, generate_mipmap, width, height) {

    this.uuid = raw.guidi();
    this.gl_texture = null;

    this.needs_update = false;
    if (source === undefined) {
      this.source = new Uint8Array([255, 255, 255, 255]);
      this.needs_update = true;
    }
    else {
      this.source = source;
    }
    this.width = width || 1;
    this.height = height || 1;



    this.format = format || raw.GL_RGBA;
    this.format_type = format_type || raw.GL_UNSIGNED_BYTE;
    this.target = target || raw.GL_TEXTURE_2D;
    this.parameters = {};

    this.generate_mipmap = generate_mipmap;

    this.parameters[raw.GL_TEXTURE_WRAP_S] = raw.GL_REPEAT;
    this.parameters[raw.GL_TEXTURE_WRAP_T] = raw.GL_REPEAT;


    if (this.generate_mipmap) {
      this.parameters[raw.GL_TEXTURE_MAG_FILTER] = raw.GL_LINEAR;
      this.parameters[raw.GL_TEXTURE_MIN_FILTER] = raw.GL_LINEAR_MIPMAP_LINEAR;
    }
    else {
      this.parameters[raw.GL_TEXTURE_MAG_FILTER] = raw.GL_NEAREST;
      this.parameters[raw.GL_TEXTURE_MIN_FILTER] = raw.GL_NEAREST;
    }
    if (this.source && this.source !== null) this.needs_update = true;


  }


  texture.load_images = new raw.bulk_image_loader(5);
  texture.load_images.auto_free = false;

  texture.load_images.onload = function (img, tex) {
    tex.source = img;
    tex.width = img.width;
    tex.height = img.height;
    tex.needs_update = true;

  };

  var tex;
  texture.from_url = function (url, generate_mipmap) {
    tex = new raw.webgl.texture(undefined, undefined, undefined, undefined, generate_mipmap);
    raw.webgl.texture.load_images.load(url, tex);
    return tex;
  }


  var cube_map_texture_sequence = [
    raw.GL_TEXTURE_CUBE_MAP_NEGATIVE_X, raw.GL_TEXTURE_CUBE_MAP_POSITIVE_X,
    raw.GL_TEXTURE_CUBE_MAP_NEGATIVE_Y, raw.GL_TEXTURE_CUBE_MAP_POSITIVE_Y,
    raw.GL_TEXTURE_CUBE_MAP_NEGATIVE_Z, raw.GL_TEXTURE_CUBE_MAP_POSITIVE_Z
  ];
  var new_texture = false;
  texture.update = function (gl, tex) {


    new_texture = false;

    if (tex.gl_texture === null) {
      tex.gl_texture = raw.webgl.textures.get(gl);
      new_texture = true;
    }



    gl.bindTexture(tex.target, tex.gl_texture);

    if (tex.target === raw.GL_TEXTURE_CUBE_MAP) {
      for (i = 0; i < tex.source.length; i++) {
        gl.texImage2D(cube_map_texture_sequence[i], 0, tex.format, tex.format, texture.format_type, tex.source[i]);
      }
    }
    else {

      if (tex.source !== null && tex.source.src) {
        gl.texImage2D(tex.target, 0, tex.format, tex.format, tex.format_type, tex.source);
        raw.webgl.texture.load_images.free(tex.source);
      }

      else {
        gl.texImage2D(tex.target, 0, tex.format, tex.width, tex.height, 0, tex.format, tex.format_type, tex.source);
      }
    }

    if (new_texture) {
     
    }
    for (p in tex.parameters) {
      gl.texParameteri(tex.target, p, tex.parameters[p]);
    }
    
    if (tex.generate_mipmap) {
      gl.generateMipmap(tex.target);
    }
    gl.bindTexture(tex.target, null);
    tex.needs_update = false;

    return tex;


  };

  texture.dummy = new texture();

  return texture;

});


raw.webgl.canvas_texture = raw.define(function (proto,_super) {
  var new_texture = false;
  proto.update = function (gl) {
    new_texture = false;
    if (this.gl_texture === null) {
      this.gl_texture = raw.webgl.textures.get(gl);
      new_texture = true;
    }
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    gl.bindTexture(this.target, this.gl_texture);

    gl.texImage2D(this.target, 0, this.format, this.format, this.format_type, this.canvas);
    

    if (new_texture) {
      for (p in this.parameters) {
        gl.texParameteri(this.target, p, this.parameters[p]);
      }
    }
    
    this.needs_update = false;
    gl.bindTexture(this.target, null);
  }; 

  proto.set_update = function () {
    this.needs_update = true;
  };
  return function canvas_texture(width, height, target, format, format_type) {
    _super.apply(this, [target, format, format_type, null,false, width, height]);
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    

    
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.ctx.transform(1, 0, 0, -1, 0, this.canvas.height);
    
    this.needs_update = true;    
  }


}, raw.webgl.texture);

raw.webgl.render_target = raw.define(function (proto) {

  function render_target(gl, width, height) {
    this.uuid = raw.guidi();
    this.gl = gl;
    this.frame_buffer = gl.createFramebuffer();


    this.vp_left = 0;
    this.vp_top = 0;
    this.width = width;
    this.height = height;
    this.vp_bottom = height;
    this.vp_right = width;
    this.clear_buffer = true;

    this.set_default_viewport();
    return this;
  }

  proto.resize = function (width, height) {

    if (this.color_texture) {
      this.color_texture.width = width;
      this.color_texture.height = height;
      raw.webgl.texture.update(this.gl, this.color_texture);
    }
    if (this.depth_texture) {
      this.depth_texture.width = width;
      this.depth_texture.height = height;
      raw.webgl.texture.update(this.gl, this.depth_texture);
    }

    if (this.depth_buffer) {
      this.gl.bindRenderbuffer(raw.GL_RENDERBUFFER, this.depth_buffer);
      this.gl.renderbufferStorage(raw.GL_RENDERBUFFER, raw.GL_DEPTH_COMPONENT16, width, height);

    }
    this.vp_bottom = height;
    this.vp_right = width;
  }

  proto.set_viewport_per = function (left, top, right, bottom) {
    this.vp_left = this.width * left;
    this.vp_top = this.height * top;
    this.vp_right = this.width * right;
    this.vp_bottom = this.height * bottom;
    return (this)
  };
  proto.set_viewport = function (left, top, right, bottom) {
    this.vp_left = left;
    this.vp_top = top;
    this.vp_right = right;
    this.vp_bottom = bottom;
  };


  proto.set_default_viewport = function () {
    this.set_viewport_per(0, 0, 1, 1);
    return (this)
  };
  proto.bind = function () {
    if (this.gl.bindFramebuffer(raw.GL_FRAMEBUFFER, this.frame_buffer)) {
      this.apply_viewport();
    }
    if (this.clear_buffer) this.gl.clear(raw.GL_COLOR_BUFFER_BIT | raw.GL_DEPTH_BUFFER_BIT);
    return (this)
  };

  proto.apply_viewport = function () {
    this.gl.viewport(this.vp_left, this.vp_top, this.vp_right - this.vp_left, this.vp_bottom - this.vp_top);
    return (this)
  };
  proto.bind_only = function () {
    if (this.gl.bindFramebuffer(raw.GL_FRAMEBUFFER, this.frame_buffer)) {
      this.gl.viewport(this.vp_left, this.vp_top, this.vp_right - this.vp_left, this.vp_bottom - this.vp_top);
    }

    return (this)
  };


  proto.unbind = function () {
    this.gl.bindFramebuffer(raw.GL_FRAMEBUFFER, null);
  };

  proto.attach_color = function (gl_texture) {
    this.color_texture = this.bind_texture(new raw.webgl.texture(undefined, undefined, undefined, null, false, this.width, this.height), raw.GL_COLOR_ATTACHMENT0, gl_texture);
    this.color_texture.parameters[raw.GL_TEXTURE_WRAP_S] = raw.GL_CLAMP_TO_EDGE;
    this.color_texture.parameters[raw.GL_TEXTURE_WRAP_T] = raw.GL_CLAMP_TO_EDGE;
    
    


    return (this);

  };

  proto.attach_depth = function () {
    this.depth_texture = this.bind_texture(new raw.webgl.texture(undefined, raw.GL_DEPTH_COMPONENT, raw.GL_UNSIGNED_SHORT, null, false, this.width, this.height), raw.GL_DEPTH_ATTACHMENT);
    this.depth_texture.parameters[raw.GL_TEXTURE_WRAP_S] = raw.GL_CLAMP_TO_EDGE;
    this.depth_texture.parameters[raw.GL_TEXTURE_WRAP_T] = raw.GL_CLAMP_TO_EDGE;

  };

  proto.attach_depth_buffer = function () {
    this.depth_buffer = this.gl.createRenderbuffer();
    this.gl.bindRenderbuffer(raw.GL_RENDERBUFFER, this.depth_buffer);
    this.gl.renderbufferStorage(raw.GL_RENDERBUFFER, raw.GL_DEPTH_COMPONENT16, this.width, this.height);

    this.gl.bindFramebuffer(raw.GL_FRAMEBUFFER, this.frame_buffer);

    this.gl.framebufferRenderbuffer(raw.GL_FRAMEBUFFER, raw.GL_DEPTH_ATTACHMENT, raw.GL_RENDERBUFFER, this.depth_buffer);

    var status = this.gl.checkFramebufferStatus(raw.GL_FRAMEBUFFER);
    switch (status) {
      case raw.GL_FRAMEBUFFER_COMPLETE:
        break;
      case raw.GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
        throw ("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
        break;
      case raw.GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
        throw ("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
        break;
      case raw.GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
        throw ("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
        break;
      case raw.GL_FRAMEBUFFER_UNSUPPORTED:
        throw ("Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED");
        break;
      default:
        throw ("Incomplete framebuffer: " + status);
    }


    this.gl.bindFramebuffer(raw.GL_FRAMEBUFFER, null);
    this.gl.bindRenderbuffer(raw.GL_RENDERBUFFER, null);
  };

  proto.bind_texture = function (texture, attachment,gl_texture) {



    this.gl.bindFramebuffer(raw.GL_FRAMEBUFFER, this.frame_buffer);

    if (texture.gl_texture === null) {      
      if (gl_texture) {
        texture.gl_texture = this.gl.createTexture();        
      }
      raw.webgl.texture.update(this.gl, texture);

    }
    this.gl.bindTexture(texture.target, texture.gl_texture);

    if (texture.generate_mipmap) {
      this.gl.generateMipmap(texture.target);
    }

    this.gl.framebufferTexture2D(raw.GL_FRAMEBUFFER, attachment, texture.target, texture.gl_texture, 0);

    var status = this.gl.checkFramebufferStatus(raw.GL_FRAMEBUFFER);
    if (status !== raw.GL_FRAMEBUFFER_COMPLETE) {
      console.error("frame buffer status:" + status.toString());
    }

    this.gl.bindTexture(texture.target, null);
    this.gl.bindFramebuffer(raw.GL_FRAMEBUFFER, null);

    return (texture);
  };


  return render_target;


});

raw.webgl.shader = raw.define(function (proto) {

  function shader(vs, fs) {
    this.vs = vs;
    this.fs = fs;
    this.compiled = false;
    this.uuid = raw.guidi();
    this.params = {};
    this.parent = null;
    this.parts = null;
    return (this);
  }


  proto.collect_parts = function (vertex, fragment) {
    if (this.parent !== null) this.parent.collect_parts(vertex, fragment);
    if (this.parts.vertex) vertex.push(this.parts.vertex);
    if (this.parts.fragment) fragment.push(this.parts.fragment);
  };


  proto.extend = function (source, options) {
    return raw.webgl.shader.parse_shader(source, this, options);
  };

  proto.set_uniform = (function () {
    var uni;
    return function (id, value) {
      uni = this.uniforms[id];
      if (uni) {

        uni.params[uni.params.length - 1] = value;
        uni.func.apply(this.gl, uni.params);
        return true;
      }
      return false;
    }
  })();


  shader.chunks = {};
  shader.load_chunks = function (text) {
    var chunks = text.split('/*chunk-');
    chunks.forEach(function (chunk) {
      chunk = chunk.trim();
      if (chunk.length > 0) {
        var name = chunk.substr(0, chunk.indexOf('*/') + 2);
        chunk = chunk.replace(name, '');
        name = name.replace('*/', '');
        shader.chunks[name] = chunk;
      }

    });
  };

  shader.create_chunks_lib = function (text) {
    var lib = {}, name;
    text.split('/*chunk-').forEach(function (chunk) {
      chunk = chunk.trim();
      if (chunk.length > 0) {
        name = chunk.substr(0, chunk.indexOf('*/') + 2);
        chunk = chunk.replace(name, '');
        name = name.replace('*/', '');
        lib[name] = chunk;
      }
    });
    return lib;
  }
  shader.load_chunks(import('shaders/default_chunks.glsl'));

  shader.context_param;
  shader.$str = function (s, nested_chunks) {
    return raw.str(s, "chunk", "param")(nested_chunks ? raw.webgl.shader.nested_get_chunk : raw.webgl.shader.get_chunk,
      raw.webgl.shader.get_param);
  }
  shader.nested_get_chunk = function (key) {
    return raw.webgl.shader.$str(raw.webgl.shader.chunks[key], true);
  }
  shader.get_chunk = function (key) {
    return raw.webgl.shader.chunks[key];
  }

  shader.get_param = function (p) {
    if (raw.webgl.shader.context_param && raw.webgl.shader.context_param[p] !== undefined) return raw.webgl.shader.context_param[p];
    return "";
  }

  shader.compile = (function () {


    function create_shader(gl, src, type) {
      var shdr = gl.createShader(type);
      gl.shaderSource(shdr, src);
      var source = gl.getShaderSource(shdr);

      gl.compileShader(shdr);
      if (!gl.getShaderParameter(shdr, raw.GL_COMPILE_STATUS)) {
        console.log('source', source);
        console.error("Error compiling shader : ", gl.getShaderInfoLog(shdr));
        console.log(src);
        gl.deleteShader(shdr);
        return null;
      }
      return shdr;
    }

    function create_program(gl, vshdr, fshdr, doValidate) {


      var prog = gl.createProgram();
      gl.attachShader(prog, vshdr);
      gl.attachShader(prog, fshdr);

      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, raw.GL_LINK_STATUS)) {
        console.error("Error creating shader program.", gl.getProgramInfoLog(prog));
        gl.deleteProgram(prog); return null;
      }
      if (doValidate) {
        gl.validateProgram(prog);
        if (!gl.getProgramParameter(prog, raw.GL_VALIDATE_STATUS)) {
          console.error("Error validating program", gl.getProgramInfoLog(prog));
          gl.deleteProgram(prog); return null;
        }
      }
      gl.detachShader(prog, vshdr);
      gl.detachShader(prog, fshdr);
      gl.deleteShader(fshdr);
      gl.deleteShader(vshdr);

      return prog;
    }


    var collect_uniforms_and_attributes = (function () {

      var uniforms_write_func = {
        5126: ['uniform1f', 2],//'float',
        35664: ['uniform2fv', 2],// 'vec2',                
        35665: ['uniform3fv', 2], //'vec3',
        35666: ['uniform4fv', 2], //'vec4',
        35678: ['uniform1i', 2], //'sampler2D',
        35680: ['uniform1i', 2], //'samplerCube',
        35675: ['uniformMatrix3fv', 3], //'mat3',
        35676: ['uniformMatrix4fv', 3],//'mat4'
        'float': 5126,
        'vec2': 35664,
        'vec3': 35665,
        'vec4': 35666,
      }


      function add_uniform_to_shader(gl, shdr, name, type) {


        var location = gl.getUniformLocation(shdr.program, name);

        var func = uniforms_write_func[type];
        var uni = {};
        if (func[1] === 3)
          uni.params = [location, false, 0];
        else if (func[1] === 2) {
          uni.params = [location, 0];
        }
        uni.func = gl[func[0]];
        shdr.uniforms[name] = uni;
      }

      return function (gl, shdr) {
        var i = 0, a = 0, info;
        shdr.uniforms = {};
        for (i = 0; i < gl.getProgramParameter(shdr.program, raw.GL_ACTIVE_UNIFORMS); i++) {
          info = gl.getActiveUniform(shdr.program, i);
          if (info.size > 1) {
            for (a = 0; a < info.size; a++) {
              add_uniform_to_shader(gl, shdr, info.name.replace('[0]', '[' + a + ']'), info.type);
            }
          }
          else if (info.size === 1) {
            add_uniform_to_shader(gl, shdr, info.name, info.type);
          }
        }

        shdr.attributes = {};
        shdr.all_attributes = [];


        for (i = 0; i < gl.getProgramParameter(shdr.program, raw.GL_ACTIVE_ATTRIBUTES); i++) {
          info = gl.getActiveAttrib(shdr.program, i);


          shdr.attributes[info.name] = { name: info.name, location: gl.getAttribLocation(shdr.program, info.name) };

          shdr.all_attributes.push(shdr.attributes[info.name]);
        }


      }

    })();

    return function (gl, shdr, _params) {

      if (shdr.compiled) return;
      raw.webgl.shader.context_param = {};
      raw.assign(raw.webgl.shader.context_param, _params);
      raw.assign(raw.webgl.shader.context_param, shdr.params);
      shdr.vs = raw.webgl.shader.$str(shdr.vs, true);
      shdr.fs = raw.webgl.shader.$str(shdr.fs, true);
      shdr.gl = gl;
      var vshdr, fshdr;
      vshdr = create_shader(gl, shdr.vs, raw.GL_VERTEX_SHADER);
      if (!vshdr) return false;
      fshdr = create_shader(gl, shdr.fs, raw.GL_FRAGMENT_SHADER);
      if (!fshdr) { gl.deleteShader(vshdr); return false; }
      shdr.program = create_program(gl, vshdr, fshdr, true);

      gl.useProgram(shdr.program);
      collect_uniforms_and_attributes(gl, shdr);

      gl.useProgram(null);
      shdr.compiled = true;
      return (true);

    }
  })();

  shader.parse_flat = function (_source, params) {
    var source = _source.split('/*--fragment--*/');
    var shader = new raw.webgl.shader(source[0].toString().trim(), source[1].toString().trim());
    shader.source = _source;
    shader.params = params || {};
    return shader;
  };
  

  shader.parse_shader = (function () {
    var functions = ['vertex', 'fragment']
    function parse_shader_source(source) {
      source = source.replace(/\\n/g, '\n');
      var list = [];
      functions.forEach(function (f) {
        list.push({ f: f, i: source.indexOf(f) });
      });
      list.sort(function (a, b) { return a.i - b.i });

      var chars = source.split('');

      function trace_brackets(i) {
        var bc = 1;
        while (bc !== 0 && i < chars.length) {
          if (chars[i] === '{') bc++;
          else if (chars[i] === '}') bc--;
          i++;
        }
        return i;
      }
      function parse_block(m, i1) {
        return source.substr(i1, trace_brackets(source.indexOf(m) + m.length) - i1);
      }

      var i = 0;
      var params = {};
      list.forEach(function (f) {

        var regx = new RegExp('void ' + f.f + '[\\s\\S]*?{', 'ig');

        var m = source.match(regx);
        if (m !== null && m.length > 0) {
          params[f.f] = parse_block(m[0], i);
          i += params[f.f].length;
        }



      });
      return (params);
    }

    function _mm(match, func) {
      if (match !== null) match.forEach(func);
    }

    function get_func(source) {
      var func = {};
      var k = "", dbj = null;
      _mm(source.match(/(\w+ +\w+ *\([^\)]*\) *\{)|(\w+ +\w+ +\w+ *\([^\)]*\) *\{)/g), function (dec) {
        k = dec.replace(/\s+/g, ' ').substr(0, dec.indexOf('(')).trim();
        dbj = { a: k.split(' '), d: dec };
        dbj.f = dbj.a[dbj.a.length - 1];
        func[k] = dbj;
      });
      return func;

    }


    return function (source, parent, options) {
      options = options || {};
      var shader = new raw.webgl.shader(), p = null, part_s = "", part_p = "", rg = null,
        func_s, func_p, f = null, sf = "", sfc = "", dbs, dbp;
                
      shader.parts = parse_shader_source(source);
      shader.level = 0;
      for (p in shader.parts) {
        shader.parts[p] = shader.parts[p].replace(/\r?\n\s+\{|\r\s+\{/g, '\{').replace(/\s+\(/g, '(');
      }

      if (parent) {
        shader.level = parent.level + 1;
        for (p in shader.parts) {
          if (options[p] === false) {
            continue;
          }
          part_s = shader.parts[p];
          part_p = parent.parts[p];
          if (part_p) {
            func_s = get_func(part_s);
            func_p = get_func(part_p);

            for (f in func_s) {
              if (func_p[f]) {
                dbs = func_s[f];
                dbp = func_p[f];
                sf = 'super_' + dbs.f;
                if (shader.level > 1) {
                  sfc = f.replace(dbs.f, sf);

                  part_p = part_p.replace(sfc + '(', sfc + shader.level + '(');
                  part_p = part_p.replace(sf + '(', sf + shader.level + '(');
                  
                  sf = dbp.d.replace(dbp.f, 'super_' + dbp.f);
                  part_p = part_p.replace(dbp.d, sf);


                }
                else {
                  sf = dbp.d.replace(dbp.f, 'super_' + dbp.f);
                  part_p = part_p.replace(dbp.d, sf);
                }

              }
            }

            shader.parts[p] = part_p + part_s;



          }
        }

        shader.parts['vertex'] = shader.parts['vertex'] || parent.parts['vertex'];
        shader.parts['fragment'] = shader.parts['fragment'] || parent.parts['fragment'];
      }



      shader.vs = shader.parts['vertex'] + 'void main(){vertex();}';
      shader.fs = shader.parts['fragment'] + 'void main(){fragment();}';

      shader.parent = parent || null;
      return shader;

    }
  })();


  shader.parse = function (source) {
    return this.parse_shader(source, undefined, true, true);
  };


  return shader;

});
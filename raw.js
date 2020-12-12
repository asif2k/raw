
/*src/base.js*/


var raw = {};

raw.base = {};
raw.guidi = (function () {
  var guidCounter = 0;
  return function () {
    return (Date.now() + guidCounter++);
  }
})();


raw.htlm$ = (function () {
  var _html$ = document.createElement('div');
  var e$;
  return function (html) {
    _html$.innerHTML = html;
    e$ = _html$.firstChild;
    _html$.removeChild(e$);
    return e$;
  }
})();

raw.is_string = function (value) {
  return Object.prototype.toString.call(value) === "[object String]";
}
raw.xml_doc = (function () {

  var _xml = '', _nodeCallback;
  function document() {
    return {
      declaration: declaration(),
      root: tag()
    }
  }


  function declaration() {
    var m = match(/^<\?xml\s*/);
    if (!m) return;

    // tag
    var node = { attr: {} };

    // attributes
    while (!(eos() || is('?>'))) {
      m = match(/([\w:-]+)\s*=\s*("[^"]*"|'[^']*'|\w+)\s*/);
      if (!m) return node;
      node.attr[m[1]] = strip(m[2]);
    }

    match(/\?>\s*/);

    return node;
  }

  function returnNode(node) {
    if (_nodeCallback) _nodeCallback(node);
    return node;
  }
  function tag() {

    var m = match(/^<([\w-:.]+)\s*/);
    if (!m) return;

    var node = {
      name: m[1], attr: {}
    };

    // attributes
    while (!(eos() || is('>') || is('?>') || is('/>'))) {
      m = match(/([\w:-]+)\s*=\s*("[^"]*"|'[^']*'|\w+)\s*/);
      if (!m) return returnNode(node);
      node.attr[m[1]] = strip(m[2]);
    }

    // self closing tag
    if (match(/^\s*\/>\s*/)) {
      return returnNode(node);
    }
    match(/\??>\s*/);
    // content
    node.text = content();

    // children
    var child;
    while (child = tag()) {
      node.children = node.children || [];
      child.parent = node;
      node.children.push(child);
    }

    // closing
    match(/^<\/[\w-:.]+>\s*/);
    return returnNode(node)
  }

  function content() {
    var m = match(/^([^<]*)/);
    if (m) return m[1];
    return '';
  }

  function strip(val) {
    return val.replace(/^['"]|['"]$/g, '');
  }

  function match(re) {
    var m = _xml.match(re);
    if (!m) return;
    _xml = _xml.slice(m[0].length);
    return m;
  }

  function eos() {
    return 0 == _xml.length;
  }

  function is(prefix) {
    return 0 == _xml.indexOf(prefix);
  }
  return function (xml, nodeCallback) {
    // strip comments
    _nodeCallback = nodeCallback;
    _xml = xml.trim().replace(/<!--[\s\S]*?-->/g, '');

    return document();
  }
})();

raw.assign = Object.assign;

raw.define = function (_creator, _super) {

  _super = _super || Object;
  var proto = {};
  Object.assign(proto, _super.prototype);
  var _class = _creator(proto, _super);
  _class.super_class = _super;
  _class.prototype = Object.create(_super.prototype);
  Object.assign(_class.prototype, proto);
  return (_class);
};


raw.array = raw.define(function (proto) {

  proto.push = function (element) {
    this.data[this.length++] = element;
  };
  proto.peek = function () {
    return this.data[this.length - 1];
  };

  proto.pop = function () {
    if (this.length === 0) return null;
    return this.data[--this.length];
  };

  proto.clear = function () {
    this.length = 0;
  };

  proto.for_each = function (cb, self) {
    this.index = 0;
    while (this.index < this.length) {
      cb(this.data[this.index], this.index++, self);
    }
    this.index = 0;
  };

  proto.next = function () {
    if (this.index < this.length) {
      return this.data[this.index++];
    }
    return null;
    
  };
  return function array() {
    this.data = [];
    this.length = 0;
    this.index = 0;
  }
});


raw.merge_object = (function () {
  var key, type;
  var func = function (source, dest, merge_only_not_exist) {
    for (key in source) {
      type = Object.prototype.toString.call(source[key]).toLocaleLowerCase();
      if (type === '[object object]') {
        if (dest[key] !== undefined) func(source[key], dest[key], merge_only_not_exist);
        else if (merge_only_not_exist) {
          dest[key] = {};
          func(source[key], dest[key], merge_only_not_exist);
        }
      }
      else {
        if (merge_only_not_exist) {
          if (dest[key] === undefined) {
            dest[key] = source[key];
          }
        }
        else {
          dest[key] = source[key];
        }
      }
    }
    return dest;
  }
  return func;

})();

raw.url_base = function (url) {

  var index = url.lastIndexOf('/');

  if (index === - 1) { return './'; }

  return url.substr(0, index + 1);

}

raw.merge_typedarray = function (buffer1, buffer2) {
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
}

raw.str = function (str, arg1, arg2, arg3, arg4, arg5) {
  str = "var arr=[];arr.push('" + str
    .replace(/\n/g, "\\n")
    .replace(/[\r\t]/g, " ")
    .split("<?").join("\t")
    .replace(/((^|\?>)[^\t]*)'/g, "$1\r")
    .replace(/\t=(.*?)\?>/g, "',$1,'")
    .split("\t").join("');")
    .split("?>").join("arr.push('")
    .split("\r").join("\\'")
    + "');return arr.join('');";
  return new Function(arg1, arg2, arg3, arg4, arg5, str);
}

raw.each_index = function (callback, index) {
  var func = function (index) {
    callback(index, func);
  };
  func(index || 0);
}

raw.merge_sort = (function (array, comparefn) {
  var i, j, k
  function merge(arr, aux, lo, mid, hi, comparefn) {
    i = lo;
    j = mid + 1;
    k = lo;

    while (true) {
      if (comparefn(arr[i], arr[j]) <= 0) {
        aux[k++] = arr[i++];
        if (i > mid) {
          do
            aux[k++] = arr[j++];
          while (j <= hi);
          break;
        }
      } else {
        aux[k++] = arr[j++];
        if (j > hi) {
          do
            aux[k++] = arr[i++];
          while (i <= mid);
          break;
        }
      }
    }
  }

  function sortarrtoaux(arr, aux, lo, hi, comparefn) {
    if (hi < lo) return;
    if (hi == lo) {
      aux[lo] = arr[lo];
      return;
    }
    var mid = Math.floor(lo + (hi - lo) * 0.5);
    sortarrtoarr(arr, aux, lo, mid, comparefn);
    sortarrtoarr(arr, aux, mid + 1, hi, comparefn);
    merge(arr, aux, lo, mid, hi, comparefn);
  }

  function sortarrtoarr(arr, aux, lo, hi, comparefn) {
    if (hi <= lo) return;
    var mid = Math.floor(lo + (hi - lo) * 0.5);
    sortarrtoaux(arr, aux, lo, mid, comparefn);
    sortarrtoaux(arr, aux, mid + 1, hi, comparefn);
    merge(aux, arr, lo, mid, hi, comparefn);
  }


  var aux = [], ai = 0;;
  function merge_sort(arr, al, comparefn) {
    ai = 0;
    for (i = 0; i < al; i++)
      aux[ai++] = arr[i];

    sortarrtoarr(arr, aux, 0, al - 1, comparefn);
    return arr;
  }



  return merge_sort;
})();

raw.quick_sort_numbers = (function () {

  var swapedElem;
  function sort_desc(arr, leftPos, rightPos, arrLength) {
    var initialLeftPos = leftPos;
    var initialRightPos = rightPos;
    var direction = true;
    var pivot = rightPos;
    while ((leftPos - rightPos) < 0) {
      if (direction) {
        if (arr[pivot] > arr[leftPos]) {
          swapedElem = arr[pivot];
          arr[pivot] = arr[leftPos];
          arr[leftPos] = swapedElem;

          pivot = leftPos;
          rightPos--;
          direction = !direction;
        } else
          leftPos++;
      } else {
        if (arr[pivot] >= arr[rightPos]) {
          rightPos--;
        } else {
          swapedElem = arr[pivot];
          arr[pivot] = arr[rightPos];
          arr[rightPos] = swapedElem;

          leftPos++;
          pivot = rightPos;
          direction = !direction;
        }
      }
    }
    if (pivot - 1 > initialLeftPos) {
      sort_desc(arr, initialLeftPos, pivot - 1, arrLength);
    }
    if (pivot + 1 < initialRightPos) {
      sort_desc(arr, pivot + 1, initialRightPos, arrLength);
    }
  }
  function sort_asc(arr, leftPos, rightPos, arrLength) {
    var initialLeftPos = leftPos;
    var initialRightPos = rightPos;
    var direction = true;
    var pivot = rightPos;
    while ((leftPos - rightPos) < 0) {
      if (direction) {
        if (arr[pivot] < arr[leftPos]) {
          swapedElem = arr[pivot];
          arr[pivot] = arr[leftPos];
          arr[leftPos] = swapedElem;

          pivot = leftPos;
          rightPos--;
          direction = !direction;
        } else
          leftPos++;
      } else {
        if (arr[pivot] <= arr[rightPos]) {
          rightPos--;
        } else {
          swapedElem = arr[pivot];
          arr[pivot] = arr[rightPos];
          arr[rightPos] = swapedElem;

          leftPos++;
          pivot = rightPos;
          direction = !direction;
        }
      }
    }
    if (pivot - 1 > initialLeftPos) {
      sort_asc(arr, initialLeftPos, pivot - 1, arrLength);
    }
    if (pivot + 1 < initialRightPos) {
      sort_asc(arr, pivot + 1, initialRightPos, arrLength);
    }
  }
  return function (arr, arrLength, desc) {
    if (desc)
      sort_desc(arr, 0, arrLength - 1, arrLength);
    else
      sort_asc(arr, 0, arrLength - 1, arrLength);
  }

})();

raw.create_canvas = function (w, h) {
  var temp_canvas = document.createElement('canvas');
  temp_canvas.ctx = temp_canvas.getContext('2d');
  temp_canvas.width = w;
  temp_canvas.height = h;
  temp_canvas.setSize = function (ww, hh) {
    this.width = ww;
    this.height = hh;
  };
  temp_canvas._getImageData = function () {
    this.imd = this.ctx.getImageData(0, 0, this.width, this.height);
    return this.imd;
  };

  temp_canvas._putImageData = function () {
    this.ctx.putImageData(this.imd, 0, 0);
  };

  return (temp_canvas);
}




raw.worker = (function () {

  return function (func, libs) {

    var worker = new Worker(window.URL.createObjectURL(new Blob([
      (libs || []).join(';') + ';self.main=' + func.toString() + ';self.main(self);'])));

    return (worker);
  }

}());


raw.map_typedarray = (function () {

  var item_size = 0, total_groups = 0, i = 0, constructor, constructors = {};

  function set_constructor(c) {
    constructors['[object ' + c.name.toLowerCase() + ']'] = c;
  }
  set_constructor(Float32Array);
  set_constructor(Int32Array);
  set_constructor(Int16Array);
  set_constructor(Uint32Array);
  set_constructor(Uint16Array);
  set_constructor(Uint8Array);

  return function (arr, group_size, groups) {
    groups = groups || [];

    groups.length = 0;


    constructor = constructors[Object.prototype.toString.call(arr).toLowerCase()];

    if (!constructor) {
      console.error('invalid constructor', Object.prototype.toString.call(arr));
    }
    total_groups = arr.length / group_size;
    item_size = arr.byteLength / arr.length;


    for (i = 0; i < total_groups; i++) {
      groups[i] = new constructors(arr.buffer, ((i * group_size) * item_size), group_size);
    }

    return groups;

  }

}());



raw.queue = raw.define(function (proto) {

  proto.size = function () {
    return this._newestIndex - this._oldestIndex;
  };
  proto.enqueue = function (data) {
    this._storage[this._newestIndex] = data;
    this._newestIndex++;
  };

  var deletedData;
  proto.dequeue = function () {
    if (this._oldestIndex !== this._newestIndex) {
      deletedData = this._storage[this._oldestIndex];
      this._storage[this._oldestIndex] = undefined;
      this._oldestIndex++;
      return deletedData;
    }
  };


  return function queue () {
    this._oldestIndex = 1;
    this._newestIndex = 1;
    this._storage = {};
  }

});


raw.load_working_url = (function () {
  var parking = new raw.queue();
  var xtp = new XMLHttpRequest;
  function process(url, t, cb) {
    if (xtp.isBusy) {
      parking.enqueue([url, t, cb]);
      return;
    }
    xtp.onload = function () {
      if (cb) cb(this.response);
      this.abort();
      this.isBusy = false;
      if (parking.size() > 0) {
        process.apply(this, parking.dequeue());
      }
    };
    xtp.responseType = t;
    xtp.isBusy = true;
    xtp.open("GET", url, !0);
    xtp.send();
  }

  return process;

})();


raw.load_working_image = (function () {
  var parking = new raw.queue();
  var img = new Image();
  img.crossOrigin = "Anonymous";
  var canv = raw.create_canvas(1, 1);
  img.is_busy = false;
  function process(url, cb) {
    if (img.is_busy) {
      parking.enqueue([url, cb]);
      return;
    }
    img.onload = function () {            
      if (cb) cb(this);      
      this.is_busy = false;
      if (parking.size() > 0) {
        process.apply(this, parking.dequeue());
      }
    };    
    img.is_busy = true;
    img.src = url;
    
  }

  return process;

})();


raw.load_working_image_data = (function () {
  var parking = new raw.queue();
  var img = new Image();
  img.crossOrigin = "Anonymous";
  var canv = raw.create_canvas(1, 1);
  img.is_busy = false;
  function process(url, cb, w, h) {
    if (img.is_busy) {
      parking.enqueue([url, cb, w, h]);
      return;
    }
    img.onload = function () {
      canv.setSize(w || this.width, h || this.height);
      canv.ctx.drawImage(this, 0, 0, canv.width, canv.height);
      if (cb) cb(canv._getImageData().data, canv.width, canv.height, this);
      canv._putImageData();
      this.is_busy = false;
      if (parking.size() > 0) {
        process.apply(this, parking.dequeue());
      }
    };
    img.is_busy = true;
    img.src = url;

  }

  return process;

})();


raw.bulk_image_loader = raw.define(function (proto) {


  var img;

  proto.load = function (url, params) {
    img = this.get();
    if (img === null) {
      this.park.enqueue([url, params]);
      return;
    }
    img.onload = function () {
      this.manager.onload(this, params);
      if (this.manager.auto_free) this.manager.free(this);
    };

    img.src = url;

  };

  proto.get = function () {
    if (this.pool.length > 0) {
      return this.pool.pop();

    }
    if (this.used < this.pool_size) {
      this.used++;
      img = new Image();
      img.crossOrigin = "Anonymous";
      img.manager = this;
      return img
    }
    return null;
  }
  proto.free = function (img) {
    this.pool.push(img);
    if (this.park.size() > 0) {
      this.load.apply(this, this.park.dequeue());
    }


  };


  return function (pool_size) {
    this.park = new raw.queue();
    this.pool = [];
    this.pool_size = pool_size;
    this.used = 0;
    this.auto_free = true;
    return this;
  }




});



raw.url_loader = (function () {
  var parking = new raw.queue();
  var xtp = new XMLHttpRequest;
  function process(url, t, cb, params) {
    if (xtp.isBusy) {
      parking.enqueue([url, t, cb, params]);
      return;
    }

    xtp.onload = function () {
      if (cb) cb(this, params);
      this.isBusy = false;
      if (parking.size() > 0) {
        process.apply(this, parking.dequeue());
      }
    };
    xtp.responseType = t;
    xtp.isBusy = true;
    xtp.open("GET", url, !0);
    xtp.send();
  }

  return process;

})();


raw.object_pooler = raw.define(function (proto) {

  proto.get = function (params) {
    if (this.data.length > 0) return this.data.pop();
    this.allocated++;
    return this.creator(params);
  };
  proto.free = function (obj) {
    this.data.push(obj);
  };
  return function object_pooler(creator) {
    this.creator = creator;
    this.allocated = 0;
    this.data = new raw.array();
  };
});

raw.for_each = (function () {
  Array.prototype.for_each = function (cb, base) {
    this.forEach(function (a, i) {
      cb(a, i, base);
    });
  }
  return function (arr, cb, base) {  
    for (var i = 0; i < arr.length; i++) {
      cb(arr[i], i, base);
    }
  }
})();


raw.dictionary = raw.define(function (proto) {

  proto.set = function (key, obj) {
    if (!this.data[key]) this.keys.push(key);
    this.data[key] = obj;
  };
  proto.get = function (key) {
    return this.data[key];
  };

  proto.exist = function (key) {
    return this.data[key] !== undefined;
  }
  
  return function dictionary() {
    this.keys = new raw.array();
    this.data = {};
  };
});

raw.event = raw.define(function (proto) {  
  proto.add = function (cb, callee) {
    callee = callee || this.owner;
    this.handlers[this.handlers.length] = [cb, callee];    
  };
  var i = 0;
  proto.trigger = function (params) {
    for (i = 0; i < this.handlers.length; i++)
      this.handlers[i][0].apply(this.handlers[i][1], params);
  };

  return function event(owner,params) {
    this.owner = owner;
    this.handlers = [];
    this.params = params;
  };
});

raw.create_float32 = (function (len, creator) {
  creator = creator || function (out) {
    return out;
  }
  var x = 0;
  return function () {
    var out = creator(new Float32Array(len));
    if (arguments.length === 1 && arguments[0].length > 0) {
      for (x = 0; x < arguments[0].length; x++)
        if (x < len) out[x] = arguments[0][x];
    }
    else {
      for (x = 0; x < arguments.length; x++)
        if (x < len) out[x] = arguments[x];
    }
    return out;
  }
});

raw.base64_to_binary = (function () {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var lookup = new Uint8Array(130);
  for (var i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  var len;
  return function (input, char_start) {
    len = input.length - char_start;
    if (input.charAt(len - 1) === '=') { len--; }
    if (input.charAt(len - 1) === '=') { len--; }
    var uarray = new Uint8Array((len / 4) * 3);
    for (var i = 0, j = char_start; i < uarray.length;) {
      var c1 = lookup[input.charCodeAt(j++)];
      var c2 = lookup[input.charCodeAt(j++)];
      var c3 = lookup[input.charCodeAt(j++)];
      var c4 = lookup[input.charCodeAt(j++)];
      uarray[i++] = (c1 << 2) | (c2 >> 4);
      uarray[i++] = ((c2 & 15) << 4) | (c3 >> 2);
      uarray[i++] = ((c3 & 3) << 6) | c4;
    }
    return uarray.buffer;
  }
})();


raw.binary_reader = raw.define(function (proto) {

  raw.assign(proto, {
    get_offset: function () {
      return this.offset;
    },

    size: function () {
      return this.dv.buffer.byteLength;
    },
    skip: function (length) {
      this.offset += length;
    },
    get_boolean: function () {
      return (this.get_uint8() & 1) === 1;
    },

    get_boolean_array: function (size) {
      var a = [];
      for (var i = 0; i < size; i++) {
        a.push(this.get_boolean());
      }
      return a;
    },

    get_uint8: function () {
      var value = this.dv.getUint8(this.offset);
      this.offset += 1;
      return value;
    },
    get_int16: function () {

      var value = this.dv.getInt16(this.offset, this.little_endian);
      this.offset += 2;
      return value;

    },



    get_int32: function () {
      var value = this.dv.getInt32(this.offset, this.little_endian);
      this.offset += 4;
      return value;
    },

    get_int32_array: function (size) {
      var a = [];
      for (var i = 0; i < size; i++) {
        a.push(this.get_int32());
      }
      return a;
    },

    get_uint32: function () {
      var value = this.dv.getUint32(this.offset, this.little_endian);
      this.offset += 4;
      return value;
    },

    get_int64: function () {
      var low, high;
      if (this.little_endian) {
        low = this.get_uint32();
        high = this.get_uint32();
      } else {
        high = this.get_uint32();
        low = this.get_uint32();
      }
      // calculate negative value

      if (high & 0x80000000) {
        high = ~high & 0xFFFFFFFF;
        low = ~low & 0xFFFFFFFF;

        if (low === 0xFFFFFFFF) high = (high + 1) & 0xFFFFFFFF;

        low = (low + 1) & 0xFFFFFFFF;
        return - (high * 0x100000000 + low);
      }
      return high * 0x100000000 + low;

    },

    get_int64_array: function (size) {
      var a = [];
      for (var i = 0; i < size; i++) {
        a.push(this.get_int64());
      }
      return a;
    },

    // Note: see getInt64() comment
    get_uint64: function () {
      var low, high;
      if (this.little_endian) {
        low = this.get_uint32();
        high = this.get_uint32();
      } else {
        high = this.get_uint32();
        low = this.get_uint32();
      }
      return high * 0x100000000 + low;
    },

    get_float32: function () {
      var value = this.dv.getFloat32(this.offset, this.little_endian);
      this.offset += 4;
      return value;
    },

    get_float32_array: function (size) {
      var a = [];
      for (var i = 0; i < size; i++) {
        a.push(this.get_float32());
      }
      return a;
    },

    get_float64: function () {
      var value = this.dv.getFloat64(this.offset, this.little_endian);
      this.offset += 8;
      return value;
    },

    get_float64_array: function (size) {
      var a = [];
      for (var i = 0; i < size; i++) {
        a.push(this.get_float64());
      }
      return a;
    },

    get_array_buffer: function (size) {
      var value = this.dv.buffer.slice(this.offset, this.offset + size);
      this.offset += size;
      return value;
    },

    get_string: function (size) {
      // note: safari 9 doesn't support Uint8Array.indexOf; create intermediate array instead
      var a = [];
      for (var i = 0; i < size; i++) {
        a[i] = this.get_uint8();
      }

      var nullByte = a.indexOf(0);
      if (nullByte >= 0) a = a.slice(0, nullByte);

      var s = '';
      for (i = 0; i < a.length; i++) {
        // Implicitly assumes little-endian.
        s += String.fromCharCode(a[i]);
      }

      try {
        // merges multi-byte utf-8 characters.
        return decodeURIComponent(escape(s));
      } catch (e) { // see #16358
        return s;
      }

    }


  });

  return function (buffer, little_endian) {
    this.dv = new DataView(buffer);
    this.offset = 0;
    this.little_endian = (little_endian !== undefined) ? little_endian : true;
  }
});



raw.linked_list = raw.define(function (proto) {

  var items = new raw.object_pooler(function () {
    return { next: null, prev: null, data: null };
  });

  var item = null;

  proto.add_item = function (item) {
    item.prev = this.tail;
    item.next = null;
    if (this.head === null) this.head = item;
    if (this.tail !== null) {
      this.tail.next = item;
    }
    this.tail = item;    
    return this.tail;
  }
  proto.create_item = function (data) {
    item = items.get();
    item.data = data;
    return item;
  }

  proto.add_data = function (data) {    
    this.add_item(this.create_item(data));
    item = null;
    return this.tail;
  };
  proto.insert_after = function (item, prev_item) {
    if (prev_item.next !== null) {
      prev_item.next.prev = item;
      item.next = prev_item.next;
    }
    prev_item.next = item;
    item.prev = prev_item;

    return item;
  };


  proto.remove_item = function (item,save_free) {
    if (item.prev !== null) {
      item.prev.next = item.next;
      if (item.next === null) {
        this.tail = item.prev;
      }
    }
    else if (item.next !== null) {
      this.head = item.next;
      item.next.prev = null;
    }
    item.data = null;
    item.next = null;
    item.prev = null;
    if (save_free) items.free(item);
    return item;
  };

  proto.fetch_next = function (item) {
    if (item === null) return this.head;
    return item.next;
  }

  function linked_list() {
    this.head = null;
    this.tail = null;
  }
  linked_list.items = items;

  return linked_list;
});



raw.flags_setting = raw.define(function (proto) {

  raw.set_flag = function (flags, flag) {
    if (!(flags & flag)) {
      flags |= flag;
    }
    return flags;
  };

  raw.unset_flag = function (flags, flag) {
    if ((flags & flag) !== 0) {
      flags &= ~flag;
    }
    return flags;
  };

  proto.set_flag = function (flag) {
    if (!(this.flags & flag)) {
      this.flags |= flag;
    }
    return (this);
  };

  proto.unset_flag = function (flag) {
    if ((this.flags & flag) !== 0) {
      this.flags &= ~flag;
    }
    return (this);
  };
  return function flags_setting() {
    this.flags = 0;
  }

});


raw.fps_timer = raw.define(function (proto) {  

 

  proto.invalidate_loop = function () {
    this.loop_cb_time = this.current_timer - this.loop_cb_interval;
  };
  proto.loop = function (cb, interval) {
    var _this = this;
    interval = interval || 1 / 60;
    _this.is_working = true;
    var args = [null, null];

    
    _this.fps_counter = 0;
    _this.fps_timer = 0;
    _this.fps = 0;
    _this.current_timer = 0;
    _this.current_timer = performance.now() * 0.001;
    _this.loop_cb_time = _this.current_timer - interval;
    _this.loop_cb_interval = interval;
    _this.time_delta = 0;

    var timer_callback = function () {
      _this.current_timer = performance.now() * 0.001;

      _this.time_delta = _this.current_timer - _this.loop_cb_time;
      if (_this.time_delta >= _this.loop_cb_interval) {
        args[0] = _this.time_delta;
        args[1] = _this.current_timer;
        if (_this.current_timer - _this.fps_timer > 1) {
          _this.fps = _this.fps_counter;
          _this.fps_timer = _this.current_timer - (_this.time_delta % _this.loop_cb_interval);
          _this.fps_counter = 0;
        }        
        cb.apply(_this, args);
        _this.fps_counter++;
        _this.loop_cb_time = _this.current_timer - (_this.time_delta % _this.loop_cb_interval);

      }
      if (_this.is_working) requestAnimationFrame(timer_callback);
    }
    timer_callback();
  };
  return function fps_timer() {
    this.is_working = false;
  };
});


raw.mouse_input = raw.define(function (proto) {

  function mouse_input(elm) {
    this.elm = elm;
    var _this = this;

    //const rect = canvas.getBoundingClientRect();
    //const x = e.clientX - rect.left;
    //const y = e.clientY - rect.top;

    _this.mouse_wheel = function (sp, e) { };

    _this.mouse_down = _this.mouse_click =_this.mouse_up = _this.mouse_move = function (x, y, e) { };
    _this.mouse_drage = function (dx, dy, e) { };
    _this.mouse_drage2 = function (dx, dy, e) { };

    _this.elm.addEventListener((/Firefox/i.test(navigator.userAgent)) ? "DOMMouseScroll" : "mousewheel", function (e) {
      _this.mouse_wheel(e.detail ? e.detail * (-120) : e.wheelDelta, e);
    }, false);

    var x = 0, y = 0, rect = null;
    _this.elm.addEventListener('mousedown', function (e) {
      rect = _this.elm.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
      _this.elm_width = rect.right - rect.left;
      _this.elm_height = rect.bottom - rect.top;

      _this.mouse_down_x = x;
      _this.mouse_down_y = y;
      _this.mouse_down(_this.mouse_down_x, _this.mouse_down_x, e);
    });
    _this.elm.addEventListener('click', function (e) {      
      _this.mouse_click(_this.mouse_x, _this.mouse_y, e);
    });
    _this.elm.addEventListener('mouseup', function (e) {
      _this.mouse_up(_this.mouse_x, _this.mouse_y, e);
    });



    _this.elm.addEventListener('mousemove', function (e) {
      rect = _this.elm.getBoundingClientRect();
       x = e.clientX - rect.left;
      y = e.clientY - rect.top;

      _this.elm_width = rect.right - rect.left;
      _this.elm_height = rect.bottom - rect.top;

      _this.mouse_buttons = e.buttons;
      _this.mouse_x = x;
      _this.mouse_y = y;
      _this.mouse_draging = false;
      _this.mouse_move(_this.mouse_x, _this.mouse_y, e);
      
      if (e.buttons == 1) {
        _this.mouse_down_x = _this.mouse_down_x || x;
        _this.mouse_down_y = _this.mouse_down_y || y;

        
        _this.mouse_dx = (x - _this.mouse_down_x);
        _this.mouse_dy = (y - _this.mouse_down_y);
        _this.mouse_drage(_this.mouse_dx, _this.mouse_dy, e);
        _this.mouse_down_x = x;
        _this.mouse_down_y = y;
        _this.mouse_draging = true;
        
      }
      else if (e.buttons == 2) {
        _this.mouse_down_x = _this.mouse_down_x || x;
        _this.mouse_down_y = _this.mouse_down_y || y;

        _this.mouse_draging = true;
        _this.mouse_dx = (x - _this.mouse_down_x);
        _this.mouse_dy = (y - _this.mouse_down_y);
        _this.mouse_drage2(_this.mouse_dx, _this.mouse_dy, e);
        _this.mouse_down_x =x;
        _this.mouse_down_y =y;
      }
    });
  };


  mouse_input.disable_right_click = function () {
    document.addEventListener('contextmenu', function (event) {
      event.preventDefault();
    });
  };

  return mouse_input;

});



raw.memory_block = raw.define(function (proto) {

  var rsize = 0, i = 0, mem;

  proto.resize = function (new_size) {
    mem = new Int16Array(new_size / 2);
    for (i = 0; i < this.memory.length; i++) {
      mem[i] = this.memory[i];
    }
    this.memory = mem;

  };

  proto.alloc = function (size) {
    this.memory = new Float32Array(size / 4);
  };

  var __mmm, _x, _y;
  proto.float32 = function () {
    if (arguments.length === 1 && arguments[0] && arguments[0].length > 1) {
      _y = arguments[0];
      _x = _y.length;
    }
    else if (arguments.length > 1) {
      _y = arguments;
      _x = _y.length;
    }
    else {
      _x = arguments[0];
      _y = false;
    }
    this.byte_length += _x * 4;
    if (this.byte_length > this.memory.byteLength - 1) this.resize(this.byte_length);
    __mmm = new Float32Array(this.memory.buffer, this.byte_length - (_x * 4), _x);

    if (_y) {
      for (_x = 0; _x < _y.length; _x++) {
        __mmm[_x] = _y[_x];
      }
    }


    return __mmm
  }

  proto.mat4 = function () {
    if (!arguments[0]) return raw.math.mat4.identity(this.float32(16));
    return this.float32.apply(this, arguments);
  };
  proto.mat3 = function () {
    if (!arguments[0]) return raw.math.mat3.identity(this.float32(9));
    return this.float32.apply(this, arguments);
  };



  proto.quat = function () {
    if (!arguments[0]) return raw.math.quat.identity(this.float32(4));
    return this.float32.apply(this, arguments);

  };
  proto.dquat = function () {
    if (!arguments[0]) return raw.math.quat.identity(this.float32(8));
    return this.float32.apply(this, arguments);

  };

  proto.vec3 = function () {
    if (!arguments[0]) return this.float32(3);
    return this.float32.apply(this, arguments);
  };
  proto.vec4 = function () {
    if (!arguments[0]) return this.float32(4);
    return this.float32.apply(this, arguments);
  };





  return function memory_block(initial_size) {
    this.memory = new Float32Array(initial_size / 4);
    this.memory.fill(0);
    this.byte_length = 0;

  }

});



/*src/constants.js*/

raw.assign(raw, {
  SHADING: {
    FLAT: 2,
    SHADED: 4,
    CAST_SHADOW: 8,
    RECEIVE_SHADOW: 16,
    SINGLE_LIGHT: 32,
    RECEIVE_REFLECTION: 64,
    TRANSPARENT: 128,
    OPUQUE: 256,
    DEPTH_TEST: 512,
    NO_DEPTH_TEST: 1024,
    DOUBLE_SIDES: 2048,
    SHADOW_DOUBLE_SIDES: 4096,
    PICKABLE: 8192,
  },

  DISPLAY_ALWAYS: 1,
  ITEM_TYPES: {
    MESH: 2,
    LIGHT: 4,
    CAMERA: 8,
    MANIPULATOR:16,
    OTHER: 1024
  },

  TRANS: {
    SCALABLE: 2,
    ANIMATED: 4,
    ANIMATED_POSITION: 8,
    ANIMATED_SCALE: 16,
    ANIMATED_ROTATION: 32,
    IK_ANIMATED: 64,
  },
  math: {
    DEGTORAD: 0.017453292519943295,
    RADTODEG: 57.295779513082323
  }

});

raw.assign(raw, {
  GL_ACTIVE_ATTRIBUTES: 35721,
  GL_ACTIVE_TEXTURE: 34016,
  GL_ACTIVE_UNIFORMS: 35718,
  GL_ALIASED_LINE_WIDTH_RANGE: 33902,
  GL_ALIASED_POINT_SIZE_RANGE: 33901,
  GL_ALPHA: 6406,
  GL_ALPHA_BITS: 3413,
  GL_ALWAYS: 519,
  GL_ARRAY_BUFFER: 34962,
  GL_ARRAY_BUFFER_BINDING: 34964,
  GL_ATTACHED_SHADERS: 35717,
  GL_BACK: 1029,
  GL_BLEND: 3042,
  GL_BLEND_COLOR: 32773,
  GL_BLEND_DST_ALPHA: 32970,
  GL_BLEND_DST_RGB: 32968,
  GL_BLEND_EQUATION: 32777,
  GL_BLEND_EQUATION_ALPHA: 34877,
  GL_BLEND_EQUATION_RGB: 32777,
  GL_BLEND_SRC_ALPHA: 32971,
  GL_BLEND_SRC_RGB: 32969,
  GL_BLUE_BITS: 3412,
  GL_BOOL: 35670,
  GL_BOOL_VEC2: 35671,
  GL_BOOL_VEC3: 35672,
  GL_BOOL_VEC4: 35673,
  GL_BROWSER_DEFAULT_WEBGL: 37444,
  GL_BUFFER_SIZE: 34660,
  GL_BUFFER_USAGE: 34661,
  GL_BYTE: 5120,
  GL_CCW: 2305,
  GL_CLAMP_TO_EDGE: 33071,
  GL_COLOR_ATTACHMENT0: 36064,
  GL_COLOR_BUFFER_BIT: 16384,
  GL_COLOR_CLEAR_VALUE: 3106,
  GL_COLOR_WRITEMASK: 3107,
  GL_COMPILE_STATUS: 35713,
  GL_COMPRESSED_TEXTURE_FORMATS: 34467,
  GL_CONSTANT_ALPHA: 32771,
  GL_CONSTANT_COLOR: 32769,
  GL_CONTEXT_LOST_WEBGL: 37442,
  GL_CULL_FACE: 2884,
  GL_CULL_FACE_MODE: 2885,
  GL_CURRENT_PROGRAM: 35725,
  GL_CURRENT_VERTEX_ATTRIB: 34342,
  GL_CW: 2304,
  GL_DECR: 7683,
  GL_DECR_WRAP: 34056,
  GL_DELETE_STATUS: 35712,
  GL_DEPTH_ATTACHMENT: 36096,
  GL_DEPTH_BITS: 3414,
  GL_DEPTH_BUFFER_BIT: 256,
  GL_DEPTH_CLEAR_VALUE: 2931,
  GL_DEPTH_COMPONENT: 6402,
  GL_DEPTH_COMPONENT16: 33189,
  GL_DEPTH_FUNC: 2932,
  GL_DEPTH_RANGE: 2928,
  GL_DEPTH_STENCIL: 34041,
  GL_DEPTH_STENCIL_ATTACHMENT: 33306,
  GL_DEPTH_TEST: 2929,
  GL_DEPTH_WRITEMASK: 2930,
  GL_DITHER: 3024,
  GL_DONT_CARE: 4352,
  GL_DST_ALPHA: 772,
  GL_DST_COLOR: 774,
  GL_DYNAMIC_DRAW: 35048,
  GL_ELEMENT_ARRAY_BUFFER: 34963,
  GL_ELEMENT_ARRAY_BUFFER_BINDING: 34965,
  GL_EQUAL: 514,
  GL_FASTEST: 4353,
  GL_FLOAT: 5126,
  GL_FLOAT_MAT2: 35674,
  GL_FLOAT_MAT3: 35675,
  GL_FLOAT_MAT4: 35676,
  GL_FLOAT_VEC2: 35664,
  GL_FLOAT_VEC3: 35665,
  GL_FLOAT_VEC4: 35666,
  GL_FRAGMENT_SHADER: 35632,
  GL_FRAMEBUFFER: 36160,
  GL_FRAMEBUFFER_ATTACHMENT_OBJECT_NAME: 36049,
  GL_FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE: 36048,
  GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE: 36051,
  GL_FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL: 36050,
  GL_FRAMEBUFFER_BINDING: 36006,
  GL_FRAMEBUFFER_COMPLETE: 36053,
  GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT: 36054,
  GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS: 36057,
  GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: 36055,
  GL_FRAMEBUFFER_UNSUPPORTED: 36061,
  GL_FRONT: 1028,
  GL_FRONT_AND_BACK: 1032,
  GL_FRONT_FACE: 2886,
  GL_FUNC_ADD: 32774,
  GL_FUNC_REVERSE_SUBTRACT: 32779,
  GL_FUNC_SUBTRACT: 32778,
  GL_GENERATE_MIPMAP_HINT: 33170,
  GL_GEQUAL: 518,
  GL_GREATER: 516,
  GL_GREEN_BITS: 3411,
  GL_HIGH_FLOAT: 36338,
  GL_HIGH_INT: 36341,
  GL_IMPLEMENTATION_COLOR_READ_FORMAT: 35739,
  GL_IMPLEMENTATION_COLOR_READ_TYPE: 35738,
  GL_INCR: 7682,
  GL_INCR_WRAP: 34055,
  GL_INT: 5124,
  GL_INT_VEC2: 35667,
  GL_INT_VEC3: 35668,
  GL_INT_VEC4: 35669,
  GL_INVALID_ENUM: 1280,
  GL_INVALID_FRAMEBUFFER_OPERATION: 1286,
  GL_INVALID_OPERATION: 1282,
  GL_INVALID_VALUE: 1281,
  GL_INVERT: 5386,
  GL_KEEP: 7680,
  GL_LEQUAL: 515,
  GL_LESS: 513,
  GL_LINEAR: 9729,
  GL_LINEAR_MIPMAP_LINEAR: 9987,
  GL_LINEAR_MIPMAP_NEAREST: 9985,
  GL_LINES: 1,
  GL_LINE_LOOP: 2,
  GL_LINE_STRIP: 3,
  GL_LINE_WIDTH: 2849,
  GL_LINK_STATUS: 35714,
  GL_LOW_FLOAT: 36336,
  GL_LOW_INT: 36339,
  GL_LUMINANCE: 6409,
  GL_LUMINANCE_ALPHA: 6410,
  GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS: 35661,
  GL_MAX_CUBE_MAP_TEXTURE_SIZE: 34076,
  GL_MAX_FRAGMENT_UNIFORM_VECTORS: 36349,
  GL_MAX_RENDERBUFFER_SIZE: 34024,
  GL_MAX_TEXTURE_IMAGE_UNITS: 34930,
  GL_MAX_TEXTURE_SIZE: 3379,
  GL_MAX_VARYING_VECTORS: 36348,
  GL_MAX_VERTEX_ATTRIBS: 34921,
  GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS: 35660,
  GL_MAX_VERTEX_UNIFORM_VECTORS: 36347,
  GL_MAX_VIEWPORT_DIMS: 3386,
  GL_MEDIUM_FLOAT: 36337,
  GL_MEDIUM_INT: 36340,
  GL_MIRRORED_REPEAT: 33648,
  GL_NEAREST: 9728,
  GL_NEAREST_MIPMAP_LINEAR: 9986,
  GL_NEAREST_MIPMAP_NEAREST: 9984,
  GL_NEVER: 512,
  GL_NICEST: 4354,
  GL_NONE: 0,
  GL_NOTEQUAL: 517,
  GL_NO_ERROR: 0,
  GL_ONE: 1,
  GL_ONE_MINUS_CONSTANT_ALPHA: 32772,
  GL_ONE_MINUS_CONSTANT_COLOR: 32770,
  GL_ONE_MINUS_DST_ALPHA: 773,
  GL_ONE_MINUS_DST_COLOR: 775,
  GL_ONE_MINUS_SRC_ALPHA: 771,
  GL_ONE_MINUS_SRC_COLOR: 769,
  GL_OUT_OF_MEMORY: 1285,
  GL_PACK_ALIGNMENT: 3333,
  GL_POINTS: 0,
  GL_POLYGON_OFFSET_FACTOR: 32824,
  GL_POLYGON_OFFSET_FILL: 32823,
  GL_POLYGON_OFFSET_UNITS: 10752,
  GL_RED_BITS: 3410,
  GL_RENDERBUFFER: 36161,
  GL_RENDERBUFFER_ALPHA_SIZE: 36179,
  GL_RENDERBUFFER_BINDING: 36007,
  GL_RENDERBUFFER_BLUE_SIZE: 36178,
  GL_RENDERBUFFER_DEPTH_SIZE: 36180,
  GL_RENDERBUFFER_GREEN_SIZE: 36177,
  GL_RENDERBUFFER_HEIGHT: 36163,
  GL_RENDERBUFFER_INTERNAL_FORMAT: 36164,
  GL_RENDERBUFFER_RED_SIZE: 36176,
  GL_RENDERBUFFER_STENCIL_SIZE: 36181,
  GL_RENDERBUFFER_WIDTH: 36162,
  GL_RENDERER: 7937,
  GL_REPEAT: 10497,
  GL_REPLACE: 7681,
  GL_RGB: 6407,
  GL_RGB5_A1: 32855,
  GL_RGB565: 36194,
  GL_RGBA: 6408,
  GL_RGBA4: 32854,
  GL_SAMPLER_2D: 35678,
  GL_SAMPLER_CUBE: 35680,
  GL_SAMPLES: 32937,
  GL_SAMPLE_ALPHA_TO_COVERAGE: 32926,
  GL_SAMPLE_BUFFERS: 32936,
  GL_SAMPLE_COVERAGE: 32928,
  GL_SAMPLE_COVERAGE_INVERT: 32939,
  GL_SAMPLE_COVERAGE_VALUE: 32938,
  GL_SCISSOR_BOX: 3088,
  GL_SCISSOR_TEST: 3089,
  GL_SHADER_TYPE: 35663,
  GL_SHADING_LANGUAGE_VERSION: 35724,
  GL_SHORT: 5122,
  GL_SRC_ALPHA: 770,
  GL_SRC_ALPHA_SATURATE: 776,
  GL_SRC_COLOR: 768,
  GL_STATIC_DRAW: 35044,
  GL_STENCIL_ATTACHMENT: 36128,
  GL_STENCIL_BACK_FAIL: 34817,
  GL_STENCIL_BACK_FUNC: 34816,
  GL_STENCIL_BACK_PASS_DEPTH_FAIL: 34818,
  GL_STENCIL_BACK_PASS_DEPTH_PASS: 34819,
  GL_STENCIL_BACK_REF: 36003,
  GL_STENCIL_BACK_VALUE_MASK: 36004,
  GL_STENCIL_BACK_WRITEMASK: 36005,
  GL_STENCIL_BITS: 3415,
  GL_STENCIL_BUFFER_BIT: 1024,
  GL_STENCIL_CLEAR_VALUE: 2961,
  GL_STENCIL_FAIL: 2964,
  GL_STENCIL_FUNC: 2962,
  GL_STENCIL_INDEX8: 36168,
  GL_STENCIL_PASS_DEPTH_FAIL: 2965,
  GL_STENCIL_PASS_DEPTH_PASS: 2966,
  GL_STENCIL_REF: 2967,
  GL_STENCIL_TEST: 2960,
  GL_STENCIL_VALUE_MASK: 2963,
  GL_STENCIL_WRITEMASK: 2968,
  GL_STREAM_DRAW: 35040,
  GL_SUBPIXEL_BITS: 3408,
  GL_TEXTURE: 5890,
  GL_TEXTURE0: 33984,
  GL_TEXTURE1: 33985,
  GL_TEXTURE2: 33986,
  GL_TEXTURE3: 33987,
  GL_TEXTURE4: 33988,
  GL_TEXTURE5: 33989,
  GL_TEXTURE6: 33990,
  GL_TEXTURE7: 33991,
  GL_TEXTURE8: 33992,
  GL_TEXTURE9: 33993,
  GL_TEXTURE10: 33994,
  GL_TEXTURE11: 33995,
  GL_TEXTURE12: 33996,
  GL_TEXTURE13: 33997,
  GL_TEXTURE14: 33998,
  GL_TEXTURE15: 33999,
  GL_TEXTURE16: 34000,
  GL_TEXTURE17: 34001,
  GL_TEXTURE18: 34002,
  GL_TEXTURE19: 34003,
  GL_TEXTURE20: 34004,
  GL_TEXTURE21: 34005,
  GL_TEXTURE22: 34006,
  GL_TEXTURE23: 34007,
  GL_TEXTURE24: 34008,
  GL_TEXTURE25: 34009,
  GL_TEXTURE26: 34010,
  GL_TEXTURE27: 34011,
  GL_TEXTURE28: 34012,
  GL_TEXTURE29: 34013,
  GL_TEXTURE30: 34014,
  GL_TEXTURE31: 34015,
  GL_TEXTURE_2D: 3553,
  GL_TEXTURE_BINDING_2D: 32873,
  GL_TEXTURE_BINDING_CUBE_MAP: 34068,
  GL_TEXTURE_CUBE_MAP: 34067,
  GL_TEXTURE_CUBE_MAP_NEGATIVE_X: 34070,
  GL_TEXTURE_CUBE_MAP_NEGATIVE_Y: 34072,
  GL_TEXTURE_CUBE_MAP_NEGATIVE_Z: 34074,
  GL_TEXTURE_CUBE_MAP_POSITIVE_X: 34069,
  GL_TEXTURE_CUBE_MAP_POSITIVE_Y: 34071,
  GL_TEXTURE_CUBE_MAP_POSITIVE_Z: 34073,
  GL_TEXTURE_MAG_FILTER: 10240,
  GL_TEXTURE_MIN_FILTER: 10241,
  GL_TEXTURE_WRAP_S: 10242,
  GL_TEXTURE_WRAP_T: 10243,
  GL_TRIANGLES: 4,
  GL_TRIANGLE_FAN: 6,
  GL_TRIANGLE_STRIP: 5,
  GL_UNPACK_ALIGNMENT: 3317,
  GL_UNPACK_COLORSPACE_CONVERSION_WEBGL: 37443,
  GL_UNPACK_FLIP_Y_WEBGL: 37440,
  GL_UNPACK_PREMULTIPLY_ALPHA_WEBGL: 37441,
  GL_UNSIGNED_BYTE: 5121,
  GL_UNSIGNED_INT: 5125,
  GL_UNSIGNED_SHORT: 5123,
  GL_UNSIGNED_SHORT_4_4_4_4: 32819,
  GL_UNSIGNED_SHORT_5_5_5_1: 32820,
  GL_UNSIGNED_SHORT_5_6_5: 33635,
  GL_VALIDATE_STATUS: 35715,
  GL_VENDOR: 7936,
  GL_VERSION: 7938,
  GL_VERTEX_ATTRIB_ARRAY_BUFFER_BINDING: 34975,
  GL_VERTEX_ATTRIB_ARRAY_ENABLED: 34338,
  GL_VERTEX_ATTRIB_ARRAY_NORMALIZED: 34922,
  GL_VERTEX_ATTRIB_ARRAY_POINTER: 34373,
  GL_VERTEX_ATTRIB_ARRAY_SIZE: 34339,
  GL_VERTEX_ATTRIB_ARRAY_STRIDE: 34340,
  GL_VERTEX_ATTRIB_ARRAY_TYPE: 34341,
  GL_VERTEX_SHADER: 35633,
  GL_VIEWPORT: 2978,
  GL_ZERO: 0,
});

/*src/math.js*/


raw.math.vec2 = raw.create_float32(2);
raw.math.vec3 = raw.create_float32(3);
raw.math.vec4 = raw.create_float32(4);

raw.math.quat = raw.create_float32(4, function (out) {
  out[3] = 1;
  return out;
});

raw.math.dquat = raw.create_float32(8, function (out) {
  out[3] = 1;
  return out;
});

raw.math.mat3 = raw.create_float32(9, function (out) {
  out[0] = 1;
  out[4] = 1;
  out[8] = 1;
  return out;
});
raw.math.mat4 = raw.create_float32(16, function (out) {

  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
});

raw.math.aabb2 = raw.create_float32(6);
raw.math.aabb = raw.create_float32(6);

Math.clamp = Math.clamp || function (v, l, h) {
  return Math.max(Math.min(v, h), l);
};

(function () {
  var x, y, z, w, ax, ay, az, aw, bx, by, bz, bw;
  var ax0, ay0, az0, aw0, bx0, by0, bz0, bw0;
  var ax1, ay1, az1, aw1, bx1, by1, bz1, bw1;
  var ax2, ay2, az2, aw2, bx2, by2, bz2, bw2;
  var a00, a10, a20, a30, a01, a11, a21, a31, a02, a12, a22, a32, a03, a13, a23, a33;
  var b00, b10, b20, b30, b01, b11, b21, b31, b02, b12, b22, b32, b03, b13, b23, b33;
  var b0, b1, b2, b3, det;
  var _x, _y, _z, _w, _x2, _y2, _z2, _xx, _xy, _xz, _yx, _yy, _yz, _wx, _wy, _wz;
  var i, j, ii;

  var m11, m12, m13, m21, m22, m23, m31, m32, m33;
  var is1, is2, is3, sm11, sm12, sm13, sm21, sm22, sm23, sm31, sm32, sm33, trace, S;
  var qx, qy, qz, qw;

  var uvx, uvy, uvz, uuvx, uuvy, uuvz, A, B, C;

  var v3_1 = raw.math.vec3();
  var v3_2 = raw.math.vec3();
  var v3_3 = raw.math.vec3();

  var QT_1 = raw.math.quat();
  var QT_2 = raw.math.quat();

  var V3_Y = raw.math.vec3(0, 1, 0);
  
  var V3_X = raw.math.vec3(1, 0, 0);

  var V3_Z = raw.math.vec3(0, 0, 1);
  raw.math.V3_X = V3_X;
  raw.math.V3_Y = V3_Y;
  raw.math.V3_Z = V3_Z;




  raw.math.get_bias = function (time, bias) {
    return (time / ((((1.0 / bias) - 2.0) * (1.0 - time)) + 1.0));
  };

  raw.math.get_gain = function (time, gain) {
    if (time < 0.5)
      return raw.math.get_bias(time * 2.0, gain) / 2.0;
    else
      return raw.math.get_bias(time * 2.0 - 1.0, 1.0 - gain) / 2.0 + 0.5;
  }

  raw.assign(raw.math.vec3, {
    up: V3_Y, left: V3_X,
    zero: raw.math.vec3(),
    one: raw.math.vec3(1, 1, 1),
    set: function (out, x, y, z) {
      out[0] = x;
      out[1] = y;
      out[2] = z;
      return out;
    },
    copy: function (out, a) {
      out[0] = a[0];
      out[1] = a[1];
      out[2] = a[2];
      return out;
    },
    add: function (out, a, b) {
      out[0] = a[0] + b[0];
      out[1] = a[1] + b[1];
      out[2] = a[2] + b[2];
      return out;
    },

    random: function (out, mul) {
      mul = mul || 1;
      out[0] = Math.random() * mul;
      out[1] = Math.random() * mul;
      out[2] = Math.random() * mul;

      return out;
    },
    subtract: function (out, a, b) {
      out[0] = a[0] - b[0];
      out[1] = a[1] - b[1];
      out[2] = a[2] - b[2];
      return out;
    },
    multiply: function (out, a, b) {
      out[0] = a[0] * b[0];
      out[1] = a[1] * b[1];
      out[2] = a[2] * b[2];
      return out;
    },
    scale: function (out, a, b) {
      out[0] = a[0] * b;
      out[1] = a[1] * b;
      out[2] = a[2] * b;
      return out;
    },
    scale_add: function (out, a, v, b) {
      out[0] = a[0] + v[0] * b;
      out[1] = a[1] + v[1] * b;
      out[2] = a[2] + v[2] * b;
      return out;
    },
    min: function (out, a, b) {
      out[0] = Math.min(a[0], b[0]);
      out[1] = Math.min(a[1], b[1]);
      out[2] = Math.min(a[2], b[2]);
      return out;
    },
    max: function (out, a, b) {
      out[0] = Math.max(a[0], b[0]);
      out[1] = Math.max(a[1], b[1]);
      out[2] = Math.max(a[2], b[2]);
      return out;
    },
    dot: function (a, b) {
      return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    },
    normalize: function (out, a) {
      x = a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
      if (x > 0) {
        x = 1 / Math.sqrt(x);
      }
      out[0] = a[0] * x;
      out[1] = a[1] * x;
      out[2] = a[2] * x;
      return out;
    },
    cross: function (out, a, b) {
      ax = a[0]; ay = a[1]; az = a[2];
      bx = b[0]; by = b[1]; bz = b[2];

      out[0] = ay * bz - az * by;
      out[1] = az * bx - ax * bz;
      out[2] = ax * by - ay * bx;
      return out;
    },

    to_polar: function (out, v) {
      out[0] = Math.atan2(v[0], -v[2]);
      out[2] = Math.sqrt(v[0] * v[0] + v[2] * v[2]);
      out[1] = Math.atan2(v[1], out[2]);
      return out;
    },
    from_polar: function (out, lon, lat, rad) {
      A = (1.57079632 - lat);
      B = (lon + 3.14159263);
      out[0] = -(rad * Math.sin(A) * Math.sin(B));
      out[1] = rad * Math.cos(A);
      out[2] = rad * Math.sin(A) * Math.cos(B);
    },
    length_sq: function (a) {
      return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
    },
    get_length: function (a) {
      return Math.abs(Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]));
    },

    get_length2: function (a, b) {
      ax = a[0] - b[0];
      ay = a[1] - b[1];
      az = a[2] - b[2];

      return Math.hypot(ax,ay,az);
      return Math.sqrt(ax * ax + ay * ay + az * az);
    },
    distance2: function (x0, y0, z0, x1, y1, z1) {
      return Math.abs(Math.sqrt(
        (x1 - x0) * (x1 - x0) +
        (y1 - y0) * (y1 - y0) +
        (z1 - z0) * (z1 - z0)));
    },

    distance_sq: function (x0, y0, z0, x1, y1, z1) {
      x = x1 - x0;
      y = y1 - y0;
      z = z1 - z0;
      return x * x + y * y + z * z;
    },

    distance: function (a, b) {
      return Math.abs(Math.sqrt(this.length_sq(this.subtract(v3_1, b, a))));


      return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    },
    transform_mat4: function (out, a, m) {
      x = a[0]; y = a[1]; z = a[2];
      w = 1 / (m[3] * x + m[7] * y + m[11] * z + m[15]);

      out[0] = ((m[0] * x + m[4] * y + m[8] * z) + m[12]) * w;
      out[1] = ((m[1] * x + m[5] * y + m[9] * z) + m[13]) * w;
      out[2] = ((m[2] * x + m[6] * y + m[10] * z) + m[14]) * w;

      return out;
    },

    transform_quat: function (out, a, q) {
      x = a[0]; y = a[1]; z = a[2];
      qx = q[0]; qy = q[1]; qz = q[2]; qw = q[3];


      uvx = qy * z - qz * y;
      uvy = qz * x - qx * z;
      uvz = qx * y - qy * x;

      
      uuvx = qy * uvz - qz * uvy;
      uuvy = qz * uvx - qx * uvz;
      uuvz = qx * uvy - qy * uvx;


      A = qw * 2;
      uvx *= A;
      uvy *= A;
      uvz *= A;
      
      uuvx *= 2;
      uuvy *= 2;
      uuvz *= 2;

      out[0] = x + uvx + uuvx;
      out[1] = y + uvy + uuvy;
      out[2] = z + uvz + uuvz;

      return out;
    },

    transform_quatx: function (out, x,y,z, q) {
      qx = q[0]; qy = q[1]; qz = q[2]; qw = q[3];
      uvx = qy * z - qz * y;
      uvy = qz * x - qx * z;
      uvz = qx * y - qy * x;


      uuvx = qy * uvz - qz * uvy;
      uuvy = qz * uvx - qx * uvz;
      uuvz = qx * uvy - qy * uvx;


      A = qw * 2;
      uvx *= A;
      uvy *= A;
      uvz *= A;

      uuvx *= 2;
      uuvy *= 2;
      uuvz *= 2;

      out[0] = x + uvx + uuvx;
      out[1] = y + uvy + uuvy;
      out[2] = z + uvz + uuvz;

      return out;
    },

    transform_mat4x: function (out, x, y, z, m) {
      w = 1 / (m[3] * x + m[7] * y + m[11] * z + m[15]);

      out[0] = ((m[0] * x + m[4] * y + m[8] * z) + m[12]) * w;
      out[1] = ((m[1] * x + m[5] * y + m[9] * z) + m[13]) * w;
      out[2] = ((m[2] * x + m[6] * y + m[10] * z) + m[14]) * w;

      return out;
    },


  });


  raw.assign(raw.math.vec4, {
    set: function (out, x, y, z, w) {
      out[0] = x;
      out[1] = y;
      out[2] = z;
      out[3] = w;
      return out;
    },
    copy: function (out, a) {
      out[0] = a[0];
      out[1] = a[1];
      out[2] = a[2];
      out[3] = a[3];
      return out;
    },
    length_sq: function (a) {
      return a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3];
    },
    normalize: function (out, a) {
      x = a[0];
      y = a[1];
      z = a[2];
      w = a[3];
      len = x * x + y * y + z * z + w * w;
      if (len > 0) {
        len = 1 / Math.sqrt(len);
      }
      out[0] = x * len;
      out[1] = y * len;
      out[2] = z * len;
      out[3] = w * len;
      return out;
    },
    scale: function (out, a, b) {
      out[0] = a[0] * b;
      out[1] = a[1] * b;
      out[2] = a[2] * b;
      out[3] = a[3] * b;
      return out;
    },
    dot: function (a, b) {
      return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    },
    transform_mat4: function (out, v, m) {
      x = v[0]; y = v[1]; z = v[2]; w = v[3];
      out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
      out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
      out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
      out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
      return out;
    },

  });

  raw.assign(raw.math.aabb2, {
    set: function (out, x, y, z, w, h, d) {
      out[0] = x;
      out[1] = y;
      out[2] = z;
      out[3] = w;
      out[4] = h;
      out[5] = d;
      return (out);
    },
    transform_mat4: (function () {
      return function (out, size, mat) {
        for (i = 0; i < 3; i++) {
          out[i] = mat[12 + i];
          out[3 + i] = 0;
          for (j = 0; j < 3; j++) {
            ii = i * 4 + j;
            out[3 + i] += Math.abs(mat[ii]) * size[j];
          }
        }
        return out;
      }
    })(),
    transform_mat3: (function () {
      return function (out, a, mat) {
        for (i = 0; i < 3; i++) {
          out[3 + i] = 0;
          for (j = 0; j < 3; j++) {
            ii = i * 3 + j;
            out[3 + i] += Math.abs(mat[ii]) * a[j + 3];
          }
        }
        return out;
      }
    })()
  });


  raw.assign(raw.math.aabb, {
    set: function (out, minx, miny, minz, maxx, maxy, maxz) {
      out[0] = minx;
      out[1] = miny;
      out[2] = minz;
      out[3] = maxx;
      out[4] = maxy;
      out[5] = maxz;
      return (out);
    },
    transform_mat4: (function () {

      /*
       0  1  2  3
       4  5  6  7
       8  9  10 11
       12 13 14 15

       0 1 2
       3 4 5
       6 7 8

       */

      return function (out, a, m) {
        for (i = 0; i < 3; i++) {
          out[i] = m[12 + i];
          out[i + 3] = m[12 + i];
          for (j = 0; j < 3; j++) {
            _z = m[(j * 3 + i) + j];
            _x = _z * a[j];
            _y = _z * a[j + 3];
            if (_x < _y) {
              out[i] += _x;
              out[i + 3] += _y;
            }
            else {
              out[i] += _y;
              out[i + 3] += _x;
            }
          }
        }
        return out;
      }


    })(),

  });


  raw.assign(raw.math.mat3, {
    translate_rotate_scale: function (out, x, y, sx, sy, rad) {

      bx = Math.sin(rad);
      by = Math.cos(rad);

      out[0] = (by * 1 + bx * 0) * sx;
      out[1] = (by * 0 + bx * 1) * sx;
      out[2] = (by * 0 + bx * 0) * sx;

      out[3] = (by * 0 - bx * 1) * sy;
      out[4] = (by * 1 - bx * 0) * sy;
      out[5] = (by * 0 - bx * 0) * sy;

      out[6] = x * out[0] + y * out[3];
      out[7] = x * out[1] + y * out[4];
      out[8] = x * out[2] + y * out[5];
      return out;
    },
    from_mat4: function (out, a) {
      out[0] = a[0];
      out[1] = a[1];
      out[2] = a[2];
      out[3] = a[4];
      out[4] = a[5];
      out[5] = a[6];
      out[6] = a[8];
      out[7] = a[9];
      out[8] = a[10];
      return out;
    }

  });

  raw.assign(raw.math.mat4, {
    identity: function (out) {
      out.fill(0);
      out[0] = 1;
      out[5] = 1;
      out[10] = 1;
      out[15] = 1;
      return out;
    },
    copy: function (out, a) {
      out[0] = a[0];
      out[1] = a[1];
      out[2] = a[2];
      out[3] = a[3];
      out[4] = a[4];
      out[5] = a[5];
      out[6] = a[6];
      out[7] = a[7];
      out[8] = a[8];
      out[9] = a[9];
      out[10] = a[10];
      out[11] = a[11];
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
      return out;
    },
    multiply: function (out, a, b) {
      a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
      a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
      a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];
      a30 = a[12]; a31 = a[13]; a32 = a[14]; a33 = a[15];


      b0 = b[0]; b1 = b[1]; b2 = b[2]; b3 = b[3];
      out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

      b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
      out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

      b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
      out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

      b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
      out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      return out;
    },
    perspective: function (out, fovy, aspect, near, far) {
      x = 1.0 / Math.tan(fovy / 2);
      out[0] = x / aspect;
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
      out[4] = 0;
      out[5] = x;
      out[6] = 0;
      out[7] = 0;
      out[8] = 0;
      out[9] = 0;
      out[11] = -1;
      out[12] = 0;
      out[13] = 0;
      out[15] = 0;
      if (far != null && far !== Infinity) {
        x = 1 / (near - far);
        out[10] = (far + near) * x;
        out[14] = (2 * far * near) * x;
      } else {
        out[10] = -1;
        out[14] = -2 * near;
      }
      return out;
    },
    ortho: function (out, left, right, bottom, top, near, far) {
      x = 1 / (left - right);
      y = 1 / (bottom - top);
      z = 1 / (near - far);
      out[0] = -2 * x;
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
      out[4] = 0;
      out[5] = -2 * y;
      out[6] = 0;
      out[7] = 0;
      out[8] = 0;
      out[9] = 0;
      out[10] = 2 * z;
      out[11] = 0;
      out[12] = (left + right) * x;
      out[13] = (top + bottom) * y;
      out[14] = (far + near) * z;
      out[15] = 1;
      return out;
    },
    inverse: function (out, a) {
      a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
      a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
      a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];
      a30 = a[12]; a31 = a[13]; a32 = a[14]; a33 = a[15];

      b00 = a00 * a11 - a01 * a10;
      b01 = a00 * a12 - a02 * a10;
      b02 = a00 * a13 - a03 * a10;
      b03 = a01 * a12 - a02 * a11;
      b04 = a01 * a13 - a03 * a11;
      b05 = a02 * a13 - a03 * a12;
      b06 = a20 * a31 - a21 * a30;
      b07 = a20 * a32 - a22 * a30;
      b08 = a20 * a33 - a23 * a30;
      b09 = a21 * a32 - a22 * a31;
      b10 = a21 * a33 - a23 * a31;
      b11 = a22 * a33 - a23 * a32;


      det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

      if (!det) {
        return null;
      }
      det = 1.0 / det;

      out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
      out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
      out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
      out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
      out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
      out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
      out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
      out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
      out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

      return out;
    },
    from_sacaling_position: function (out, x, y, z, sx, sy, sz) {

      out[0] = sx;
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
      out[4] = 0;
      out[5] = sy;
      out[6] = 0;
      out[7] = 0;
      out[8] = 0;
      out[9] = 0;
      out[10] = sz;
      out[12] = x;
      out[13] = y;
      out[14] = z;
      out[15] = 1;


      return (out);

    },
    transpose: function (out, a) {
      a01 = a[1]; a02 = a[2]; a03 = a[3];
      a12 = a[6]; a13 = a[7]; a23 = a[11];

      out[1] = a[4];
      out[2] = a[8];
      out[3] = a[12];
      out[4] = a01;
      out[6] = a[9];
      out[7] = a[13];
      out[8] = a02;
      out[9] = a12;
      out[11] = a[14];
      out[12] = a03;
      out[13] = a13;
      out[14] = a23;

      return out;
    },
    inverse_rotation: function (out, m, v) {
      /*
       0  1  2  3 
       4  5  6  7
       8  9  10 11
       12 13 14 15
       */
      out[0] = m[0] * v[0] + m[1] * v[1] + m[2] * v[2];
      out[1] = m[4] * v[0] + m[5] * v[1] + m[6] * v[2];
      out[2] = m[8] * v[0] + m[9] * v[1] + m[10] * v[2];

      return out;

    },
    get_rotation: function (out, mat) {
      
      this.get_scaling(v3_1, mat);

      is1 = 1 / v3_1[0];
      is2 = 1 / v3_1[1];
      is3 = 1 / v3_1[2];

      sm11 = mat[0] * is1;
      sm12 = mat[1] * is2;
      sm13 = mat[2] * is3;
      sm21 = mat[4] * is1;
      sm22 = mat[5] * is2;
      sm23 = mat[6] * is3;
      sm31 = mat[8] * is1;
      sm32 = mat[9] * is2;
      sm33 = mat[10] * is3;

      trace = sm11 + sm22 + sm33;
      S = 0;

      if (trace > 0) {
        S = Math.sqrt(trace + 1.0) * 2;
        out[3] = 0.25 * S;
        out[0] = (sm23 - sm32) / S;
        out[1] = (sm31 - sm13) / S;
        out[2] = (sm12 - sm21) / S;
      } else if (sm11 > sm22 && sm11 > sm33) {
        S = Math.sqrt(1.0 + sm11 - sm22 - sm33) * 2;
        out[3] = (sm23 - sm32) / S;
        out[0] = 0.25 * S;
        out[1] = (sm12 + sm21) / S;
        out[2] = (sm31 + sm13) / S;
      } else if (sm22 > sm33) {
        S = Math.sqrt(1.0 + sm22 - sm11 - sm33) * 2;
        out[3] = (sm31 - sm13) / S;
        out[0] = (sm12 + sm21) / S;
        out[1] = 0.25 * S;
        out[2] = (sm23 + sm32) / S;
      } else {
        S = Math.sqrt(1.0 + sm33 - sm11 - sm22) * 2;
        out[3] = (sm12 - sm21) / S;
        out[0] = (sm31 + sm13) / S;
        out[1] = (sm23 + sm32) / S;
        out[2] = 0.25 * S;
      }

      return out;
    },
    get_scaling: function (out, mat) {
      m11 = mat[0];
      m12 = mat[1];
      m13 = mat[2];
      m21 = mat[4];
      m22 = mat[5];
      m23 = mat[6];
      m31 = mat[8];
      m32 = mat[9];
      m33 = mat[10];

      out[0] = Math.hypot(m11, m12, m13);
      out[1] = Math.hypot(m21, m22, m23);
      out[2] = Math.hypot(m31, m32, m33);

      return out;
    },
    get_translation: function (out, mat) {
     
      out[0] = mat[12];
      out[1] = mat[13];
      out[2] = mat[14];

      return out;
    },
    decompose: (function () {
      
      
      return function (out_r, out_t, out_s, mat) {
        out_t[0] = mat[12];
        out_t[1] = mat[13];
        out_t[2] = mat[14];
        
        m11 = mat[0];
        m12 = mat[1];
        m13 = mat[2];
        m21 = mat[4];
        m22 = mat[5];
        m23 = mat[6];
        m31 = mat[8];
        m32 = mat[9];
        m33 = mat[10];

        out_s[0] = Math.hypot(m11, m12, m13);
        out_s[1] = Math.hypot(m21, m22, m23);
        out_s[2] = Math.hypot(m31, m32, m33);

        
        is1 = 1 / out_s[0];
        is2 = 1 / out_s[1];
        is3 = 1 / out_s[2];

        sm11 = m11 * is1;
        sm12 = m12 * is2;
        sm13 = m13 * is3;
        sm21 = m21 * is1;
        sm22 = m22 * is2;
        sm23 = m23 * is3;
        sm31 = m31 * is1;
        sm32 = m32 * is2;
        sm33 = m33 * is3;

        trace = sm11 + sm22 + sm33;
        S = 0;

        if (trace > 0) {
          S = Math.sqrt(trace + 1.0) * 2;
          out_r[3] = 0.25 * S;
          out_r[0] = (sm23 - sm32) / S;
          out_r[1] = (sm31 - sm13) / S;
          out_r[2] = (sm12 - sm21) / S;
        } else if (sm11 > sm22 && sm11 > sm33) {
          S = Math.sqrt(1.0 + sm11 - sm22 - sm33) * 2;
          out_r[3] = (sm23 - sm32) / S;
          out_r[0] = 0.25 * S;
          out_r[1] = (sm12 + sm21) / S;
          out_r[2] = (sm31 + sm13) / S;
        } else if (sm22 > sm33) {
          S = Math.sqrt(1.0 + sm22 - sm11 - sm33) * 2;
          out_r[3] = (sm31 - sm13) / S;
          out_r[0] = (sm12 + sm21) / S;
          out_r[1] = 0.25 * S;
          out_r[2] = (sm23 + sm32) / S;
        } else {
          S = Math.sqrt(1.0 + sm33 - sm11 - sm22) * 2;
          out_r[3] = (sm12 - sm21) / S;
          out_r[0] = (sm31 + sm13) / S;
          out_r[1] = (sm23 + sm32) / S;
          out_r[2] = 0.25 * S;
        }

        return out_r;
      }
    })(),
    scale: function (mat, scale) {
      mat[0] *= scale[0];
      mat[1] *= scale[0];
      mat[2] *= scale[0];
      mat[3] *= scale[0];

      mat[4] *= scale[1];
      mat[5] *= scale[1];
      mat[6] *= scale[1];
      mat[7] *= scale[1];


      mat[8] *= scale[2];
      mat[9] *= scale[2];
      mat[10] *= scale[2];
      mat[11] *= scale[2];
      return mat;
    },
    from_eular: function (m, x, y, z) {      
      return raw.math.quat.to_mat4(m, raw.math.quat.rotate_eular(QT_1, x, y, z));
    }
  });

  var pitch, yaw, roll;
  var  omega, cosom, sinom, scale0, scale1;
  raw.assign(raw.math.quat, {
    zero: raw.math.quat(0, 0, 0, 1),
    invert: function (out, a) {
      a0 = a[0]; a1 = a[1]; a2 = a[2]; a3 = a[3];
      det = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
      det = det > 0 ? 1.0 / det : 0;
      out[0] = -a0 * det;
      out[1] = -a1 * det;
      out[2] = -a2 * det;
      out[3] = a3 * det;
      return out;
    },
    set: raw.math.vec4.set,
    copy: raw.math.vec4.copy,
    dot: raw.math.vec4.dot,
    normalize: raw.math.vec4.normalize,
    identity: function (q) {
      q[0] = 0;
      q[1] = 0;
      q[2] = 0;
      q[3] = 1;
      return q;
    },
    negate: function (q) {
      q[0] = -q[0];
      q[1] = -q[1];
      q[2] = -q[2];
      q[3] = -q[3];
      return q;
    },
    slerp: function (out, a, b, t) {
      ax = a[0]; ay = a[1]; az = a[2]; aw = a[3];
      bx = b[0]; by = b[1]; bz = b[2]; bw = b[3];



      // calc cosine
      cosom = ax * bx + ay * by + az * bz + aw * bw;
      // adjust signs (if necessary)
      if (cosom < 0.0) {
        cosom = -cosom;
        bx = -bx;
        by = -by;
        bz = -bz;
        bw = -bw;
      }
      // calculate coefficients
      if (1.0 - cosom > 0.000001) {
        // standard case (slerp)
        omega = Math.acos(cosom);
        sinom = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
      } else {
        // "from" and "to" quaternions are very close
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
      }
      // calculate final values
      out[0] = scale0 * ax + scale1 * bx;
      out[1] = scale0 * ay + scale1 * by;
      out[2] = scale0 * az + scale1 * bz;
      out[3] = scale0 * aw + scale1 * bw;

      return out;
    },
    slerp_flat: function (out, ax, ay, az, aw, bx, by, bz, bw, t) {

      // calc cosine
      cosom = ax * bx + ay * by + az * bz + aw * bw;
      // adjust signs (if necessary)
      if (cosom < 0.0) {
        cosom = -cosom;
        bx = -bx;
        by = -by;
        bz = -bz;
        bw = -bw;
      }
      // calculate coefficients
      if (1.0 - cosom > 0.000001) {
        // standard case (slerp)
        omega = Math.acos(cosom);
        sinom = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
      } else {
        // "from" and "to" quaternions are very close
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
      }
      // calculate final values
      out[0] = scale0 * ax + scale1 * bx;
      out[1] = scale0 * ay + scale1 * by;
      out[2] = scale0 * az + scale1 * bz;
      out[3] = scale0 * aw + scale1 * bw;

      return out;
    },

    get_angle: function (q) {
      return 2 * Math.acos(q[3]);
    },
    to_eular: function (out, q) {
      x = q[0]; y = [1]; z = q[2]; w = q[3];
      
     a00 = x * y + z * w;
      if (a00 > 0.499) { //console.log("North");
        pitch = 2 * Math.atan2(x, w);
        yaw = Math.PI / 2;
        roll = 0;
      }
      else if (a00 < -0.499) { //console.log("South");
        pitch = -2 * Math.atan2(x, w);
        yaw = - Math.PI / 2;
        roll = 0;
      }

      //..............................
      if (isNaN(pitch)) { //console.log("isNan");
        b00 = z * z;
        roll = Math.atan2(2 * x * w - 2 * y * z, 1 - 2 * x * x - 2 *b00); // bank
        pitch = Math.atan2(2 * y * w - 2 * x * z, 1 - 2 * y * y - 2 * b00); // Heading
        yaw = Math.asin(2 * a00); // attitude
      }

      out[0] = roll;
      out[1] = pitch;
      out[2] = yaw;


      return out;
    },
    rotate_eular: function (q, x, y, z) {
      x = x * 0.5;
      y = y * 0.5;
      z = z * 0.5;

      ax = Math.sin(x);
      bx = Math.cos(x);
      ay = Math.sin(y);
      by = Math.cos(y);
      az = Math.sin(z);
      bz = Math.cos(z);

      q[0] = ax * by * bz - bx * ay * az;
      q[1] = bx * ay * bz + ax * by * az;
      q[2] = bx * by * az - ax * ay * bz;
      q[3] = bx * by * bz + ax * ay * az;

      this.normalize(q, q);
      return q;
    },    
    append_eular: function (out, x, y, z) {
      this.rotate_eular(QT_1, x, y, z);
      return this.multiply(out, out, QT_1);
    },
    multiply: function (out, a, b) {
      ax = a[0]; ay = a[1]; az = a[2]; aw = a[3];
      bx = b[0]; by = b[1]; bz = b[2]; bw = b[3];

      out[0] = ax * bw + aw * bx + ay * bz - az * by;
      out[1] = ay * bw + aw * by + az * bx - ax * bz;
      out[2] = az * bw + aw * bz + ax * by - ay * bx;
      out[3] = aw * bw - ax * bx - ay * by - az * bz;
      return out;
    },

    multiply2: function (out, a, bx,by,bz,bw) {
      ax = a[0]; ay = a[1]; az = a[2]; aw = a[3];
      out[0] = ax * bw + aw * bx + ay * bz - az * by;
      out[1] = ay * bw + aw * by + az * bx - ax * bz;
      out[2] = az * bw + aw * bz + ax * by - ay * bx;
      out[3] = aw * bw - ax * bx - ay * by - az * bz;
      return out;
    },

    to_mat4: function (mat, q) {
      _x = q[0]; _y = q[1]; _z = q[2]; _w = q[3];
      _x2 = _x + _x; _y2 = _y + _y; _z2 = _z + _z;

      _xx = _x * _x2;
      _xy = _x * _y2;
      _xz = _x * _z2;
      _yy = _y * _y2;
      _yz = _y * _z2;
      _zz = _z * _z2;
      _wx = _w * _x2;
      _wy = _w * _y2;
      _wz = _w * _z2;


      mat[0] = (1 - (_yy + _zz));
      mat[1] = (_xy + _wz);
      mat[2] = (_xz - _wy);
      mat[3] = 0;
      mat[4] = (_xy - _wz);
      mat[5] = (1 - (_xx + _zz));
      mat[6] = (_yz + _wx);
      mat[7] = 0;
      mat[8] = (_xz + _wy);
      mat[9] = (_yz - _wx);
      mat[10] = (1 - (_xx + _yy));
      mat[11] = 0;
      return mat;
    },
    set_axis_angle: function (out, axis, rad) {
      rad = rad * 0.5;
      A = Math.sin(rad);
      out[0] = A * axis[0];
      out[1] = A * axis[1];
      out[2] = A * axis[2];
      out[3] = Math.cos(rad);
      return out;
    },
    set_axis_anglex: function (out,x,y,z, rad) {
      rad = rad * 0.5;
      A = Math.sin(rad);
      out[0] = A * x;
      out[1] = A * y;
      out[2] = A * z;
      out[3] = Math.cos(rad);
      return out;
    },
    look_at: function (out,a,b) {
      raw.math.vec3.cross(v3_1, a, b);
      A = raw.math.vec3.dot(a, b);      
      if (dot < -1.0 + DOT_EPSILON) return Quaternion(0, 1, 0, 0);


    },
    rotation_to: function (out, a,b) {    
      A = raw.math.vec3.dot(a, b);      
      if (A < -0.999999) {
        raw.math.vec3.cross(v3_1, V3_X, a);
        if (raw.math.vec3.get_length(v3_1) < 0.000001) raw.math.vec3.cross(v3_1, V3_Y, a);
        raw.math.vec3.normalize(v3_1, v3_1);
        this.set_axis_angle(out, v3_1, Math.PI);
        return out;
      } else if (A > 0.999999) {
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
        out[3] = 1;
        return out;
      }else {
        raw.math.vec3.cross(v3_1, a, b);
        out[0] = v3_1[0];
        out[1] = v3_1[1];
        out[2] = v3_1[2];
        out[3] = 1 + A;
        return this.normalize(out, out);
      }

    },

    rotation_to2: function (out, a, b) {
      A = raw.math.vec3.dot(a, b);
      raw.math.vec3.cross(v3_1, a, b);
      out[0] = v3_1[0];
      out[1] = v3_1[1];
      out[2] = v3_1[2];
      out[3] = 1 + A;
      return this.normalize(out, out);

    },

    aim: function (out, a, b) {
    //float d = xfrom * xto + yfrom * yto + zfrom * zto; //dot(from, to);
      A = raw.math.vec3.dot(a, b);
      raw.math.vec3.cross(out, a, b);

      //float wq = (float)sqrt((xfrom*xfrom + yfrom*yfrom + zfrom*zfrom)*(xto*xto + yto*yto + zto*zto)) +d;
      out[3] = Math.sqrt((raw.math.vec3.length_sq(a)) * (raw.math.vec3.length_sq(a))) + A;
      
      /*
      if (out[3] < 0.0001) {
        out[0] = -a[2]; // Cross.set( -UnitFrom.z, 0, UnitFrom.x );
        out[1] =a[1];
        out[2] =a[0];
        out[3] = 0;
      }
      */
      return this.normalize(out, out);




    },


  });
  

  raw.assign(raw.math.dquat, {
    rotate_eular: raw.math.quat.rotate_eular,
    get_translation: function (out, a) {
      ax = a[4];
      ay = a[5];
      az = a[6];
      aw = a[7];
      bx = -a[0];
      by = -a[1];
      bz = -a[2];
      bw = a[3];
      out[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
      out[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
      out[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
      return out;
    },
    from_rotation_translation: function (q, rx, ry, rz, tx, ty, tz) {
      this.rotate_eular(q, rx, ry, rz);
      

      /*
       * raw.math.quat.normalize(q, q);

      raw.math.quat.set(QT_1, tx, ty, tz, 0);
      raw.math.vec4.scale(QT_2, q, 0.5);
      raw.math.quat.multiply(QT_1, QT_1, QT_2);

      q[4] = QT_1[0];
      q[5] = QT_1[1];
      q[6] = QT_1[2];
      q[7] = QT_1[3];

      */

      ax = tx * 0.5;
      ay = ty * 0.5;
      az = tz * 0.5;
      bx = q[0];
      by = q[1];
      bz = q[2];
      bw = q[3];

      q[4] = ax * bw + ay * bz - az * by;
      q[5] = ay * bw + az * bx - ax * bz;
      q[6] = az * bw + ax * by - ay * bx;
      q[7] = -ax * bx - ay * by - az * bz;
      return q;



    },
    from_quat_pos: function (q, qt, pos) {
      
      q[0] = qt[0];
      q[1] = qt[1];
      q[2] = qt[2];
      q[3] = qt[3];

      ax = pos[0] * 0.5;
      ay = pos[1] * 0.5;
      az = pos[2] * 0.5;
      bx = q[0];
      by = q[1];
      bz = q[2];
      bw = q[3];

      q[4] = ax * bw + ay * bz - az * by;
      q[5] = ay * bw + az * bx - ax * bz;
      q[6] = az * bw + ax * by - ay * bx;
      q[7] = -ax * bx - ay * by - az * bz;

      return q;


    },
    translate: function (out, a, x, y, z) {
      ax1 = a[0];
      ay1 = a[1];
      az1 = a[2];
      aw1 = a[3];
      bx1 = x * 0.5;
      by1 = y * 0.5;
      bz1 = z * 0.5;
      ax2 = a[4];
      ay2 = a[5];
      az2 = a[6];
      aw2 = a[7];
      out[0] = ax1;
      out[1] = ay1;
      out[2] = az1;
      out[3] = aw1;
      out[4] = aw1 * bx1 + ay1 * bz1 - az1 * by1 + ax2;
      out[5] = aw1 * by1 + az1 * bx1 - ax1 * bz1 + ay2;
      out[6] = aw1 * bz1 + ax1 * by1 - ay1 * bx1 + az2;
      out[7] = -ax1 * bx1 - ay1 * by1 - az1 * bz1 + aw2;
      return out;
    },
    length_sq: raw.math.vec4.length_sq,
    normalize: function (out, a) {
      A = this.length_sq(a);
      if (A > 0) {
        A = Math.sqrt(A);

        a0 = a[0] / A;
        a1 = a[1] / A;
        a2 = a[2] / A;
        a3 = a[3] / A;

        b0 = a[4];
        b1 = a[5];
        b2 = a[6];
        b3 = a[7];

        B = (a0 * b0) + (a1 * b1) + (a2 * b2) + (a3 * b3);

        out[0] = a0;
        out[1] = a1;
        out[2] = a2;
        out[3] = a3;

        out[4] = (b0 - (a0 * B)) / A;
        out[5] = (b1 - (a1 * B)) / A;
        out[6] = (b2 - (a2 * B)) / A;
        out[7] = (b3 - (a3 * B)) / A;
      }
      return out;
    },  
    multiply: function (out, a, b) {

      ax0 = a[0]; ay0 = a[1]; az0 = a[2]; aw0 = a[3];
      ax1 = a[4]; ay1 = a[5]; az1 = a[6]; aw1 = a[7];

      bx0 = b[0]; by0 = b[1]; bz0 = b[2]; bw0 = b[3];
      bx1 = b[4]; by1 = b[5]; bz1 = b[6]; bw1 = b[7];

      out[0] = ax0 * bw0 + aw0 * bx0 + ay0 * bz0 - az0 * by0;
      out[1] = ay0 * bw0 + aw0 * by0 + az0 * bx0 - ax0 * bz0;
      out[2] = az0 * bw0 + aw0 * bz0 + ax0 * by0 - ay0 * bx0;
      out[3] = aw0 * bw0 - ax0 * bx0 - ay0 * by0 - az0 * bz0;

      out[4] = ax0 * bw1 + aw0 * bx1 + ay0 * bz1 - az0 * by1 + ax1 * bw0 + aw1 * bx0 + ay1 * bz0 - az1 * by0;
      out[5] = ay0 * bw1 + aw0 * by1 + az0 * bx1 - ax0 * bz1 + ay1 * bw0 + aw1 * by0 + az1 * bx0 - ax1 * bz0;
      out[6] = az0 * bw1 + aw0 * bz1 + ax0 * by1 - ay0 * bx1 + az1 * bw0 + aw1 * bz0 + ax1 * by0 - ay1 * bx0;
      out[7] = aw0 * bw1 - ax0 * bx1 - ay0 * by1 - az0 * bz1 + aw1 * bw0 - ax1 * bx0 - ay1 * by0 - az1 * bz0;

      return out;

    },
    invert: function (out, a) {

      A = this.length_sq(a);
      out[0] = -a[0] / A;
      out[1] = -a[1] / A;
      out[2] = -a[2] / A;
      out[3] = a[3] / A;
      out[4] = -a[4] / A;
      out[5] = -a[5] / A;
      out[6] = -a[6] / A;
      out[7] = a[7] / A;
      return out;
    },
    conjugate: function (out, a) {
      out[0] = -a[0];
      out[1] = -a[1];
      out[2] = -a[2];
      out[3] = a[3];
      out[4] = -a[4];
      out[5] = -a[5];
      out[6] = -a[6];
      out[7] = a[7];
      return out;
    },
    lerp: function (out, a, b, t) {

      A = 1 - t;
      if (vec4.dot(a, b) < 0) t = -t;

      out[0] = a[0] * A + b[0] * t;
      out[1] = a[1] * A + b[1] * t;
      out[2] = a[2] * A + b[2] * t;
      out[3] = a[3] * A + b[3] * t;
      out[4] = a[4] * A + b[4] * t;
      out[5] = a[5] * A + b[5] * t;
      out[6] = a[6] * A + b[6] * t;
      out[7] = a[7] * A + b[7] * t;
      return out;
    },
    to_mat4: function (mat,q) {
      _x = q[0]; _y = q[1]; _z = q[2]; _w = q[3];

      _x2 = _x + _x; _y2 = _y + _y; _z2 = _z + _z;

      _xx = _x * _x2;
      _xy = _x * _y2;
      _xz = _x * _z2;
      _yy = _y * _y2;
      _yz = _y * _z2;
      _zz = _z * _z2;
      _wx = _w * _x2;
      _wy = _w * _y2;
      _wz = _w * _z2;


      mat[0] = (1 - (_yy + _zz));
      mat[1] = (_xy + _wz);
      mat[2] = (_xz - _wy);
      mat[3] = 0;
      mat[4] = (_xy - _wz);
      mat[5] = (1 - (_xx + _zz));
      mat[6] = (_yz + _wx);
      mat[7] = 0;
      mat[8] = (_xz + _wy);
      mat[9] = (_yz - _wx);
      mat[10] = (1 - (_xx + _yy));
      mat[11] = 0;

      ax = q[4];
      ay = q[5];
      az = q[6];
      aw = q[7];
      bx = -q[0];
      by = -q[1];
      bz = -q[2];
      bw = q[3];
      mat[12] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
      mat[13] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
      mat[14] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
    },
    copy: function (out, a) {
      out[0] = a[0];
      out[1] = a[1];
      out[2] = a[2];
      out[3] = a[3];
      out[4] = a[4];
      out[5] = a[5];
      out[6] = a[6];
      out[7] = a[7];
      return out;
    },
    from_mat4: function (out, mat) {      
      raw.math.mat4.get_rotation(QT_1, mat)
      raw.math.mat4.get_translation(v3_1, mat);
   //   raw.math.quat.normalize(QT_1, QT_1);
      this.from_quat_pos(out, QT_1, v3_1);
      return out;
    }    

  });


})();




/*src/ecs.js*/

raw.ecs = raw.define(function (proto) {

  function ecs(def) {
    def = def || {};
    this.systems = {};
    this.components = {};
    this._components = [];
    this._systems = [];
    this.entities = {};
    this.globals = {};
    this.memory_blocks = {};
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
      for (name_id in def.components) {
        this.use_component(name_id);
      }
      this._components.for_each(function (comp, i, ecs) {
        if (def.components[comp.name_id]) {
          ecs.attach_component(entity, comp.name_id, def.components[comp.name_id]);
        }
      }, this);  
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
   
    if (e[comp.name_id]) return e[comp.name_id];
    var ins = new comp.creator(comp);    
    ins.create(def , e, this);
    comp = this.components[name_id];
    if (this.components[name_id].set_instance !== null) {
      this.components[name_id].set_instance(ins, ecs);
    }
    this.map_component_entity(e, this.components[name_id], ins);
    return e[comp.name_id];
  };

  var comp, sys;
  proto.use_component = function (name_id) {
    if (!this.components[name_id]) {
      comp = ecs.components[name_id];
      this.components[name_id] = {
        priority: comp.priority,
        name_id: name_id, set_instance: null,
        creator: comp, ecs: this, entities: [], ei: 0
      };
      if (comp.super_class.name_id !== undefined) {
        this.components[name_id].parent = this.use_component(comp.super_class.name_id)
      }
      if (comp.validate) comp.validate(this.components[name_id]);
      this._components.push(this.components[name_id]);
      this._components = raw.merge_sort(this._components, this._components.length, function (a, b) {
        return a.priority - b.priority;
      });

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
          sys.step_start();
        }
      }

      for (i = 0; i < this._systems.length; i++) {
        sys = this._systems[i];
        if (sys.enabled === true) {
          sys.time_delta = this.timer - sys.last_step_time;
          if (sys.time_delta > sys.step_size) {
            time_start = Date.now();
            sys.step();
            sys.frame_time = (Date.now() - time_start);
            sys.last_step_time = this.timer - (sys.time_delta % sys.step_size);
          }
        
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
    comp.priority = ecs.register_component.priority;
    ecs.register_component.priority += 1000;
  };

  ecs.register_component.priority = 1000;


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




/*src/webgl.js*/


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



    this.format = format || 6408;
    this.format_type = format_type || 5121;
    this.target = target || 3553;
    this.parameters = {};

    this.generate_mipmap = generate_mipmap || false;

    this.parameters[10242] = 10497;
    this.parameters[10243] = 10497;


    if (this.generate_mipmap) {
      this.parameters[10240] = 9729;
      this.parameters[10241] = 9987;
    }
    else {
      this.parameters[10240] = 9728;
      this.parameters[10241] = 9728;
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
    34070, 34069,
    34072, 34071,
    34074, 34073
  ];
  var new_texture = false;
  texture.update = function (gl, tex) {


    new_texture = false;

    if (tex.gl_texture === null) {
      tex.gl_texture = raw.webgl.textures.get(gl);
      new_texture = true;
    }



    gl.bindTexture(tex.target, tex.gl_texture);

    if (tex.target === 34067) {
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


  texture.create_tiled_texture = (function () {
    var canv =raw.create_canvas(1, 1);
    canv.is_busy = false;
    var tile_maker = raw.create_canvas(1, 1);
    var x, y;
    var pool = [];
    tile_maker.ctx.imageSmoothingEnabled = false;
    function create_tiled_texture(tile_urls, tile_size, width, height, texture) {
      texture = texture || new raw.webgl.texture(false, false, false, null, true, width, height);
      texture.tile_size = tile_size;
      if (canv.is_busy) {
        pool.push([tile_urls, tile_size, width, height, texture]);
        return texture;
      }
      canv.is_busy = true;
      canv.setSize(width, height);
      tile_maker.setSize(tile_size, tile_size);



      var tile_size2 = tile_size / 2;
      texture.tile_offset = tile_size / 4;
      texture.tile_offsetf = texture.tile_offset / width;
      texture.tile_sizef = tile_size / width;

      x = 0; y = 0;
      raw.each_index(function (index, next) {
        console.log("loading ", tile_urls[index]);

        raw.load_working_image(tile_urls[index], function (img) {

          tile_maker.ctx.drawImage(img, 0, 0, tile_size2, tile_size2);
          tile_maker.ctx.drawImage(img, tile_size2, 0, tile_size2, tile_size2);

          tile_maker.ctx.drawImage(img, 0, tile_size2, tile_size2, tile_size2);

          tile_maker.ctx.drawImage(img, tile_size2, tile_size2, tile_size2, tile_size2);




          canv.ctx.drawImage(tile_maker, x, y, tile_size, tile_size);
          if (x + tile_size < width) {
            x += tile_size;
          }
          else {
            x = 0;
            y += tile_size;
          }
          console.log("tile " + index);
          if (index < tile_urls.length - 1) {
            next(index + 1);
          }
          else {
            texture.source = canv._getImageData().data;
            texture.needs_update = true;
            canv.is_busy = false;
            if (pool.length > 0) {
              create_tiled_texture.apply(raw.webgl.texture, pool.shift());
            }

            //canv.toBlob(function (b) {saveAs(b, "image.jpg");});
            //document.getElementById("test_tile").src = canv.toDataURL("");
          }
        }, tile_size, tile_size);
      }, 0);

      return texture;
    }
    return create_tiled_texture;
  })();


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
      this.gl.bindRenderbuffer(36161, this.depth_buffer);
      this.gl.renderbufferStorage(36161, 33189, width, height);

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
    if (this.gl.bindFramebuffer(36160, this.frame_buffer)) {
      this.apply_viewport();
    }
    if (this.clear_buffer) this.gl.clear(16384 | 256);
    return (this)
  };

  proto.apply_viewport = function () {
    this.gl.viewport(this.vp_left, this.vp_top, this.vp_right - this.vp_left, this.vp_bottom - this.vp_top);
    return (this)
  };
  proto.bind_only = function () {
    if (this.gl.bindFramebuffer(36160, this.frame_buffer)) {
      this.gl.viewport(this.vp_left, this.vp_top, this.vp_right - this.vp_left, this.vp_bottom - this.vp_top);
    }

    return (this)
  };


  proto.unbind = function () {
    this.gl.bindFramebuffer(36160, null);
  };

  proto.attach_color = function (gl_texture) {
    this.color_texture = this.bind_texture(new raw.webgl.texture(undefined, undefined, undefined, null, false, this.width, this.height), 36064, gl_texture);
    this.color_texture.parameters[10242] = 33071;
    this.color_texture.parameters[10243] = 33071;
    
    


    return (this);

  };

  proto.attach_depth = function () {
    this.depth_texture = this.bind_texture(new raw.webgl.texture(undefined, 6402, 5123, null, false, this.width, this.height), 36096);
    this.depth_texture.parameters[10242] = 33071;
    this.depth_texture.parameters[10243] = 33071;

  };

  proto.attach_depth_buffer = function () {
    this.depth_buffer = this.gl.createRenderbuffer();
    this.gl.bindRenderbuffer(36161, this.depth_buffer);
    this.gl.renderbufferStorage(36161, 33189, this.width, this.height);

    this.gl.bindFramebuffer(36160, this.frame_buffer);

    this.gl.framebufferRenderbuffer(36160, 36096, 36161, this.depth_buffer);

    var status = this.gl.checkFramebufferStatus(36160);
    switch (status) {
      case 36053:
        break;
      case 36054:
        throw ("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
        break;
      case 36055:
        throw ("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
        break;
      case 36057:
        throw ("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
        break;
      case 36061:
        throw ("Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED");
        break;
      default:
        throw ("Incomplete framebuffer: " + status);
    }


    this.gl.bindFramebuffer(36160, null);
    this.gl.bindRenderbuffer(36161, null);
  };

  proto.bind_texture = function (texture, attachment,gl_texture) {



    this.gl.bindFramebuffer(36160, this.frame_buffer);

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

    this.gl.framebufferTexture2D(36160, attachment, texture.target, texture.gl_texture, 0);

    var status = this.gl.checkFramebufferStatus(36160);
    if (status !== 36053) {
      console.error("frame buffer status:" + status.toString());
    }

    this.gl.bindTexture(texture.target, null);
    this.gl.bindFramebuffer(36160, null);

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
        if (name.indexOf('global-') === 0) {
          shader.chunks[name] = chunk;
        }
        lib[name] = chunk;
      }
    });
    return lib;
  }
  shader.load_chunks(`/*chunk-precision*/ 
#extension GL_OES_standard_derivatives : enable\n\r
#if GL_FRAGMENT_PRECISION_HIGH == 1\n\r
  precision highp float;\n\r
#else\n\r
precision mediump float;\n\r
#endif\n\r

const float DEGTORAD=0.017453292519943295;
const float RADTODEG=57.295779513082323;






/*chunk-shadow-sampling*/

float sample_shadow_map(sampler2D shadowMap, vec2 coords, float compare)
{
return step(compare, texture2D(shadowMap, coords.xy).r);
}

float sample_shadow_map_linear(sampler2D shadowMap, vec2 coords, float compare, vec2 texelSize)
{
vec2 pixelPos = coords / texelSize + vec2(0.5);
vec2 fracPart = fract(pixelPos);
vec2 startTexel = (pixelPos - fracPart) * texelSize;

float blTexel = sample_shadow_map(shadowMap, startTexel, compare);
float brTexel = sample_shadow_map(shadowMap, startTexel + vec2(texelSize.x, 0.0), compare);
float tlTexel = sample_shadow_map(shadowMap, startTexel + vec2(0.0, texelSize.y), compare);
float trTexel = sample_shadow_map(shadowMap, startTexel + texelSize, compare);

float mixA = mix(blTexel, tlTexel, fracPart.y);
float mixB = mix(brTexel, trTexel, fracPart.y);

return mix(mixA, mixB, fracPart.x);
}

float sample_shadow_map_pcf(sampler2D shadowMap, vec2 coords, float compare, vec2 texelSize)
{
const float NUM_SAMPLES = 3.0;
const float SAMPLES_START = (NUM_SAMPLES - 1.0) / 2.0;
const float NUM_SAMPLES_SQUARED = NUM_SAMPLES * NUM_SAMPLES;

float result = 0.0;
for (float y = -SAMPLES_START; y <= SAMPLES_START; y += 1.0)
{
for (float x = -SAMPLES_START; x <= SAMPLES_START; x += 1.0)
{
vec2 coordsOffset = vec2(x, y) * texelSize;
result += sample_shadow_map_linear(shadowMap, coords + coordsOffset, compare, texelSize);
}
}
return result / NUM_SAMPLES_SQUARED;
}


/*chunk-timer*/
uniform vec3 u_timer_rw;


/*chunk-random*/
float random(vec3 seed, int i){
vec4 seed4 = vec4(seed,i);
float dot_product = dot(seed4, vec4(12.9898,78.233,45.164,94.673));
return fract(sin(dot_product) * 43758.5453);
}



/*chunk-debug_aabbs*/

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
}





/*chunk-quat-dquat*/

vec3 quat_transform(vec4 q, vec3 v)
{
  return (v + cross(2.0 * q.xyz, cross(q.xyz, v) + q.w * v));
}

/*chunk-mat3-transpose*/
mat3 transpose(mat3 m) {
 return mat3(m[0][0], m[1][0], m[2][0],
       m[0][1], m[1][1], m[2][1],
       m[0][2], m[1][2], m[2][2]);
}`);

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
      if (!gl.getShaderParameter(shdr, 35713)) {
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
      if (!gl.getProgramParameter(prog, 35714)) {
        console.error("Error creating shader program.", gl.getProgramInfoLog(prog));
        gl.deleteProgram(prog); return null;
      }
      if (doValidate) {
        gl.validateProgram(prog);
        if (!gl.getProgramParameter(prog, 35715)) {
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
        for (i = 0; i < gl.getProgramParameter(shdr.program, 35718); i++) {
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


        for (i = 0; i < gl.getProgramParameter(shdr.program, 35721); i++) {
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
      vshdr = create_shader(gl, shdr.vs, 35633);
      if (!vshdr) return false;
      fshdr = create_shader(gl, shdr.fs, 35632);
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

/*src/geometry.js*/


raw.geometry = raw.define(function (proto) {
  function geometry() {
    this.compiled = false;
    this.uuid = raw.guidi();
    this.attributes = {};
    this.version = 0;
    this.bounds_sphere = 0;
    this.aabb = raw.math.aabb();
    this.index_buffer = null;
    this.index_data = null;

    return (this);
  }

  proto.set_indices = function (indices) {
    if (Object.prototype.toString.call(indices) === "[object Uint16Array]"
      || Object.prototype.toString.call(indices) === "[object Uint32Array]"
    ) {
      this.index_data = indices;
    }
    else this.index_data = raw.geometry.create_index_data(indices);
    this.index_needs_update = true;
    this.num_items = this.index_data.length;
  };

  proto.add_attribute = function (name, attribute) {
    attribute.buffer = null;
    attribute.item_size = attribute.item_size || 3;
    attribute.data = attribute.data || null;
    attribute.needs_update = attribute.needs_update || false;
    attribute.divisor = attribute.divisor || 0;
    attribute.array = attribute.array || null;
    attribute.data_offset = attribute.data_offset || 0;
    attribute.data_length = attribute.data_length || 0;

    attribute.name = name;
    attribute.geo_id = this.uuid;
    if (attribute.data !== null) {
      attribute.data_length = attribute.data.length;
    }
    this.attributes[name] = attribute;
    return (attribute);
  };

  proto.create_instance_id_attribute = function (max_instances) {
    var att = this.add_attribute("a_instance_id_rw", {
      data: new Float32Array(max_instances),
      item_size: 1,
      divisor: 1
    });
    for (var i = 0; i < att.data.length; i++)
      att.data[i] = i;

  }


  proto.scale_position_rotation = (function () {
    var mat = raw.math.mat4(), quat = raw.math.quat();
    return function (sx, sy, sz, x, y, z, rx, ry, rz, vert_att) {
      vert_att = vert_att || this.attributes["a_position_rw"];
      raw.math.quat.to_mat4(mat, raw.math.quat.rotate_eular(quat, rx, ry, rz));
      mat[0] *= sx;
      mat[1] *= sy;
      mat[2] *= sz;

      mat[4] *= sx;
      mat[5] *= sy;
      mat[6] *= sz;

      mat[8] *= sx;
      mat[9] *= sy;
      mat[10] *= sz;

      mat[12] = x;
      mat[13] = y;
      mat[14] = z;

      raw.geometry.transform(this, vert_att.data, vert_att.item_size, mat);

      if (this.attributes["a_normal_rw"]) {
        raw.geometry.transform(this, this.attributes["a_normal_rw"].data, this.attributes["a_normal_rw"].item_size, mat);
      }
      
      raw.geometry.calc_bounds(this, vert_att.data, vert_att.item_size);
      return this;

    }
  })();

  geometry.index_data_type = Uint32Array;
  geometry.create_index_data = function (size) {
    return new this.index_data_type(size);
  };

  geometry.calc_bounds = (function () {
    var p_min = raw.math.vec3(), p_max = raw.math.vec3();
    geometry.transform = function (g, vertices, item_size, mat) {
      for (i = 0; i < vertices.length; i += item_size) {
        raw.math.vec3.transform_mat4x(p_min, vertices[i], vertices[i + 1], vertices[i + 2], mat);
        vertices[i] = p_min[0];
        vertices[i + 1] = p_min[1];
        vertices[i + 2] = p_min[2];


      }
    };
    return function (g, vertices, item_size) {
      g.bounds_sphere = 0;
      raw.math.vec3.set(p_min, 99999, 99999, 99999);
      raw.math.vec3.set(p_max, -99999, -99999, -99999);
      for (i = 0; i < vertices.length; i += item_size) {
        g.bounds_sphere = Math.max(g.bounds_sphere, Math.abs(Math.hypot(vertices[i], vertices[i + 1], vertices[i + 2])));
        p_min[0] = Math.min(p_min[0], vertices[i]);
        p_min[1] = Math.min(p_min[1], vertices[i + 1]);
        p_min[2] = Math.min(p_min[2], vertices[i + 2]);

        p_max[0] = Math.max(p_max[0], vertices[i]);
        p_max[1] = Math.max(p_max[1], vertices[i + 1]);
        p_max[2] = Math.max(p_max[2], vertices[i + 2]);
      }
      raw.math.aabb.set(g.aabb, p_min[0], p_min[1], p_min[2], p_max[0], p_max[1], p_max[2]);
      return g.bounds_sphere;

    }
  })();

  geometry.calc_normals = (function () {
    var v1 = raw.math.vec3(), v2 = raw.math.vec3(), v3 = raw.math.vec3();
    var v1v2 = raw.math.vec3(), v1v3 = raw.math.vec3(), normal = raw.math.vec3();
    var v2v3Alias = raw.math.vec3(), v2v3Alias = raw.math.vec3();
    var i1, i2, i3;
    var normals;
    geometry.invert_normals = function (geo) {
      normals = geo.attributes.a_normal_rw.data;
      for (i1 = 0; i1 < normals.length; i1 += 3) {
        normals[i1] = -normals[i1];
        normals[i1+1] = -normals[i1+1];
        normals[i1+2] = -normals[i1+2];
      }
      geo.attributes.needs_update = true;
    };

    return function (geo, flateFaces) {

      var vertices = geo.attributes.a_position_rw.data;
      
      if (!geo.attributes.tge_a_normal) {
        geo.addAttribute('a_normal_rw', {
          data: new Float32Array(vertices.length)
        });
      }

      normals = geo.attributes.a_normal_rw.data;
      var indices = geo.index_data;

      normals.fill(0);


     
      var weight1, weight2;
      var total = vertices.length;
      var step = 9;
      if (indices !== null) {
        total = indices.length;
        step = 3;
      }
      for (var j = 0; j < total; j += step) {
        if (indices !== null) {
          i1 = indices[j];
          i2 = indices[j + 1];
          i3 = indices[j + 2];
          raw.math.vec3.set(v1, vertices[i1 * 3], vertices[i1 * 3 + 1], vertices[i1 * 3 + 2]);
          raw.math.vec3.set(v2, vertices[i2 * 3], vertices[i2 * 3 + 1], vertices[i2 * 3 + 2]);
          raw.math.vec3.set(v3, vertices[i3 * 3], vertices[i3 * 3 + 1], vertices[i3 * 3 + 2]);
        }
        else {
          raw.math.vec3.set(v1, vertices[j + 0], vertices[j + 1], vertices[j + 2]);
          raw.math.vec3.set(v2, vertices[j + 3], vertices[j + 4], vertices[j + 5]);
          raw.math.vec3.set(v3, vertices[j + 6], vertices[j + 7], vertices[j + 8]);
        }




        raw.math.vec3.subtract(v1v2, v3, v2);
        raw.math.vec3.subtract(v1v3, v1, v2);





        if (indices !== null) {
          i1 = i1 * 3;
          i2 = i2 * 3;
          i3 = i3 * 3;
        }
        else {
          i1 = j;
          i2 = j + 3;
          i3 = j + 6;
        }

        if (flateFaces) {
          raw.math.vec3.cross(normal, v1v2, v1v3);
          raw.math.vec3.normalize(v1v2, normal);
          normals[i1 + 0] += v1v2[0];
          normals[i1 + 1] += v1v2[1];
          normals[i1 + 2] += v1v2[2];

          normals[i2 + 0] += v1v2[0];
          normals[i2 + 1] += v1v2[1];
          normals[i2 + 2] += v1v2[2];

          normals[i3 + 0] += v1v2[0];
          normals[i3 + 1] += v1v2[1];
          normals[i3 + 2] += v1v2[2];
        }
        else {

          //raw.math.vec3.normalize(v1v2, v1v2);
          //raw.math.vec3.normalize(v1v3, v1v3);
          raw.math.vec3.cross(normal, v1v2, v1v3);
          //raw.math.vec3.normalize(normal, normal);
          raw.math.vec3.copy(v1v2, normal);


          //raw.math.vec3.subtract(v2v3Alias, v3, v2);
          //raw.math.vec3.normalize(v2v3Alias, v2v3Alias);

          //weight1 = Math.acos(Math.max(-1, Math.min(1, raw.math.vec3.dot(v1v2, v1v3))));
          // weight2 = Math.PI - Math.acos(Math.max(-1, Math.min(1, raw.math.vec3.dot(v1v2, v2v3Alias))));
          // raw.math.vec3.scale(v1v2, normal, weight1);
          normals[i1 + 0] += v1v2[0];
          normals[i1 + 1] += v1v2[1];
          normals[i1 + 2] += v1v2[2];
          // raw.math.vec3.scale(v1v2, normal, weight2);
          normals[i2 + 0] += v1v2[0];
          normals[i2 + 1] += v1v2[1];
          normals[i2 + 2] += v1v2[2];
          //  raw.math.vec3.scale(v1v2, normal, Math.PI - weight1 - weight2);
          normals[i3 + 0] += v1v2[0];
          normals[i3 + 1] += v1v2[1];
          normals[i3 + 2] += v1v2[2];
        }




      }

      if (!flateFaces) {

      }
      for (a = 0; a < normals.length; a += 3) {
        raw.math.vec3.set(v1v2, normals[a], normals[a + 1], normals[a + 2]);
        raw.math.vec3.normalize(normal, v1v2);
        normals[a] = normal[0];
        normals[a + 1] = normal[1];
        normals[a + 2] = normal[2];
      }


    }
  })();

  geometry.calc_tangents = (function () {
    var n = raw.math.vec3();
    var t = raw.math.vec3();
    var tangent = raw.math.vec4();
    var tn1 = raw.math.vec3();
    var tn2 = raw.math.vec3();
    var sn = raw.math.vec3();
    var sdir = raw.math.vec3();
    var tdir = raw.math.vec3();
    return function (geo) {

      var vertices = geo.attributes.a_position_rw.data;
      var normals = geo.attributes.a_normal_rw.data;
      var tangents = geo.attributes.a_tangent_rw.data;
      var uvs = geo.attributes.a_uv_rw.data;
      var indices = geo.index_data;

      var tan1 = new Float32Array(vertices.length);
      tan1.fill(0);
      var tan2 = new Float32Array(vertices.length);
      tan2.fill(0);


      var i1, i2, i3;
      var v1, v2, v3;

      var x1, x2, y1, y2, z1, z2, w1, w2, w3, s1, s2, t1, t2, r;

      for (var j = 0; j < indices.length; j = j + 3) {
        i1 = indices[j];
        i2 = indices[j + 1];
        i3 = indices[j + 2];

        v1 = i1 * 3;
        v2 = i2 * 3;
        v3 = i3 * 3;

        x1 = vertices[v2] - vertices[v1];
        x2 = vertices[v3] - vertices[v1];
        y1 = vertices[v2 + 1] - vertices[v1 + 1];
        y2 = vertices[v3 + 1] - vertices[v1 + 1];
        z1 = vertices[v2 + 2] - vertices[v1 + 2];
        z2 = vertices[v3 + 2] - vertices[v1 + 2];

        w1 = i1 * 2; w2 = i2 * 2; w3 = i3 * 2;

        s1 = uvs[w2] - uvs[w1];
        s2 = uvs[w3] - uvs[w1];
        t1 = uvs[w2 + 1] - uvs[w1 + 1];
        t2 = uvs[w3 + 1] - uvs[w1 + 1];


        r = 1.0 / (s1 * t2 - s2 * t1);

        raw.math.vec3.set(sdir,
          (t2 * x1 - t1 * x2) * r,
          (t2 * y1 - t1 * y2) * r,
          (t2 * z1 - t1 * z2) * r);
        raw.math.vec3.set(tdir,
          (s1 * x2 - s2 * x1) * r,
          (s1 * y2 - s2 * y1) * r,
          (s1 * z2 - s2 * z1) * r);


        tan1[v1] += sdir[0]; tan1[v1 + 1] += sdir[1]; tan1[v1 + 2] += sdir[2];

        tan1[v2] += sdir[0]; tan1[v2 + 1] += sdir[1]; tan1[v2 + 2] += sdir[2];

        tan1[v3] += sdir[0]; tan1[v3 + 1] += sdir[1]; tan1[v3 + 2] += sdir[2];

        tan2[v1] += tdir[0]; tan2[v1 + 1] += tdir[1]; tan2[v1 + 2] += tdir[2];
        tan2[v2] += tdir[0]; tan2[v2 + 1] += tdir[1]; tan2[v2 + 2] += tdir[2];
        tan2[v3] += tdir[0]; tan2[v3 + 1] += tdir[1]; tan2[v3 + 2] += tdir[2];

      }


      var vi;
      for (var a = 0; a < vertices.length; a = a + 3) {

        vi = a / 3;
        raw.math.vec3.set(n, normals[a], normals[a + 1], normals[a + 2]);
        raw.math.vec3.set(t, tan1[a], tan1[a + 1], tan1[a + 2]);



        // Gram-Schmidt orthogonalize
        //tangent[a] = (t - n * Dot(n, t)).Normalize();

        raw.math.vec3.scale(sn, n, raw.math.vec3.dot(n, t));

        raw.math.vec3.subtract(tn2, t, sn);

        raw.math.vec3.normalize(tangent, tn2);

        raw.math.vec3.cross(tn1, n, t);
        raw.math.vec3.set(tn2, tan2[a], tan2[a + 1], tan2[a + 2]);

        tangent[3] = raw.math.vec3.dot(tn1, tn2) < 0 ? -1 : 1;

        tangents[vi * 4] = tangent[0];
        tangents[vi * 4 + 1] = tangent[1];
        tangents[vi * 4 + 2] = tangent[2];
        tangents[vi * 4 + 3] = tangent[3];

        //tangent[a] = (t - n * Dot(n, t)).Normalize();
        // Calculate handedness
        //tangent[a].w = (Dot(Cross(n, t), tan2[a]) < 0.0F) ? -1.0F : 1.0F;
      }


    }
  })();


  geometry.lines_builder = new function () {

    this.vertices = new raw.array();


    var xx, yy, zz;
    var xs, ys, zs;

    this.clear = function () {
      this.vertices.clear();
      return this;
    };

    this.add = function (x, y, z) {
      xx = x; yy = y; zz = z;
      this.vertices.push(x);
      this.vertices.push(y);
      this.vertices.push(z);
      return (this);
    };
    this.add2 = function (x1, y1, z1, x2, y2, z2) {
      this.add(x1, y1, z1);
      this.add(x2, y2, z2);
      return (this);
    };
    this.add_to = function (x, y, z) {
      this.add(xx, yy, zz);
      this.add(x, y, z);
      return (this);
    };

    this.move_to = function (x, y, z) {
      xx = x; yy = y; zz = z;
      xs = x; ys = y; zs = z;
      return (this);
    };

    this.close_path = function () {
      this.add(xx, yy, zz);
      this.vertices.push(xs);
      this.vertices.push(ys);
      this.vertices.push(zs);

      return (this);
    };

    this.update_geo = function (g) {
      var a = g.attributes.a_position_rw;
      for (xx = 0; xx < a.data.length; xx++) {
        a.data[xx] = this.vertices.data[xx];
      }
      a.needs_update = true;
    };
    this.build = function () {
      var g = new raw.geometry();

      g.add_attribute("a_position_rw", {
        data: new Float32Array(this.vertices.length),
        item_size: 3
      });


      for (xx = 0; xx < this.vertices.length; xx++) {
        g.attributes.a_position_rw.data[xx] = this.vertices.data[xx];
      }



      g.num_items = this.vertices.length / 3;
      geometry.calc_bounds(g, g.attributes.a_position_rw.data, 3);
      this.clear();
      return (g);
    };

    return (this);
  }
    
  geometry.create = (function () {
    var vertex_size = 0,a=null;
    return function (def) {


      vertex_size = def.vertex_size || 3;
      var g = new raw.geometry();

      if (def.vertices) {
        g.add_attribute("a_position_rw", {
          data: def.vertices,
          item_size: vertex_size
        });
        g.num_items = def.vertices.length / vertex_size;
      }

      if (def.normals) {
        g.add_attribute("a_normal_rw", { data: def.normals });
      }

      if (def.uvs) {
        g.add_attribute("a_uvs_rw", { data: def.uvs, item_size: 2 });
      }

      if (def.colors) {
        g.add_attribute("a_color_rw", { data: def.colors, item_size: 4 });
      }

      if (def.attr) {
        for (a in def.attr) {
          g.add_attribute("a_color_rw",def.attr[a]);
        }
      }

      raw.geometry.calc_bounds(g, g.attributes.a_position_rw.data, 3);
      return g;
    }
  })();

  geometry.cube = function (options) {
    options = options || {};


    options.size = options.size || 1;
    var width = options.width || options.size;
    var height = options.height || options.size;
    var depth = options.depth;

    if (depth === undefined) depth = options.size;
    var divs = options.divs || 1;

    var divs_x = Math.floor(options.divs_x) || divs;
    var divs_y = Math.floor(options.divs_y) || divs;
    var divs_z = Math.floor(options.divs_z) || divs;

    var vector = raw.math.vec3();
    var segmentWidth, segmentHeight, widthHalf, heightHalf, depthHalf;
    var gridX1, gridY1, vertexCounter, ix, iy, x, y;
    var indices = [];
    var vertices = [];
    var normals = [];
    var uvs = [];
    var numberOfVertices = 0;
    function buildPlane(u, v, w, udir, vdir, width, height, depth, gridX, gridY) {

      segmentWidth = width / gridX;
      segmentHeight = height / gridY;

      widthHalf = width / 2;
      heightHalf = height / 2;
      depthHalf = depth / 2;

      gridX1 = gridX + 1;
      gridY1 = gridY + 1;

      vertexCounter = 0;

      // generate vertices, normals and uvs

      for (iy = 0; iy < gridY1; iy++) {

        y = iy * segmentHeight - heightHalf;

        for (ix = 0; ix < gridX1; ix++) {

          x = ix * segmentWidth - widthHalf;

          vector[u] = x * udir;
          vector[v] = y * vdir;
          vector[w] = depthHalf;

          vertices.push(vector[0], vector[1], vector[2]);

          vector[u] = 0;
          vector[v] = 0;
          vector[w] = depth > 0 ? 1 : - 1;

          normals.push(vector[0], vector[1], vector[2]);

          // uvs

          uvs.push(ix / gridX);
          uvs.push((iy / gridY));

          // counters

          vertexCounter += 1;

        }

      }

      // indices

      // 1. you need three indices to draw a single face
      // 2. a single segment consists of two faces
      // 3. so we need to generate six (2*3) indices per segment

      for (iy = 0; iy < gridY; iy++) {

        for (ix = 0; ix < gridX; ix++) {

          var a = numberOfVertices + ix + gridX1 * iy;
          var b = numberOfVertices + ix + gridX1 * (iy + 1);
          var c = numberOfVertices + (ix + 1) + gridX1 * (iy + 1);
          var d = numberOfVertices + (ix + 1) + gridX1 * iy;

          // faces

          indices.push(a, b, d);
          indices.push(b, c, d);


        }

      }

      numberOfVertices += vertexCounter;

    }


    buildPlane(2, 1, 0, - 1, - 1, depth, height, width, divs_z, divs_y, 0); // px
    buildPlane(2, 1, 0, 1, - 1, depth, height, - width, divs_z, divs_y, 1); // nx
    buildPlane(0, 2, 1, 1, 1, width, depth, height, divs_x, divs_z, 2); // py
    buildPlane(0, 2, 1, 1, - 1, width, depth, - height, divs_x, divs_z, 3); // ny
    buildPlane(0, 1, 2, 1, - 1, width, height, depth, divs_x, divs_y, 4); // pz
    buildPlane(0, 1, 2, - 1, - 1, width, height, - depth, divs_x, divs_y, 5); // nz




    var g = new raw.geometry();

    g.add_attribute("a_position_rw", { data: new Float32Array(vertices) });
    g.add_attribute("a_normal_rw", { data: new Float32Array(normals) });
    g.add_attribute("a_uv_rw", { data: new Float32Array(uvs), item_size: 2 });
    g.add_attribute("a_tangent_rw", { data: new Float32Array(((vertices.length / 3) * 4)), item_size: 4 });
    g.set_indices(indices);
    g.shape_type = "cube";


    raw.geometry.calc_tangents(g);
    raw.geometry.calc_bounds(g, g.attributes.a_position_rw.data, 3);

    return (g);
  };

  geometry.plane = function (options) {
    options = options || {};
    options.size = options.size || 1;

    width = options.width || options.size;
    height = options.height || options.size;
    options.divs = options.divs || 1;
    options.divsX = options.divsX || options.divs;
    options.divsY = options.divsY || options.divs;
    divs_x = options.divsX;
    divs_y = options.divsY;

    var width_half = width / 2;
    var height_half = height / 2;

    var gridX = Math.floor(divs_x);
    var gridY = Math.floor(divs_y);

    var gridX1 = gridX + 1;
    var gridY1 = gridY + 1;

    var segment_width = width / gridX;
    var segment_height = height / gridY;

    var ix, iy;
    var vCount = (divs_x + 1) * (divs_y + 1);
    var g = new raw.geometry();



    g.add_attribute("a_position_rw", { data: new Float32Array(vCount * 3), item_size: 3 });
    var normals = null, uvs = null;
    g.add_attribute("a_normal_rw", { data: new Float32Array(vCount * 3), item_size: 3 });
    normals = g.attributes.a_normal_rw.data;
    g.add_attribute("a_uv_rw", { data: new Float32Array(vCount * 2), item_size: 2 });
    uvs = g.attributes.a_uv_rw.data;
    g.add_attribute("a_tangent_rw", { data: new Float32Array(vCount * 4), item_size: 4 });




    g.index_data = raw.geometry.create_index_data((gridX * gridY) * 6);
    g.index_needs_update = true;
    g.num_items = g.index_data.length;
    g.shape_type = "plane";

    var positions = g.attributes.a_position_rw.data;


    var indices = g.index_data;
    var ii = 0, vi = 0;


    for (iy = 0; iy < gridY1; iy++) {
      var y = iy * segment_height - height_half;
      for (ix = 0; ix < gridX1; ix++) {
        var x = ix * segment_width - width_half;

        positions[(vi * 3) + 0] = x;
        positions[(vi * 3) + 1] = -y;
        positions[(vi * 3) + 2] = 0;

        if (normals !== null) {

          normals[(vi * 3) + 0] = 0;
          normals[(vi * 3) + 1] = 0;
          normals[(vi * 3) + 2] = 1;
        }

        if (uvs !== null) {
          uvs[(vi * 2) + 0] = ix / gridX;
          uvs[(vi * 2) + 1] = 1 - (iy / gridY);
        }


        vi++;
      }

    }
    ii = 0;
    var a, b, c, d;

    for (iy = 0; iy < gridY; iy++) {
      for (ix = 0; ix < gridX; ix++) {
        a = ix + gridX1 * iy;
        b = ix + gridX1 * (iy + 1);
        c = (ix + 1) + gridX1 * (iy + 1);
        d = (ix + 1) + gridX1 * iy;
        // faces
        indices[ii++] = a; indices[ii++] = b; indices[ii++] = d;
        indices[ii++] = b; indices[ii++] = c; indices[ii++] = d;
      }

    }

    raw.geometry.calc_tangents(g);

    raw.geometry.calc_bounds(g, g.attributes.a_position_rw.data, 3);



    return (g);
  };

  geometry.sphere = (function () {
    var norm = raw.math.vec3();
    var vert = raw.math.vec3();
    return function (options) {
      options = options || {};
      options.rad = options.rad || 1;
      options.divs = options.divs || 8;
      options.divsX = options.divsX || options.divs;
      options.divsY = options.divsY || options.divs;


      var radX = options.radX || options.rad;
      var radY = options.radY || options.rad;
      var radZ = options.radZ || options.rad;

      var widthSegments = Math.max(3, Math.floor(options.divsX));
      var heightSegments = Math.max(2, Math.floor(options.divsY));

      var phiStart = options.phiStart !== undefined ? options.phiStart : 0;
      var phiLength = options.phiLength !== undefined ? options.phiLength : Math.PI * 2;

      var thetaStart = options.thetaStart !== undefined ? options.thetaStart : 0;
      var thetaLength = options.thetaLength !== undefined ? options.thetaLength : Math.PI;

      var thetaEnd = thetaStart + thetaLength;

      var ix, iy;

      var index = 0;
      var grid = [];


      var vCount = (widthSegments + 1) * (heightSegments + 1);
      var g = new raw.geometry();


      g.add_attribute("a_position_rw", { data: new Float32Array(vCount * 3), item_size: 3 });
      var normals = null, uvs = null;
      g.add_attribute("a_normal_rw", { data: new Float32Array(vCount * 3), item_size: 3 });
      normals = g.attributes.a_normal_rw.data;

      g.add_attribute("a_uv_rw", { data: new Float32Array(vCount * 2), item_size: 2 });
      uvs = g.attributes.a_uv_rw.data;


      g.add_attribute("a_tangent_rw", { data: new Float32Array(vCount * 4), item_size: 4 });




      g.index_data = raw.geometry.create_index_data(vCount * 6);
      g.num_items = g.index_data.length;
      g.index_needs_update = true;

      g.shape_type = "sphere";
      var positions = g.attributes.a_position_rw.data;


      var indices = g.index_data;
      var ii = 0, vi = 0;



      for (iy = 0; iy <= heightSegments; iy++) {

        var verticesRow = [];

        var v = iy / heightSegments;
        //
        // special case for the poles

        var uOffset = (iy == 0) ? 0.5 / widthSegments : ((iy == heightSegments) ? - 0.5 / widthSegments : 0);

        for (ix = 0; ix <= widthSegments; ix++) {

          var u = ix / widthSegments;

          vert[0] = - radX * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
          vert[1] = radY * Math.cos(thetaStart + v * thetaLength);
          vert[2] = radZ * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);


          positions[(vi * 3) + 0] = vert[0];
          positions[(vi * 3) + 1] = vert[1];
          positions[(vi * 3) + 2] = vert[2];

          if (normals !== null) {
            raw.math.vec3.normalize(norm, vert);
            normals[(vi * 3) + 0] = norm[0];
            normals[(vi * 3) + 1] = norm[1];
            normals[(vi * 3) + 2] = norm[2];
          }

          if (uvs !== null) {
            uvs[(vi * 2) + 0] = u + uOffset;
            uvs[(vi * 2) + 1] = 1 - v;
          }



          vi++;

          verticesRow.push(index++);

        }

        grid.push(verticesRow);

      }
      ii = 0;
      for (iy = 0; iy < heightSegments; iy++) {
        for (ix = 0; ix < widthSegments; ix++) {
          var a = grid[iy][ix + 1];
          var b = grid[iy][ix];
          var c = grid[iy + 1][ix];
          var d = grid[iy + 1][ix + 1];

          if (iy !== 0 || thetaStart > 0) {
            indices[ii++] = a; indices[ii++] = b; indices[ii++] = d;
          }
          if (iy !== heightSegments - 1 || thetaEnd < Math.PI) {
            indices[ii++] = b; indices[ii++] = c; indices[ii++] = d;
          }

        }

      }
      raw.geometry.calc_tangents(g);
      raw.geometry.calc_bounds(g, g.attributes.a_position_rw.data, 3);
      return (g);

    }
  })();


  

  return geometry;

});

raw.geometry.flat_quad = new raw.geometry();

raw.geometry.flat_quad.add_attribute('a_position_rw', {
  item_size: 3, data: new Float32Array([
    -1, -1,0,
    1, -1,0,
    1, 1,0,
    -1, -1,0,
    1, 1,0,
    -1, 1,0
  ])
});
raw.geometry.flat_quad.num_items = 12;

/*src/common.js*/


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
    this.item_type = 1024;
    this.flags = 0;
    
  }

  return renderable;
});

/*src/shading.js*/


// Materials
(function () {

  var glsl = raw.webgl.shader.create_chunks_lib(`/*chunk-flat-material*/

<?=chunk('precision')?>

attribute vec3 a_position_rw;
attribute vec2 a_uv_rw;
attribute vec4 a_color_rw;
uniform mat4 u_view_projection_rw;
uniform mat3 u_texture_matrix_rw;
uniform mat4 u_model_rw;
varying vec2 v_uv_rw;
varying vec4 v_color_rw;
varying vec4 v_position_rw;
vec4 att_position(void);
vec3 att_uv(void);

vec4 att_position(void){
  return vec4(a_position_rw,1.0);
}
vec3 att_uv(void){
  return vec3(a_uv_rw,1.0);
}

void vertex(void){
  v_position_rw=u_model_rw*att_position();
  gl_Position=u_view_projection_rw*v_position_rw;
  v_uv_rw=(u_texture_matrix_rw*att_uv()).xy;
  v_color_rw=a_color_rw;
  gl_PointSize =10.0;
}
<?=chunk('precision')?>

varying vec2 v_uv_rw;
varying vec4 v_position_rw;
varying vec4 v_color_rw;
uniform mat4 u_object_material_rw;
uniform sampler2D u_texture_rw;
void fragment(void) {

  gl_FragColor = texture2D(u_texture_rw, v_uv_rw)*v_color_rw ;
  gl_FragColor.rgb*=u_object_material_rw[0].rgb;  
gl_FragColor.w*=u_object_material_rw[0].w;
  
  

}


/*chunk-shaded-material*/

<?=chunk('precision')?>
attribute vec3 a_position_rw;
attribute vec3 a_normal_rw;
attribute vec2 a_uv_rw;
attribute vec4 a_color_rw;
uniform mat4 u_view_projection_rw;
uniform mat4 u_model_rw;
uniform mat3 u_texture_matrix_rw;

varying vec2 v_uv_rw;
varying vec4 v_position_rw;
varying vec3 v_normal_rw;
varying vec4 v_color_rw;

vec4 att_position(void);
vec4 att_normal(void);
vec3 att_uv(void);

vec4 att_position(void){
  return vec4(a_position_rw,1.0);
}
vec4 att_normal(void){
  return vec4(a_normal_rw,0.0);
}

vec3 att_uv(void){
  return vec3(a_uv_rw,1.0);
}

void vertex(){
v_position_rw=u_model_rw*att_position();
  gl_Position=u_view_projection_rw*v_position_rw;
v_normal_rw=(u_model_rw*att_normal()).xyz;
v_uv_rw=(u_texture_matrix_rw*att_uv()).xy;
v_color_rw=a_color_rw;

}

<?=chunk('precision')?>

<?=chunk('global-render-system-lighting')?>

varying vec2 v_uv_rw;
varying vec4 v_position_rw;
varying vec3 v_normal_rw;
varying vec4 v_color_rw;

uniform mat4 u_object_material_rw;
uniform sampler2D u_texture_rw;
uniform vec4 u_eye_position_rw;

void fragment(void) {

vec3 total_light=get_render_system_lighting(
u_object_material_rw,
v_position_rw.xyz,
normalize(v_normal_rw),
normalize(u_eye_position_rw.xyz - v_position_rw.xyz));

gl_FragColor = vec4(total_light, u_object_material_rw[0].w)* 
texture2D(u_texture_rw, v_uv_rw)* v_color_rw;
gl_FragColor.w*=u_object_material_rw[0].w;

}`);

  raw.shading.material = raw.define(function (proto, _super) {
    function material(def) {
    
      def = def || {};

      
      _super.apply(this, [def]);      


      this.uuid = raw.guidi();

      this.object_material = new Float32Array(16);
      this.ambient = new Float32Array(this.object_material.buffer, 0, 4);
      this.diffuse = new Float32Array(this.object_material.buffer, 4 * 4, 4);
      this.specular = new Float32Array(this.object_material.buffer, 8 * 4, 4);

      this.texture = def.texture || null;

      raw.math.vec3.copy(this.ambient, def.ambient || [0.5, 0.5, 0.5]);
      raw.math.vec3.copy(this.diffuse, def.diffuse || [0.5, 0.5, 0.5]);
      raw.math.vec3.copy(this.specular, def.specular || [0.863, 0.863, 0.863]);

      this.ambient[3] = 1;

      this.texture_matrix = raw.math.mat3();

      this.instances_count = -1;
      this.wireframe = def.wireframe || false;
      this.set_flag(2);
      if (def.flags !== undefined)  this.set_flag(def.flags);
      this.shader = raw.shading.material.shader;
      this.draw_type = 4;
      if (def.draw_type !== undefined) {
        this.draw_type = def.draw_type;
      }

      this.on_before_render = new raw.event(this);
      this.on_after_render = new raw.event(this);
      this.draw_elements = false;

      if (def.transparent !== undefined) {
        this.set_tansparency(def.transparent);
      }
      this.cull_face = def.cull_face || 1029;

    }

    material.shader = raw.webgl.shader.parse(glsl["flat-material"]);


    proto.set_tansparency = function (v) {
      this.ambient[3] = Math.min(v, 1);
      if (v < 1) this.set_flag(128);
      else this.unset_flag(128);
      return (this);
    };
    proto.set_shinness = function (shin) {
      this.specular[3] = shin;
      return (this);
    };

    proto.depth_and_cull = function (renderer) {
      if (this.flags & 1024) {
        renderer.gl.disable(2929);
      }
      else {
        renderer.gl.enable(2929);
      }


      if ((this.flags & 2048) !== 0) {
        renderer.gl.disable(2884);
      }
      else {        
        renderer.gl.enable(2884);
      }
    };

    proto.render_mesh = (function () {
      var eparams = [null, null, null]

      proto.complete_render_mesh = function (renderer, shader, mesh) {
        if (this.instances_count > -1) {
          if (this.instances_count > 0) {
            if (this.draw_elements) {
              renderer.gl.ANGLE_instanced_arrays.drawElementsInstancedANGLE(this.final_draw_type, this.final_draw_count, 5125, mesh.draw_offset, this.instances_count);
            }
            else {
              renderer.gl.ANGLE_instanced_arrays.drawArraysInstancedANGLE(this.final_draw_type, mesh.draw_offset, this.final_draw_count, this.instances_count);
            }
          }
        }
        else {
          if (this.draw_elements) {
            renderer.gl.drawElements(this.final_draw_type, this.final_draw_count, 5125, mesh.draw_offset);
          }
          else {

            renderer.gl.drawArrays(this.final_draw_type, mesh.draw_offset, this.final_draw_count);
          }
        }
      };
      return function (renderer, shader, mesh) {

        eparams[0] = renderer;
        eparams[1] = shader;
        eparams[2] = mesh;

        if (renderer.on_error) {
          return;
        }
        if (this.flags & 1024) {
          renderer.gl.disable(2929);
        }
        else {
          renderer.gl.enable(2929);
        }


        if ((this.flags & 2048) !== 0) {
          renderer.gl.disable(2884);
        }
        else {
          renderer.gl.enable(2884);          
          
        }


        shader.set_uniform("u_object_material_rw", this.object_material);
        shader.set_uniform("u_texture_matrix_rw", this.texture_matrix);
        shader.set_uniform("u_texture_rw", 0);
        renderer.use_texture(this.texture, 0);



        this.final_draw_type = this.wireframe ? 1 : this.draw_type;
        this.final_draw_count = mesh.draw_count;


        this.draw_elements = renderer.activate_geometry_index_buffer(mesh.geometry, this.wireframe);

        if (this.wireframe) this.final_draw_count *= 2;

        this.on_before_render.trigger(eparams);

        this.complete_render_mesh(renderer, shader, mesh);

        this.on_after_render.trigger(eparams);




      }
    })();

    return material;
  }, raw.flags_setting);


  raw.shading.shaded_material = raw.define(function (proto, _super) {

    function shaded_material(def) {
      def = def || {};
      _super.apply(this, [def]);
      this.shader = raw.shading.shaded_material.shader;
      this.flags = 4;
      this.light_pass_limit = 1000;
      this.lights_count = -1;
      this.set_shinness(def.shinness || 100);
      if (def.transparent !== undefined) {
        this.set_tansparency(def.transparent);
      }
      if (def.cast_shadows) {
        this.flags += 8
      };

      if (def.receive_shadows) {
        this.flags += 16
      };
      if (def.flags !== undefined) this.set_flag(def.flags);
      return (this);

    }

    shaded_material.shader = raw.webgl.shader.parse(glsl["shaded-material"]);


    return shaded_material;
  }, raw.shading.material);

})();



// Lights
(function () {
  raw.shading.light = raw.define(function (proto, _super) {

    proto.update_bounds = function (mat, trans) {
      if (this.light_type > -1) {
        r = this.range * 0.5;
        p = this.world_position;

        this.bounds[0] = p[0];
        this.bounds[1] = p[1];
        this.bounds[2] = p[2];
        this.bounds[3] = p[0];
        this.bounds[4] = p[1];
        this.bounds[5] = p[2];

        minx = p[0] - r;
        miny = p[1] - r;
        minz = p[2] - r;

        maxx = p[0] + r;
        maxy = p[1] + r;
        maxz = p[2] + r;


        this.expand_bounds(minx, miny, minz);
        this.expand_bounds(minx, miny, maxz);
        this.expand_bounds(minx, maxy, minz);
        this.expand_bounds(minx, maxy, maxz);

        this.expand_bounds(maxx, miny, minz);
        this.expand_bounds(maxx, miny, maxz);
        this.expand_bounds(maxx, maxy, minz);
        this.expand_bounds(maxx, maxy, maxz);

      }
    };
    proto.set_intensity = function (v) {
      this.ambient[3] = v;
      return (this);
    };
    proto.set_ambient = function (r, g, b) {
      raw.math.vec3.set(this.ambient, r, g, b);
      return (this);
    };

    proto.set_diffuse = function (r, g, b) {
      raw.math.vec3.set(this.diffuse, r, g, b);
      return (this);
    };

    proto.set_specular = function (r, g, b) {
      raw.math.vec3.set(this.specular, r, g, b);
      return (this);
    };

    proto.enable_shadows = function (def) {
      def = def || {};
      this.cast_shadows =true;
      this.shadow_bias = def.shadow_bias || 0.00000001;
      this.shadow_intensity = def.shadow_intensity || this.shadow_intensity;
      this.shadow_map_size = def.shadow_map_size || 1024;
      this.shadow_camera_distance = def.shadow_camera_distance || 30;
      return (this);
    };



    function light(def) {
      def = def || {};
      _super.apply(this, [def]);
      this.light_material = new Float32Array(16);
      this.ambient = new Float32Array(this.light_material.buffer, 0, 4);
      this.diffuse = new Float32Array(this.light_material.buffer, 4 * 4, 4);
      this.specular = new Float32Array(this.light_material.buffer, 8 * 4, 4);
      this.attenuation = new Float32Array(this.light_material.buffer, 12 * 4, 4);

      this.diffuse[3] = -1;
      this.specular[3] = -1;
      this.range = 20000;
      this.light_type = 0;
      this.enabled = true;
      this.item_type = 4;
      this.view_angle = Math.PI;

      raw.math.vec4.copy(this.ambient, def.ambient || [0.1, 0.1, 0.1, 1.0]);
      raw.math.vec4.copy(this.diffuse, def.diffuse || [0.87, 0.87, 0.87, -1]);
      raw.math.vec4.copy(this.specular, def.specular || [0.85, 0.85, 0.85, -1]);
      raw.math.vec4.copy(this.attenuation, def.attenuation || [0, 0, 0, 0]);

      this.cast_shadows = def.cast_shadows || false;
      this.shadow_bias = def.shadow_bias || 0.00000001;
      this.shadow_intensity = def.shadow_intensity || 0.25;
      this.shadow_map_size = def.shadow_map_size || 1024;
      this.shadow_camera_distance = def.shadow_camera_distance || 30;


    }

    return light;
  }, raw.rendering.renderable);


  raw.shading.point_light = raw.define(function (proto, _super) {


    proto.set_attenuation_by_distance = (function () {
      var values = [[7, 1.0, 0.7, 1.8],
      [13, 1.0, 0.35, 0.44],
      [20, 1.0, 0.22, 0.20],
      [32, 1.0, 0.14, 0.07],
      [50, 1.0, 0.09, 0.032],
      [65, 1.0, 0.07, 0.017],
      [100, 1.0, 0.045, 0.0075],
      [160, 1.0, 0.027, 0.0028],
      [200, 1.0, 0.022, 0.0019],
      [325, 1.0, 0.014, 0.0007],
      [600, 1.0, 0.007, 0.0002],
      [3250, 1.0, 0.0014, 0.000007]];
      var v1, v2, i, f;
      return function (d) {
        for (i = 0; i < values.length; i++) {
          if (d < values[i][0]) {
            v2 = i;
            break;
          }
        }
        if (v2 === 0) {
          return this.set_attenuation.apply(this, values[0]);
        }
        v1 = v2 - 1;
        f = values[v2][0] - values[v1][0];
        f = (d - values[v1][0]) / f;
        this.attenuation[0] = values[v1][1] + (values[v2][1] - values[v1][1]) * f;
        this.attenuation[1] = values[v1][2] + (values[v2][2] - values[v1][2]) * f;
        this.attenuation[2] = values[v1][3] + (values[v2][3] - values[v1][3]) * f;
        return (this);
      }
    })();


    proto.set_attenuation = function (a, b, c) {
      raw.math.vec3.set(this.attenuation, a, b, c);
      return (this);
    };


    function point_light(def) {
      def = def || {};
      _super.apply(this, [def]);

      this.shadow_intensity = 0.9;
      this.range = def.range || 20;

      if (def.attenuation) {
        this.set_attenuation(this.attenuation[0], this.attenuation[1], this.attenuation[2]);
      }
      else {
        this.set_attenuation_by_distance(this.range * 2);
      }



      this.specular[3] = 0;
      this.diffuse[3] = 0;
      this.light_type = 1;


      
    }

    return point_light;
  }, raw.shading.light);


  raw.shading.spot_light = raw.define(function (proto, _super) {


    proto.set_outer_angle = function (angle) {
      this.view_angle = angle;
      this.diffuse[3] = Math.cos(angle / 2);
      return (this);
    };

    proto.set_inner_angle = function (angle) {
      this.specular[3] = Math.cos(angle / 2);
      return (this);
    };

    function spot_light(def) {
      def = def || {};
      _super.apply(this, [def]);
     
      this.range = def.range || 10;
      if (def.attenuation) {
        this.set_attenuation(this.attenuation[0], this.attenuation[1], this.attenuation[2]);
      }
      else {
        this.set_attenuation_by_distance(this.range * 2);
      }
      this.set_outer_angle(def.outer || 0.017453292519943295 * 50).set_inner_angle(def.inner || 0.017453292519943295 * 50);

      this.light_type = 2;




    }

    return spot_light;
  }, raw.shading.point_light);


})();


// Post Process
(function () {

  var glsl = raw.webgl.shader.create_chunks_lib(`/*chunk-default*/

<?=chunk('precision')?>
attribute vec3 a_position_rw;
const vec2 madd=vec2(0.5,0.5);
varying vec2 v_uv_rw;
void vertex()
{
  gl_Position = vec4(a_position_rw.xy,0.0,1.0);
v_uv_rw = a_position_rw.xy*madd+madd; 
}
<?=chunk('precision')?>
uniform sampler2D u_texture_input_rw;
varying vec2 v_uv_rw;
void fragment(void){
gl_FragColor = texture2D(u_texture_input_rw, v_uv_rw) ;


}



/*chunk-picture-adjustment*/

uniform mat3 u_pa_params;

void fragment(){
vec4 c = texture2D(u_texture_input_rw, v_uv_rw);
  if (c.a > 0.0) {


  }
    float gamma=u_pa_params[0].x;
float contrast=u_pa_params[0].y;
float saturation=u_pa_params[0].z;
float brightness=u_pa_params[1].x;
float red=u_pa_params[1].y;
float green=u_pa_params[1].z;
float blue=u_pa_params[2].x;

    //c.rgb /= c.a;

    vec3 rgb = pow(c.rgb, vec3(1.0 / gamma));
    rgb = mix(vec3(0.5), mix(vec3(dot(vec3(0.2125, 0.7154, 0.0721), rgb)), rgb, saturation), contrast);
    rgb.r *= red;
    rgb.g *= green;
    rgb.b *= blue;

    c.rgb = rgb * brightness;    
   //  c.rgb *= c.a;


float alpha=u_pa_params[2].y;
  if(v_uv_rw.x>0.5)
    gl_FragColor = c * alpha;
  else 
    gl_FragColor =texture2D(u_texture_input_rw, v_uv_rw);
}


/*chunk-fxaa*/

uniform vec3 u_inverse_filter_texture_size;
uniform vec3 u_fxaa_params;

void fragment(void){
float R_fxaaSpanMax=u_fxaa_params.x;
float R_fxaaReduceMin=u_fxaa_params.y;
float R_fxaaReduceMul=u_fxaa_params.z;
vec2 texCoordOffset = u_inverse_filter_texture_size.xy;
vec3 luma = vec3(0.299, 0.587, 0.114);
float lumaTL = dot(luma, texture2D(u_texture_input_rw, v_uv_rw.xy + (vec2(-1.0, -1.0) * texCoordOffset)).xyz);
float lumaTR = dot(luma, texture2D(u_texture_input_rw, v_uv_rw.xy + (vec2(1.0, -1.0) * texCoordOffset)).xyz);
float lumaBL = dot(luma, texture2D(u_texture_input_rw, v_uv_rw.xy + (vec2(-1.0, 1.0) * texCoordOffset)).xyz);
float lumaBR = dot(luma, texture2D(u_texture_input_rw, v_uv_rw.xy + (vec2(1.0, 1.0) * texCoordOffset)).xyz);
float lumaM = dot(luma, texture2D(u_texture_input_rw, v_uv_rw.xy).xyz);

vec2 dir;
dir.x = -((lumaTL + lumaTR) - (lumaBL + lumaBR));
dir.y = ((lumaTL + lumaBL) - (lumaTR + lumaBR));

float dirReduce = max((lumaTL + lumaTR + lumaBL + lumaBR) * (R_fxaaReduceMul * 0.25), R_fxaaReduceMin);
float inverseDirAdjustment = 1.0/(min(abs(dir.x), abs(dir.y)) + dirReduce);

dir = min(vec2(R_fxaaSpanMax, R_fxaaSpanMax), 
max(vec2(-R_fxaaSpanMax, -R_fxaaSpanMax), dir * inverseDirAdjustment)) * texCoordOffset;

vec3 result1 = (1.0/2.0) * (
texture2D(u_texture_input_rw, v_uv_rw.xy + (dir * vec2(1.0/3.0 - 0.5))).xyz +
texture2D(u_texture_input_rw, v_uv_rw.xy + (dir * vec2(2.0/3.0 - 0.5))).xyz);

vec3 result2 = result1 * (1.0/2.0) + (1.0/4.0) * (
texture2D(u_texture_input_rw, v_uv_rw.xy + (dir * vec2(0.0/3.0 - 0.5))).xyz +
texture2D(u_texture_input_rw, v_uv_rw.xy + (dir * vec2(3.0/3.0 - 0.5))).xyz);

float lumaMin = min(lumaM, min(min(lumaTL, lumaTR), min(lumaBL, lumaBR)));
float lumaMax = max(lumaM, max(max(lumaTL, lumaTR), max(lumaBL, lumaBR)));
float lumaResult2 = dot(luma, result2);


if(lumaResult2 < lumaMin || lumaResult2 > lumaMax)
gl_FragColor = vec4(result1, 1.0);
else
gl_FragColor = vec4(result2, 1.0);

if(v_uv_rw.x<0.5){
  gl_FragColor=texture2D(u_texture_input_rw, v_uv_rw);
}
else {

gl_FragColor.rgb*=1.5;
}

`);

  raw.shading.post_process = raw.define(function (proto) {

    function post_process(shader) {
      this.guid = raw.guidi();
      this.shader = shader || raw.shading.post_process.shader;
      if (!this.on_apply) {
        this.on_apply = null;
      }
      this.enabled = true;
    }

    post_process.shader = raw.webgl.shader.parse(glsl["default"]);
    proto.resize = function (width, height) { }
    proto.bind_output = function (renderer, output) {
      if (output === null) {
        renderer.gl.bindFramebuffer(36160, null);
        renderer.gl.viewport(0, 0, renderer.gl.canvas.width, renderer.gl.canvas.height);
      }
      else {
        output.bind();
      }
    }

    var on_apply_params = [null, null, null];
    proto.apply = function (renderer, input, output) {
      renderer.use_shader(this.shader);
      this.bind_output(renderer, output);
      if (this.on_apply !== null) {
        on_apply_params[0] = renderer;
        on_apply_params[1] = input;
        on_apply_params[2] = output;
        input = this.on_apply.apply(this, on_apply_params);

      }
      if (this.shader.set_uniform("u_texture_input_rw", 0)) {
        renderer.use_direct_texture(input, 0);
      }

      renderer.draw_full_quad();
    }

    proto.on_apply = function (renderer, input, output) {
      return input;
    };

    return post_process;
  });

  raw.shading.post_process.picture_adjustment = raw.define(function (proto, _super) {

    function picture_adjustment(params) {
      params = params || {};
      _super.apply(this);
      this.shader = raw.post_process.picture_adjustment.shader;
      this.gamma = 1;
      this.contrast = 1;
      this.saturation = 1;
      this.brightness = 3;
      this.red = 1;
      this.green = 1;
      this.blue = 1;
      this.alpha = 1;
      raw.merge_object(params, this);

    }


    picture_adjustment.shader = raw.shading.post_process.shader.extend(glsl["picture-adjustment"]);

    var u_pa_params = raw.math.mat3();
    proto.on_apply = function (renderer, input, output) {
      u_pa_params[0] = this.gamma;
      u_pa_params[1] = this.contrast;
      u_pa_params[2] = this.saturation;
      u_pa_params[3] = this.brightness;
      u_pa_params[4] = this.red;
      u_pa_params[5] = this.green;
      u_pa_params[6] = this.blue;
      u_pa_params[7] = this.alpha;


      this.shader.set_uniform("u_pa_params", u_pa_params);
      return input;
    };

    return picture_adjustment;

  }, raw.shading.post_process);


  raw.shading.post_process.fxaa = raw.define(function (proto, _super) {


    function fxaa(params) {
      params = params || {};
      _super.apply(this);
      this.shader = raw.shading.post_process.fxaa.shader;
      this.span_max = 16;
      this.reduce_min = (1 / 256);
      this.reduce_mul = (1 / 8);
      this.enabled = false;
      raw.merge_object(params, this);

    }



    fxaa.shader = raw.shading.post_process.shader.extend(glsl["fxaa"]);


    var u_inverse_filter_texture_size = raw.math.vec3();
    var u_fxaa_params = raw.math.vec3();

    proto.on_apply = function (renderer, input, output) {
      u_inverse_filter_texture_size[0] = 1 / input.width;
      u_inverse_filter_texture_size[1] = 1 / input.height;
      this.shader.set_uniform("u_inverse_filter_texture_size", u_inverse_filter_texture_size);

      u_fxaa_params[0] = this.span_max;
      u_fxaa_params[1] = this.reduce_min;
      u_fxaa_params[2] = this.reduce_mul;

      this.shader.set_uniform("u_fxaa_params", u_fxaa_params);

      return input;
    };

    return fxaa;


  }, raw.shading.post_process);
})();



/*src/rendering.js*/

raw.rendering = raw.rendering || {};


(function () {

  var glsl = raw.webgl.shader.create_chunks_lib(`/*chunk-debug-points*/
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



/*chunk-debug-lines*/

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


/*chunk-debug-aabbs*/

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
}


/*chunk-transforms-manipulator*/

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
}`);

  raw.rendering.mesh = raw.define(function (proto, _super) {

    function mesh(def) {
      def = def || {};
      _super.apply(this, [def]);

      this.geometry = def.geometry || null;
      this.material = def.material || (new raw.shading.material());
      this.draw_offset = 0;
      if (this.geometry !== null) this.draw_count = this.geometry.num_items;
      this.item_type = 2;
      this.flags = def.flags || 0;

    }
    proto.update_bounds = function (mat, trans) {
      raw.math.aabb.transform_mat4(this.bounds, this.geometry.aabb, mat);
      this.bounds_sphere = this.geometry.bounds_sphere * trans.scale_world[0];
    };

    return mesh;
  }, raw.rendering.renderable);





  raw.rendering.debug_points = raw.define(function (proto, _super) {
    var mat = new raw.shading.material();

    mat.shader = raw.webgl.shader.parse(glsl["debug-points"] );

    mat.render_mesh = function (renderer, shader, mesh) {
      if (mesh.points_count < 1) return;

      renderer.gl.drawArrays(0, 0, mesh.points_count);
    };


    proto.clear = function () {
      this.points_position.i = 0;
      this.points_count = 0;
    };


    proto.add = (function () {
      var i = 0, _r = 1, _g = 1, _b = 1, _s = 10;
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
      _super.apply(this, [def]);


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

      this.flags = 1024 + 1;

    }

    return debug_points;
  }, raw.rendering.mesh);





  raw.rendering.debug_lines = raw.define(function (proto, _super) {
    var mat = new raw.shading.material();

    mat.shader = raw.webgl.shader.parse(glsl["debug-lines"] );

    mat.render_mesh = function (renderer, shader, mesh) {
      if (mesh.line_count < 1) return;
      renderer.gl.drawArrays(1, 0, mesh.line_count);
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

      return function (x0, y0, z0, r0, g0, b0, x1, y1, z1, r1, g1, b1) {
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
        item_size: 3, data: new Float32Array(def.max_lines * 3 * 2), stride: 6 * 4
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
      this.flags = 1;

    }

    return debug_lines;
  }, raw.rendering.mesh);





  raw.rendering.debug_aabbs = raw.define(function (proto, _super) {
    var mat = new raw.shading.material();

    mat.shader = raw.webgl.shader.parse(glsl["debug-aabbs"]);

    mat.render_mesh = function (renderer, shader, mesh) {
      if (mesh.boxes_count < 1) return;
      renderer.gl.disable(2929);
      renderer.gl.ANGLE_instanced_arrays.drawArraysInstancedANGLE(1, 0, mesh.geometry.num_items, mesh.boxes_count);

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

      this.flags = 1024 + 1;
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

    mat.set_flag(8192 + 128);
    // + 128

    mat.shader = raw.webgl.shader.parse(glsl["transforms-manipulator"]);

    // mat.shader.pickable = mat.shader;

    var geo = raw.geometry.sphere({ rad: 1 });
    var i = 0, trans = null;
    var u_marker_color = raw.math.vec4(1, 0, 0, 0.45);
    mat.render_mesh = function (renderer, shader, mesh) {

      if (renderer.pickables_pass) {

      }
      // renderer.gl.enable(2884);
      renderer.gl.disable(2929);
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
        renderer.gl.drawElements(4, geo.num_items, 5125, 0);
      }

      renderer.gl.enable(2929);
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


    var pos = [0, 0, 0], inv_rot = [0, 0, 0, 0];
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
      this.flags = 1;
      this.geometry = geo;
      this.material = mat;
      this.transforms = [];
      this.active_item = null;
    }

    return transforms_manipulator;
  }, raw.rendering.mesh);
})();


/*src/systems/transform_system.js*/


raw.ecs.register_component("transform", raw.define(function (proto, _super) {

  proto.create = (function (_super_call) {
    return function (def, entity) {
      _super_call.apply(this, [def, entity]);
      if (def.position) {
        raw.math.vec3.set(this.position, def.position[0], def.position[1], def.position[2]);
      }
      else {
        raw.math.vec3.set(this.position, 0, 0, 0);
      }
      if (def.scale) {
        raw.math.vec3.set(this.scale, def.scale[0], def.scale[1], def.scale[2]);
      }
      else {
        raw.math.vec3.set(this.scale, 1, 1, 1);
      }
      if (def.rotation) {
        raw.math.quat.set(this.rotation, def.rotation[0], def.rotation[1], def.rotation[2], def.rotation[3]);
      }
      else {
        raw.math.quat.set(this.rotation, 0, 0, 0, 1);
      }
      this.require_update = 1;
      this.parent = null;
      this.flags = 0;
      this.version = 0;

    }
  })(proto.create);

  proto.set_update = function (v) {
    this.require_update = Math.max(this.require_update, v);
  };

  proto.set_position = function (x, y, z) {
    raw.math.vec3.set(this.position, x, y, z);
    this.require_update = 1;
  };


  proto.set_scale = function (x, y, z) {
    raw.math.vec3.set(this.scale, x, y, z);
    this.require_update = 1;
  };

  proto.rotate_eular = function (x, y, z) {
    raw.math.quat.rotate_eular(this.rotation, x, y, z);
    this.require_update = 1;
  };


  var trans_id = 0;

  function transform(component) {
    _super.apply(this, [component]);
    raw.assign(this, {
      position: component.mem.vec3(),
      scale: component.mem.vec3(),
      rotation: component.mem.quat(),
      position_world: component.mem.vec3(),
      scale_world: component.mem.vec3(),
      rotation_world: component.mem.quat(),
    });

    this.trans_id = trans_id++;
  }

  transform.validate = function (component) {
    component.ecs.use_system('transform_system');
    component.ecs.use_system('animation_system');
    if (!component.instances) {
      component.instances = [];
      component.set_instance = function (ins) {
        this.instances[this.instances.length] = ins;
      }
      var inx = 0;
      component.set_anim_target = function (trans, anim_target) {
        if (!anim_target) return;
        inx = anim_target.props[0];
        if (inx > -1) {
          trans.position_animated = trans.position_animated || this.mem.vec3();
          trans.flags = raw.set_flag(trans.flags, 8);
        }

        inx = anim_target.props[1];
        if (inx > -1) {
          trans.scale_animated = trans.scale_animated || this.mem.vec3();
        }

        inx = anim_target.props[2];
        if (inx > -1) {
          trans.rotation_animated = trans.rotation_animated || this.mem.quat();
          trans.flags = raw.set_flag(trans.flags, 32);
        }

        trans.flags = raw.set_flag(trans.flags, 4);
        trans.anim_target = anim_target;

      }


      var max_transforms = component.ecs.globals['MAX_TRANSFORMS'] || 1024;

      component.mem = component.ecs.create_memory_block('transform', (
        (component.ecs.globals['MAX_TRANSFORMS'] || 1024) * 4) * 30);
    }

  };


  return transform;

}, raw.ecs.component));


raw.ecs.register_system("transform_system", raw.define(function (proto, _super) {


  proto.validate = function (ecs) {
    this.comp = ecs.use_component('transform');
    this.transforms = this.comp.instances;
  }
  var i = 0, trans = null, temp_pos = raw.math.vec3(),anim_target=null;
  var local_scale = null, local_rotation = null, local_position = null;  


  proto.step = function () {
    this.worked_items = 0;
    for (i = 0; i < this.transforms.length; i++) {
      trans = this.transforms[i];

      if (trans.flags & 4) {
        anim_target = trans.anim_target;
        if (anim_target.status === 1) {
          inx = anim_target.props[0];
          if (inx > -1) {
            trans.position_animated[0] = trans.position[0] + anim_target.output[inx];
            trans.position_animated[1] = trans.position[1] + anim_target.output[inx + 1];
            trans.position_animated[2] = trans.position[2] + anim_target.output[inx + 2];
            trans.require_update = 1;
          }

          inx = anim_target.props[1];
          if (inx > -1) {
            trans.scale_animated[0] = trans.scale[0] * anim_target.output[inx];
            trans.scale_animated[1] = trans.scale[1] * anim_target.output[inx + 1];
            trans.scale_animated[2] = trans.scale[2] * anim_target.output[inx + 2];
            trans.require_update = 1;
          }

          inx = anim_target.props[2];
          if (inx > -1) {
            raw.math.quat.multiply2(trans.rotation_animated, trans.rotation,
              anim_target.output[inx], anim_target.output[inx + 1], anim_target.output[inx + 2], anim_target.output[inx + 3]
            );
            trans.require_update = 1;
          }
        }

      }



    }


    this.process(this.transforms, 1);
   
   
  };

  proto.process_transforms = function (transforms, update_flag) {
    for (i = 0; i < transforms.length; i++) {
      trans = transforms[i];

      local_scale = trans.scale;
      local_position = trans.position;
      local_rotation = trans.rotation;

      if (trans.parent !== null) {

        if (trans.parent.require_update === update_flag) trans.require_update = trans.parent.require_update;

        if (trans.require_update === update_flag) {


          raw.math.quat.multiply(trans.rotation_world, trans.parent.rotation_world, local_rotation);
          trans.scale_world[0] = trans.parent.scale_world[0] * local_scale[0];
          trans.scale_world[1] = trans.parent.scale_world[1] * local_scale[1];
          trans.scale_world[2] = trans.parent.scale_world[2] * local_scale[2];
          if (trans.flags & raw.TRANS.SCABLABLE) {
            temp_pos[0] = local_position[0] * trans.parent.scale_world[0];
            temp_pos[1] = local_position[1] * trans.parent.scale_world[1];
            temp_pos[2] = local_position[2] * trans.parent.scale_world[2];
            raw.math.vec3.transform_quat(temp_pos, temp_pos, trans.parent.rotation_world);
          }
          else {
            raw.math.vec3.transform_quat(temp_pos, local_position, trans.parent.rotation_world);
          }
          trans.position_world[0] = temp_pos[0] + trans.parent.position_world[0];
          trans.position_world[1] = temp_pos[1] + trans.parent.position_world[1];
          trans.position_world[2] = temp_pos[2] + trans.parent.position_world[2];

          this.worked_items++;
        }
      }
      else if (trans.require_update === update_flag) {
        trans.scale_world[0] = local_scale[0];
        trans.scale_world[1] = local_scale[1];
        trans.scale_world[2] = local_scale[2];

        trans.position_world[0] = local_position[0];
        trans.position_world[1] = local_position[1];
        trans.position_world[2] = local_position[2];

        trans.rotation_world[0] = local_rotation[0];
        trans.rotation_world[1] = local_rotation[1];
        trans.rotation_world[2] = local_rotation[2];
        trans.rotation_world[3] = local_rotation[3];
        this.worked_items++;
      }


   





    }

  };


  proto.process = function (transforms,update_flag) {
    for (i = 0; i < transforms.length; i++) {
      trans = transforms[i];

      local_scale = trans.scale;
      local_position = trans.position;
      local_rotation = trans.rotation;


      if (trans.flags & 32 || trans.flags & 64) {
        local_rotation = trans.rotation_animated;
      }

      if (trans.parent !== null) {

        if (trans.parent.require_update === update_flag || trans.parent.require_update === 100) trans.require_update = update_flag;

        if (trans.require_update === update_flag) {
          raw.math.quat.multiply(trans.rotation_world, trans.parent.rotation_world, local_rotation);
          trans.scale_world[0] = trans.parent.scale_world[0] * local_scale[0];
          trans.scale_world[1] = trans.parent.scale_world[1] * local_scale[1];
          trans.scale_world[2] = trans.parent.scale_world[2] * local_scale[2];
          if (trans.flags & raw.TRANS.SCABLABLE) {
            temp_pos[0] = local_position[0] * trans.parent.scale_world[0];
            temp_pos[1] = local_position[1] * trans.parent.scale_world[1];
            temp_pos[2] = local_position[2] * trans.parent.scale_world[2];
            raw.math.vec3.transform_quat(temp_pos, temp_pos, trans.parent.rotation_world);
            
          }
          else {
            raw.math.vec3.transform_quat(temp_pos, local_position, trans.parent.rotation_world);
          }
          trans.position_world[0] = temp_pos[0] + trans.parent.position_world[0];
          trans.position_world[1] = temp_pos[1] + trans.parent.position_world[1];
          trans.position_world[2] = temp_pos[2] + trans.parent.position_world[2];

          this.worked_items++;
        }
      }
      else if (trans.require_update === update_flag) {
        trans.scale_world[0] = local_scale[0];
        trans.scale_world[1] = local_scale[1];
        trans.scale_world[2] = local_scale[2];

        trans.position_world[0] = local_position[0];
        trans.position_world[1] = local_position[1];
        trans.position_world[2] = local_position[2];

        trans.rotation_world[0] = local_rotation[0];
        trans.rotation_world[1] = local_rotation[1];
        trans.rotation_world[2] = local_rotation[2];
        trans.rotation_world[3] = local_rotation[3];
        this.worked_items++;
      }






    }

  };

  proto.step_end = function () {
    for (i = 0; i < this.transforms.length; i++) {
      trans = this.transforms[i];
      if (trans.require_update < 0) trans.require_update = Math.abs(trans.require_update);
      else trans.require_update = 0;
    }
  };

  proto.create_transform = function (def) {
    var ins = new this.comp.creator(this.comp);
    ins.create(def, null, this.ecs);
    this.comp.set_instance(ins, this.ecs);
    return ins;
  };

  return function transform_system(def, ecs) {
    _super.apply(this, [def, ecs]);
    this.priority = 100;    
  }

}, raw.ecs.system));




raw.ecs.register_component("transform_controller", raw.define(function (proto, _super) {

  proto.create = (function (_super_call) {
    return function (def, entity) {
      _super_call.apply(this, [def, entity]);
      if (def.rotate) {
        raw.math.vec3.copy(this.rotate, def.rotate);
      }
      this.transform = entity.transform;
      this.rotate_eular(this.rotate[0], this.rotate[1], this.rotate[2]);

      if (def.position) {
        this.set_position(def.position[0], def.position[1], def.position[2]);
      }

    }
  })(proto.create);


  proto.rotate_eular = function (x, y, z) {
    raw.math.quat.rotate_eular(this.transform.rotation, x, y, z);
    this.transform.require_update = 1;
  };
  proto.yaw_pitch = function (dx, dy) {
    this.rotate[0] += dx;
    this.rotate[1] += dy;
    raw.math.quat.rotate_eular(this.transform.rotation, this.rotate[0], this.rotate[1], this.rotate[2]);
    this.transform.require_update = 1;
  };

  proto.set_rotate = function (x, y, z) {
    this.rotate[0] = x;
    this.rotate[1] = y;
    this.rotate[2] = z;
    raw.math.quat.rotate_eular(this.transform.rotation, this.rotate[0], this.rotate[1], this.rotate[2]);
    this.transform.require_update = 1;
  };

  proto.set_position = function (x, y, z) {
    this.transform.position[0] = x;
    this.transform.position[1] = y;
    this.transform.position[2] = z;
    this.transform.require_update = 1;
  };

  proto.set_position_x = function (x) {
    this.transform.position[0] = x;
    this.transform.require_update = 1;
  };
  proto.set_position_y = function (y) {
    this.transform.position[1] = y;
    this.transform.require_update = 1;
  };
  proto.set_position_z = function (z) {    
    this.transform.position[2] = z;
    this.transform.require_update = 1;
  };

  proto.move_front_back = function (sp) {

    this.transform.position[0] += this.fw_vector[0] * sp;
    this.transform.position[1] += this.fw_vector[1] * sp;
    this.transform.position[2] += this.fw_vector[2] * sp;
    this.transform.require_update = 1;
  };

  proto.move_left_right = function (sp) {
    this.transform.position[0] += this.sd_vector[0] * sp;
    this.transform.position[1] += this.sd_vector[1] * sp;
    this.transform.position[2] += this.sd_vector[2] * sp;
    this.transform.require_update = 1;
  };

  proto.move_up_down = function (sp) {
    this.transform.position[0] += this.up_vector[0] * sp;
    this.transform.position[1] += this.up_vector[1] * sp;
    this.transform.position[2] += this.up_vector[2] * sp;
    this.transform.require_update = 1;
  };

  function transform_controller(component) {
    _super.apply(this, [component]);
    this.rotate = raw.math.vec3(0, 0, 0);
    this.matrix_world = raw.math.mat4();
    this.up_vector = new Float32Array(this.matrix_world.buffer, (4 * 4), 3);
    this.fw_vector = new Float32Array(this.matrix_world.buffer, (8 * 4), 3);
    this.sd_vector = new Float32Array(this.matrix_world.buffer, 0, 3);
  }
  transform_controller.validate = function (component) {
    component.ecs.use_system('transform_controller_system');
  };
  return transform_controller;

}, raw.ecs.component));



raw.ecs.register_system("transform_controller_system", raw.define(function (proto, _super) {

  var trans = null, entity = null, item = null, i = 0;
  proto.step = function () {
    this.worked_items = 0;
    while ((entity = this.ecs.iterate_entities("transform_controller")) !== null) {
      trans = entity.transform_controller;
      if (trans.transform.require_update !== 0) {
        raw.math.quat.to_mat4(trans.matrix_world, trans.transform.rotation_world);
        raw.math.mat4.scale(trans.matrix_world, trans.transform.scale_world);
        trans.matrix_world[12] = trans.transform.position_world[0];
        trans.matrix_world[13] = trans.transform.position_world[1];
        trans.matrix_world[14] = trans.transform.position_world[2];

        this.worked_items++;
      }
    }
  };
  proto.validate = function (ecs) {
    this.priority = ecs.use_system('transform_system').priority + 50;
  };


  return function render_item_system(def) {
    _super.apply(this, [def]);
  }

}, raw.ecs.system));

/*src/systems/camera_system.js*/



raw.ecs.register_component("camera", raw.define(function (proto, _super) {

  proto.create = (function (_super_call) {
    return function (def, entity) {
      _super_call.apply(this, [def, entity]);

      this.entity = entity;
      this.update_view_projection = true;
      this.type = def.type || "perspective";
      if (this.type === "perspective") {
        this.fov = (def.fov !== undefined ? def.fov : 60) * 0.017453292519943295;
        this.near = def.near !== undefined ? def.near : 0.1;
        this.far = def.far !== undefined ? def.far : 2000;
        this.aspect = def.aspect !== undefined ? def.aspect : 1;
      }
      else {
        this.left = def.left || -0.5;
        this.right = def.right || 0.5;
        this.bottom = def.bottom || -0.5;
        this.top = def.top || 0.5;
        this.near = def.near || 0.1;
        this.far = def.far || 20;

        this.aspect = Math.abs((this.right - this.left) / (this.top - this.bottom));
      }
      this.drag_direction = raw.math.vec3();
      this.last_drag_direction = raw.math.vec3();
      this.version = 0;
      this.update_view_projection = 1;

    }
  })(proto.create);

  proto.update_aspect = function (asp) {
    this.aspect = asp;
    this.update_view_projection = 1;
  };


  
  var len = 0;
  proto.update_frustum_plane = function (p, x, y, z, w) {
    len = x * x + y * y + z * z + w * w;
    len = 1 / Math.sqrt(len);
    this.frustum_plans[p][0] = x * len;
    this.frustum_plans[p][1] = y * len;
    this.frustum_plans[p][2] = z * len;
    this.frustum_plans[p][3] = w * len;
  };
  proto.calc_bounds = (function () {
    var minx, miny, minz, maxx, maxy, maxz;
    function update_bounds(x, y, z) {
      minx = Math.min(minx, x);
      miny = Math.min(miny, y);
      minz = Math.min(minz, z);

      maxx = Math.max(maxx, x);
      maxy = Math.max(maxy, y);
      maxz = Math.max(maxz, z);


    }
    return function () {

      var half_height = Math.tan((this.fov / 2.0));
      var half_width = half_height * this.aspect;
      var xn = half_width * this.near;
      var xf = half_width * this.far;
      var yn = half_width * this.near;
      var yf = half_width * this.far;


      minx = 99999;
      miny = 99999;
      minz = 99999;

      maxx = -99999;
      maxy = -99999;
      maxz = -99999;



      update_bounds(-xn, -yn, this.near);
      update_bounds(xn, -yn, this.near);
      update_bounds(xn, yn, this.near);
      update_bounds(-xn, yn, this.near);


      update_bounds(-xf, -yf, -this.far);
      update_bounds(xf, -yf, -this.far);
      update_bounds(xf, yf, -this.far);
      update_bounds(-xf, yf, -this.far);



      this._bounds[0] = minx;
      this._bounds[1] = miny;
      this._bounds[2] = minz;


      this._bounds[3] = maxx;
      this._bounds[4] = maxy;
      this._bounds[5] = maxz;



    }
  })();
  proto.update_frustum = function (me) {
    raw.math.aabb.transform_mat4(this.bounds, this._bounds, this.view);
    //RIGHT
    this.update_frustum_plane(0, me[3] - me[0], me[7] - me[4], me[11] - me[8], me[15] - me[12]);
    //LEFT
    this.update_frustum_plane(1, me[3] + me[0], me[7] + me[4], me[11] + me[8], me[15] + me[12]);
    //BOTTOM
    this.update_frustum_plane(2, me[3] + me[1], me[7] + me[5], me[11] + me[9], me[15] + me[13]);
    //TOP
    this.update_frustum_plane(3, me[3] - me[1], me[7] - me[5], me[11] - me[9], me[15] - me[13]);
    //FAR
    this.update_frustum_plane(4, me[3] - me[2], me[7] - me[6], me[11] - me[10], me[15] - me[14]);
    //NEAR
    this.update_frustum_plane(5, me[3] + me[2], me[7] + me[6], me[11] + me[10], me[15] + me[14]);


  };

  proto.frustum_aabb = (function () {
    var p = 0, dd = 0, plane;

    proto._frustum_aabb = function (minx, miny, minz, maxx, maxy, maxz) {
      for (p = 0; p < 6; p++) {
        plane = this.frustum_plans[p];
        dd = Math.max(minx * plane[0], maxx * plane[0])
          + Math.max(miny * plane[1], maxy * plane[1])
          + Math.max(minz * plane[2], maxz * plane[2])
          + plane[3];

        if (dd < 0) return false;
      }
      return true;
    };

    return function (aabb) {
      return this._frustum_aabb(aabb[0], aabb[1], aabb[2], aabb[3], aabb[4], aabb[5]);
    }

  })();

  proto.aabb_aabb = (function () {
    var a;
    return function (b) {
      a = this.bounds;
      return (a[0] <= b[3] && a[3] >= b[0]) &&
        (a[1] <= b[4] && a[4] >= b[1]) &&
        (a[2] <= b[5] && a[5] >= b[2]);
    }

  })();


  proto.get_mouse_ray = (function () {
    var v = raw.math.vec4(), start = raw.math.vec3(), end = raw.math.vec3();

    proto.set_drag_direction = function (mouse_x, mouse_y, width, height) {
      v[0] = (mouse_x / width) * 2 - 1;
      v[1] = -(mouse_y / height) * 2 + 1;
      v[2] = -1;
      raw.math.vec3.transform_mat4(start, v, this.view_projection_inverse);
      v[2] = 1;
      raw.math.vec3.transform_mat4(v, v, this.view_projection_inverse);

      raw.math.vec3.subtract(this.drag_direction, v, this.last_drag_direction);
      raw.math.vec3.normalize(this.drag_direction, this.drag_direction);
      raw.math.vec3.copy(this.last_drag_direction, v);
      return this.drag_direction;

    };

    return function (mouse_ray, mouse_x, mouse_y, width, height) {
      v[0] = (mouse_x / width) * 2 - 1;
      v[1] = -(mouse_y / height) * 2 + 1;
      v[2] = -1;

      raw.math.vec3.transform_mat4(start, v, this.view_projection_inverse);
      v[2] = 1;
      raw.math.vec3.transform_mat4(mouse_ray, v, this.view_projection_inverse);
      return mouse_ray;


    }

  })();



  function camera(component) {
    _super.apply(this, [component]);

    this.view = raw.math.mat4();
    this.view_inverse = raw.math.mat4();
    this.projection = raw.math.mat4();
    this.projection_inverse = raw.math.mat4();
    this.view_projection = raw.math.mat4();
    this.view_projection_inverse = raw.math.mat4();

    this.version = 0;

    this.up_vector = new Float32Array(this.view.buffer, (4 * 4), 3);
    this.fw_vector = new Float32Array(this.view.buffer, (8 * 4), 3);
    this.sd_vector = new Float32Array(this.view.buffer, 0, 3);

    this.frustum_plans = [raw.math.vec4(), raw.math.vec4(), raw.math.vec4(), raw.math.vec4(), raw.math.vec4(), raw.math.vec4()];
    this.world_position = new Float32Array(this.view.buffer, (12 * 4), 3);

    this.bounds = raw.math.aabb();
    this._bounds = raw.math.aabb();

  }

  camera.validate = function (component) {
    component.ecs.use_system('camera_system');
  };

  return camera;

}, raw.ecs.component));



raw.ecs.register_system("camera_system", raw.define(function (proto, _super) {
  var quat = raw.math.quat, mat4 = raw.math.mat4;

  var trans = null, cam = null, entity = null;
  proto.step = function () {

    while ((entity = this.ecs.iterate_entities("camera")) !== null) {
      cam = entity.camera;
      trans = entity.transform;
      if (cam.update_view_projection === 1) {        
        if (cam.type === "perspective") {
          mat4.perspective(cam.projection, cam.fov, cam.aspect, cam.near, cam.far);
        }
        else {
          mat4.ortho(cam.projection, cam.left, cam.right, cam.bottom, cam.top, cam.near, cam.far);
        }     
        mat4.inverse(cam.projection_inverse, cam.projection);
      }

      if (trans.require_update !== 0) {
        cam.version+=0.000001;
        quat.to_mat4(cam.view, trans.rotation_world);
        mat4.scale(cam.view, trans.scale_world);
        cam.view[12] = trans.position_world[0];
        cam.view[13] = trans.position_world[1];
        cam.view[14] = trans.position_world[2];


        cam.update_view_projection = 1;
      }

      if (cam.update_view_projection === 1) {
        cam.version += 0.000001;
        cam.update_view_projection = 0;
        mat4.inverse(cam.view_inverse, cam.view);
        mat4.multiply(cam.view_projection, cam.projection, cam.view_inverse);

        mat4.inverse(cam.view_projection_inverse, cam.view_projection);
        cam.update_frustum(cam.view_projection);
        if (cam.type === "perspective") {
          cam.calc_bounds();
        }
      }
    }


  };
  proto.validate = function (ecs) {
    this.priority = ecs.use_system('transform_system').priority + 50;
  };
  return function camera_system(def, ecs) {
    _super.apply(this, [def, ecs]);

  }

}, raw.ecs.system));



/*src/systems/animation_system.js*/

raw.ecs.register_system("animation_system", raw.define(function (proto, _super) {

  var mixer = null, item = null;

  proto.validate = function (ecs) {
    this.priority = ecs.use_system('transform_system').priority - 50;
  };


  function animation_system(def, ecs) {
    _super.apply(this, [def, ecs]);
    this.mixers = new raw.linked_list();
    //this.step_size *= 2;
  }

  proto.step = function () {
    item = this.mixers.head;
    while (item !== null) {
      mixer = item.data;

      mixer.update(this.time_delta);
      item = item.next;
    }

  };
  proto.create_mixer = function () {
    mixer = new animation_system.mixer();
    this.mixers.add_data(mixer);
    return mixer;
  }


  animation_system.vector_props = {
    'position': { index: 0, size: 3 },
    'scale': { index: 1, size: 3 },
    'rotation': { index: 2, size: 4 },
    'eular': { index: 3, size: 3 },
    'axis': { index: 4, size: 3 }
  };
  animation_system.vector_props_get_size = (function () {
    var k = "", cc = 0;
    return function () {
      cc = 0;
      for (k in animation_system.vector_props) {
        cc++
      }
      return cc++;
    }
  })();
  animation_system.compile_animation = (function () {

    var oi = 0, vprop = null, tr = null, tar = null;
    return function (anim) {
      anim.targets = {};
      oi = 0;


      anim.blocks.forEach(function (b, bi) {

        if (b.repeat === undefined) b.repeat = 0;
        b.repeat_delay = b.repeat_delay || 0;
        b.start = b.start || 0;
        b.length = b.length || 1;
        b.ilength = 1 / b.length;
        b.block_type = 0;
        if (b.enabled === undefined) b.enabled = true;
        if (b.data_type === "vec2") {
          b.fr_type = 1;
          b.fr_size = 2;
        }
        else if (b.data_type === "vec3") {
          b.fr_type = 2;
          b.fr_size = 3;
        }
        else if (b.data_type === "vec4") {
          b.fr_type = 3;
          b.fr_size = 4;
        }
        else if (b.data_type === "quat") {
          b.fr_type = 4;
          b.fr_size = 4;
        }
        else {
          b.fr_type = 0;
          b.fr_size = 1;
        }
        if (b.type === "flat") {
          b.block_type = 1;
          b.total_frames = Math.floor(b.frames.length / b.fr_size) - 1;
          b.time_per_frame = 1 / (b.total_frames);
        }
        tr = b.target.split(".");

        vprop = animation_system.vector_props[tr[1]];
        if (vprop) {
          tar = anim.targets[tr[0]];
          if (!tar) {
            tar = new Int16Array(animation_system.vector_props_get_size());
            tar.fill(-1);
            anim.targets[tr[0]] = tar;
          }


          if (tar[vprop.index] === -1) {
            tar[vprop.index] = oi;
          }
          b.oi = tar[vprop.index];
          if (tr.length === 3) {
            b.oi += ('xyzw'.indexOf(tr[2]));
          }
          oi += vprop.size;
        }


      });
      anim.oi = oi;
      vprop = null; tr = null; tar = null;
      anim.compiled = true;


    }
  })();


  animation_system.run = (function () {
    var bi = 0, fi = 0, f1 = 0, f2 = 0, j = 0, fr_size = 0, pi = 0, oi = 0;
    var temp_quat1 = raw.math.quat(), temp_quat2 = raw.math.quat();
    var frames = null, output = null, btime = 0, time1 = 0, v1 = 0, v2 = 0, v3 = 0, v4 = 0;

    return function (anim, output, time) {

      for (bi = 0; bi < anim.blocks.length; bi++) {
        block = anim.blocks[bi];
        if (block.enabled === false) continue;
        if (time > block.start) {
          if (block.repeat === 0) {
            btime = ((time - block.start) % block.length) * block.ilength;
          }
          else if (time - block.start < block.repeat * block.length) {
            btime = ((time - block.start) % block.length) * block.ilength;
          }
          else { continue; }


          if (block.process) {
            block.process(output, btime, block.oi);
            continue;
          }

          oi = block.oi;
          frames = block.frames;
          v1 = 0; v2 = 0; v3 = 0; v4 = 0;
          if (block.block_type === 1) {
            f1 = Math.floor(block.total_frames * btime);
            f2 = ((f1 + 1) * block.fr_size);
            time1 = block.time_per_frame * f1;
            f1 *= block.fr_size;
            j = (btime - time1) / ((time1 + block.time_per_frame) - time1);

            if (block.fr_type === 0) {
              v1 = frames[f1] + (frames[f2] - frames[f1]) * j;
            }
            else if (block.fr_type === 1) {
              v1 = frames[f1] + (frames[f2] - frames[f1]) * j;
              v2 = frames[f1 + 1] + (frames[f2 + 1] - frames[f1 + 1]) * j;
            }
            else if (block.fr_type === 2) {
              v1 = frames[f1] + (frames[f2] - frames[f1]) * j;
              v2 = frames[f1 + 1] + (frames[f2 + 1] - frames[f1 + 1]) * j;
              v3 = frames[f1 + 2] + (frames[f2 + 2] - frames[f1 + 2]) * j;
            }
            else if (block.fr_type === 3) {
              v1 = frames[f1] + (frames[f2] - frames[f1]) * j;
              v2 = frames[f1 + 1] + (frames[f2 + 1] - frames[f1 + 1]) * j;
              v3 = frames[f1 + 2] + (frames[f2 + 2] - frames[f1 + 2]) * j;
              v4 = frames[f1 + 3] + (frames[f2 + 3] - frames[f1 + 3]) * j;
            }
            else if (block.fr_type === 4) {
              raw.math.quat.slerp_flat(temp_quat1,
                frames[f1], frames[f1 + 1], frames[f1 + 2], frames[f1 + 3],
                frames[f2], frames[f2 + 1], frames[f2 + 2], frames[f2 + 3],
                j
              );
              v1 = temp_quat1[0];
              v2 = temp_quat1[1];
              v3 = temp_quat1[2];
              v4 = temp_quat1[3];
            }

            output[oi] += v1;
            output[oi + 1] += v2;
            output[oi + 2] += v3;
            output[oi + 3] += v4;
          }
          else {
            fr_size = block.fr_size + 1;

            j = 0; pi = 0;

            if (frames.length > 2) {
              for (fi = 0; fi < frames.length; fi += fr_size) {
                if (fi > 0) {
                  if (btime >= j && btime <= frames[fi] + 0.000001) {
                    pi = fi;
                    break;
                  }
                }
                j = frames[fi];
              }

            }
            else {
              pi = fr_size;
            }

            if (pi > 0) {
              f1 = pi - fr_size;
              f2 = pi;
              j = (btime - frames[f1]) / (frames[f2] - frames[f1]);

              if (block.fr_type === 0) {
                v1 = frames[f1 + 1] + (frames[f2 + 1] - frames[f1 + 1]) * j;
              }
              else if (block.fr_type === 1) {
                v1 = frames[f1 + 1] + (frames[f2 + 1] - frames[f1 + 1]) * j;
                v2 = frames[f1 + 2] + (frames[f2 + 2] - frames[f1 + 2]) * j;
              }
              else if (block.fr_type === 2) {
                v1 = frames[f1 + 1] + (frames[f2 + 1] - frames[f1 + 1]) * j;
                v2 = frames[f1 + 2] + (frames[f2 + 2] - frames[f1 + 2]) * j;
                v3 = frames[f1 + 3] + (frames[f2 + 3] - frames[f1 + 3]) * j;
              }
              else if (block.fr_type === 3) {
                v1 = frames[f1 + 1] + (frames[f2 + 1] - frames[f1 + 1]) * j;
                v2 = frames[f1 + 2] + (frames[f2 + 2] - frames[f1 + 2]) * j;
                v3 = frames[f1 + 3] + (frames[f2 + 3] - frames[f1 + 3]) * j;
                v4 = frames[f1 + 4] + (frames[f2 + 4] - frames[f1 + 4]) * j;
              }
              else if (block.fr_type === 4) {
                raw.math.quat.slerp_flat(temp_quat1,
                  frames[f1 + 1], frames[f1 + 2], frames[f1 + 3], frames[f1 + 4],
                  frames[f2 + 1], frames[f2 + 2], frames[f2 + 3], frames[f2 + 4],
                  j
                );
                v1 = temp_quat1[0];
                v2 = temp_quat1[1];
                v3 = temp_quat1[2];
                v4 = temp_quat1[3];

              }

              output[oi] += v1;
              output[oi + 1] += v2;
              output[oi + 2] += v3;
              output[oi + 3] += v4;


            }
          }

        }
      }

    }

  })();

  animation_system.mixer = raw.define(function (proto) {
    var i = 0, t = "", tar = null, tar_ref = null, inx = 0, anim_rec = null, weight = 0;
    proto.add_animation = function (anim, length, weight) {
      if (!anim.compiled) {
        animation_system.compile_animation(anim);
      }
      anim_rec = [anim, length, weight, new Float32Array(anim.oi)];
      this.animations.push(anim_rec);
      for (t in anim.targets) {
        tar = anim.targets[t];
        tar_ref = this.targets[t];
        if (!tar_ref) {
          tar_ref = { name: t, status: 1, props: new Int16Array(3), output: new Float32Array(10) };
          tar_ref.props.fill(-1);
          this.targets[t] = tar_ref;
          this._targets.push(tar_ref);
        }
        this.anim_targets.push([tar_ref, tar, anim_rec[3], weight]);

        if (tar[0] > -1) {
          tar_ref.props[0] = 0;
        }
        if (tar[1] > -1) {
          tar_ref.props[1] = 3;
        }
        if (tar[2] > -1) {
          tar_ref.props[2] = 6;
        }
        if (tar[3] > -1) {
          tar_ref.props[2] = 6;
        }
      }
    }
    var tar = null, input = null, output = null, anim_rotation = raw.math.quat();
    proto.update = function (time_delta) {
      for (i = 0; i < this.animations.length; i++) {
        anim_rec = this.animations[i];

        anim_rec[3].fill(0);
        animation_system.run(anim_rec[0], anim_rec[3],
          ((this.clock % anim_rec[1]) / anim_rec[1])
          + Math.floor(this.clock / anim_rec[1])
        );
      }
      for (i = 0; i < this._targets.length; i++) {
        this._targets[i].output.fill(0);


      }
      for (i = 0; i < this.anim_targets.length; i++) {
        anim_rec = this.anim_targets[i];
        tar = anim_rec[1];
        input = anim_rec[2];
        output = anim_rec[0].output;
        weight = anim_rec[3];


        inx = tar[0];
        if (inx > -1) {
          output[0] += input[inx] * weight;
          output[1] += input[inx + 1] * weight;
          output[2] += input[inx + 2] * weight;
        }

        inx = tar[1];
        if (inx > -1) {
          output[3] += input[inx] * weight;
          output[4] += input[inx + 1] * weight;
          output[5] += input[inx + 2] * weight;
        }

        inx = tar[2];
        if (inx > -1) {
          output[6] += input[inx] * weight;
          output[7] += input[inx + 1] * weight;
          output[8] += input[inx + 2] * weight;
          output[9] += input[inx + 3] * weight;
        }

        inx = tar[3];
        if (inx > -1) {
          raw.math.quat.rotate_eular(anim_rotation,
            input[inx],
            input[inx + 1],
            input[inx + 2]);

          output[6] += anim_rotation[0] * weight;
          output[7] += anim_rotation[1] * weight;
          output[8] += anim_rotation[2] * weight;
          output[9] += anim_rotation[3] * weight;
        }




      }
      this.clock += time_delta;
    }
    function mixer() {
      this.clock = 0;
      this.animations = [];
      this.targets = {};
      this._targets = [];
      this.anim_targets = [];
    }

    return mixer;
  });


  var inx = 0;
  proto.set_anim_targets = function (trans, anim_target) {
    if (!anim_target) return;
    trans.flags = raw.set_flag(trans.flags, 4);
    trans.anim_target = anim_target;

  }



  return animation_system;
}, raw.ecs.system));

/*src/systems/skeleton_system.js*/

(function () {
  raw.skeleton_system = {};
  var glsl = raw.webgl.shader.create_chunks_lib(`/*chunk-bone-render*/
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
 v_position_rw.xyz+=u_bone_start;
 gl_Position=u_view_projection_rw*v_position_rw;
}

/*chunk-axis-render*/

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


/*chunk-skinned-mesh*/
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
            //console.log('cvl', cvl*57.29577951308232);





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




          console.log('cvl', cvl * 57.29577951308232);
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
      mat.flags += 8;
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
        renderer.gl.enable(2884);
        renderer.gl.enable(2929);
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


              renderer.gl.drawElements(4, mesh.draw_count, 5125, 0);
            }
          }
        }

        if (shader.shadow_shader) return;
        renderer.use_shader(this.shader_axis);

        this.shader_axis.set_uniform("u_view_projection_rw", renderer.active_camera.view_projection);
        renderer.use_geometry(axis_geo);

        //renderer.gl.disable(2929);

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

              renderer.gl.drawArrays(1, 0, axis_geo.num_items);
            }
          }
        }

        //renderer.gl.enable(2929);

      };


      return function (ecs) {
        if (this.skeleton_display_mesh) return;
        this.skeleton_display_mesh = new raw.rendering.mesh({
          geometry: geo, material: mat
        });
        this.skeleton_display_mesh.DP = new raw.rendering.debug_points();
        this.skeleton_display_mesh.DL = new raw.rendering.debug_lines();

        this.skeleton_display_mesh.flags += 1;
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
            ///joint.transform.flags = raw.set_flag(joint.transform.flags, 4);
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
      this.item_type = 2;

      if (!this.geometry.attributes['a_joints_indices']) {
        this.skin_geometry(this.geometry, this.skeleton);
        console.log(skin_geometry);

      }
      this.flags += 1;

      skin_shader(this.material);

    };
    function mesh(def) {
      _super.apply(this, [def]);
      this.skeleton = def.skeleton;
      this.item_type = 1024;
    }


    return mesh;
  }, raw.rendering.mesh);

})();




/*src/systems/render_list_system.js*/




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

  proto.update_bounds = function (mat) { }
  function render_item(def) {
    _super.apply(this);
  }

  render_item.validate = function (component) {
    component.ecs.use_system('render_item_system');
  };

  return render_item;

}, raw.ecs.component));

raw.ecs.register_component("render_list", raw.define(function (proto, _super) {

  proto.create = (function (_super) {
    return function (def, entity) {
      _super.apply(this, [def, entity]);
      this.camera_version = -14300;
      this.entity = entity;
      this.camera = def.camera || null;
      this.layer = (Math.pow(2, def.layer)) || 2;
      this.item_types = 4 + 2;
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


  var list = null, camera = null, i = 0, render_item = null, item = null, ti = 0; items = null;
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

          if (item.item_type === 2 && (item.flags & 1)) {
            list.worked_items++;
            list.meshes.push(item);
          }
          else if (item.bounds) {


            if (camera.aabb_aabb(item.bounds)) {
              if (this.display_aabb) this.debug_aabbs.add_aabb(item.bounds);
              if (camera.frustum_aabb(item.bounds)) {
                raw.math.vec3.transform_mat4(item.view_position, item.world_position, camera.view_inverse);
                if (item.item_type === 2) {
                  list.worked_items++;
                  list.meshes.push(item);
                }
                else if (item.item_type === 4) {
                  if (item.enabled) list.lights.push(item);
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
    this.step_size *= 4;
  }

}, raw.ecs.system));

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
          if (item.item_type === 1024) {
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

/*src/systems/particle_system.js*/

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

            renderer.gl.bindBuffer(34962, emit_ins.buffer);
            renderer.gl.vertexAttribPointer(0, 3, 5126, false, 12, 0);

            renderer.gl.drawArrays(0, 0, emit_ins.p_count);
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
        this.renderer.gl.bindBuffer(34962, emit_ins.buffer);
        this.renderer.gl.bufferData(34962, process_data, 35048, 0, p_count);
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

      renderer.gl.enable(3042);
      renderer.gl.blendFunc(770, 771);
      
     // renderer.gl.disable(2929);
     // renderer.gl.depthFunc(516);
      renderer.gl.depthMask(false);
      this.worked_items = 0;
      for (i = 0; i < this._emitters.length;i++) {
        emit = this._emitters[i];
        if (emit.p_count > 0) {
          renderer.use_texture(emit.texture,0);
          shader = emit.shader;
          renderer.use_shader(shader);
          renderer.gl.bindBuffer(34962, emit.buffer);
          renderer.gl.vertexAttribPointer(0, 4, 5126, false, 16, 0);
          renderer.gl.drawArrays(0, 0, emit.p_count);
          this.worked_items += emit.p_count;
        }        
      } 
      renderer.gl.disable(3042);
      renderer.gl.depthMask(true);
      //renderer.gl.depthFunc(513);
     // renderer.gl.enable(2929);
    };



    var glsl = raw.webgl.shader.create_chunks_lib(`/*chunk-default-emitter*/
<?=chunk('precision')?>

attribute vec4 a_position_rw;
uniform mat4 u_view_projection_rw;
uniform mat4 u_model_rw;
varying vec4 v_position_rw;

void vertex(void){  
  v_position_rw=a_position_rw;
  gl_Position=u_view_projection_rw*vec4(a_position_rw.xyz,1.0);  
  gl_PointSize =max(100.0/gl_Position.z,10.0);
  //gl_PointSize=30.0;
}
<?=chunk('precision')?>

varying vec4 v_position_rw;
uniform sampler2D u_texture_rw;
void fragment(void) {
  gl_FragColor =vec4(1.0);
   gl_FragColor = texture2D(u_texture_rw, gl_PointCoord);
   gl_FragColor.r=1.0;
   gl_FragColor.a*=min(v_position_rw.a,0.9);
}
`);


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
      this.renderer.gl.bindBuffer(34962, emit.buffer);
      this.renderer.gl.bufferData(34962, emit.process_data, 35048, 0, emit.p_count); 
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



/*src/systems/terrain_system.js*/


(function () {
  var glsl = raw.webgl.shader.create_chunks_lib(`/*chunk-default-material*/

<?=chunk('precision')?>
attribute vec3 a_position_rw;
uniform mat4 u_view_projection_rw;

uniform vec3 reg_pos;
uniform vec3 cam_reg_pos;

varying vec4 v_position_rw;
varying vec3 v_normal_rw;
varying vec2 v_uv_rw;
varying mat3 v_tbn_matrix;


<?=chunk('mat3-transpose')?>

void vertex(void){
 v_position_rw.z=floor(a_position_rw.x/cam_reg_pos.z);
 v_position_rw.x=floor(mod(a_position_rw.x,cam_reg_pos.z));
 v_position_rw.y=a_position_rw.y; 


 v_normal_rw.x = fract(a_position_rw.z);
 v_normal_rw.y = fract(a_position_rw.z* 256.0); 
 v_normal_rw.z = fract(a_position_rw.z * 65536.0); 


  v_normal_rw.x = (v_normal_rw.x * 2.0) - 1.0;
 v_normal_rw.y = (v_normal_rw.y * 2.0) - 1.0;
 v_normal_rw.z = (v_normal_rw.z * 2.0) - 1.0; 


 v_position_rw.w=1.0; 
 v_position_rw.xz+=reg_pos.xz;  
 gl_Position = u_view_projection_rw *v_position_rw;

 v_uv_rw=v_position_rw.xz;    
 v_uv_rw/=(cam_reg_pos.z-1.0);  
 v_normal_rw=normalize(v_normal_rw);

}

<?=chunk('precision')?>

uniform mat4 u_object_material_rw;
uniform vec4 u_eye_position_rw;

varying vec4 v_position_rw;
varying vec3 v_normal_rw;
varying vec2 v_uv_rw;
varying mat3 v_tbn_matrix;

<?=chunk('global-render-system-lighting')?>

<?=chunk('global-render-system-fog-effect')?>


uniform vec3 land_color;

uniform sampler2D u_texture_tiles_rw;
uniform sampler2D u_normalmap_tiles_rw;
uniform sampler2D u_shadow_map_rw;

uniform vec2 u_tile_size_rw;
uniform vec4 u_texture_repeat_rw;
uniform vec4 u_normalmap_repeat_rw;

float tile_size;
vec2 tile_uv;
vec2 uv=vec2(0);
float tile_offset;

vec4 mix_texture_tiles(vec4 tile1,vec4 tile2,vec4 tile3,vec4 tile4,vec3 normal);
vec4 read_tile(sampler2D texture,float tile_repeat, float tx,float ty);

vec4 mix_texture_tiles(vec4 tile1,vec4 tile2,vec4 tile3,vec4 tile4,vec3 normal){
return mix(tile4,tile2,abs(normal.y));
}


vec4 read_tile(sampler2D texture,float tile_repeat, float tx,float ty){
  uv.x=mod(v_uv_rw.x*tile_repeat,tile_size-(tile_offset*2.0));
  uv.y=mod(v_uv_rw.y*tile_repeat,tile_size-(tile_offset*2.0));
  uv.x+=tx*tile_size+tile_offset;
  uv.y+=ty*tile_size+tile_offset;
  return texture2D(texture, uv);
}



vec2 texelSize=vec2(1.0/128.0,1.0/128.0);
float sample_smap(vec2 coords){
vec2 pixelPos = coords / texelSize + vec2(0.5);
vec2 fracPart = fract(pixelPos);
vec2 startTexel = (pixelPos - fracPart) * texelSize;
float blTexel = texture2D(u_shadow_map_rw, startTexel).r;
float brTexel = texture2D(u_shadow_map_rw, startTexel + vec2(texelSize.x, 0.0)).r;
float tlTexel = texture2D(u_shadow_map_rw, startTexel + vec2(0.0, texelSize.y)).r;
float trTexel = texture2D(u_shadow_map_rw, startTexel + texelSize).r;
float mixA = mix(blTexel, tlTexel, fracPart.y);
float mixB = mix(brTexel, trTexel, fracPart.y);
return mix(mixA, mixB, fracPart.x);
}



float sample_smap_pcf(vec2 coords)
{
const float NUM_SAMPLES = 3.0;
const float SAMPLES_START = (NUM_SAMPLES - 1.0) / 2.0;
const float NUM_SAMPLES_SQUARED = NUM_SAMPLES * NUM_SAMPLES;
float result = 0.0;
for (float y = -SAMPLES_START; y <= SAMPLES_START; y += 1.0)
{
for (float x = -SAMPLES_START; x <= SAMPLES_START; x += 1.0)
{
vec2 coordsOffset = vec2(x, y) * texelSize;
result += sample_smap(coords + coordsOffset);
}
}
return result / NUM_SAMPLES_SQUARED;
}




void fragment(void) {

tile_size=u_tile_size_rw.x;
tile_offset=u_tile_size_rw.y;

 
vec4 tile1=read_tile(u_texture_tiles_rw,u_texture_repeat_rw.x, 0.0,0.0);
vec4 tile2=read_tile(u_texture_tiles_rw,u_texture_repeat_rw.y, 1.0,0.0);
vec4 tile3=read_tile(u_texture_tiles_rw,u_texture_repeat_rw.z, 0.0,1.0);
vec4 tile4=read_tile(u_texture_tiles_rw,u_texture_repeat_rw.w, 1.0,1.0);

vec3 norm1=(2.0 * read_tile(u_normalmap_tiles_rw,u_normalmap_repeat_rw.x, 0.0,0.0).xyz - 1.0);
vec3 norm2=(2.0 * read_tile(u_normalmap_tiles_rw,u_normalmap_repeat_rw.y, 1.0,0.0).xyz - 1.0);
vec3 norm3=(2.0 * read_tile(u_normalmap_tiles_rw,u_normalmap_repeat_rw.z, 0.0,1.0).xyz - 1.0);
vec3 norm4=(2.0 * read_tile(u_normalmap_tiles_rw,u_normalmap_repeat_rw.w, 1.0,1.0).xyz - 1.0);


vec3 normal=(norm1*v_normal_rw.x)+(norm4*v_normal_rw.x)+(norm3*v_normal_rw.z);

normal=normalize(v_normal_rw+normal);

 vec3 fws_direction_to_eye = normalize(u_eye_position_rw.xyz - v_position_rw.xyz);
vec3 total_light=get_render_system_lighting(u_object_material_rw,v_position_rw.xyz,
normal,
fws_direction_to_eye);




gl_FragColor = vec4((total_light)*land_color, u_object_material_rw[0].w)*
mix_texture_tiles(tile1,tile2,tile3,tile4,normal);
//gl_FragColor.w*=u_object_material_rw[0].w;
gl_FragColor=mix_fog_color(gl_FragColor);
}



/*chunk-skybox*/
<?=chunk('precision')?>
attribute vec4 a_position_rw;
varying vec4 v_position_rw;

void vertex(){
 v_position_rw = a_position_rw;
 gl_Position = a_position_rw;
 gl_Position.z = 1.0;
}


<?=chunk('precision')?>
uniform mat4 u_view_projection_matrix_rw;
uniform vec4 u_sun_params_rw;
varying vec4 v_position_rw;
vec3 fragPosition;

const float turbidity = 10.0;
const float reileigh = 2.0;
const float mieCoefficient = 0.005;
const float mieDirectionalG = 0.8;

const float e = 2.71828182845904523536028747135266249775724709369995957;
const float pi = 3.141592653589793238462643383279502884197169;

const float n = 1.0003;// refractive index of air
const float N = 2.545E25; // number of molecules per unit volume for air at

const float pn = 0.035;
// wavelength of used primaries, according to preetham
const vec3 lambda = vec3(680E-9, 550E-9, 450E-9);

const vec3 K = vec3(0.686, 0.678, 0.666);
const float v = 4.0;

const float rayleighZenithLength = 8.4E3;
const float mieZenithLength = 1.25E3;
const vec3 up = vec3(0.0, 1.0, 0.0);

const float EE = 1000.0;

float sunAngularDiameterCos =u_sun_params_rw.w; // 0.999956;

const float cutoffAngle = pi/1.95;
const float steepness = 1.5;

vec3 simplifiedRayleigh() {
return 0.0005 / vec3(94, 40, 18);
}

float rayleighPhase(float cosTheta) {
return (3.0 / (16.0*pi)) * (1.0 + pow(cosTheta, 2.0));
}

vec3 totalMie(vec3 lambda, vec3 K, float T) {
float c = (0.2 * T ) * 10E-18;
return 0.434 * c * pi * pow((2.0 * pi) / lambda, vec3(v - 2.0)) * K;
}

float hgPhase(float cosTheta, float g) {
return (1.0 / (4.0*pi)) * ((1.0 - pow(g, 2.0)) / pow(1.0 - 2.0*g*cosTheta + pow(g, 2.0), 1.5));
}

float sunIntensity(float zenithAngleCos) {
return EE * max(0.0, 1.0 - pow(e, -((cutoffAngle - acos(zenithAngleCos))/steepness)));
}

float A = 0.15;
float B = 0.50;
float C = 0.10;
float D = 0.20;
float E = 0.02;
float F = 0.30;
float W = 1000.0;

vec3 Uncharted2Tonemap(vec3 x) {
  return ((x*(A*x+C*B)+D*E)/(x*(A*x+B)+D*F))-E/F;
}

<?=chunk('global-render-system-fog-effect')?>

void fragment(void) {

  fragPosition=(u_view_projection_matrix_rw * v_position_rw).xyz;
vec3 sunPosition=u_sun_params_rw.xyz;
float sunfade = 1.0 - clamp(1.0 - exp(sunPosition.y), 0.0, 1.0);
float reileighCoefficient = reileigh - (1.0 * (1.0-sunfade));
vec3 sunDirection = normalize(sunPosition);
float sunE = sunIntensity(dot(sunDirection, up));
vec3 betaR = simplifiedRayleigh() * reileighCoefficient;

// mie coefficients
vec3 betaM = totalMie(lambda, K, turbidity) * mieCoefficient;

// optical length
// cutoff angle at 90 to avoid singularity in next formula.
float zenithAngle = acos(max(0.0, dot(up, normalize(fragPosition))));
float sR = rayleighZenithLength / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));
float sM = mieZenithLength / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));

// combined extinction factor
vec3 Fex = exp(-(betaR * sR + betaM * sM));

// in scattering
float cosTheta = dot(normalize(fragPosition), sunDirection);

float rPhase = rayleighPhase(cosTheta * 0.5+0.5);
vec3 betaRTheta = betaR * rPhase;

float mPhase = hgPhase(cosTheta, mieDirectionalG);
vec3 betaMTheta = betaM * mPhase;

vec3 Lin = pow(sunE * ((betaRTheta + betaMTheta) / (betaR + betaM)) * (1.0 - Fex),vec3(1.5));
Lin *= mix(vec3(1.0),pow(sunE * ((betaRTheta + betaMTheta) / (betaR + betaM)) * Fex,vec3(1.0/2.0)),clamp(pow(1.0-dot(up, sunDirection),5.0),0.0,1.0));

//nightsky
vec3 direction = normalize(fragPosition);
float theta = acos(direction.y); // elevation --> y-axis, [-pi/2, pi/2]
float phi = atan(direction.z, direction.x); // azimuth --> x-axis [-pi/2, pi/2]
vec2 uv = vec2(phi, theta) / vec2(2.0*pi, pi) + vec2(0.5, 0.0);
vec3 L0 = vec3(0.1) * Fex;

// composition + solar disc
float sundisk = smoothstep(sunAngularDiameterCos,sunAngularDiameterCos+0.00002,cosTheta);
L0 += (sunE * 19000.0 * Fex)*sundisk;

vec3 whiteScale = 1.0/Uncharted2Tonemap(vec3(W));

vec3 texColor = (Lin+L0);
texColor *= 0.04 ;
texColor += vec3(0.0,0.001,0.0025)*0.3;

vec3 curr = Uncharted2Tonemap(texColor);
vec3 color = curr*whiteScale;

vec3 retColor = pow(color,vec3(1.0/(1.2+(1.2*sunfade))));

gl_FragColor = vec4(retColor, 1.0);
gl_FragColor=mix_fog_color(gl_FragColor);

}





/*chunk-skybox2*/
<?=chunk('precision')?>
attribute vec4 a_position_rw;
varying vec4 v_position_rw;

void vertex(){
 v_position_rw = a_position_rw;
 gl_Position = a_position_rw;
 gl_Position.z = 1.0;
}


<?=chunk('precision')?>
uniform mat4 u_view_projection_matrix_rw;
uniform vec4 u_sun_params_rw;
varying vec4 v_position_rw;


const float depolarizationFactor=0.067;
const float luminance=1.0;
const float mieCoefficient=0.00335;
const float mieDirectionalG=0.787;
const vec3 mieKCoefficient=vec3(0.686,0.678,0.666);
const float mieV=4.012;
const float mieZenithLength=500.0;
const float numMolecules=2.542e+25;
const vec3 primaries=vec3(6.8e-7,5.5e-7,4.5e-7);
const float rayleigh=1.0;
const float rayleighZenithLength=615.0;
const float refractiveIndex=1.000317;
const float sunAngularDiameterDegrees=0.00758;
const float sunIntensityFactor=1111.0;
const float sunIntensityFalloffSteepness=0.98;
const float tonemapWeighting=9.50;
const float turbidity=1.25;

const float PI = 3.141592653589793238462643383279502884197169;
const vec3 UP = vec3(0.0, 1.0, 0.0);

vec3 totalRayleigh(vec3 lambda)
{
return (8.0 * pow(PI, 3.0) * pow(pow(refractiveIndex, 2.0) - 1.0, 2.0) * (6.0 + 3.0 * depolarizationFactor)) / (3.0 * numMolecules * pow(lambda, vec3(4.0)) * (6.0 - 7.0 * depolarizationFactor));
}

vec3 totalMie(vec3 lambda, vec3 K, float T)
{
float c = 0.2 * T * 10e-18;
return 0.434 * c * PI * pow((2.0 * PI) / lambda, vec3(mieV - 2.0)) * K;
}

float rayleighPhase(float cosTheta)
{
return (3.0 / (16.0 * PI)) * (1.0 + pow(cosTheta, 2.0));
}

float henyeyGreensteinPhase(float cosTheta, float g)
{
return (1.0 / (4.0 * PI)) * ((1.0 - pow(g, 2.0)) / pow(1.0 - 2.0 * g * cosTheta + pow(g, 2.0), 1.5));
}

float sunIntensity(float zenithAngleCos)
{
float cutoffAngle = PI / 1.95; // Earth shadow hack
return sunIntensityFactor * max(0.0, 1.0 - exp(-((cutoffAngle - acos(zenithAngleCos)) / sunIntensityFalloffSteepness)));
}

// Whitescale tonemapping calculation, see http://filmicgames.com/archives/75
// Also see http://blenderartists.org/forum/showthread.php?321110-Shaders-and-Skybox-madness
const float A = 0.15; // Shoulder strength
const float B = 0.50; // Linear strength
const float C = 0.10; // Linear angle
const float D = 0.20; // Toe strength
const float E = 0.02; // Toe numerator
const float F = 0.30; // Toe denominator
vec3 Uncharted2Tonemap(vec3 W)
{
return ((W * (A * W + C * B) + D * E) / (W * (A * W + B) + D * F)) - E / F;
}



void fragment(void) {

 vec3 fragPosition=normalize((u_view_projection_matrix_rw * v_position_rw).xyz);
 // In-scattering
vec3 sunDirection=u_sun_params_rw.xyz;


 //float sunfade = 1.0 - clamp(1.0 - exp(((sunDirection*4500000.0).y / 450000.0)), 0.0, 1.0);

 float sunfade = 1.0 - clamp(1.0 - exp(sunDirection.y), 0.0, 1.0);
float rayleighCoefficient = rayleigh - (1.0 * (1.0 - sunfade));
vec3 betaR = totalRayleigh(primaries) * rayleighCoefficient;

// Mie coefficient
vec3 betaM = totalMie(primaries, mieKCoefficient, turbidity) * mieCoefficient;

// Optical length, cutoff angle at 90 to avoid singularity
float zenithAngle = acos(max(0.0, dot(UP, fragPosition)));
float denom = cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / PI), -1.253);
float sR = rayleighZenithLength / denom;
float sM = mieZenithLength / denom;

// Combined extinction factor
vec3 Fex = exp(-(betaR * sR + betaM * sM));


float cosTheta = dot(fragPosition, sunDirection);
vec3 betaRTheta = betaR * rayleighPhase(cosTheta * 0.5 + 0.5);
vec3 betaMTheta = betaM * henyeyGreensteinPhase(cosTheta, mieDirectionalG);
float sunE = sunIntensity(dot(sunDirection, UP));
vec3 Lin = pow(sunE * ((betaRTheta + betaMTheta) / (betaR + betaM)) * (1.0 - Fex), vec3(1.5));
Lin *= mix(vec3(1.0), pow(sunE * ((betaRTheta + betaMTheta) / (betaR + betaM)) * Fex, vec3(0.5)), clamp(pow(1.0 - dot(UP, sunDirection), 5.0), 0.0, 1.0));

// Composition + solar disc
float sunAngularDiameterCos = cos(sunAngularDiameterDegrees);
float sundisk = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta);
vec3 L0 = vec3(0.1) * Fex;
L0 += sunE * 19000.0 * Fex * sundisk;
vec3 texColor = Lin + L0;
texColor *= 0.04;
texColor += vec3(0.0, 0.001, 0.0025) * 0.3;

// Tonemapping
vec3 whiteScale = 1.0 / Uncharted2Tonemap(vec3(tonemapWeighting));
vec3 curr = Uncharted2Tonemap((log2(2.0 / pow(luminance, 4.0))) * texColor);
vec3 color = curr * whiteScale;
vec3 retColor = pow(color, vec3(1.0 / (1.2 + (1.2 * sunfade))));

gl_FragColor = vec4(retColor, 1.0);
}
}`);


 

  raw.ecs.register_component("terrain", raw.define(function (proto, _super) {
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
        this.texture_repeat = raw.math.vec4(4, 4, 4, 4);
        this.normalmap_repeat = raw.math.vec4(8, 8, 8, 8);



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
      terrain_material.shader = raw.webgl.shader.parse(glsl["default-material"]);


      return terrain_material;


    }, raw.shading.shaded_material);

    var time_start = 0, reg, reg_x, reg_z, reg_key, i = 0,render_item=null;
    proto.create = (function (_super_call) {
      return function (def, entity,ecs) {        
        _super_call.apply(this, [def, entity]);

        render_item = ecs.attach_component(entity, 'render_item', {});


        this.camera_version =986732;
        this.region_size = def.region_size || 512;
        this.world_size = def.world_size || (4096 * 2);
        this.region_size_width = this.region_size + 1;
        this.region_size_half = this.region_size * 0.5;


        
        
        render_item.items.push(new raw.rendering.mesh({
          flags: 1,
          geometry: raw.geometry.create({vertices: new Float32Array(0) }),
          material: new terrain_material({
            terrain: this,
            material: def.material
          })
        }));
        
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
          this.terrain.renderer.gl.bindBuffer(34962, this.terrain.empty_regions_buffer);
          this.terrain.er_di = data_buffer.byteLength / 4;
          this.terrain.renderer.gl.bufferData(34962, new Float32Array(data_buffer), 35048, 0, this.terrain.er_di);
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

            reg.smap.P("TEXTURE_WRAP_S", 33071);
            reg.smap.P("TEXTURE_WRAP_T", 33071);

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

              this.terrain.renderer.gl.bindBuffer(34962, reg.buffer);
              this.terrain.renderer.gl.bufferData(34962, reg_data, 35048, 0, ri);
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

    proto.update = (function () {


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

      proto.query_height_on_camera = function () {
        this.cam_reg_x = Math.floor((this.camera.world_position[0] / this.region_size) + 0.5);
        this.cam_reg_z = Math.floor((this.camera.world_position[2] / this.region_size) + 0.5);

        cam_reg_key = this.cam_reg_z * this.world_size + this.cam_reg_x;
        this.cam_reg = this.regions[cam_reg_key];
        if (this.cam_reg) {
          this.worker.postMessage([1500, this.cam_reg.key, this.camera.world_position[0], this.camera.world_position[2]]);
        }
      }

      return function () {
        

        this.cam_reg_x = Math.floor((this.camera.world_position[0] / this.region_size) + 0.5);
        this.cam_reg_z = Math.floor((this.camera.world_position[2] / this.region_size) + 0.5);

        cam_reg_key = this.cam_reg_z * this.world_size + this.cam_reg_x;
        this.cam_reg = this.regions[cam_reg_key];

        /*
        
        
        if (this.cam_reg) {
          this.worker.postMessage([1500, this.cam_reg.key, this.camera.world_position[0], this.camera.world_position[2]]);
        }
        */

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

            renderer.gl.bindBuffer(34962, reg.buffer);
            renderer.gl.vertexAttribPointer(0, 3, 5126, false, 12, 0);

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
              renderer.gl.drawElements(1, _di * 2, 5125, (_ds * 2) * 4);
            }


            if (this.shaded) {            
            //renderer.use_texture(this.shadow_map, 1);             
              shader.set_uniform('land_color', raw.math.vec3.set(land_color, 1, 1, 1));
              renderer.gl.drawArrays(4, _ds, _di);
            }

          }

        }
        this.render_time = Date.now() - time_start;

        return;

        if (this.empty_regions_buffer) {
          renderer.gl.bindBuffer(34962, this.empty_regions_buffer);
          renderer.gl.vertexAttribPointer(0, 3, 5126, false, 12, 0);

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
              shader.set_uniform('terrain_color',raw.math.vec3.set(terrain_color, 0.5, 0.5, 0.5));
              renderer.gl.drawElements(1, _di * 2, 5125, (_ds * 2) * 4);
            }


            if (this.shaded) {
              shader.set_uniform('terrain_color',raw.math.vec3.set(terrain_color, 0, 0, 0));
              renderer.gl.drawArrays(4, _ds, _di);
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

  }, raw.ecs.component));

  raw.ecs.register_component("skybox", raw.define(function (proto, _super) {
    var skybox_material = raw.define(function (proto, _super) {

      var view_direction_projection_matrix = raw.math.mat4();
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
        renderer.gl.depthFunc(515);
        renderer.gl.drawArrays(4, 0, mesh.geometry.num_items);
        renderer.gl.depthFunc(513);



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

    var render_item = null;

    proto.create = (function (_super) {
      return function (def, entity,ecs) {
        _super.apply(this, [def, entity]);
        render_item = ecs.attach_component(entity, 'render_item', {});

        render_item.items.push(new raw.rendering.mesh({
          flags: 1,
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
        }))
      }
    })(proto.create);


    function sky_box(component) {
      _super.apply(this);

    }



    return sky_box;

  }, raw.ecs.component));





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
              terrain.update();
              
              terrain.camera_version = terrain.camera.version;
              this.worked_items++;
            }
          }
          
        }

        
      }
    };

    proto.step_end = function () {      
      while ((entity = this.ecs.iterate_entities("terrain")) !== null) {
        terrain = entity.terrain;
        if (this.renderer.active_camera !== null) {
          terrain.camera = this.renderer.active_camera;
          if (terrain.camera.version !== terrain.camera_version) {
            terrain.query_height_on_camera();            
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



/*src/systems/render_system.js*/


raw.ecs.register_system("render_system", raw.define(function (proto, _super) {

  var glsl = raw.webgl.shader.create_chunks_lib(`/*chunk-global-render-system-lighting*/

<?for(var i= 0;i<param('fws_num_lights');i++) {?>
uniform mat4 u_light_material_rw<?=i?>;
uniform mat4 u_light_matrix_rw<?=i?>;
<?}?>





float fws_distance_to_light;
float fws_lambertian;
float fws_specular;
float fws_attenuation;
float fws_intensity;
float fws_spot_light_calc;
float fws_spot_theta;
float fws_spot_light_status;

vec3 fws_total_light;
vec3 fws_light_value;

vec3 fws_lighting(
mat4 fws_object_material,
mat4 fws_light_material,
vec3 fws_vertex_position, 
vec3 fws_vertex_normal,
vec3 fws_direction_to_eye,
vec3 fws_direction_to_light, vec3 fws_direction_from_light) {

fws_distance_to_light = length(fws_direction_to_light);



fws_direction_to_light = normalize(fws_direction_to_light);
fws_lambertian = max(dot(fws_direction_to_light, fws_vertex_normal), 0.0);


fws_lambertian =dot(fws_direction_to_light, fws_vertex_normal);

fws_intensity = fws_light_material[0].w;

fws_attenuation = (fws_light_material[3].x + fws_light_material[3].y * fws_distance_to_light
+ fws_light_material[3].z * (fws_distance_to_light * fws_distance_to_light)) + fws_light_material[3].w;

fws_spot_light_status = step(0.000001, fws_light_material[1].w);
fws_spot_theta = dot(fws_direction_to_light, fws_direction_from_light);
fws_spot_light_calc = clamp((fws_spot_theta - fws_light_material[2].w) / (fws_light_material[1].w - fws_light_material[2].w), 0.0, 1.0);
fws_intensity *= (fws_spot_light_status * (step(fws_light_material[1].w, fws_spot_theta) * fws_spot_light_calc))
+ abs(1.0 - fws_spot_light_status);


fws_specular = pow(max(dot(normalize(fws_direction_to_light.xyz + fws_direction_to_eye), fws_vertex_normal), 0.0), fws_object_material[2].w) * fws_lambertian;
fws_specular *= fws_intensity * step(0.0, fws_lambertian);




fws_light_value = (fws_light_material[0].xyz * fws_object_material[0].xyz) +
(fws_object_material[1].xyz * fws_lambertian * fws_light_material[1].xyz * fws_intensity) +
(fws_object_material[2].xyz * fws_specular * fws_light_material[2].xyz);

fws_light_value=max(fws_light_value,0.0);



return (fws_light_value / fws_attenuation);


}


vec3 get_render_system_lighting(
mat4 object_material_rw,
vec3 fws_vertex,
vec3 fws_normal,
vec3 fws_direction_to_eye){

fws_total_light=vec3(0.0);
<?for (var i = 0;i < param('fws_num_lights');i++) {?>
fws_total_light += fws_lighting(
object_material_rw,
u_light_material_rw<?=i?>,
fws_vertex, fws_normal, fws_direction_to_eye,
u_light_matrix_rw<?=i?>[3].xyz - fws_vertex,
 u_light_matrix_rw<?=i?>[2].xyz);
<?}?>

return fws_total_light;
}




/*chunk-global-render-system-fog-effect*/

uniform vec3 u_fog_params_rw;
uniform vec4 u_fog_color_rw;
float get_linear_fog_factor(float eye_dist)
{ 
  return clamp( (u_fog_params_rw.y - eye_dist) /
      (u_fog_params_rw.y - u_fog_params_rw.x ), 0.0, 1.0 );
}

vec4 mix_fog_color(vec4 frag_color){
float fog_density=0.0005;
  const float LOG2=1.442695;
  float z=gl_FragCoord.z/gl_FragCoord.w;
  float fog_factor=exp2(-fog_density*fog_density*z*z*LOG2);
  fog_factor=clamp(fog_factor,0.0,1.0);
return mix(u_fog_color_rw,frag_color,fog_factor);
}


/*chunk-textured-quad*/
attribute vec2 a_position_rw;
uniform vec4 u_pos_size;
const vec2 madd=vec2(0.5,0.5);
varying vec2 v_uv_rw;
void vertex()
{
gl_Position = vec4((a_position_rw.xy*u_pos_size.zw)+u_pos_size.xy,0.0,1.0);
v_uv_rw = a_position_rw.xy*madd+madd; 
}
<?=chunk('precision')?>
uniform sampler2D u_texture_rw;
varying vec2 v_uv_rw;
void fragment(void)
{
gl_FragColor = texture2D(u_texture_rw, v_uv_rw);
}

/*chunk-pickable-mesh*/

<?=chunk('precision')?>

uniform vec4 u_color_id_rw;
void fragment(void) {
gl_FragColor=u_color_id_rw/255.0;
}

/*chunk-render-shadow-map*/

<?=chunk('precision')?>
uniform sampler2D u_texture_rw;
varying vec2 v_uv_rw;
void fragment(void) {

if(texture2D(u_texture_rw, v_uv_rw).a<0.02) discard;
gl_FragColor=vec4(0.85);
}


/*chunk-receive-shadow*/
uniform mat4 u_light_camera_matrix_rw;
varying vec4 v_shadow_light_vertex_rw;

void vertex(){
super_vertex();
v_shadow_light_vertex_rw = u_light_camera_matrix_rw * v_position_rw;
}


<?=chunk('precision')?>
<?=chunk('shadow-sampling')?>


varying vec3 v_normal_rw;
varying vec4 v_shadow_light_vertex_rw;
uniform sampler2D u_texture_rw;
uniform sampler2D u_shadow_map_rw;
uniform vec4 u_shadow_params_rw;
uniform vec4 u_shadow_attenuation_rw;

uniform vec3 u_light_pos_rw;
uniform vec3 u_light_dir_rw;

varying vec2 v_uv_rw;
varying vec4 v_position_rw;


float get_shadow_sample() {

float f=texture2D(u_texture_rw, v_uv_rw).a;

vec3 shadow_map_coords =v_shadow_light_vertex_rw.xyz/v_shadow_light_vertex_rw.w;
f*=step(-(dot(v_normal_rw,normalize(u_light_pos_rw - v_position_rw.xyz))),0.0);

shadow_map_coords.xyz = shadow_map_coords.xyz * 0.5 + 0.5;

f*=step(shadow_map_coords.x,1.0)*step(shadow_map_coords.y,1.0)*step(shadow_map_coords.z,1.0);
f*=step(0.0,shadow_map_coords.x)*step(0.0,shadow_map_coords.y)*step(0.0,shadow_map_coords.y);


vec3 fws_direction_to_light=(u_light_pos_rw.xyz-v_position_rw.xyz);

float fws_distance_to_light=length(fws_direction_to_light)*0.99;
fws_direction_to_light=normalize(fws_direction_to_light);


float fws_spot_theta = dot(fws_direction_to_light,u_light_dir_rw);
float fws_spot_light_calc = clamp((fws_spot_theta) / u_shadow_params_rw.w, 0.0, 1.0);

f*=(step(1.0,fws_spot_light_calc));


float fws_attenuation = (u_shadow_attenuation_rw.y * fws_distance_to_light
+ u_shadow_attenuation_rw.z * (fws_distance_to_light * fws_distance_to_light));




f/=(max(fws_attenuation,0.0));

f*=(u_shadow_attenuation_rw.w/fws_distance_to_light);

f*=(u_shadow_params_rw.x*(u_shadow_attenuation_rw.w/fws_distance_to_light));
f=clamp(f,0.0,0.8);
return ((f-sample_shadow_map_pcf(u_shadow_map_rw, shadow_map_coords.xy,
shadow_map_coords.z-u_shadow_params_rw.z ,vec2(u_shadow_params_rw.y))*f)
*u_shadow_params_rw.x);


}


void fragment(void) {
gl_FragColor = vec4((get_shadow_sample()));

}`);

  function setup_gl_state(gl) {
    gl.states = {
      depthMask: false, blendFunc0: -1, blendFunc1: -1, framebuffer: undefined,      
    };
    gl.states_flags = new Uint8Array(1024 * 64);


    var pm1 = [null];
    var pm2 = [null, null];

    gl.enable = (function (_super, gl) {
      return function (state) {
        if (gl.states_flags[state] === 1) return (false);
        gl.states_flags[state] = 1;
        pm1[0] = state;
        _super.apply(gl, pm1);
        return (true);
      }
    })(gl.enable, gl);

    gl.disable = (function (_super, gl) {
      return function (state) {
        if (gl.states_flags[state] === 0) return (false);
        gl.states_flags[state] = 0;
        pm1[0] = state;
        _super.apply(gl, pm1);
        return (true);
      }
    })(gl.disable, gl);

    gl.blendFunc = (function (_super, gl) {
      return function (func0, func1) {
        if (gl.states.blendFunc0 !== func0 || gl.states.blendFunc1 !== func1) {
          gl.states.blendFunc0 = func0;
          gl.states.blendFunc1 = func1;
          pm2[0] = func0;
          pm2[1] = func1;
          _super.apply(gl, pm2);
          return (true);
        }
        return (false);
      }
    })(gl.blendFunc, gl);

    gl.blendEquation = (function (_super, gl) {
      return function (param) {
        if (gl.states.blendEQuation !== param) {
          gl.states.blendEQuation = param;
          pm1[0] = param;
          _super.apply(gl, pm1);
        }
      }
    })(gl.blendEquation, gl);

    gl.depthMask = (function (_super, gl) {
      return function (mask) {
        if (mask !== gl.states.depthMask) {
          gl.states.depthMask = mask;
          pm1[0] = mask;
          _super.apply(gl, pm1);
        }
      }
    })(gl.depthMask, gl);

    gl.depthFunc = (function (_super, gl) {
      return function (func) {
        if (func !== gl.states.depthFunc) {
          gl.states.depthFunc = func;
          pm1[0] = func;
          _super.apply(gl, pm1);
        }
      }
    })(gl.depthFunc, gl);

    gl.cullFace = (function (_super, gl) {
      return function (param) {
        if (param !== gl.states.cullFace) {
          gl.states.cullFace = param;
          pm1[0] = param;
          _super.apply(gl, pm1);
        }
      }
    })(gl.cullFace, gl);

    gl.bindFramebuffer = (function (_super, gl) {
      return function (param0, param1) {
        if (param1 !== gl.states.framebuffer) {
          gl.states.framebuffer = param1;
          pm2[0] = param0;
          pm2[1] = param1;
          _super.apply(gl, pm2);
          return true;
        }
        return false;
      }
    })(gl.bindFramebuffer, gl);

  }

  function render_system(parameters) {
    _super.apply(this, [parameters]);

    parameters = parameters || {};
    var _canvas = parameters.canvas
    if (!_canvas) {
      _canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
      _canvas.setAttribute("style", "position:absolute;width:100%;height:100%;left:0;top:0;box-sizing: border-box;");
    }

    this.priority = 5000;

    parameters = raw.merge_object(parameters, {
      alpha: false, depth: true, stencil: false,
      antialias: false, premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    var gl = parameters.context || _canvas.getContext('webgl', parameters
    );

    this.shader_parameters = {
      fws_num_lights: parameters.lights_count_per_pass || 4
    };

    if (gl === null) {
      if (_canvas.getContext('webgl') !== null) {
        throw new Error('Error creating WebGL context with your selected attributes.');
      } else {
        throw new Error('Error creating WebGL context.');
      }
    }

    gl.pixel_ratio = parameters.pixel_ratio || window.devicePixelRatio;

    _canvas.addEventListener('webglcontextlost', function () {
      console.log('webglcontextlost', this);
    }, false);

    _canvas.addEventListener('webglcontextrestored', function () {
      console.log('webglcontextrestored', this);
    }, false);


    gl.OES_vertex_array_object = gl.getExtension("OES_vertex_array_object");
    gl.OES_standard_derivatives = gl.getExtension("OES_standard_derivatives");
    gl.WEBGL_depth_texture = gl.getExtension('WEBGL_depth_texture');
    gl.ANGLE_instanced_arrays = gl.getExtension('ANGLE_instanced_arrays');
    gl.OES_element_index_uint = gl.getExtension('OES_element_index_uint');
    setup_gl_state(gl);

    this.render_target1 = new raw.webgl.render_target(gl, 10, 10);
    this.render_target1.attach_color(true).attach_depth_buffer();
    this.render_target1.clear_buffer = false;



    this.default_render_target = this.render_target1;

    this.render_target2 = new raw.webgl.render_target(gl, 10, 10);
    this.render_target2.attach_color().attach_depth_buffer();
    this.render_target2.clear_buffer = false;

    this.render_target1.swap = this.render_target2;
    this.render_target2.swap = this.render_target1;



    // this.default_render_target = null;

    console.log("parameters", parameters);
    if (parameters.show_debug_canvas) {
      this.debug_canvas = new
        raw.webgl.canvas_texture(parameters.debug_canvas_width || 512, parameters.debug_canvas_height || 512);
      this.show_debug_canvas = true;

    }

    this.post_processes = [new raw.shading.post_process.fxaa()];
    this.render_targets = [];
    // this.post_processes.length = 0;

    this.texture_slots = [-1, -1, -1, -1, -1, -1 - 1, -1, -1, -1];
    this.texture_updates = new raw.array();
    this.default_texture = new raw.webgl.texture();
    this.default_texture.needs_update = true;
    raw.webgl.texture.update(gl, this.default_texture);
    console.log('this.default_texture', this.default_texture.gl_texture);

    this.u_timer_rw = raw.math.vec3();
    gl.enable(2929);
    gl.cullFace(1029);
    gl.enable(2884);
    gl.clearColor(0, 0, 0, 1);

    this.gl = gl;

    this.active_shader = null;

    this.last_shader_id = -1;

    this.full_quad = raw.webgl.buffers.get(gl);
    gl.bindBuffer(34962, this.full_quad);
    gl.bufferData(34962, new Float32Array([
      -1, -1,
      1, -1,
      1, 1,
      -1, -1,
      1, 1,
      -1, 1,
    ]), 35044, 0, 12);


    this.fws_num_lights = this.shader_parameters.fws_num_lights;
    this.shading_lights = [];
    for (var i = 0; i < this.shader_parameters.fws_num_lights; i++) {
      this.shading_lights[i] = null;
    }


    this.light_pass_count = 0;
    this.lights_batch_size = 0;

    this.render_version = 0;
    this.enable_pickables = false;
    this.pickables_pass = false;
    this.picking_color_id = 980;
    this.active_camera = null;

    this.default_color_attribute = {
      name: "a_color_rw",
      item_size: 4,
      data: new Float32Array(100000 * 4)
    };



    this.default_color_attribute.data.fill(1);
    this.is_renderer = true;
    this.active_camera = null;

    this.fog_params = raw.math.vec3(0, 0, 0);
    this.fog_color =raw.math.vec4(0.165, 0.165, 0.165, 0.001);

  }
  proto.update_debug_canvas = function () {
    this.debug_canvas.needs_update = true;
  }

  proto.set_canvas_size = (function () {
    var i = 0;
    return function (width, height) {
      this.gl.canvas.width = width * this.gl.pixel_ratio;
      this.gl.canvas.height = height * this.gl.pixel_ratio;
      this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

      this.render_target1.resize(this.gl.canvas.width, this.gl.canvas.height);
      this.render_target2.resize(this.gl.canvas.width, this.gl.canvas.height);

      for (i = 0; i < this.post_processes.length; i++) {
        this.post_processes[i].resize(this.gl.canvas.width, this.gl.canvas.height);
      }

      for (i = 0; i < this.render_targets.length; i++) {
        this.render_targets[i].resize(this.gl.canvas.width, this.gl.canvas.height);
      }
    }
  })();


  proto.clear_screen = function () {
    this.gl.clear(16384 | 256);
    return (this);
  };

  proto.set_default_viewport = function () {
    if (this.default_render_target === null) {
      if (this.gl.bindFramebuffer(36160, null)) {
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
      }

    }
    else {
      this.default_render_target.bind();
    }
    return (this)
  };


  proto.use_geometry = (function () {
    var return_value = 0, shader = null, i = 0, att = null, gl = null;

    proto.activate_geometry_index_buffer = (function () {
      var i, ii, a, b, c;
      function update_wireframe_indices(g) {
        if (g.index_buffer !== null) {
          if (!g.w_index_data) {
            g.w_index_data = raw.geometry.create_index_data(g.index_data.length * 2);
          } else if (g.w_index_data.length < g.index_data.length * 2) {
            g.w_index_data = raw.geometry.create_index_data(g.index_data.length * 2);
          }
          ii = 0;
          for (i = 0; i < g.index_data.length; i += 3) {
            a = g.index_data[i + 0];
            b = g.index_data[i + 1];
            c = g.index_data[i + 2];
            g.w_index_data[ii] = a;
            g.w_index_data[ii + 1] = b;
            g.w_index_data[ii + 2] = b;
            g.w_index_data[ii + 3] = c;
            g.w_index_data[ii + 4] = c;
            g.w_index_data[ii + 5] = a;
            ii += 6;
          }
        }
      }


      proto.reset_wireframe_index_buffer = function (gl, vert_count) {
        var indices = [];
        indices.length = 0;
        for (i = 0; i < (vert_count) - 1; i += 3) {
          a = i + 0;
          b = i + 1;
          c = i + 2;

          ii = indices.length;
          indices[ii] = a;
          indices[ii + 1] = b;
          indices[ii + 2] = b;
          indices[ii + 3] = c;
          indices[ii + 4] = c;
          indices[ii + 5] = a;



        }
        if (!this.wireframe_index_buffer) {
          this.wireframe_index_buffer = raw.webgl.buffers.get(gl);
        }

        gl.bindBuffer(34963, this.wireframe_index_buffer);
        gl.bufferData(34963, raw.geometry.create_index_data(indices), 35048);
        indices.length = 0;
      };

      proto.bind_default_wireframe_indices = function () {
        if (!this.wireframe_index_buffer) {
          this.reset_wireframe_index_buffer(gl, 100000 * 10);
          this.compile_attribute(this.default_color_attribute);
        }
        this.gl.bindBuffer(34963, this.wireframe_index_buffer);
      };

      return function (geo, is_wireframe) {
        gl = this.gl;
        if (geo.index_data) {

          if (geo.index_needs_update) {
            if (geo.index_buffer === null) geo.index_buffer = raw.webgl.buffers.get(gl);
            gl.bindBuffer(34963, geo.index_buffer);
            gl.bufferData(34963, geo.index_data, 35048);
          }


          if (is_wireframe) {
            if (geo.index_needs_update || !geo.w_index_data) {
              update_wireframe_indices(geo);
              if (!geo.w_index_buffer) geo.w_index_buffer = raw.webgl.buffers.get(gl);
              gl.bindBuffer(34963, geo.w_index_buffer);
              gl.bufferData(34963, geo.w_index_data, 35048);
            }
            else
              gl.bindBuffer(34963, geo.w_index_buffer);
          }
          else {
            gl.bindBuffer(34963, geo.index_buffer);
          }
          geo.index_needs_update = false;
          return true;
        }
        else if (is_wireframe) {
          gl.bindBuffer(34963, this.wireframe_index_buffer);
          return true;
        }

        return false;

      }

    })();


    proto.update_geomerty_attribute = function (location, att) {
      return_value = 0;
      if (att === null) {
        this.gl.disableVertexAttribArray(location);
        return_value = -1;
      }
      else {
        this.gl.enableVertexAttribArray(location);

        if (att.needs_update === true) {
          if (att.buffer === null) {
            att.buffer = raw.gl_buffers.get(this.gl);
          }
          this.gl.bindBuffer(34962, att.buffer);
          this.gl.bufferData(34962, att.data, att.buffer_type, att.data_offset, att.data_length);
          return_value = 1;
          att.version+=0.00001;
          att.needs_update = false;
        }
        else if (att.buffer !== null) {
          this.gl.bindBuffer(34962, att.buffer);
        }
        this.gl.vertexAttribPointer(location, att.item_size, att.data_type, false, att.stride, att.offset);
        this.gl.ANGLE_instanced_arrays.vertexAttribDivisorANGLE(location, att.divisor);




      }

      return return_value
    }

    proto.compile_geometry = (function () {
      proto.compile_attribute = function (att) {
        if (att.compiled) return;
        att.stride = att.stride || 0;
        att.offset = att.offset || 0;
        att.needs_update = att.needs_update || false;
        att.array = att.array || null;
        att.data_type = att.data_type || 5126;
        att.buffer_type = att.buffer_type || 35044;
        att.version = att.version || 1;

        att.divisor = att.divisor || 0;
        att.array = att.array || null;
        att.data_offset = att.data_offset || 0;
        att.data_length = att.data_length || 0;

        if (att.data) {
          att.data_length = att.data.length;
          if (att.buffer === null || att.buffer === undefined) att.buffer = raw.webgl.buffers.get(this.gl);

          this.gl.bindBuffer(34962, att.buffer);
          this.gl.bufferData(34962, att.data, att.buffer_type, att.data_offset, att.data_length);
        }
        att.compiled = true;
        return (att);
      }

      proto.use_geometry_attribute = function (location, att) {
        this.compile_attribute(att);

        this.update_geomerty_attribute(location, att);
      };


      return function (gl, geo) {
        if (geo.compiled) return;

        if (!this.wireframe_index_buffer) {
          this.reset_wireframe_index_buffer(gl, 100000 * 10);
          this.compile_attribute(this.default_color_attribute);
        }



        for (aid in geo.attributes) {
          this.compile_attribute(geo.attributes[aid]);
        }

        geo.attributes.a_color_rw = geo.attributes.a_color_rw || this.default_color_attribute;

        if (geo.index_data) {

          if (geo.index_buffer === null) geo.index_buffer = raw.webgl.buffers.get(gl);
          gl.bindBuffer(34963, geo.index_buffer);
          gl.bufferData(34963, geo.index_data, 35048);
        }
        geo.compiled = true;
      }
    })();


    return function (geo) {
      if (!geo.compiled) this.compile_geometry(this.gl, geo);

      shader = this.active_shader;

      if (shader.used_geo_id === geo.uuid) return;
      shader.used_geo_id = geo.uuid;


      for (i = 0; i < shader.all_attributes.length; i++) {
        att = shader.all_attributes[i];

        if (geo.attributes[att.name]) {

          this.update_geomerty_attribute(att.location, geo.attributes[att.name]);
        }
        else {
          this.update_geomerty_attribute(att.location, null);
        }
      }


    }
  })();

  proto.use_shader = function (shader) {
    if (this.last_shader_id != shader.uuid) {
      if (!shader.compiled) {
        raw.webgl.shader.compile(this.gl, shader, this.shader_parameters);
      }
      this.gl.useProgram(shader.program);

      shader.set_uniform("u_fog_params_rw", this.fog_params);
      shader.set_uniform("u_fog_color_rw", this.fog_color);      
      shader.set_uniform('u_timer_rw', this.u_timer_rw);
      this.active_shader = shader;
      this.active_shader.camera_version = -1;
      this.last_shader_id = shader.uuid;
      this.active_shader.used_geo_id = -100;

      return (true);
    }
    return (false);
  };

  proto.update_model_uniforms = function (model) {
    this.active_shader.set_uniform("u_model_rw", model.matrix_world);
  };

  proto.update_camera_uniforms = function (camera) {
    if (this.active_shader.camera_version === camera.version) return false;
    this.active_shader.camera_version = camera.version;
    this.active_shader.set_uniform("u_view_projection_rw", camera.view_projection);
    return (true);
  };


  proto.use_direct_texture = function (texture, slot) {
    this.gl.activeTexture(33984 + slot);
    this.gl.bindTexture(texture.target, texture.gl_texture);
  };

  proto.use_texture = function (texture, slot) {
    if (texture === null) {
      this.use_texture(this.default_texture, slot);
      return;
    }
    else {
      if (texture.needs_update) {
        texture.needs_update = false;
        this.texture_updates.push(texture);
      }
      if (texture.gl_texture === null) {
        this.use_texture(this.default_texture, slot);
        return;
      }

    }
    if (this.texture_slots[slot] !== texture.uuid) {
      this.texture_slots[slot] = texture.uuid;
      this.gl.activeTexture(33984 + slot);
      this.gl.bindTexture(texture.target, texture.gl_texture);
    }

  };

  proto.update_textures = (function () {
    var texture, i = 0;
    return function () {
      for (i = 0; i < this.texture_updates.length; i++) {
        texture = this.texture_updates.data[i];
        texture.update(this.gl);

      }
      this.texture_updates.clear();
    }
  })();


  proto.draw_textured_quad = (function () {
    var att = {
      item_size: 2, data: new Float32Array([
        -1, -1,
        1, -1,
        1, 1,

        -1, -1,
        1, 1,
        -1, 1
      ])
    }
    var shdr = raw.webgl.shader.parse(glsl["textured-quad"]);
    var u_pos_size = raw.math.vec4();
    return function (texture, left, top, width, height) {
      u_pos_size[0] = left;
      u_pos_size[1] = top;
      u_pos_size[2] = width;
      u_pos_size[3] = height;
      this.use_geometry_attribute(0, att);
      this.use_shader(shdr);
      shdr.set_uniform("u_pos_size", u_pos_size);
      //this.gl.disable(2929);
      this.gl.disable(2884);
      this.use_texture(texture, 0);
      this.gl.drawArrays(4, 0, 6);

    }
  })();

  proto.apply_post_processes = (function () {

    proto.draw_full_quad = function () {
      this.gl.bindBuffer(34962, this.full_quad);
      this.gl.enableVertexAttribArray(0);
      this.gl.vertexAttribPointer(0, 2, 5126, false, 0, 0);
      this.gl.drawArrays(4, 0, 6);

    };

    var i0 = 0, i1 = 0, post_target = null, post_process_input = null;
    return function () {
      i1 = 0;

      post_process_input = this.default_render_target.color_texture;
      post_target = this.render_target2;



      this.gl.disable(2929);
      for (i0 = 0; i0 < this.post_processes.length; i0++) {
        post_process = this.post_processes[i0];
        if (post_process.enabled) {
          if (i1 % 2 === 0) {
            post_process.apply(this, post_process_input, post_target);
            post_process_input = post_target.color_texture;
            post_target = post_target.swap;
          }
          else {
            post_process.apply(this, post_process_input, post_target);
            post_process_input = post_target.color_texture;
            post_target = post_target.swap;
          }
          i1++;
        }
      }


      this.gl.bindFramebuffer(36160, null);
      this.use_shader(raw.shading.post_process.shader);
      this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
      this.use_direct_texture(post_process_input, 0);
      // raw.shading.post_process.shader.set_uniform("u_texture_input_rw", 0);
      this.draw_full_quad();

      this.gl.enable(2929);
    }
  })();


  proto.render_list = (function () {
    proto.begin_render = function () {
      this.last_shader_id = -1;
      this.on_error = false;
      this.set_default_viewport();
      this.clear_screen();





      this.timer = performance.now();
      this.u_timer_rw[0] = this.timer;
      this.render_version++;
    };
    proto.enable_fw_rendering = function () {
      this.gl.blendFunc(1, 1);
      if (this.fw_rendering_mode) return;
      this.gl.enable(3042);
      this.gl.depthMask(false);
      this.gl.depthFunc(514);
      this.fw_rendering_mode = true;
    };

    proto.disable_fw_rendering = function () {
      if (!this.fw_rendering_mode) return;
      this.gl.disable(3042);
      this.gl.depthFunc(513);
      this.gl.depthMask(true);
      this.fw_rendering_mode = false;
    };

    proto.end_render = function () {
      this.texture_slots[0] = -1;
      this.update_textures();
      if (this.default_render_target !== null) this.apply_post_processes();
      if (this.show_debug_canvas) {
          this.gl.enable(3042);
        this.gl.blendFunc(770, 771);
        this.draw_textured_quad(this.debug_canvas, 0, 0, 1, 1);
        this.gl.disable(3042);
      }

      if (this.render_version > 999999) {
        this.render_version = 0;
      }
    };

    proto.render_mesh = function (mesh) {
      this.use_geometry(mesh.geometry);
      mesh.material.render_mesh(this, this.active_shader, mesh);
      this.worked_items++;
    };

    var i0 = 0, i1 = 0, i2 = 0, mesh = undefined, light = undefined;

    var update_shading_lights = false;

    proto.update_shading_lights = (function () {
      var lights_eye_position = raw.math.vec4();

      var dummy_light_m4 = raw.math.mat4();
      dummy_light_m4.fill(0);
      dummy_light_m4[3] = 0;
      dummy_light_m4[15] = 0.5;

      var dummy_m4 = raw.math.mat4();



      return function (camera, loop_count) {
        total_lights = 0;

        if (loop_count === -1) loop_count = this.lights_batch_size;
        for (i2 = 0; i2 < loop_count; i2++) {
          light = this.shading_lights[i2];

          if (light != null) {
            if (light.light_type === 0) {
              raw.math.vec3.copy(lights_eye_position, light.world_position);
              raw.math.vec3.set(light.world_position,
                light.matrix_world[8] * 99999,
                light.matrix_world[9] * 99999,
                light.matrix_world[10] * 99999);

              light.attenuation[3] = 1;
            }
            else {
              light.attenuation[3] = 0;
            }
            this.active_shader.set_uniform("u_light_material_rw" + i2, light.light_material);
            this.active_shader.set_uniform("u_light_matrix_rw" + i2, light.matrix_world);


            if (light.light_type === 0) raw.math.vec3.copy(light.world_position, lights_eye_position);



          }



        }


        for (i2 = loop_count; i2 < this.fws_num_lights; i2++) {
          this.active_shader.set_uniform("u_light_material_rw" + i2, dummy_light_m4);
          this.active_shader.set_uniform("u_light_matrix_rw" + i2, dummy_m4);

        }

        lights_eye_position[0] = camera.world_position[0];
        lights_eye_position[1] = camera.world_position[1];
        lights_eye_position[2] = camera.world_position[2];



        lights_eye_position[3] = this.lights_batch_size;
        this.active_shader.set_uniform("u_eye_position_rw", lights_eye_position);
      }
    })();

    proto.render_lighting = function (camera, lights, calback) {
      this.light_pass_count = 0;
      this.lights_batch_size = 0;
      for (i1 = 0; i1 < lights.length; i1++) {
        light = lights.data[i1];

        this.shading_lights[this.lights_batch_size++] = light;
        update_shading_lights = this.lights_batch_size === this.fws_num_lights || i1 === lights.length - 1;
        if (update_shading_lights) {
          calback(update_shading_lights);
          this.lights_batch_size = 0;
          this.light_pass_count++;
          if (lights.length > this.fws_num_lights) {
            this.enable_fw_rendering();
          }
        }
      }
    };


    var transparent_meshes = new raw.array(), opuque_meshes = new raw.array()
      , flat_meshes = new raw.array(),
      pickable_meshes = new raw.array(),
      _this = null, light_mesh_distance = 0, camera = null;


    function transparent_meshes_sort(a, b) {
      return a.view_position[2] - b.view_position[2];
    }


    proto.render_light_shadows = (function () {
      var shadow_maps = {}, shadow_map = null, m = 0, cast_count = 0,
        update_light_camera_matrices = false, total_shadow_casters = 0;

      var u_shadow_params_rw = raw.math.vec4(), u_light_pos_rw = raw.math.vec3(),
        u_light_dir_rw = raw.math.vec3(), u_shadow_attenuation_rw = raw.math.vec4();

      console.log("shadow_maps", shadow_maps);
      function get_shadow_map(gl, size) {
        shadow_map = shadow_maps[size];
        if (!shadow_map) {
          shadow_map = new raw.webgl.render_target(gl, size, size);
          shadow_map.attach_color();
          shadow_map.attach_depth();
          shadow_maps[size] = shadow_map;
        }
        return shadow_map;
      }

      
      function get_shadow_map_shader(light_type, shader) {
        if (light_type >-1) {
          if (!shader.default_shadow_map) {
            shader.default_shadow_map = shader.extend(glsl['render-shadow-map'], { fragment: false });
            shader.default_shadow_map.shadow_shader = true;
          }
          return shader.default_shadow_map;
        }
      };

      function get_shadow_receiver_shader(light_type, shader) {
        if (light_type >-1) {
          if (!shader.default_shadow_receiver) {
            shader.default_shadow_receiver = shader.extend(glsl['receive-shadow'], { fragment: false });
            shader.default_shadow_receiver.shadow_shader = true;
          }
          return shader.default_shadow_receiver;
        }
      }



      function render_shadow_casters(renderer, light, light_camera, meshes) {
        cast_count = 0;
        for (m = 0; m < meshes.length; m++) {
          mesh = meshes.data[m];
          if ((mesh.material.flags & 8) !== 0) {
            //if (!light.valid_shadow_caster(light_camera, mesh)) continue;


            if (light.light_type > 0) {
              if (raw.math.vec3.distance2(
                light_camera.view[12],
                light_camera.view[13],
                light_camera.view[14],
                mesh.world_position[0],
                mesh.world_position[1],
                mesh.world_position[2]
              ) - mesh.bounds_sphere > light.range * 3) {
                continue
              }
            }


            cast_count++;
            if (renderer.use_shader(get_shadow_map_shader(light.light_type, mesh.material.shader))) {              
            }
            renderer.update_camera_uniforms(light_camera);
            renderer.update_model_uniforms(mesh);
            renderer.render_mesh(mesh);
          }
        }
        return cast_count;
      }
      function render_shadow_receivers(renderer, light, light_camera, camera, meshes) {        
        for (m = 0; m < meshes.length; m++) {
          mesh = meshes.data[m];

          if ((mesh.material.flags & 16) !== 0) {


            if (light.light_type > 0) {
              if (raw.math.vec3.distance2(
                light_camera.view[12],
                light_camera.view[13],
                light_camera.view[14],
                mesh.world_position[0],
                mesh.world_position[1],
                mesh.world_position[2]
              ) - mesh.bounds_sphere > light.range*2) {
                continue
              }
            }
            renderer.receive_shadow_count++;

            if (renderer.use_shader(get_shadow_receiver_shader(light.light_type, mesh.material.shader))) {
              renderer.active_shader.set_uniform("u_shadow_map_rw", 4);

              renderer.active_shader.set_uniform("u_light_material_rw", light.light_material);
              renderer.active_shader.set_uniform("u_light_camera_matrix_rw", light_camera.view_projection);
              renderer.active_shader.set_uniform("u_light_pos_rw", u_light_pos_rw);
              renderer.active_shader.set_uniform("u_light_dir_rw", u_light_dir_rw);

              renderer.active_shader.set_uniform("u_shadow_params_rw", u_shadow_params_rw);
              renderer.active_shader.set_uniform("u_shadow_attenuation_rw", u_shadow_attenuation_rw);
              


            };
            renderer.update_camera_uniforms(camera);;
            renderer.active_shader.set_uniform("u_model_rw", mesh.matrix_world);            
            renderer.render_mesh(mesh);
          }


        }

      }



      var d = 0, light_camera = null,s1=null;
      return function (light) {
        s1 = get_shadow_map(this.gl, 1024);
        shadow_map = get_shadow_map(this.gl, light.shadow_map_size);
        

        if (!light.camera) {
          light.camera = {
            view: raw.math.mat4(),
            view_inverse: raw.math.mat4(),
            projection: raw.math.mat4(),
            view_projection: raw.math.mat4(),
            light_version: -1,
            camera_version: -1,
            version: 0
          };
          if (light.light_type === 0) {
            d = light.shadow_camera_distance * 2;
            raw.math.mat4.ortho(light.camera.projection, -d, d, -d, d, -d * 0.75, d * 5);
          }
          else if (light.light_type === 1) {
            raw.math.mat4.perspective(light.camera.projection,150 * 0.017453292519943295, 1, 0.5, light.range * 8);            
            raw.math.mat4.from_eular(light.camera.view, -90 * 0.017453292519943295, 0, 0);
          }
          else if (light.light_type === 2) {
            raw.math.mat4.perspective(light.camera.projection, light.view_angle , 1, 0.1, light.range * 4);
          }
          light.camera.world_position = new Float32Array(light.camera.view.buffer, (12 * 4), 3);


        }

        light_camera = light.camera;

        if (light_camera.light_version !== light.version || update_light_camera_matrices) {

          if (light.light_type === 1) { // point light only set position
            light_camera.view[12] = light.world_position[0];
            light_camera.view[13] = light.world_position[1];
            light_camera.view[14] = light.world_position[2];
            //raw.math.vec3.copy(light_camera.world_position, light.world_position);
          }
          else {
            raw.math.mat4.copy(light_camera.view, light.matrix_world);
          }
          update_light_camera_matrices = true;
        }


        if (light_camera.camera_version !== camera.version || update_light_camera_matrices) {
          if (light.light_type === 0) {
            d = light.shadow_camera_distance;
            light_camera.world_position[0] = (camera.fw_vector[0] * (-d)) + camera.world_position[0];
            light_camera.world_position[1] = (camera.fw_vector[1] * (-d)) + camera.world_position[1];
            light_camera.world_position[2] = (camera.fw_vector[2] * (-d)) + camera.world_position[2];
          }
        
          update_light_camera_matrices = true;
        }


        if (update_light_camera_matrices) {
          raw.math.mat4.inverse(light_camera.view_inverse, light_camera.view);
          raw.math.mat4.multiply(light_camera.view_projection, light_camera.projection, light_camera.view_inverse);
        }


        light_camera.camera_version = camera.version;
        light_camera.light_version = light.version;
        light_camera.version = camera.version + light.version;


        shadow_map.bind();

        this.gl.cullFace(1028);
        total_shadow_casters = render_shadow_casters(this, light, light_camera, opuque_meshes);
        if (transparent_meshes.length > 0) {
          this.gl.enable(3042);
          this.gl.blendFunc(770, 771);
          total_shadow_casters += render_shadow_casters(this, light, light_camera, transparent_meshes);
        }

        
        u_shadow_params_rw[0] = light.shadow_intensity;
        u_shadow_params_rw[1] = 1 / light.shadow_map_size;
        u_shadow_params_rw[2] = light.shadow_bias;

        u_light_dir_rw[0] = light.matrix_world[8];
        u_light_dir_rw[1] = light.matrix_world[9];
        u_light_dir_rw[2] = light.matrix_world[10];


        // light camera view angle  to clamp shadow
        u_shadow_params_rw[3] = Math.cos(light.view_angle * 0.5);
        

        if (light.light_type === 0) {
          u_light_pos_rw[0] = u_light_dir_rw[0] * light.range;
          u_light_pos_rw[1] = u_light_dir_rw[1] * light.range;
          u_light_pos_rw[2] = u_light_dir_rw[2] * light.range;
        }
        else {         

          raw.math.vec3.copy(u_light_pos_rw, light.world_position);
        }


        this.gl.cullFace(1029);


        
        //s1.bind();        
        //this.use_direct_texture(shadow_map.depth_texture, 4);
        //render_shadow_receivers(this, light, light_camera, camera, opuque_meshes);

        this.set_default_viewport();

        if (total_shadow_casters > 0) {
          this.receive_shadow_count = 0;

          if (light.light_type === 1) {
            u_shadow_attenuation_rw[0] = 0;
            u_shadow_attenuation_rw[1] = (
              light.attenuation[0]
              + light.attenuation[1] 

            )*2;
            u_shadow_attenuation_rw[2] = light.attenuation[2]*2;
            u_shadow_attenuation_rw[3] = light.range * 0.95;
          }
          else if (light.light_type === 2) {
            u_shadow_attenuation_rw[0] = 0;
            u_shadow_attenuation_rw[1] = (
             light.attenuation[1]

            ) * 0.75;
            u_shadow_attenuation_rw[2] = light.attenuation[2]*0.5;
            u_shadow_attenuation_rw[3] = light.range;

            u_shadow_attenuation_rw[0] = 1;
            u_shadow_attenuation_rw[1] = 0;
            u_shadow_attenuation_rw[2] = 0;
            u_shadow_attenuation_rw[3] = light.range;

          }
          else {

           // u_shadow_params_rw[0] = light.shadow_intensity * (light.range * 0.5);
            u_shadow_attenuation_rw[0] = 1;
            u_shadow_attenuation_rw[1] = 0;
            u_shadow_attenuation_rw[2] = 0;
            u_shadow_attenuation_rw[3] = light.range;
            
          }
          



          
          this.enable_fw_rendering();
          this.gl.blendEquation(32779);
          this.use_direct_texture(shadow_map.color_texture, 0);
          this.use_direct_texture(shadow_map.depth_texture, 4);          
          render_shadow_receivers(this, light, light_camera, camera, opuque_meshes);
          if (transparent_meshes.length > 0) {
            this.gl.depthFunc(513);
            render_shadow_receivers(this, light, light_camera, camera, transparent_meshes);
          }
          this.gl.blendEquation(32774);
          this.disable_fw_rendering();
        }


        



      //  this.draw_textured_quad(shadow_map.color_texture,0.65,0.5,0.25,0.35);



      }
    })();

    proto.render_pickables = (function () {



      var uint32_color_id = new Uint32Array(1);
      var byte_id = new Uint8Array(uint32_color_id.buffer);
      var u_color_id_rw = new Float32Array(4);


      proto.read_picking_color_id = function (mx, my) {
        mx = mx * this.gl.pixel_ratio;
        my = my * this.gl.pixel_ratio;
        my = this.gl.canvas.height - my;
        this.gl.readPixels(mx, my, 1, 1, 6408, 5121, byte_id);
        return uint32_color_id[0];
      };

      proto.create_picking_color_id = function () {
        uint32_color_id[0] = this.picking_color_id;
        byte_id[3] = 255;
        this.picking_color_id += 8;
        return uint32_color_id[0];
      };




      proto.set_picking_color_id = function (id) {
        uint32_color_id[0] = id;
        byte_id[3] = 255;
        u_color_id_rw[0] = byte_id[0];
        u_color_id_rw[1] = byte_id[1];
        u_color_id_rw[2] = byte_id[2];
        u_color_id_rw[3] = byte_id[3];
        this.active_shader.set_uniform('u_color_id_rw', u_color_id_rw);
        return uint32_color_id[0];
      };

      return function () {
        this.pickables_pass = true;
        this.render_target1.bind();
        this.disable_fw_rendering();
        this.gl.clear(16384 | 256);

        for (i0 = 0; i0 < pickable_meshes.length; i0++) {
          mesh = pickable_meshes.data[i0];

          if (!mesh.material.shader.pickable) {
            mesh.material.shader.pickable = mesh.material.shader.extend(glsl['pickable-mesh'], { fragment: false });
          }

          if (this.use_shader(mesh.material.shader.pickable)) {
            this.update_camera_uniforms(camera);
          }


          this.update_model_uniforms(mesh);
          if (!mesh.picking_color_id) {
            mesh.picking_color_id = this.set_picking_color_id(this.picking_color_id);
            this.picking_color_id += 8;
          }
          else {
            this.set_picking_color_id(mesh.picking_color_id);
          }


          this.render_mesh(mesh);
        }


        this.pickables_pass = false;
      }

    })();

    var list = null, time_start=0;
    proto.step = function () {

     // time_start = Date.now();
      this.worked_items = 0;

      
      this.begin_render();
      pickable_meshes.clear();
      while ((list = this.ecs.iterate_entities("render_list")) !== null) {
        this.render_list(list.render_list);
      }
      this.end_render();
      if (this.enable_pickables && pickable_meshes.length > 0) {
        this.render_pickables();
      }

     // this.frame_time = (Date.now() - time_start);
      
      
    };
    return function (list) {
      camera = list.camera.camera;
      this.active_camera = camera;

      transparent_meshes.clear();
      opuque_meshes.clear();
      flat_meshes.clear();

      
      for (i0 = 0; i0 < list.meshes.length; i0++) {
        mesh = list.meshes.data[i0];

        if ((mesh.material.flags & 128)) {
          transparent_meshes.push(mesh);
        }
        else {
          if (mesh.material.flags & 2) {
            flat_meshes.push(mesh);
          }
          else {
            opuque_meshes.push(mesh);
          }
        }

        if (mesh.material.flags & 8192) {
          pickable_meshes.push(mesh);
        }


      }

      if (transparent_meshes.length > 0) {
        raw.merge_sort(transparent_meshes.data, transparent_meshes.length, transparent_meshes_sort);
      }
      _this = this;

      this.disable_fw_rendering();

      _this.lights_meshes_rendered = 0;
      if (opuque_meshes.length > 0) {
        _this.render_lighting(camera, list.lights, function (update_shading_lights) {
          for (i0 = 0; i0 < opuque_meshes.length; i0++) {
            mesh = opuque_meshes.data[i0];

            if (_this.light_pass_count >= mesh.material.light_pass_limit) continue;
            if (_this.use_shader(mesh.material.shader) || update_shading_lights) {
              update_shading_lights = false;
              _this.update_camera_uniforms(camera);
              _this.update_shading_lights(camera, mesh.material.lights_count);

            }
            _this.update_model_uniforms(mesh);
            _this.render_mesh(mesh);

          }

        });
      }

      this.disable_fw_rendering();

      for (i0 = 0; i0 < flat_meshes.length; i0++) {
        mesh = flat_meshes.data[i0];
        if (this.use_shader(mesh.material.shader)) {
          this.update_camera_uniforms(camera);
        }
        this.update_model_uniforms(mesh);
        this.render_mesh(mesh);
      }


      this.texture_slots[0] = -1;
      for (i0 = 0; i0 < list.lights.length; i0++) {
        light = list.lights.data[i0];
        if (light.cast_shadows) this.render_light_shadows(light);

      }

      this.disable_fw_rendering();

      //return;

      for (i0 = 0; i0 < transparent_meshes.length; i0++) {
        mesh = transparent_meshes.data[i0];

        if (mesh.material.flags & 4) {
          if (_this.light_pass_count >= mesh.material.light_pass_limit) continue;
          _this.render_lighting(camera, list.lights, function (update_shading_lights) {
            if (_this.use_shader(mesh.material.shader) || update_shading_lights) {
              update_shading_lights = false;
              _this.update_camera_uniforms(camera);
              _this.update_model_uniforms(mesh);
              _this.update_shading_lights(camera, mesh.material.lights_count);

              if (_this.light_pass_count === 0) {
                _this.gl.enable(3042);
                _this.gl.blendFunc(770, 771);
                _this.gl.cullFace(1028);
                _this.render_mesh(mesh);
                _this.gl.cullFace(1029);
                _this.render_mesh(mesh);
              }
              else {
                _this.gl.blendFunc(770, 1);
                _this.render_mesh(mesh);
              }
            }


          });
          _this.disable_fw_rendering();
        }
        else {
          if (_this.use_shader(mesh.material.shader)) {
            this.update_camera_uniforms(camera);
          }
          this.update_model_uniforms(mesh);
          this.gl.enable(3042);
          this.gl.blendFunc(770, 771);
          this.render_mesh(mesh);
        }
      }
      this.disable_fw_rendering();





    }


  })();

  proto.validate = function (ecs) {
    ecs.use_component('render_list');
  };

  proto.get_element = function () {
    return this.gl.canvas;
  };




  return render_system;

}, raw.ecs.system));

/*src/application.js*/

﻿raw.application = {};
raw.application['3d'] = raw.define(function (proto, _super) {

  proto.run_debug = function (cb,step_size) {
    var last_fps_display_time = 0, app = this, i = 0;
    setTimeout(function () {
      app.camera.transform.require_update = 1;
    }, 100);
    var ctx = app.renderer.debug_canvas ? app.renderer.debug_canvas.ctx : undefined;
    app.fps_timer.loop(function (delta) {

      app.timer = app.fps_timer.current_timer;
      cb(delta);
      app.tick_debug(delta);
      if (app.fps_timer.current_timer - last_fps_display_time > 0.25) {
        last_fps_display_time = app.fps_timer.current_timer;
        if (ctx) {
          ctx.fillStyle = "rgba(0, 0, 0, 0)";
          ctx.clearRect(0, 0, app.renderer.debug_canvas.width, app.renderer.debug_canvas.height);          
          ctx.fillStyle = "#fff";
          ctx.font = "12px arial";
          ctx.fillText(app.fps_timer.fps + ' fps', 1, 10);
          for (i = 0; i < app._systems.length; i++) {
            sys = app._systems[i];
            ctx.fillText(
              sys.name_id + ' ' + sys.frame_time + ' ms /' + sys.worked_items
              , 1, (i * 20) + 30);
          }

          app.update_debug_canvas(ctx);
          app.renderer.update_debug_canvas();
        }
      }




    }, step_size);
  }

  proto.create_render_item = function (item, cb) {
    var m = this.create_entity({
      components: {
        'transform':  {},
        'render_item': {
          items: [item]
        }
      }
    });
    if (cb) cb(m, item);
    return m;
  };

  
  proto.update_debug_canvas = function () {

  };

  function _3d(def) {
    def = def || {};
    _super.apply(this, [def]);
    def.renderer = def.renderer || {};
    this.renderer = this.use_system('render_system',
      raw.merge_object(def.renderer, {
        show_debug_canvas: true
      }, true));

    def.camera = def.camera || {};

    this.camera = this.create_entity({
      components: {
        'transform': def.camera.transform || {},
        'camera': raw.merge_object(def.camera, {
          type: 'perspective',
          far: 5000,
          near:0.1
        }, true) ,
        'transform_controller': def.camera.transform_controller || {}
      }
    });
   

    this.fps_timer = new raw.fps_timer();
    this.render_list = this.create_entity({
      components: {
        'render_list': {
          camera: this.camera,
          layer: 1
        },
      }
    });

  }

  return _3d;
}, raw.ecs);


/*src/main.js*/





















console.log(raw);




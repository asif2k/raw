
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


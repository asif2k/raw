const fs = require('fs');
const path = require('path');


function _mm(match, func) {
  if (match !== null) match.forEach(func);
}



let entryPath = false;
function processTextFile(file, refFile) {
  let realFile = file;
  if (refFile) {
    realFile = path.resolve(entryPath, file);
  }
  return parseImportExport(fs.readFileSync(realFile, 'ascii'), file);
}



let content = '';
function parseImportExport(text, refFile) {

  //import(?:["'\s]*([\w*{}\n, ]+)from\s*)?["'\s].*([@\w/_-]+)["'\s].*
  //(import|export)[\s\S]*?from\s*[\s\S]*?.js'\s*(\n|;


  _mm(text.match(/(import|export)(?:["'\s]*([\w*{}\n, ]+)from\s*)?["'\s].*(js)["'\s]/g), m => {
    processModule(m.split('from')[1].trim().replace(/'|"/g, ''), refFile);
    text = text.replace(m, '');
  });

  _mm(text.match(/import\(["'\s][\s\S]*?.*["'\s]\)/g), m => {
    console.log(m);
    content = processTextFile(m.replace(/import\(["'\s]|["'\s]\)/g, '').trim(), refFile).replace(/o\;\?/g, '');
    //console.log(content);
    content = content.replace(/  /g, ' ')
      //  .replace(/\r?\n|\r/g, '')
      .replace(/\t/g, '').replace(/\"/g, '\\"').replace(/o\;\?/g, '')
    text = text.replace(m, '`' + content + '`');

    text = text.replace(/\\newline/g, '\\n\\r');
  });


  _mm(text.match(/export\s*default[\s\S]*?;/g), m => {
    text = text.replace(m, `export {${m = m.replace(/export\s*default/g, '').replace(';', '').trim()}}`)
  });
  return text;
}



let output = [];
let processedModules = {};
function processModule(file, refFile) {
  entryPath = entryPath || path.dirname(file);
  let realFile = file;
  if (refFile) realFile = path.resolve(entryPath, file);
  if (processedModules[realFile]) return;
  let source = parseImportExport(fs.readFileSync(realFile, 'utf8'), file);
  if (refFile) file = path.dirname(refFile) + '/' + file.replace('./', '');

  console.log(file);

  output.push(`\n/*${file}*/\n`);
  output.push(`\n${source}\n`);
  processedModules[realFile] = true;
}

let processing = false;

var raw_text;

const traverse_object = (function () {

  let key;
  function func(obj, cb, pkey) {
    pkey = pkey || "";
    pkey = pkey.length > 0 ? pkey + "." : pkey;
    for (key in obj) {
      if (Object.prototype.toString.call(obj[key]).toLocaleLowerCase() === '[object object]') {
        func(obj[key], cb, pkey + key);
      }
      else cb(pkey + key, obj[key]);
    }
  }

  return func;

})();

function processAll() {
  if (processing) return;
  processing = true;
  processedModules = {};
  output = [];
  processModule('src/main.js');
  raw_text = output.join('');


  var constants = fs.readFileSync('src/constants.js', 'ascii');
  var raw = { assign: Object.assign };

  eval(constants);
  //console.log(raw);

  var rg;
  var list = [];
  traverse_object(raw, function (k, v) {
    if (k !== "assign") {
      list.push([k, v]);
    }
  });
  list.sort(function (a, b) {
    return b[0].length - a[0].length;
  });
  list.forEach(function (a) {
    rg = new RegExp('raw.' + a[0], 'g');
    raw_text = raw_text.replace(rg, a[1]);
  });

  fs.writeFileSync(__dirname + '/raw.js', raw_text);
  processing = false;
}

processAll();

let requireProcces = false;
function watchBuild() {
  function checkForProcess() {
    if (requireProcces) {
      processAll();
      requireProcces = false;
    }
    setTimeout(checkForProcess, 2000);
  }
  checkForProcess();
  console.log('watching files changes ......................');
  fs.watch(__dirname + '/src', (eventType, filename) => {
    if (filename) {
      if (filename.endsWith('.js') || filename.endsWith('.glsl')) {
        requireProcces = true;
      }
    }

  });

  fs.watch(__dirname + '/src/shaders', (eventType, filename) => {
    if (filename) {
      if (filename.endsWith('.glsl')) {
        requireProcces = true;
      }
    }

  });
}

if (process.argv && process.argv.length > 2) {
  switch (process.argv[2]) {
    case '--watch':
      watchBuild();
      break;
    default:
      console.log('invalid argument');
  }
}


const exec = require("child_process").exec;

exec("http-serve");
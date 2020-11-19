raw is a small and simple webgl 3d game engine using vanilla javascript and webgl 1.1 api, its still in development and the goal is speed over accuracy, it is designed to develop games for the web which can run on desktop and mobile devices.



## Main Features:
```
Hybrid entity component system
Transform hierarchy with animation system
Extendable shader system
Phong model material system
Fast and dirty shadow mapping system
Unlimited lights system using forward rendering
Worker based large terrain system with dynamic level of details and mesh simplification
Skeletal animation system with basic inverse kinematics using FABRIK
```




## Roadmap
```
Worker based physics engine with web assembly
Improve critical systems using web assembly
Dynamic sound system using basic sound sampler and synthesizer  
Webvr support with positional 3d sound
Tools for world editor and game designer
```

Trying to add more features , but need to keep it simple and easy to use.

## Build
it has a very simple build mechanism using only nodejs in order to keep vanilla javascript, it just put shaders and javascript files together on proper places and export a single javascript file 'raw.js'

however i use http-serve to test and run demos


## Demos

Lights ,shadows and transparent objects
https://asif2k.github.io/raw/demos/demo1.html

Large terrain with dyamic lod and mesh simplification
https://asif2k.github.io/raw/demos/terrain.html

## Usage
```

// create app object and define components to use
var app = new raw.ecs({
    components: [
      'transform',
      'camera',
      'transform_controller',      
      'render_item',
      'terrain',
      'render_list',  
    ]
});

// create renderer system , app must have a renderer system
 var renderer = app.use_system('render_system', {});

 // create an entity and attach camera and other required components
  var camera = app.create_entity({
    components: {
      'transform': {},
      'camera': {
        far: 2000
      },
      'transform_controller': { }
    }
  });

  // create an entity and attach render item(render item can be a mesh and light) and other required components
  var default_light = app.create_entity({
    components: {
      'transform': { position: [220, 220, 220] },
      'render_item': {
        items: [new raw.shading.light()]
      },
      'transform_controller': { rotate: [0,1, 0] }
    }
  });


  // create an entity and attach render item(render item can be a mesh and light) and other required components
  var box = app.create_entity({
    components: {
      'transform': { position: [0, 1,0] },
      'render_item': {
        items: [new raw.rendering.mesh({
            geometry: raw.geometry.cube(),
            new raw.shading.shaded_material()
          })]
      },
    }
  });



  var fps_timer = new raw.fps_timer();
  fps_timer.loop(function (delta) {   
      app.timer = fps_timer.current_timer;      
      app.tick_debug(delta);
    },
  1/60);

```

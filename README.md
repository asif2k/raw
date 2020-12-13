raw is a small and simple webgl 3d game engine using vanilla javascript and webgl 1.1 api, its still in development and the goal is speed over accuracy, it is designed to develop games for the web which can run on desktop and mobile devices.



## Main Features:
```
Hybrid entity component system
Transform hierarchy with animation system
Extendable shader system (highly overridable shader model)
Phong model material system with light (directional light, spot light , point light)
Unlimited lights system using forward rendering
Fast and dirty shadow mapping system
Multi threaded large terrain system with dynamic level of details and mesh optimization
Skeletal system with dual quaternion skinning
Basic inverse kinematics using FABRIK
```




## Roadmap
```
Multi threaded physics engine implement using web assembly
Improve critical systems using web assembly
Multi threaded particle system
Dynamic sound system using basic sound sampler and synthesizer  
Webvr support with positional 3d sound
Tools for world editor and game designer
```

Trying to add more features , but need to keep it simple and easy to use.

## Build
it has a very simple build mechanism using only nodejs in order to keep vanilla javascript, it just put shaders and javascript files together on proper places and export a single javascript file 'raw.js'

however i use http-serve to test and run demos


## Demos

directional light with shadows and transparent objects

https://asif2k.github.io/raw/demos/light_shadows.html


spot light with shadows and transparent objects

https://asif2k.github.io/raw/demos/spot_light.html


point light with fake shadows(simulated spot light shadows with wide view angle 160 degree ) and transparent objects

https://asif2k.github.io/raw/demos/point_light.html


stress test with many lights , untill fps is greater than 55 it will keep adding 10 lights per step

https://asif2k.github.io/raw/demos/lights.html



Large terrain with dyamic lod and mesh optimization

https://asif2k.github.io/raw/demos/terrain.html


Particle system basic demo

https://asif2k.github.io/raw/demos/particles.html



## Usage
```

   var my_app = new raw.application['3d']({
      renderer: { pixel_ratio: 1 },
      camera: { far: 2000 }
    });
    window.onresize = function () {
      my_app.renderer.set_canvas_size(window.innerWidth, window.innerHeight);
      my_app.camera.camera.update_aspect(window.innerWidth / window.innerHeight);
    };
    window.onresize();

    document.body.appendChild(my_app.renderer.get_element());
    var scene_light = my_app.create_render_item(new raw.shading.light(), function (entity, light) {
      entity.transform.rotate_eular(-125 * raw.math.DEGTORAD, 160 * raw.math.DEGTORAD, 0);

      light.set_intensity(1).set_ambient(0.8, 0.8, 0.8);
    });

    my_app.create_render_item(new raw.rendering.mesh({
      geometry: raw.geometry.cube({ size: 2 }),
      material: new raw.shading.shaded_material()
    }), function (entity, box) {
        entity.transform.set_position(0, 0, 0);
    });

    console.log(my_app);

    my_app.camera.transform_controller.set_position(0, 0, 10);
  

    my_app.run_debug(function (delta) {

    }, 1 / 60);



```

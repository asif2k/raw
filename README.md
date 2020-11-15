raw is a small and simple webgl 3d engine using vanilla javascript and webgl 1.1 api, its still in development and the goal is speed over accuracy, it is designed to develop games for the web which can run on desktop and mobile devices.



## Main Features:
```
Hybrid entity component system
Transform hierarchy with animation system
Extendable shader system
Phong model material system
Fast and dirty shadow mapping system
Unlimited lights system using forward rendering
Worker based infinite terrain system with dynamic level of details
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



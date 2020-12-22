/*chunk-base-system*/
<?=chunk('precision')?>

attribute vec4 a_position_rw;


uniform mat4 u_view_projection_rw;
uniform mat4 u_model_rw;

varying float v_life_rw;


void vertex(void){    
  v_life_rw= a_position_rw.w;  
  gl_Position=u_view_projection_rw*vec4(a_position_rw.xyz,1.0);    
  gl_PointSize =50.0/gl_Position.w;    
  
}
<?=chunk('precision')?>


varying float v_life_rw;
void fragment(void) {	
    gl_FragColor = vec4(1.0);
    gl_FragColor.a*=v_life_rw;
}







/*chunk-point-sprite-system*/
<?=chunk('precision')?>

attribute vec4 a_position_rw;


uniform vec4 u_texture_sets_rw[10];

uniform mat4 u_view_projection_rw;
uniform mat4 u_model_rw;

varying float v_life_rw;
varying float v_life_blend;
varying vec4 v_texture_set_rw;
varying vec2 v_texture_coord1_rw;
varying vec2 v_texture_coord2_rw;
void vertex(void){    
  v_life_rw= fract(a_position_rw.w);  
  int texture_set =int(fract(a_position_rw.w * 256.0)*255.0);
  float size = (fract(a_position_rw.w * 65536.0)*255.0);

  v_texture_set_rw=u_texture_sets_rw[texture_set];

  gl_Position=u_view_projection_rw*vec4(a_position_rw.xyz,1.0);    
  gl_PointSize =(size/gl_Position.w)*5.0;    

    float d=v_texture_set_rw.z/v_texture_set_rw.w;
    
    float lf=((1.0-v_life_rw)/(1.0/d));

    v_life_blend=fract(lf);

    v_texture_coord1_rw=vec2(floor(lf)*v_texture_set_rw.w,0.0);
    v_texture_coord2_rw=vec2(v_texture_coord1_rw.x+v_texture_set_rw.w,v_texture_coord1_rw.y);

    v_texture_coord2_rw=v_texture_coord1_rw;



}
<?=chunk('precision')?>



uniform sampler2D u_texture_rw;

varying float v_life_rw;
varying float v_life_blend;
varying vec4 v_texture_set_rw;
varying vec2 v_texture_coord1_rw;
varying vec2 v_texture_coord2_rw;
void fragment(void) {	
    
    vec2 coords =gl_PointCoord*v_texture_set_rw.w+v_texture_set_rw.xy;
    gl_FragColor =mix( texture2D(u_texture_rw, coords+v_texture_coord1_rw),
    texture2D(u_texture_rw, coords+v_texture_coord2_rw),v_life_blend);


     
}



/*chunk-quad-sprite-system*/
<?=chunk('precision')?>

attribute vec3 a_position_rw;

attribute vec4 a_particle_pos_rw;
attribute vec4 a_particle_info_rw;

uniform mat4 u_view_projection_rw;

uniform vec3 u_view_sd;
uniform vec3 u_view_up;

uniform vec4 u_texture_sets_rw[10];
varying vec4 v_particle_color_rw;
varying vec3 v_texture_mode_rw;
varying vec4 v_texture_set_rw;
varying float v_particle_life_rw;
varying float v_texture_blend_rw;
varying vec2 v_texture_coord0_rw;
varying vec2 v_texture_coord1_rw;
varying vec2 v_texture_coord2_rw;

void vertex(void){    
  
  float rotation=a_particle_info_rw[1];
  float scale=a_particle_info_rw[2];

  v_particle_life_rw=a_particle_info_rw[0];

 gl_Position.x = (a_position_rw.x * cos(rotation) - a_position_rw.y * sin(rotation));
 gl_Position.y = (a_position_rw.x * sin(rotation) + a_position_rw.y * cos(rotation));
 gl_Position.w=1.0;


 v_particle_color_rw.r= fract(a_particle_pos_rw.w);  
 v_particle_color_rw.g= fract(a_particle_pos_rw.w * 256.0);
 v_particle_color_rw.b= fract(a_particle_pos_rw.w * 65536.0);   
 v_particle_color_rw.a=fract(a_particle_info_rw[3]);

  int texture_set =int(fract(a_particle_info_rw[3] * 256.0)*256.0)-1;
  v_texture_mode_rw.b=1.0;




  if(texture_set>-1){
    int texture_alpha =int(fract(a_particle_info_rw[3] * 65536.0)*256.0)-1;

  v_texture_mode_rw.b=0.0;
  if(texture_alpha>-1){
   v_texture_mode_rw.r=1.0;
  }
  else {
   v_texture_mode_rw.g=1.0;
  }

   v_texture_set_rw=u_texture_sets_rw[texture_set];
   float d=v_texture_set_rw.z/v_texture_set_rw.w;
    
    float lf=((1.0-v_particle_life_rw)/(1.0/d));

    v_texture_blend_rw=fract(lf);

    
    v_particle_color_rw.r=1.0;
   

    v_texture_coord1_rw=vec2(floor(lf)*v_texture_set_rw.w,0.0);
    v_texture_coord2_rw=vec2(v_texture_coord1_rw.x+v_texture_set_rw.w,0.0);
      
      v_texture_coord2_rw=v_texture_coord1_rw;
   }

  

    v_texture_coord0_rw=a_position_rw.xy+0.5;
    v_texture_coord0_rw.y=1.0-v_texture_coord0_rw.y;

 gl_Position.xyz = a_particle_pos_rw.xyz  + u_view_sd * gl_Position.x * scale + u_view_up * gl_Position.y * scale;
 gl_Position=u_view_projection_rw*gl_Position;

  
}
<?=chunk('precision')?>


uniform sampler2D u_texture_rw;

varying float v_particle_life_rw;
varying vec3 v_texture_mode_rw;

varying vec4 v_particle_color_rw;
varying vec4 v_texture_set_rw;
varying float v_texture_blend_rw;

varying vec2 v_texture_coord0_rw;
varying vec2 v_texture_coord1_rw;
varying vec2 v_texture_coord2_rw;
void fragment(void) {	

    vec2 coords =v_texture_coord0_rw*v_texture_set_rw.w+v_texture_set_rw.xy;
    vec4 color =mix( texture2D(u_texture_rw, coords+v_texture_coord1_rw),
    texture2D(u_texture_rw, coords+v_texture_coord2_rw),v_texture_blend_rw);
    

    gl_FragColor =
    (v_particle_color_rw*(color.a*v_texture_mode_rw.r))+
    (v_particle_color_rw*color*v_texture_mode_rw.g)+
    (v_particle_color_rw*v_texture_mode_rw.b);
}
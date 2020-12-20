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

   // v_texture_coord2_rw=v_texture_coord1_rw;



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
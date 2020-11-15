
/*chunk-flat-material*/

<?=chunk('precision')?>
attribute vec3 a_position_rw;
uniform mat4 u_view_projection_rw;

uniform vec3 reg_pos;
uniform vec3 cam_reg_pos;

varying vec4 v_position_rw;

void vertex(void){
  v_position_rw.z=floor(a_position_rw.x/cam_reg_pos.z);
  v_position_rw.x=floor(mod(a_position_rw.x,cam_reg_pos.z));
  v_position_rw.y=a_position_rw.y;  
  v_position_rw.w=1.0; 
  v_position_rw.xz+=reg_pos.xz;   
  gl_Position = u_view_projection_rw *v_position_rw;


}
<?=chunk('precision')?>

void fragment(void) {	

    gl_FragColor = vec4(1.0);
    
    

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

<?=chunk('fws-lighting')?>

varying vec2 v_uv_rw;
varying vec4 v_position_rw;
varying vec3 v_normal_rw;
varying vec4 v_color_rw;

uniform mat4 u_object_material_rw;
uniform sampler2D u_texture_rw;
uniform vec4 u_eye_position_rw;

void fragment(void) {
	vec3 fws_direction_to_eye = normalize(u_eye_position_rw.xyz - v_position_rw.xyz);	
	
	fws_total_light=fws_lighting_calc(u_object_material_rw,v_position_rw.xyz,
	normalize(v_normal_rw),fws_direction_to_eye);
	
	gl_FragColor = vec4(fws_total_light, u_object_material_rw[0].w)* 
	texture2D(u_texture_rw, v_uv_rw)* v_color_rw;	
	gl_FragColor.w*=u_object_material_rw[0].w;
	



	


}
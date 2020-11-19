
/*chunk-global-fog-effect*/
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
	gl_FragColor=vec4(1.0);	
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
uniform vec3 u_shadow_params_rw;
uniform vec3 u_light_pos_rw;
varying vec2 v_uv_rw;
varying vec4 v_position_rw;



float get_shadow_sample() {		

	float f=texture2D(u_texture_rw, v_uv_rw).a;		

	vec3 shadow_map_coords =v_shadow_light_vertex_rw.xyz/v_shadow_light_vertex_rw.w;
	f*=step(-(dot(v_normal_rw,normalize(u_light_pos_rw - v_position_rw.xyz))),0.0);

	shadow_map_coords.xyz = shadow_map_coords.xyz * 0.5 + 0.5;

	f*=step(shadow_map_coords.x,1.0)*step(shadow_map_coords.y,1.0)*step(shadow_map_coords.z,1.0);
	f*=step(0.0,shadow_map_coords.x)*step(0.0,shadow_map_coords.y)*step(0.0,shadow_map_coords.y);
	
	return (0.5*f)-sample_shadow_map_pcf(u_shadow_map_rw, shadow_map_coords.xy,
	shadow_map_coords.z-u_shadow_params_rw.z ,vec2(u_shadow_params_rw.y))*f;

		
}


void fragment(void) {	
gl_FragColor = vec4((get_shadow_sample()*u_shadow_params_rw.x));

}
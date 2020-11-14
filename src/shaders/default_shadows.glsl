/*chunk-map*/
<?=chunk('precision')?>

uniform sampler2D u_texture_rw;
varying vec2 v_uv_rw;

void fragment(void) {		
	if(texture2D(u_texture_rw, v_uv_rw).a<0.02) discard;	
	gl_FragColor=vec4(1.0);	
}

/*chunk-receiver*/
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
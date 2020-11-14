/*chunk-precision*/ 
#extension GL_OES_standard_derivatives : enable\newline
#if GL_FRAGMENT_PRECISION_HIGH == 1\newline
    precision highp float;\newline
#else\newline
precision mediump float;\newline
#endif\newline


/*chunk-fws-lighting*/

<?for(var i= 0;i<param('fws_num_lights');i++) {?>
	uniform mat4 u_light_material_rw<?=i?>;
	uniform mat4 u_light_matrix_rw<?=i?>;
<?}?>





float fws_distance_to_light;
float fws_lambertian;
float fws_specular;
float fws_attenuation;
float fws_intensity;
float fws_spot_light_calc;
float fws_spot_theta;
float fws_spot_light_status;

vec3 fws_total_light;
vec3 fws_light_value;

vec3 fws_lighting(mat4 fws_object_material, mat4 fws_light_material,
	vec3 fws_vertex_position, vec3 fws_vertex_normal,
	vec3 fws_direction_to_eye,vec3 fws_direction_to_light, vec3 fws_direction_from_light) {

	fws_distance_to_light = length(fws_direction_to_light);

	

	fws_direction_to_light = normalize(fws_direction_to_light);
	fws_lambertian = max(dot(fws_direction_to_light, fws_vertex_normal), 0.0);


	fws_lambertian =dot(fws_direction_to_light, fws_vertex_normal);

	fws_intensity = fws_light_material[0].w;
	
	fws_attenuation = (fws_light_material[3].x + fws_light_material[3].y * fws_distance_to_light
		+ fws_light_material[3].z * (fws_distance_to_light * fws_distance_to_light)) + fws_light_material[3].w;

	fws_spot_light_status = step(0.000001, fws_light_material[1].w);
	fws_spot_theta = dot(fws_direction_to_light, fws_direction_from_light);
	fws_spot_light_calc = clamp((fws_spot_theta - fws_light_material[2].w) / (fws_light_material[1].w - fws_light_material[2].w), 0.0, 1.0);
	fws_intensity *= (fws_spot_light_status * (step(fws_light_material[1].w, fws_spot_theta) * fws_spot_light_calc))
		+ abs(1.0 - fws_spot_light_status);

	
	fws_specular = pow(max(dot(normalize(fws_direction_to_light.xyz + fws_direction_to_eye), fws_vertex_normal), 0.0), fws_object_material[2].w) * fws_lambertian;
	fws_specular *= fws_intensity * step(0.0, fws_lambertian);
	
	


	fws_light_value = (fws_light_material[0].xyz * fws_object_material[0].xyz) +
		(fws_object_material[1].xyz * fws_lambertian * fws_light_material[1].xyz * fws_intensity) +
		(fws_object_material[2].xyz * fws_specular * fws_light_material[2].xyz);

		fws_light_value=max(fws_light_value,0.0);


		
	return (fws_light_value / fws_attenuation);


}


vec3 fws_lighting_calc(mat4 object_material_rw,vec3 fws_vertex,vec3 fws_normal,vec3 fws_direction_to_eye){

	fws_total_light=vec3(0.0);
	<?for (var i = 0;i < param('fws_num_lights');i++) {?>
			fws_total_light += fws_lighting(
				object_material_rw,
				u_light_material_rw<?=i?>,
				fws_vertex, fws_normal, fws_direction_to_eye,
				u_light_matrix_rw<?=i?>[3].xyz - fws_vertex,
				u_light_matrix_rw<?=i?>[2].xyz);
	<?}?>

	return fws_total_light;
}





/*chunk-shadow-sampling*/

float sample_shadow_map(sampler2D shadowMap, vec2 coords, float compare)
{
	return step(compare, texture2D(shadowMap, coords.xy).r);
}

float sample_shadow_map_linear(sampler2D shadowMap, vec2 coords, float compare, vec2 texelSize)
{
	vec2 pixelPos = coords / texelSize + vec2(0.5);
	vec2 fracPart = fract(pixelPos);
	vec2 startTexel = (pixelPos - fracPart) * texelSize;

	float blTexel = sample_shadow_map(shadowMap, startTexel, compare);
	float brTexel = sample_shadow_map(shadowMap, startTexel + vec2(texelSize.x, 0.0), compare);
	float tlTexel = sample_shadow_map(shadowMap, startTexel + vec2(0.0, texelSize.y), compare);
	float trTexel = sample_shadow_map(shadowMap, startTexel + texelSize, compare);

	float mixA = mix(blTexel, tlTexel, fracPart.y);
	float mixB = mix(brTexel, trTexel, fracPart.y);

	return mix(mixA, mixB, fracPart.x);
}

float sample_shadow_map_pcf(sampler2D shadowMap, vec2 coords, float compare, vec2 texelSize)
{
	const float NUM_SAMPLES = 3.0;
	const float SAMPLES_START = (NUM_SAMPLES - 1.0) / 2.0;
	const float NUM_SAMPLES_SQUARED = NUM_SAMPLES * NUM_SAMPLES;

	float result = 0.0;
	for (float y = -SAMPLES_START; y <= SAMPLES_START; y += 1.0)
	{
		for (float x = -SAMPLES_START; x <= SAMPLES_START; x += 1.0)
		{
			vec2 coordsOffset = vec2(x, y) * texelSize;
			result += sample_shadow_map_linear(shadowMap, coords + coordsOffset, compare, texelSize);
		}
	}
	return result / NUM_SAMPLES_SQUARED;
}


/*chunk-timer*/
uniform vec3 u_timer_rw;


/*chunk-random*/
float random(vec3 seed, int i){
	vec4 seed4 = vec4(seed,i);
	float dot_product = dot(seed4, vec4(12.9898,78.233,45.164,94.673));
	return fract(sin(dot_product) * 43758.5453);
}



/*chunk-debug_aabbs*/

<?=chunk('precision')?>
attribute vec3 a_position_rw;
attribute vec3 a_box_position_rw;
attribute vec3 a_box_size_rw;
attribute vec3 a_box_color_rw;

uniform mat4 u_view_projection_rw;
uniform mat4 u_model_rw;
varying vec3 v_box_color_rw;
void vertex(){
    vec4 pos;
    pos.xyz=a_position_rw*a_box_size_rw;    
    pos.xyz+=a_box_position_rw;
    pos.w=1.0;    
    v_box_color_rw=a_box_color_rw;
    gl_Position = u_view_projection_rw*u_model_rw*pos;	
    gl_PointSize =5.0;

}
<?=chunk('precision')?>
varying vec3 v_box_color_rw;
void fragment(void) {	
gl_FragColor=vec4(v_box_color_rw,1.0);
}


/*chunk-pickable-mesh*/

<?=chunk('precision')?>

uniform vec4 u_color_id_rw;
void fragment(void) {			
	gl_FragColor=u_color_id_rw/255.0;
}


/*chunk-quat-dquat*/

vec3 quat_transform(vec4 q, vec3 v)
{
   return (v + cross(2.0 * q.xyz, cross(q.xyz, v) + q.w * v));
}
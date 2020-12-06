/*chunk-precision*/ 
#extension GL_OES_standard_derivatives : enable\newline
#if GL_FRAGMENT_PRECISION_HIGH == 1\newline
    precision highp float;\newline
#else\newline
precision mediump float;\newline
#endif\newline

const float DEGTORAD=0.017453292519943295;
const float RADTODEG=57.295779513082323;






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





/*chunk-quat-dquat*/

vec3 quat_transform(vec4 q, vec3 v)
{
   return (v + cross(2.0 * q.xyz, cross(q.xyz, v) + q.w * v));
}

/*chunk-mat3-transpose*/
mat3 transpose(mat3 m) {
  return mat3(m[0][0], m[1][0], m[2][0],
              m[0][1], m[1][1], m[2][1],
              m[0][2], m[1][2], m[2][2]);
}
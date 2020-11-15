/*chunk-default*/

<?=chunk('precision')?>
attribute vec3 a_position_rw;
const vec2 madd=vec2(0.5,0.5);
varying vec2 v_uv_rw;
void vertex()
{
    gl_Position = vec4(a_position_rw.xy,0.0,1.0);	
	v_uv_rw = a_position_rw.xy*madd+madd;  
}
<?=chunk('precision')?>
uniform sampler2D u_texture_input_rw;
varying vec2 v_uv_rw;
void fragment(void){	
gl_FragColor = texture2D(u_texture_input_rw, v_uv_rw) ;	


}



/*chunk-picture-adjustment*/

uniform mat3 u_pa_params;

void fragment(){	
	vec4 c = texture2D(u_texture_input_rw, v_uv_rw);
    if (c.a > 0.0) {

		
    }
        float gamma=u_pa_params[0].x;
		float contrast=u_pa_params[0].y;
		float saturation=u_pa_params[0].z;
		float brightness=u_pa_params[1].x;
		float red=u_pa_params[1].y;
		float green=u_pa_params[1].z;
		float blue=u_pa_params[2].x;
		
        //c.rgb /= c.a;

        vec3 rgb = pow(c.rgb, vec3(1.0 / gamma));
        rgb = mix(vec3(0.5), mix(vec3(dot(vec3(0.2125, 0.7154, 0.0721), rgb)), rgb, saturation), contrast);
        rgb.r *= red;
        rgb.g *= green;
        rgb.b *= blue;

        c.rgb = rgb * brightness;        
     //   c.rgb *= c.a;


	float alpha=u_pa_params[2].y;
    if(v_uv_rw.x>0.5)
        gl_FragColor = c * alpha;
    else 
        gl_FragColor =texture2D(u_texture_input_rw, v_uv_rw);
}


/*chunk-fxaa*/

uniform vec3 u_inverse_filter_texture_size;
uniform vec3 u_fxaa_params;

void fragment(void){	
	float R_fxaaSpanMax=u_fxaa_params.x;
	float R_fxaaReduceMin=u_fxaa_params.y;
	float R_fxaaReduceMul=u_fxaa_params.z;	
	vec2 texCoordOffset = u_inverse_filter_texture_size.xy;
	vec3 luma = vec3(0.299, 0.587, 0.114);	
	float lumaTL = dot(luma, texture2D(u_texture_input_rw, v_uv_rw.xy + (vec2(-1.0, -1.0) * texCoordOffset)).xyz);
	float lumaTR = dot(luma, texture2D(u_texture_input_rw, v_uv_rw.xy + (vec2(1.0, -1.0) * texCoordOffset)).xyz);
	float lumaBL = dot(luma, texture2D(u_texture_input_rw, v_uv_rw.xy + (vec2(-1.0, 1.0) * texCoordOffset)).xyz);
	float lumaBR = dot(luma, texture2D(u_texture_input_rw, v_uv_rw.xy + (vec2(1.0, 1.0) * texCoordOffset)).xyz);
	float lumaM  = dot(luma, texture2D(u_texture_input_rw, v_uv_rw.xy).xyz);

	vec2 dir;
	dir.x = -((lumaTL + lumaTR) - (lumaBL + lumaBR));
	dir.y = ((lumaTL + lumaBL) - (lumaTR + lumaBR));
	
	float dirReduce = max((lumaTL + lumaTR + lumaBL + lumaBR) * (R_fxaaReduceMul * 0.25), R_fxaaReduceMin);
	float inverseDirAdjustment = 1.0/(min(abs(dir.x), abs(dir.y)) + dirReduce);
	
	dir = min(vec2(R_fxaaSpanMax, R_fxaaSpanMax), 
		max(vec2(-R_fxaaSpanMax, -R_fxaaSpanMax), dir * inverseDirAdjustment)) * texCoordOffset;

	vec3 result1 = (1.0/2.0) * (
		texture2D(u_texture_input_rw, v_uv_rw.xy + (dir * vec2(1.0/3.0 - 0.5))).xyz +
		texture2D(u_texture_input_rw, v_uv_rw.xy + (dir * vec2(2.0/3.0 - 0.5))).xyz);

	vec3 result2 = result1 * (1.0/2.0) + (1.0/4.0) * (
		texture2D(u_texture_input_rw, v_uv_rw.xy + (dir * vec2(0.0/3.0 - 0.5))).xyz +
		texture2D(u_texture_input_rw, v_uv_rw.xy + (dir * vec2(3.0/3.0 - 0.5))).xyz);

	float lumaMin = min(lumaM, min(min(lumaTL, lumaTR), min(lumaBL, lumaBR)));
	float lumaMax = max(lumaM, max(max(lumaTL, lumaTR), max(lumaBL, lumaBR)));
	float lumaResult2 = dot(luma, result2);
	

if(lumaResult2 < lumaMin || lumaResult2 > lumaMax)
		gl_FragColor = vec4(result1, 1.0);
	else
		gl_FragColor = vec4(result2, 1.0);

if(v_uv_rw.x<0.5){
    gl_FragColor=texture2D(u_texture_input_rw, v_uv_rw);
}
else {
	
gl_FragColor.rgb*=1.5;
}


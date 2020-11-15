
/*chunk-flat-material*/

<?=chunk('precision')?>
attribute vec3 a_position_rw;
uniform mat4 u_view_projection_rw;

uniform vec3 reg_pos;
uniform vec3 cam_reg_pos;

varying vec4 v_position_rw;
varying vec3 v_normal_rw;
varying vec2 v_uv_rw;
varying mat3 v_tbn_matrix;


<?=chunk('mat3-transpose')?>

void vertex(void){
  v_position_rw.z=floor(a_position_rw.x/cam_reg_pos.z);
  v_position_rw.x=floor(mod(a_position_rw.x,cam_reg_pos.z));
  v_position_rw.y=a_position_rw.y;  


  v_normal_rw.x = fract(a_position_rw.z);
  v_normal_rw.y = fract(a_position_rw.z* 256.0);  
  v_normal_rw.z = fract(a_position_rw.z * 65536.0);  


   v_normal_rw.x = (v_normal_rw.x * 2.0) - 1.0;
  v_normal_rw.y = (v_normal_rw.y * 2.0) - 1.0;
  v_normal_rw.z = (v_normal_rw.z * 2.0) - 1.0;  


  v_position_rw.w=1.0; 
  v_position_rw.xz+=reg_pos.xz;   
  gl_Position = u_view_projection_rw *v_position_rw;

  v_uv_rw=v_position_rw.xz;        
  v_uv_rw/=(cam_reg_pos.z-1.0);    
  v_normal_rw=normalize(v_normal_rw);

}

<?=chunk('precision')?>

uniform mat4 u_object_material_rw;
uniform vec4 u_eye_position_rw;

varying vec4 v_position_rw;
varying vec3 v_normal_rw;
varying vec2 v_uv_rw;
varying mat3 v_tbn_matrix;

<?=chunk('fws-lighting')?>

uniform vec3 land_color;

uniform sampler2D u_texture_tiles;

uniform vec2 u_tile_size_rw;
uniform vec4 u_tile_repeat_rw;

float tile_size;
vec2 tile_uv;
vec2 uv=vec2(0);
float tile_offset;

vec4 mix_texture_tiles(vec4 tile1,vec4 tile2,vec4 tile3,vec4 tile4,vec3 normal);
vec4 read_tile(sampler2D texture,float tile_repeat, float tx,float ty);

vec4 mix_texture_tiles(vec4 tile1,vec4 tile2,vec4 tile3,vec4 tile4,vec3 normal){
	return mix(tile1,tile3,abs(normal.y));
}


vec4 read_tile(sampler2D texture,float tile_repeat, float tx,float ty){
    uv.x=mod(v_uv_rw.x*tile_repeat,tile_size-(tile_offset*2.0));
    uv.y=mod(v_uv_rw.y*tile_repeat,tile_size-(tile_offset*2.0));
    uv.x+=tx*tile_size+tile_offset;
    uv.y+=ty*tile_size+tile_offset;
    return texture2D(texture, uv);
}

void fragment(void) {	

tile_size=u_tile_size_rw.x;
tile_offset=u_tile_size_rw.y;

   vec3 fws_direction_to_eye = normalize(u_eye_position_rw.xyz - v_position_rw.xyz);		
	fws_total_light=fws_lighting_calc(u_object_material_rw,v_position_rw.xyz,
	normalize(v_normal_rw),fws_direction_to_eye);	

	vec4 tile1=read_tile(u_texture_tiles,u_tile_repeat_rw.x, 0.0,0.0);
	vec4 tile2=read_tile(u_texture_tiles,u_tile_repeat_rw.y, 1.0,0.0);
	vec4 tile3=read_tile(u_texture_tiles,u_tile_repeat_rw.z, 0.0,1.0);
	vec4 tile4=read_tile(u_texture_tiles,u_tile_repeat_rw.w, 1.0,1.0);

	gl_FragColor = vec4(fws_total_light+land_color, u_object_material_rw[0].w)*	
	mix_texture_tiles(tile1,tile2,tile3,tile4,v_normal_rw);
	gl_FragColor.w*=u_object_material_rw[0].w;
}


/*chunk-default-material*/

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

<?=chunk('global-render-system-lighting')?>

<?=chunk('global-render-system-fog-effect')?>


uniform vec3 land_color;

uniform sampler2D u_texture_tiles_rw;
uniform sampler2D u_normalmap_tiles_rw;
uniform sampler2D u_shadow_map_rw;

uniform vec2 u_tile_size_rw;
uniform vec4 u_texture_repeat_rw;
uniform vec4 u_normalmap_repeat_rw;

float tile_size;
vec2 tile_uv;
vec2 uv=vec2(0);
float tile_offset;

vec4 mix_texture_tiles(vec4 tile1,vec4 tile2,vec4 tile3,vec4 tile4,vec3 normal);
vec4 read_tile(sampler2D texture,float tile_repeat, float tx,float ty);

vec4 mix_texture_tiles(vec4 tile1,vec4 tile2,vec4 tile3,vec4 tile4,vec3 normal){
	return mix(tile4,tile2,abs(normal.y));
}


vec4 read_tile(sampler2D texture,float tile_repeat, float tx,float ty){
    uv.x=mod(v_uv_rw.x*tile_repeat,tile_size-(tile_offset*2.0));
    uv.y=mod(v_uv_rw.y*tile_repeat,tile_size-(tile_offset*2.0));
    uv.x+=tx*tile_size+tile_offset;
    uv.y+=ty*tile_size+tile_offset;
    return texture2D(texture, uv);
}



vec2 texelSize=vec2(1.0/128.0,1.0/128.0);
float sample_smap(vec2 coords){	
	vec2 pixelPos = coords / texelSize + vec2(0.5);
	vec2 fracPart = fract(pixelPos);
	vec2 startTexel = (pixelPos - fracPart) * texelSize;
	float blTexel = texture2D(u_shadow_map_rw, startTexel).r;
	float brTexel = texture2D(u_shadow_map_rw, startTexel + vec2(texelSize.x, 0.0)).r;
	float tlTexel = texture2D(u_shadow_map_rw, startTexel + vec2(0.0, texelSize.y)).r;
	float trTexel = texture2D(u_shadow_map_rw, startTexel + texelSize).r;
	float mixA = mix(blTexel, tlTexel, fracPart.y);
	float mixB = mix(brTexel, trTexel, fracPart.y);
	return mix(mixA, mixB, fracPart.x);
}



float sample_smap_pcf(vec2 coords)
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
			result += sample_smap(coords + coordsOffset);
		}
	}
	return result / NUM_SAMPLES_SQUARED;
}




void fragment(void) {	

tile_size=u_tile_size_rw.x;
tile_offset=u_tile_size_rw.y;

  
	vec4 tile1=read_tile(u_texture_tiles_rw,u_texture_repeat_rw.x, 0.0,0.0);
	vec4 tile2=read_tile(u_texture_tiles_rw,u_texture_repeat_rw.y, 1.0,0.0);
	vec4 tile3=read_tile(u_texture_tiles_rw,u_texture_repeat_rw.z, 0.0,1.0);
	vec4 tile4=read_tile(u_texture_tiles_rw,u_texture_repeat_rw.w, 1.0,1.0);

	vec3 norm1=(2.0 * read_tile(u_normalmap_tiles_rw,u_normalmap_repeat_rw.x, 0.0,0.0).xyz - 1.0);
	vec3 norm2=(2.0 * read_tile(u_normalmap_tiles_rw,u_normalmap_repeat_rw.y, 1.0,0.0).xyz - 1.0);
	vec3 norm3=(2.0 * read_tile(u_normalmap_tiles_rw,u_normalmap_repeat_rw.z, 0.0,1.0).xyz - 1.0);
	vec3 norm4=(2.0 * read_tile(u_normalmap_tiles_rw,u_normalmap_repeat_rw.w, 1.0,1.0).xyz - 1.0);


	vec3 normal=(norm1*v_normal_rw.x)+(norm4*v_normal_rw.x)+(norm3*v_normal_rw.z);

	normal=normalize(v_normal_rw+normal);

	 vec3 fws_direction_to_eye = normalize(u_eye_position_rw.xyz - v_position_rw.xyz);		
	vec3 total_light=get_render_system_lighting(u_object_material_rw,v_position_rw.xyz,
	normal,
	fws_direction_to_eye);	

	


	gl_FragColor = vec4((total_light)*land_color, u_object_material_rw[0].w)*	
	mix_texture_tiles(tile1,tile2,tile3,tile4,normal);
	//gl_FragColor.w*=u_object_material_rw[0].w;
	gl_FragColor=mix_fog_color(gl_FragColor);
}



/*chunk-skybox*/
<?=chunk('precision')?>
attribute vec4 a_position_rw;
varying vec4 v_position_rw;

void vertex(){
  v_position_rw = a_position_rw;
  gl_Position = a_position_rw;
  gl_Position.z = 1.0;
}


<?=chunk('precision')?>
uniform mat4 u_view_projection_matrix_rw;
uniform vec4 u_sun_params_rw;
varying vec4 v_position_rw;
vec3 fragPosition;

const float turbidity = 10.0;
const float reileigh = 2.0;
const float mieCoefficient = 0.005;
const float mieDirectionalG = 0.8;

const float e = 2.71828182845904523536028747135266249775724709369995957;
const float pi = 3.141592653589793238462643383279502884197169;

const float n = 1.0003;// refractive index of air
const float N = 2.545E25; // number of molecules per unit volume for air at
											
const float pn = 0.035;
// wavelength of used primaries, according to preetham
const vec3 lambda = vec3(680E-9, 550E-9, 450E-9);

const vec3 K = vec3(0.686, 0.678, 0.666);
const float v = 4.0;

const float rayleighZenithLength = 8.4E3;
const float mieZenithLength = 1.25E3;
const vec3 up = vec3(0.0, 1.0, 0.0);

const float EE = 1000.0;

float sunAngularDiameterCos =u_sun_params_rw.w; // 0.999956;

const float cutoffAngle = pi/1.95;
const float steepness = 1.5;

vec3 simplifiedRayleigh() {
	return 0.0005 / vec3(94, 40, 18);
}

float rayleighPhase(float cosTheta) {
	return (3.0 / (16.0*pi)) * (1.0 + pow(cosTheta, 2.0));
}

vec3 totalMie(vec3 lambda, vec3 K, float T) {
	float c = (0.2 * T ) * 10E-18;
	return 0.434 * c * pi * pow((2.0 * pi) / lambda, vec3(v - 2.0)) * K;
}

float hgPhase(float cosTheta, float g) {
	return (1.0 / (4.0*pi)) * ((1.0 - pow(g, 2.0)) / pow(1.0 - 2.0*g*cosTheta + pow(g, 2.0), 1.5));
}

float sunIntensity(float zenithAngleCos) {	
	return EE * max(0.0, 1.0 - pow(e, -((cutoffAngle - acos(zenithAngleCos))/steepness)));
}

float A = 0.15;
float B = 0.50;
float C = 0.10;
float D = 0.20;
float E = 0.02;
float F = 0.30;
float W = 1000.0;

vec3 Uncharted2Tonemap(vec3 x) {
   return ((x*(A*x+C*B)+D*E)/(x*(A*x+B)+D*F))-E/F;
}

<?=chunk('global-render-system-fog-effect')?>

void fragment(void) {
	
   fragPosition=(u_view_projection_matrix_rw * v_position_rw).xyz;
	vec3 sunPosition=u_sun_params_rw.xyz;
	float sunfade = 1.0 - clamp(1.0 - exp(sunPosition.y), 0.0, 1.0);
	float reileighCoefficient = reileigh - (1.0 * (1.0-sunfade));
	vec3 sunDirection = normalize(sunPosition);
	float sunE = sunIntensity(dot(sunDirection, up));
	vec3 betaR = simplifiedRayleigh() * reileighCoefficient;

	// mie coefficients
	vec3 betaM = totalMie(lambda, K, turbidity) * mieCoefficient;

	// optical length
	// cutoff angle at 90 to avoid singularity in next formula.
	float zenithAngle = acos(max(0.0, dot(up, normalize(fragPosition))));
	float sR = rayleighZenithLength / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));
	float sM = mieZenithLength / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));

	// combined extinction factor
	vec3 Fex = exp(-(betaR * sR + betaM * sM));

	// in scattering
	float cosTheta = dot(normalize(fragPosition), sunDirection);

	float rPhase = rayleighPhase(cosTheta * 0.5+0.5);
	vec3 betaRTheta = betaR * rPhase;

	float mPhase = hgPhase(cosTheta, mieDirectionalG);
	vec3 betaMTheta = betaM * mPhase;

	vec3 Lin = pow(sunE * ((betaRTheta + betaMTheta) / (betaR + betaM)) * (1.0 - Fex),vec3(1.5));
	Lin *= mix(vec3(1.0),pow(sunE * ((betaRTheta + betaMTheta) / (betaR + betaM)) * Fex,vec3(1.0/2.0)),clamp(pow(1.0-dot(up, sunDirection),5.0),0.0,1.0));

	//nightsky
	vec3 direction = normalize(fragPosition);
	float theta = acos(direction.y); // elevation --> y-axis, [-pi/2, pi/2]
	float phi = atan(direction.z, direction.x); // azimuth --> x-axis [-pi/2, pi/2]
	vec2 uv = vec2(phi, theta) / vec2(2.0*pi, pi) + vec2(0.5, 0.0);
	vec3 L0 = vec3(0.1) * Fex;

	// composition + solar disc
	float sundisk = smoothstep(sunAngularDiameterCos,sunAngularDiameterCos+0.00002,cosTheta);
	L0 += (sunE * 19000.0 * Fex)*sundisk;

	vec3 whiteScale = 1.0/Uncharted2Tonemap(vec3(W));

	vec3 texColor = (Lin+L0);
	texColor *= 0.04 ;
	texColor += vec3(0.0,0.001,0.0025)*0.3;

	vec3 curr = Uncharted2Tonemap(texColor);
	vec3 color = curr*whiteScale;

	vec3 retColor = pow(color,vec3(1.0/(1.2+(1.2*sunfade))));

	gl_FragColor = vec4(retColor, 1.0);
	gl_FragColor=mix_fog_color(gl_FragColor);
	
}





/*chunk-skybox2*/
<?=chunk('precision')?>
attribute vec4 a_position_rw;
varying vec4 v_position_rw;

void vertex(){
  v_position_rw = a_position_rw;
  gl_Position = a_position_rw;
  gl_Position.z = 1.0;
}


<?=chunk('precision')?>
uniform mat4 u_view_projection_matrix_rw;
uniform vec4 u_sun_params_rw;
varying vec4 v_position_rw;


const float depolarizationFactor=0.067;
const float luminance=1.0;
const float mieCoefficient=0.00335;
const float mieDirectionalG=0.787;
const vec3 mieKCoefficient=vec3(0.686,0.678,0.666);
const float mieV=4.012;
const float mieZenithLength=500.0;
const float numMolecules=2.542e+25;
const vec3 primaries=vec3(6.8e-7,5.5e-7,4.5e-7);
const float rayleigh=1.0;
const float rayleighZenithLength=615.0;
const float refractiveIndex=1.000317;
const float sunAngularDiameterDegrees=0.00758;
const float sunIntensityFactor=1111.0;
const float sunIntensityFalloffSteepness=0.98;
const float tonemapWeighting=9.50;
const float turbidity=1.25;

const float PI = 3.141592653589793238462643383279502884197169;
const vec3 UP = vec3(0.0, 1.0, 0.0);

vec3 totalRayleigh(vec3 lambda)
{
	return (8.0 * pow(PI, 3.0) * pow(pow(refractiveIndex, 2.0) - 1.0, 2.0) * (6.0 + 3.0 * depolarizationFactor)) / (3.0 * numMolecules * pow(lambda, vec3(4.0)) * (6.0 - 7.0 * depolarizationFactor));
}

vec3 totalMie(vec3 lambda, vec3 K, float T)
{
	float c = 0.2 * T * 10e-18;
	return 0.434 * c * PI * pow((2.0 * PI) / lambda, vec3(mieV - 2.0)) * K;
}

float rayleighPhase(float cosTheta)
{
	return (3.0 / (16.0 * PI)) * (1.0 + pow(cosTheta, 2.0));
}

float henyeyGreensteinPhase(float cosTheta, float g)
{
	return (1.0 / (4.0 * PI)) * ((1.0 - pow(g, 2.0)) / pow(1.0 - 2.0 * g * cosTheta + pow(g, 2.0), 1.5));
}

float sunIntensity(float zenithAngleCos)
{
	float cutoffAngle = PI / 1.95; // Earth shadow hack
	return sunIntensityFactor * max(0.0, 1.0 - exp(-((cutoffAngle - acos(zenithAngleCos)) / sunIntensityFalloffSteepness)));
}

// Whitescale tonemapping calculation, see http://filmicgames.com/archives/75
// Also see http://blenderartists.org/forum/showthread.php?321110-Shaders-and-Skybox-madness
const float A = 0.15; // Shoulder strength
const float B = 0.50; // Linear strength
const float C = 0.10; // Linear angle
const float D = 0.20; // Toe strength
const float E = 0.02; // Toe numerator
const float F = 0.30; // Toe denominator
vec3 Uncharted2Tonemap(vec3 W)
{
	return ((W * (A * W + C * B) + D * E) / (W * (A * W + B) + D * F)) - E / F;
}



void fragment(void) {
	
  vec3 fragPosition=normalize((u_view_projection_matrix_rw * v_position_rw).xyz);
  // In-scattering	
	vec3 sunDirection=u_sun_params_rw.xyz;


  //float sunfade = 1.0 - clamp(1.0 - exp(((sunDirection*4500000.0).y / 450000.0)), 0.0, 1.0);

  float sunfade = 1.0 - clamp(1.0 - exp(sunDirection.y), 0.0, 1.0);
	float rayleighCoefficient = rayleigh - (1.0 * (1.0 - sunfade));
	vec3 betaR = totalRayleigh(primaries) * rayleighCoefficient;
	
	// Mie coefficient
	vec3 betaM = totalMie(primaries, mieKCoefficient, turbidity) * mieCoefficient;
	
	// Optical length, cutoff angle at 90 to avoid singularity
	float zenithAngle = acos(max(0.0, dot(UP, fragPosition)));
	float denom = cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / PI), -1.253);
	float sR = rayleighZenithLength / denom;
	float sM = mieZenithLength / denom;
	
	// Combined extinction factor
	vec3 Fex = exp(-(betaR * sR + betaM * sM));
	
	
	float cosTheta = dot(fragPosition, sunDirection);
	vec3 betaRTheta = betaR * rayleighPhase(cosTheta * 0.5 + 0.5);
	vec3 betaMTheta = betaM * henyeyGreensteinPhase(cosTheta, mieDirectionalG);
	float sunE = sunIntensity(dot(sunDirection, UP));
	vec3 Lin = pow(sunE * ((betaRTheta + betaMTheta) / (betaR + betaM)) * (1.0 - Fex), vec3(1.5));
	Lin *= mix(vec3(1.0), pow(sunE * ((betaRTheta + betaMTheta) / (betaR + betaM)) * Fex, vec3(0.5)), clamp(pow(1.0 - dot(UP, sunDirection), 5.0), 0.0, 1.0));
	
	// Composition + solar disc
	float sunAngularDiameterCos = cos(sunAngularDiameterDegrees);
	float sundisk = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta);
	vec3 L0 = vec3(0.1) * Fex;
	L0 += sunE * 19000.0 * Fex * sundisk;
	vec3 texColor = Lin + L0;
	texColor *= 0.04;
	texColor += vec3(0.0, 0.001, 0.0025) * 0.3;
	
	// Tonemapping
	vec3 whiteScale = 1.0 / Uncharted2Tonemap(vec3(tonemapWeighting));
	vec3 curr = Uncharted2Tonemap((log2(2.0 / pow(luminance, 4.0))) * texColor);
	vec3 color = curr * whiteScale;
	vec3 retColor = pow(color, vec3(1.0 / (1.2 + (1.2 * sunfade))));

	gl_FragColor = vec4(retColor, 1.0);
}
}
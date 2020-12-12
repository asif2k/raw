/*chunk-default-emitter*/
<?=chunk('precision')?>

attribute vec4 a_position_rw;
uniform mat4 u_view_projection_rw;
uniform mat4 u_model_rw;
varying vec4 v_position_rw;

void vertex(void){    
    v_position_rw=a_position_rw;
    gl_Position=u_view_projection_rw*vec4(a_position_rw.xyz,1.0);    
    gl_PointSize =max(100.0/gl_Position.z,10.0);
    //gl_PointSize=30.0;
}
<?=chunk('precision')?>

varying vec4 v_position_rw;
uniform sampler2D u_texture_rw;
void fragment(void) {	
    gl_FragColor =vec4(1.0);
     gl_FragColor = texture2D(u_texture_rw, gl_PointCoord);
     gl_FragColor.r=1.0;
     gl_FragColor.a*=min(v_position_rw.a,0.9);
}

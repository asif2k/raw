/*chunk-debug-points*/
<?=chunk('precision')?>
attribute vec3 a_point_position_rw;
attribute vec4 a_point_color_rw;

uniform mat4 u_view_projection_rw;
uniform mat4 u_model_rw;

varying vec3 point_color_v;

void vertex(){	    
    gl_Position = u_view_projection_rw*u_model_rw* vec4(a_point_position_rw,1.0);	
    point_color_v=a_point_color_rw.xyz;  
    gl_PointSize =a_point_color_rw.w;
}
<?=chunk('precision')?>

varying vec3 point_color_v;
void fragment(void) {	        
gl_FragColor.xyz=point_color_v;
gl_FragColor.w=1.0;
}



/*chunk-debug-lines*/

<?=chunk('precision')?>
attribute vec3 a_line_position_rw;
attribute vec3 a_line_color_rw;

uniform mat4 u_view_projection_rw;
uniform mat4 u_model_rw;

varying vec3 line_color_v;

void vertex(){	    
    gl_Position = u_view_projection_rw*u_model_rw* vec4(a_line_position_rw,1.0);	
    line_color_v=a_line_color_rw.xyz;  
}
<?=chunk('precision')?>

varying vec3 line_color_v;
void fragment(void) {	        
gl_FragColor.xyz=line_color_v;
gl_FragColor.w=1.0;
}


/*chunk-debug-aabbs*/

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


/*chunk-transforms-manipulator*/

<?=chunk('precision')?>
attribute vec3 a_position_rw;
uniform mat4 u_view_projection_rw;
uniform vec3 u_trans_position;
uniform float u_trans_size;
void vertex(){	    
    gl_Position = u_view_projection_rw* 
vec4(u_trans_position+(a_position_rw*u_trans_size),1.0);	
}
<?=chunk('precision')?>
uniform vec4 u_marker_color;
void fragment(void) {	        
gl_FragColor=u_marker_color;
}
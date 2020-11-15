/*chunk-bone-render*/
uniform vec4 u_joint_qr;
uniform vec3 u_bone_start;
uniform vec3 u_bone_end;
uniform vec3 u_skeleton_pos;
<?=chunk('quat-dquat')?>

void vertex(){
  super_vertex();
  v_position_rw=vec4(a_position_rw,1.0);          
  float len=length((u_bone_end-u_bone_start));
  v_position_rw.xz*=min(len,1.0);
  v_position_rw.y*=len;  
  v_position_rw.xyz=quat_transform(u_joint_qr,v_position_rw.xyz);  
  v_position_rw.xyz+=u_bone_start;
  gl_Position=u_view_projection_rw*v_position_rw;
}

/*chunk-axis-render*/

attribute vec3 a_position_rw;
attribute vec4 a_color_rw;
uniform mat4 u_view_projection_rw;
uniform vec4 u_joint_qr;
uniform vec3 u_bone_start;
uniform vec3 u_bone_end;
uniform vec3 u_skeleton_pos;

varying vec4 v_color_rw;
<?=chunk('quat-dquat')?>
void vertex(){  
float len=max(length(u_bone_end-u_bone_start),0.5);
 vec4 v_position_rw=vec4(a_position_rw,1.0);   
v_position_rw.y*=len;
//v_position_rw.xz*=len*0.25;
  v_position_rw.xyz=quat_transform(u_joint_qr,v_position_rw.xyz);  
  v_position_rw.xyz+=u_bone_start; //+u_skeleton_pos;
 v_color_rw=a_color_rw;
  gl_Position=u_view_projection_rw*v_position_rw;
 
}
<?=chunk('precision')?>

varying vec4 v_color_rw;
void fragment(void) {	
    gl_FragColor =v_color_rw;
}


/*chunk-skinned-mesh*/
attribute vec4 a_joints_indices;
attribute vec4 a_joints_weights;

uniform vec4 joint_qr[60];
uniform vec4 joint_qd[60];

vec3 dquat_transform(vec4 qr, vec4 qd, vec3 v)
{
   return (v + cross(2.0 * qr.xyz, cross(qr.xyz, v) + qr.w * v))+
	  (2.0 * (qr.w * qd.xyz - qd.w * qr.xyz + cross(qr.xyz, qd.xyz)));    
}
vec3 dquat_transform2(vec4 qr, vec4 qd, vec3 v)
{
   return (v + cross(2.0 * qr.xyz, cross(qr.xyz, v) + qr.w * v));
}

vec4 _qr;
vec4 _qd;
vec4 att_position(void){
vec4 pos=super_att_position();
vec4 w=a_joints_weights;
int i0=int(a_joints_indices.x);
int i1=int(a_joints_indices.y);
int i2=int(a_joints_indices.z);
int i3=int(a_joints_indices.w);


vec4 dqr0 = joint_qr[i0];
vec4 dqr1 = joint_qr[i1];
vec4 dqr2 = joint_qr[i2];
vec4 dqr3 = joint_qr[i3];
if (dot(dqr0, dqr1) < 0.0) w.y *= -1.0;
if (dot(dqr0, dqr2) < 0.0) w.z *= -1.0;
if (dot(dqr0, dqr3) < 0.0) w.w *= -1.0;

_qr=w.x*dqr0+w.y*dqr1+w.z*dqr2+w.w*dqr3;
_qd=w.x*joint_qd[i0]+w.y*joint_qd[i1]+w.z*joint_qd[i2]+w.w*joint_qd[i3];
float len =1.0/ length(_qr);
_qr *= len;
_qd *= len;

pos.xyz=dquat_transform(_qr,_qd,pos.xyz);


return pos;

}
vec4 att_normal(void){
    return vec4(dquat_transform2(_qr,_qd,a_normal_rw),0.0);
}

void vertex(){
super_vertex();
}

        
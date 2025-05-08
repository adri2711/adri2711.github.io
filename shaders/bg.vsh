attribute vec3 position;
attribute vec2 texcoord;

varying vec2 texpos;

void main() {
    texpos = texcoord;
    gl_Position = vec4(position, 1.0);
}

#extension GL_OES_standard_derivatives : enable
precision highp float;

uniform float time;
uniform vec2 mouse;
uniform vec2 dims;

varying vec2 texpos;

vec3 hsv2rgb(vec3 c) {
    const vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 rgb2hsv(vec3 c) {
    const vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    const float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// psrdnoise (c) Stefan Gustavson and Ian McEwan,
// ver. 2021-12-02, published under the MIT license:
// https://github.com/stegu/psrdnoise/
float psrdnoise(vec2 x, vec2 period, float alpha, out vec2 gradient) {
  vec2 uv = vec2(x.x + x.y * 0.5, x.y);
  vec2 i0 = floor(uv), f0 = fract(uv);
  float cmp = step(f0.y, f0.x);
  vec2 o1 = vec2(cmp, 1.0 - cmp);
  vec2 i1 = i0 + o1, i2 = i0 + 1.0;
  vec2 v0 = vec2(i0.x - i0.y * 0.5, i0.y);
  vec2 v1 = vec2(v0.x + o1.x - o1.y * 0.5, v0.y + o1.y);
  vec2 v2 = vec2(v0.x + 0.5, v0.y + 1.0);
  vec2 x0 = x - v0, x1 = x - v1, x2 = x - v2;
  vec3 iu, iv, xw, yw;
  if(any(greaterThan(period, vec2(0.0)))) {
    xw = vec3(v0.x, v1.x, v2.x);
    yw = vec3(v0.y, v1.y, v2.y);
    if(period.x > 0.0)
      xw = mod(vec3(v0.x, v1.x, v2.x), period.x);
    if(period.y > 0.0)
      yw = mod(vec3(v0.y, v1.y, v2.y), period.y);
    iu = floor(xw + 0.5 * yw + 0.5);
    iv = floor(yw + 0.5);
  } else {
    iu = vec3(i0.x, i1.x, i2.x);
    iv = vec3(i0.y, i1.y, i2.y);
  }
  vec3 hash = mod(iu, 289.0);
  hash = mod((hash * 51.0 + 2.0) * hash + iv, 289.0);
  hash = mod((hash * 34.0 + 10.0) * hash, 289.0);
  vec3 psi = hash * 0.07482 + alpha;
  vec3 gx = cos(psi);
  vec3 gy = sin(psi);
  vec2 g0 = vec2(gx.x, gy.x);
  vec2 g1 = vec2(gx.y, gy.y);
  vec2 g2 = vec2(gx.z, gy.z);
  vec3 w = 0.8 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2));
  w = max(w, 0.0);
  vec3 w2 = w * w;
  vec3 w4 = w2 * w2;
  vec3 gdotx = vec3(dot(g0, x0), dot(g1, x1), dot(g2, x2));
  float n = dot(w4, gdotx);
  vec3 w3 = w2 * w;
  vec3 dw = -8.0 * w3 * gdotx;
  vec2 dn0 = w4.x * g0 + dw.x * x0;
  vec2 dn1 = w4.y * g1 + dw.y * x1;
  vec2 dn2 = w4.z * g2 + dw.z * x2;
  gradient = 10.9 * (dn0 + dn1 + dn2);
  return 10.9 * n;
}

float psrdfbmr(vec2 p, vec2 period, float alpha) {
  const mat2 m = mat2(0.8, -0.6, 0.6, 0.8);
  float f = 0.0;
  vec2 g1, g2, g3, g4;
  f += 0.5000 * psrdnoise(p, period, alpha, g1);
  p = 2.0 * m * p;
  period = m * period;
  alpha *= -2.0;
  f += 0.2500 * psrdnoise(p, period, alpha, g2);
  p = 2.0 * m * p;
  period = m * period;
  alpha *= -2.0;
  f += 0.1250 * psrdnoise(p, period, alpha, g3);
  p = 2.0 * m * p;
  period = m * period;
  alpha *= -2.0;
  f += 0.0625 * psrdnoise(p, period, alpha, g4);
  return f / 0.9375;
}

float aastep(float threshold, float value) {
  float afwidth = 0.7 * length(vec2(dFdx(value), dFdy(value)));
  return smoothstep(threshold - afwidth, threshold + afwidth, value);
}

float hash(float n) {
  return fract(sin(n) * 2711.01);
}

float pnoise(vec3 o) {
  vec3 p = floor(o);
  vec3 fr = fract(o);

  float n = p.x + p.y * 57.0 + p.z * 1009.0;

  float a = hash(n + 0.0);
  float b = hash(n + 1.0);
  float c = hash(n + 57.0);
  float d = hash(n + 58.0);
  float e = hash(n + 1009.0);
  float f = hash(n + 1010.0);
  float g = hash(n + 1066.0);
  float h = hash(n + 1067.0);

  vec3 t = fr * fr * (3.0 - 2.0 * fr);

  float res1 = a + (b - a) * t.x + (c - a) * t.y + (a - b + d - c) * t.x * t.y;
  float res2 = e + (f - e) * t.x + (g - e) * t.y + (e - f + h - g) * t.x * t.y;

  return mix(res1, res2, t.z);
}

void stars(vec3 v) {
  gl_FragColor +=  pow(pnoise(v * 150.0 + time / 12.0), 50.0);
}

void nebula(vec3 v) {
  const vec3 nebulaColor = vec3(0.0, 0.72, 1.0);

  float strength = pow(1.0 + v.y, 1.3) + psrdfbmr(time / 120.0 + v.xz / (pow(v.y, 3.0) + 1.1) * mix((v.y + 1.2) / 2.0, 0.1, 10.0), vec2(0.0), 0.0) * 0.3;

  strength -= mod(strength * 8.0, 1.0) / 8.0;
  strength = 1.0 - strength * 0.4;
  strength -= (psrdfbmr(v.xz * 10.0 + time / 12.0, vec2(0.0), 0.0) + 1.0) / 6.0;
  gl_FragColor.rgb += nebulaColor * strength;
}

void planet(vec2 v) {
  const vec3 planetColor = vec3(0.15, 0.35, 0.32);

  float dist = length((v * vec2(dims)) - vec2(0.9, 0.0) * dims);
  float value = aastep(500.0, dist);
  float valuerim = aastep(520.0, dist);
  gl_FragColor.rgb *= valuerim;

  float noise = (psrdfbmr(v * 4.0, vec2(0.0), 0.0) + 2.0) / 3.0;
  noise -= mod(noise * 6.0, 1.0) / 6.0;
  gl_FragColor.rgb += (1.0 - value) * planetColor * noise;
  gl_FragColor.rgb += (value - valuerim) * planetColor * 0.4;
}

void main(void) {
  gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

  vec3 skyRay = vec3(texpos.xx * 1.3, texpos.y / 2.5);
  stars(skyRay);
  planet(texpos);
  nebula(skyRay);
}

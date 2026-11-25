// Single-pass glass: refracts an imaginary studio three times, once per colour,
// so facets split light without the cost of real transmission.
export const gemVertex = /* glsl */ `
  attribute vec3 bary;
  varying vec3 vBary;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vBary = bary;
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(view.xyz);
    gl_Position = projectionMatrix * view;
  }
`;

export const gemFragment = /* glsl */ `
  uniform float uTime;
  uniform float uHit;
  varying vec3 vBary;
  varying vec3 vNormal;
  varying vec3 vView;

  vec3 studio(vec3 d) {
    vec3 c = mix(vec3(0.008, 0.014, 0.03), vec3(0.05, 0.09, 0.17), d.y * 0.5 + 0.5);
    c += vec3(0.88, 0.95, 1.0) * smoothstep(0.35, 0.8, d.y) * 0.75;
    c += vec3(0.24, 0.42, 1.0) * smoothstep(0.25, 0.75, -d.x) * smoothstep(0.75, 0.0, abs(d.y - 0.1)) * 1.1;
    c += vec3(1.0, 0.33, 0.16) * smoothstep(0.3, 0.75, d.x) * smoothstep(0.7, 0.0, abs(d.y + 0.2)) * 1.25;
    c += vec3(1.0, 0.8, 0.6) * smoothstep(0.5, 0.95, -d.y) * 0.45;
    float streak = sin(d.x * 8.0 + d.y * 11.0 + d.z * 4.0 + uTime * 0.25);
    c += pow(max(streak, 0.0), 14.0) * 0.8;
    return c;
  }

  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vView);
    if (!gl_FrontFacing) n = -n;
    float facing = max(dot(-v, n), 0.0);
    float fresnel = 0.06 + 0.94 * pow(1.0 - facing, 4.0);

    vec3 bent = vec3(
      studio(reflect(refract(v, n, 0.62), n.yzx)).r,
      studio(reflect(refract(v, n, 0.56), n.yzx)).g,
      studio(reflect(refract(v, n, 0.50), n.yzx)).b
    );
    vec3 shine = studio(reflect(v, n));
    vec3 film = 0.5 + 0.5 * cos(6.2831 * (facing * 1.3 + vec3(0.0, 0.33, 0.67)));

    vec3 color = bent * bent * 1.25 + shine * (fresnel * 1.1 + 0.05);
    color *= mix(vec3(1.0), film * 1.5, 0.62);
    color += film * fresnel * 0.22 + vec3(0.012, 0.02, 0.045);
    color += vec3(1.0, 0.45, 0.25) * uHit * 0.35 * (1.0 - facing);

    float edge = min(min(vBary.x, vBary.y), vBary.z);
    float line = 1.0 - smoothstep(0.0, fwidth(edge) * 1.4, edge);
    color += line * vec3(0.75, 0.86, 1.0) * (0.28 + uHit * 0.5);

    gl_FragColor = vec4(color, 0.8);
    #include <colorspace_fragment>
  }
`;

export const glowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const glowFragment = /* glsl */ `
  uniform float uPower;
  uniform float uHit;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float fall = pow(max(0.0, 1.0 - d), 2.2);
    vec3 color = mix(vec3(0.16, 0.3, 0.62), vec3(1.0, 0.38, 0.2), clamp(uHit, 0.0, 1.0) * 0.7);
    gl_FragColor = vec4(color, fall * (0.42 + uHit * 0.35) * uPower);
  }
`;

// A beam is a flat strip facing the camera with a bright core and soft falloff.
export const beamFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float x = abs(vUv.x - 0.5) * 2.0;
    float core = smoothstep(0.16, 0.0, x);
    float halo = pow(max(0.0, 1.0 - x), 3.0) * 0.5;
    float flow = 0.82 + 0.18 * sin(vUv.y * 46.0 - uTime * 7.0);
    vec3 color = mix(uColor, vec3(1.0), core * 0.6);
    gl_FragColor = vec4(color, (core + halo) * flow * uPower);
  }
`;

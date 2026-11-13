'use strict';

const lunarShaders = {
  backdropVertex: `#version 300 es
  void main() {
    vec2 point = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(point * 2.0 - 1.0, 0.0, 1.0);
  }`,
  backdropFragment: `#version 300 es
  precision highp float;
  uniform vec2 resolution, center, mouse;
  uniform float radius, opening, elapsed;
  uniform mat3 globe;
  uniform sampler2D lunarMap;
  out vec4 pixel;

  const float PI = 3.14159265;
  float hash(vec2 cell) {
    return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 uv) {
    vec2 cell = floor(uv), t = fract(uv);
    t = t*t*(3.0-2.0*t);
    return mix(mix(hash(cell), hash(cell+vec2(1,0)), t.x),
      mix(hash(cell+vec2(0,1)), hash(cell+vec2(1,1)), t.x), t.y);
  }
  float cloud(vec2 uv) {
    return 0.55*noise(uv)+0.27*noise(uv*2.11)+0.12*noise(uv*4.24)+0.06*noise(uv*8.5);
  }

  void main() {
    vec2 screen = gl_FragCoord.xy / resolution;
    vec2 sky = (gl_FragCoord.xy-center) / resolution.y;
    vec2 p = (gl_FragCoord.xy-center) / radius;
    float dist = length(p);
    vec2 mist = sky - mouse*.014;
    float ridge = (mist.y-.31*mist.x+.01)*4.4; float band = exp(-ridge*ridge);
    float texture = smoothstep(.26,.84,cloud(mist*5.0 + vec2(7.5, 2.0)));
    float fade = exp(-2.5*dot(mist,mist));
    vec3 color = vec3(.028,.040,.074);
    color += vec3(.077,.108,.168)*texture*band*fade;
    color += vec3(.061,.041,.035)*exp(-length((mist-vec2(.29,-.24))*vec2(2.7,4.2))*2.1);
    color += vec3(.030,.045,.082)*exp(-length((mist+vec2(.11,-.14))*vec2(2.8,3.8))*1.8);
    float grain = hash(gl_FragCoord.xy);
    color += (grain-.5)*.016;
    color *= mix(.50,1.0,smoothstep(0.0,.64,length(screen-vec2(.03,.5)))) *
      (1.0-.42*smoothstep(.42,1.0,length((screen-vec2(.53,.5))*vec2(1.27,1.0))));

    vec3 sun = normalize(vec3(-.66,.52,.61));
    vec2 rim = p / max(dist,.001);
    float crescent = .36 + .64*smoothstep(-.67,.78,dot(rim,sun.xy));
    float aboveSurface = max(0.0,dist-1.0);
    float horizon = exp(-aboveSurface*63.0)*.095 + exp(-aboveSurface*5.4)*.047;
    color += crescent * horizon * vec3(.65,.73,1.0) * (1.0+.52*opening);

    if (elapsed < .95 && elapsed >= 0.0) {
      float front = 1.0 + 2.4*elapsed;
      float pulse = exp(-abs(dist-front)*52.0) * exp(-elapsed*5.4);
      color += vec3(.115,.135,.21) * pulse * (.5+.5*texture) * smoothstep(.008,.075,elapsed);
    }
    if (dist < 1.008) {
      vec3 normal = vec3(p, sqrt(max(0.0,1.0-dot(p,p))));
      vec3 surface = globe * normal;
      vec2 uv = vec2(fract(atan(surface.x,surface.z)/(2.0*PI)+.5), acos(clamp(surface.y,-1.0,1.0))/PI);
      vec3 albedo = textureLod(lunarMap, uv, 0.0).rgb;
      float gray = dot(albedo, vec3(.2126,.7152,.0722));
      albedo = mix(vec3(gray),albedo,.36);
      float incidence = dot(normal,sun);
      float light = pow(max(0.0,incidence),.55);
      vec3 reflected = vec3(.12,.18,.29)*(.6+.4*max(0.0, normal.z));
      vec3 lunar = albedo*(reflected + vec3(1.27,1.17,1.05)*light) - .023*light;
      lunar += vec3(.20,.30,.49)*pow(1.0-max(0.0,normal.z),4.0)*(.18+.30*light);
      float edge = 1.0 - smoothstep(1.0-1.0/radius,1.0+1.0/radius,dist);
      color = mix(color,lunar,edge);
    }
    pixel = vec4(color,1.0);
  }`,
  starVertex: `#version 300 es
  precision highp float;
  layout(location=0) in vec3 seedPosition;
  layout(location=1) in vec4 detail;
  layout(location=2) in vec3 direction;
  uniform vec2 resolution, center, mouse;
  uniform float radius, opening, elapsed, clock, density;
  out float opacity, tint, soft, spark, streak;
  out vec2 heading;

  void main() {
    float type = detail.w;
    heading = vec2(1.0, 0.0);
    streak = 0.0;
    float alpha = detail.y;
    float size = detail.x;
    vec3 position = seedPosition;
    float depth = seedPosition.z;
    if (type == 0.0) {
      vec2 background = seedPosition.xy - mouse*(.007+.022*depth);
      background += vec2(sin(clock*.20+detail.z),cos(clock*.16+detail.z))*.0024*depth;
      background = .5 + (background-.5)*(1.0+.07*opening*depth);
      gl_Position = vec4(background*2.0-1.0,0.0,1.0);
      alpha *= .79+.21*sin(clock*(.56+depth)+detail.z);
      alpha *= smoothstep(.996,1.012,length((background*resolution-center)/radius));
      soft = depth;
    } else {
      vec3 drift = vec3(sin(clock*.29+detail.z),cos(clock*.26+detail.z),0.0)*.027;
      position += drift;
      if (elapsed >= 0.0 && elapsed < 2.15) {
        float delay = (direction.z+1.0)*.035;
        float age = max(0.0,elapsed-delay);
        float push = (1.0-exp(-age*5.3))*(1.0-smoothstep(.50,2.15,age));
        vec3 dispersed = position + direction * (type == 2.0 ? 1.85 : .98);
        position = mix(position, dispersed, push);
        if (type == 2.0) {
          heading = normalize(vec2(direction.x,-direction.y));
          streak = smoothstep(3.0,6.5,size) * (1.0-smoothstep(.17,.58,age));
          size += streak*8.0;
        }
        alpha *= 1.0 + push*(type == 2.0 ? 5.3 : 1.2);
        size *= 1.0 + push*.42;
        if (type == 2.0) alpha *= smoothstep(delay,delay+.04,elapsed)*(1.0-smoothstep(.31,1.58,age));
      } else if (type == 2.0) {
        alpha = 0.0;
      }
      float perspective = 1.0 / (1.0 - position.z*.12);
      vec2 projected = position.xy*perspective - mouse*(.04+.055*position.z);
      float mask = smoothstep(.994,1.015,length(projected));
      alpha *= mix(mask, 1.0, smoothstep(-.035,.04,position.z));
      vec2 pixel = center + projected*radius;
      gl_Position = vec4(pixel/resolution*2.0-1.0,0.0,1.0);
      size *= perspective;
      soft = clamp(abs(position.z)*.58,.0,1.0);
    }
    opacity = clamp(alpha,0.0,1.0);
    tint = fract(detail.z*.618);
    spark = smoothstep(5.1,7.0,size) * (1.0-soft);
    gl_PointSize = max(1.0,size*density);
  }`,
  starFragment: `#version 300 es
  precision highp float;
  in float opacity, tint, soft, spark, streak;
  in vec2 heading;
  out vec4 pixel;

  void main() {
    vec2 uv = gl_PointCoord*2.0-1.0;
    float dist = length(uv);
    float halo = exp(-dist*dist*mix(10.0,3.6,soft))*(1.0-smoothstep(.70,1.0,dist));
    float core = exp(-dist*dist*21.0);
    float rays = exp(-abs(uv.x)*29.0-abs(uv.y)*3.1) + exp(-abs(uv.y)*30.0-abs(uv.x)*3.2);
    vec3 color = mix(vec3(.58,.72,1.0),vec3(1.0,.79,.57),smoothstep(.24,.89,tint));
    float along = dot(uv,heading), across = dot(uv,vec2(-heading.y,heading.x));
    float tail = exp(-across*across*51.84)*smoothstep(-1.0,.05,along)*(1.0-smoothstep(.15,.3,along));
    float light = mix(halo*.44+core*.49+rays*.34*spark, .66*tail+.45*core, streak);
    pixel = vec4(color, opacity*light);
  }`
};



import React from 'react';
import { G, Path } from 'react-svg';

const SvgComponent = props => (
  <svg
    width={(props.scale || 1) * 32 * 0.75}
    height={(props.scale || 1) * 32 * 0.75}
    viewBox="0 0 32 32"
    {...props}
  >
    <g fill={props.fill || '#FFF'}>
      <path
        scale={(props.scale || 1) * 0.75}
        d="M23.251 14.637a3.106 3.106 0 1 0-.002-6.212 3.106 3.106 0 0 0 .002 6.212z"
      />
      <path
        scale={(props.scale || 1) * 0.75}
        d="M28.688 4.282H3.312c-1.01 0-1.812.822-1.812 1.831v21.194c0 1.008.802 1.831 1.812 1.831h25.376a1.82 1.82 0 0 0 1.812-1.831V6.113a1.819 1.819 0 0 0-1.812-1.831zm-6.673 12.796a1.116 1.116 0 0 0-.829-.402c-.328 0-.562.156-.829.37l-1.211 1.023c-.252.182-.452.303-.744.303-.278 0-.529-.102-.712-.263a8.251 8.251 0 0 1-.279-.268l-3.483-3.768a1.422 1.422 0 0 0-1.079-.485c-.434 0-.835.213-1.089.505l-8.187 9.88V7.11c.065-.441.409-.758.847-.758h23.154c.448 0 .81.329.837.776l.018 16.856-6.414-6.906z"
      />
    </g>
  </svg>
);

export default SvgComponent;

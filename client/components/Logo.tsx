import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export default function Logo({ className = "h-8 w-auto", iconOnly = false }: LogoProps) {
  return (
    <svg
      id="Layer_1"
      data-name="Layer 1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={iconOnly ? "0 0 280 378.44" : "0 0 807.94 378.44"}
      className={`${className} transition-all duration-500 ease-out [transform:translate3d(0,0,0)]`}
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
    >
      {/* 
        ========================================================================
        ICON PORTION (Always shown, coordinates translated using -198.97 -237.62)
        ========================================================================
      */}
      {/* Map Marker Outer Ring - primary brand color */}
      <path
        className="fill-primary transition-colors duration-500"
        d="M351.88,237.62a152.92,152.92,0,0,0-116.44,252l.09.1,7.94,8.62L351.88,616.06,460.29,498.38l7.95-8.63.09-.1a152.92,152.92,0,0,0-116.45-252Zm0,269.36A116.45,116.45,0,1,1,468.33,390.53,116.45,116.45,0,0,1,351.88,507Z"
        transform="translate(-198.97 -237.62)"
      />
      {/* One Pillar Pagoda: Roof Line - dynamic text/current color */}
      <path
        className="fill-current transition-colors duration-500"
        d="M389.49,299.79A7.95,7.95,0,0,0,379,293c-2,.72-3.11,2.7-6.38,5.51a27.42,27.42,0,0,1-8.5,4.85,33.73,33.73,0,0,1-24.38,0,27.53,27.53,0,0,1-8.5-4.85c-3.26-2.81-4.37-4.79-6.37-5.51a8,8,0,0,0-10.55,6.84,9.61,9.61,0,0,0,2.52,7,43.32,43.32,0,0,0,11.59,8.69,50.35,50.35,0,0,0,12.42,4.69,49.73,49.73,0,0,0,22.16,0,50.2,50.2,0,0,0,12.42-4.69A43.32,43.32,0,0,0,387,306.76,9.61,9.61,0,0,0,389.49,299.79Z"
        transform="translate(-198.97 -237.62)"
      />
      {/* One Pillar Pagoda: Columns/Supports - dynamic text/current color */}
      <path
        className="fill-current transition-colors duration-500"
        d="M419.15,379.87H407.09v-42c1-.57,2-1.17,3.07-1.82a113.38,113.38,0,0,0,15.62-11.6,8.58,8.58,0,0,0,3-8.88,8.39,8.39,0,0,0-5.92-5.89c-2.92-.72-5.84.13-8.57,2.44-8,6.75-8.91,7.27-14.53,10.61a81.53,81.53,0,0,1-23.25,9.84,94.63,94.63,0,0,1-49.25,0A81.58,81.58,0,0,1,304,322.77c-5.62-3.34-6.57-3.86-14.53-10.61-2.72-2.31-5.65-3.16-8.57-2.44a8.39,8.39,0,0,0-5.92,5.89,8.58,8.58,0,0,0,3,8.88,112.92,112.92,0,0,0,15.63,11.6c1,.65,2.06,1.25,3.06,1.82v42H284.62a10.14,10.14,0,1,0,0,20.27H307a9.91,9.91,0,0,0,9.91-9.9V347a108.77,108.77,0,0,0,13.2,3.5,112,112,0,0,0,43.47,0,109.27,109.27,0,0,0,13.2-3.5v43.23a9.9,9.9,0,0,0,9.9,9.9h22.43a10.14,10.14,0,0,0,0-20.27Z"
        transform="translate(-198.97 -237.62)"
      />
      {/* One Pillar Pagoda: Center Lotus core dot - dynamic text/current color */}
      <path
        className="fill-current transition-colors duration-500"
        d="M351.88,358.13a21.74,21.74,0,1,0,21.74,21.74A21.73,21.73,0,0,0,351.88,358.13Zm0,31.12a9.38,9.38,0,1,1,9.38-9.38A9.38,9.38,0,0,1,351.88,389.25Z"
        transform="translate(-198.97 -237.62)"
      />
      {/* One Pillar Pagoda: Stone Base - dynamic text/current color */}
      <path
        className="fill-current transition-colors duration-500"
        d="M431.11,409H272.66a10.14,10.14,0,0,0-10.14,10.14h0a10.14,10.14,0,0,0,10.14,10.14h16.16v43a43.43,43.43,0,0,0,20.27,11.1V429.26h85.58V483.4A43.4,43.4,0,0,0,415,472.3v-43h16.16a10.14,10.14,0,0,0,10.13-10.14h0A10.14,10.14,0,0,0,431.11,409Z"
        transform="translate(-198.97 -237.62)"
      />

      {/* 
        ========================================================================
        TEXT PORTION (Only rendered if full logo style is requested)
        ========================================================================
      */}
      {!iconOnly && (
        <>
          {/* Letter: H - dynamic text/current color */}
          <path
            className="fill-current transition-colors duration-500"
            d="M636.32,419.32v-59.6h-51.8v59.6h-27.8V286.52h27.8v50h51.8v-50h28v132.8Z"
            transform="translate(-198.97 -237.62)"
          />
          {/* Letter: a - dynamic text/current color */}
          <path
            className="fill-current transition-colors duration-500"
            d="M736.31,419.32a38.29,38.29,0,0,1-1.6-8.8c-6.2,6.8-16.6,11.4-29.8,11.4-22.39,0-32.79-11-32.79-27,0-28.4,19-31.6,45.19-35.2,13-1.8,16.6-4.4,16.6-11.2,0-6.4-6.4-10.2-16.6-10.2-11.8,0-16.6,5.8-17.8,14.6h-24.2c.4-20.4,11.61-34.6,43.2-34.6,31.2,0,42,14,42,38.8v62.2Zm-1.8-48.2c-2.6,2.6-7.2,4-16.8,5.8-14.8,2.8-19.6,7-19.6,15.4,0,7.4,4.4,11,12.6,11,13.4,0,23.4-9.8,23.6-21.4Z"
            transform="translate(-198.97 -237.62)"
          />
          {/* Letter: n - dynamic text/current color */}
          <path
            className="fill-current transition-colors duration-500"
            d="M834.91,419.32v-59.6c0-15.2-4.4-19.4-16.8-19.4-13.6,0-20.2,7.6-20.2,22.6v56.4h-26v-98.4h24.8v14.4c6-11,16-17,31.8-17,18.8,0,32.6,11.4,32.6,32.8v68.2Z"
            transform="translate(-198.97 -237.62)"
          />
          {/* Letter: o - dynamic text/current color */}
          <path
            className="fill-current transition-colors duration-500"
            d="M870.31,370.12c0-31.2,19.4-51.8,50.6-51.8,30.8,0,50,20.4,50,51.8,0,31.2-19.4,51.8-50,51.8C889.11,421.92,870.31,400.72,870.31,370.12Zm74.4,0c0-20-8-29.8-23.8-29.8s-23.8,9.8-23.8,29.8,8,30,23.8,30S944.71,390.12,944.71,370.12Z"
            transform="translate(-198.97 -237.62)"
          />
          {/* Letter: i - dynamic text/current color */}
          <path
            className="fill-current transition-colors duration-500"
            d="M980.91,309.12v-24.2h26v24.2Zm0,110.2v-98.4h26v98.4Z"
            transform="translate(-198.97 -237.62)"
          />
          {/* Letter: G - primary brand color */}
          <path
            className="fill-primary transition-colors duration-500"
            d="M649.68,570.51l-.56-12.21c-5.92,10.36-20,16.47-36.81,16.47-34,0-55.69-31.64-55.69-65.86,0-36.26,20.72-65.31,60.5-65.31,29.23,0,51.8,17.39,53.65,42h-25.9c-1.3-11.47-13.69-20.72-27.75-20.72-20.54,0-34.23,15.91-34.23,45.14,0,20.16,10.18,43.1,34,43.1,16.84,0,30-12.76,30-28.12H619.71V504.47H671v66Z"
            transform="translate(-198.97 -237.62)"
          />
          {/* Letter: O - primary brand color */}
          <path
            className="fill-primary transition-colors duration-500"
            d="M678.35,510.2c0-41.62,21.28-66.6,59-66.6s58.64,25,58.64,67.16-20.9,64-58.64,64S678.35,551.64,678.35,510.2Zm92.32.56c0-29.05-11.84-44.4-33.3-44.4-21.65,0-33.67,15.35-33.67,44.4s12.39,42,33.67,42C755.87,552.75,770.67,539.8,770.67,510.76Z"
            transform="translate(-198.97 -237.62)"
          />
        </>
      )}
    </svg>
  );
}

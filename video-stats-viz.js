(function() {

  // Thanks Paul (Irish) :)
  var requestAnimFrame = ( function() {
    return  window.requestAnimationFrame       || 
            window.webkitRequestAnimationFrame || 
            window.mozRequestAnimationFrame    || 
            window.oRequestAnimationFrame      || 
            window.msRequestAnimationFrame     || 
            function( callback, element ) {
              window.setTimeout(callback, 1000 / 60);
            };
  })();

  var VideoStatsViz = window.VideoStatsViz = function( options ) {
    var canvas = options.canvas || document.createElement( "canvas" ),    // drawing canvas
        width, height,                                                    // canvas dims
        ctx,                                                              // 2d canvas context
        loopFlag = false,                                                 // flag to stop looping
        vBlockSize, hBlockSize,                                           // block dims
        statsObj = options.stats,                                         // a videoStatsObj
        history = options.history,                                        // length of history to keep around when drawing
        scale = options.scale || 1,                                       // global value scale
        vScale = options.vScale || 1,                                     // block scaling (gfx)
        properties = [];                                                  // list of properties

    // safety-check all the properties and add them to the property list
    for ( var prop in options.properties ) {
      if ( options.properties.hasOwnProperty( prop ) ) {
        var property = options.properties[ prop ];
        property.name = prop;
        property.order = property.order || -1;
        property.scale = property.scale || 1;
        properties.push( property );
      } //if
    } //for

    // sort the list for proper drawing order
    properties = properties.sort( function( a, b ) {
      return b.order - a.order;
    });

    // adjust drawing dims when canvas dims change
    function setup() {
      width = options.width || canvas.width, 
      height = options.height || canvas.height;
      ctx = canvas.getContext( "2d" );
      ctx.fillStyle = "rgba( 0, 0, 0, 0 )";
      ctx.fillRect( 0, 0, canvas.width, canvas.height );
      hBlockSize = width / history;
      vBlockSize = hBlockSize * vScale;
    }

    canvas.addEventListener( "resize", function( e ) {
      setup();
    }, false );

    // draw in a loop using requestAnimFrame
    function loop ( stop ) {
      draw();
      if ( loop ) {
        requestAnimFrame( draw );
      }
    } //loop

    // draw one frame
    function draw() {

      if ( statsObj && properties ) {

        // move current image to the left
        var lastImageData = ctx.getImageData( 0, 0, width, height );
        ctx.clearRect( 0, 0, width, height );
        ctx.putImageData( lastImageData, -hBlockSize, 0 );

        // draw properties
        for ( var i=0, l=properties.length; i<l; ++i ) {

          // scale the value from videoStatsObject
          var prop = properties[ i ],
              max = statsObj[ prop.name ] * prop.scale * scale;

          // use the color provided by the user
          ctx.fillStyle = prop.color;

          // draw individual blocks
          ctx.beginPath();
          for ( var j=0; j<max; j+=vBlockSize ) {
            ctx.rect( width-hBlockSize+1, height-j+1, hBlockSize-2, vBlockSize-2*vScale );
          } //for
          ctx.fill();

        } //for

      } //if
    } //draw

    // single draw
    this.update = function() {
      draw();
    }; //update

    // start draw loop
    this.start = function() {
      loopFlag = true;
      loop();
    }; //start

    // stop draw loop
    this.stop = function() {
      loopFlag = false;
    }; //stop

    // able to set the stats object at any time
    Object.defineProperty( this, "stats", {
      get: function() { return statsObj; },
      set: function( val ) { statsObj = val; }
    });

    // if a canvas was created automatically, user can get it here
    Object.defineProperty( this, "canvas", {
      get: function() { return canvas; }
    });

    // fill some DOM element with legend made from DOM elements
    this.makeLegend = function( container ) {

      // try to grab a valid DOM element for a container
      if ( typeof( container ) === "string" ) {
        container = document.getElementById( container );
      }
      container = container || document.createElement( "div" );

      // for safety and usability, make a sub-container
      var outerDiv = document.createElement( "div" );
      outerDiv.className = "video-stats-legend";

      // generate one item
      function getItem( property ) {
        var div = document.createElement( "div" ),
            titleSpan = document.createElement( "span" );
            colorSpan = document.createElement( "span" );
        div.className = "video-stats-legend-item";
        titleSpan.innerHTML = properties[ i ].name;
        titleSpan.className = "video-stats-legend-name";
        colorSpan.style.background = property.color;
        colorSpan.className = "video-stats-legend-color";
        div.appendChild( titleSpan );
        div.appendChild( colorSpan );
        return div;
      } //getItem

      // loop through properties to get each item
      for ( var i=0; i<properties.length; ++i ) {
        var div = getItem( properties[ i ] );
        outerDiv.appendChild( div );
      } //for
      container.appendChild( outerDiv );

      return container;
    }; //makeLegend

    // size everything
    setup();

  }; //VideoStatsViz
})(); //Safety Closure

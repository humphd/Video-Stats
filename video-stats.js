
/**

   http://blog.pearce.org.nz/2011/03/html5-video-painting-performance.html

    mozParsedFrames - A count of the number of video frames that have been demuxed/parsed from the media resource. If we were playing perfectly, we'd be able to paint this many frames.
    mozDecodedFrames - A count of the number of deumxed/parsed video frames that have been decoded into Images. We skip decoding of parsed/demuxed frames if the decode is falling behind the playback position (this can happen if it takes a long time to decode a keyframe for example).
    mozPresentedFrames - A count of the number of decoded frames that have been presented to the rendering pipeline for painting (set as the current Image on the video element's ImageContainer). We may not present decoded frames if the frame arrives for presentation late.
    mozPaintedFrames - A count of the number of presented frames which were painted on screen. We may end up not painting presented frames if another frame is presented before the graphics pipeline has time to paint the previously presented frame, or if the video is off screen.
    mozFrameDelay - The time (as a floating point number in seconds) which the last painted video frame was rendered late by. This is the time duration between the decoder saying "paint frame X now", and the graphics pipeline physically getting frame X displayed on the screen. The value is accurate on desktop Firefox, but not on mobile. Improvements in the graphics pipeline, and the integration with the graphics pipeline, will show up as a decrease in this number.

**/
(function(window, document) {

  // Relies on Mozilla Firefox 5+ only properties, bail if not here.
  var statProps = "mozParsedFrames mozDecodedFrames mozPresentedFrames mozPaintedFrames mozFrameDelay".split(' ');

  var videoStatsSupported = true,
      videoProto = HTMLVideoElement.prototype;
  for (var i = 0; i < statProps.length; i++) {
    if (!(statProps[i] in videoProto)) {
      videoStatsSupported = false;
    }
  }

  if (!videoStatsSupported) {
    throw new Error("Video Stats: Mozilla <video> painting performance statistics not found!");
  }

  // Also assumes existence of mozRequestAnimationFrame
  if (!("mozRequestAnimationFrame" in window)) {
    throw new Error("Video Stats: mozRequestAnimationFrame not found!");
  }

  var Mean = function() {
    this.count = 0;
    this.sum = 0;
  };

  Mean.prototype.record = function(val) {
    this.count++;
    this.sum += val;
  };

  Mean.prototype.value = function() {
    return this.count ? (this.sum / this.count) : 0;
  };

  Mean.prototype.toString = function() {
    return this.value.toFixed(3);
  };

  var VideoStats = function(video) {
    this.video = video;
    this.graphs = { 'parsedPerSec': createGraph(video, 'Parsed Frames p/s'),
                    'decodedPerSec': createGraph(video, 'Decoded Frames p/s'),
                    'presentedPerSec': createGraph(video, 'Presented Frames p/s'),
                    'paintedPerSec': createGraph(video, 'Painted Frames p/s')
                  };

    this.decodedFrames     = 0;
    this.parsedFrames      = 0;
    this.paintedFrames     = 0;
    this.presentedFrames   = 0;
    this.paintedFrames     = 0;
    this.delaySum          = 0;
    this.delayCount        = 0;
    this.decodedPerSec     = 0;
    this.parsedPerSec      = 0;
    this.presentedPerSec   = 0;
    this.paintedPerSec     = 0;

    this.delayMean = new Mean();
    this.parpsMean = new Mean();
    this.dedpsMean = new Mean();
    this.prepsMean = new Mean();
    this.pntpsMean = new Mean();
  };

  var videos = [];

  function startStats() {
    function recalcRates() {
      var vl = videos.length || 0;

      for (var i = 0; i < vl; i++) {
        var v = videos[i],
            video = v.video;

        if (video.readyState <= HTMLMediaElement.HAVE_CURRENT_DATA || video.paused) {
          continue;
        }

        v.decodedPerSec = (video.mozDecodedFrames - v.decodedFrames);
        v.decodedFrames = video.mozDecodedFrames;

        v.parsedPerSec = video.mozParsedFrames - v.parsedFrames;
        v.parsedFrames = video.mozParsedFrames;

        v.presentedPerSec = video.mozPresentedFrames - v.presentedFrames;
        v.presentedFrames = video.mozPresentedFrames;

        v.paintedPerSec = video.mozPaintedFrames - v.paintedFrames;
        v.paintedFrames = video.mozPaintedFrames;

        v.parpsMean.record(v.parsedPerSec);
        v.dedpsMean.record(v.decodedPerSec);
        v.prepsMean.record(v.presentedPerSec);
        v.pntpsMean.record(v.paintedPerSec);

        updateGraph(v.graphs['parsedPerSec'], v['parsedPerSec'], v['parpsMean'].value);
        updateGraph(v.graphs['decodedPerSec'], v['decodedPerSec'], v['dedpsMean'].value);
        updateGraph(v.graphs['presentedPerSec'], v['presentedPerSec'], v['prepsMean'].value);
        updateGraph(v.graphs['paintedPerSec'], v['paintedPerSec'], v['pntpsMean'].value);
      }
    }

    function updateGraph(graph, val, mean) {
      var ctx = graph.ctx;
      var before = ctx.getImageData(0, 0, GRAPH_WIDTH, GRAPH_HEIGHT);
      ctx.putImageData(before, - GRAPH_BLOCK_SIZE_TOTAL, 0);

      ctx.fillStyle = 'rgba(0,0,30,1.0)';
      ctx.clearRect(GRAPH_WIDTH - GRAPH_BLOCK_SIZE_TOTAL, 0, GRAPH_BLOCK_SIZE, GRAPH_HEIGHT);

      drawGraphLine(graph, val, 60, 'rgba(133, 171, 193, 1.0)');
      drawGraphLine(graph, mean, 60, 'rgba(255, 0, 0, 1.0)');

      graph.text.innerHTML = val;
    }

    function updateFrameDelayMean() {
      var vl = videos.length || 0;
      for (var i = 0; i < vl; i++) {
        var v = videos[i],
            video = v.video;

        if (video.readyState <= HTMLMediaElement.HAVE_CURRENT_DATA || video.paused) {
          continue;
        }

        var delay = video.mozFrameDelay;
        if (video.mozPaintedFrames !== v.paintedFrames) {
          v.delayMean.record(delay);
          v.paintedFrameCount = video.mozPaintedFrames;
        }
      }
    }

    var recalcInterval = setInterval(recalcRates, 1000),
        delayInterval  = setInterval(updateFrameDelayMean, 40);

    window.onunload = function() {
      clearInterval(recalcInterval);
      clearInterval(delayInterval);
    };
  }

  const GRAPH_HEIGHT = 30;
  const GRAPH_WIDTH = 30;
  const GRAPH_BLOCK_SIZE = 1;
  const GRAPH_BLOCK_SPACING = 0;
  const GRAPH_BLOCK_SIZE_TOTAL = GRAPH_BLOCK_SIZE + GRAPH_BLOCK_SPACING;
  const NUM_BLOCKS_Y = GRAPH_HEIGHT / GRAPH_BLOCK_SIZE_TOTAL;

  var createGraph = (function() {
    var graphOffsetLeft = 0,
        lastVideo = null;

    // Stolen lovingly from popcorn.js, used under MIT License.
    function getPosition(elem) {
      var bounds = elem.getBoundingClientRect(),
          doc = elem.ownerDocument,
          docElem = document.documentElement,
          body = document.body,
          clientTop, clientLeft, scrollTop, scrollLeft, top, left;

      clientTop  = docElem.clientTop  || body.clientTop  || 0;
      clientLeft = docElem.clientLeft || body.clientLeft || 0;

      //  Determine correct scrollTop/Left
      scrollTop  = (window.pageYOffset && docElem.scrollTop  || body.scrollTop);
      scrollLeft = (window.pageXOffset && docElem.scrollLeft || body.scrollLeft);

      //  Temp top/left
      top  = Math.ceil(bounds.top  + scrollTop  - clientTop);
      left = Math.ceil(bounds.left + scrollLeft - clientLeft);

      for (var p in bounds) {
        bounds[p] = Math.round(bounds[p]);
      }

      return { top: top, left: left, width: bounds.width, height: bounds.height };
    }

    return function createGraph(video, name) {
      if (video === lastVideo) {
        graphOffset += GRAPH_WIDTH;
      } else {
        graphOffset = 10;
        lastVideo = video;
      }

      videoPosition = getPosition(video);

      var canvas = document.createElement('canvas');
      canvas.setAttribute('width', GRAPH_WIDTH);
      canvas.setAttribute('height', GRAPH_HEIGHT);
      canvas.style.position = 'absolute';
      canvas.style.top = (videoPosition.top + 10) + 'px';
      canvas.style.left = (graphOffset + videoPosition.left) + 'px';
      canvas.setAttribute('z-index', 100);
      canvas.style.border = "solid 1px #2F3C52";
      canvas.title = name;
      video.parentNode.insertBefore(canvas, video);

      var ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,30,1.0)';
      ctx.fillRect(0, 0, GRAPH_WIDTH, GRAPH_HEIGHT);

      var text = document.createElement('div');
      text.setAttribute('width', GRAPH_WIDTH);
      text.setAttribute('height', GRAPH_HEIGHT);
      text.style.position = 'absolute';
      text.style.top = (videoPosition.top + 10) + 'px';
      text.style.left = (graphOffset + videoPosition.left) + 'px';
      text.setAttribute('z-index', 150);
      text.style.color = "white";
      text.style.fontSize = "11px";
      text.style.paddingTop = "18px";
      text.style.paddingLeft = "3px";
      text.title = name;

      video.parentNode.insertBefore(text, video);

      return { canvas: canvas,
               ctx: ctx,
               text: text
             };
    };
  })();

  function drawGraphLine(graph, value, cap, colour) {
    var ctx = graph.ctx;

    colour = colour || "rgba(64, 64, 64, 1.0)";
    ctx.fillStyle = 'rgba(0,0,30,1.0)';
    var i;
    for (i=NUM_BLOCKS_Y, h=(NUM_BLOCKS_Y - value.toString()/cap * NUM_BLOCKS_Y); i>h; --i) {
      ctx.fillRect(GRAPH_WIDTH - GRAPH_BLOCK_SIZE_TOTAL, i * GRAPH_BLOCK_SIZE_TOTAL, GRAPH_BLOCK_SIZE, GRAPH_BLOCK_SIZE);
    }
    ctx.fillStyle = colour;
    ctx.fillRect(GRAPH_WIDTH - GRAPH_BLOCK_SIZE_TOTAL, i * GRAPH_BLOCK_SIZE_TOTAL, GRAPH_BLOCK_SIZE, GRAPH_BLOCK_SIZE);
  }

  function init() {
    var allVideos = document.getElementsByTagName('video');
    for (var i = 0, vl = allVideos.length; i < vl; i++) {
      var v = allVideos[i];

      if (v.readyState < HTMLMediaElement.HAVE_METADATA) {
        v.addEventListener('loadedmetadata', (function(videos) {
          return function() {
            videos.push(new VideoStats(this));
          };
        })(videos), false);
      } else {
        videos.push(new VideoStats(v));
      }
    }

    startStats();

    document.removeEventListener('DOMContentLoaded', init, false);
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init, false);
  }

  window['videoStatsObjects'] = videos;

})(window, window.document);

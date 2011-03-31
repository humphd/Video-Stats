
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
  var statProps = "mozParsedFrames mozDecodedFrames mozPresentedFrames mozPaintedFrames mozFrameDelay".split();

  var videoStatsSupported = true,
      videoProto = HTMLVideoElement.prototype;
  for (var i = 0; i < statProps.length; i++) {
    if (!(statProps[i] in videoProto)) {
      videoStatsSupported = false;
    }
  }

  if (!videoStatsSupported) {
    throw new Error("Video Stats: Mozilla <video> painting performance statistics not found!";
  }

  // Also assumes existence of mozRequestAnimationFrame
  if (!("mozRequestAnimationFrame" in window)) {
    throw new Error("Video Stats: mozRequestAnimationFrame not found!";
  }

  var Mean = function() {
    this.count = 0;
    this.sum = 0;
  };

  Mean.prototype.record = function(val) {
    this.count++;
    this.sum += val;
  };

  Mean.prototype.toString = function() {
    return this.count ? (this.sum / this.count).toFixed(3) : '0';
  };

  var VideoStats = function(video) {
    this.video = video;

    this.decodedFrames     = 0;
    this.parsedFrames      = 0;
    this.paintedFrameCount = 0;
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
    var vl = videos.length;

    function recalcRates() {
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
        v.prepsMean.record(presentedPerSec);
        v.pntpsMean.record(paintedPerSec);
      }
    }

    function updateFrameDelayMean() {
      for (var i = 0; i < vl; i++) {
        var v = videos[i],
            video = v.video;

        if (video.readyState <= HTMLMediaElement.HAVE_CURRENT_DATA || video.paused) {
          continue;
        }

        var delay = v.mozFrameDelay;
        if (video.mozPaintedFrames !== v.paintedFrameCount) {
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

  function init() {
    var videos = document.getElementsByTagName('video');
    for (var i = 0, vl = videos.length; i < vl; i++) {
      videoElements.push(new VideoStats(videos[i]));
    }

    startStats();

    document.removeEventListener('DOMContentLoaded', init, false);
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init, false);
  }


})(window, window.document);

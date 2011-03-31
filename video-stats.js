
/**

   http://blog.pearce.org.nz/2011/03/html5-video-painting-performance.html

    mozParsedFrames - A count of the number of video frames that have been demuxed/parsed from the media resource. If we were playing perfectly, we'd be able to paint this many frames.
    mozDecodedFrames - A count of the number of deumxed/parsed video frames that have been decoded into Images. We skip decoding of parsed/demuxed frames if the decode is falling behind the playback position (this can happen if it takes a long time to decode a keyframe for example).
    mozPresentedFrames - A count of the number of decoded frames that have been presented to the rendering pipeline for painting (set as the current Image on the video element's ImageContainer). We may not present decoded frames if the frame arrives for presentation late.
    mozPaintedFrames - A count of the number of presented frames which were painted on screen. We may end up not painting presented frames if another frame is presented before the graphics pipeline has time to paint the previously presented frame, or if the video is off screen.
    mozFrameDelay - The time (as a floating point number in seconds) which the last painted video frame was rendered late by. This is the time duration between the decoder saying "paint frame X now", and the graphics pipeline physically getting frame X displayed on the screen. The value is accurate on desktop Firefox, but not on mobile. Improvements in the graphics pipeline, and the integration with the graphics pipeline, will show up as a decrease in this number.

**/
(function(window, document, undef) {

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
    throw new Error("Mozilla <video> painting performance statistics not found!";
  }

  // Also assumes existence of mozRequestAnimationFrame
  if (!("mozRequestAnimationFrame" in window)) {
    throw new Error("mozRequestAnimationFrame not found!";
  }

  


})(window, window.document);
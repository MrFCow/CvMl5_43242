let canvas_obj;

/*
  video capture related
*/
let video_width = 800;
let video_height = 600;
let camera_mode = 0; // 0: rear, 1: front
let capture; // video capture object

let draw_image_flag = true;
let capture_play_mode = true; // if we capture or pause, used in touchStarted()

/*
  Tesseract
*/
let tesseract_worker;
let flag_tesseract_loaded = false;


/// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function _____separator_utils_____(){}
/// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function _____separator_events_____(){}
/// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function swap_camera() {
  capture.remove();
  if (camera_mode === 1){ // using front, swap to rear - 0
	  capture = createCapture({
      audio: false,
      video: {
        width: video_width,
        height: video_height,
        facingMode: {ideal:"environment"}
      }
	  });
    camera_mode = 0;
  } else { // using rear, swap to front - 1
	    capture = createCapture({
        audio: false,
        video: {
          width: video_width,
          height: video_height,
          facingMode: {ideal:"user"}
        }
	    });
    camera_mode = 1;
  }
  capture.hide();
  console.log("swap_camera done")
}

function swap_draw_image() {
  draw_image_flag = !draw_image_flag;
}

/*
  when touching canvas, try pausing the capture, not stop detect
*/
function on_touch_event_function() {
  if (capture_play_mode){ // toggle to pause
    capture.pause();
  }
  else {  // toggle to resume
    capture.play()
  }
  capture_play_mode = ! capture_play_mode;
}

/// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function _____separator_functions_____(){}
/// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function detect_function() {
  // TODO: Tesseract detect
  if (flag_tesseract_loaded){
    (async () => {
      const { data: { text } } = await worker.recognize(capture.elt);
      console.log(text);
    })();
  }

  requestAnimationFrame(function() {
    detect_function();
  });
}

/// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function _____separator_p5js_____(){}
/// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function setup() {
  //Promise.longStackTraces();

  /*
    Setup capture
  */
  if (windowHeight > windowWidth){
    canvas_obj = createCanvas(video_height, video_width); // 450 x 800
  } else{
    canvas_obj = createCanvas(video_width, video_height); // 800 x 450
  }
  canvas_obj.canvas.onclick = on_touch_event_function

  capture = createCapture({
    audio: false,
    video: {
      width: video_width,
      height: video_height,
      facingMode: {ideal:"environment"}
    }
  });
  capture.hide();

  // TODO: create Tesseract
  //const tesseract_lang = 'eng';
  const tesseract_lang = 'eng+chi_tra'
  tesseract_worker = Tesseract.createWorker({langPath:'tesseract/langs'});
  await tesseract_worker.load();
  console.log("Tesseract Loaded");
  await tesseract_worker.loadLanguage(tesseract_lang);
  console.log("Tesseract Language Loaded");
  await tesseract_worker.initialize(tesseract_lang);
  console.log("Tesseract Initialized");
  
  flag_tesseract_loaded = true;
  
}

/*
  Resize canvas
*/
function windowResized() {
  if (!capture_play_mode){  // do not reset capture or canvas if it's in pause mode
    return 
  }

  if (windowHeight > windowWidth){
    resizeCanvas(video_height, video_width); // 450 x 800
  } else{
    resizeCanvas(video_width, video_height); // 800 x 450
  }

  capture.remove();
  if (camera_mode === 1){
	  capture = createCapture({
      audio: false,
      video: {
        width: video_width,
        height: video_height,
        facingMode: {ideal:"user"}
      }
	  });
  } else {
    capture = createCapture({
      audio: false,
      video: {
        width: video_width,
        height: video_height,
        facingMode: {ideal:"environment"}
      }
    });
  }
  capture.hide();
  console.log(`Canvas: ${width} x ${height}`)
  console.log(`Capture: ${capture.width} x ${capture.height}`)
}

function draw() {
  background(255);
  /*
    draw video capture
  */
  if (draw_image_flag && capture){
    image(capture, 0, 0);
  }
  
  // TODO: Tesseract Result Draw

  /*
    FPS
  */
  const fps = frameRate();
  fill(255);
  //stroke(0);
  noStroke();
  text("FPS: " + fps.toFixed(2), 10, height - 10);
}




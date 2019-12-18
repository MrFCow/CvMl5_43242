let canvas_obj;

/*
  video capture related
*/
let video_width = 800;
let video_height = 600;
let camera_mode = 0; // 0: rear, 1: front
let capture; // video capture object

/*
  object detection / prediction related
*/
let coco_model;
let predicted;
let draw_colors = ['red','green','blue','cyan','margenta','yellow'];


let tf_backend_mode = 0; // 0: cpu, 1: webgl
let draw_image_flag = true;
let capture_play_mode = true; // if we capture or pause, used in touchStarted()

/*
  Used in online training draw frame
*/
let training_frame_dispaly = false;
const train_frame_percent = 40;
const train_frame_color = "white";

/*
	toggle the flag to show or hide the square of the training frame square
*/
function toggle_training_frame_display() {
	training_frame_dispaly = ! training_frame_dispaly
}

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

function swap_tf_mode() {
  if (tf_backend_mode === 1){ // using webgl, swap to cpu - 0
	  tf.setBackend('cpu');
    tf_backend_mode = 0;
  } else { // using rear, swap to front - 1
	    tf.setBackend('webgl');
      tf_backend_mode = 1;
  }
  console.log("Tensorflow mode: " + tf.getBackend());
}

function swap_draw_image() {
  draw_image_flag = !draw_image_flag;
}

function detect_function() {
  if (capture_play_mode) {
    coco_model.detect(capture.elt).then(predictions => {
      predicted = predictions
    }, failed => {
        //console.log("failed at detect")
    });
  }
  requestAnimationFrame(function() {
    detect_function();
  });
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

function setup() {
  //Promise.longStackTraces();
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

  console.log("Waiting model");
  // Load the model.
  cocoSsd.load().then(model => {
    // detect objects in the image.
    coco_model = model;
    console.log("model loaded");
    console.log("Tensorflow using: " + tf.getBackend());
    
    requestAnimationFrame(function() {
      detect_function();
    });
  },
  failed =>{console.log("failed at cocoSsd.load()")});
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

  /*
    draw object detection bounding box and class
  */
  if (predicted && draw_image_flag){
    predicted.map(predicted_obj => {
      idx = predicted.indexOf(predicted_obj)
      
      selected_color = draw_colors[idx]
      stroke(selected_color);
      strokeWeight(1);
      noFill();
      rect(...predicted_obj.bbox);

      fill(selected_color)
      text(predicted_obj.class+"[" + idx + "]", predicted_obj.bbox[0], predicted_obj.bbox[1], 100, 15)
    });
  }

  /*
    training frame square
  */
  if (training_frame_dispaly) {
    stroke(train_frame_color)
    strokeWeight(4);
    noFill();
    
    train_frame_size = max()
    train_frame_coords = [train_frame_percent
    rect(width/2-train_frame_size/2,height/2-train_frame_size/2, train_frame_size, train_frame_size);
  }

  /*
    FPS
  */
  const fps = frameRate();
  fill(255);
  //stroke(0);
  noStroke();
  text("FPS: " + fps.toFixed(2), 10, height - 10);
}


/*
Code snippet for running the tensor
*/
/*
var_batched = tf.tidy(() => {
      if (!(capture.elt instanceof tf.Tensor)) {
        var_img = tf.browser.fromPixels(capture.elt);
      }
      // Reshape to a single-element batch so we can pass it to executeAsync.
      return var_img.expandDims(0);
    });
    
    var_result = coco_model.model.executeAsync(var_batched);

var_result.then(e=> {console.log(e)})
*/


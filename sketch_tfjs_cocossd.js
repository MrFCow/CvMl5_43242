let video_width;
let video_height;
let result;
let coco_model;
let capture;
let predicted;
let camera_mode = 0; // 0: rear, 1: front
let draw_colors = ['red','green','blue','cyan','margenta','yellow'];
let tf_backend_mode = 0; // 0: cpu, 1: webgl
let draw_image_flag = true;

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
}

function swap_tf_mode(){
  if (tf_backend_mode === 1){ // using webgl, swap to cpu - 0
	  tf.setBackend('cpu');
    tf_backend_mode = 0;
  } else { // using rear, swap to front - 1
	    tf.setBackend('webgl');
      tf_backend_mode = 1;
  }
  console.log("Tensorflow mode: " + tf.getBackend());
}

function swap_draw_image(){
  draw_image_flag = !draw_image_flag;
}

function detect_function() {
  //console.log("detect_function");
    
  coco_model.detect(capture.elt).then(predictions => {
    predicted = predictions
    //console.log('Predictions: ', predictions);
  }, failed => {
      //console.log("failed at detect")
      }
    );
  requestAnimationFrame(function() {
    detect_function();
  });
}

function setup() {
  if (windowHeight > windowWidth){
    video_width = 300;
    video_height = 400;
  } else{
    video_width = 400;
    video_height = 300;
  }
  Promise.longStackTraces();
  createCanvas(video_width, video_height);
  // create video capture.  For PoseNet, videos must be square
  capture = createCapture({
    audio: false,
    video: {
      width: video_width,
      height: video_height,
      facingMode: {ideal:"environment"}
    }
  });
  //capture.size(video_width, video_height);
  capture.hide();

  console.log("load model");
  console.log("Tensorflow mode: " + tf.getBackend());
  // Load the model.
  cocoSsd.load().then(model => {
    // detect objects in the image.
    coco_model = model;
    console.log("model loaded");
    console.log("Tensorflow using: " + tf.getBackend());
    //console.log(coco_model); // crash with screenlog.js
    requestAnimationFrame(function() {
      detect_function();
    });
  },
  failed =>{console.log("failed at cocoSsd.load()")});
}


function windowResized() {
  if (windowHeight > windowWidth){
    video_width = 300;
    video_height = 400;
  } else{
    video_width = 400;
    video_height = 300;
  }
  resizeCanvas(video_width, video_height);
}


function draw() {
  background(255);
  if (draw_image_flag){
    image(capture, 0, 0, video_width, video_height);
  }
  //noStroke();
  
  if (predicted && draw_image_flag){
    predicted.map(predicted_obj => {
      idx = predicted.indexOf(predicted_obj)
      
      selected_color = draw_colors[idx]
      stroke(selected_color);
      

      noFill();
      rect(...predicted_obj.bbox);

      fill(selected_color)
      text(predicted_obj.class+"[" + idx + "]", predicted_obj.bbox[0], predicted_obj.bbox[1], 100, 15)
    });
  }
}
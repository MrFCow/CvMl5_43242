const video_width = 400;
const video_height = 300;
let result;
let coco_model;
let capture;
let predicted;
let camera_mode = 0; // 0: rear, 1: front
let draw_colors = ['red','green','blue','cyan','margenta','yellow']


function swap() {
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

function detect_function() {
  //console.log("detect_function");
    
  coco_model.detect(capture.elt).then(predictions => {
    predicted = predictions
    //console.log('Predictions: ', predictions);
  }, failed => {console.log("failed at detect")}
    );
  requestAnimationFrame(function() {
    detect_function();
  });
}

function setup() {
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
  
  // Load the model.
  cocoSsd.load().then(model => {
    // detect objects in the image.
    coco_model = model;
    console.log("model loaded");
    //console.log(coco_model); // crash with screenlog.js
    requestAnimationFrame(function() {
      detect_function();
    });
  },
  failed =>{console.log("failed at cocoSsd.load()")});
}

function draw() {
  background(255);
  image(capture, 0, 0, video_width, video_height);

  //noStroke();
  
  if (predicted){
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
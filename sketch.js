// Copyright (c) 2019 ml5
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/* ===
ml5 Example
Real time Object Detection using YOLO and p5.js
=== */

let video;
let yolo_options;
let yolo;
let faceapi_detectionOptions;
let faceapi;
let status;
let objects = [];
let mode = 0; // 0: rear, 1: front

function swap() {
  if (mode === 1){ // using front, swap to rear - 0
    video.remove();
	  video = createCapture({
      audio: false,
      video: {
        facingMode: {ideal:"environment"}
      }
	  });
    mode = 0;
  } else { // using rear, swap to front - 1
    video.remove();
	  video = createCapture({
      audio: false,
      video: {
        facingMode: {ideal:"user"}
      }
	  });
    mode = 1;
  }
  video.elt.setAttribute('playsinline', '');
  video.size(240, 320);
  video.hide();
  mode_div.html(mode)
}

function setup() {
  
  createCanvas(240, 320);
  //video = createCapture(VIDEO);
  video = createCapture({
    audio: false,
    video: {
      facingMode: {ideal:"environment"}
    }
  });
  video.elt.setAttribute('playsinline', '');
  video.size(240, 320);
  

  // Create a YOLO method
  yolo_options = {
    // modelUrl: 'https://raw.githubusercontent.com/ml5js/ml5-data-and-training/master/models/YOLO/model.json',
    filterBoxesThreshold: 0.01,
    IOUThreshold: 0.1,
    classProbThreshold: 0.1,
  };

  yolo = ml5.YOLO(video, yolo_options, startDetecting);

  // Create face api 
  /*
  faceapi_detectionOptions = {
    withLandmarks: true,
    withDescriptors: false,
  };
  // Initialize the magicFeature
  faceapi = ml5.faceApi(faceapi_detectionOptions, modelReady);
  */
  // Hide the original video
  video.hide();
  status = select('#status');
  mode_div = select('#mode');
  result_div = select('#results');
  yolo_options_div = select('#yolo_options')

  mode_div.html(mode)
  screenLog.init();
  yolo_options_div.html(yolo.filterBoxesThreshold.toString() + ', ' + yolo.IOUThreshold.toString() + ', ' + yolo.classProbThreshold.toString())
}


///////////// YOLO
function draw() {
  image(video, 0, 0, width, height);
  for (let i = 0; i < objects.length; i++) {
    noStroke();
    fill(0, 255, 0);
    text(objects[i].label, objects[i].x * width, objects[i].y * height - 5);
    noFill();
    strokeWeight(4);
    stroke(0, 255, 0);
    rect(objects[i].x * width, objects[i].y * height, objects[i].w * width, objects[i].h * height);
  }
}

function startDetecting() {
  status.html('Model loaded!');
  detect();
}

function detect() {
  yolo.detect(function(err, results) {
    objects = results;
    result_div.html(JSON.stringify(objects))
    yolo_options_div.html(yolo.filterBoxesThreshold.toString() + ', ' + yolo.IOUThreshold.toString() + ', ' + yolo.classProbThreshold.toString())
    detect();
  });
}

/////////// Face API
function modelReady() {
    console.log('ready!')
    console.log(faceapi)
    faceapi.detect(gotResults)

}

function gotResults(err, result) {
    if (err) {
        console.log(err)
        return
    }
    // console.log(result)
    detections = result;

    // background(220);
    background(255);
    image(video, 0,0, width, height)
    if (detections) {
        if (detections.length > 0) {
            // console.log(detections)
            drawBox(detections)
            drawLandmarks(detections)
        }

    }
    faceapi.detect(gotResults)
}

function drawBox(detections){
    for(let i = 0; i < detections.length; i++){
        const alignedRect = detections[i].alignedRect;
        const x = alignedRect._box._x
        const y = alignedRect._box._y
        const boxWidth = alignedRect._box._width
        const boxHeight  = alignedRect._box._height
        
        noFill();
        stroke(161, 95, 251);
        strokeWeight(2);
        rect(x, y, boxWidth, boxHeight);
    }
    
}

function drawLandmarks(detections){
    noFill();
    stroke(161, 95, 251)
    strokeWeight(2)

    for(let i = 0; i < detections.length; i++){
        const mouth = detections[i].parts.mouth; 
        const nose = detections[i].parts.nose;
        const leftEye = detections[i].parts.leftEye;
        const rightEye = detections[i].parts.rightEye;
        const rightEyeBrow = detections[i].parts.rightEyeBrow;
        const leftEyeBrow = detections[i].parts.leftEyeBrow;

        drawPart(mouth, true);
        drawPart(nose, false);
        drawPart(leftEye, true);
        drawPart(leftEyeBrow, false);
        drawPart(rightEye, true);
        drawPart(rightEyeBrow, false);

    }

}

function drawPart(feature, closed){
    
    beginShape();
    for(let i = 0; i < feature.length; i++){
        const x = feature[i]._x
        const y = feature[i]._y
        vertex(x, y)
    }
    
    if(closed === true){
        endShape(CLOSE);
    } else {
        endShape();
    }
    
}

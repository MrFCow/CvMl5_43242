// Copyright (c) 2019 ml5
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/* ===
ml5 Example
Real time Object Detection using YOLO and p5.js
=== */

let video;
let yolo;
let status;
let objects = [];
let mode = 0;

function swap() {
  if (mode == 1){
	  video = createCapture({
		audio: false,
		video: {
		  facingMode: "environment"
		}
	  });
      model = 0;
  } else {
	  video = createCapture({
		audio: false,
		video: {
		  facingMode: "facing"
		}
	  });
      mode = 1;
  }
  video.size(240, 320);
  video.hide();
}

function setup() {
  
  createCanvas(240, 320);
  //video = createCapture(VIDEO);
  video = createCapture({
    audio: false,
    video: {
      facingMode: "environment"
    }
  });
  video.size(240, 320);

  // Create a YOLO method
  yolo = ml5.YOLO(video, startDetecting);
  //objectDetector = ml5.objectDetector(video, startDetecting);

  // Hide the original video
  video.hide();
  status = select('#status');
}

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
    detect();
  });
}

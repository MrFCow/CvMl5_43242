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
let detect_flag = false;
let draw_colors = ['red','green','blue','cyan','margenta','yellow'];

let nvidia_model;

let tf_backend_mode = 0; // 0: cpu, 1: webgl
let draw_image_flag = true;
let capture_play_mode = true; // if we capture or pause, used in touchStarted()


/*
  Used in online training draw frame
*/
let db;
let take_photo_timeout = 1000;
let take_photo_flag = false;
let in_time_out_flag = false;
let image_taken_id = 0;
const store_name = 'train_images';

/*
  Used in online training draw frame
*/
let training_frame_dispaly = false;
const train_frame_percent = 40;
const train_frame_color = "white";



/// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function _____separator_utils_____(){}
/// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function _____separator_events_____(){}
/// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
	toggle the flag to show or hide the square of the training frame square
*/
function toggle_training_frame_display() {
	training_frame_dispaly = !training_frame_dispaly;
}

/*
	toggle the flag to dectect or not
*/
function toggle_detection() {
	detect_flag = !detect_flag;

  // update button label
  let button = select("#detection");
  button.elt.textContent =  detect_flag ? "stop dectect": "start dectect";

  // clear prediction bounding box drawing info
  predicted = null;
}


/*
  Record images on touch start
*/
function touchstart_take_photo(event) {
  event.preventDefault();
  console.log("touch start");
  take_photo_flag = true;
}

function touchend_take_photo(event) {
  event.preventDefault();
  console.log("touch end");
  take_photo_flag = false;
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
  if (capture_play_mode && detect_flag) {
    coco_model.detect(capture.elt).then(predictions => {
      predicted = predictions;
    }, failed => {
        //console.log("failed at detect")
    });
  }
  requestAnimationFrame(function() {
    detect_function();
  });
}

/*
  save photo to indexedDB or localStorage andwait for next timeout_value
*/
async function save_photo_in_mem_with_timeout(timeout_value) {
  /*
    Do nothing if release button already
  */
  if (!take_photo_flag){
    return;
  }

  /*
    Only when not during timeout
  */
  if (!in_time_out_flag ){
    in_time_out_flag = true;
    
    /*
      prepare image
    */
    const current_frame = get();
    current_frame.loadPixels();
    
    /*
      save to IndexedDB
    */
    const tx = db.transaction(store_name, 'readwrite');
    const store = tx.objectStore(store_name);
    image_taken = {
      id: image_taken_id,
      pixels: current_frame.pixels
    };
    image_taken_id++;

    get_image_result = store.add(image_taken).then(item => {
        console.log(`image ${image_taken_id-1} added to DB`);          
      }).catch(function(e) {
        tx.abort();
        console.log(e);
      });


    await Promise.all([get_image_result, timeout(timeout_value)]);
    in_time_out_flag = false;
    
  }
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

  /*
    Load CocSsd Model
  */
  console.log("Waiting model");
  
  cocoSsd.load().then(model => {
  // load_model().then(model => {
    // detect objects in the image.
    coco_model = model;
    console.log("model loaded");
    console.log("Tensorflow using: " + tf.getBackend());
    
    requestAnimationFrame(function() {
      detect_function();
    });
  },
  failed =>{console.log("failed at cocoSsd.load()")});

  /*
    Load NVIDIA ssd model exported model
  */
  tf.loadLayersModel("models/nvidia_ssd_tfjs/model.json").then( model => {
    nvidia_model = model;
    console.log("NVIDIA model loaded");
  });
  

  /*
    IndexedDB
  */
  db_promise = idb_export.openDB("trainingData", "1", {
    upgrade(db) {
      console.log("Create Object Store");
      db.createObjectStore(store_name, {keyPath: 'id'});
    }
  });
  db_promise.then( async (db_instance) => {
    console.log("DB opened");
    db = db_instance;
    const store = db.transaction(store_name).objectStore(store_name);
    let max_item_id = await store.getAllKeys().then(k_array => {
      max_value = max(k_array);
      if (max_value > 0){
        return max_value;
      } else {
        return 0;
      }
    });
    if (max_item_id > 0){
      image_taken_id = max_item_id + 1;
    }
    console.log(`${max_item_id} , ${image_taken_id}`);
  });
  
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
    take photo every x seconds
  */
  if (take_photo_flag) {
    save_photo_in_mem_with_timeout(take_photo_timeout);
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
    stroke(train_frame_color);
    strokeWeight(4);
    noFill();
    
    train_frame_size = max(width, height) * train_frame_percent / 100;
    train_frame_coords = [width/2-train_frame_size/2, height/2-train_frame_size/2, train_frame_size, train_frame_size];
    rect(...train_frame_coords);
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
    
var_result_promise = coco_model.model.executeAsync(var_batched);

var_result_promise.then(e=> {console.log(e)})
*/

/*
let coco_model2_promise;
let coco_model2;
coco_model2_promise = tf.loadGraphModel("model/model.json");
await coco_model2_promise.then(model => {coco_model2 = model});
var_batched = tf.tidy(() => {
      if (!(capture.elt instanceof tf.Tensor)) {
        var_img = tf.browser.fromPixels(capture.elt);
      }
      // Reshape to a single-element batch so we can pass it to executeAsync.
      return var_img.expandDims(0);
    });
    
var_result_promise = coco_model2.executeAsync(var_batched);

var_result_promise.then(e=> {console.log(e)})
*/


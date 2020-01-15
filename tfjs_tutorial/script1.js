async function getData() {
  const carsDataReq = await fetch('https://storage.googleapis.com/tfjs-tutorials/carsData.json');
  const carsData = await carsDataReq.json();
  const cleaned = carsData.map(car => ({
    mpg: car.Miles_per_Gallon,
    horsepower: car.Horsepower,
  }))
  .filter(car => (car.mpg !=null && car.horsepower !=null));

  return cleaned;
}

function createModel() {
  const model = tf.sequential();

  model.add(tf.layers.dense({inputShape:[1], units: 1, useBias: true})); // (1) => (1)
  model.add(tf.layers.dense({units:1, useBias: true })); // (1) => (1)
  
  return model;
}

function createModel2() {
  // constructor  
  const dense1_out_units = 10;
  const input_dim = [1];
  const output_dim = 1;

  const inputs = tf.input({shape:input_dim});

  const dense1 = tf.layers.dense({
    inputDim: input_dim,
    units: dense1_out_units,
    //activation: 'sigmoid', // use custom activation layer
    useBias: true,
    kernelInitializer: 'glorotNormal',
    biasInitializer: 'glorotNormal',
    //kernelRegularizer: 'l1l2'
  });

  const dense2 = tf.layers.dense({
    inputDim: dense1_out_units,
    units: output_dim,
    //activation: 'tanh',
    useBias: true,
    kernelInitializer: 'glorotNormal',
    biasInitializer: 'glorotNormal',
    //kernelRegularizer: 'l1l2'
  });

  const bn = tf.layers.batchNormalization() // (bs, f)

  // call 
  let output = inputs;
  output = dense1.apply(output);
  output = tf.layers.reLU().apply(output);
  output = bn.apply(output);
  output = dense2.apply(output);
  output = tf.layers.reLU().apply(output);

  const model = tf.model({inputs: inputs, outputs: output});

  return model;
}

function createModel3() {
  class Dense_BN extends tf.layers.Layer {
    static className = "Dense_BN";

    constructor(config){
      super(config);
      this.config = config;
    }

    build(inputShape){
      this.dense = tf.layers.dense(this.config);
      this.bn = tf.layers.batchNormalization() // (bs, f)
    }

    computeOutputShape(inputShape) {
        return [inputShape[0], this.config.units];
    }

    call(inputs, kwargs) {
      return tf.tidy( () => {
        this.invokeCallHook(inputs, kwargs); // what this does???
        let output;
        output = this.dense.apply(inputs);
        output = tf.layers.reLU().apply(output);
        output = this.bn.apply(output);

        return output;
      });
    }

    getConfig() {
      //const config = super.getConfig();     
      return this.config;
    }

  }
  tf.serialization.registerClass(Dense_BN);

  // constructor  
  const dense1_out_units = 50;
  const input_dim = [1];
  const output_dim = 1;

  const inputs = tf.input({shape:input_dim});

  const dense1_cfg = {
    inputDim: input_dim,
    units: dense1_out_units,
    //activation: 'sigmoid', // use custom activation layer
    useBias: true,
    kernelInitializer: 'glorotNormal',
    biasInitializer: 'glorotNormal',
    //kernelRegularizer: 'l1l2'
  };

/*   const dense1a_cfg = {
    inputDim: dense1_out_units,
    units: dense1_out_units,
    //activation: 'sigmoid', // use custom activation layer
    useBias: true,
    kernelInitializer: 'glorotNormal',
    biasInitializer: 'glorotNormal',
    //kernelRegularizer: 'l1l2'
  }; */

  const dense2 = tf.layers.dense({
    inputDim: dense1_out_units,
    units: output_dim,
    activation: 'selu',
    useBias: true,
    kernelInitializer: 'glorotNormal',
    biasInitializer: 'glorotNormal',
    //kernelRegularizer: 'l1l2'
  });

  dense_bn_layer = new Dense_BN(dense1_cfg);
  //dense_bn_layer.setCallHook( (inputs, kwargs) => {console.log("called la")}) // this is how it's called at first in defined call function
  // dense_bn_layer_a = new Dense_BN(dense1a_cfg);

  // call 
  let output = inputs;
  output = dense_bn_layer.apply(output);
  //output = dense_bn_layer_a.apply(output);
  output = dense2.apply(output);
  //output = tf.layers.reLU().apply(output);


  const model = tf.model({inputs: inputs, outputs: output});

  return model;
}

function convertToTensor(data) {
  return tf.tidy( () => {
    tf.util.shuffle(data);
    
    const inputs = data.map( d => d.horsepower );
    const labels = data.map( d => d.mpg );

    const inputTensor = tf.tensor2d(inputs, [inputs.length, 1]); // (len, 1)
    const labelTensor = tf.tensor2d(labels, [labels.length, 1]); // (len, 1)

    const inputMax = inputTensor.max();
    const inputMin = inputTensor.min();

    const labelMax = labelTensor.max();
    const labelMin = labelTensor.min();

    const normalizedInputs = inputTensor.sub(inputMin).div(inputMax.sub(inputMin));
    const normalizedLabels = labelTensor.sub(labelMin).div(labelMax.sub(labelMin));

    return {
      inputs: normalizedInputs,
      labels: normalizedLabels,
      inputMax,
      inputMin,
      labelMax,
      labelMin,
    }

  });
}

async function trainModel(model, inputs, labels) {
  model.compile( {
    optimizer: tf.train.adam(),
    loss: tf.losses.meanSquaredError,
    metrics: ['mse'],
  });

  const batchSize = 32;
  const epochs =50;

  return await model.fit(inputs, labels, {
    batchSize,
    epochs,
    shuffle: true,
    callbacks: tfvis.show.fitCallbacks(
      {name: "Training Performance"},
      ['loss', 'mse'],
      {height: 200, callbacks: ['onEpochEnd']}
    )
  });
}

function testModel(model, inputData, normalizationData) {
  const {inputMax, inputMin, labelMin, labelMax} = normalizationData;

  const [xs, preds] = tf.tidy( () => {
    const xs = tf.linspace(0, 1, 100);
    const preds = model.predict(xs.reshape([100, 1]));

    const unNormXs = xs
      .mul(inputMax.sub(inputMin))
      .add(inputMin);

    const unNormPreds = preds
      .mul(labelMax.sub(labelMin))
      .add(labelMin);

    return [unNormXs.dataSync(), unNormPreds.dataSync()];
  });

  const predictedPoints = Array.from(xs).map( (val, i) => {
    return {x: val, y: preds[i]};
  });

  const originalPoints = inputData.map(d => ({
    x: d.horsepower, y: d.mpg,
  }));

  tfvis.render.scatterplot(
    {name: 'Model Predictions vs Original Data'},
    {values: [originalPoints, predictedPoints], series: ['original', 'predicted']},
    {
      xLabel: 'Horsepower',
      yLabel: 'MPG',
      height: 300
    }
  );
  
}


async function run() {
  const data = await getData();
  const values = data.map(d => ({
    x: d.horsepower,
    y: d.mpg,
  }));

  tfvis.render.scatterplot(
    {name: 'Horsepower v MPG'},
    {values},
    {
      xLabel: 'Horsepower',
      yLabel: 'MPG',
      height: 300
    }
  );

  const model = createModel3();
  tfvis.show.modelSummary({name: 'Model Summary'}, model);
  

  const tensorData = convertToTensor(data);
  const {inputs, labels} = tensorData;
  await trainModel(model, inputs, labels);
  console.log('Done Trianing');

  testModel(model, data, tensorData);

  const surface = {name: 'Values Distribution', tab: 'Model Inspection'};
  await tfvis.show.valuesDistribution(surface, model.layers[2].getWeights()[0]);
}

document.addEventListener('DOMContentLoaded', run);
var paintCanvas = document.getElementById("paintCanvas");
var paintContext = paintCanvas.getContext("2d");

var paintCanvas2 = document.getElementById("paint2");
var paintContext2 = paintCanvas2.getContext("2d");

var isDragging = false;
var startPoint = { x:0, y:0 };

paintContext.lineWidth=5;

var model;
tf.loadModel('ocr_model/model.json').then((result) => {model = result});

function kaydet(){
  paintContext.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
  paintContext2.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
}

function canvasReady(){
  /*paintCanvas.ontouchstart = paintMouseDown;*/
  paintCanvas.ontouchstart = paintMouseDown;
  paintCanvas.ontouchend = paintMouseUp;
  paintCanvas.ontouchmove = paintMouseMove;
}

function paintMouseDown(e){
  console.log('touch down');
  isDragging = true;
  startPoint.x = e.changedTouches[0].pageX;
  startPoint.y = e.changedTouches[0].pageY - 150;
  paintContext.beginPath();
  paintContext.moveTo(startPoint.x, startPoint.y);
  paintContext.strokeStyle = selectedColor;
}
async function paint_canvas(t)
{
  console.log(t);


}
function paintMouseUp(e){
  isDragging = false;
  paintContext2.drawImage(paintCanvas, 0, 0, 32, 32);
  var img_data = paintContext2.getImageData(0,0,32,32);
  var t = tf.fromPixels(img_data);
  console.log(t.shape);
  t2 = t.gather(tf.tensor1d([0]), 2).reshape([1, 32, 32, 1]).toFloat();
  tm = tf.max(t2);
  t3 = tf.div(t2, tm);
  t5 = tf.onesLike(t3);
  tf.max(t3).print();
  
  console.log(t2.shape);
  console.log('prediction');
  t4 = model.predict(t3);
  t4.print();
  t4.argMax().print();
  const predictions = Array.from(t4.argMax().dataSync());
  console.log('converteed array');
  console.log(predictions);
  $("#pred").text(predictions[0]);
  /*
  d = [];
  v = [];
  total = 0;
  for (i=0;i<10;i++)
  {
    d.push({label: i, y: predictions[i]});
  }
  chart(d);*/
}
function paintMouseMove(e){
  console.log("touch move");
  if(isDragging){
    /*console.log(kareMi);
    if(kareMi){
      hintCanvas.width = hintCanvas.width;
      var width = e.offsetX - startPoint.x;
      var height = e.offsetY - startPoint.y;
      hintContext.strokeRect(startPoint.x, startPoint.y, width, height);
    }
    else*/{
      paintContext.lineTo(e.changedTouches[0].pageX,
        e.changedTouches[0].pageY - 150);
      paintContext.stroke();
    }
  }
}

canvasReady();

function chart(datap) {
  var chart = new CanvasJS.Chart("chartContainer", {
    title:{
      text: "Probability distribution"              
    },
    data: [              
    {
      // Change type to "doughnut", "line", "splineArea", etc.
      type: "column",
      dataPoints: datap
    }
    ]
  });
  chart.render();
}
  var paintCanvas = document.getElementById("paintCanvas");
	var paintContext = paintCanvas.getContext("2d");
	var hintCanvas = document.getElementById("hintCanvas");
	var hintContext = hintCanvas.getContext("2d");
	var paintCanvas2 = document.getElementById("paint2");
	var paintContext2 = paintCanvas2.getContext("2d");
	
	var kareMi = false;
	
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
		hintCanvas.onmousedown = paintMouseDown;
		hintCanvas.onmouseup = paintMouseUp;
		hintCanvas.onmousemove = paintMouseMove;
	}
	
	function paintMouseDown(e){
		isDragging = true;
		//kareMi = document.getElementById("kare").checked;
		startPoint.x = e.offsetX;
		startPoint.y = e.offsetY;
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
		/*if(kareMi){
			hintCanvas.width = hintCanvas.width;
			var width = e.offsetX - startPoint.x;
			var height = e.offsetY - startPoint.y;
			
			paintContext.beginPath();
			paintContext.fillStyle = selectedColor;
			paintContext.fillRect(startPoint.x, startPoint.y, width, height);
		}*/
		paintContext2.drawImage(paintCanvas, 0, 0, 32, 32);
		var img_data = paintContext2.getImageData(0,0,32,32);
		var t = tf.fromPixels(img_data);
		console.log(t.shape);
		//console.log();
		//t = tf.linspace(1,8, 8).reshape([2,2,-1]);
		
		//t = tf.tensor2d([1,2,7,8], [2,2]);
		//t.gather(tf.tensor1d([0]), 2).reshape([-1]).print();
		t2 = t.gather(tf.tensor1d([0]), 2).reshape([1, 32, 32, 1]).toFloat();
		//t2 = t.gather(tf.tensor1d([2]), 2).reshape([6, 6]).toFloat();
		//t2 = t.reshape([6, 6, 3]).toFloat();
		//t2.print();
		tm = tf.max(t2);
		//tm.print();
    t3 = tf.div(t2, tm);
    t5 = tf.onesLike(t3);
    //t3 = tf.sub(t5, t3);
		//t.reshape([-1]).print();
		tf.max(t3).print();
		
		console.log(t2.shape);
		console.log('prediction');
		t4 = model.predict(t3);
		t4.print();
		const predictions = Array.from(t4.dataSync());
		console.log('converteed array');
		console.log(predictions);
		//t.print();

		d = [];
		v = [];
		total = 0;
		for (i=0;i<10;i++)
		{
			d.push({label: i, y: predictions[i]});
		}
		chart(d);
	}
	function paintMouseMove(e){
		if(isDragging){
			/*console.log(kareMi);
			if(kareMi){
				hintCanvas.width = hintCanvas.width;
				var width = e.offsetX - startPoint.x;
				var height = e.offsetY - startPoint.y;
				hintContext.strokeRect(startPoint.x, startPoint.y, width, height);
			}
			else*/{
				paintContext.lineTo(e.offsetX, e.offsetY);
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
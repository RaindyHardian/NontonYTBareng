var canvas;
var pen='rgba(255,0,0, 1)';
function setup() {
  // put setup code here
  canvas=createCanvas(640,360);
  background('rgba(0,0,0, 0.1)');
  canvas.parent('stackFrame');
 
  $('#setSize').click(function(){
    var setW = $('#widthPlayer').val();
    var setH = $('#heightPlayer').text();
    if(setH>0 && setW>0){
      $('#ytplayer').attr('width',setW);
      $('#ytplayer').attr('height',setH);
      canvas=createCanvas(setW,setH);
      background('rgba(0,0,0, 0.1)');
      canvas.parent('stackFrame');
    }
    
  });
  $('#draw').click(function(){
    pen = 'rgba(255,0,0, 1)';
    console.log(pen);
    $('#ytplayer').css('position','absolute');
    $('#ytplayer').css('z-index','-1');
  });
  $('#close').click(function(){
    $('#ytplayer').css('position','absolute');
    $('#ytplayer').css('z-index','0');
    // clear();
    background('rgba(0,0,0, 0)');
    background('rgba(0,0,0, 0.1)');
  });
  $('#clear').click(function(){
    clear();
    background('rgba(0,0,0, 0.1)');
    var clearD = 1;
    socket.emit('clearDrawing', clearD);
  });
  socket.on('mouseDrawing', function(data){
    $('#ytplayer').css('z-index','-1');
    background('rgba(0,0,0, 0)');
    noStroke();
    fill(pen);
    if(width == data.width && height == data.height){
      circle(data.x,data.y,10);
      // var newX = (data.x/data.width)*width;
      // var newY = (data.y/data.height)*height;
      // circle(newX,newY,10);
    }else{
      var newX = (data.x/data.width)*width;
      var newY = (data.y/data.height)*height;
      circle(newX,newY,10);
    }
    
  });
  socket.on('clearDrawing', function(clearD){
    clear();
    background('rgba(0,0,0, 0.1)');
  });
}
function mouseDragged(){
  if (mouseX <= width && mouseX >= 0 && mouseY <= height && mouseY >= 0){
    var data = {
      x: mouseX,
      y: mouseY,
      width: width,
      height: height
    }
    noStroke();
    fill(pen);
    circle(mouseX,mouseY,10);
    socket.emit('mouseDrawing', data);
  }
}
function draw() {
  // put drawing code here
  // if(mouseIsPressed){
  //   fill(pen);
  //   circle(mouseX,mouseY,20);
    
  //   noStroke();
  // }
}

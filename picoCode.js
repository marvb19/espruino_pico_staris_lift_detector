
I2C1.setup({scl:B6,sda:B7});
I2C3.setup({scl:A8,sda:B4});

var mpu = require("MPU_6050").connect(I2C1);
var bme = require("BME280").connect(I2C1);
var a = [0,0,0,0];
var startCounterPres = 0;
var startCounterRot = 0;
var hasStarted = 0;
var b=[0,0,0,0,0,0,0,0,0,0];
var counter=0;

const druckdiff=0.1;
const rotationWert=5000

function gatherPressure()
{
  //on startup gather 4 values from the pressure before starting to detect
  if(startCounterPres != 4)
  {
    a[startCounterPres]=(bme.getData()['pressure']);
    startCounterPres++;
  }
  else // after getting 4 values, start a rotatio inside the array so we dont need extra pointers
  {
    for(var i = 0; i<3; i++)
    {
      a[i] = a[i+1];
    }
    a[3] = bme.getData()['pressure']; // append new value to fourth slot of array
    
    var curMin = Math.min.apply(Math,a); //get min and max inside the pressure array to make decision based on difference
    var curMax = Math.max.apply(Math,a);
    var curDiff = curMax - curMin;
    print(curDiff);
	
    if(curDiff >= druckdiff)// if difference is big enough start the interval for gathering Rotation once
    {
      // start recording of rotatione
      if(!hasStarted)
      {
        setInterval(function(){gatherRot();}, 100);
        hasStarted = 1;
      }
    }
    else // if difference was not big enough clear timers and set new timer for pressure
    {
      //stopping recording of rotatione
      //clearing timers + setting pressure timer
      clearInterval();
      setInterval(function(){gatherPressure();}, 1000);
      startCounterRot = 0;
      hasStarted = 0;
      print("Nothing");
      print(counter);
      counter++;
      I2C3.writeTo(0x55, "0");
    }
  }
}

function gatherRot()
{
  if(startCounterRot != 10) //same procedure as above
  {
    b[startCounterRot]=(Math.abs(mpu.getRotation()[0]) +Math.abs(mpu.getRotation()[1]) + Math.abs(mpu.getRotation()[2]));
    startCounterRot++;
  }
  else
  {
    for(var i = 0; i < 9; i++)
    {
      b[i] = b[i+1];
    }
    
    b[9] = (Math.abs(mpu.getRotation()[0]) +Math.abs(mpu.getRotation()[1]) + Math.abs(mpu.getRotation()[2]));
    var mederg01=median(b)
    print(mederg01)
    if( mederg01> rotationWert)//michael fragen //get median and decide
    {
      // gehen senden an esp
      print("gehen");
      counter++;
      I2C3.writeTo(0x55, "2");
    }
    else
    {
      // fahrstuhl senden an esp
      print("fahrstuhl");
      counter++;
      I2C3.writeTo(0x55, "1");
    }
  }
}


function median(arr) {
  if (arr.length == 0) {
    print("leer");
    return; // 0.
  }
  arr.sort((a, b) => a - b); // 1.
  const midpoint = Math.floor(arr.length / 2); // 2.
  const median = arr.length % 2 === 1 ?
    arr[midpoint] : // 3.1. If odd length, just take midpoint
    (arr[midpoint - 1] + arr[midpoint]) / 2; // 3.2. If even length, take median of midpoints
  return median;
}

function stop()
{
  clearInterval();
  print("stopping");
  }
setWatch(function(e) {
  digitalWrite(LED1, 1);
  stop();
}, BTN, { repeat: true, edge: "both" });


setInterval(function(){gatherPressure();}, 1000);

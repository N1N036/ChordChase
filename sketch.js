// By Nino Saglia Music and Technology

let t = 0;
let playerY = 0;
let playerX = 1000;

let desiredY;
let stepsize;
let border = 100;
var osc;

var consonance
var mappedConsonance

var hypotheticalFreq
var hypotheticalConsonance
var colorValue

var velocity = 0;
var friction = 0.9;
var PlayerDrift = 0;

let highScore = 0;
let Score = 0;
let gameState = "start";

/**
Consonance dynamically scales so that there's always a location where the player can be rewarded for being at the most consonant location.
Despite the other planes flying on heights that make "good chords" impossible.
**/
let minConsonance;
let maxConsonance;

let AmpfadeSpeed = 0.07; // The speed at which sounds fade in/out
let targetAmp = 0;    // The target amplitude for your sounds
let currentAmp = 0;   // The current amplitude of your sounds

let occupiedAltitudes = []; //To minimize planes flying at the same location.

let numSteps = 12;  // Number of steps (e.g., 12 for one octave, 24 for two)
let pitchOffset = 24;  // Semitones above A0 (e.g., 36 for C2, 48 for C3)

// Define constants for the piano range
var minKey = pitchOffset;
var maxKey = pitchOffset + numSteps;

class Plane{
  constructor(){
    this.x = windowWidth/2;
    this.y = stepsize*int(random(0,12));
    this.desiredY = stepsize*int(random(3,9));
  }

createPlane(){
  //if it's plane 0 (player plane) the color of some parts will be red.
  if (this === planes[0]) {
  this.y += 0.1*(this.desiredY - this.y);
  }
  else{
  this.y += 0.01*(this.desiredY - this.y);
  }
  //Animate the propeller
  let propellerHeight = 45 * sin(frameCount * 1.2);

  // Draw the propeller
  if (this === planes[0]) {
    fill(255, 50, 50); // Red color
  } else {
    fill(150, 150, 150); // Darker gray color
  }
  ellipse(this.x + 45, this.y, 6, propellerHeight);

  noStroke();
  // Tail fin of the plane
  if (this === planes[0]) {
    fill(255, 50, 50); // Red color
  } else {
    fill(150, 150, 150); // Darker gray color
  }
  ellipse(this.x - 25, this.y - 5, 17, 18);
  ellipse(this.x - 30, this.y - 8, 16, 17);


  //body of the plane
    fill(200, 200, 200); // Light gray color
  ellipse(this.x + 7, this.y, 60, 20);
  ellipse(this.x - 10, this.y, 50, 10);

  // Cockpit of the plane
  fill(80, 80, 120); // Dark blue
  ellipse(this.x + 20, this.y -7, 15, 6);

  // Nose of the plane
  fill(200, 200, 200); // Light gray color
  ellipse(this.x + 35, this.y, 30, 8);

  // Wing of the plane
  if (this === planes[0]) {
    fill(255, 50, 50); // Red color
  } else {
    fill(150, 150, 150); // Darker gray color
  }
  ellipse(this.x + 10, this.y + 6, 30, 8);


};
    //The leading plane picks random altitudes.
    moveLeadingPlane() {
    if (t % (int(random(400,500))) == 0) {
      // Select a random altitude within the range
      this.desiredY = stepsize * int(random(0, numSteps));

      // Keep within canvas
      this.desiredY = constrain(this.desiredY, border, windowHeight - border);
    }
  }

//the following plane tries to fly at altitudes matching good pitch ratios with the leading plane that aren't too big (so no 12 notes etc)
moveFollowingPlane() {
  if (t % (int(random(400,500))) == 0) {
    var leadingKey = map(planes[planes.length-1].y, border, windowHeight - border, maxKey, minKey);
    var leadingFreq = 440 * 2 ** ((leadingKey - 49) / 12);

    var ok_ratios = [5/4, 6/5, 5/3, 7/5, 8/5, 9/5, 4/5, 5/6, 3/5, 5/7, 5/8, 5/9];
    // Select a random ratio from the somewhat good ratios array
    var ratio = ok_ratios[int(random(ok_ratios.length))];

    var freq = leadingFreq * ratio;
    var bestKey = 49 + 12 * Math.log2(freq / 440);

    // Map the key number to a y-coordinate
    this.desiredY = map(bestKey, minKey, maxKey, border, windowHeight - border);

    // Keep within canvas
    this.desiredY = constrain(this.desiredY, border, windowHeight - border);
  }
}


}


let planes = [];

//Add some clouds that move in the background.
class Cloud {
    constructor() {
        this.x = random(windowWidth, windowWidth * 2);
        this.y = random(0, windowHeight / 2);
        this.speed = random(1, 3);
        this.size = random(50, 100);
    }

    move() {
        this.x -= this.speed;
        if (this.x < -this.size) {
            this.x = random(windowWidth, windowWidth * 2);
            this.y = random(0, windowHeight / 2);
            this.speed = random(1, 3);
            this.size = random(50, 100);
        }
    }

    display() {
        fill(255, 255, 255, 100); // Semi-transparent white
        noStroke();
        ellipse(this.x, this.y, this.size, this.size / 2);
    }
}
let clouds = [];
//all planes have plume trails.
class Plume {
    constructor(x, y) {
        this.x = x -30;
        this.y = y;
        this.lifeSpan = 255; // lifespan based on alpha transparency
        this.size = random(10, 20);
    }

    update() {
        this.x -= 5; // Adjust speed of exhaust movement
        this.lifeSpan -= 5; // Adjust rate of fade out
        this.size += 0.5; // Increase the size as the plume ages
    }

    display() {
        noStroke();
        fill(230, 230, 230, this.lifeSpan); // Gray
        ellipse(this.x, this.y, this.size, this.size / 2);
    }

    isDone() {
        return this.lifeSpan <= 0;
    }
}
let plumes = [];

/**
the game heavily depends on harmony calculation.
The consonance or pleasantness of a chord can be quantified by iteratig through all good chord ratios and returning how close the input ratio is to the best matching one.
**/
function Consonance(freq1, freq2) {
  var ratio = freq1 / freq2;
  var min_diff = Number.MAX_VALUE;
  var nice_ratios = [2/1,1/2, 3/2,2/3, 4/3,3/4, 5/4,4/5, 6/5,5/6, 5/3,3/5, 7/5,5/7, 8/5,5/8, 9/5,5/9];

  for (var i = 0; i < nice_ratios.length; i++) {
    var diff = Math.abs(ratio - nice_ratios[i]);
    if (diff < min_diff) {
      min_diff = diff;
    }
  }

  var consonance = min_diff; // higher consonance for smaller differences

  return consonance;
}
function drawIntro() {
    // Set the background color
    background(50, 50, 150);

    // Set the font and alignment for your text
    textFont('Helvetica');
    textAlign(CENTER, CENTER);

    // Draw the game title
    textSize(80);
    fill(255, 255, 255);
    text("Chord Chase", width / 2, height / 2 - 100);

    // Draw the game slogan
    textSize(30);
    fill(255, 255, 255);
    text("Soaring in the Symphony of the Sky!", width / 2, height / 2);

    // Draw the game instructions
    textSize(20);
    fill(255, 255, 255);
    text("- Press any key to start -", width / 2, height / 2 + 100);

    // Set the text properties
    fill(255, 255, 255);
    textSize(18);
    textAlign(CENTER, CENTER);

    // Define the rules text with new lines
    let rulesText = "Stay in the harmonious air streams and keep up with the other planes!\nDarker sky = harmonious, brighter sky = inharmonious.\nReady to fly?";

    // Split the text into lines
    let lines = rulesText.split('\n');

    // Draw each line separately
    for (let i = 0; i < lines.length; i++) {
        text(lines[i], width / 2, height / 2 + 200 + i * 30);
    }
    }


function setup() {
  createCanvas(windowWidth-border/2,windowHeight-border/2);
  stepsize = int((windowHeight - (2 * border))/numSteps);//the size of the steps the planes can make (except for the player)
  desiredY = (random(100,windowHeight-100)); //spawn the player at a random location within the steps.
  playerY = desiredY;

  //Create all planes including player.
  for(let k = 0;k< 3;k++){
   planes.push(new Plane(i = k));
  }

  // Create 20 clouds
  for (let i = 0; i < 20; i++) {
        clouds.push(new Cloud());
    }

  //Create all audio generators.
  osc = new p5.SawOsc();
  osc1 = new p5.SawOsc();
  osc2 = new p5.SawOsc();
  OscLowPass = new p5.LowPass();
  wind = new p5.Noise('pink');
  WindlowPass = new p5.LowPass();

  //osc setup and audio routing
  osc.disconnect();
  osc.connect(OscLowPass);
  osc1.disconnect();
  osc1.connect(OscLowPass);
  osc2.disconnect();
  osc2.connect(OscLowPass);
  OscLowPass.freq(1000);

  //wind audio routing.
  wind.disconnect();  // Disconnect from master output
  wind.connect(WindlowPass);  // Connect to filter instead
  WindlowPass.freq(500);

  osc.start();
  osc1.start();
  osc2.start();

  wind.start();

  osc.amp(0);
  osc1.amp(0);
  osc2.amp(0);
}


// Restart the game or start a new one when not playing and any key is pressed.
function keyPressed() {
    if (gameState === "start") {
        gameState = "playing";
    } else if (gameState === "gameover") {

        resetGame();
        gameState = "playing";
    }
}

// Reset the game to its initial state
function resetGame() {
    PlayerDrift = 0;
    t = 0;
    Score = 0;
}


function draw() {
    if (gameState === "start") {
       drawIntro();
    } else if (gameState === "playing") {
  t += 1;
        targetAmp = 0.09;


  if (keyIsDown(UP_ARROW)) {
    velocity -= .5; // Increase the velocity in the up direction
  }
  if (keyIsDown(DOWN_ARROW)) {
    velocity += .5; // Increase the velocity in the down direction
  }

  velocity *= friction; // Apply friction, which will slowly decrease the velocity
  desiredY += velocity; // Move the player by the velocity

  // Constrain the player's position so they don't go off screen
  desiredY = constrain(desiredY, border, windowHeight - border);



// Map the plane's altitude to the range of keys on a piano
var key = map(planes[0].y, border, windowHeight - border, maxKey, minKey);
var key1 = map(planes[1].y, border, windowHeight - border, maxKey, minKey);
var key2 = map(planes[2].y, border, windowHeight - border, maxKey, minKey);

// Convert the key numbers to frequencies
var freq = 440 * 2 ** ((key - 49) / 12);
var freq1 = 440 * 2 ** ((key1 - 49) / 12);
var freq2 = 440 * 2 ** ((key2 - 49) / 12);


//Map player related variables to plane 0.
  planes[0].desiredY = desiredY;
  playerX = planes[0].x;
  playerY = planes[0].y;

  // Number of rows into which the sky is divided
  var numRows = 500;
  var rowHeight = windowHeight / numRows;
   let consonanceValues = []; // An array to store the consonance values for the entire canvas.

  for (let i = 0; i < numRows; i++) {
    var y = i * rowHeight;
    var hypotheticalKey = map(y, border, windowHeight - border, maxKey, minKey);
    var hypotheticalFreq = 440 * 2 ** ((hypotheticalKey - 49) / 12);
    var hypotheticalConsonance = Consonance(hypotheticalFreq, freq1) + Consonance(hypotheticalFreq, freq2) + Consonance(freq1, freq2);

    // Push the consonance value into the array
    consonanceValues.push(hypotheticalConsonance);
    // Normalizing consonance value to 0-1 range

    }

    // Calculate the minimum and maximum consonance values
    let minConsonance = Math.min(...consonanceValues);
    let maxConsonance = Math.max(...consonanceValues);

    for (let i = 0; i < consonanceValues.length; i++) {
    var normalizedConsonance = map(consonanceValues[i], minConsonance, maxConsonance, 0, 1);

    // Defining colors for high and low sky (you can adjust these to your liking)
    var highSkyColor = color(150, 230, 235); // sky blue
    var lowSkyColor = color(30, 60, 180); // steel blue

    // Interpolating between the two colors based on normalized consonance
    var skyColor = lerpColor(lowSkyColor, highSkyColor, normalizedConsonance);

    fill(skyColor);
    rect(0, i * rowHeight, windowWidth, rowHeight);
}

// Reset the array for the next frame
consonanceValues = [];

consonance = Consonance(freq, freq1) + Consonance(freq, freq2) +
             Consonance(freq1, freq2) + Consonance(freq1, freq);
//normalize the final consonance for scoring.
consonance = map(consonance, minConsonance,maxConsonance,0,1);

  stroke(255,255);
  osc.freq(freq);
  osc1.freq(freq1);
  osc2.freq(freq2);



// Generate plumes for each plane
    for (let i = 0; i < planes.length; i++) {
        if (random() < 0.5) { // Adjust to change plume generation probability
            plumes.push(new Plume(planes[i].x, planes[i].y));
        }
    }

    // Update and display each plume
    for (let i = plumes.length - 1; i >= 0; i--) {
        plumes[i].update();
        plumes[i].display();

        // Remove plumes that are done
        if (plumes[i].isDone()) {
            plumes.splice(i, 1);
        }
    }
for (let i = 0; i < clouds.length; i++) {
        clouds[i].move();
        clouds[i].display();
        }

for(let k = 2; k >= 0; k--) {
  planes[k].createPlane();

  if(k === 2) {
    planes[k].moveLeadingPlane();
  } else if(k === 1) {
    planes[k].moveFollowingPlane();
  }
     planes[0].x = windowWidth/2 + PlayerDrift;  // Adjust the horizontal offset of the player depending on player drift.
     planes[1].x = windowWidth/2 - 100 * -1;  // Following plane.
     planes[2].x = windowWidth/2 - 100 * -2; // Leading plane.
}

//The player drifts behind if the chord is too dissonant.
PlayerDrift += -0.0003 * consonance*t + 0.0001*t;// The game gets harder over time.
PlayerDrift += -4 * consonance + 2;// Difficulty at t === 0;
PlayerDrift = constrain(PlayerDrift, -windowWidth, 0)

  textSize(20);
  fill(255); // white color
  Score += (1 - constrain(consonance, 0, 1)) * deltaTime / 10;
        text("Score: " + Math.floor(Score), windowWidth/2, windowHeight - 100);
                text("High Score: " + highScore, windowWidth /2, windowHeight - 80);

  mappedConsonance = map(consonance, 0, 1, 1, 0);
  mappedConsonance = constrain(mappedConsonance, 0, 1);
        if (PlayerDrift < -windowWidth/2) {
            gameState = "gameover";
        }
    } else if (gameState === "gameover") {
    if (t > highScore) {
            highScore = Math.floor(Score);
            }
        targetAmp = 0;
        background(0);
        fill(255);
        textAlign(CENTER, CENTER);
        text("Game Over! Press any key to restart", width / 2, height / 2);
        text("Score: " + Math.floor(Score), width / 2, height / 2 + 100);
        text("High Score: " + highScore, width / 2, height / 2 + 200);
    }

    // Dynamically adjust the various audio parameters depending on consonance.
    mappedWindLevel = map(consonance, 1, 0, .7, .4);
    mappedWindFreq = constrain(map(consonance, 1, 0, 1000, 500),500,1000);
    mappedOscFreq = constrain(map(consonance, 0, 1, 1000, 50),500,1000);

    // Smoothly change the amplitude of all sounds for fading in and out at the start and end of the game.
    currentAmp +=  ((targetAmp - currentAmp) * AmpfadeSpeed);
    currentAmp = constrain(currentAmp,0,1);

    //Error handling and final adjustments.
    oscAmp = isFinite(currentAmp * mappedConsonance) ? currentAmp * (mappedConsonance * .07 + .3) : 0;
    windAmp = isFinite(currentAmp * mappedWindLevel) ? currentAmp * mappedWindLevel : 0;

    //Error handling and setting audio parameters.
    WindlowPass.freq(isFinite(mappedWindFreq) ? mappedWindFreq : 0);
    OscLowPass.freq(isFinite(mappedOscFreq) ? mappedOscFreq : 0);

    //Finally set all the remaining audio parameters.
    osc.amp(oscAmp);
    osc1.amp(oscAmp);
    osc2.amp(oscAmp);
    wind.amp(windAmp);
}





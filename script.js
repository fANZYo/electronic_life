"use strict"

function Vector(x, y){ // Used to describe a location in the world
	this.x = x;
	this.y = y;
}
Vector.prototype.plus = function(other){ // Allows us to move critters relatively
	return new Vector(this.x + other.x,  this.y + other.y);
};

function Grid(width, height){
	this.space = new Array(width * height); // Each index of space will be a square in the world
	this.width = width;
	this.height = height;
}
Grid.prototype.isInside = function(vector){
	return vector.x >= 0 && vector.x < this.width &&
			 vector.y >= 0 && vector.y < this.height;
};
Grid.prototype.get = function(vector){ // Takes a vector and return the corresponding element from the grid
	return this.space[vector.x + this.width * vector.y]; // x + (y * width): y * width represent the Y axis of the plan
};
Grid.prototype.set = function(vector, value){
	this.space[vector.x + this.width * vector.y] = value;
};
Grid.prototype.forEach = function(f, context){
	for(var y = 0; y < this.height; y++){
		for(var x = 0; x < this.width; x++){
			var value = this.space[x + y * this.width];
			if(value != null)
				f.call(context, value, new Vector(x, y));
		}
	}
};

var directions = { // Assign a relative position modifier to directions
	"n":  new Vector( 0, -1),
	"ne": new Vector( 1, -1),
	"e":  new Vector( 1,  0),
	"se": new Vector( 1,  1),
	"s":  new Vector( 0,  1),
	"sw": new Vector(-1,  1),
	"w":  new Vector(-1,  0),
	"nw": new Vector(-1, -1),
}

function randomElement(array){
	return array[Math.floor(Math.random() * array.length)];
}

var directionNames = "n ne e se s sw w nw".split(' ');

function elementFromChar(legend, ch){ // Legend is an object which keys are the character and value is a critter object
	if(ch == " ")
		return null;
	var element = new legend[ch](); // Dynamically creates a critter or wall object 
	element.originChar = ch; // Allows us to directly have access to each element's corresponding character
	return element;
}

function charFromElement(element){
	if(element == null)
		return " ";
	else
		return element.originChar;
}

function World(map, legend){
	var grid = new Grid(map[0].length, map.length); // Creating a local variable allows us to access the grid from inside the forEach callback bellow
	this.grid = grid; // Points this.grid to the grid object
	this.legend = legend;

	map.forEach(function(line, y){ // map being an array of lines, the index argument represents the y axis
		for(var x = 0; x < line.length; x++)
			grid.set(new Vector(x, y), elementFromChar(legend, line[x])); // This actually populates each of the grid's index with its corresponding world elements
	});
}
World.prototype.toString = function(){ // Simply concatenates each character of the grid to a string for printing
	var output = "";
	for(var y = 0; y < this.grid.height; y++){
		for(var x = 0; x < this.grid.width; x++){
			var element = this.grid.get(new Vector(x, y));
			output += charFromElement(element);
		}
		output += "\n";
	}
	return output;
};
/* The turn method seems terribly inefficient as is will loop through
 * the whole of the grid, including walls and empty spaces, and test
 * each element to know if they can act or not.
 * Walls and empty spaces can't move so testing these is a waste.
 * A more efficient way might be to keep a list of critters and loop
 * through this list rather than the grid.
 */
World.prototype.turn = function(){
	var acted = []; // Will hold a list of the critters that have acted and used their turn
	this.grid.forEach(function(critter, vector){ // For each of the elements of the grid ...
		if(critter.act && acted.indexOf(critter) == -1){ // ... Check if the critter can act && if he has already acted
			acted.push(critter);
			this.letAct(critter, vector);
		}
	}, this);
};
World.prototype.checkDestination = function(action, vector){ // Takes an action object and the current location of the critter
	if(directions.hasOwnProperty(action.direction)){ // Validates the direction property of the action object
		var dest = vector.plus(directions[action.direction]); // Gives vector.plus a relative position to the current position of the critter
		if(this.grid.isInside(dest)) // If the destination is inside the grid
			return dest; // Vector
	}
};
World.prototype.letAct = function(critter, vector){
	var action = critter.act(new View(this, vector));
	var handled = action &&
		action.type in actionTypes && // The world will have different kinds of critter so we test it's action type against the collection contained in actionTypes
		actionTypes[action.type].call(this, critter, vector, action); // Finnaly we call this action type and validate its return value (which is a Boolean)

	if(!handled){ // If the critter couldn't perform the action
		critter.energy -= 0.2; // It will stay in place and lose a slight amount of energy
		if(critter.energy <= 0)
			this.grid.set(vector, null); // Remove the critter if it's out of energy
	}
};

function View(world, vector){
	this.world = world;
	this.vector = vector;
}
View.prototype.look = function(dir){ // Takes a string direction returns the char found in that direction
	var target = this.vector.plus(directions[dir]);
	if(this.world.grid.isInside(target))
		return charFromElement(this.world.grid.get(target));
	else
		return "#";
};
View.prototype.findAll = function(ch){ // Returns an array of all the directions where ch can be found next to this.vector
	var found = [];
	for(var dir in directions)
		if(this.look(dir) == ch)
			found.push(dir);
	return found;
};
View.prototype.find = function(ch){ // Picks and returns a random direction out of findAll returned array
	var found = this.findAll(ch);
	if(found.length == 0) return null;
	return randomElement(found);
};

function dirPlus(dir, n){
	var index = directionNames.indexOf(dir); // Stores the position in the array of dir
	return directionNames[(index + n + 8) % 8]; // Contains the value to an octal number which corresponds to the number of directions available
}

var actionTypes = Object.create(null);

actionTypes.grow = function(critter){ // Plants grow and increase their energy through photosynthesis
	critter.energy += 0.5;
	return true;
};
actionTypes.move = function(critter, vector, action){
	var dest = this.checkDestination(action, vector);
	if(dest == null || // If dest is invalid
			critter.energy <= 1 || // Or the critter does not have enough energy
			this.grid.get(dest) != null) // Or the destination is not an empty square
		return false;
	critter.energy -= 1;
	this.grid.set(vector, null); // Remove the critter from its previous location
	this.grid.set(dest, critter); // Set the critter in his new location
	return true;
};
actionTypes.eat = function(critter, vector, action){
	var dest = this.checkDestination(action, vector);
	var atDest = dest != null && this.grid.get(dest); // dest is valid location && there is an element at dest (empty space would return null)
	if(!atDest || atDest.energy == null)
		return false;
	critter.energy += atDest.energy; // Transfer the food's energy to the critter
	this.grid.set(dest, null); // Removes the element that's been eaten
	return true;
};
actionTypes.reproduce = function(critter, vector, action){
	var baby = elementFromChar(this.legend, critter.originChar);
	var dest = this.checkDestination(action, vector);
	if(dest == null ||
			critter.energy <= 2 * baby.energy || // Critters need twice the baby's starting energy to reproduce
			this.grid.get(dest) != null) // There need to be empty space for the baby to enter the world
		return false
	critter.energy -= 2 * baby.energy;
	this.grid.set(dest, baby);
	return true;
};

function Wall(){}

function Plant(){
	this.energy = 3 + Math.random() * 4; // Give plants a starting energy between 3 and 7
}
Plant.prototype.act = function(view){
	// Create a new plant if energy is above 15
	if(this.energy > 15){
		var space = view.find(" ");
		if(space)
			return {type: "reproduce", direction: space};
	}
	if(this.energy < 20) // Only grow to 19 points. This avoids reproducing frenzy if the plant couldn't reproduce for a while and stored alot of energy 
		return {type: "grow"};
};

function PlantEater(){
	this.energy = 30;
	this.direction = randomElement(directionNames);
}
PlantEater.prototype.act = function(view){
	var space = view.find(" ");
	if(this.energy > 90 && space) // If the critter can reproduce then it does
		return {type: "reproduce", direction: space};
	var plants = view.findAll("*");
	if(plants.length > 1) // If not and if there is a plant around and it's not gonna wipe out the local vegetation eat it
		return {type: "eat", direction: randomElement(plants)};
	if(view.look(this.direction) != " " && space) // If not and if there is space then update direction
		this.direction = space;
	return {type: "move", direction: this.direction};
};

function Predator(){
	this.energy = 100;
	this.direction = randomElement(directionNames);
	// Used to track the amount of prey seen per turn in the last six turns
	this.preySeen = [];
}
Predator.prototype.act = function(view){
	// Average number of prey seen per turn
	var seenPerTurn = this.preySeen.reduce(function(a, b){
		return a + b;
	}, 0) / this.preySeen.length;

	var prey = view.findAll("O");
	this.preySeen.push(prey.length);
	// Drop the first element from the array when it is longer than 6
	if(this.preySeen.length > 6)
		this.preySeen.shift();

	if(prey.length && seenPerTurn > 0.25) // Only eat if the predator saw more than 1/4 prey per turn
		return {type: "eat", direction: randomElement(prey)};

	var space = view.find(" ");
	if(this.energy > 400 && space)
		return {type: "reproduce", direction: space};
	if(view.look(this.direction) != " " && space)
		this.direction = space;
	return {type: "move", direction: this.direction};
};

//// Run program
function init() {
	var plan = ["####################################################",
					"#                 ####         ****              ###",
					"#   *  &  ##                 ########       OO    ##",
					"#   *    ##        O O                 ****       *#",
					"#       ##*                        ##########     *#",
					"#      ##***  *         ****                     **#",
					"#* **  #  *  ***      #########                  **#",
					"#* **  #      *               #   *              **#",
					"#     ##              #   O   #  ***          ######",
					"#*            &       #       #   *        O  #    #",
					"#*                    #  ######                 ** #",
					"###          ****          ***                  ** #",
					"#       O                        &         O       #",
					"#   *     ##  ##  ##  ##               ###      *  #",
					"#   **         #              *       #####  O     #",
					"##  **  O   O  #  #    ***  ***        ###      ** #",
					"###               #   *****                    ****#",
					"####################################################"]

	var world = new World(plan, {"#": Wall,
										  "O": PlantEater,
										  "&": Predator,
										  "*": Plant}); // This will trigger the world to be created by populating the grid

	(function loop(){
		world.turn();
		console.log(world.toString());
		setTimeout(loop, 1000);
	})();
}

init();

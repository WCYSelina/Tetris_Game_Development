/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */

import "./style.css";
import { fromEvent, interval, merge, Observable} from "rxjs";
import { map, filter, scan } from "rxjs/operators";
import { Block, Key, State, Viewport, Constants, KeyPressValue, CBlock, EventType, RandomNumber } from "./types";
import { initialState, tick, createBlock, create22square, tBlock, straightBlock, skewSBlock, createGreyBlock, jBlock, lBlock, skewZBlock} from "./state";
/** Rendering (side effects) */

/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
const show = (elem: SVGGraphicsElement) => {
  elem.setAttribute("visibility", "visible");
  elem.parentNode!.appendChild(elem);
};

/**
 * Hides a SVG element on the canvas.
 * @param elem SVG element to hide
 */
const hide = (elem: SVGGraphicsElement) =>
  elem.setAttribute("visibility", "hidden");

/**
 * Creates an SVG element with the given properties.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
 * element names and properties.
 *
 * @param namespace Namespace of the SVG element
 * @param name SVGElement name
 * @param props Properties to set on the SVG element
 * @returns SVG element
 */
const createSvgElement = (
  namespace: string | null,
  name: string,
  props: Record<string, string> = {}
) => {
  const elem = document.createElementNS(namespace, name) as SVGElement;
  Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
  return elem;
};

/**
 * 
 * @param currentBlocks The blocks that has not been placed yet and can be controlled by the player (except for bedrock)
 * @param operator The event that the player has triggered, for example, S key is pressed
 * @returns The currentBlocks with x-coor changed
 */
const moveBlockX = (
  currentBlocks: Block[],
  operator: KeyPressValue
): Block[] => {
  //pre move the blocks in a one big block
  const altCurrentBlocks = currentBlocks.map((currentBlock) => {
    //check which key has been inputted, and change the x value
    const findX = (operator: string | null) => {
      if (operator === "+X") {
        return currentBlock.x + CBlock.WIDTH;
      } else {
        return currentBlock.x - CBlock.WIDTH;
      }
    };
    //only change the x-coor when the key left and right is pressed
    const x =
      (operator.direction === "+X" || operator.direction === "-X") && currentBlock.type !== "bedrock" //the x-coor's bedrock can't be changed
        ? findX(operator.direction)
        : currentBlock.x;
    
    // return the blocks but with the x property changed
    const altBlock = createBlock(currentBlock, {
      x: x,
    });

    return altBlock;
  });
  return altCurrentBlocks;
};

/**
 * 
 * @param blocks The blocks that has not been placed yet and can be controlled by the player (except for bedrock)
 * @param s State
 * @returns A boolean indicate if it is a valid move of y-coor
 */
const checkYValid = (blocks: Block[], s: State): boolean => {
  const minYs = blocks.map((block) => {
    const reachBoundaryY = () => {
      //check if the block touches boundary
      const BOTTOM_BOUNDARY = Viewport.CANVAS_HEIGHT - CBlock.HEIGHT;
      return block.y > BOTTOM_BOUNDARY ? false : true;
    };
    const newBlocks = s.blocks.map((eBlock) => {
      // we want to check
      // 1) the blocks that are not in the same big block
      // 2) the blocks that is not the same block
      // 3) the bedrocks
      if (eBlock.id !== block.id && (eBlock.parentId !== block.parentId || eBlock.parentId === "null" && block.parentId === "null")) {
        //if the blocks has same x-coor and y-coor, it does not have valid move
        if (block.x === eBlock.x && block.y === eBlock.y) {
            return false;
        }
        //check if it touches boundary
        return reachBoundaryY();
      }
      return reachBoundaryY();
    });
    //find if there is any not valid move
    return !newBlocks.some(block => !block);
  });
  //if one block in a big block has invalid move, all blocks have invalid moves
  return !minYs.some(minY => !minY);
};

/**
 * 
 * @param s State
 * @param blocks The blocks that has not been placed yet and can be controlled by the player (except for bedrock)
 * @returns A boolean indicate if it is a valid move of x-coor
 */
const checkLeftRight = (s: State, blocks: Block[]): boolean => {
  const leftRightFlags = blocks.map((block) => {
    const reachBoundaryX = () => {
      //check if the block touches boundary
      const LEFT_BOUNDARY = 0;
      const RIGHT_BOUNDARY = Viewport.CANVAS_WIDTH - CBlock.WIDTH;
      return block.x < LEFT_BOUNDARY || block.x > RIGHT_BOUNDARY
        ? false
        : true;
    };
    const leftRightFlag = s.blocks.map((eBlock) => {
      // we only want to check the blocks that are not in the same big block
      if (eBlock.id !== block.id && eBlock.parentId !== block.parentId) {
        //if the blocks has same x-coor and y-coor
        if (block.x === eBlock.x && eBlock.y === block.y) {
          //it is not able to move, hence return false
          return false;
        }
        // check boundary
        return reachBoundaryX();
      }
      return reachBoundaryX();
    });
    //find if there is any not valid move
    return !leftRightFlag.some(leftRightFlag => !leftRightFlag);
  });
  //if one block in a big block has invalid move, all blocks have invalid moves
  const result = !leftRightFlags.some(leftRightFlag => !leftRightFlag)
  return result;
};

/**
 * 
 * @param s State
 * @param currentBlocks The blocks that has not been placed yet and can be controlled by the player (except for bedrock)
 * @param moveCurrentBlock The currentBlocks that has been pre-move its x
 * @returns Updated x and y of the state
 */
const stateMoveHandling = (
  s: State,
  currentBlocks: Block[],
  moveCurrentBlock: Block[]
) => {
  //if y is a valid move, we just update the game state of the blocks property with the blocks that passed into this function
  //if it cannot be moved, we used back the blocks that at the start of this tick, but just change the placed property to true,
  //so that the blocks are finalised
  const stateReturn = (validMove: boolean, blocks: Block[]) => {
    if (validMove) {
      return tick(s, { blocks: [...previousBlock, ...blocks] });
    } else {
      const placedAllBlock = blocks.map((block,index) => {
        return createBlock(block, {placed: true, y: currentBlocks[index].y});
      });
      s = tick(s, { blocks: [...previousBlock, ...placedAllBlock], score: s.score + Constants.DROP_BLOCK_SCORE});
      const placedBlock = s.blocks.filter((block) => block.placed);
      // every time we placed some blocks, we check if it has reached the top canvas, if so the game is ended
      const ifGameEnds = checkGameEnds(placedBlock);
      return ifGameEnds ? tick(s, { gameEnd: true }) : s;
    }
  }

  const previousBlock = s.blocks.filter((block) => block.placed);
   //if x-coor is not valid
   if (!checkLeftRight(s, moveCurrentBlock)) {
    //we copy the pre-moved blocks and change their x-coor to original coor
    const newMovedCurrentBlock = moveCurrentBlock.map(
      (block, index) => {
        return createBlock(block, { x: currentBlocks[index].x, y: currentBlocks[index].y + CBlock.HEIGHT});
      }
    );
    //then check if y-coor can be updated successfully
    //and update the state
    const validMove = checkYValid(newMovedCurrentBlock, s);
    return stateReturn(validMove,newMovedCurrentBlock)
  } else {
    //this means that x-coor is valid, we then check if y is valid
    const addYCurrentBlock = moveCurrentBlock.map(block => {
      return createBlock(block,{y: block.y + CBlock.HEIGHT})
    })
    const validMove = checkYValid(addYCurrentBlock, s);
    return stateReturn(validMove, addYCurrentBlock)
  } 
};

/**
 * 
 * @param s State
 * @returns Construct the existance of the blocks in the canvas into a 2D array, then update the state with the lastest's
 */
const addBlockRowForClear = (s: State) => {
  const placeBlocks = s.blocks.filter((block) => block.placed);
  const newArray = placeBlocks.reduce((allRows, block) => {
    if (
      //bedrocks is not allowed to be cleared
      block.parentId !== "null" &&
      //find if the position has been updated to true that indicate that position has a block
      allRows[block.y / CBlock.HEIGHT][block.x / CBlock.WIDTH] === false
    ) {
      //if the position does not exists the block, update the position that say it has block on that position now
      const row = allRows.map((row, cIndex) => {
        const column = row.map((column, rIndex) => {
          // find the position with the block's y-coor and x-coor
          if (
            cIndex === block.y / CBlock.HEIGHT &&
            rIndex === block.x / CBlock.WIDTH
          ) {
            return true;//update this position to true
          }
          return allRows[cIndex][rIndex]; 
        });
        return column;
      });
      return row;
    }
    return allRows;
  }, s.allRows);
  return tick(s, { allRows: newArray });
};

/**
 * 
 * @param allRows A 2D array boolean represents the current canvas state 
 * @returns 
 */
const checkFullRows = (allRows: ReadonlyArray<ReadonlyArray<boolean>>) => {
  // this searches if there exists a row has all true value
  // for example, allRows = [[false,true,true],[true,true,true],[false,false,false]]
  // row.every((element) => element) will give [false,true,true]
  // [false,true,true].some(row => row) will give true
  const rowToClear = allRows.some((row) => row.every((element) => element));
  if (rowToClear) { // if there exists a row fully filled with the block
    // find which row it is
    const allRowsIndex = allRows.map((row, index) => {
      if (row.every((el) => el)) {
        return index;
      }
      return null;
    });
    return allRowsIndex.filter((index) => index);
  }
  return null;
};

/**
 * 
 * @param s State
 * @param indexRow The rows that has been cleared
 * @returns Updated state with the full row been cleared
 */
const clearRow = (s: State, indexRow: (number | null)[] | null) => {
  //if there is no any row is cleared, return the s that just passed in
  //else we clear the row, and shift the blocks
  if (indexRow && indexRow.length) {
    const state = indexRow.reduce((accS, row) => {
      if (row) {
        //find all the blocks that is above the cleared row
        const clearBlocks = accS.blocks.filter(
          (block) =>
            block.y < row * CBlock.HEIGHT || block.y > row * CBlock.HEIGHT
        );
        //shift all the blocks that is above the cleared row down
        const shiftedBlocks = shiftBlockAfterClear(clearBlocks, row);
        //update the status of the game state
        // 1) shiftedBlocks
        // 2) refresh the allRows that represent the canvas status
        // 3) add the score
        if (shiftedBlocks) {
          return tick(s, {
            blocks: shiftedBlocks,
            allRows: new Array(Constants.GRID_HEIGHT)
              .fill(false)
              .map(() => new Array(Constants.GRID_WIDTH).fill(false)),
            score: s.score + Constants.CLEAR_ROW_SCORE,
          });
        } else {
          return tick(s, {
            blocks: clearBlocks,
            allRows: new Array(Constants.GRID_HEIGHT)
              .fill(false)
              .map(() => new Array(Constants.GRID_WIDTH).fill(false)),
            score: s.score + Constants.CLEAR_ROW_SCORE,
          });
        }
      }
      return accS;
    }, s);
    return state;
  }
  return s;
};

/**
 * 
 * @param blocks All the blocks that is above the cleared row
 * @param indexRow Cleared Row
 * @returns 
 */
const shiftBlockAfterClear = (blocks: Block[], indexRow: number | null) => {
  if (indexRow) {
    const newBlocks = blocks.map((block) => {
      if (indexRow && block.y < indexRow * CBlock.HEIGHT) {
        return createBlock(block, { y: block.y + CBlock.HEIGHT });
      }
      return block;
    });
    return newBlocks;
  }
  return null;
};

/**
 * 
 * @param blocks all the placed block in the canvas 
 * @returns a boolean indicate whether if the game has ended
 */
const checkGameEnds = (blocks: Block[]) => {
  if (blocks.length) {
    //check the game if ended simply just checking if any block has their x-coor 0
    const flags = blocks.map((block) => {
      return block.y === 0 ? true : false
    });
    //find it true exists, if found means ended
    return flags.some(flag => flag);
  }
  //game is not ended
  return false;
};

/**
 * 
 * @param blocks The blocks that has not been placed yet and can be controlled by the player (except for bedrock)
 * @returns The pre-rotated blocks
 */
const preRotate = (blocks: Block[]) => {
  const pivot = blocks[0]; //take the first point as the pivot of rotation
  if(typeof pivot !== "undefined" && pivot.type === "square"){ // dont rotate the block is it is undefined or a square blocks
    return blocks
  }
  const preRotatedBlocks = blocks.map((block) => {
    if (block.id == pivot.id) {  //the pivot will always stays in the same position
      return block;
    }

    const onLeftPivot = block.x < pivot.x; //when the block is on the left of the pivot
    const onRightPivot = block.x > pivot.x; //when the block is on the right of the pivot
    const onTopPivot = block.y < pivot.y; //when the block is on the top of the pivot
    const onBottomPivot = block.y > pivot.y; //when the block is on the bottom of the pivot

    const preRotateBlock = (block: Block, x: number, y: number) => { //just some update of the position
      return createBlock(block, { x: block.x + x, y: block.y + y });
    };

    //this counts the distance between the block and the pivot 
    const distanceX = Math.abs(pivot.x - block.x) / CBlock.WIDTH; 
    const distanceY = Math.abs(pivot.y - block.y) / CBlock.HEIGHT;

    // to calculate how many operation does the block need to rotate into correct position
    const multiplier = distanceX > distanceY ? distanceX : distanceY;

    const blockWidth = CBlock.WIDTH * multiplier;
    const blockHeight = CBlock.HEIGHT * multiplier;

    //case when the block is on the left of the pivot only
    if (onLeftPivot && !onRightPivot && !onTopPivot && !onBottomPivot) {
      // +x, -y
      return preRotateBlock(block, blockWidth, -blockHeight);

      //case when the block is on the right of the pivot only
    } else if (!onLeftPivot && onRightPivot && !onTopPivot && !onBottomPivot) {
      // -x, +y
      return preRotateBlock(block, -blockWidth, blockHeight);

      //case when the block is on the top of the pivot only
    } else if (!onLeftPivot && !onRightPivot && onTopPivot && !onBottomPivot) {
      // +x, +y
      return preRotateBlock(block, blockWidth, blockHeight);

      //case when the block is on the bottom of the pivot only
    } else if (!onLeftPivot && !onRightPivot && !onTopPivot && onBottomPivot) {
      // -x, -y
      return preRotateBlock(block, -blockWidth, -blockHeight);

      // case when the block is on the left at the same time on the top of the pivot
    } else if (onLeftPivot && !onRightPivot && onTopPivot && !onBottomPivot) {
      // +x, -y then +x, +y
      const newBlock = preRotateBlock(block, CBlock.WIDTH, -CBlock.HEIGHT);
      return preRotateBlock(newBlock, CBlock.WIDTH, CBlock.HEIGHT);

      // case when the block is on the left at the same time on the bottom of the pivot
    } else if (onLeftPivot && !onRightPivot && !onTopPivot && onBottomPivot) {
      // +x, -y then -x, -y
      const newBlock = preRotateBlock(block, CBlock.WIDTH, -CBlock.HEIGHT);
      return preRotateBlock(newBlock, -CBlock.WIDTH, -CBlock.HEIGHT);

      // case when the block is on the right at the same time on the top of the pivot
    } else if (!onLeftPivot && onRightPivot && onTopPivot && !onBottomPivot) {
      // -x, +y then +x, +y
      const newBlock = preRotateBlock(block, -CBlock.WIDTH, CBlock.HEIGHT);
      return preRotateBlock(newBlock, CBlock.WIDTH, CBlock.HEIGHT);

      // case when the block is on the right at the same time on the bottom of the pivot
    } else if (!onLeftPivot && onRightPivot && !onTopPivot && onBottomPivot) {
      // -x, +y then -x, -y
      const newBlock = preRotateBlock(block, -CBlock.WIDTH, CBlock.HEIGHT);
      return preRotateBlock(newBlock, -CBlock.WIDTH, -CBlock.HEIGHT);
    }
    return block;
  });
  return preRotatedBlocks;
};

/**
 * 
 * @param s State
 * @param randomIndex the random number that has been generated
 * @returns State with the nextShape updated
 */
const spawnRandomBlocks = (s: State, randomIndex: number) => {
  const creationBlocks = [create22square, tBlock, skewSBlock, straightBlock, jBlock, lBlock, skewZBlock];
  // handle the situation when randomIndex === -1, the explaination will be at the RNG.scale()
  if(randomIndex === -1){
    return s
  }
  // create the blocks
  const blocks = creationBlocks[randomIndex](s);

  // this block will be the next block to generate after the current block is placed
  return tick(s, { nextShape: blocks });
};

/**
 * 
 * @param start A number indicate the start
 * @param end A number indicate the end
 * @returns An array contains the number from start to the end
 */
const createRange = (start: number, end: number): number[] => {
  // base case
  if (start > end) {
    return [];
  }
  // recursive
  return [start, ...createRange(start + 1, end)];
};

/**
 * 
 * @param s State
 * @returns State with the level updated
 */
const levelUp = (s: State) => {
  // detect if the current number of grey blocks matches the current level 
  if (s.greyBlockCount !== (s.level - 1) * Constants.GRID_WIDTH) {

    //generate a sequence of row(based on the current level) and column number (the grid_with)
    const rowGreyBlock = createRange(0, s.level - 1);
    const columnGreyBlock = createRange(0, Constants.GRID_WIDTH);

    //fill every x(columnGreyBlock) and y(rowGreyBlock) with grey blocks
    const greyBlocks = rowGreyBlock.map((row) => {
      const greyBlock = columnGreyBlock.map((column) => {
        const greyBlock = createGreyBlock(
          s,
          column * CBlock.WIDTH,
          (Constants.GRID_HEIGHT - row) * CBlock.HEIGHT
        );
        return greyBlock;
      });
      return greyBlock;
    });

    // update the blocks in the state
    if (greyBlocks.length) {
      const state = greyBlocks.reduce((acc, blocks) => {
        return blocks.reduce((acc, block) => {
          return tick(acc, {
            blocks: [...acc.blocks, block],
            greyBlockCount: acc.greyBlockCount + 1,
          });
        }, acc);
      }, s);
      return state
    }
  }
  return s
}

/**
 * 
 * @param s State
 * @returns The State where the new created block has been added into state
 */
const currentBlockCreation = (s: State) => {
  //if the current game state does not have any blocks that is not placed, we create some new ones
  //check if it is time to drop the bedrock
  if(s.timeDropBedRock === 0){
    const bedRock: Block = {
      id: -(s.blockCount + 1) - 1,
      parentId:"null",
      x: Math.floor(Math.random() * Constants.GRID_WIDTH) * CBlock.WIDTH,
      y: 0,
      width: CBlock.WIDTH,
      height: CBlock.HEIGHT,
      placed: false,
      style: "fill: black",
      class: "bedrock",
      type: "bedrock"
    }
    return tick(s, {blocks: [...s.blocks, bedRock], timeDropBedRock: Constants.DROP_BED_ROCK, blockCount: s.blockCount + 1})
  }
  else{
    // dereament the timeDropBedRock
    s = tick(s, {timeDropBedRock: s.timeDropBedRock - 1})
  }
  // get the next block and spawn it into the canvas
  // set the nextShape to null, so that it can generate the next block
  if (s.nextShape) {
    return tick(s, {
      blocks: [...s.blocks, ...s.nextShape],
      blockCount: s.blockCount + s.nextShape.length,
      bigBlockCount: s.bigBlockCount + 1,
      nextShape: null,
    });
  }
  return s
}

/**
 * 
 * @param s State
 * @param value The event that the player has triggered, for example, S key is pressed
 * @returns The state that saved the rotated blocks
 */
const rotationHandling = (s: State, value: string) => {
  const newPreviousBlock = s.blocks.filter((block) => block.placed);
  const newCurrentBlock = s.blocks.filter((block) => !block.placed);
  //pre-rotate the blocks
  if (value === "W") {
    const rotatedCurrentBlocks = preRotate(newCurrentBlock);

    // did not rotate success
    if (!rotatedCurrentBlocks.length) {
      s = tick(s, {
        blocks: [...newPreviousBlock, ...newCurrentBlock],
      });
      //successfully rotated
    } else {
      if (
        checkLeftRight(s, rotatedCurrentBlocks) &&
        checkYValid(rotatedCurrentBlocks, s)
      ) {
        s = tick(s, {
          blocks: [...newPreviousBlock, ...rotatedCurrentBlocks],
        });
      }
    }
  }
  return s
}

abstract class RNG {
  // LCG using GCC's constants
  private static m = 0x80000000; // 2**31
  private static a = 1103515245;
  private static c = 12345;

  /**
   * Call `hash` repeatedly to generate the sequence of hashes.
   * @param seed
   * @returns a hash of the seed
   */
  public static hash = (seed: number) => (RNG.a * seed + RNG.c) % RNG.m;

  /**
   * Takes hash value and scales it to the range [-1, 1]
   */
  public static scale = (hash: number) => {
    // The reason to Constants.NUM_BLOCK_TYPES + 1 instead of just Constants.NUM_BLOCK_TYPES is because
    // by observation, this generate random number will not generate 0
    // hence extra 1 is added, so that it can generate the block that is in index 0
    const scaled = (hash / RNG.m) * Constants.NUM_BLOCK_TYPES + 1; // Scale to [0, 8]
    return Math.floor(scaled); // Convert to [0, 7]};
  }
}

function createRngStreamFromSource<T>(source$: Observable<T>) {
  return function createRngStream(
    seed: number = 0
  ): Observable<number> {
    const randomNumberStream = source$.pipe(
      scan((previousSeed) => RNG.hash(previousSeed), seed),
      map((hash) => RNG.scale(hash)),
    );
    return randomNumberStream;
  };
}

/**
 * This is the function called on page load. Your main game loop
 * should be called here.
 */
export function main() {
  // Canvas elements
  const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
    HTMLElement;
  const preview = document.querySelector("#svgPreview") as SVGGraphicsElement &
    HTMLElement;
  const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
    HTMLElement;
  const instantReplay = document.querySelector("#instantReplay") as HTMLElement;
  const container = document.querySelector("#main") as HTMLElement;

  svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
  svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);
  preview.setAttribute("height", `${Viewport.PREVIEW_HEIGHT}`);
  preview.setAttribute("width", `${Viewport.PREVIEW_WIDTH}`);

  // Text fields
  const levelText = document.querySelector("#levelText") as HTMLElement;
  const scoreText = document.querySelector("#scoreText") as HTMLElement;
  const highScoreText = document.querySelector("#highScoreText") as HTMLElement;

  /** User input */

  const key$ = fromEvent<KeyboardEvent>(document, "keypress");

  const fromKey = (keyCode: Key, x: KeyPressValue) =>
    key$.pipe(
      filter(({ code }) => code === keyCode),
      map(() => x as KeyPressValue)
    );

  const left$ = fromKey("KeyA", {direction: "-X"});
  const right$ = fromKey("KeyD", {direction: "+X"});
  const down$ = fromKey("KeyS", {direction: "+Y"});
  const rotate$ = fromKey("KeyW", {direction: "W"});
  const instantRestartClick$ = fromEvent<MouseEvent>(instantReplay, "click").pipe(
    map(() => ({clickEvent: "restartClick"} )))

  /** Observables */

  /** Determines the rate of time steps */
  const tick$ = interval(Constants.TICK_RATE_MS);

  //generate random number
  const randomNumber$ = createRngStreamFromSource(interval(7))(3).pipe(
    map((value) => {return {randomValue: value} as RandomNumber} ))
  /**
   * Renders the current state to the canvas.
   *
   * In MVC terms, this updates the View using the Model.
   *
   * @param s Current state
   */
  const render = (s: State) => {
    // Add blocks to the main grid canvas
    // reset the svg before adding any element
    levelText.textContent = `${s.level}`
    scoreText.textContent = `${s.score}`
    highScoreText.textContent = `${s.highScore}`

    //take all the element with class: .block/.bedrock
    const blocks = svg.querySelectorAll(".block");
    const bedRocks = svg.querySelectorAll(".bedrock")

    // before rendering the webpage, we clear everything in advance
    bedRocks.forEach((block) => {
      svg.removeChild(block);
    });
    blocks.forEach((block) => {
      svg.removeChild(block);
    });
    s.blocks.forEach((block) => {
      //render each block based on its props
      if (block) {
        const cube = createSvgElement(svg.namespaceURI, "rect", {
          id: `${block.id}`,
          parentId: `${block.parentId}`,
          x: `${block.x}`,
          y: `${block.y}`,
          width: `${block.width}`,
          height: `${block.height}`,
          placed: `${block.parentId}`,
          style: `${block.style}`,
          class: `${block.class}`,
        });
        svg.appendChild(cube);
      }
    });
    const previewBox = preview.querySelectorAll(".block");
    previewBox.forEach((block) => {
      preview.removeChild(block);
    });
    if (s.nextShape) {
      s.nextShape.forEach((block) => {
        const cube = createSvgElement(svg.namespaceURI, "rect", {
          id: `${block.id}`,
          parentId: `${block.parentId}`,
          x: `${block.x - CBlock.WIDTH}`,
          y: `${block.y + CBlock.HEIGHT}`,
          width: `${block.width}`,
          height: `${block.height}`,
          placed: `${block.parentId}`,
          style: `${block.style}`,
          class: "block",
        });
        preview.appendChild(cube);
      });
    }
  };

  //in order to merge tick with the input keyboard stream, we need to map the same properties as the input keybord stream
  const tickWithX$ = tick$.pipe(
    map(() => {return {direction:  "NULL"} as KeyPressValue}));

  const source$ = merge(
    tickWithX$,
    left$,
    right$,
    down$,
    rotate$,
    instantRestartClick$,
    randomNumber$
  )
  const rngStream = createRngStreamFromSource(source$);
  source$.pipe(
    scan<EventType, State>((s: State, value: EventType) => {
      //determine the which event occured
      //triggered when restat is clicked
      if (value && "clickEvent" in value && value.clickEvent === "restartClick") {
        if(s.score > s.highScore){ //update the highscore
          return tick(initialState, {highScore: s.score}); // Reset state on mouse click
        }
        return initialState
      }
      else if(value && "randomValue" in value && value.randomValue){
        if (!s.nextShape) { //spawn the blocks by using random number
          return spawnRandomBlocks(s,value.randomValue - 1)
        }
        return s
      }
      //triggered when keyboard is key in
      else if(value && "direction" in value && value.direction){
        //update level
        if(Math.floor(s.score/Constants.LEVEL_UP_SCORE) + 1 <= Constants.MAX_LEVEL){
          s = tick(s, {level: Math.floor(s.score/Constants.LEVEL_UP_SCORE) + 1})
        }
        //produce grey block if level up
        s = levelUp(s)
        if (!s.gameEnd) {
          //take out the block that has not been placed yet (the player still can move these blocks)
          const currentBlocks = s.blocks.filter((block) => !block.placed);
          if(!currentBlocks.length){ //if no current block, create one
            return currentBlockCreation(s)
          }
          
          //pre-move the blocks
          const moveCurrentBlock = moveBlockX(currentBlocks, value);
          //update the blocks
          s = stateMoveHandling(s, currentBlocks, moveCurrentBlock);
          //rotate the blocks
          s = rotationHandling(s, value.direction)
          s = addBlockRowForClear(s);
          const rowToClear = checkFullRows(s.allRows);
          s = clearRow(s, rowToClear);
        }
        return s;
      }
      return s;
    }, initialState)
  )
    .subscribe((s: State) => {
      render(s);
      if (s.gameEnd) {
        show(gameover);
      } else {
        hide(gameover);
      }
    });
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}

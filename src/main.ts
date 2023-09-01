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
import { fromEvent, interval, merge } from "rxjs";
import { map, filter, scan } from "rxjs/operators";
import { Block, Key, State, Viewport, Constants, KeyPressValue, Rows, CBlock, MouseClick, EventType } from "./types";
import { initialState, tick, createBlock, create22square, tBlock, straightBlock, skewBlock, createGreyBlock } from "./state";
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
      (operator === "+X" || operator === "-X") && currentBlock.type !== "bedrock"
        ? findX(operator)
        : currentBlock.x;
    const altBlock = createBlock(currentBlock, {
      x: x,
    });

    return altBlock;
  });
  return altCurrentBlocks;
};

const checkYValid = (blocks: Block[], s: State): boolean => {
  const minYs = blocks.map((block) => {
    const reachBoundaryY = () => {
      //check if the block touches boundary
      const BOTTOM_BOUNDARY = Viewport.CANVAS_HEIGHT - CBlock.HEIGHT;
      return block.y > BOTTOM_BOUNDARY ? false : true;
    };
    const newBlocks = s.blocks.map((eBlock) => {
      if (eBlock.id !== block.id && (eBlock.parentId !== block.parentId || eBlock.parentId === "null" && block.parentId === "null")) {
        // we only want to check the blocks that are not in the big block
        //if the blocks has same x-coor
        if (block.x === eBlock.x && block.y === eBlock.y) {
            return false;
          //and if current block's y-coor is within aathe range of other block
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
      // we only want to check the blocks that are not in the big block
      if (eBlock.id !== block.id && eBlock.parentId !== block.parentId) {
        //if the blocks has same x-coor
        if (block.x === eBlock.x) {
          //and if current block's y-coor is within the range of other block
          // if (block.y > findTopEdgePos(eBlock) && block.y <= eBlock.y ) {
            if(eBlock.y === block.y){
            //it is not able to move, hence return false
            return false;
          }
        }
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

const stateMoveHandling = (
  s: State,
  currentBlocks: Block[],
  moveCurrentBlock: Block[]
) => {
  //if y is a valid move, we just update the game state of the blocks property with the blocks that passed into this function
  //if it cant be moved, we used back the blocks that at the start of this tick, but just change the placed property to true,
  //so that the blocks are finalised
  const stateReturn = (validMove: boolean, blocks: Block[]) => {
    if (validMove) {
      return tick(s, { blocks: [...previousBlock, ...blocks] });
    } else {
      const placedAllBlock = currentBlocks.map((block) => {
        return createBlock(block, { placed: true });
      });
      s = tick(s, { blocks: [...previousBlock, ...placedAllBlock], score: s.score + Constants.DROP_BLOCK_SCORE});
      const placedBlock = s.blocks.filter((block) => block.placed);
      const ifGameEnds = checkGameEnds(placedBlock);
      return ifGameEnds ? tick(s, { gameEnd: true }) : s;
    }
  }

  const previousBlock = s.blocks.filter((block) => block.placed);
   //if it cant be updated successfully
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
    //this means that x-coor is updated successfully
    const addYCurrentBlock = moveCurrentBlock.map(block => {
      return createBlock(block,{y: block.y + CBlock.HEIGHT})
    })
    const validMove = checkYValid(addYCurrentBlock, s);
    return stateReturn(validMove, addYCurrentBlock)
  } 
};

const addBlockRowForClear = (s: State) => {
  const placeBlocks = s.blocks.filter((block) => block.placed);
  const newArray = placeBlocks.reduce((allRows, block) => {
    if (
      block.parentId !== "null" &&
      allRows[block.y / CBlock.HEIGHT][block.x / CBlock.WIDTH] === false
    ) {
      const row = allRows.map((row, cIndex) => {
        const column = row.map((column, rIndex) => {
          if (
            cIndex === block.y / CBlock.HEIGHT &&
            rIndex === block.x / CBlock.WIDTH
          ) {
            return true;
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

const checkFullRows = (allRows: ReadonlyArray<ReadonlyArray<boolean>>) => {
  const rowToClear = allRows.some((row) => row.every((element) => element));
  if (rowToClear) {
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

const clearRow = (s: State, indexRow: (number | null)[] | null) => {
  if (indexRow && indexRow.length) {
    const state = indexRow.reduce((accS, row) => {
      if (row) {
        const clearBlocks = accS.blocks.filter(
          (block) =>
            block.y < row * CBlock.HEIGHT || block.y > row * CBlock.HEIGHT
        );
        const shiftedBlocks = shiftBlockAfterClear(clearBlocks, row);
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

const checkGameEnds = (blocks: Block[]) => {
  if (blocks.length) {
    const flags = blocks.map((block) => {
      return block.y === 0 ? true : false
    });
    return flags.some(flag => flag);
  }
  return false;
};

const preRotate = (blocks: Block[]) => {
  const pivot = blocks[0]; //take the first point as the pivot of rotation
  if(typeof pivot !== "undefined" && pivot.type === "square"){
    return blocks
  }
  const preRotatedBlocks = blocks.map((block) => {
    if (block.id == pivot.id) {
      return block;
    }

    const onLeftPivot = block.x < pivot.x;
    const onRightPivot = block.x > pivot.x;
    const onTopPivot = block.y < pivot.y;
    const onBottomPivot = block.y > pivot.y;

    const preRotateBlock = (block: Block, x: number, y: number) => {
      return createBlock(block, { x: block.x + x, y: block.y + y });
    };
    const distanceX = Math.abs(pivot.x - block.x) / CBlock.WIDTH;
    const distanceY = Math.abs(pivot.y - block.y) / CBlock.HEIGHT;

    const multiplier = distanceX > distanceY ? distanceX : distanceY;

    const blockWidth = CBlock.WIDTH * multiplier;
    const blockHeight = CBlock.HEIGHT * multiplier;

    if (onLeftPivot && !onRightPivot && !onTopPivot && !onBottomPivot) {
      return preRotateBlock(block, blockWidth, -blockHeight);
    } else if (!onLeftPivot && onRightPivot && !onTopPivot && !onBottomPivot) {
      return preRotateBlock(block, -blockWidth, blockHeight);
    } else if (!onLeftPivot && !onRightPivot && onTopPivot && !onBottomPivot) {
      return preRotateBlock(block, blockWidth, blockHeight);
    } else if (!onLeftPivot && !onRightPivot && !onTopPivot && onBottomPivot) {
      return preRotateBlock(block, -blockWidth, -blockHeight);
    } else if (onLeftPivot && !onRightPivot && onTopPivot && !onBottomPivot) {
      const newBlock = preRotateBlock(block, CBlock.WIDTH, -CBlock.HEIGHT);
      return preRotateBlock(newBlock, CBlock.WIDTH, CBlock.HEIGHT);
    } else if (onLeftPivot && !onRightPivot && !onTopPivot && onBottomPivot) {
      const newBlock = preRotateBlock(block, CBlock.WIDTH, -CBlock.HEIGHT);
      return preRotateBlock(newBlock, -CBlock.WIDTH, -CBlock.HEIGHT);
    } else if (!onLeftPivot && onRightPivot && onTopPivot && !onBottomPivot) {
      const newBlock = preRotateBlock(block, -CBlock.WIDTH, CBlock.HEIGHT);
      return preRotateBlock(newBlock, CBlock.WIDTH, CBlock.HEIGHT);
    } else if (!onLeftPivot && onRightPivot && !onTopPivot && onBottomPivot) {
      const newBlock = preRotateBlock(block, -CBlock.WIDTH, CBlock.HEIGHT);
      return preRotateBlock(newBlock, -CBlock.WIDTH, -CBlock.HEIGHT);
    }
    return block;
  });
  return preRotatedBlocks;
};

const spawnRandomBlocks = (s: State) => {
  const creationBlocks = [create22square, tBlock, skewBlock, straightBlock];
  const randomIndex = Math.floor(Math.random() * creationBlocks.length);
  const blocks = creationBlocks[randomIndex](s);

  return tick(s, { nextShape: blocks });
};

const createRange = (start: number, end: number): number[] => {
  if (start > end) {
    return [];
  }
  return [start, ...createRange(start + 1, end)];
};

const levelUp = (s: State) => {
  if (s.blackBlockCount !== (s.level - 1) * Constants.GRID_WIDTH) {
    const rowBlackBlock = createRange(1, s.level - 1);
    const columnBlackBlock = createRange(0, Constants.GRID_WIDTH - 1);

    const blackBlocks = rowBlackBlock.map((row) => {
      const blackBlock = columnBlackBlock.map((column) => {
        const blackBlock = createGreyBlock(
          s,
          column * CBlock.WIDTH,
          (Constants.GRID_HEIGHT - row) * CBlock.HEIGHT
        );
        return blackBlock;
      });
      return blackBlock;
    });
    if (blackBlocks.length) {
      const state = blackBlocks.reduce((acc, blocks) => {
        return blocks.reduce((acc, block) => {
          return tick(acc, {
            blocks: [...acc.blocks, block],
            blackBlockCount: acc.blackBlockCount + 1,
          });
        }, acc);
      }, s);
      return state
    }
  }
  return s
}

const currentBlockCreation = (s: State, currentBlocks: Block[]) => {
  //if the current game state does not have any blocks that is not placed, we would like to create some new ones
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
    return tick(s, {blocks: [...s.blocks, bedRock], timeDropBedRock: Constants.DROP_BED_ROCK})
  }
  else{
    s = tick(s, {timeDropBedRock: s.timeDropBedRock - 1})
  }
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

const rotationHandling = (s: State, value: string) => {
  const newPreviousBlock = s.blocks.filter((block) => block.placed);
  const newCurrentBlock = s.blocks.filter((block) => !block.placed);
  //pre-rotate the blocks
  if (value === "W") {
    const rotatedCurrentBlocks = preRotate(newCurrentBlock);
    if (!rotatedCurrentBlocks.length) {
      s = tick(s, {
        blocks: [...newPreviousBlock, ...newCurrentBlock],
      });
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
  const restart = document.querySelector("#restart") as SVGGraphicsElement &
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

  const left$ = fromKey("KeyA", "-X");
  const right$ = fromKey("KeyD", "+X");
  const down$ = fromKey("KeyS", "+Y");
  const rotate$ = fromKey("KeyW", "W");
  const restartClick$ = fromEvent<MouseEvent>(restart, "click").pipe(
    map(() => ("restartClick" as MouseClick )))
  const instantRestartClick$ = fromEvent<MouseEvent>(instantReplay, "click").pipe(
    map(() => ("restartClick" as MouseClick )))
  /** Observables */

  /** Determines the rate of time steps */
  const tick$ = interval(Constants.TICK_RATE_MS);

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
    const blocks = svg.querySelectorAll(".block");
    const bedRocks = svg.querySelectorAll(".bedrock")
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
    map(() => "NULL" as KeyPressValue));

  const source$ = merge(
    tickWithX$,
    left$,
    right$,
    down$,
    rotate$,
    restartClick$,
    instantRestartClick$,
  )
  .pipe(
    scan<EventType, State>((s: State, value: EventType) => {
      if (value && value === "restartClick") {
        if(s.score > s.highScore){
          return tick(initialState, {highScore: s.score}); // Reset state on mouse click
        }
        return initialState
      }
      else{
        if(Math.floor(s.score/Constants.LEVEL_UP_SCORE) <= Constants.MAX_LEVEL){
          s = tick(s, {level: Math.floor(s.score/Constants.LEVEL_UP_SCORE)})
        }

        s = levelUp(s)
    
        if (!s.gameEnd) {
          if (!s.nextShape) {
            return spawnRandomBlocks(s);
          }

          //take out the block that has not been placed yet (the player still can move these blocks)
          const currentBlocks = s.blocks.filter((block) => !block.placed);
          //take out the block that has been placed (the player can't move these blocks anymore)

          if(!currentBlocks.length){
            return currentBlockCreation(s, currentBlocks)
          }
          
          //pre-move the blocks
          const moveCurrentBlock = moveBlockX(currentBlocks, value);
          //first check if x-coor can be updated successfully
          //the only check if y-coor can be updated successfully

          s = stateMoveHandling(s, currentBlocks, moveCurrentBlock);
          s = rotationHandling(s, value)
          s = addBlockRowForClear(s);
          const rowToClear = checkFullRows(s.allRows);
          s = clearRow(s, rowToClear);
        }
        return s;
      }
    }, initialState)
  )
    .subscribe((s: State) => {
      render(s);
      if (s.gameEnd) {
        show(gameover);
        show(restart);
      } else {
        hide(gameover);
        hide(restart);
      }
    });
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}

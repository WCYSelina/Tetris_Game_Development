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
import { fromEvent, interval, merge, Subscription} from "rxjs";
import { map, filter, scan, switchMap, reduce } from "rxjs/operators";
import { Block, Key, Event, State, Viewport, Constants, KeyPressValue, Rows, CBlock} from './types'
import { initialState, tick, createBlock, create22square, tBlock, straightBlock, skewBlock} from './state'
import { findRightEdgePos, findTopEdgePos, findNotValidMove as reduceUtil } from "./utils";
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
      map(() => ({ 
        x: x // map this to access "value" in the pipe
      }))
      );
    
  const left$ = fromKey("KeyA", "-X");
  const right$ = fromKey("KeyD", "+X");
  const down$ = fromKey("KeyS", "+Y" );
  const rotate$ = fromKey("KeyW", "W")

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
    const blocks = svg.querySelectorAll(".block")
    blocks.forEach(block => {svg.removeChild(block)})
    s.blocks.forEach(block => {
      //render each block based on its props
      if(block){
        const cube = createSvgElement(svg.namespaceURI, "rect", {
          id: `${block.id}`,
          parentId: `${block.parentId}`,
          x: `${block.x}`,
          y: `${block.y}`,
          width: `${block.width}`,
          height:  `${block.height}`,
          placed: `${block.parentId}`,
          style: `${block.style}`,
          class: "block"
        })
        svg.appendChild(cube)
      }
    });
    }

  //in order to merge tick with the input keyboard stream, we need to map the same properties as the input keybord stream
  const tickWithX$ = tick$.pipe(
    map(() => ({ x: "NULL" } as { x: KeyPressValue}))
  );

  const moveBlock = (s:State, currentBlocks: Block[], operator: KeyPressValue ) => {
    //pre move the blocks in a one big block
    const altCurrentBlocks = currentBlocks.map ((currentBlock) => {
        //check which key has been inputted, and change the x value 
        const findX = (operator: string | null)  => {
            if(operator === "+X"){
              return currentBlock.x + CBlock.WIDTH
            }
            else{
              return currentBlock.x - CBlock.WIDTH
            }
        }
        //only change the x-coor when the key left and right is pressed
        const x = operator === "+X" || operator === "-X" ? findX(operator) : currentBlock.x
        const altBlock = createBlock(currentBlock, {x: x, y: currentBlock.y + CBlock.HEIGHT})
        
        return altBlock
    })
    if(operator === "W"){
      return preRotate(altCurrentBlocks)
    }
    return altCurrentBlocks
  }

  const checkYValid = (blocks: Block[], s: State): boolean => {
    const minYs = blocks.map( block => {
      const reachBoundaryY = () => {
        //check if the block touches boundary
        const BOTTOM_BOUNDARY =  Viewport.CANVAS_HEIGHT - CBlock.HEIGHT
        return block.y > BOTTOM_BOUNDARY ? false : true
      }
      const newBlocks = s.blocks.map(eBlock => {
        if(eBlock.id !== block.id && eBlock.parentId !== block.parentId){ // we only want to check the blocks that are not in the big block
           //if the blocks has same x-coor
          if(block.x === eBlock.x && findRightEdgePos(block) === findRightEdgePos(block)){
            //and if current block's y-coor is within the range of other block
            if(block.y > findTopEdgePos(eBlock)){
              return false
            }
          }
          //check if it touches boundary
          return reachBoundaryY()
        }
        return reachBoundaryY()
      })
      //find if there is any not valid move
      return reduceUtil(newBlocks,false)
    })
    //if one block in a big block has invalid move, all blocks have invalid moves
    return reduceUtil(minYs,false)
  }

  const checkLeftRight = (s: State, blocks: Block[]): boolean => {
    const leftRightFlags = blocks.map(block => {
      const reachBoundaryX = () => {
        //check if the block touches boundary
        const LEFT_BOUNDARY = 0
        const RIGHT_BOUNDARY = Viewport.CANVAS_WIDTH - CBlock.WIDTH
        return block.x < LEFT_BOUNDARY || block.x > RIGHT_BOUNDARY ? false : true
      }
      const leftRightFlag = s.blocks.map(eBlock => {
        // we only want to check the blocks that are not in the big block
        if(eBlock.id !== block.id && eBlock.parentId !== block.parentId){
          //if the blocks has same x-coor
          if(block.x === eBlock.x &&
             findRightEdgePos(block) === findRightEdgePos(block)){
              //and if current block's y-coor is within the range of other block
            if(block.y > findTopEdgePos(eBlock) && block.y <= eBlock.y){ 
              //it is not able to move, hence return false
              return false
            }
          }
          return reachBoundaryX()
        }
        return reachBoundaryX()
      })
      //find if there is any not valid move
      return reduceUtil(leftRightFlag,false)
    })
    //if one block in a big block has invalid move, all blocks have invalid moves
    return reduceUtil(leftRightFlags,false)
  }

  const stateMoveHandling = (s: State, ableToMove: boolean, blocks: Block[], currentBlocks: Block[], previousBlock: Block[]) => {
    //if y is a valid move, we just update the game state of the blocks property with the blocks that passed into this function
    //if it cant be moved, we used back the blocks that at the start of this tick, but just change the placed property to true,
    //so that the blocks are finalised
    if(ableToMove){
      return tick(s,{blocks: [...previousBlock,...blocks]})
    }
    else{
      const placedAllBlock = currentBlocks.map((block => {
        return createBlock(block,{placed:true})
      }))
      s = tick(s,{blocks: [...previousBlock,...placedAllBlock]})
      const placedBlock =  s.blocks.filter(block => block.placed)
      const ifGameEnds = checkGameEnds(placedBlock)
      return ifGameEnds ? tick(s, {gameEnd: true}) : s
    }
  }

  const addBlockRowForClear = (s: State) => {
    const placeBlocks = s.blocks.filter(block => block.placed)
    const newArray = placeBlocks.reduce((allRows, block) => {
      if(allRows[block.y/CBlock.HEIGHT][block.x/CBlock.WIDTH] === false){
        const row = allRows.map((row,cIndex) => {
          const column = row.map((column,rIndex) => {
            if(cIndex === block.y/CBlock.HEIGHT && rIndex === block.x/CBlock.WIDTH){
              return true
            }
            return allRows[cIndex][rIndex]
          })
          return column
        })
        return row
      }
      return allRows
    },s.allRows)
    return tick(s, {allRows: newArray})
  }

  const checkFullRows = (allRows: ReadonlyArray<ReadonlyArray<boolean>>) => {
    const rowToClear = allRows.some(row => row.every(element => element))
    if(rowToClear){
      const allRowsIndex = allRows.map((row, index) => {
        if(row.every(el => el)){
          return index
        }
        return null
      })
      return allRowsIndex.filter(index => index)
    }
    return null
  }

  const clearRow = (s: State, indexRow: (number | null)[] | null) => {
    if(indexRow && indexRow.length){
      const state = indexRow.reduce((accS,row) => {
        if(row){
          const clearBlocks = accS.blocks.filter(block => block.y < row * CBlock.HEIGHT)
          const shiftedBlocks = shiftBlockAfterClear(clearBlocks,row)
          if(shiftedBlocks){
            return tick(s, {blocks: shiftedBlocks, allRows: new Array(Constants.GRID_HEIGHT).fill(false).map(() => new Array(Constants.GRID_WIDTH).fill(false))})
          }
          else{
            return tick(s, {blocks: clearBlocks, allRows: new Array(Constants.GRID_HEIGHT).fill(false).map(() => new Array(Constants.GRID_WIDTH).fill(false))})
          }  
        }
        return accS
      },s)
      return state
    }
    return s
  }

  const shiftBlockAfterClear = (blocks: Block[], indexRow: number | null) => {
    if(indexRow){
      console.log(indexRow)
      const newBlocks = blocks.map(block => {
        if(indexRow && block.y < indexRow * CBlock.HEIGHT){
          return createBlock(block, {y: block.y + CBlock.HEIGHT})
        }
        return block
      })
      return newBlocks
    }
    return null
  }

  const checkGameEnds = (blocks: Block[]) => {
    if(blocks.length){
      const flags = blocks.map(block => {
        if(block.y === 0){
          return true
        }
        return false
      })
      return reduceUtil(flags,true)
    }
    return false
  }

  const preRotate = (blocks: Block[]) => {
    const pivot = blocks[0] //take the first point as the pivot of rotation
    const preRotatedBlocks = blocks.map(block => {
      const onLeftPivot = block.x < pivot.x
      const onRightPivot = block.x > pivot.x
      const onTopPivot = block.y < pivot.y
      const onBottomPivot = block.y > pivot.y

      const preRotateBlock = (block: Block, x: number, y: number) => {
        return createBlock(block, {x: block.x + x, y: block.y + y})

      }
      if(block.id == pivot.id){
        return block
      }
      else if(onLeftPivot && !onRightPivot && !onTopPivot && !onBottomPivot){
        return preRotateBlock(block, CBlock.WIDTH, -CBlock.HEIGHT)
      }
      else if(!onLeftPivot && onRightPivot && !onTopPivot && !onBottomPivot){
        return preRotateBlock(block, -CBlock.WIDTH, CBlock.HEIGHT)
      }
      else if(!onLeftPivot && !onRightPivot && onTopPivot && !onBottomPivot){
        return preRotateBlock(block, CBlock.WIDTH, CBlock.HEIGHT)
      }
      else if(!onLeftPivot && !onRightPivot && !onTopPivot && onBottomPivot){
        return preRotateBlock(block, -CBlock.WIDTH, -CBlock.HEIGHT)
      } 
      else if(onLeftPivot && !onRightPivot && onTopPivot && !onBottomPivot){
        const newBlock = preRotateBlock(block, CBlock.WIDTH, -CBlock.HEIGHT)
        return preRotateBlock(newBlock, CBlock.WIDTH, CBlock.HEIGHT)
      }
      else if(onLeftPivot && !onRightPivot && !onTopPivot && onBottomPivot){
        const newBlock = preRotateBlock(block, CBlock.WIDTH, -CBlock.HEIGHT)
        return preRotateBlock(newBlock, -CBlock.WIDTH, -CBlock.HEIGHT)
      }
      else if(!onLeftPivot && onRightPivot && onTopPivot && !onBottomPivot){
        const newBlock = preRotateBlock(block, -CBlock.WIDTH, CBlock.HEIGHT)
        return preRotateBlock(newBlock, CBlock.WIDTH, CBlock.HEIGHT)
      }
      else if(!onLeftPivot && onRightPivot && !onTopPivot && onBottomPivot){
        const newBlock = preRotateBlock(block, -CBlock.WIDTH, CBlock.HEIGHT)
        return preRotateBlock(newBlock, -CBlock.WIDTH, -CBlock.HEIGHT)
      } 
      return block
    })
    return preRotatedBlocks 
  }

  // const rotateValid = ()

  const source$: Subscription = merge(tickWithX$,left$,right$,down$,rotate$).pipe(
      scan((s:State,value) => {
        //take out the block that has not been placed yet (the player still can move these blocks)
        const currentBlocks = s.blocks.filter(block => !block.placed)
        //take out the block that has been placed (the player can't move these blocks anymore)
        const previousBlock =  s.blocks.filter(block => block.placed)

        //if the current game state does not have any blocks that is not placed, we would like to create some new ones
        if(!currentBlocks.length){
          // const block = create22square(s)
          // const block = tBlock(s)
          const block = skewBlock(s)
          return tick(s,{blocks: [...s.blocks,...block], 
            blockCount: s.blockCount + block.length, 
            bigBlockCount: s.bigBlockCount + 1})
        }

        //pre-move the blocks
        const moveCurrentBlock = moveBlock(s, currentBlocks, value.x)

        //first check if x-coor can be updated successfully
        //the only check if y-coor can be updated successfully

        //if it cant be updated successfully
        if(!checkLeftRight(s,moveCurrentBlock)){
          //we copy the pre-moved blocks and change their x-coor to original coor
          const newMovedCurrentBlock = moveCurrentBlock.map(((block, index) => {
            return createBlock(block,{x: currentBlocks[index].x})
          }))
          //then check if y-coor can be updated successfully
          //and update the state
          const validMove =  checkYValid(newMovedCurrentBlock,s)
          s =  stateMoveHandling(s, validMove, newMovedCurrentBlock, currentBlocks, previousBlock)
          s = addBlockRowForClear(s)
          const rowToClear = checkFullRows(s.allRows)
          return clearRow(s,rowToClear)
        }
        else{
          //this means that x-coor is updated successfully
          const validMove = checkYValid(moveCurrentBlock,s)
          s = stateMoveHandling(s, validMove, moveCurrentBlock, currentBlocks, previousBlock)
          s = addBlockRowForClear(s)
          const rowToClear = checkFullRows(s.allRows)
          return clearRow(s,rowToClear)
        }
      },initialState)
    ).subscribe((s:State) => {
      render(s)
      if (s.gameEnd) {
        show(gameover);
        source$.unsubscribe()
      } else {
        hide(gameover);
      }
    }
    );
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}

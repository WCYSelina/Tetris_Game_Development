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
import { map, filter, scan, takeUntil, min } from "rxjs/operators";
import { Block, Key, Event, State, Viewport, Constants, KeyPressValue} from './types'
import { initialState, createState as tick, createBlock, create22square, createInitialBlock } from './state'
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

  const touchBoundaryOrBlock = (blocks: Block[], s: State): boolean[] => {
    const minYs = blocks.map( block => {
      if(!block){ // null-error handling
        return false
      }// if the dist != 0 means that this function is checking if the block touches another block instead of boundary
      const reachBoundaryY = () => {
        const BOTTOM_BOUNDARY =  Viewport.CANVAS_HEIGHT - block.height
        if(block.y > BOTTOM_BOUNDARY){
          return false
        }
        else{
          return true
        }
      }
      const newBlocks = s.blocks.map(eBlock => {
        if(eBlock.id !== block.id && eBlock.parentId !== block.parentId){ // we do not want to check the same block in the array
          const eBlockXEnd = eBlock.x + eBlock.width
          const eBlockYIn = eBlock.y - eBlock.height
          const blockXEnd = block.x + block.width
          //if the x-coor of blocak is within the range of eBlock.x(initial) and eBlockXEnd
          const bothSameX = block.x === eBlock.x && blockXEnd === eBlockXEnd
          const ifnewXOverlap = block.x > eBlock.x && block.x < eBlockXEnd || blockXEnd > eBlock.x && blockXEnd < eBlockXEnd
          if(bothSameX || ifnewXOverlap) {
            if(block.y > eBlockYIn && block.y <= eBlock.y){ //if current block's y-coor is within the range of other block
              return false
            }
          }
          //if the block touches the boundary
          return reachBoundaryY()
        }
        else{
          return reachBoundaryY()
        }
      })
      //the newBlocks contains the informations of the current block whether touches boundary or any other blocks or neither of them
      // get the min Y-coor
      const minY = newBlocks.reduce((flag,current) => {
        if(!current){
          return current
        }
        else{
          return flag
        }
      })
      return minY
    })
    return minYs
  }


  const afterTouched = (s:State, currentBlocks: Block[], operator: KeyPressValue ) => {
    const altCurrentBlocks = currentBlocks.map ((currentBlock) => {
        const LEFT_BOUNDARY = 0
        const RIGHT_BOUNDARY = Viewport.CANVAS_WIDTH - currentBlock.width
        const findX = (operator:string | null)  => {
            if(operator === "+X"){
              const x = currentBlock.x + currentBlock.width
              return  x <= RIGHT_BOUNDARY ? x : RIGHT_BOUNDARY
            }
            else{
              const x = currentBlock.x - currentBlock.width
              return x >= LEFT_BOUNDARY ? x : LEFT_BOUNDARY
            }
        }
        const x = operator === "+X" || operator === "-X" ? findX(operator) : currentBlock.x
        // const y = operator === "+Y" ? greenBlock.y + Constants.DOWN_SPEED : 0 
        const altBlock = createBlock(currentBlock, {x: x, y: currentBlock.y + currentBlock.width})
        
        return altBlock
      // }
    })
    return altCurrentBlocks
  }

  const source$ = merge(tickWithX$,left$,right$,down$).pipe(
      scan((s:State,value) => { // the value is the value emitted from the stream mainly used when the left$ and right$ is pressed
        // we get the currentBlock of the current game state, and we check if it has touched the boundary or not
        // if it didnt touch the boundary, we modify the y-coor of the block with a fixed value, and x-coor depending on the input keyboard pressed times, then copy all the data to assign to the state,
        // and ready for the next interval
        // if it touched the boundary, we changed the the block colour to red, means that the game need to create a new block
        // if current game state does not have block that has not been placed yet, we need to create one for it as well
        const currentBlocks = s.blocks.filter(block => !block.placed)
        const previousBlock =  s.blocks.filter(block => block.placed)
        if(!currentBlocks.length){
          const block = create22square(s)
          return tick(s,{blocks: [...s.blocks,...block], blockCount: s.blockCount + block.length, bigBlockCount: s.bigBlockCount + 1})
        }

        const moveCurrentBlock = afterTouched(s, currentBlocks, value.x) //first move
        const isTouched = touchBoundaryOrBlock(moveCurrentBlock,s) // then check if it is a valid move
        //if not adjust the position
        console.log("istouched")
        console.log(moveCurrentBlock)
        console.log(isTouched)
        console.log("istouched")

       const ableToMove = isTouched.reduce((flag,current) => {
        if(!current){
          return current
        }
        else{
          return flag
        }
        })

        if(ableToMove){
          s = tick(s,{blocks: [...previousBlock,...moveCurrentBlock]})
        }
        else{
          const placedAllBlock = currentBlocks.map((block => {
            return createBlock(block,{placed:true})
          }))
          s = tick(s,{blocks: [...previousBlock,...placedAllBlock]})
        }
        console.log(s)
        return s
      },initialState)
    ).subscribe((s:State) => {
      render(s)
      if (s.gameEnd) {
        show(gameover);
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

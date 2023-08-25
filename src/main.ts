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
import { map, filter, scan, takeUntil } from "rxjs/operators";
import { Block, Body, Key, Event, State, KArgumentState, KArgumentBlock, StateProperty, BlockProperty, Viewport, Constants, KeyPressValue} from './types'
import { initialState, createState, createBlock } from './state'
/**
 * Updates the state by proceeding with one time step.
 *
 * @param s Current state
 * @returns Updated state
 */
const tick = (s: State) => s;

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
    svg.innerHTML = '';
    s.blocks.forEach(block => {
      //render each block based on its props
      const cube = createSvgElement(svg.namespaceURI, "rect");
      Object.entries(block).forEach(([key, val]) => 
        cube.setAttribute(key, String(val))
      );
      svg.appendChild(cube);
    });
    }

  //in order to merge tick with the input keyboard stream, we need to map the same properties as the input keybord stream
  const tickWithX$ = tick$.pipe(
    map(() => ({ x: "NULL" } as { x: KeyPressValue}))
  );
  const touchBoundaryOrBlock = (block: Block, s: State): {y: number, isTouched: boolean} => {
    const ERRORYANDISTOUCHED = {y: Infinity, isTouched: true}

    const reachBoundary = () => {
      if(block.y >= Viewport.CANVAS_HEIGHT - block.height){
        return {y: Viewport.CANVAS_HEIGHT - block.height, isTouched: true}
      }
    }
    if(!block){ // null-error handling
      return ERRORYANDISTOUCHED
    }// if the dist != 0 means that this function is checking if the block touches another block instead of boundary
    if(s.blockCount == 1) {
      //if the block touches the boundary
      const returnValue = reachBoundary()
      if(returnValue) return returnValue
    }
    else{
      const newBlocks = s.blocks.map(eBlock => {
        if(eBlock.id !== block.id){ // we do not want to check the same block in the array
          const eBlockXEnd = eBlock.x + eBlock.width
          const eBlockYIn = eBlock.y - eBlock.height
          const blockXEnd = block.x + block.width
          //if the x-coor of blocak is within the range of eBlock.x(initial) and eBlockXEnd
          const bothSameX = block.x === eBlock.x && blockXEnd === eBlockXEnd
          const ifnewXOverlap = block.x > eBlock.x && block.x < eBlockXEnd || blockXEnd > eBlock.x && blockXEnd < eBlockXEnd
          if(bothSameX || ifnewXOverlap) {
            if(block.y >= eBlockYIn){
              return {y: eBlockYIn, isTouched: true}
            }
          }
          //if the block touches the boundary
          const returnValue = reachBoundary()
          if(returnValue) return returnValue
          else{
            return {y: block.y, isTouched: false}
          }
        }
        else{
          return ERRORYANDISTOUCHED //handle the situation where it does not match any situations
        }
      })
      //the newBlocks contains the informations of the current block whether touches boundary or any other blocks or neither of them
      // get the min Y-coor
      const minY = newBlocks.reduce((min,current) => {
        if(current.isTouched && current!.y < min.y){
          return {y: current.y, isTouched: true}
        }
        else{
          return {y: min.y, isTouched: min.isTouched}
        }
      }, ERRORYANDISTOUCHED) 
      return minY
    }
    return ERRORYANDISTOUCHED //handle the situation where it does not match any situations
  }
  const afterTouched = (s:State, minY: number | null, greenBlock: Block, operator: KeyPressValue, touched: boolean) => {
    if(minY != Infinity && touched && greenBlock){
      const block = createBlock(greenBlock,{placed: true, style: "fill: red"})
      const afterFiltering = s.blocks.filter(block => block.placed)
      s = createState(s,{blocks: [...afterFiltering,block]})
    }
    const newGreenBlock = s.blocks.filter(block => !block.placed)[0]
    if(!newGreenBlock){
      const block: Block = {
        id: `${s.blockCount}`,
        x: Viewport.CANVAS_WIDTH/2,
        y: 0,
        width: Viewport.CANVAS_WIDTH / Constants.GRID_WIDTH,
        height: Viewport.CANVAS_HEIGHT / Constants.GRID_HEIGHT,
        placed: false,
        style: "fill: green"
      }
      s = createState(s,{blocks: [...s.blocks,block], blockCount: s.blockCount + 1})
    }
    else{
      // we check if the current y-coor of the block + the value will exceed the canvas or not, if not just add it,
      // if yes, use the canvas.weight - the block's width as its y-coor
      
      const findX = (operator:string | null) => {
          if(operator === "+X"){
            return greenBlock.x + greenBlock.width
          }
          else{
            return greenBlock.x - greenBlock.width
          }
      }
      const x = operator === "+X" || operator === "-X" ? findX(operator) : greenBlock.x
      const y = operator === "+Y" ? greenBlock.y + Constants.DOWN_SPEED : 0 
      const altGreenBlock = createBlock(greenBlock, {x: x, y: greenBlock.y + 25 + y})
      const newY = touchBoundaryOrBlock(altGreenBlock,s)
      const afterFiltering = s.blocks.filter(block => block.placed)
      if(newY.y != Infinity){
        const newBlock = createBlock(altGreenBlock,{y:newY.y})
        s = createState(s,{blocks: [...afterFiltering,newBlock]})
      }
      else{
        s = createState(s,{blocks: [...afterFiltering,altGreenBlock]})
      }
    }
    return s
  }

  const source$ = merge(tickWithX$,left$,right$,down$).pipe(
      scan((s:State,value) => { // the value is the value emitted from the stream mainly used when the left$ and right$ is pressed
        // we get the current greenBlock of the current game state, and we check if it has touched the boundary or not
        // if it didnt touch the boundary, we modify the y-coor of the block with a fixed value, and x-coor depending on the input keyboard pressed times, then copy all the data to assign to the state,
        // and ready for the next interval
        // if it touched the boundary, we changed the the block colour to red, means that the game need to create a new block
        // if current game state does not have green block, we need to create one for it as well
        const greenBlock = s.blocks.filter(block => !block.placed)[0]
        const isTouched = touchBoundaryOrBlock(greenBlock,s)    
        s = afterTouched(s,isTouched.y,greenBlock,value.x,isTouched.isTouched)
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

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

/** Constants */

const Viewport = {
  CANVAS_WIDTH: 200,
  CANVAS_HEIGHT: 400,
  PREVIEW_WIDTH: 160,
  PREVIEW_HEIGHT: 80,
} as const;

const Constants = {
  TICK_RATE_MS: 750,//500
  GRID_WIDTH: 10,
  GRID_HEIGHT: 20,
} as const;

/**
 * ObjectIds help us identify objects and manage objects which timeout (such as bullets)
 */
type ObjectId = Readonly<{ id: String }>

interface Block extends ObjectId{
  width: number,
  height: number,
  x: number,
  y: number,
  placed: boolean,
  style: String
}

type Body = Readonly<Block>
/** User input */

type Key = "KeyS" | "KeyA" | "KeyD";

type Event = "keydown" | "keyup" | "keypress";

/** Utility functions */

/** State processing */

type State = Readonly<{
  gameEnd: boolean;
  score: number;
  blocks: ReadonlyArray<Body>;
  blockCount: number;
}>;

const initialState: State = {
  gameEnd: false,
  score: 0,
  blocks: [],
  blockCount: 0
} as const;

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

  const fromKey = (keyCode: Key, x:number) =>
    key$.pipe(
      filter(({ code }) => code === keyCode),
      map(() => ({ 
        x: x // map this to access "value" in the pipe
      }))
      );
    

  const left$ = fromKey("KeyA", -5);
  const right$ = fromKey("KeyD", 5);
  // const down$ = fromKey("KeyS");

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
    map(() => ({ x: 0}))
  );

  const touchBoundaryOrBlock = (block: Block, s: State, dist: number = 0): (number|undefined)[] | null | number => {
    if(!block){ // null-error handling
      return null
    }// if the dist != 0 means that this function is checking if the block touches another block instead of boundary
    if(s.blockCount == 1) {
      //if the block touches the boundary
      if(block.y >= Viewport.CANVAS_HEIGHT - block.height){
        console.log("888")
        return Viewport.CANVAS_HEIGHT - block.height
      }
    }
    else{
      const newBlocks = s.blocks.map(eBlock => {
        if(eBlock.id !== block.id){ // we do not want to check the same block in the array
          const eBlockXEnd = eBlock.x - eBlock.width
          const eBlockYIn = eBlock.y - eBlock.height
          const blockXEnd = block.x - block.width
          //if the x-coor of block is within the range of eBlock.x(initial) and eBlockXEnd
          if(block.x === eBlock.x && blockXEnd === eBlockXEnd) {
            if(block.y >= eBlockYIn){
              return eBlockYIn
            }
          }
          if(block.x > eBlock.x && block.x < eBlockXEnd || blockXEnd < eBlock.x && blockXEnd > eBlockXEnd){
            if(block.y >= eBlockYIn){
              return eBlockYIn
            }
          }
          //if the block touches the boundary
          if(block.y >= Viewport.CANVAS_HEIGHT - block.height){
            return Viewport.CANVAS_HEIGHT - block.height
          }
          else{
            return block.y
          }
        }
      })
      return newBlocks
    }
    return null
  }

  const touchedBoolean = (block: Block, s: State, dist: number = 0): boolean | (boolean|undefined)[] => {
    if(!block){ // null-error handling
      return false
    }// if the dist != 0 means that this function is checking if the block touches another block instead of boundary
    if(s.blockCount == 1) {
      //if the block touches the boundary
      if(block.y >= Viewport.CANVAS_HEIGHT - block.height){
        return true
      }
    }
    else{
      const newBlocks = s.blocks.map(eBlock => {
        if(eBlock.id !== block.id){ // we do not want to check the same block in the array
          const eBlockXEnd = eBlock.x - eBlock.width
          const eBlockYIn = eBlock.y - eBlock.height
          const blockXEnd = block.x - block.width
          //if the x-coor of block is within the range of eBlock.x(initial) and eBlockXEnd
          if(block.x === eBlock.x && blockXEnd === eBlockXEnd) {
            if(block.y >= eBlockYIn){
              return true
            }
          }
          if(block.x > eBlock.x && block.x < eBlockXEnd || blockXEnd < eBlock.x && blockXEnd > eBlockXEnd){
            if(block.y >= eBlockYIn){
              return true
            }
          }
          //if the block touches the boundary
          if(block.y >= Viewport.CANVAS_HEIGHT - block.height){
            return true
          }
          else{
            return false
          }
        }
      })
      return newBlocks
    }
    return false
  }

  const afterTouched = (s:State, minY: number | null, greenBlock: Block, x: number, touched: boolean) => {
    if(minY && touched && greenBlock){
      const block: Block = {
        ...greenBlock,
        placed: true,
        style: "fill: red"
      }
      const afterFiltering = s.blocks.filter(block => block.placed)
      const newState: State = {
        ... s,
        blocks: [...afterFiltering, block],
      }
      s = newState
    }
    const newGreenBlock = s.blocks.filter(block => !block.placed)[0]
    console.log("green")
    console.log(newGreenBlock)
    if(!newGreenBlock){
      console.log("create")
      const block: Block = {
        id: `${s.blockCount}`,
        x: Viewport.CANVAS_WIDTH/2,
        y: 0,
        width: Viewport.CANVAS_WIDTH / Constants.GRID_WIDTH,
        height: Viewport.CANVAS_HEIGHT / Constants.GRID_HEIGHT,
        placed: false,
        style: "fill: green"
      }
      const newState: State = {
        ... s,
        blocks: [...s.blocks, block],
        blockCount: s.blockCount + 1
      }
      s = newState
    }
    else{
      console.log("sss")
      const altGreenBlock: Block = {
        ...greenBlock,
        x: greenBlock.x + x,
        // we check if the current y-coor of the block + the value will exceed the canvas or not, if not just add it,
        // if yes, use the canvas.weight - the block's width as its y-coor
        y: greenBlock.y + 50
      }
      const newY = touchBoundaryOrBlock(altGreenBlock,s)
      const afterFiltering = s.blocks.filter(block => block.placed)
      if(Array.isArray(newY)){
        const minY = newY.reduce((min,current) => {
          return current! < min! ? current : min},Infinity)
          const newBlock: Block = {
            ...altGreenBlock,
            y: minY!
          }
          const newState: State = {
            ...s,
            blocks: [...afterFiltering,newBlock],
          }
          s = newState
      }
      else if(typeof newY === "number"){

        const newBlock: Block = {
          ...altGreenBlock,
          y: newY
        }
        const newState: State = {
          ...s,
          blocks: [...afterFiltering,newBlock],
        }
        s = newState
      }
      else{
        const newState: State = {
          ...s,
          blocks: [...afterFiltering,altGreenBlock],
        }
        s = newState
      }
    }
    return s
  }

  const source$ = merge(tickWithX$,left$,right$).pipe(
      scan((s:State,value) => { // the value is the value emitted from the stream mainly used when the left$ and right$ is pressed
        // we get the current greenBlock of the current game state, and we check if it has touched the boundary or not
        // if it didnt touch the boundary, we modify the y-coor of the block with a fixed value, and x-coor depending on the input keyboard pressed times, then copy all the data to assign to the state,
        // and ready for the next interval
        // if it touched the boundary, we changed the the block colour to red, means that the game need to create a new block
        // if current game state does not have green block, we need to create one for it as well
        const greenBlock = s.blocks.filter(block => !block.placed)[0]
        const isTouched = touchBoundaryOrBlock(greenBlock,s)
        console.log(isTouched)
        console.log(greenBlock)
        if(Array.isArray(isTouched)){
          const minY = isTouched.reduce((min,current) => {
            return current! < min! ? current : min},Infinity)
            const touched = touchedBoolean(greenBlock,s)
            if(Array.isArray(touched)){
              const ifTouched = touched.reduce((touched,current) => {return current ? current : touched },false)
              s = afterTouched(s,minY!,greenBlock,value.x,ifTouched!)
            }
            else{
              const ifTouched = touched
              s = afterTouched(s,minY!,greenBlock,value.x,ifTouched)
            }
          
        }
        else{
          const minY = isTouched
          const touched = touchedBoolean(greenBlock,s)
          if(Array.isArray(touched)){
            const ifTouched = touched.reduce((touched,current) => {return current ? current : touched },false)
            s = afterTouched(s,minY!,greenBlock,value.x,ifTouched!)
          }
          else{
            const ifTouched = touched
            s = afterTouched(s,minY!,greenBlock,value.x,ifTouched)
          }
        }  
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

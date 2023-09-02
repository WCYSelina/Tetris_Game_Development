export{ initialState, tick, createBlock, create22square, createInitialBlock, tBlock, straightBlock, skewSBlock, createGreyBlock, jBlock, lBlock, skewZBlock}
import {State, KArgumentState, KArgumentBlock, StateProperty, BlockProperty, Viewport, Constants, Block, CBlock} from './types'

const initialState: State = {
    gameEnd: false,
    score: 0,
    blocks: [],
    bigBlockCount: 0,
    blockCount: 0,
    greyBlockCount: 0,
    allRows: new Array(Constants.GRID_HEIGHT).fill(false).map(() => new Array(Constants.GRID_WIDTH).fill(false)),
    nextShape: null,
    level: 0,
    highScore: 0,
    timeDropBedRock: 8,
  } as const;

/**
 * Updates the state by proceeding with one time step.
 *
 * @param s Current state
 * @param k 
 * @returns Updated state
 */
const tick = <T extends StateProperty> (s:State, k: KArgumentState<T>): State => {
  // forEach does not work in here, since k can be many types
  // Hence, we need Object.keys to iterate the properties of k
  return Object.keys(k).reduce((newState,key) => {
    return {...newState, [key]: k[key]} 
  },{...s})
}

const createBlock = <T extends BlockProperty> (block: Block, k: KArgumentBlock<T> | null = null): Block =>{
  if(k){
    return Object.keys(k).reduce((newBlock,key) => {
      return {...newBlock, [key]: k[key]} 
    },{...block})
  }
  else{
    return {...block}
  }
}


const createInitialBlock = (s:State, colour: String, x: number, y: number, id: number = 0, type: String): Block => {
  const block: Block = { 
    id: id,
    parentId: `${s.bigBlockCount}`,
    x: x,
    y: y,
    width: CBlock.WIDTH,
    height: CBlock.HEIGHT,
    placed: false,
    style: `fill: ${colour}`,
    class: "block",
    type: `${type}`,
  }
  return block
}

const createGreyBlock = (s: State, x:number, y:number) => {
  return{
    id: -1,
    parentId:"null",
    x: x,
    y: y,
    width: CBlock.WIDTH,
    height: CBlock.HEIGHT,
    placed: true,
    style: "fill: grey",
    class: "block",
    type: "null"
  }
}

/*****************************/
//all types of block creation//


const create22square = (s:State): Block[] => {
  const block1 = createInitialBlock(s,"yellow",Viewport.CANVAS_WIDTH/2,0, s.blockCount + 1, "square") 
  const block2 = createInitialBlock(s,"yellow",Viewport.CANVAS_WIDTH/2 - CBlock.WIDTH,0, s.blockCount + 2, "square")
  const block3 = createInitialBlock(s,"yellow",Viewport.CANVAS_WIDTH/2 - CBlock.WIDTH, block2.y + CBlock.HEIGHT, s.blockCount + 3, "square")
  const block4 = createInitialBlock(s,"yellow",Viewport.CANVAS_WIDTH/2,block2.y + CBlock.HEIGHT, s.blockCount + 4, "square")
  
  return [block1, block2, block3, block4]
}

const tBlock = (s: State): Block[] => {
  const block1 = createInitialBlock(s,"purple",Viewport.CANVAS_WIDTH/2 - CBlock.WIDTH, 0, s.blockCount + 1, "T")
  const block2 = createInitialBlock(s,"purple",Viewport.CANVAS_WIDTH/2, 0, s.blockCount + 2, "T")
  const block3 = createInitialBlock(s,"purple",Viewport.CANVAS_WIDTH/2 + CBlock.WIDTH, 0, s.blockCount + 3, "T")
  const block4 = createInitialBlock(s,"purple",Viewport.CANVAS_WIDTH/2, block2.y + CBlock.HEIGHT, s.blockCount + 4, "T")

  return [block1, block2, block3, block4]
}

const straightBlock = (s: State): Block[] => {
  const block1 = createInitialBlock(s,"skyblue",Viewport.CANVAS_WIDTH/2,0, s.blockCount + 1, "straight") 
  const block2 = createInitialBlock(s,"skyblue",Viewport.CANVAS_WIDTH/2 - CBlock.WIDTH,0, s.blockCount + 2, "straight")
  const block3 = createInitialBlock(s,"skyblue",Viewport.CANVAS_WIDTH/2 + CBlock.WIDTH, 0, s.blockCount + 3, "straight")
  const block4 = createInitialBlock(s,"skyblue",Viewport.CANVAS_WIDTH/2 + CBlock.WIDTH * 2,0, s.blockCount + 4, "straight")

  return [block1, block2, block3, block4]
}

const skewSBlock = (s: State): Block[] => {
  const block1 = createInitialBlock(s,"green",Viewport.CANVAS_WIDTH/2,0, s.blockCount + 1, "skew") 
  const block2 = createInitialBlock(s,"green",Viewport.CANVAS_WIDTH/2,CBlock.HEIGHT, s.blockCount + 2, "skew")
  const block3 = createInitialBlock(s,"green",Viewport.CANVAS_WIDTH/2 + CBlock.WIDTH, 0, s.blockCount + 3, "skew")
  const block4 = createInitialBlock(s,"green",Viewport.CANVAS_WIDTH/2 - CBlock.WIDTH, CBlock.HEIGHT, s.blockCount + 4, "skew")

  return [block1, block2, block3, block4]
}

const jBlock = (s: State): Block[] => {
  const block1 = createInitialBlock(s,"blue",Viewport.CANVAS_WIDTH/2, 0, s.blockCount + 1, "J")
  const block2 = createInitialBlock(s,"blue",Viewport.CANVAS_WIDTH/2, CBlock.HEIGHT, s.blockCount + 2, "J")
  const block3 = createInitialBlock(s,"blue",Viewport.CANVAS_WIDTH/2, CBlock.WIDTH*2, s.blockCount + 3, "J")
  const block4 = createInitialBlock(s,"blue",Viewport.CANVAS_WIDTH/2 - CBlock.WIDTH, CBlock.HEIGHT*2 , s.blockCount + 4, "J")

  return [block3, block1, block2, block4]
}

const lBlock = (s: State): Block[] => {
  const block1 = createInitialBlock(s,"orange",Viewport.CANVAS_WIDTH/2, 0, s.blockCount + 1, "L")
  const block2 = createInitialBlock(s,"orange",Viewport.CANVAS_WIDTH/2, CBlock.HEIGHT, s.blockCount + 2, "L")
  const block3 = createInitialBlock(s,"orange",Viewport.CANVAS_WIDTH/2, CBlock.WIDTH*2, s.blockCount + 3, "L")
  const block4 = createInitialBlock(s,"orange",Viewport.CANVAS_WIDTH/2 + CBlock.WIDTH, CBlock.HEIGHT*2 , s.blockCount + 4, "L")

  return [block3, block1, block2, block4]
}

const skewZBlock = (s: State): Block[] => {
  const block1 = createInitialBlock(s,"red",Viewport.CANVAS_WIDTH/2,0, s.blockCount + 1, "skew") 
  const block2 = createInitialBlock(s,"red",Viewport.CANVAS_WIDTH/2,CBlock.HEIGHT, s.blockCount + 2, "skew")
  const block3 = createInitialBlock(s,"red",Viewport.CANVAS_WIDTH/2 - CBlock.WIDTH, 0, s.blockCount + 3, "skew")
  const block4 = createInitialBlock(s,"red",Viewport.CANVAS_WIDTH/2 + CBlock.WIDTH, CBlock.HEIGHT, s.blockCount + 4, "skew")

  return [block1, block2, block3, block4]
}
export{ initialState, tick as createState, createBlock, create22square, createInitialBlock }
import {State, KArgumentState, KArgumentBlock, StateProperty, BlockProperty, Viewport, Constants, Block} from './types'

const initialState: State = {
    gameEnd: false,
    score: 0,
    blocks: [],
    bigBlockCount: 0,
    blockCount: 0,
    allRows: new Array(Constants.GRID_HEIGHT).fill(false).map(() => new Array(Constants.GRID_WIDTH).fill(false))
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


const createInitialBlock = (s:State, colour: String, x: number, y: number, id: number = 0): Block => {
  const block: Block = { 
    id: id,
    parentId: `${s.bigBlockCount}`,
    x: x,
    y: y,
    width: Viewport.CANVAS_WIDTH / Constants.GRID_WIDTH,
    height: Viewport.CANVAS_HEIGHT / Constants.GRID_HEIGHT,
    placed: false,
    style: `fill: ${colour}`,
    class: "block"
  }
  return block
}

const create22square = (s:State): Block[] => {
  const block1 = createInitialBlock(s,"yellow",Viewport.CANVAS_WIDTH/2,0, s.blockCount + 1) 
  const block2 = createInitialBlock(s,"yellow",Viewport.CANVAS_WIDTH/2 - block1.width,0, s.blockCount + 2)
  const block3 = createInitialBlock(s,"yellow",Viewport.CANVAS_WIDTH/2 - block1.width,block2.y+block2.height, s.blockCount + 3)
  const block4 = createInitialBlock(s,"yellow",Viewport.CANVAS_WIDTH/2,block2.y+block2.height, s.blockCount + 4)
  
  return [block1, block2, block3, block4]
}

